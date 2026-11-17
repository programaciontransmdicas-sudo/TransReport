ALTER TABLE transreport.dispositivos
  ADD COLUMN activacion_hash text UNIQUE
    CHECK (length(activacion_hash) = 64),
  ADD COLUMN activacion_vence_en timestamptz,
  ADD COLUMN credencial_vence_en timestamptz,
  ADD COLUMN credencial_version integer NOT NULL DEFAULT 0
    CHECK (credencial_version >= 0);