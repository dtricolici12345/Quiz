-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ALTER COLUMN "nickname" DROP NOT NULL;
