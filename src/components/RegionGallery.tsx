import Link from "@/components/SiteLink";
import type { RegionPageModel } from "@/lib/region-page-model";
import type { RegionChild } from "@/lib/regions";

type Item = Pick<RegionChild, "name" | "path" | "representativeCount">;

type RegionGalleryProps = {
  regionModel?: RegionPageModel["gallery"];
  items?: Item[];
  label?: string;
  title?: string;
  summary?: string;
};

/**
 * This is the sole card directory for both the root area index and each
 * regional page. Passing direct children keeps every non-leaf route linked
 * to the next level and avoids orphaned programmatic pages.
 */
export function RegionGallery({
  regionModel,
  items,
  label = "SERVICE AREA",
  title,
  summary,
}: RegionGalleryProps) {
  const regions = regionModel?.items ?? items ?? [];
  const regional = Boolean(regionModel);
  const heading = regionModel?.heading ?? title ?? "전국 운영 지역";
  const supportingCopy =
    regionModel?.summary ??
    summary ??
    (regions.length > 0 ? `${regions.length}개 주요 권역` : "운영 지역을 준비 중입니다.");

  return (
    <section className="content-section region-directory" aria-labelledby="region-directory-title">
      <div className="section-heading">
        <div>
          <span
            className="section-label"
            {...(regionModel ? { "data-region-copy-id": regionModel.indexCopyId } : {})}
          >
            {regionModel?.index ?? label}
          </span>
          <h2
            id="region-directory-title"
            {...(regionModel ? { "data-region-copy-id": regionModel.headingCopyId } : {})}
          >
            {heading}
          </h2>
        </div>
        <p {...(regionModel ? { "data-region-copy-id": regionModel.summaryCopyId } : {})}>
          {supportingCopy}
        </p>
      </div>

      {regionModel ? (
        <article className="detail-card region-directory-guide" id={regionModel.guide.section.id}>
          <span>지역 선택 안내</span>
          <h2 data-region-copy-id={regionModel.guide.headingCopyId}>
            {regionModel.guide.section.heading}
          </h2>
          {regionModel.guide.section.paragraphs.map((paragraph, index) => (
            <p
              data-region-copy-id={regionModel.guide.paragraphCopyIds[index]}
              key={regionModel.guide.paragraphCopyIds[index]}
            >
              {paragraph}
            </p>
          ))}
          <Link
            className="region-guide-link"
            href={regionModel.guide.actionPath}
          >
            <span data-region-copy-id={regionModel.guide.actionCopyId}>
              {regionModel.guide.actionLabel}
            </span>
            <span aria-hidden="true"> →</span>
          </Link>
        </article>
      ) : null}

      {regions.length > 0 ? (
        <div className="child-grid region-tile-grid">
          {regions.map((region, index) => (
            <Link className="child-card region-tile" href={region.path} key={region.path}>
              <span
                {...(regional ? { "data-region-copy-id": `gallery:item:${index}:number` } : {})}
              >
                {"number" in region ? region.number : String(index + 1).padStart(2, "0")}
              </span>
              <strong
                {...(regional ? { "data-region-copy-id": `gallery:item:${index}:name` } : {})}
              >
                {region.name}
              </strong>
              <small
                {...(regional ? { "data-region-copy-id": `gallery:item:${index}:count` } : {})}
              >
                {"countLabel" in region
                  ? region.countLabel
                  : `${region.representativeCount}개 연결 지역`}
              </small>
            </Link>
          ))}
        </div>
      ) : (
        <article className="detail-card terminal-coordinate">
          <span aria-hidden="true">◎</span>
          <p
            {...(regionModel ? { "data-region-copy-id": regionModel.terminalCopyId } : {})}
          >
            {regionModel?.terminal ?? "서비스를 받을 도로명과 건물명은 전화로 확인합니다."}
          </p>
        </article>
      )}
    </section>
  );
}
