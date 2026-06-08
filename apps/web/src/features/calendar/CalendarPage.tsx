import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { solarToLunar } from "@/lib/lunar";
import { useTasks } from "@/features/tasks/hooks";
import { expandRecurringTasks, formatDateKey } from "./recurrence";

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

function monthBounds(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  const end = new Date(start);
  end.setDate(start.getDate() + 41);
  return { first, start, end };
}

export function CalendarPage() {
  const [month, setMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => formatDateKey(new Date()));
  const { data: tasks } = useTasks("all");

  const { first, start, end } = monthBounds(month);
  const calendarTasks = useMemo(
    () => expandRecurringTasks(tasks ?? [], start, end),
    [tasks, start.getTime(), end.getTime()],
  );
  const cells = useMemo(
    () =>
      Array.from({ length: 42 }, (_, index) => {
        const date = new Date(start);
        date.setDate(start.getDate() + index);
        const key = formatDateKey(date);
        const lunar = solarToLunar(date.getFullYear(), date.getMonth() + 1, date.getDate());
        return {
          date,
          key,
          lunar,
          tasks: calendarTasks.filter((task) => task.dueDate === key),
          isCurrentMonth: date.getMonth() === first.getMonth(),
        };
      }),
    [calendarTasks, first, start],
  );
  const selectedTasks = calendarTasks.filter((task) => task.dueDate === selectedDate);

  const shiftMonth = (delta: number) => {
    const next = new Date(month);
    next.setMonth(month.getMonth() + delta);
    setMonth(next);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">日曆</h1>
          <p className="text-sm text-muted-foreground">
            {first.getFullYear()} 年 {first.getMonth() + 1} 月
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => shiftMonth(-1)}>
            上月
          </Button>
          <Button variant="outline" size="sm" onClick={() => shiftMonth(1)}>
            下月
          </Button>
        </div>
      </div>

      <Card className="p-3">
        <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
          {WEEKDAYS.map((day) => (
            <div key={day} className="py-2">{day}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((cell) => (
            <button
              key={cell.key}
              className={`min-h-20 rounded-lg border p-2 text-left ${
                cell.key === selectedDate ? "border-primary bg-primary/10" : "border-border"
              } ${cell.isCurrentMonth ? "opacity-100" : "opacity-40"}`}
              onClick={() => setSelectedDate(cell.key)}
            >
              <div className="font-medium">{cell.date.getDate()}</div>
              <div className="text-xs text-muted-foreground">{cell.lunar.day}</div>
              <div className="mt-1 space-y-1">
                {cell.tasks.slice(0, 2).map((task) => (
                  <div key={`${task.id}-${task.dueDate}`} className="truncate rounded bg-muted px-1 text-xs">
                    {task.title}
                  </div>
                ))}
              </div>
            </button>
          ))}
        </div>
      </Card>

      <Card className="space-y-2 p-4">
        <h2 className="font-semibold">{selectedDate}</h2>
        {selectedTasks.length > 0 ? (
          selectedTasks.map((task) => (
            <div key={`${task.id}-${task.dueDate}`} className="rounded-lg border p-3">
              <div className="font-medium">{task.title}</div>
              <div className="text-sm text-muted-foreground">{task.status}</div>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">這天沒有任務</p>
        )}
      </Card>
    </div>
  );
}
