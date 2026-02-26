-- CreateEnum
CREATE TYPE "PreprocessingStatus" AS ENUM ('none', 'processing', 'pending_confirmation', 'confirmed', 'degraded');

-- CreateEnum
CREATE TYPE "BookPhase" AS ENUM ('closed_recall', 'open_text', 'final_compression');

-- AlterTable
ALTER TABLE "sessions" ADD COLUMN     "book_phase" "BookPhase";

-- AlterTable
ALTER TABLE "sources" ADD COLUMN     "preprocessing_confidence" DOUBLE PRECISION,
ADD COLUMN     "preprocessing_status" "PreprocessingStatus" NOT NULL DEFAULT 'none';
