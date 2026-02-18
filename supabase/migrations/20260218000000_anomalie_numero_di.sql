-- Add numero_di to anomalies table (one DI per anomaly)
ALTER TABLE rapport_chariot_anomalies ADD COLUMN numero_di TEXT DEFAULT '';
