import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { updateProfileSchema, type UpdateProfileInput } from "@ftm/shared";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api-client";
import { useProfile, useUpdateProfile } from "./hooks";

export function SettingsPage() {
  const { data: profile, isLoading } = useProfile();
  const updateMutation = useUpdateProfile();
  const [serverError, setServerError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const {
    register,
    reset,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: { nickname: "", email: null, currentPassword: "", newPassword: "" },
  });

  useEffect(() => {
    if (!profile) return;
    reset({
      nickname: profile.nickname,
      email: profile.email,
      currentPassword: "",
      newPassword: "",
    });
  }, [profile, reset]);

  const onSubmit = async (values: UpdateProfileInput) => {
    setServerError(null);
    setSaved(false);

    try {
      await updateMutation.mutateAsync({
        nickname: values.nickname,
        email: values.email || null,
        currentPassword: values.currentPassword || undefined,
        newPassword: values.newPassword || undefined,
      });
      setSaved(true);
      reset({
        nickname: values.nickname,
        email: values.email || null,
        currentPassword: "",
        newPassword: "",
      });
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : "更新設定失敗");
    }
  };

  if (isLoading) {
    return <p className="text-muted-foreground">載入中...</p>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">我的設定</h1>
        <p className="text-sm text-muted-foreground">更新個人資料與登入密碼。</p>
      </div>

      <Card className="p-4">
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="nickname">暱稱</Label>
            <Input id="nickname" {...register("nickname")} />
            {errors.nickname && (
              <p className="text-sm text-destructive">{errors.nickname.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              {...register("email", { setValueAs: (value) => value || null })}
            />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="currentPassword">目前密碼</Label>
              <Input
                id="currentPassword"
                type="password"
                autoComplete="current-password"
                {...register("currentPassword", { setValueAs: (value) => value || undefined })}
              />
              {errors.currentPassword && (
                <p className="text-sm text-destructive">{errors.currentPassword.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="newPassword">新密碼</Label>
              <Input
                id="newPassword"
                type="password"
                autoComplete="new-password"
                {...register("newPassword", { setValueAs: (value) => value || undefined })}
              />
              {errors.newPassword && (
                <p className="text-sm text-destructive">{errors.newPassword.message}</p>
              )}
            </div>
          </div>

          {serverError && <p className="text-sm text-destructive">{serverError}</p>}
          {saved && <p className="text-sm text-muted-foreground">設定已更新</p>}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "儲存中..." : "儲存設定"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
