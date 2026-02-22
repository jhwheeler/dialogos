-- CreateEnum
CREATE TYPE "Strictness" AS ENUM ('low', 'medium', 'high');

-- AlterTable: add new typed columns
ALTER TABLE "students" ADD COLUMN "voice_rate" DOUBLE PRECISION;
ALTER TABLE "students" ADD COLUMN "autoplay" BOOLEAN;
ALTER TABLE "students" ADD COLUMN "strictness" "Strictness";

-- Migrate existing JSONB data to new columns
UPDATE "students"
SET
  "voice_rate" = CASE
    WHEN "settings" ? 'voiceRate' THEN ("settings"->>'voiceRate')::double precision
    ELSE NULL
  END,
  "autoplay" = CASE
    WHEN "settings" ? 'autoplay' THEN ("settings"->>'autoplay')::boolean
    ELSE NULL
  END,
  "strictness" = CASE
    WHEN "settings" ? 'strictness' AND "settings"->>'strictness' IN ('low', 'medium', 'high')
    THEN ("settings"->>'strictness')::"Strictness"
    ELSE NULL
  END
WHERE "settings" IS NOT NULL AND "settings" != '{}'::jsonb;

-- Drop the old JSONB column
ALTER TABLE "students" DROP COLUMN "settings";
