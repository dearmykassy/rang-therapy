import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { createServer as createHttpServer } from "node:http";
import { createServer as createNetServer } from "node:net";
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { extname, relative, resolve } from "node:path";
import { tmpdir } from "node:os";
import {
  asArray,
  asRecord,
  buildFastAiReview,
  jsonText,
  loadFastContext,
  semanticSha256,
  sha256,
  type FastCandidate,
  type FastContext,
  type UnknownRecord,
} from "../src/lib/fast-release";

const ROOT = resolve(import.meta.dirname, "..");
const FAST_DIRECTORY = resolve(ROOT, "qa/fast");
const AI_REVIEW_PATH = resolve(FAST_DIRECTORY, "ai-copy-review.v1.json");
const BROWSER_REPORT_PATH = resolve(FAST_DIRECTORY, "local-chromium-qa.v1.json");
const RECEIPT_PATH = resolve(FAST_DIRECTORY, "fast-candidate.v1.json");
const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PNG_MAGIC_HEX = "89504e470d0a1a0a";
const ROLE_PATTERNS = {
  providerArrivalContactWaitingAssumption:
    "(?:관리사|테라피스트|방문 연락|도착[^.!?]{0,40}연락|연락[^.!?]{0,40}(?:기다리|대기)|연락을 놓치|연락받을 (?:사람|번호)|서비스 중 연락|전화받기 어려운|전화받을 수 있는 상태|휴대전화를 가까이|방문 예정 (?:시간|시각)|기다리|대기)",
  serviceRecipientAddressRoleError:
    "(?:머무는|머물(?:고|러)|체류 주소|체류 지역|실제 주소|상세 위치)",
  providerSubjectAvailabilityAmbiguity:
    "(?:방문 가능 여부|오늘 방문할 수 있는지|방문 가능 시각)",
  customerPhysicalMovement: "(?:이동|출발|도착|찾아가|오시는 길)",
  ambiguousCustomerContactNumberRole:
    "(?:전화상담에 (?:사용할|쓸|쓴) 번호|통화에 사용할 번호|본인 번호|본인 전화번호|연락처 숫자|새 전화상담 번호)",
} as const;

const QA_CASES = [
  {
    id: "seoul-root",
    kind: "root",
    route: "/areas/seoul/",
    requiresTiles: true,
    requiresTerminal: false,
  },
  {
    id: "gangnam-hub",
    kind: "hub",
    route: "/areas/seoul/%EA%B0%95%EB%82%A8%EA%B5%AC/",
    requiresTiles: true,
    requiresTerminal: false,
  },
  {
    id: "hwabuk-leaf",
    kind: "leaf",
    route: "/areas/jeju/%EC%A0%9C%EC%A3%BC%EC%8B%9C/%ED%99%94%EB%B6%81%EB%8F%99/",
    requiresTiles: false,
    requiresTerminal: true,
  },
] as const;

const VIEWPORTS = [
  { width: 320, height: 844 },
  { width: 390, height: 844 },
  { width: 1440, height: 1000 },
] as const;

type QaCase = (typeof QA_CASES)[number];
type Viewport = (typeof VIEWPORTS)[number];
type CdpEvent = { method: string; params: UnknownRecord };

function sameJson(left: unknown, right: unknown): boolean {
  return semanticSha256(left) === semanticSha256(right);
}

function assertCandidate(value: unknown, expected: FastCandidate, code: string) {
  if (!sameJson(value, expected)) throw new Error(`${code}:CANDIDATE_BINDING`);
}

function pngDimensions(buffer: Buffer): [number, number] {
  if (
    buffer.length < 24 ||
    buffer.subarray(0, 8).toString("hex") !== PNG_MAGIC_HEX
  ) {
    throw new Error("RANG_FAST_LOCAL_CHROMIUM_NOT_PNG");
  }
  return [buffer.readUInt32BE(16), buffer.readUInt32BE(20)];
}

function delay(milliseconds: number) {
  return new Promise<void>((resolveDelay) => setTimeout(resolveDelay, milliseconds));
}

