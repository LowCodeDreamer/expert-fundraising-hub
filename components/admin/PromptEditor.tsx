"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import type { PromptConfig } from "@/types/database";

const MODEL_OPTIONS = [
  "anthropic/claude-sonnet-4",
  "anthropic/claude-sonnet-4.5",
  "anthropic/claude-haiku-4.5",
];

export function PromptEditor() {
  const [configs, setConfigs] = useState<PromptConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activating, setActivating] = useState<string | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);

  // Editor state
  const [name, setName] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [model, setModel] = useState(MODEL_OPTIONS[0]);
  const [customModel, setCustomModel] = useState("");
  const [useCustomModel, setUseCustomModel] = useState(false);
  const [temperature, setTemperature] = useState(0.4);
  const [maxTokens, setMaxTokens] = useState(2000);

  const fetchConfigs = useCallback(async () => {
    const res = await fetch("/api/prompt-configs");
    if (res.ok) {
      const data: PromptConfig[] = await res.json();
      setConfigs(data);

      // Load the active config into the editor
      const active = data.find((c) => c.is_active);
      if (active) {
        loadConfigIntoEditor(active);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  function loadConfigIntoEditor(config: PromptConfig) {
    setName(config.name);
    setSystemPrompt(config.system_prompt);
    setMaxTokens(config.max_tokens);
    setTemperature(config.temperature);

    if (MODEL_OPTIONS.includes(config.model)) {
      setModel(config.model);
      setUseCustomModel(false);
      setCustomModel("");
    } else {
      setUseCustomModel(true);
      setCustomModel(config.model);
    }
  }

  async function handleSaveNewVersion() {
    setSaving(true);
    const selectedModel = useCustomModel ? customModel : model;

    const res = await fetch("/api/prompt-configs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        system_prompt: systemPrompt,
        model: selectedModel,
        temperature,
        max_tokens: maxTokens,
      }),
    });

    if (res.ok) {
      await fetchConfigs();
      setViewingId(null);
    }
    setSaving(false);
  }

  async function handleActivate(id: string) {
    setActivating(id);
    const res = await fetch(`/api/prompt-configs/${id}/activate`, {
      method: "POST",
    });

    if (res.ok) {
      await fetchConfigs();
      setViewingId(null);
    }
    setActivating(null);
  }

  function handleViewVersion(config: PromptConfig) {
    setViewingId(config.id);
    loadConfigIntoEditor(config);
  }

  function handleBackToActive() {
    setViewingId(null);
    const active = configs.find((c) => c.is_active);
    if (active) loadConfigIntoEditor(active);
  }

  const isViewingOldVersion = viewingId !== null && !configs.find((c) => c.id === viewingId)?.is_active;
  const selectedModel = useCustomModel ? customModel : model;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        Loading prompt configurations...
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
      {/* Left: Editor */}
      <div className="lg:col-span-2 space-y-6">
        {isViewingOldVersion && (
          <div className="flex items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Viewing version {configs.find((c) => c.id === viewingId)?.version} (read-only).
            Edit and save to create a new active version, or{" "}
            <button onClick={handleBackToActive} className="font-medium underline">
              go back to active
            </button>.
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="name">Version Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Shorter feedback, More direct tone"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="system-prompt">System Prompt</Label>
          <Textarea
            id="system-prompt"
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            rows={20}
            className="font-mono text-sm"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>Model</Label>
            {!useCustomModel ? (
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {MODEL_OPTIONS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            ) : (
              <Input
                value={customModel}
                onChange={(e) => setCustomModel(e.target.value)}
                placeholder="e.g. google/gemini-pro"
              />
            )}
            <button
              type="button"
              onClick={() => setUseCustomModel(!useCustomModel)}
              className="text-xs text-muted-foreground underline"
            >
              {useCustomModel ? "Use preset models" : "Use custom model ID"}
            </button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="temperature">
              Temperature: {temperature.toFixed(2)}
            </Label>
            <input
              id="temperature"
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Precise (0)</span>
              <span>Creative (1)</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="max-tokens">Max Tokens</Label>
            <Input
              id="max-tokens"
              type="number"
              value={maxTokens}
              onChange={(e) => setMaxTokens(parseInt(e.target.value) || 2000)}
              min={500}
              max={8000}
              step={100}
            />
          </div>
        </div>

        <Button
          onClick={handleSaveNewVersion}
          disabled={saving || !name.trim() || !systemPrompt.trim() || !selectedModel.trim()}
          className="w-full sm:w-auto"
        >
          {saving ? "Saving..." : "Save as New Version"}
        </Button>
      </div>

      {/* Right: Version History */}
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
                    </div>
                    <p className="mt-0.5 truncate text-sm text-muted-foreground">
                      {config.name}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {config.model} &middot;{" "}
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
