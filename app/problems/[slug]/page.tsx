import { ProblemWorkspace } from "@/components/ProblemWorkspace";
import { PROBLEMS } from "@/problems";

export const dynamicParams = false;

export function generateStaticParams() {
  return PROBLEMS.map((p) => ({ slug: p.slug }));
}

export default async function ProblemPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <ProblemWorkspace slug={slug} />;
}
