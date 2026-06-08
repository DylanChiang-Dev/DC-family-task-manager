import type {
  CategoryResponse,
  CreateCategoryInput,
  UpdateCategoryInput,
} from "@ftm/shared";
import { request } from "@/lib/api-client";

export function fetchCategories() {
  return request<CategoryResponse[]>("/categories");
}

export function createCategory(input: CreateCategoryInput) {
  return request<CategoryResponse>("/categories", { method: "POST", body: input });
}

export function updateCategory(id: number, input: UpdateCategoryInput) {
  return request<CategoryResponse>(`/categories/${id}`, { method: "PATCH", body: input });
}

export function deleteCategory(id: number) {
  return request<{ message: string }>(`/categories/${id}`, { method: "DELETE" });
}
