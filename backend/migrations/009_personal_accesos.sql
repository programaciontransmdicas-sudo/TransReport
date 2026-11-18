BEGIN;
CREATE TABLE transreport.personal_accesos (
  id uuid PRIMARY KEY,
  base text NOT NULL CHECK (base IN ('Peruarbo','Moquegua','Espinar')),
  fecha_programada timestamptz NOT NULL,
  motivo text NOT NULL CHECK (length(trim(motivo)) > 0),
  agente_id text NOT NULL,
  agente text NOT NULL CHECK (length(trim(agente)) > 0),
  creado_en timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX personal_accesos_base_fecha ON transreport.personal_accesos(base, fecha_programada DESC, id DESC);
COMMIT;
