-- DropForeignKey
ALTER TABLE "public"."ScheduleItem" DROP CONSTRAINT "ScheduleItem_teacherId_fkey";

-- AlterTable
ALTER TABLE "public"."ScheduleItem" ALTER COLUMN "teacherId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."ScheduleItem" ADD CONSTRAINT "ScheduleItem_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
