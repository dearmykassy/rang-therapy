import { createHash } from "node:crypto";

export const ACTUAL_DOM_SURFACE_VERSION =
  "rang-actual-dom-visible-multiset/v1" as const;

export type ActualDomSurface = {
  contractVersion: typeof ACTUAL_DOM_SURFACE_VERSION;
  directText: string[];
  fullBlockText: string[];
  accessibilityText: string[];
  counts: {
    directText: number;
    fullBlockText: number;
    accessibilityText: number;
    exactMultiset: number;
  };
  exactMultisetSha256: string;
};

type TextNode = { kind: "text"; value: string };
type ElementNode = {
  kind: "element";
  tag: string;
  attributes: Record<string, string>;
  children: DomNode[];
};
type DomNode = TextNode | ElementNode;

const VOID_TAGS = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
]);

const EXCLUDED_TEXT_TAGS = new Set([
  "head",
  "script",
  "style",
  "template",
  "noscript",
  "svg",
]);

const FULL_BLOCK_TAGS = new Set([
  "a",
  "button",
  "summary",
  "details",
  "nav",
  "header",
  "footer",
  "main",
  "section",
  "article",
  "aside",
  "div",
  "ul",
  "ol",
  "li",
]);

const ACCESSIBILITY_ATTRIBUTES = [
  "aria-label",
  "aria-description",
  "alt",
  "title",
] as const;

function decodeHtml(value: string): string {
  const named: Record<string, string> = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: '"',
  };
  return value.replace(
    /&(#x[0-9a-f]+|#\d+|[a-z]+);/giu,
    (_match, entity: string) => {
      if (entity.startsWith("#x")) {
        return String.fromCodePoint(Number.parseInt(entity.slice(2), 16));
      }
      if (entity.startsWith("#")) {
        return String.fromCodePoint(Number.parseInt(entity.slice(1), 10));
      }
      return named[entity.toLowerCase()] ?? `&${entity};`;
    },
  );
}

export function normalizeDomSurfaceText(value: string): string {
  return decodeHtml(value).replace(/\s+/gu, " ").trim().normalize("NFC");
}

function parseAttributes(token: string): Record<string, string> {
  const attributes: Record<string, string> = {};
  const head = token.match(/^<\s*[a-z][a-z0-9:-]*/iu)?.[0].length ?? 1;
  const source = token.slice(head, token.length - (token.endsWith("/>") ? 2 : 1));
  for (const match of source.matchAll(
    /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/gu,
  )) {
    const name = match[1].toLowerCase();
    attributes[name] = decodeHtml(match[2] ?? match[3] ?? match[4] ?? "");
  }
  return attributes;
}

function parseHtml(value: string): ElementNode {
  // React inserts empty hydration comments between adjacent dynamic and
  // literal text (for example `60<!-- -->분`). They are not visible and must
  // not split one customer-facing phrase into two audit tokens.
  const hydrationNormalized = value.replace(/<!--\s*-->/gu, "");
  const root: ElementNode = {
    kind: "element",
    tag: "#document",
    attributes: {},
    children: [],
  };
  const stack: ElementNode[] = [root];
  for (const token of hydrationNormalized.match(/<!--[\s\S]*?-->|<![^>]*>|<[^>]+>|[^<]+/gu) ?? []) {
    if (token.startsWith("<!--") || token.startsWith("<!")) continue;
    if (!token.startsWith("<")) {
      stack.at(-1)?.children.push({ kind: "text", value: token });
      continue;
    }
    const closing = token.match(/^<\s*\/\s*([a-z][a-z0-9:-]*)/iu);
    if (closing) {
      const tag = closing[1].toLowerCase();
      while (stack.length > 1) {
        const current = stack.pop();
        if (current?.tag === tag) break;
      }
      continue;
    }
    const opening = token.match(/^<\s*([a-z][a-z0-9:-]*)/iu);
    if (!opening) continue;
    const tag = opening[1].toLowerCase();
    const element: ElementNode = {
      kind: "element",
      tag,
      attributes: parseAttributes(token),
      children: [],
    };
    stack.at(-1)?.children.push(element);
    if (!VOID_TAGS.has(tag) && !token.endsWith("/>")) stack.push(element);
  }
  return root;
}

