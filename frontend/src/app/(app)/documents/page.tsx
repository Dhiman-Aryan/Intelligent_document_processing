import { DocumentsPageContent } from "@/components/documents/documents-page-content";
import { DocumentsTableSkeleton } from "@/components/documents/documents-table-skeleton";
import { Suspense } from "react";

export default function DocumentsPage() {
  return (
    <Suspense fallback={<DocumentsTableSkeleton />}>
      <DocumentsPageContent />
    </Suspense>
  );
}
