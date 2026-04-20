"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function AdminHeader() {
  const router = useRouter();
  const pathname = usePathname();

  async function handleLogout() {
    document.cookie =
      "admin_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    router.push("/admin/login");
  }

  return (
    <header className="bg-card">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-8">
          <div>
            <h1 className="text-xl font-heading font-semibold text-foreground">
              Donor Alignment Dashboard
            </h1>
            <p className="text-sm text-muted-foreground">
              Review and manage participant feedback
            </p>
          </div>
          <nav className="flex items-center gap-4">
            <Link
              href="/admin"
              className={`text-sm font-medium transition-colors hover:text-foreground ${
                pathname === "/admin"
                  ? "text-foreground"
                  : "text-muted-foreground"
              }`}
            >
              Participants
            </Link>
            <Link
              href="/admin/prompts"
              className={`text-sm font-medium transition-colors hover:text-foreground ${
                pathname === "/admin/prompts"
                  ? "text-foreground"
                  : "text-muted-foreground"
              }`}
            >
              Prompts
            </Link>
            <Link
              href="/admin/pdf-template"
              className={`text-sm font-medium transition-colors hover:text-foreground ${
                pathname === "/admin/pdf-template"
                  ? "text-foreground"
                  : "text-muted-foreground"
              }`}
            >
              PDF Template
            </Link>
            <Link
              href="/admin/settings"
              className={`text-sm font-medium transition-colors hover:text-foreground ${
                pathname === "/admin/settings"
                  ? "text-foreground"
                  : "text-muted-foreground"
              }`}
            >
              Settings
            </Link>
          </nav>
        </div>
        <Button variant="outline" size="sm" onClick={handleLogout}>
          Logout
        </Button>
      </div>
      <div className="h-0.5 bg-accent" />
    </header>
  );
}
