"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function AdminHeader() {
  const router = useRouter();

  async function handleLogout() {
    document.cookie =
      "admin_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    router.push("/admin/login");
  }

  return (
    <header className="bg-card">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <div>
          <h1 className="text-xl font-heading font-semibold text-foreground">
            Donor Alignment Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            Review and manage participant feedback
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleLogout}>
          Logout
        </Button>
      </div>
      <div className="h-0.5 bg-accent" />
    </header>
  );
}
