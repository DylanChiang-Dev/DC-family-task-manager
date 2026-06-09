export const PRESET_COLORS = [
  "#3B82F6",
  "#0EA5E9",
  "#6366F1",
  "#8B5CF6",
  "#EC4899",
  "#EF4444",
  "#F97316",
  "#F59E0B",
  "#22C55E",
  "#14B8A6",
] as const;

export function ColorSwatchPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (color: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {PRESET_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          className={`h-7 w-7 rounded-full transition-transform ${
            value === color
              ? "ring-2 ring-foreground ring-offset-2 scale-110"
              : "ring-1 ring-border hover:scale-105"
          }`}
          style={{ backgroundColor: color }}
          onClick={() => onChange(color)}
          aria-label={color}
          aria-pressed={value === color}
        />
      ))}
    </div>
  );
}
