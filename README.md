# Project & Resource Management Tool — API

Console-based PRM system REST backend (Learn & Code Final Project).

## Current status

| Phase | Status |
|-------|--------|
| Phase 1 — Foundation | Complete |
| Phase 2 — Authentication | Complete |
| Phase 3 — Admin master data | Complete |
| Phase 4 — Allocations & dashboard | Complete |
| Phase 5 — Timesheets | Complete |
| Phase 6 — Project health | Complete |
| Phase 7 — Console client | Complete |
| Phase 8 — AI integration | Planned |
| Phase 9 — Polish & demo data | Planned |

## Prerequisites

- Node.js 18+
- Neon PostgreSQL database

## Setup

1. Copy environment file and set your values:

```bash
cp .env.example .env
```

2. Install dependencies:

```bash
npm install
```

3. Run migrations and seed:

```bash
npx prisma migrate dev --name init
npx prisma db seed
```

4. Start the dev server (watch mode):

```bash
npm run dev
```

## API documentation

Swagger UI: [http://localhost:3000/api-docs](http://localhost:3000/api-docs)

## Phase 2 — Authentication

### Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/login` | No | Login with username/password |
| POST | `/api/auth/change-password` | Bearer | Set new password (required on first login) |
| GET | `/api/auth/me` | Bearer | Current user profile |
| POST | `/api/auth/logout` | Bearer | Logout (client discards token) |

### Test flow

```bash
# 1. Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"admin\",\"password\":\"Admin@1234\"}"

# 2. Try /me before password change → 403
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer <token>"

# 3. Change password
curl -X POST http://localhost:3000/api/auth/change-password \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d "{\"newPassword\":\"NewPass@99\",\"confirmPassword\":\"NewPass@99\"}"

# 4. Use new token from step 3 for /me → 200
```

### Password rules

- Minimum 8 characters
- At least one uppercase letter
- At least one number

### Bootstrap admin

- **Username:** `admin`
- **Password:** `Admin@1234` (from seed; must change on first login)

### Forgot admin password?

Run in a **new terminal** (not inside the `npm run dev` window):

```bash
npx ts-node scripts/reset-admin-password.ts
```

Wait for `Admin password reset successful.` If it fails, Neon may be waking up — the script retries 3 times. Verify with:

```bash
npx ts-node scripts/verify-admin-login.ts
```

## Phase 3 — Admin APIs

All admin routes require: `Authorization: Bearer <token>` and **ADMIN** role (password must be changed first).

Base path: `/api/admin`

### Users
| Method | Path | Description |
|--------|------|-------------|
| POST | `/users` | Create user account (EMPLOYEE/MANAGER also creates employee profile) |
| GET | `/users` | List users + active/inactive counts |
| PATCH | `/users/:id/reactivate` | Reactivate user |
| POST | `/users/reset-password` | Reset password by username or user ID |
| POST | `/users/:id/reset-password` | Reset password by user ID (`newTemporaryPassword`) |
| PATCH | `/users/:id/deactivate` | Deactivate user (login blocked) |

### Employees
| Method | Path | Description |
|--------|------|-------------|
| GET | `/employees?status=BENCH&department=Backend` | List with filters |
| POST | `/employees/assign-manager` | Assign reporting manager (`employeeUserId`, `managerUserId`) |
| PATCH | `/employees/:id` | Update department/designation |
| GET | `/employees/:id/deactivate/preview` | Preview active allocations |
| POST | `/employees/:id/deactivate` | Deactivate + end allocations |
| GET/POST | `/employees/:id/skills` | List / add skills |
| PATCH/DELETE | `/employees/:id/skills/:skillId` | Update / remove skill |

### Projects & milestones
| Method | Path | Description |
|--------|------|-------------|
| POST/GET | `/projects` | Create / list projects (includes `totalStoryPoints`, `completedStoryPoints`) |
| PATCH | `/projects/:id` | Update project |
| GET/POST | `/projects/:id/milestones` | List / add milestones (includes `storyPoints` and summary) |
| PATCH | `/projects/:id/milestones/:milestoneId` | Update milestone |

### System config
| Method | Path | Description |
|--------|------|-------------|
| GET | `/system-config` | Get config (API key masked) |
| PATCH | `/system-config` | Update LLM provider, key, scheduler, max hours |

**Dates:** Use `YYYY-MM-DD` format in API requests.

## Phase 4 — Allocations & manager dashboard

### Admin allocation matrix (Screen 3.3)

Base path: `/api/admin` (ADMIN role)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/allocations?employeeId=&projectId=` | Company-wide allocation list with optional filters |

### Manager APIs (Screens 4.1–4.2)

Base path: `/api/manager` (MANAGER role)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/projects` | Projects owned by logged-in manager with `healthStatus` badge |
| GET | `/projects/:id` | Project detail — milestones, active allocations, structured risk flags |
| GET | `/dashboard` | Bench + active team with utilization % and availability % |
| GET | `/dashboard/employees/:id` | Employee drill-down (skills, active allocations, recent activity tags) |
| POST | `/allocations/validate` | Dry-run validation (`50% + 50% = 100% ✓ Valid`) |
| POST | `/allocations` | Create allocation |
| PATCH | `/allocations/:id/end` | End allocation (`toDate = today`) |

### Business rules

- Overlapping allocations for the same employee must total ≤ 100% utilization
- `fromDate` must be before `toDate`
- Project must be `PLANNED` or `ACTIVE`
- Only the project's owning manager (`project.managerId`) can create/end allocations
- Managers see only employees where `employees.manager_id` equals their user ID and `users.role = EMPLOYEE`
- Employee `BENCH` / `ALLOCATED` status is recomputed after create/end allocation

### Logging

Structured JSON logs via `appLogger` (`src/shared/logger/appLogger.ts`). Set `LOG_LEVEL` (`debug` | `info` | `warn` | `error`) in `.env`. HTTP requests and allocation operations are logged with context.

### Tests

```bash
npm test
```

Unit tests cover overlap math, `AllocationService` validation rules, `EmployeeStatusService` status recompute, and `ManagerProjectService` list filtering.

### Suggested manager test flow

1. `GET /projects` — pick a `projectId` where status is `PLANNED` or `ACTIVE`
2. `GET /dashboard` — pick an `employeeId` from bench/active
3. `POST /allocations/validate` then `POST /allocations`
4. `GET /dashboard` again — employee should move to active/partial/full

## Phase 5 — Timesheets

### Activity tags (any authenticated user)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/activity-tags` | Seeded activity tag catalog (for timesheet submit UI) |

### Employee APIs (Screens 5.1–5.3)

Base path: `/api/employee` (EMPLOYEE role)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/allocations?weekStart=` | Projects allocated for the week + per-project hour cap |
| GET | `/timesheets` | Submission history (`SUBMITTED` / `MISSED`) |
| GET | `/timesheets/reminder` | Banner flag if prior week timesheet is missing |
| GET | `/timesheets/:weekStart` | Week detail (`weekStart` must be a Monday) |
| POST | `/timesheets` | Submit weekly hours per project + activity tags |

### Manager timesheets (Screen 4.4)

Base path: `/api/manager` (MANAGER role)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/timesheets?weekStart=` | Team grid: employee × project rows |
| GET | `/timesheets/:employeeId?weekStart=` | One employee's submitted week detail |

### Business rules

- Week always starts on **Monday** (`YYYY-MM-DD`)
- No future weeks; no duplicate submit for same employee + week
- Hours only for projects allocated during that week
- Per project: `hours ≤ utilization% × maxWeeklyHours / 100` (default `maxWeeklyHours = 40`)
- Total hours ≤ `maxWeeklyHours`
- Activity tags from seeded catalog; `customText` required only for tag **Other**
- Automatic `MISSED` marking is Phase 7 (background scheduler; Phase 5 reminder works without it)

### Swagger end-to-end test flow

1. **Admin:** create MANAGER + EMPLOYEE users, assign manager, create project (`managerId` = manager user ID), allocate employee 50%+50% on two projects
2. **Employee login** → change password if needed → Authorize in Swagger
3. `GET /api/activity-tags` → note tag IDs
4. `GET /api/employee/allocations` → note `projectId` and `maxHoursForWeek`
5. `POST /api/employee/timesheets` with Monday `weekStart` (e.g. current week Monday)
6. `GET /api/employee/timesheets` → history shows `SUBMITTED`
7. **Manager login** → `GET /api/manager/timesheets` → grid shows hours
8. `GET /api/manager/dashboard/employees/{id}` → `recentActivityTags` populated

### Tests

```bash
npm test
```

Unit tests cover week utilities, `TimesheetService` submit validation (hour caps, duplicate week, future week, Other tag rule), plus Phase 4 allocation tests.

## Phase 6 — Project health

Deterministic health badges for manager projects (no scheduler, no LLM). Computed on each API read from milestones, allocations, and last-week timesheet hours.

### Manager APIs (Screen 4.3)

Base path: `/api/manager` (MANAGER role)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/projects` | Project list — each item includes `healthStatus`; summary includes `onTrack`, `attention`, `atRisk` counts |
| GET | `/projects/:id` | Detail — milestones, today's active allocations, `health.riskFlags[]` |

### Health rules

| Status | Condition |
|--------|-----------|
| **AT_RISK** | Overdue `IN_PROGRESS` milestone, **or** any allocated resource logged **&lt; 50%** of expected hours last completed week |
| **ATTENTION** | Milestone due within 7 days still `NOT_STARTED`, **or** hours **50–80%** of expected |
| **ON_TRACK** | Otherwise |

Expected hours per employee = `utilization% × maxWeeklyHours / 100` (default 40). Hour checks use the **last completed week** (Monday–Sunday before the current week).

### Swagger test flow

1. **Admin:** create project with milestones; set one milestone `IN_PROGRESS` with past `dueDate` → expect **AT_RISK**
2. **Manager login** → `GET /api/manager/projects` → verify `healthStatus` on each project
3. `GET /api/manager/projects/{id}` → inspect `health.riskFlags` messages
4. Allocate employee 50%, have them log 8 hrs last week → **AT_RISK** (`LOW_HOURS` flag)

### Not in this phase

- Background scheduler and automatic `MISSED` marking (Phase 7)
- LLM risk summary (Phase 8)

### Tests

```bash
npm test
```

Unit tests cover `ProjectHealthService` milestone/hour rules and `ManagerProjectService` list/detail authorization.

## Phase 7 — Console client (thin REST client)

Separate package in `console/` — **no database access**, all business rules stay on the server.

### Run

Terminal 1 (API server):

```bash
npm run dev
```

Terminal 2 (console):

```bash
npm run console:dev
```

Set `API_BASE_URL=http://localhost:3000` in project `.env` or `console/.env` if needed.

### Architecture

- **Client-Server:** console menus → HTTP JSON → Express API → Prisma → Neon
- **Navigation:** stack-based `[B] Back` on sub-screens; `Logout` on role menus
- **Patterns:** Adapter (`*Api.ts`), Facade (`AppContext`), SRP (one screen per file)

### BRD screens implemented

| Role | Screens |
|------|---------|
| Common | Login, forced password change, exit |
| Admin | Employees, projects, milestones, allocations matrix, users, system config |
| Manager | Dashboard, allocate (validate + direct + end), projects + health flags, team timesheets |
| Employee | Submit timesheet (multi-project single POST), history, allocations, reminder banner |

AI menus show a stub until Phase 8 LLM endpoints exist. Structured `riskFlags` work without AI.

### Console timesheet notes (from API testing)

- One `POST /timesheets` per week with multiple `entries[]` (not one POST per project)
- `weekStart` must be a **Monday** (`YYYY-MM-DD` sent to API; UI accepts DD-MM-YYYY)
- Multiple tags = multiple objects in `tags[]` (one `activityTagId` each)
- `customText` required only for **Other** tag
- Use **employee ID** (dashboard) for manager allocations, **user ID** for assign-manager

## Health check

```bash
curl http://localhost:3000/api/health
```

If Neon is waking up, retry after a few seconds or wait for the health endpoint retries.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start server with nodemon (auto-restart on file changes) |
| `npm run console:dev` | Start console client (watch mode) |
| `npm run console` | Start console client once |
| `npm test` | Run Jest unit tests |
| `npm run prisma:migrate` | Run Prisma migrations |
| `npm run prisma:seed` | Seed admin, activity tags, system config |
| `npm run prisma:studio` | Open Prisma Studio |

## Project structure

```
console/src/        Thin REST client (screens, api adapters, navigation)
src/
  application/      Services, validators (business logic)
  domain/           Types, repository interfaces
  infrastructure/   Prisma repos, JWT helpers
  presentation/     Routes, controllers, middleware
  shared/constants/ Messages, routes, HTTP codes (no magic strings)
  shared/logger/    Structured JSON application logging
  shared/utils/     parseBody, parseParams, date helpers
  swagger/          OpenAPI spec
prisma/
  schema.prisma     Full database schema
  seed.ts           Bootstrap data
```

## Design notes (Phase 2)

- **SRP:** `AuthService` handles auth only; controllers delegate to services
- **Repository pattern:** `IUserRepository` / `PrismaUserRepository`
- **DIP:** Services depend on interfaces, not Prisma directly
- **Constants:** User-facing strings live in `src/shared/constants/`
