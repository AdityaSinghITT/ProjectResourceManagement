-- Resource profile + RBAC migration (idempotent for partial retries)

DO $$ BEGIN CREATE TYPE "Department" AS ENUM ('ENGINEERING', 'QUALITY_ASSURANCE', 'DEVOPS', 'PRODUCT', 'HUMAN_RESOURCES'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "Designation" AS ENUM ('SOFTWARE_ENGINEER', 'SENIOR_SOFTWARE_ENGINEER', 'TEAM_LEAD', 'PROJECT_MANAGER', 'QA_ENGINEER', 'DEVOPS_ENGINEER', 'BUSINESS_ANALYST'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "ResourceStatus" AS ENUM ('BENCH', 'ALLOCATED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "PermissionResource" AS ENUM ('AUTH', 'USERS', 'RESOURCES', 'PROJECTS', 'ALLOCATIONS', 'DASHBOARD', 'TIMESHEETS', 'SYSTEM_CONFIG', 'ACTIVITY_TAGS'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "PermissionAction" AS ENUM ('LOGIN', 'CHANGE_PASSWORD', 'CREATE', 'READ', 'LIST', 'UPDATE', 'DELETE', 'SUBMIT', 'VIEW_TEAM'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "roles" (
    "id" SERIAL NOT NULL,
    "role_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "roles_role_name_key" ON "roles"("role_name");

CREATE TABLE IF NOT EXISTS "permissions" (
    "id" SERIAL NOT NULL,
    "resource" "PermissionResource" NOT NULL,
    "action" "PermissionAction" NOT NULL,
    "description" TEXT,
    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "permissions_resource_action_key" ON "permissions"("resource", "action");

CREATE TABLE IF NOT EXISTS "role_permissions" (
    "role_id" INTEGER NOT NULL,
    "permission_id" INTEGER NOT NULL,
    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role_id","permission_id")
);

CREATE TABLE IF NOT EXISTS "user_roles" (
    "user_id" INTEGER NOT NULL,
    "role_id" INTEGER NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT true,
    "assigned_by_user_id" INTEGER,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("user_id","role_id")
);

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "department" "Department";
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "designation" "Designation";

CREATE TABLE IF NOT EXISTS "resource_profiles" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "manager_id" INTEGER,
    "resource_status" "ResourceStatus" NOT NULL DEFAULT 'BENCH',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "resource_profiles_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "resource_profiles_user_id_key" ON "resource_profiles"("user_id");

INSERT INTO "roles" ("role_name")
SELECT v.role_name
FROM (VALUES ('ADMIN'), ('MANAGER'), ('RESOURCE')) AS v(role_name)
WHERE NOT EXISTS (SELECT 1 FROM "roles" r WHERE r."role_name" = v.role_name);

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'role'
  ) THEN
    INSERT INTO "user_roles" ("user_id", "role_id", "is_primary")
    SELECT u."id", r."id", true
    FROM "users" u
    JOIN "roles" r ON r."role_name" = CASE
      WHEN u."role"::text = 'EMPLOYEE' THEN 'RESOURCE'
      ELSE u."role"::text
    END
    ON CONFLICT ("user_id", "role_id") DO NOTHING;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'employees') THEN
    INSERT INTO "resource_profiles" ("id", "user_id", "manager_id", "resource_status", "created_at", "updated_at")
    SELECT e."id", e."user_id", e."manager_id", e."status"::text::"ResourceStatus", e."created_at", e."updated_at"
    FROM "employees" e
    ON CONFLICT ("user_id") DO NOTHING;

    PERFORM setval(pg_get_serial_sequence('resource_profiles', 'id'), COALESCE((SELECT MAX("id") FROM "resource_profiles"), 1));

    UPDATE "users" u
    SET "department" = COALESCE(u."department", 'ENGINEERING'::"Department"),
        "designation" = COALESCE(u."designation", 'SOFTWARE_ENGINEER'::"Designation")
    FROM "employees" e
    WHERE e."user_id" = u."id";
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "user_skills" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "skill_id" INTEGER NOT NULL,
    "category" "SkillCategory" NOT NULL,
    "proficiency" "ProficiencyLevel" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "user_skills_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "user_skills_user_id_skill_id_key" ON "user_skills"("user_id", "skill_id");

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'employee_skills') THEN
    INSERT INTO "user_skills" ("id", "user_id", "skill_id", "category", "proficiency", "created_at", "updated_at")
    SELECT es."id", e."user_id", es."skill_id", es."category", es."proficiency", es."created_at", es."updated_at"
    FROM "employee_skills" es
    JOIN "employees" e ON e."id" = es."employee_id"
    ON CONFLICT ("user_id", "skill_id") DO NOTHING;

    PERFORM setval(pg_get_serial_sequence('user_skills', 'id'), COALESCE((SELECT MAX("id") FROM "user_skills"), 1));
  END IF;
END $$;

ALTER TABLE "allocations" ADD COLUMN IF NOT EXISTS "resource_profile_id" INTEGER;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'allocations' AND column_name = 'employee_id'
  ) THEN
    UPDATE "allocations" a
    SET "resource_profile_id" = e."id"
    FROM "employees" e
    WHERE a."employee_id" = e."id" AND a."resource_profile_id" IS NULL;
  END IF;
