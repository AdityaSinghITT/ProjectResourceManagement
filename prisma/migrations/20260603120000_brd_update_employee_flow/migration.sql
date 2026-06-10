-- AlterEnum
ALTER TYPE "ProjectStatus" ADD VALUE 'COMPLETED';

-- AlterTable
ALTER TABLE "employees" ADD COLUMN "manager_id" INTEGER;

-- AlterTable
ALTER TABLE "projects" ADD COLUMN "total_story_points" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "milestones" ADD COLUMN "story_points" INTEGER NOT NULL DEFAULT 0;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
