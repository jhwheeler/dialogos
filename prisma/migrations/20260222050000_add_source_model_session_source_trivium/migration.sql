-- CreateEnum
CREATE TYPE "TriviumStage" AS ENUM ('grammar', 'logic', 'rhetoric', 'combined');

-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('photo_ocr', 'document', 'reference', 'voice_summary');

-- CreateTable
CREATE TABLE "sources" (
    "id" UUID NOT NULL,
    "topic_id" UUID NOT NULL,
    "topic_file_id" UUID,
    "source_type" "SourceType" NOT NULL,
    "title" TEXT NOT NULL,
    "citation" TEXT,
    "extracted_text" TEXT,
    "grounding_tier" INTEGER NOT NULL DEFAULT 3,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "sources_pkey" PRIMARY KEY ("id")
);

-- AlterTable: Add source_id and trivium_stage to sessions
ALTER TABLE "sessions" ADD COLUMN "source_id" UUID;
ALTER TABLE "sessions" ADD COLUMN "trivium_stage" "TriviumStage" NOT NULL DEFAULT 'combined';

-- AddForeignKey
ALTER TABLE "sources" ADD CONSTRAINT "sources_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sources" ADD CONSTRAINT "sources_topic_file_id_fkey" FOREIGN KEY ("topic_file_id") REFERENCES "topic_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;
