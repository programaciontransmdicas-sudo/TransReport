BEGIN;

-- Se conservan condicion y precintos para consultar registros anteriores.
ALTER TABLE transreport.movimientos_vehiculos
  DROP CONSTRAINT campos_minimos_movimiento;

ALTER TABLE transreport.movimientos_vehiculos
  ADD CONSTRAINT campos_minimos_movimiento CHECK (
    (tipo = 'INGRESO'
      AND NULLIF(trim(origen), '') IS NOT NULL
      AND repuesto IS NOT NULL
      AND carga IS NOT NULL)
    OR
    (tipo = 'SALIDA' AND NULLIF(trim(destino), '') IS NOT NULL)
  );

COMMIT;
