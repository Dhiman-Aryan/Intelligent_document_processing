import { DocumentDetailLoader } from "@/components/documents/detail/document-detail-loader";

export default async function DocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <DocumentDetailLoader fileId={id} />;
}
