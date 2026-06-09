# Personal Schedule Blocks Design

## Summary

Add personal, all-day schedule blocks to the dashboard calendar. These blocks represent where the current user is, or what broad context they are in, across one or more dates. Examples include "Guangzhou", "Shenzhen", or "Fudan University". They are separate from tasks: a user can be in Fudan University all day on June 25 and still have multiple tasks on that date.

The first version is private to the logged-in user, date-only, and displayed as a lightweight location/status layer on the existing dashboard calendar.

## Goals

- Show personal location/status context directly on the dashboard calendar.
- Support single-day and multi-day all-day blocks.
- Keep schedule blocks visually separate from task chips.
- Let the user create, edit, and delete schedule blocks from the web app.
- Ensure schedule blocks do not affect task counts, task status, overdue logic, or team task visibility.

## Non-Goals

- No hourly start/end times in the first version.
- No team sharing or family-wide visibility in the first version.
- No map, geocoding, travel planning, reminders, or notifications.
- No recurrence for schedule blocks in the first version.
- No integration with task CRUD beyond coexisting on the same calendar date.

## Data Model

Add a new table, `schedule_blocks`.

Fields:

- `id`: integer primary key.
- `user_id`: owner. References `users.id` and is required.
- `title`: short display title, required. Examples: `Guangzhou trip`, `Fudan University`.
- `location`: optional location label. When present, calendar cells prefer this shorter label for display.
- `start_date`: `YYYY-MM-DD`, required.
- `end_date`: `YYYY-MM-DD`, required. Must be greater than or equal to `start_date`.
- `color`: hex color string, required, default chosen by the app.
- `note`: optional free text.
- `created_at`: timestamp.
- `updated_at`: timestamp.

Indexes:

- `idx_schedule_user_start_end` on `user_id`, `start_date`, `end_date`.

Ownership rule:

- Every query and mutation is scoped to `user_id = currentUser.id`.
- Schedule blocks are not scoped to `team_id` and are not visible to other users.

## API

Add routes under `/api/schedule-blocks`.

Endpoints:

- `GET /api/schedule-blocks?start=YYYY-MM-DD&end=YYYY-MM-DD`
- `POST /api/schedule-blocks`
- `PATCH /api/schedule-blocks/:id`
- `DELETE /api/schedule-blocks/:id`

Validation:

- `start` and `end` are required for list queries.
- The list endpoint returns blocks that overlap the requested date range.
- `startDate <= endDate`.
- `title` is required and trimmed.
- `color` must be a hex color.
- `location` and `note` are optional strings.

Response shape:

- `id`
- `userId`
- `title`
- `location`
- `startDate`
- `endDate`
- `color`
- `note`
- `createdAt`
- `updatedAt`

## Frontend UX

Dashboard calendar:

- Each calendar cell keeps tasks as the primary content.
- A compact schedule strip appears near the bottom of the cell when one or more schedule blocks overlap that date.
- The strip uses the block color with a subtle background and border.
- The label is `location` when present, otherwise `title`.
- Multi-day blocks appear on each covered date in the first version. They do not need connected spanning bars yet.
- If a date has multiple blocks, show the first block and a compact `+N` indicator.

Right-side dashboard panel:

- When a date is selected, show that date's schedule blocks in a small section separate from task lists.
- Keep it compact: label, date range, and optional note.
- Provide edit and delete actions.

Creation and editing:

- Add a small `新增行程` button next to `新增任務`.
- Use a dialog with fields: title, location, start date, end date, color, note.
- Default start and end dates to the currently selected date.
- Editing reuses the same dialog.

Empty state:

- If selected date has no schedule blocks, do not show a large empty panel.

## Interaction Rules

- Schedule blocks do not count as tasks.
- They do not appear in "today", "overdue", "in progress", or "month" task metrics.
- They do not change task sorting.
- They are displayed on top of the current rolling 6-week dashboard window and mobile expanded 6-week calendar.
- The 14-day mobile date rail may show a small colored marker if space allows, but this is optional for the first implementation.

## Testing

Backend:

- Create a schedule block for the current user.
- List blocks overlapping a date range.
- Reject invalid date ranges.
- Reject access to another user's block.
- Update and delete own block.

Frontend:

- Dashboard fetches schedule blocks for the visible calendar window.
- A multi-day block appears on every covered date.
- Schedule strips do not change task counts.
- `新增行程` opens the dialog with the selected date.
- Create, edit, and delete flows update the dashboard.
- Mobile expanded calendar still renders without occupying the initial mobile viewport.

## Rollout

Implementation can ship in one vertical slice:

1. Shared schemas and types.
2. Database schema and migration.
3. API routes and tests.
4. Web API client and hooks.
5. Dashboard display and dialog.
6. RTL tests and typecheck/build validation.

## Open Decisions

- First version is personal-only.
- First version is all-day/date-only.
- Schedule blocks are a separate data model, not tasks.
- Calendar cells show schedule blocks as a bottom strip, visually separate from task chips.
