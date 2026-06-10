// ── 日曆日（YYYY-MM-DD）格式化，全 repo 統一出口 ──

/** 以「本地時區」取日曆日。瀏覽器端用（使用者看到的日期）。 */
export function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** 以「UTC」取日曆日。Workers / cron 端用（runtime 時區即 UTC）。 */
export function formatDateKeyUTC(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
