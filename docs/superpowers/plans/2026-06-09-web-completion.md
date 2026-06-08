# Web Frontend Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the remaining React SPA frontend so the deployed backend and frontend vertical workflows are testable end to end.

**Architecture:** Continue the existing `apps/web` feature-based structure from Phase 2. Use `@ftm/shared` schemas/types, TanStack Query for server state, Zustand only for auth/team/theme UI state, and the existing `request()` client for cookie refresh and team headers.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind v4, shadcn/Radix, TanStack Query, Zustand, React Hook Form, Vitest + RTL + MSW, vite-plugin-pwa.

---

## Remaining Scope

- Categories CRUD page and task form category picker.
- Task detail page with comments and history.
- Notifications center with unread badge and read/delete actions.
- Calendar month view with recurring task expansion and lunar date display.
- Mobile bottom navigation, desktop sidebar/header polish, dark mode toggle.
- PWA manifest/service worker and final deployed-backend smoke validation.

---

### Task 1: Categories API, Hooks, And Page

**Files:**
- Create: `apps/web/src/features/categories/api.ts`
- Create: `apps/web/src/features/categories/hooks.ts`
- Create: `apps/web/src/features/categories/CategoriesPage.tsx`
- Test: `apps/web/src/features/categories/api.test.ts`
- Test: `apps/web/src/features/categories/CategoriesPage.test.tsx`
- Modify: `apps/web/src/app/router.tsx`

- [ ] Step 1: Add category API functions for `GET /categories`, `POST /categories`, `PATCH /categories/:id`, `DELETE /categories/:id`.
- [ ] Step 2: Add query/mutation hooks that invalidate `["categories"]` and `["tasks"]` after changes.
- [ ] Step 3: Add a management page with list, create form, inline edit, delete confirmation, color input, and backend error display.
- [ ] Step 4: Add route `/categories`.
- [ ] Step 5: Run `pnpm --filter @ftm/web test -- categories`.
- [ ] Step 6: Commit `feat(web): add category management page`.

### Task 2: Task Detail, Comments, And History

**Files:**
- Modify: `apps/web/src/features/tasks/api.ts`
- Modify: `apps/web/src/features/tasks/hooks.ts`
- Create: `apps/web/src/features/tasks/TaskDetailPage.tsx`
- Test: `apps/web/src/features/tasks/TaskDetailPage.test.tsx`
- Modify: `apps/web/src/app/router.tsx`
- Modify: `apps/web/src/features/tasks/TaskCard.tsx`

- [ ] Step 1: Add `fetchTask`, `fetchTaskComments`, `createTaskComment`, and `fetchTaskHistory` API functions.
- [ ] Step 2: Add corresponding Query hooks and comment mutation invalidation.
- [ ] Step 3: Add task detail route `/tasks/:id` with summary, comments form/list, and history list.
- [ ] Step 4: Make task card title/details navigate to `/tasks/:id`.
- [ ] Step 5: Run `pnpm --filter @ftm/web test -- TaskDetailPage`.
- [ ] Step 6: Commit `feat(web): add task detail page with comments and history`.

### Task 3: Notifications Center

**Files:**
- Create: `apps/web/src/features/notifications/api.ts`
- Create: `apps/web/src/features/notifications/hooks.ts`
- Create: `apps/web/src/features/notifications/NotificationsPage.tsx`
- Create: `apps/web/src/features/notifications/NotificationBadge.tsx`
- Test: `apps/web/src/features/notifications/NotificationsPage.test.tsx`
- Modify: `apps/web/src/components/AppLayout.tsx`
- Modify: `apps/web/src/app/router.tsx`

- [ ] Step 1: Add API functions for list, mark read, mark all read, and delete.
- [ ] Step 2: Add hooks with unread count query and mutations.
- [ ] Step 3: Add `/notifications` page with unread-only toggle, mark read, mark all read, delete.
- [ ] Step 4: Add unread badge to app navigation.
- [ ] Step 5: Run `pnpm --filter @ftm/web test -- NotificationsPage`.
- [ ] Step 6: Commit `feat(web): add notification center with unread badge`.

### Task 4: Calendar, Recurrence, And Lunar Dates

**Files:**
- Create: `apps/web/src/features/calendar/recurrence.ts`
- Create: `apps/web/src/lib/lunar.ts`
- Create: `apps/web/src/features/calendar/CalendarPage.tsx`
- Test: `apps/web/src/features/calendar/recurrence.test.ts`
- Test: `apps/web/src/features/calendar/CalendarPage.test.tsx`
- Modify: `apps/web/src/app/router.tsx`

- [ ] Step 1: Implement pure recurring expansion using shared `RecurrenceConfig` and existing task types.
- [ ] Step 2: Port lunar conversion as a typed pure module that returns stable labels for supported dates.
- [ ] Step 3: Add `/calendar` month view with task dots and selected-day task list.
- [ ] Step 4: Run `pnpm --filter @ftm/web test -- calendar`.
- [ ] Step 5: Commit `feat(web): add calendar view with recurring tasks and lunar dates`.

### Task 5: Navigation, Dark Mode, And PWA

**Files:**
- Modify: `apps/web/src/components/AppLayout.tsx`
- Create: `apps/web/src/stores/theme-store.ts`
- Modify: `apps/web/src/main.tsx`
- Modify: `apps/web/vite.config.ts`
- Modify: `apps/web/package.json`
- Create: `apps/web/public/pwa.svg`
- Test: `apps/web/src/stores/theme-store.test.ts`

- [ ] Step 1: Add theme store and dark class bootstrap.
- [ ] Step 2: Add desktop navigation links and mobile bottom tabs for tasks/calendar/notifications/settings/categories.
- [ ] Step 3: Add `vite-plugin-pwa` with manifest and NetworkFirst API runtime caching.
- [ ] Step 4: Run `pnpm install`, `pnpm --filter @ftm/web test -- theme-store`, and `pnpm --filter @ftm/web build`.
- [ ] Step 5: Commit `feat(web): add responsive navigation dark mode and PWA support`.

### Task 6: Final Verification

**Files:**
- Modify: implementation files only if verification finds defects.

- [ ] Step 1: Run `pnpm --filter @ftm/web typecheck`.
- [ ] Step 2: Run `pnpm --filter @ftm/web test`.
- [ ] Step 3: Run `pnpm --filter @ftm/web build`.
- [ ] Step 4: Run deployed backend smoke for auth refresh, category CRUD, task CRUD, comments/history, notifications list, and task calendar data.
- [ ] Step 5: Commit any verification fixes.