async function ensureFastDirectory() {
  await mkdir(FAST_DIRECTORY, { recursive: true });
}

async function readJson(path: string): Promise<UnknownRecord> {
  return asRecord(JSON.parse((await readFile(path, "utf8"))));
}

async function writeJson(path: string, value: unknown) {
  await writeFile(path, jsonText(value), "utf8");
}

class CdpConnection {
  private commandId = 0;
  private readonly events: CdpEvent[] = [];
  private readonly pending = new Map<
    number,
    { resolve: (value: UnknownRecord) => void; reject: (reason: Error) => void }
  >();

  private constructor(private readonly socket: WebSocket) {
    socket.addEventListener("message", (event) => {
      const message = asRecord(JSON.parse(String(event.data)));
      if (typeof message.id === "number") {
        const pending = this.pending.get(message.id);
        if (!pending) return;
        this.pending.delete(message.id);
        const error = asRecord(message.error);
        if (Object.keys(error).length > 0) {
          pending.reject(new Error(`RANG_FAST_CDP:${String(error.message ?? "UNKNOWN")}`));
          return;
        }
        pending.resolve(asRecord(message.result));
        return;
      }
      const method = String(message.method ?? "");
      if (method) this.events.push({ method, params: asRecord(message.params) });
    });
    socket.addEventListener("error", () => {
      for (const pending of this.pending.values()) {
        pending.reject(new Error("RANG_FAST_CDP_SOCKET_ERROR"));
      }
      this.pending.clear();
    });
  }

  static async connect(url: string): Promise<CdpConnection> {
    const socket = new WebSocket(url);
    await new Promise<void>((resolveOpen, rejectOpen) => {
      const timeout = setTimeout(
        () => rejectOpen(new Error("RANG_FAST_CDP_SOCKET_TIMEOUT")),
        10_000,
      );
      socket.addEventListener(
        "open",
        () => {
          clearTimeout(timeout);
          resolveOpen();
        },
        { once: true },
      );
      socket.addEventListener(
        "error",
        () => {
          clearTimeout(timeout);
          rejectOpen(new Error("RANG_FAST_CDP_SOCKET_CONNECT"));
        },
        { once: true },
      );
    });
    return new CdpConnection(socket);
  }

  eventCount() {
    return this.events.length;
  }

  eventsAfter(index: number) {
    return this.events.slice(index);
  }

  async send(method: string, params: UnknownRecord = {}): Promise<UnknownRecord> {
    const id = ++this.commandId;
    const result = new Promise<UnknownRecord>((resolveResult, rejectResult) => {
      this.pending.set(id, { resolve: resolveResult, reject: rejectResult });
    });
    this.socket.send(JSON.stringify({ id, method, params }));
    return result;
  }

  async waitForEvent(
    method: string,
    fromIndex: number,
    timeoutMilliseconds = 15_000,
  ): Promise<CdpEvent> {
    const existing = this.eventsAfter(fromIndex).find((event) => event.method === method);
    if (existing) return existing;
    const deadline = Date.now() + timeoutMilliseconds;
    while (Date.now() < deadline) {
      await delay(25);
      const event = this.eventsAfter(fromIndex).find((entry) => entry.method === method);
      if (event) return event;
    }
    throw new Error(`RANG_FAST_CDP_EVENT_TIMEOUT:${method}`);
  }

  close() {
    this.socket.close();
  }
}

async function freePort(): Promise<number> {
  const server = createNetServer();
  await new Promise<void>((resolveListen, rejectListen) => {
    server.once("error", rejectListen);
    server.listen(0, "127.0.0.1", resolveListen);
  });
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("RANG_FAST_PORT_ADDRESS");
  }
  await new Promise<void>((resolveClose, rejectClose) =>
    server.close((error) => (error ? rejectClose(error) : resolveClose())),
  );
  return address.port;
}

