import Link from "next/link";
import { notFound } from "next/navigation";
import { ArtifactDetailsSection } from "@/components/dashboard/artifacts-section";
import { PageIntro } from "@/components/dashboard/page-intro";
import { PageShell } from "@/components/dashboard/page-shell";
import { readArtifactById } from "@/lib/engine-artifacts";

export const dynamic = "force-dynamic";

type ArtifactDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ArtifactDetailPage({ params }: ArtifactDetailPageProps) {
  const { id } = await params;
  const artifact = readArtifactById(id);

  if (!artifact) {
    notFound();
  }

  return (
    <PageShell>
      <Link href="/artifacts" className="text-sm text-info hover:text-blue-300">
        Back to artifacts
      </Link>
      <PageIntro
        eyebrow="Run Detail"
        title="Individual engine run diagnostics."
        subtitle="Review timing, metrics, events, and raw artifact context for this generated run."
      />
      <ArtifactDetailsSection artifact={artifact} />
    </PageShell>
  );
}
