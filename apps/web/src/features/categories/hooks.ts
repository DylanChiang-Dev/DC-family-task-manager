import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UpdateCategoryInput } from "@ftm/shared";
import { createCategory, deleteCategory, fetchCategories, updateCategory } from "./api";

export function useCategories() {
  return useQuery({ queryKey: ["categories"], queryFn: fetchCategories });
}

function useCategoryInvalidation() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["categories"] });
    qc.invalidateQueries({ queryKey: ["tasks"] });
  };
}

export function useCreateCategory() {
  const invalidate = useCategoryInvalidation();
  return useMutation({ mutationFn: createCategory, onSuccess: invalidate });
}

export function useUpdateCategory() {
  const invalidate = useCategoryInvalidation();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateCategoryInput }) =>
      updateCategory(id, input),
    onSuccess: invalidate,
  });
}

export function useDeleteCategory() {
  const invalidate = useCategoryInvalidation();
  return useMutation({ mutationFn: deleteCategory, onSuccess: invalidate });
}
