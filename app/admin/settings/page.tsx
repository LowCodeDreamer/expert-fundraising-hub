import { AdminHeader } from "@/components/admin/AdminHeader";
import { SettingsForm } from "@/components/admin/SettingsForm";

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-background">
      <AdminHeader />
      <main className="mx-auto max-w-7xl px-6 py-8">
        <h2 className="text-2xl font-heading font-semibold text-foreground mb-6">Settings</h2>
        <SettingsForm />
      </main>
    </div>
  );
}
