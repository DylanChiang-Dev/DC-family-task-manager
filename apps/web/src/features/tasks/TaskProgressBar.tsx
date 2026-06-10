export function TaskProgressBar({
  value,
  onChange,
  readOnly = false,
}: {
  value: number;
  onChange?: (next: number) => void;
  readOnly?: boolean;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>進度</span>
        <span>{clamped}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${clamped}%` }} />
      </div>
      {!readOnly && (
        <input
          type="range"
          aria-label="進度"
          min={0}
          max={100}
          step={5}
          value={clamped}
          onChange={(e) => onChange?.(Number(e.target.value))}
          className="w-full"
        />
      )}
    </div>
  );
}
