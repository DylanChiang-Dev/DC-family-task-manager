import type { ProfileResponse, UpdateProfileInput } from "@ftm/shared";
import { request } from "@/lib/api-client";

export function fetchProfile() {
  return request<ProfileResponse>("/profile");
}

export function updateProfile(input: UpdateProfileInput) {
  return request<ProfileResponse>("/profile", {
    method: "PATCH",
    body: input,
  });
}
