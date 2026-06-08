import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { registerSchema, type RegisterInput } from "@ftm/shared";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api-client";
import { useRegister } from "./hooks";

export function RegisterPage() {
  const navigate = useNavigate();
  const registerMutation = useRegister();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { teamOption: "create" },
  });
  const teamOption = watch("teamOption");

  const onSubmit = async (values: RegisterInput) => {
    setServerError(null);
    try {
      await registerMutation.mutateAsync(values);
      navigate("/", { replace: true });
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : "註冊失敗，請稍後再試");
    }
  };

  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm p-6">
        <h1 className="mb-6 text-xl font-semibold">註冊</h1>
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="username">用戶名</Label>
            <Input id="username" autoComplete="username" {...register("username")} />
            {errors.username && <p className="text-sm text-destructive">{errors.username.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nickname">暱稱</Label>
            <Input id="nickname" {...register("nickname")} />
            {errors.nickname && <p className="text-sm text-destructive">{errors.nickname.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">密碼</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              {...register("password")}
            />
            {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">團隊</legend>
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" value="create" {...register("teamOption")} /> 建立新團隊
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" value="join" {...register("teamOption")} /> 加入團隊
            </label>
          </fieldset>

          {teamOption === "create" ? (
            <div className="space-y-1.5">
              <Label htmlFor="teamName">團隊名稱（可留空）</Label>
              <Input
                id="teamName"
                {...register("teamName", { setValueAs: (v) => v || undefined })}
              />
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="inviteCode">邀請碼</Label>
              <Input
                id="inviteCode"
                {...register("inviteCode", { setValueAs: (v) => v || undefined })}
              />
              {errors.inviteCode && <p className="text-sm text-destructive">{errors.inviteCode.message}</p>}
            </div>
          )}

          {serverError && <p className="text-sm text-destructive">{serverError}</p>}
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "註冊中..." : "註冊"}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          已有帳號？
          <Link to="/login" className="underline">
            登入
          </Link>
        </p>
      </Card>
    </div>
  );
}
