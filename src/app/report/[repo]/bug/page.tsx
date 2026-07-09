import PaginaTipo from "../tipo-page";

export default async function BugPage({ params }: { params: Promise<{ repo: string }> }) {
  const { repo } = await params;
  return <PaginaTipo repo={repo} tipo="bug" />;
}