function contentType(path: string): string {
  const types: Record<string, string> = {
    ".css": "text/css; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".ico": "image/x-icon",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".map": "application/json; charset=utf-8",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".txt": "text/plain; charset=utf-8",
    ".xml": "application/xml; charset=utf-8",
  };
  return types[extname(path)] ?? "application/octet-stream";
}

async function startStaticServer() {
  const outputDirectory = resolve(ROOT, "out");
  const server = createHttpServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(
        new URL(request.url ?? "/", "http://127.0.0.1").pathname,
      );
      const relativePath = pathname.endsWith("/")
        ? `${pathname}index.html`
        : pathname;
      const target = resolve(outputDirectory, `.${relativePath}`);
      if (target !== outputDirectory && !target.startsWith(`${outputDirectory}/`)) {
        response.writeHead(403).end();
        return;
      }
      const body = await readFile(target);
      response.writeHead(200, {
        "Cache-Control": "no-store",
        "Content-Type": contentType(target),
      });
      response.end(body);
    } catch {
      response.writeHead(404, { "Cache-Control": "no-store" }).end();
    }
  });
  await new Promise<void>((resolveListen, rejectListen) => {
    server.once("error", rejectListen);
    server.listen(0, "127.0.0.1", resolveListen);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("RANG_FAST_SERVER_ADDRESS");
  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: () => new Promise<void>((resolveClose, rejectClose) =>
      server.close((error) => (error ? rejectClose(error) : resolveClose())),
    ),
  };
}

async function waitForDevTools(port: number): Promise<UnknownRecord> {
  let lastError: unknown;
  for (let index = 0; index < 120; index += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (response.ok) return asRecord(await response.json());
    } catch (error) {
      lastError = error;
    }
    await delay(100);
  }
  throw new Error(`RANG_FAST_CHROMIUM_START:${String(lastError ?? "timeout")}`);
}

async function createPageWebSocket(port: number): Promise<string> {
  const response = await fetch(
    `http://127.0.0.1:${port}/json/new?${encodeURIComponent("about:blank")}`,
    { method: "PUT" },
  );
  if (!response.ok) throw new Error(`RANG_FAST_CDP_NEW_TARGET:${response.status}`);
  const target = asRecord(await response.json());
  const url = String(target.webSocketDebuggerUrl ?? "");
  if (!url.startsWith("ws://")) throw new Error("RANG_FAST_CDP_TARGET_SOCKET");
  return url;
}

async function evaluate<T>(connection: CdpConnection, expression: string): Promise<T> {
  const evaluation = await connection.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (evaluation.exceptionDetails) {
    throw new Error(`RANG_FAST_BROWSER_EVALUATE:${JSON.stringify(evaluation.exceptionDetails)}`);
  }
  return asRecord(evaluation.result).value as T;
}

function browserSurfaceExpression() {
  return `(() => {
    const text = document.body?.innerText ?? "";
    const rolePatterns = ${JSON.stringify(ROLE_PATTERNS)};
    const roleCounts = Object.fromEntries(Object.entries(rolePatterns).map(([id, source]) => [
      id,
      (text.match(new RegExp(source, "u")) ?? []).length,
    ]));
    const headings = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].map((node) => Number(node.tagName.slice(1)));
    const headingSkip = headings.some((level, index) => index > 0 && level > headings[index - 1] + 1);
    const grid = document.querySelector(".region-tile-grid");
    const gridTracks = grid
      ? getComputedStyle(grid).gridTemplateColumns.split(" ").filter(Boolean).length
      : 0;
    const header = document.querySelector(".site-header");
    return {
      title: document.title,
      viewport: [window.innerWidth, window.innerHeight],
      overflow: Math.max(document.documentElement.scrollWidth, document.body?.scrollWidth ?? 0) - window.innerWidth,
      headingLevels: headings,
      headingSkip,
      telLabels: [...document.querySelectorAll('a[href^="tel:"]')].map((node) => (node.textContent ?? "").trim()),
      roleCounts,
      headerTop: header ? Math.round(header.getBoundingClientRect().top) : null,
      tileGrid: Boolean(grid),
      tileGridTracks: gridTracks,
      terminal: Boolean(document.querySelector(".terminal-coordinate")),
      brokenImages: [...document.images].filter((image) => !image.complete || image.naturalWidth === 0).map((image) => image.currentSrc || image.src),
    };
  })()`;
}

