import { AdminHeader } from "@/components/admin/AdminHeader";
import { PdfTemplateEditor } from "@/components/admin/PdfTemplateEditor";

export default function PdfTemplatePage() {
  return (
    <div className="min-h-screen bg-background">
      <AdminHeader />
      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-heading font-semibold text-foreground">
            PDF Template
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Edit the copy and accent color used in the delivered feedback PDF.
            Structural changes (layout, typography, images) live in code.
            Changes take effect on the next approval.
          </p>
        </div>
        <PdfTemplateEditor />
      </main>
    </div>
  );
}
