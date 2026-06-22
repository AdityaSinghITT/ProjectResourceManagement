# Project & Resource Management Tool — API

Console-based PRM system REST backend (Learn & Code Final Project).

## Current status

| Milestone / area | Status |
|------------------|--------|
| Foundation + Auth + Admin APIs | Complete |
| Allocations + Manager dashboard | Complete |
| Timesheets + Project health | Complete |
| RBAC (roles/permissions on routes) | Complete |
| API integration tests (`npm run test:integration`) | Complete |
| Console client (`console/`) | Complete |
| Background scheduler | Complete (`ENABLE_SCHEDULER=true`) |
| Demo seed data | Complete (`npx prisma db seed`) |
| Swagger docs | Complete (`/api-docs`) |
| AI integration (Phase 8) | Complete (OLLAMA provider) |

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

5. (Optional) Enable background scheduler in `.env`:

```env
ENABLE_SCHEDULER=true
```

6. Start console client (second terminal):

```bash
npm run console:dev
```

## Milestone 2 — Quick start (demo accounts)

After `npx prisma db seed`, these accounts are ready (demo users skip forced password change):

| Role | Username | Password | Notes |
|------|----------|----------|-------|
| Admin | `admin` | `Admin@1234` | Must change password on first login |
| Manager | `ankit.shah` | `Manager@1234` | Owns **Alpha Portal** project |
| Resource | `ravi.kumar` | `Resource@1234` | 50% on Alpha Portal; sample prior-week timesheet |
| Resource | `priya.sharma` | `Resource@1234` | On bench; reports to Ankit |

**Two terminals**

| Terminal | Command |
|----------|---------|
| 1 — API | `npm run dev` |
| 2 — Console | `npm run console:dev` |

