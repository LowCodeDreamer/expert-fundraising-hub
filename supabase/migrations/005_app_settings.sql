CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO app_settings (key, value) VALUES
  ('time_gate_enabled', 'true'::jsonb),
  ('time_gate_days', '7'::jsonb)
ON CONFLICT (key) DO NOTHING;
