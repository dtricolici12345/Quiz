/*
  Warnings:

  - You are about to alter the column `email` on the `User` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(254)`.
  - You are about to alter the column `nickname` on the `User` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - You are about to alter the column `passwordHash` on the `User` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(200)`.
  - Made the column `passwordHash` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "avatarUrl" VARCHAR(255),
ADD COLUMN     "rating" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "email" SET DATA TYPE VARCHAR(254),
ALTER COLUMN "nickname" SET DATA TYPE VARCHAR(50),
ALTER COLUMN "passwordHash" SET NOT NULL,
ALTER COLUMN "passwordHash" SET DATA TYPE VARCHAR(200);
