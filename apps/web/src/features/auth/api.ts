import type {
  LoginInput,
  LoginResponse,
  MeResponse,
  RegisterInput,
  RegisterResponse,
} from "@ftm/shared";
import { request } from "@/lib/api-client";

export function login(input: LoginInput) {
  return request<LoginResponse>("/auth/login", {
    method: "POST",
    body: input,
    skipAuthRefresh: true,
  });
}

export function register(input: RegisterInput) {
  return request<RegisterResponse>("/auth/register", {
    method: "POST",
    body: input,
    skipAuthRefresh: true,
  });
}

export function logout() {
  return request<{ message: string }>("/auth/logout", {
    method: "POST",
    skipAuthRefresh: true,
  });
}

export function fetchMe() {
  return request<MeResponse>("/auth/me");
}
