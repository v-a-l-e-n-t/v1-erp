-- Add start/end datetime fields to chariot anomalies in daily rapports
-- date_debut_arret : entered when the anomaly is noted in the rapport
-- date_fin_arret   : set later via the "Suivi Anomalies" tab when the stop is resolved
-- Duration = date_fin_arret - date_debut_arret, calculated in the app

ALTER TABLE rapport_chariot_anomalies
  ADD COLUMN date_debut_arret TIMESTAMPTZ,
  ADD COLUMN date_fin_arret   TIMESTAMPTZ;