async function inspectMobileMenu(connection: CdpConnection): Promise<UnknownRecord> {
  return evaluate<UnknownRecord>(connection, `(() => {
    const details = document.querySelector(".menu-details");
    const summary = document.querySelector(".menu-details summary");
    if (!(details instanceof HTMLDetailsElement) || !(summary instanceof HTMLElement)) return { present: false };
    summary.click();
    const links = [...details.querySelectorAll("nav a")];
    const nav = details.querySelector("nav");
    const tracks = nav ? getComputedStyle(nav).gridTemplateColumns.split(" ").filter(Boolean).length : 0;
    const minHeight = links.length
      ? Math.min(...links.map((link) => link.getBoundingClientRect().height))
      : 0;
    const overflowedLinks = links.filter((link) => {
      const rect = link.getBoundingClientRect();
      return rect.left < 0 || rect.right > window.innerWidth || rect.top < 0 || rect.bottom > window.innerHeight;
    }).length;
    return { present: true, open: details.open, links: links.length, tracks, minHeight, overflowedLinks };
  })()`);
}

async function scrollHeader(connection: CdpConnection): Promise<UnknownRecord> {
  return evaluate<UnknownRecord>(connection, `(async () => {
    const root = document.documentElement;
    const previousScrollBehavior = root.style.scrollBehavior;
    root.style.scrollBehavior = "auto";
    window.scrollTo(0, 620);
    await new Promise((resolveAnimation) => requestAnimationFrame(() => requestAnimationFrame(resolveAnimation)));
    const header = document.querySelector(".site-header");
    const result = { scrollY: Math.round(window.scrollY), headerTop: header ? Math.round(header.getBoundingClientRect().top) : null };
    root.style.scrollBehavior = previousScrollBehavior;
    return result;
  })()`);
}

function caseErrors(args: {
  qaCase: QaCase;
  viewport: Viewport;
  httpStatus: number | null;
  surface: UnknownRecord;
  menu: UnknownRecord | null;
  scroll: UnknownRecord;
  eventErrors: string[];
}) {
  const { qaCase, viewport, httpStatus, surface, menu, scroll, eventErrors } = args;
  const errors: string[] = [];
  const viewportValue = asArray(surface.viewport).map(Number);
  if (httpStatus !== 200) errors.push(`HTTP_${String(httpStatus)}`);
  if (viewportValue[0] !== viewport.width || viewportValue[1] !== viewport.height) {
    errors.push(`VIEWPORT_${viewportValue.join("x")}`);
  }
  if (Number(surface.overflow) !== 0) errors.push(`OVERFLOW_${String(surface.overflow)}`);
  if (surface.headerTop !== 0 || Number(scroll.headerTop) !== 0 || Number(scroll.scrollY) <= 0) {
    errors.push("STICKY_HEADER");
  }
  const headingLevels = asArray(surface.headingLevels).map(Number);
  if (headingLevels[0] !== 1 || surface.headingSkip !== false) {
    errors.push("HEADING_HIERARCHY");
  }
  const telLabels = asArray(surface.telLabels).map(String);
  const allowedTelLabels = new Set(["전화상담", "0508-202-3906", "☎상담"]);
  if (telLabels.length === 0 || telLabels.some((label) => !allowedTelLabels.has(label))) {
    errors.push("TEL_LABEL");
  }
  const roleCounts = asRecord(surface.roleCounts);
  if (Object.values(roleCounts).some((value) => Number(value) !== 0)) {
    errors.push("ROLE_TEXT");
  }
  if (asArray(surface.brokenImages).length !== 0) errors.push("BROKEN_IMAGES");
  if (qaCase.requiresTiles !== Boolean(surface.tileGrid)) errors.push("TILE_GRID_STATE");
  if (qaCase.requiresTerminal !== Boolean(surface.terminal)) errors.push("TERMINAL_STATE");
  const expectedTracks = 2;
  if (qaCase.requiresTiles && Number(surface.tileGridTracks) !== expectedTracks) {
    errors.push(`TILE_GRID_TRACKS_${String(surface.tileGridTracks)}`);
  }
  if (viewport.width < 641) {
    if (
      !menu ||
      menu.present !== true ||
      menu.open !== true ||
      Number(menu.links) !== 7 ||
      Number(menu.tracks) !== 1 ||
      Number(menu.minHeight) < 40 ||
      Number(menu.overflowedLinks) !== 0
    ) {
      errors.push("MOBILE_MENU");
    }
  }
  errors.push(...eventErrors);
  return errors;
}

