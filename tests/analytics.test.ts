import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  inferAnalyticsPageType,
  normalizePagePath,
  parseGaMeasurementId,
  resolveCtaLocation,
  sanitizePageTitle,
} from "@/lib/analytics";

const trackerSource = readFileSync(
  fileURLToPath(new URL("../src/components/Ga4Tracker.tsx", import.meta.url)),
  "utf8",
);

describe("GA4 analytics contract", () => {
  it("accepts only GA4 web measurement IDs", () => {
    expect(parseGaMeasurementId(" G-ABC1234 ")).toBe("G-ABC1234");
    expect(parseGaMeasurementId(undefined)).toBeUndefined();
    expect(parseGaMeasurementId("UA-123-1")).toBeUndefined();
    expect(parseGaMeasurementId("G-ABC';alert(1)")).toBeUndefined();
  });

  it("normalizes query-free paths and infers stable page types", () => {
    expect(normalizePagePath("areas/seoul?private=value")).toBe("/areas/seoul/");
    expect(inferAnalyticsPageType("/")).toBe("home");
    expect(inferAnalyticsPageType("/areas/")).toBe("area_index");
    expect(inferAnalyticsPageType("/areas/seoul/gangnam/")).toBe("region");
    expect(inferAnalyticsPageType("/blog/example/")).toBe("blog_post");
    expect(inferAnalyticsPageType("/pricing/")).toBe("pricing");
  });

  it("removes phone numbers and email-like values from CTA context", () => {
    expect(resolveCtaLocation(undefined, "0508-202-3906 전화상담", undefined)).toBe("전화상담");
    expect(resolveCtaLocation(undefined, "0508-202-3906", undefined)).toBe("phone_cta");
    expect(resolveCtaLocation("footer", "0508-202-3906", undefined)).toBe("footer");
  });

  it("redacts and length-limits page titles", () => {
    const title = `예약 문의 0508-202-3906 user@example.com ${"가".repeat(120)}`;
    const sanitized = sanitizePageTitle(title);
    expect(sanitized).not.toContain("0508");
    expect(sanitized).not.toContain("@");
    expect(sanitized).toHaveLength(100);
  });

  it("delegates every tel link and emits clicks without claiming call completion", () => {
    expect(trackerSource).toContain('a[href^="tel:"]');
    expect(trackerSource).toContain('document.addEventListener("click", handlePhoneClick, true)');
    expect(trackerSource).toContain('"phone_cta_clicked"');
    expect(trackerSource).toContain("page_location: `${window.location.origin}${pagePath}`");
    expect(trackerSource).toContain("page_title: sanitizePageTitle(document.title)");
    expect(trackerSource).toContain('transport_type: "beacon"');
    expect(trackerSource).toContain("platform_id");
    expect(trackerSource).toContain("page_path");
    expect(trackerSource).toContain("page_type");
    expect(trackerSource).toContain("cta_location");
    expect(trackerSource).not.toContain("phone_call_completed");
    expect(trackerSource).not.toContain("anchor.href");
  });
});
