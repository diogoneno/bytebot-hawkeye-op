-- Add RX-01 recorder metadata to trajectory steps
ALTER TABLE "TrajectoryStep"
  ADD COLUMN "stepId" TEXT,
  ADD COLUMN "obsPre" JSONB,
  ADD COLUMN "obsPost" JSONB,
  ADD COLUMN "gridMetadata" JSONB,
  ADD COLUMN "coordinateTelemetry" JSONB,
  ADD COLUMN "replayMetadata" JSONB;

UPDATE "TrajectoryStep"
SET "stepId" = "trajectoryId" || ':' || "iterationNumber"
WHERE "stepId" IS NULL;

ALTER TABLE "TrajectoryStep"
  ALTER COLUMN "stepId" SET NOT NULL;