function eventFailures(events: CdpEvent[], url: string): { httpStatus: number | null; errors: string[] } {
  let httpStatus: number | null = null;
  const errors: string[] = [];
  for (const event of events) {
    if (event.method === "Network.responseReceived") {
      const response = asRecord(event.params.response);
      const responseUrl = String(response.url ?? "");
      const status = Number(response.status);
      if (responseUrl === url) httpStatus = status;
      if (status >= 400 && !responseUrl.endsWith("/favicon.ico")) {
        errors.push(`NETWORK_${String(status)}:${responseUrl}`);
      }
    }
    if (event.method === "Network.loadingFailed") {
      const errorText = String(event.params.errorText ?? "unknown");
      if (event.params.canceled !== true && errorText !== "net::ERR_ABORTED") {
        errors.push(`NETWORK_FAILED:${errorText}`);
      }
    }
    if (event.method === "Runtime.exceptionThrown") {
      errors.push("RUNTIME_EXCEPTION");
    }
    if (event.method === "Log.entryAdded") {
      const entry = asRecord(event.params.entry);
      if (["warning", "error"].includes(String(entry.level ?? ""))) {
        errors.push(`LOG_${String(entry.level)}:${String(entry.text ?? "")}`);
      }
    }
    if (event.method === "Runtime.consoleAPICalled") {
      const type = String(event.params.type ?? "");
      if (["warning", "error"].includes(type)) errors.push(`CONSOLE_${type}`);
    }
  }
  return { httpStatus, errors };
}

async function runBrowserCase(args: {
  connection: CdpConnection;
  baseUrl: string;
  qaCase: QaCase;
  viewport: Viewport;
  screenshotDirectory: string;
}) {
  const { connection, baseUrl, qaCase, viewport, screenshotDirectory } = args;
  await connection.send("Emulation.setDeviceMetricsOverride", {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
    mobile: false,
  });
  const url = `${baseUrl}${qaCase.route}`;
  const eventStart = connection.eventCount();
  await connection.send("Page.navigate", { url });
  await connection.waitForEvent("Page.loadEventFired", eventStart);
  await delay(250);
  const surface = await evaluate<UnknownRecord>(connection, browserSurfaceExpression());
  const screenshotResponse = await connection.send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false,
  });
  const screenshot = Buffer.from(String(screenshotResponse.data ?? ""), "base64");
  const screenshotPath = resolve(screenshotDirectory, `${qaCase.id}-${viewport.width}.png`);
  await writeFile(screenshotPath, screenshot);
  const scroll = await scrollHeader(connection);
  const menu = viewport.width < 641 ? await inspectMobileMenu(connection) : null;
  const events = connection.eventsAfter(eventStart);
  const eventState = eventFailures(events, url);
  const errors = caseErrors({
    qaCase,
    viewport,
    httpStatus: eventState.httpStatus,
    surface,
    menu,
    scroll,
    eventErrors: eventState.errors,
  });
  return {
    id: `${qaCase.id}-${viewport.width}`,
    kind: qaCase.kind,
    route: qaCase.route,
    viewport: [viewport.width, viewport.height],
    httpStatus: eventState.httpStatus,
    surface,
    mobileMenu: menu,
    stickyHeader: scroll,
    screenshot: relative(ROOT, screenshotPath),
    screenshotSha256: sha256(screenshot),
    imageMagicHex: screenshot.subarray(0, 8).toString("hex"),
    imageDimensions: pngDimensions(screenshot),
    consoleNetworkErrors: eventState.errors,
    errors,
    status: errors.length === 0 ? "PASS" : "FAIL",
  };
}

