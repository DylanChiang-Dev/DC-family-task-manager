import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { loginSchema, type LoginInput } from "@ftm/shared";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api-client";
import { useLogin } from "./hooks";

export function LoginPage() {
  const navigate = useNavigate();
  const loginMutation = useLogin();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (values: LoginInput) => {
    setServerError(null);
    try {
      await loginMutation.mutateAsync(values);
      navigate("/", { replace: true });
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : "登入失敗，請稍後再試");
    }
  };

  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm p-6">
        <h1 className="mb-6 text-xl font-semibold">登入</h1>
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="username">用戶名</Label>
            <Input id="username" autoComplete="username" {...register("username")} />
            {errors.username && <p className="text-sm text-destructive">{errors.username.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">密碼</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              {...register("password")}
            />
            {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
          </div>
          {serverError && <p className="text-sm text-destructive">{serverError}</p>}
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "登入中..." : "登入"}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          還沒有帳號？
          <Link to="/register" className="underline">
            註冊
          </Link>
        </p>
      </Card>
    </div>
  );
}
