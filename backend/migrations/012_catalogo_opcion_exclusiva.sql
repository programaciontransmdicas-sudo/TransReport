BEGIN;
ALTER TABLE transreport.catalogo_opciones
  ADD COLUMN IF NOT EXISTS exclusiva boolean NOT NULL DEFAULT false;
UPDATE transreport.catalogo_opciones SET exclusiva=true
WHERE modulo='relevos' AND campo='equipos' AND valor='Ninguno entregado';
COMMIT;