function localChromeVersion(): string {
  const command = spawnSync(CHROME_PATH, ["--version"], { encoding: "utf8" });
  if (command.status !== 0) throw new Error("RANG_FAST_CHROMIUM_VERSION");
  return command.stdout.trim();
}

async function generateBrowserQa(context: FastContext) {
  await ensureFastDirectory();
  const staticServer = await startStaticServer();
  const debugPort = await freePort();
  const chromeProfile = await mkdtemp(resolve(tmpdir(), "rang-fast-chromium-"));
  const screenshotDirectory = resolve(FAST_DIRECTORY, "screenshots", context.candidate.id);
  await mkdir(screenshotDirectory, { recursive: true });
  const chrome = spawn(CHROME_PATH, [
    "--headless=new",
    `--remote-debugging-port=${debugPort}`,
    "--remote-allow-origins=*",
    `--user-data-dir=${chromeProfile}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-background-networking",
    "--disable-component-update",
    "--disable-default-apps",
    "--disable-extensions",
    "--disable-sync",
    "--hide-scrollbars",
    "about:blank",
  ], { detached: true, stdio: "ignore" });
  let connection: CdpConnection | undefined;
  try {
    await waitForDevTools(debugPort);
    connection = await CdpConnection.connect(await createPageWebSocket(debugPort));
    await connection.send("Page.enable");
    await connection.send("Runtime.enable");
    await connection.send("Log.enable");
    await connection.send("Network.enable");
    const cases = [];
    for (const qaCase of QA_CASES) {
      for (const viewport of VIEWPORTS) {
        cases.push(await runBrowserCase({
          connection,
          baseUrl: staticServer.baseUrl,
          qaCase,
          viewport,
          screenshotDirectory,
        }));
      }
    }
    const report = {
      schemaVersion: "rang-fast-local-chromium-qa/v1",
      status: cases.every((entry) => entry.status === "PASS") ? "PASS" : "FAIL",
      platformId: "rang-therapy",
      candidate: context.candidate,
      qa: {
        kind: "LOCAL_CHROMIUM",
        iabClaimed: false,
        browser: localChromeVersion(),
        mode: "headless CDP against the current static export",
        routeMatrix: ["root", "hub", "leaf"],
        viewports: VIEWPORTS.map(({ width, height }) => [width, height]),
        casesExpected: QA_CASES.length * VIEWPORTS.length,
        casesCompleted: cases.length,
      },
      cases,
    };
    await writeJson(BROWSER_REPORT_PATH, report);
    if (report.status !== "PASS") {
      throw new Error(`RANG_FAST_LOCAL_CHROMIUM_FAILED:${JSON.stringify(cases.filter((entry) => entry.status !== "PASS").map((entry) => ({ id: entry.id, errors: entry.errors })))}`);
    }
    return report;
  } finally {
    connection?.close();
    await stopChrome(chrome);
    await rm(chromeProfile, { recursive: true, force: true });
    await staticServer.close();
  }
}

async function stopChrome(chrome: ChildProcess) {
  if (!chrome.pid || chrome.exitCode !== null || chrome.signalCode !== null) return;
  const exited = new Promise<void>((resolveExit) => chrome.once("exit", () => resolveExit()));
  try {
    process.kill(-chrome.pid, "SIGTERM");
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes("ESRCH")) throw error;
  }
  await Promise.race([exited, delay(3_000)]);
  if (chrome.exitCode === null && chrome.signalCode === null) {
    try {
      process.kill(-chrome.pid, "SIGKILL");
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes("ESRCH")) throw error;
    }
    await Promise.race([exited, delay(3_000)]);
  }
}

function assertAiReview(context: FastContext, review: UnknownRecord) {
  const expected = buildFastAiReview(context);
  if (!sameJson(review, expected)) throw new Error("RANG_FAST_AI_REVIEW_EXACT");
  const reviewer = asRecord(review.reviewer);
  if (
    review.status !== "AI_REVIEW_COMPLETE" ||
    reviewer.kind !== "AI" ||
    reviewer.humanReviewClaimed !== false
  ) {
    throw new Error("RANG_FAST_AI_REVIEW_LABEL");
  }
}

async function assertBrowserQa(context: FastContext, report: UnknownRecord) {
  assertCandidate(report.candidate, context.candidate, "RANG_FAST_LOCAL_CHROMIUM");
  const qa = asRecord(report.qa);
  const cases = asArray(report.cases).map(asRecord);
  if (
    report.schemaVersion !== "rang-fast-local-chromium-qa/v1" ||
    report.status !== "PASS" ||
    report.platformId !== "rang-therapy" ||
    qa.kind !== "LOCAL_CHROMIUM" ||
    qa.iabClaimed !== false ||
    qa.casesExpected !== 9 ||
    qa.casesCompleted !== 9 ||
    cases.length !== 9 ||
    cases.some((entry) => entry.status !== "PASS")
  ) {
    throw new Error("RANG_FAST_LOCAL_CHROMIUM_CONTRACT");
  }
  const expectedIds = new Set(
    QA_CASES.flatMap((qaCase) => VIEWPORTS.map((viewport) => `${qaCase.id}-${viewport.width}`)),
  );
  if (new Set(cases.map((entry) => String(entry.id ?? ""))).size !== expectedIds.size) {
    throw new Error("RANG_FAST_LOCAL_CHROMIUM_CASE_IDS");
  }
  for (const entry of cases) {
    const id = String(entry.id ?? "");
    if (!expectedIds.has(id)) throw new Error(`RANG_FAST_LOCAL_CHROMIUM_CASE:${id}`);
    const screenshot = String(entry.screenshot ?? "");
    const buffer = await readFile(resolve(ROOT, screenshot));
    if (
      entry.imageMagicHex !== PNG_MAGIC_HEX ||
      entry.screenshotSha256 !== sha256(buffer) ||
      !sameJson(entry.imageDimensions, pngDimensions(buffer))
    ) {
      throw new Error(`RANG_FAST_LOCAL_CHROMIUM_SCREENSHOT:${id}`);
    }
  }
}

async function buildReceipt(context: FastContext) {
  const aiBuffer = await readFile(AI_REVIEW_PATH);
  const browserBuffer = await readFile(BROWSER_REPORT_PATH);
  const aiReview = asRecord(JSON.parse(aiBuffer.toString("utf8")));
  const browserQa = asRecord(JSON.parse(browserBuffer.toString("utf8")));
  assertAiReview(context, aiReview);
  await assertBrowserQa(context, browserQa);
  return {
    schemaVersion: "rang-fast-candidate/v1",
    status: "FAST_CANDIDATE",
    platformId: "rang-therapy",
    candidate: context.candidate,
    evidence: {
      builtOutputAudit: {
        path: "qa/content/built-output-audit.v1.json",
        sha256: sha256(context.builtAuditBuffer),
        status: context.builtAudit.status,
      },
      aiCopyReview: {
        path: "qa/fast/ai-copy-review.v1.json",
        sha256: sha256(aiBuffer),
        status: aiReview.status,
        reviewerKind: asRecord(aiReview.reviewer).kind,
      },
      localChromiumQa: {
        path: "qa/fast/local-chromium-qa.v1.json",
        sha256: sha256(browserBuffer),
        status: browserQa.status,
        kind: asRecord(browserQa.qa).kind,
        iabClaimed: asRecord(browserQa.qa).iabClaimed,
      },
    },
    releaseScope: {
      profile: "FAST",
      fastCandidateEligible: true,
      deploymentEligible: true,
      deploymentBlockers: [],
    },
    crossPlatform: {
      status: "PENDING_FINAL_CROSS_PLATFORM_COMPARISON",
      blockingForFastCandidate: false,
      includedLegacyPlatforms: [],
      finalInput: {
        corpusSha256: context.candidate.corpusSha256,
        sourceManifestSha256: context.candidate.sourceManifestSha256,
        seoMetadataSha256: context.candidate.inputHashes.seoMetadataSha256,
        renderedCopySurfaceSha256: context.candidate.inputHashes.renderedCopySurfaceSha256,
        actualDomSurfaceSha256: context.candidate.inputHashes.actualDomSurfaceSha256,
      },
      note: "Frozen Massage Love/Rang/Mixed candidates are compared once by the separate final comparator. This receipt neither reads nor binds legacy MassageBom or Star evidence.",
    },
    pendingAnnotations: [
      {
        id: "IN_APP_BROWSER_QA",
        status: "NOT_RUN",
        blockingForFastCandidate: false,
        note: "Current browser evidence is reproducible local Chromium QA; it is not labeled IAB QA.",
      },
      {
        id: "EXTERNAL_HUMAN_COPY_APPROVAL",
        status: "NOT_RUN",
        blockingForFastCandidate: false,
        note: "Current selected-copy evidence is explicitly AI review, not human approval.",
      },
    ],
  };
}

async function runAiGenerate() {
  const context = await loadFastContext(ROOT);
  const review = buildFastAiReview(context);
  await ensureFastDirectory();
  await writeJson(AI_REVIEW_PATH, review);
  process.stdout.write(`${JSON.stringify({ status: review.status, candidateId: context.candidate.id, semanticCandidates: 12, routeSamples: 33 })}\n`);
}

async function runAiAudit() {
  const context = await loadFastContext(ROOT);
  const review = await readJson(AI_REVIEW_PATH);
  assertAiReview(context, review);
  process.stdout.write(`${JSON.stringify({ status: "PASS", artifact: "AI_REVIEW", candidateId: context.candidate.id })}\n`);
}

async function runBrowserGenerate() {
  const context = await loadFastContext(ROOT);
  const report = await generateBrowserQa(context);
  process.stdout.write(`${JSON.stringify({ status: report.status, artifact: "LOCAL_CHROMIUM_QA", candidateId: context.candidate.id, cases: 9 })}\n`);
}

async function runReceiptGenerate() {
  const context = await loadFastContext(ROOT);
  const receipt = await buildReceipt(context);
  await ensureFastDirectory();
  await writeJson(RECEIPT_PATH, receipt);
  process.stdout.write(`${JSON.stringify({ status: receipt.status, candidateId: context.candidate.id, crossPlatform: asRecord(receipt.crossPlatform).status })}\n`);
}

async function runReceiptAudit() {
  const context = await loadFastContext(ROOT);
  const receipt = await readJson(RECEIPT_PATH);
  const expected = await buildReceipt(context);
  if (!sameJson(receipt, expected)) throw new Error("RANG_FAST_RECEIPT_EXACT");
  if (
    receipt.status !== "FAST_CANDIDATE" ||
    asRecord(receipt.crossPlatform).status !== "PENDING_FINAL_CROSS_PLATFORM_COMPARISON" ||
    asRecord(receipt.crossPlatform).blockingForFastCandidate !== false
  ) {
    throw new Error("RANG_FAST_RECEIPT_STATUS");
  }
  process.stdout.write(`${JSON.stringify({ status: "PASS", artifact: "FAST_CANDIDATE_RECEIPT", candidateId: context.candidate.id })}\n`);
}

const command = process.argv[2];
if (command === "ai") await runAiGenerate();
else if (command === "audit-ai") await runAiAudit();
else if (command === "browser") await runBrowserGenerate();
else if (command === "receipt") await runReceiptGenerate();
else if (command === "audit") await runReceiptAudit();
else throw new Error("RANG_FAST_COMMAND: ai | audit-ai | browser | receipt | audit");
