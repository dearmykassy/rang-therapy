import regionalImageAssignmentsJson from "@/data/regional-image-assignments.generated.json";

type ImageVariant = "desktop" | "tablet" | "mobile";

type RegionalImageAssignment = {
  assetId: string;
  jobId: string;
  sources: Record<ImageVariant, string>;
  palette: {
    primary: string;
    secondary: string;
    navigation: {
      text: string;
      overlay: string;
      backdropFilter: string;
    };
  };
  provenance: string;
};

type RegionalImageAssignmentsManifest = {
  schemaVersion: string;
  status: string;
  distribution: { routes: number };
  routes: Record<string, RegionalImageAssignment>;
};

const manifest = regionalImageAssignmentsJson as unknown as RegionalImageAssignmentsManifest;
const HEX_COLOR = /^#[0-9a-f]{6}$/i;
const ASSET_ID = /^rng-rgn-\d{3}-c01$/;
const IMAGE_VARIANTS: readonly ImageVariant[] = ["desktop", "tablet", "mobile"];

function fail(code: string): never {
  throw new Error(`RANG_THERAPY_REGIONAL_IMAGE_RUNTIME_${code}`);
}

function assertHex(value: string, code: string): asserts value is string {
  if (!HEX_COLOR.test(value)) fail(code);
}

function rgba(hex: string, opacity: number): string {
  const normalized = hex.slice(1);
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
}

function validateAssignment(route: string, assignment: RegionalImageAssignment): void {
  if (!ASSET_ID.test(assignment.assetId) || assignment.assetId !== assignment.jobId) {
    fail(`ASSET_ID_${route}`);
  }

  for (const variant of IMAGE_VARIANTS) {
    const expected = `/assets/rang-therapy/regional/${assignment.assetId}/${variant}.webp`;
    if (assignment.sources[variant] !== expected) fail(`SOURCE_${route}_${variant}`);
  }

  assertHex(assignment.palette.primary, `PRIMARY_${route}`);
  assertHex(assignment.palette.secondary, `SECONDARY_${route}`);
  assertHex(assignment.palette.navigation.overlay, `OVERLAY_${route}`);
  if (!["#ffffff", "#000000"].includes(assignment.palette.navigation.text)) {
    fail(`TEXT_${route}`);
  }
  if (assignment.palette.navigation.backdropFilter !== "blur(18px)") {
    fail(`BACKDROP_FILTER_${route}`);
  }
}

function validateManifest(): Record<string, RegionalImageAssignment> {
  if (
    manifest.schemaVersion !== "rang-therapy-regional-image-assignments/v1" ||
    manifest.status !== "ROOT_APPROVED_RELEASED" ||
    manifest.distribution.routes !== 1291
  ) {
    fail("MANIFEST_STATE");
  }

  const entries = Object.entries(manifest.routes);
  if (entries.length !== manifest.distribution.routes) fail("ROUTE_COUNT");
  for (const [route, assignment] of entries) validateAssignment(route, assignment);
  return manifest.routes;
}

const ASSIGNMENTS = validateManifest();

/**
 * Regional images only become reachable after the release manifest proves its
 * root approval, source variants, and palette contract. A missing assignment
 * is intentionally a hard error rather than a visual placeholder.
 */
export function getRegionalImageAssignment(route: string): RegionalImageAssignment {
  const assignment = ASSIGNMENTS[route];
  if (!assignment) fail(`ROUTE_MISSING_${route}`);
  return assignment;
}

/**
 * The header lives in the root layout, above the route component. The route
 * therefore emits custom properties on `body` only while its data attribute
 * is present. This also prevents a previously streamed style tag from tinting
 * a subsequent fixed page during client navigation.
 */
export function regionalHeaderThemeCss(assignment: RegionalImageAssignment): string {
  const { primary, secondary, navigation } = assignment.palette;
  const { overlay, text, backdropFilter } = navigation;
  const actionText = text === "#ffffff" ? overlay : "#fffdfc";

  return `body:has(main.region-page[data-regional-image-id="${assignment.assetId}"]) {
    --regional-header-background: linear-gradient(135deg, ${rgba(overlay, 0.96)} 0%, ${rgba(primary, 0.9)} 54%, ${rgba(secondary, 0.78)} 100%);
    --regional-header-text: ${text};
    --regional-header-border: ${rgba(text, 0.3)};
    --regional-header-panel: ${rgba(text, 0.12)};
    --regional-header-panel-border: ${rgba(text, 0.36)};
    --regional-header-action-background: ${text};
    --regional-header-action-text: ${actionText};
    --regional-header-backdrop-filter: ${backdropFilter};
    --regional-hero-left-overlay: ${rgba(overlay, 0.96)};
    --regional-hero-middle-overlay: ${rgba(overlay, 0.76)};
    --regional-hero-bottom-overlay: ${rgba(overlay, 0.66)};
  }`;
}

export type { RegionalImageAssignment };
