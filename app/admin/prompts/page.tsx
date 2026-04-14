import { AdminHeader } from "@/components/admin/AdminHeader";
import { PromptEditor } from "@/components/admin/PromptEditor";

export default function PromptsPage() {
  return (
    <div className="min-h-screen bg-background">
      <AdminHeader />
      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-heading font-semibold text-foreground">
            Prompt Configuration
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Edit the AI coaching prompt, model, and parameters. Changes take
            effect on the next feedback generation.
          </p>
        </div>
        <PromptEditor />
      </main>
    </div>
  );
}
