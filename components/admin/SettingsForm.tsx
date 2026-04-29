"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface Settings {
  time_gate_enabled: boolean;
  time_gate_days: number;
}

export function SettingsForm() {
  const [settings, setSettings] = useState<Settings>({
    time_gate_enabled: true,
    time_gate_days: 7,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch("/api/admin/settings", {
          credentials: "include",
        });
        if (!res.ok) throw new Error("Failed to load settings");
        const data = await res.json();
        setSettings({
          time_gate_enabled: data.time_gate_enabled ?? true,
          time_gate_days: data.time_gate_days ?? 7,
        });
      } catch {
        setMessage({ type: "error", text: "Failed to load settings" });
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, []);

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error("Failed to save settings");
      setMessage({ type: "success", text: "Settings saved" });
    } catch {
      setMessage({ type: "error", text: "Failed to save settings" });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <p className="text-sm text-muted-foreground">Loading settings...</p>
    );
  }

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle>Time Gate</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            role="switch"
            aria-checked={settings.time_gate_enabled}
            onClick={() =>
              setSettings((s) => ({
                ...s,
                time_gate_enabled: !s.time_gate_enabled,
              }))
            }
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
              settings.time_gate_enabled ? "bg-primary" : "bg-muted"
            }`}
          >
            <span
              className={`pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform ${
                settings.time_gate_enabled ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
          <Label className="text-sm font-medium">Time Gate Enabled</Label>
        </div>

        <div className="space-y-2">
          <Label htmlFor="time_gate_days" className="text-sm font-medium">
            Time Gate Days
          </Label>
          <Input
            id="time_gate_days"
            type="number"
            min={1}
            max={30}
            value={settings.time_gate_days}
            onChange={(e) =>
              setSettings((s) => ({
                ...s,
                time_gate_days: Math.max(1, Math.min(30, Number(e.target.value) || 1)),
              }))
            }
            className="max-w-[120px]"
            disabled={!settings.time_gate_enabled}
          />
          <p className="text-xs text-muted-foreground">
            Maximum days from course start to all 3 worksheets complete. If exceeded, feedback won&apos;t auto-generate (admin can still trigger manually). 1–30.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Settings"}
          </Button>
          {message && (
            <p
              className={`text-sm ${
                message.type === "success"
                  ? "text-green-600"
                  : "text-red-600"
              }`}
            >
              {message.text}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
