BEGIN;
ALTER TABLE transreport.personal_accesos
  ADD COLUMN programado boolean NOT NULL DEFAULT true;
COMMIT;