END $$;

ALTER TABLE "allocations" ALTER COLUMN "resource_profile_id" SET NOT NULL;
ALTER TABLE "allocations" DROP CONSTRAINT IF EXISTS "allocations_employee_id_fkey";
ALTER TABLE "allocations" DROP COLUMN IF EXISTS "employee_id";

ALTER TABLE "timesheets" ADD COLUMN IF NOT EXISTS "resource_profile_id" INTEGER;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'timesheets' AND column_name = 'employee_id'
  ) THEN
    UPDATE "timesheets" t
    SET "resource_profile_id" = e."id"
    FROM "employees" e
    WHERE t."employee_id" = e."id" AND t."resource_profile_id" IS NULL;
  END IF;
END $$;

ALTER TABLE "timesheets" ALTER COLUMN "resource_profile_id" SET NOT NULL;
ALTER TABLE "timesheets" DROP CONSTRAINT IF EXISTS "timesheets_employee_id_fkey";
DROP INDEX IF EXISTS "timesheets_employee_id_week_start_key";
ALTER TABLE "timesheets" DROP COLUMN IF EXISTS "employee_id";
CREATE UNIQUE INDEX IF NOT EXISTS "timesheets_resource_profile_id_week_start_key" ON "timesheets"("resource_profile_id", "week_start");

ALTER TABLE "users" DROP COLUMN IF EXISTS "role";

DROP TABLE IF EXISTS "employee_skills";
DROP TABLE IF EXISTS "employees";

DO $$ BEGIN DROP TYPE "Role"; EXCEPTION WHEN dependent_objects_still_exist THEN NULL; WHEN undefined_object THEN NULL; END $$;
DO $$ BEGIN DROP TYPE "EmployeeStatus"; EXCEPTION WHEN dependent_objects_still_exist THEN NULL; WHEN undefined_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_assigned_by_user_id_fkey" FOREIGN KEY ("assigned_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "resource_profiles" ADD CONSTRAINT "resource_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "resource_profiles" ADD CONSTRAINT "resource_profiles_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "user_skills" ADD CONSTRAINT "user_skills_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "user_skills" ADD CONSTRAINT "user_skills_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "allocations" ADD CONSTRAINT "allocations_resource_profile_id_fkey" FOREIGN KEY ("resource_profile_id") REFERENCES "resource_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "timesheets" ADD CONSTRAINT "timesheets_resource_profile_id_fkey" FOREIGN KEY ("resource_profile_id") REFERENCES "resource_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
