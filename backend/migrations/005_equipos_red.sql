BEGIN;
-- Los registros anteriores y sus identificadores se conservan.
ALTER TABLE transreport.dispositivos ADD COLUMN ip inet;
CREATE UNIQUE INDEX dispositivos_ip_activa
  ON transreport.dispositivos(ip)
  WHERE activo = true AND ip IS NOT NULL;
COMMENT ON COLUMN transreport.dispositivos.ip IS 'IP interna reservada para el equipo. Sin IP asignada, el equipo no tiene acceso por red.';
COMMIT;