**Swagger:** [http://localhost:3000/api-docs](http://localhost:3000/api-docs) — login as each role, authorize with Bearer token.

**API tests**

```bash
npm test                  # unit tests (53+)
npm run test:integration  # HTTP + RBAC tests (needs DATABASE_URL)
```

**ID reminder:** Admin `/employees/{id}` and manager `employeeId` path params = **resource profile ID**, not user ID. Assign-manager uses **user IDs**.

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
- Automatic `MISSED` marking runs via background scheduler when `ENABLE_SCHEDULER=true` (see below)

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

Manager AI menus call live endpoints when LLM is configured (see Phase 8). Structured `riskFlags` work without AI.

## Phase 8 — AI integration (OLLAMA)

Private Ollama-compatible hosts are supported via `POST {baseUrl}/api/generate` with `{ model, prompt, stream: false }`.

### `.env` setup (recommended for local / private host)

Add to project `.env` (see [`.env.example`](.env.example)):

```env
LLM_BASE_URL="http://your-llm-host:11434"
LLM_API_KEY="your-bearer-token-if-required"
LLM_MODEL="gemma3:12b-it-q8_0"
LLM_PROVIDER=OLLAMA
```

Env keys are defined in [`src/shared/constants/envKeys.ts`](src/shared/constants/envKeys.ts). **`.env` takes precedence** over Admin system config for LLM URL, model, and API key.

Restart `npm run dev` after changing `.env`.

### Admin setup (optional override)

1. Log in as **admin** → **System Configuration**
2. Set **LLM Provider** to `OLLAMA`
3. Set **LLM Base URL** (e.g. `http://your-host:11434`) — no trailing path
4. Set **LLM Model** (e.g. `gemma3:12b-it-q8_0`)
5. Optionally set **LLM API Key** if the host requires a bearer token

Or patch via API: `PATCH /api/admin/system-config` with `llmProvider`, `llmBaseUrl`, `llmModel`, `llmApiKey`.

### Manager features

| Console menu | API |
|--------------|-----|
| AI Assistant → Skill Match | `POST /api/manager/ai/skill-match` |
| AI Assistant → Team Builder | `POST /api/manager/ai/team-builder` |
| Allocate Resource → AI match | `POST /api/manager/allocations/ai-match` (alias) |
| My Projects → AI Risk Summary | `POST /api/manager/projects/{id}/ai-risk-summary` |

Skill match pre-filters team members by utilization/availability, then asks the LLM to rank candidates. Risk summary uses structured `ProjectHealthService` output as LLM context.

### Tests

```bash
npm test -- AIService OllamaGenerateProvider
```

## Background scheduler

The scheduler is a **background loop inside the API process** (not a separate OS service). It is **off by default**; set `ENABLE_SCHEDULER=true` in `.env` and restart `npm run dev`.

### When it runs

| Event | What happens |
|-------|----------------|
| Server start | If `ENABLE_SCHEDULER=true`, `startScheduler()` runs in [`src/index.ts`](src/index.ts) after `app.listen` |
| Immediately | First `SchedulerRunner.runOnce()` executes |
| Every N hours | `setInterval` repeats; **N** = `system_config.scheduler_interval_hours` (default **4**, editable via Admin system config API) |

### What each run does

1. **Recompute `resource_status`** (`BENCH` / `ALLOCATED`) for every active resource profile using current allocations ([`EmployeeStatusService`](src/application/services/EmployeeStatusService.ts)).
2. **Timesheet compliance** ([`TimesheetComplianceService`](src/application/services/TimesheetComplianceService.ts)): on working days (Mon–Fri), detect prior-week missing timesheets → Reminder 1 email → Reminder 2 → global freeze + `MISSED` + notify employee and manager.
3. **Flag older missed timesheets** ([`MissedTimesheetService`](src/application/services/MissedTimesheetService.ts)): for completed weeks **older than prior week**, auto-insert `MISSED` if allocated but no submission.
4. **Project at-risk emails** ([`ProjectRiskNotificationService`](src/application/services/ProjectRiskNotificationService.ts)): email project managers when health is `AT_RISK` (once per evaluation week), with AI summary and skill suggestions when LLM is configured.

### Email (Mailtrap)

Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and optional `EMAIL_FROM` in `.env`. If SMTP is unset, emails are logged to the API console (`ConsoleEmailSender`).

### Manager restore

`POST /api/manager/employees/{employeeId}/restore-timesheet-access` — reporting manager clears freeze and deletes the frozen week's `PENDING`/`MISSED` row so the employee can backfill.

### Key files

| File | Role |
|------|------|
| [`src/infrastructure/scheduler/startScheduler.ts`](src/infrastructure/scheduler/startScheduler.ts) | Wires repositories + services, starts runner |
| [`src/infrastructure/scheduler/SchedulerRunner.ts`](src/infrastructure/scheduler/SchedulerRunner.ts) | Interval + `runOnce` orchestration |
| [`src/application/services/TimesheetComplianceService.ts`](src/application/services/TimesheetComplianceService.ts) | Reminder/freeze workflow |
| [`src/application/services/TimesheetRestoreService.ts`](src/application/services/TimesheetRestoreService.ts) | Manager unfreeze + backfill |
| [`src/application/services/ProjectRiskNotificationService.ts`](src/application/services/ProjectRiskNotificationService.ts) | AT_RISK PM emails |
| [`src/infrastructure/email/createEmailSender.ts`](src/infrastructure/email/createEmailSender.ts) | Mailtrap / console fallback |
| [`src/application/services/MissedTimesheetService.ts`](src/application/services/MissedTimesheetService.ts) | Historical MISSED detection |
| [`src/shared/constants/schedulerConfig.ts`](src/shared/constants/schedulerConfig.ts) | Lookback weeks (8) |

### Logs

Scheduler emits JSON logs via `appLogger` (`Scheduler run started`, `Missed timesheet created`, etc.). Set `LOG_LEVEL=info` in `.env` to see them without debug noise.

## Milestone 2 — E2E verification (Phase 7)

### Automated API E2E (demo seed required)

```bash
npx prisma db seed   # if not already done
npm run test:e2e
```

Runs [`demo-seed.e2e.integration.test.ts`](src/presentation/__tests__/integration/demo-seed.e2e.integration.test.ts) against **ankit.shah**, **ravi.kumar**, **priya.sharma**, and **admin** demo data: admin master data, manager dashboard/projects/timesheets, resource allocations/history, RBAC denials.

### Manual console + Swagger checklist

See [docs/MILESTONE2_E2E_CHECKLIST.md](docs/MILESTONE2_E2E_CHECKLIST.md) for step-by-step Admin / Manager / Resource console flows and scheduler verification.

### Full test suite

```bash
npm test                 # unit (57 tests)
npm run test:integration # RBAC matrix (18 tests)
npm run test:e2e         # demo E2E (~15 tests)
```

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
| `npm run prisma:seed` | Seed admin, roles/permissions, demo users, Alpha Portal, sample data |
| `npm run test:integration` | Supertest API + RBAC integration tests |
| `npm run test:e2e` | Demo-seed E2E API matrix (Milestone 2) |
| `npm run prisma:studio` | Open Prisma Studio |

## Project structure

```
console/src/        Thin REST client (screens, api adapters, navigation)
src/
  application/      Services, validators (business logic)
  domain/           Types, repository interfaces
  infrastructure/   Prisma repos, JWT, scheduler runner
  presentation/     Routes, controllers, middleware
  shared/constants/ Messages, routes, HTTP codes (no magic strings)
  shared/logger/    Structured JSON application logging
  shared/utils/     parseBody, parseParams, date helpers
  swagger/          OpenAPI spec
prisma/
  schema.prisma     Full database schema
  seed.ts           Bootstrap + demo manager/resources/project
```

## Design notes (Phase 2)

- **SRP:** `AuthService` handles auth only; controllers delegate to services
- **Repository pattern:** `IUserRepository` / `PrismaUserRepository`
- **DIP:** Services depend on interfaces, not Prisma directly
- **Constants:** User-facing strings live in `src/shared/constants/`
