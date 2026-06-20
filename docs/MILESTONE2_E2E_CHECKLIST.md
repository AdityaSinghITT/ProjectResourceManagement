# Milestone 2 — Manual E2E Checklist

Use after `npx prisma migrate deploy`, `npx prisma db seed`, and both servers running.

**Automated API E2E:** `npm run test:e2e` (requires demo seed)

## Prerequisites

| Terminal | Command |
|----------|---------|
| 1 — API | `npm run dev` |
| 2 — Console | `npm run console:dev` |

Optional: `ENABLE_SCHEDULER=true` in `.env` for MISSED timesheet automation.

### Demo accounts (from seed)

| Role | Username | Password |
|------|----------|----------|
| Admin | `admin` | `Admin@1234` → change on first login |
| Manager | `ankit.shah` | `Manager@1234` |
| Resource | `ravi.kumar` | `Resource@1234` |
| Resource | `priya.sharma` | `Resource@1234` |

---

## 1. Auth (all roles)

- [ ] `GET /api/health` → `database: connected`
- [ ] Swagger or console: login as **admin** → forced password change → admin menu
- [ ] Logout → login as **ankit.shah** → manager menu (no password change)
- [ ] Logout → login as **ravi.kumar** → resource menu

---

## 2. Admin console (Screen 3)

- [ ] **Manage Users** — list shows demo users; roles ADMIN / MANAGER / RESOURCE
- [ ] **Manage Employees** — Ravi = ALLOCATED, Priya = BENCH; note **ID** column (resource profile ID)
- [ ] **Manage Projects** — Alpha Portal listed with milestones
- [ ] **View All Allocations** — filter `[F]` by Ravi's resource profile ID → shows Alpha Portal 50%
- [ ] **System Configuration** — scheduler interval 4h, max hours 40

---

## 3. Manager console (Screen 4)

- [ ] **Resource Dashboard** — Priya on bench, Ravi in active list
- [ ] Drill-down `[D]` on Ravi — skills, allocations, activity tags
- [ ] **My Projects** — Alpha Portal shows health badge (ON_TRACK / ATTENTION / AT_RISK)
- [ ] Project detail — milestones + risk flags visible
- [ ] **Allocate Resource** — validate 50% allocation (optional: allocate Priya to project)
- [ ] **Timesheets** — prior week shows Ravi SUBMITTED rows; **ID column** works for `[V]` detail

---

## 4. Resource console (Screen 5)

- [ ] Menu shows timesheet reminder if applicable
- [ ] **View My Allocations** — Alpha Portal 50%
- [ ] **View My Timesheets** — prior week SUBMITTED visible
- [ ] **Submit Timesheet** — current Monday week, multi-project `entries[]` (if allocated)

---

## 5. Swagger spot-check

- [ ] `/api-docs` — roles show RESOURCE (not EMPLOYEE)
- [ ] Authorize as manager → `GET /api/manager/dashboard` 200
- [ ] Authorize as resource → `GET /api/admin/users` 403

---

## 6. Scheduler (if enabled)

- [ ] Restart API with `ENABLE_SCHEDULER=true`
- [ ] Logs show `Scheduler run started` / `Scheduler run completed`
- [ ] After a missed week scenario, manager timesheets show `MISSED` for allocated resource

---

## 7. Automated regression

```bash
npm test                 # unit tests
npm run test:integration # RBAC + auth integration
npm run test:e2e         # demo seed E2E matrix
```

All three should pass against your Neon database.
