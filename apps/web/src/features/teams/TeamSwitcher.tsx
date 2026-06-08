import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuthStore } from "@/stores/auth-store";
import { useSwitchTeam, useTeams } from "./hooks";

export function TeamSwitcher() {
  const currentTeamId = useAuthStore((s) => s.currentTeamId);
  const { data } = useTeams();
  const switchMutation = useSwitchTeam();

  const teams = data?.teams ?? [];
  const current = teams.find((t) => t.id === currentTeamId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          {current?.name ?? "選擇團隊"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {teams.map((t) => (
          <DropdownMenuItem
            key={t.id}
            onSelect={() => {
              if (t.id !== currentTeamId) switchMutation.mutate(t.id);
            }}
          >
            {t.name}
            <span className="ml-2 text-xs text-muted-foreground">{t.memberCount} 人</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
