/*
  Warnings:

  - A unique constraint covering the columns `[slug]` on the table `Question` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."Question" ADD COLUMN     "slug" VARCHAR(64);

-- CreateIndex
CREATE UNIQUE INDEX "Question_slug_key" ON "public"."Question"("slug");