function classNames(node: ElementNode): Set<string> {
  return new Set((node.attributes.class ?? "").split(/\s+/u).filter(Boolean));
}

function collectElements(node: DomNode): ElementNode[] {
  if (node.kind === "text") return [];
  return [node, ...node.children.flatMap(collectElements)];
}

function visibleTokens(node: DomNode, excluded = false): string[] {
  if (node.kind === "text") {
    if (excluded) return [];
    const value = normalizeDomSurfaceText(node.value);
    return value ? [value] : [];
  }
  const nextExcluded = excluded || EXCLUDED_TEXT_TAGS.has(node.tag) || "hidden" in node.attributes;
  return node.children.flatMap((child) => visibleTokens(child, nextExcluded));
}

function sortMultiset(values: readonly string[]): string[] {
  return [...values].sort((left, right) => left.localeCompare(right, "ko"));
}

function surfaceSha256(surface: Pick<ActualDomSurface, "directText" | "fullBlockText" | "accessibilityText">): string {
  return createHash("sha256")
    .update(JSON.stringify({
      directText: surface.directText,
      fullBlockText: surface.fullBlockText,
      accessibilityText: surface.accessibilityText,
    }))
    .digest("hex");
}

/**
 * Extract the complete customer-facing shell rather than relying on opt-in
 * data attributes. Direct visible text includes decorative separators because
 * they are pixels a customer sees. Accessibility labels and alt/title values
 * are audited separately. Composite blocks preserve the full accessible text
 * of links, navigation groups, cards and page sections so nested copy cannot
 * disappear between the declared corpus and the built DOM.
 */
export function extractActualDomSurface(html: string): ActualDomSurface {
  const document = parseHtml(html);
  const allElements = collectElements(document);
  const roots = allElements.filter((node) =>
    (node.tag === "header" && classNames(node).has("site-header")) ||
    node.tag === "main" ||
    (node.tag === "footer" && classNames(node).has("site-footer"))
  );
  if (roots.length !== 3) {
    throw new Error(`RANG_DOM_SURFACE_SHELL_ROOTS:${roots.length}`);
  }

  const directText: string[] = [];
  const fullBlockText: string[] = [];
  const accessibilityText: string[] = [];
  for (const root of roots) {
    for (const element of collectElements(root)) {
      if (EXCLUDED_TEXT_TAGS.has(element.tag) || "hidden" in element.attributes) continue;
      for (const child of element.children) {
        if (child.kind !== "text") continue;
        const value = normalizeDomSurfaceText(child.value);
        if (value) directText.push(value);
      }
      for (const attribute of ACCESSIBILITY_ATTRIBUTES) {
        const value = normalizeDomSurfaceText(element.attributes[attribute] ?? "");
        if (value) accessibilityText.push(`${attribute}:${value}`);
      }
      const tokens = visibleTokens(element);
      if (FULL_BLOCK_TAGS.has(element.tag) && tokens.length > 1) {
        fullBlockText.push(tokens.join(" "));
      }
    }
  }

  const sorted = {
    directText: sortMultiset(directText),
    fullBlockText: sortMultiset(fullBlockText),
    accessibilityText: sortMultiset(accessibilityText),
  };
  return {
    contractVersion: ACTUAL_DOM_SURFACE_VERSION,
    ...sorted,
    counts: {
      directText: sorted.directText.length,
      fullBlockText: sorted.fullBlockText.length,
      accessibilityText: sorted.accessibilityText.length,
      exactMultiset:
        sorted.directText.length +
        sorted.fullBlockText.length +
        sorted.accessibilityText.length,
    },
    exactMultisetSha256: surfaceSha256(sorted),
  };
}

export function actualDomSurfaceValues(surface: ActualDomSurface): string[] {
  return [
    ...surface.directText,
    ...surface.fullBlockText,
    ...surface.accessibilityText,
  ];
}
