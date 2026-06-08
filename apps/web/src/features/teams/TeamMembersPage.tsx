import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import {
  useRegenerateInviteCode,
  useRemoveTeamMember,
  useTeam,
  useTeamMembers,
  useUpdateTeam,
} from "./hooks";

export function TeamMembersPage() {
  const id = Number(useParams().id);
  const user = useAuthStore((s) => s.user);
  const { data: team, isLoading: teamLoading } = useTeam(id);
  const { data: members, isLoading: membersLoading } = useTeamMembers(id);
  const updateMutation = useUpdateTeam(id);
  const inviteMutation = useRegenerateInviteCode(id);
  const removeMutation = useRemoveTeamMember(id);
  const [name, setName] = useState("");

  useEffect(() => {
    if (team) setName(team.name);
  }, [team]);

  if (Number.isNaN(id)) {
    return <p className="text-destructive">團隊 ID 無效</p>;
  }

  const isAdmin = team?.role === "admin";

  const rename = () => {
    const next = name.trim();
    if (!next) return;
    updateMutation.mutate(
      { name: next },
      { onError: (e) => toast.error(e instanceof ApiError ? e.message : "更新團隊失敗") },
    );
  };

  const regenerateInvite = () => {
    inviteMutation.mutate(undefined, {
      onError: (e) => toast.error(e instanceof ApiError ? e.message : "更新邀請碼失敗"),
    });
  };

  const removeMember = (userId: number, nickname: string) => {
    if (!confirm(`確定移除「${nickname}」？`)) return;
    removeMutation.mutate(userId, {
      onError: (e) => toast.error(e instanceof ApiError ? e.message : "移除成員失敗"),
    });
  };

  if (teamLoading || membersLoading) {
    return <p className="text-muted-foreground">載入中...</p>;
  }

  if (!team) {
    return <p className="text-muted-foreground">找不到團隊</p>;
  }

  return (
    <div className="space-y-4">
      <Button asChild variant="ghost" size="sm">
        <Link to="/teams">返回團隊管理</Link>
      </Button>

      <div>
        <h1 className="text-xl font-semibold">{team.name}</h1>
        <p className="text-sm text-muted-foreground">
          邀請碼 {team.inviteCode} · {isAdmin ? "管理員" : "成員"}
        </p>
      </div>

      {isAdmin && (
        <Card className="grid gap-3 p-4 sm:grid-cols-[1fr_auto_auto]">
          <div className="space-y-1.5">
            <Label htmlFor="teamName">團隊名稱</Label>
            <Input id="teamName" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <Button className="self-end" onClick={rename} disabled={updateMutation.isPending}>
            儲存名稱
          </Button>
          <Button
            className="self-end"
            variant="outline"
            onClick={regenerateInvite}
            disabled={inviteMutation.isPending}
          >
            更新邀請碼
          </Button>
        </Card>
      )}

      <Card className="space-y-3 p-4">
        <h2 className="font-semibold">成員</h2>
        {(members ?? []).length > 0 ? (
          <div className="space-y-2">
            {(members ?? []).map((member) => {
              const isSelf = member.userId === user?.id;
              return (
                <div key={member.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{member.nickname}</p>
                    <p className="text-sm text-muted-foreground">
                      @{member.username} · {member.role === "admin" ? "管理員" : "成員"}
                    </p>
                  </div>
                  {isAdmin && !isSelf && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeMember(member.userId, member.nickname)}
                      disabled={removeMutation.isPending}
                    >
                      移除
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">目前沒有成員</p>
        )}
      </Card>
    </div>
  );
}
