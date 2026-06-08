import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import {
  useCreateTeam,
  useDeleteTeam,
  useJoinTeam,
  useSwitchTeam,
  useTeams,
} from "./hooks";

export function TeamsPage() {
  const currentTeamId = useAuthStore((s) => s.currentTeamId);
  const { data, isLoading } = useTeams();
  const createMutation = useCreateTeam();
  const joinMutation = useJoinTeam();
  const switchMutation = useSwitchTeam();
  const deleteMutation = useDeleteTeam();
  const [teamName, setTeamName] = useState("");
  const [inviteCode, setInviteCode] = useState("");

  const create = () => {
    const name = teamName.trim();
    if (!name) return;
    createMutation.mutate(
      { name },
      {
        onSuccess: () => setTeamName(""),
        onError: (e) => toast.error(e instanceof ApiError ? e.message : "建立團隊失敗"),
      },
    );
  };

  const join = () => {
    const code = inviteCode.trim();
    if (!code) return;
    joinMutation.mutate(
      { inviteCode: code },
      {
        onSuccess: () => setInviteCode(""),
        onError: (e) => toast.error(e instanceof ApiError ? e.message : "加入團隊失敗"),
      },
    );
  };

  const remove = (id: number, name: string) => {
    if (!confirm(`確定刪除團隊「${name}」？`)) return;
    deleteMutation.mutate(id, {
      onError: (e) => toast.error(e instanceof ApiError ? e.message : "刪除團隊失敗"),
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">團隊管理</h1>
        <p className="text-sm text-muted-foreground">建立、加入與管理你的家庭或工作團隊。</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="space-y-3 p-4">
          <div className="space-y-1.5">
            <Label htmlFor="teamName">新團隊名稱</Label>
            <Input id="teamName" value={teamName} onChange={(e) => setTeamName(e.target.value)} />
          </div>
          <Button onClick={create} disabled={createMutation.isPending}>
            建立團隊
          </Button>
        </Card>
        <Card className="space-y-3 p-4">
          <div className="space-y-1.5">
            <Label htmlFor="inviteCode">邀請碼</Label>
            <Input
              id="inviteCode"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
            />
          </div>
          <Button onClick={join} disabled={joinMutation.isPending}>
            加入團隊
          </Button>
        </Card>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">載入中...</p>
      ) : (data?.teams ?? []).length > 0 ? (
        <div className="space-y-3">
          {(data?.teams ?? []).map((team) => {
            const isCurrent = team.id === currentTeamId;
            const canDelete = team.role === "admin" && team.memberCount === 1;
            return (
              <Card key={team.id} className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-medium">{team.name}</span>
                    {isCurrent && <span className="text-xs text-muted-foreground">目前團隊</span>}
                    <span className="text-xs text-muted-foreground">
                      {team.role === "admin" ? "管理員" : "成員"} · {team.memberCount} 人
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">邀請碼 {team.inviteCode}</p>
                </div>
                <div className="flex shrink-0 flex-wrap justify-end gap-2">
                  {!isCurrent && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => switchMutation.mutate(team.id)}
                      disabled={switchMutation.isPending}
                    >
                      切換
                    </Button>
                  )}
                  <Button asChild variant="ghost" size="sm">
                    <Link to={`/teams/${team.id}/members`}>成員</Link>
                  </Button>
                  {canDelete && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => remove(team.id, team.name)}
                      disabled={deleteMutation.isPending}
                    >
                      刪除
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <p className="py-12 text-center text-muted-foreground">目前沒有團隊</p>
      )}
    </div>
  );
}
