import type { Metadata } from "next";
import { RegionGallery } from "@/components/RegionGallery";
import { ACTIVE_ROOT_KEYS, getRootNode, ROOT_LABELS } from "@/lib/regions";
import {
  createRouteMetadataContract,
  toNextMetadata,
} from "@/lib/metadata";

export const metadataContract = createRouteMetadataContract(
  "/areas/",
  "지역 갤러리 · 랑테라피",
  "랑테라피 운영 지역을 도시부터 동네까지 순서대로 찾습니다.",
);
export const metadata: Metadata = toNextMetadata(metadataContract);

export default function AreasPage() {
  const roots = ACTIVE_ROOT_KEYS.map((key) => ({
    name: ROOT_LABELS[key].full,
    path: getRootNode(key).path,
    representativeCount: getRootNode(key).records.length,
  }));
  return (
    <main className="areas-page" data-image-state="planned-no-assets">
      <section className="page-intro">
        <p className="eyebrow">RANG THERAPY · SERVICE AREA</p>
        <h1>우리 지역 찾기</h1>
        <p>도시부터 시·군·구와 연결 지역까지 순서대로 선택해 안내를 확인하세요.</p>
      </section>
      <RegionGallery
        items={roots}
        label="SERVICE AREA"
        summary="전국 주요 권역에서 원하는 지역을 선택해 주세요."
        title="전국 출장 마사지 지역 안내"
      />
    </main>
  );
}
