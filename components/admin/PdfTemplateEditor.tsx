"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import type { PdfTemplateConfig } from "@/types/database";

interface EditorState {
  name: string;
  cover_title: string;
  intro_paragraph: string;
  worksheet_1_heading: string;
  worksheet_2_heading: string;
  worksheet_3_heading: string;
  closing_paragraph: string;
  signature_block: string;
  accent_color: string;
  logo_url: string;
}

const EMPTY_STATE: EditorState = {
  name: "",
  cover_title: "",
  intro_paragraph: "",
  worksheet_1_heading: "",
  worksheet_2_heading: "",
  worksheet_3_heading: "",
  closing_paragraph: "",
  signature_block: "",
  accent_color: "#2D6A5F",
  logo_url: "",
};

export function PdfTemplateEditor() {
  const [configs, setConfigs] = useState<PdfTemplateConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activating, setActivating] = useState<string | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [state, setState] = useState<EditorState>(EMPTY_STATE);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function loadIntoEditor(c: PdfTemplateConfig) {
    setState({
      name: c.name,
      cover_title: c.cover_title,
      intro_paragraph: c.intro_paragraph,
      worksheet_1_heading: c.worksheet_1_heading,
      worksheet_2_heading: c.worksheet_2_heading,
      worksheet_3_heading: c.worksheet_3_heading,
      closing_paragraph: c.closing_paragraph,
      signature_block: c.signature_block,
      accent_color: c.accent_color,
      logo_url: c.logo_url ?? "",
    });
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    setUploadingLogo(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/pdf-template-configs/upload-logo", {
        method: "POST",
        body: form,
      });
      const body = await res.json();
      if (!res.ok) {
        setUploadError(body.error || `Upload failed (${res.status})`);
      } else {
        setState((s) => ({ ...s, logo_url: body.url as string }));
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingLogo(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handleRemoveLogo() {
    setState((s) => ({ ...s, logo_url: "" }));
  }

  const fetchConfigs = useCallback(async () => {
    const res = await fetch("/api/pdf-template-configs");
    if (res.ok) {
      const data: PdfTemplateConfig[] = await res.json();
      setConfigs(data);
      const active = data.find((c) => c.is_active);
      if (active) loadIntoEditor(active);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  async function handleSaveNewVersion() {
    setSaving(true);
    const res = await fetch("/api/pdf-template-configs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(state),
    });
    if (res.ok) {
      await fetchConfigs();
      setViewingId(null);
    }
    setSaving(false);
  }

  async function handleActivate(id: string) {
    setActivating(id);
    const res = await fetch(`/api/pdf-template-configs/${id}/activate`, {
      method: "POST",
    });
    if (res.ok) {
      await fetchConfigs();
      setViewingId(null);
    }
    setActivating(null);
  }

  function handleViewVersion(config: PdfTemplateConfig) {
    setViewingId(config.id);
    loadIntoEditor(config);
  }

  function handleBackToActive() {
    setViewingId(null);
    const active = configs.find((c) => c.is_active);
    if (active) loadIntoEditor(active);
  }

  const isViewingOldVersion =
    viewingId !== null && !configs.find((c) => c.id === viewingId)?.is_active;

  const canSave =
    state.name.trim() &&
    state.cover_title.trim() &&
    state.intro_paragraph.trim() &&
    state.worksheet_1_heading.trim() &&
    state.worksheet_2_heading.trim() &&
    state.worksheet_3_heading.trim() &&
    state.closing_paragraph.trim() &&
    state.signature_block.trim() &&
    /^#[0-9a-fA-F]{6}$/.test(state.accent_color.trim());

  function bind<K extends keyof EditorState>(key: K) {
    return {
      value: state[key] as string,
      onChange: (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
      ) => setState((s) => ({ ...s, [key]: e.target.value })),
    };
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        Loading PDF template configurations...
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-6">
        {isViewingOldVersion && (
          <div className="flex items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Viewing version{" "}
            {configs.find((c) => c.id === viewingId)?.version} (read-only). Edit
            and save to create a new active version, or{" "}
            <button
              onClick={handleBackToActive}
              className="font-medium underline"
            >
              go back to active
            </button>
            .
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="name">Version Name</Label>
          <Input
            id="name"
            {...bind("name")}
            placeholder="e.g. Spring 2026 copy"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="cover-title">Cover Title</Label>
          <Input id="cover-title" {...bind("cover_title")} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="intro">Intro Paragraph</Label>
          <Textarea
            id="intro"
            rows={6}
            {...bind("intro_paragraph")}
            placeholder="Blank lines separate paragraphs in the PDF."
          />
          <p className="text-xs text-muted-foreground">
            Blank lines are rendered as paragraph breaks.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="ws1-h">Worksheet 1 Heading</Label>
            <Input id="ws1-h" {...bind("worksheet_1_heading")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ws2-h">Worksheet 2 Heading</Label>
            <Input id="ws2-h" {...bind("worksheet_2_heading")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ws3-h">Worksheet 3 Heading</Label>
            <Input id="ws3-h" {...bind("worksheet_3_heading")} />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="closing">Closing Paragraph</Label>
          <Textarea id="closing" rows={4} {...bind("closing_paragraph")} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="signature">Signature Block</Label>
          <Textarea id="signature" rows={3} {...bind("signature_block")} />
        </div>

        <div className="space-y-2">
          <Label>Logo</Label>
          <div className="flex items-start gap-4 rounded-lg border border-border p-4">
            <div className="flex h-20 w-32 items-center justify-center rounded-md border border-dashed border-border bg-muted/30">
              {state.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={state.logo_url}
                  alt="Logo preview"
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <span className="text-xs text-muted-foreground">No logo</span>
              )}
            </div>
            <div className="flex-1 space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={handleLogoUpload}
                className="hidden"
                id="logo-upload"
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingLogo}
                >
                  {uploadingLogo
                    ? "Uploading..."
                    : state.logo_url
                    ? "Replace logo"
                    : "Upload logo"}
                </Button>
                {state.logo_url && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleRemoveLogo}
                    disabled={uploadingLogo}
                  >
                    Remove
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                PNG, JPEG, WebP, or SVG. Max 2 MB. Appears on the PDF cover.
              </p>
              {uploadError && (
                <p className="text-xs text-destructive">{uploadError}</p>
              )}
              {state.logo_url && (
                <p className="break-all text-xs text-muted-foreground">
                  {state.logo_url}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="accent">Accent Color</Label>
          <div className="flex items-center gap-3">
            <input
              id="accent"
              type="color"
              value={state.accent_color}
              onChange={(e) =>
                setState((s) => ({ ...s, accent_color: e.target.value }))
              }
              className="h-10 w-16 cursor-pointer rounded border border-input bg-background"
            />
            <Input
              value={state.accent_color}
              onChange={(e) =>
                setState((s) => ({ ...s, accent_color: e.target.value }))
              }
              className="max-w-[160px] font-mono"
              placeholder="#2D6A5F"
            />
            <span className="text-xs text-muted-foreground">
              Used for headings, section titles, and the header divider.
            </span>
          </div>
        </div>

        <Button
          onClick={handleSaveNewVersion}
          disabled={saving || !canSave}
          className="w-full sm:w-auto"
        >
          {saving ? "Saving..." : "Save as New Version"}
        </Button>
      </div>

      <div className="space-y-4">
        <h3 className="font-heading font-semibold text-foreground">
          Version History
        </h3>
        {configs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No versions yet.</p>
        ) : (
          <div className="space-y-3">
            {configs.map((config) => (
              <div
                key={config.id}
                className={`rounded-lg border p-4 transition-colors ${
                  config.is_active
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-muted-foreground/30"
                } ${viewingId === config.id ? "ring-2 ring-primary/30" : ""}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">
                        v{config.version}
                      </span>
                      {config.is_active && (
                        <Badge variant="default" className="text-xs">
                          Active
                        </Badge>
                      )}
                      <span
                        className="inline-block h-3 w-3 rounded-full border border-border"
                        style={{ backgroundColor: config.accent_color }}
                        aria-label={`accent ${config.accent_color}`}
                      />
                    </div>
                    <p className="mt-0.5 truncate text-sm text-muted-foreground">
                      {config.name}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(config.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewVersion(config)}
                    className="text-xs"
                  >
                    View
                  </Button>
                  {!config.is_active && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleActivate(config.id)}
                      disabled={activating === config.id}
                      className="text-xs"
                    >
                      {activating === config.id ? "Activating..." : "Activate"}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
