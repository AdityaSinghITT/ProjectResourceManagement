-- AlterEnum (idempotent: skip if COMPLETED already exists)
DO $$ BEGIN
  ALTER TYPE "ProjectStatus" ADD VALUE 'COMPLETED';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- AlterTable
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "manager_id" INTEGER;

-- AlterTable
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "total_story_points" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "milestones" ADD COLUMN IF NOT EXISTS "story_points" INTEGER NOT NULL DEFAULT 0;

-- AddForeignKey (only if not already present)
DO $$ BEGIN
  ALTER TABLE "employees"
    ADD CONSTRAINT "employees_manager_id_fkey"
    FOREIGN KEY ("manager_id") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
