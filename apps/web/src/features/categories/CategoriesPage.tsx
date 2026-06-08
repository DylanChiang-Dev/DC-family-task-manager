import { useState } from "react";
import type { CategoryResponse } from "@ftm/shared";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api-client";
import {
  useCategories,
  useCreateCategory,
  useDeleteCategory,
  useUpdateCategory,
} from "./hooks";

const DEFAULT_COLOR = "#3B82F6";

export function CategoriesPage() {
  const { data: categories, isLoading } = useCategories();
  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();
  const deleteMutation = useDeleteCategory();
  const [name, setName] = useState("");
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [editing, setEditing] = useState<CategoryResponse | null>(null);

  const submitCreate = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    createMutation.mutate(
      { name: trimmed, color },
      {
        onSuccess: () => {
          setName("");
          setColor(DEFAULT_COLOR);
        },
        onError: (e) => toast.error(e instanceof ApiError ? e.message : "新增分類失敗"),
      },
    );
  };

  const submitEdit = () => {
    if (!editing) return;
    const trimmed = editing.name.trim();
    if (!trimmed) return;
    updateMutation.mutate(
      { id: editing.id, input: { name: trimmed, color: editing.color } },
      {
        onSuccess: () => setEditing(null),
        onError: (e) => toast.error(e instanceof ApiError ? e.message : "更新分類失敗"),
      },
    );
  };

  const remove = (category: CategoryResponse) => {
    if (!confirm(`確定刪除分類「${category.name}」？`)) return;
    deleteMutation.mutate(category.id, {
      onError: (e) => toast.error(e instanceof ApiError ? e.message : "刪除分類失敗"),
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">分類管理</h1>
        <p className="text-sm text-muted-foreground">分類會顯示在任務卡片與任務表單中。</p>
      </div>

      <Card className="grid gap-3 p-4 sm:grid-cols-[1fr_auto_auto]">
        <div className="space-y-1.5">
          <Label htmlFor="categoryName">分類名稱</Label>
          <Input id="categoryName" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="categoryColor">顏色</Label>
          <Input
            id="categoryColor"
            className="w-24"
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
          />
        </div>
        <Button className="self-end" onClick={submitCreate} disabled={createMutation.isPending}>
          新增分類
        </Button>
      </Card>

      {isLoading ? (
        <p className="text-muted-foreground">載入中...</p>
      ) : categories && categories.length > 0 ? (
        <div className="space-y-3">
          {categories.map((category) => {
            const isEditing = editing?.id === category.id;
            return (
              <Card key={category.id} className="flex items-center justify-between gap-3 p-4">
                {isEditing && editing ? (
                  <div className="grid flex-1 gap-3 sm:grid-cols-[1fr_auto]">
                    <Input
                      aria-label="編輯分類名稱"
                      value={editing.name}
                      onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                    />
                    <Input
                      aria-label="編輯分類顏色"
                      className="w-24"
                      type="color"
                      value={editing.color}
                      onChange={(e) => setEditing({ ...editing, color: e.target.value })}
                    />
                  </div>
                ) : (
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className="size-4 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    <span className="truncate font-medium">{category.name}</span>
                  </div>
                )}
                <div className="flex shrink-0 gap-2">
                  {isEditing ? (
                    <>
                      <Button variant="ghost" size="sm" onClick={() => setEditing(null)}>
                        取消
                      </Button>
                      <Button size="sm" onClick={submitEdit} disabled={updateMutation.isPending}>
                        儲存
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="ghost" size="sm" onClick={() => setEditing(category)}>
                        編輯
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => remove(category)}>
                        刪除
                      </Button>
                    </>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <p className="py-12 text-center text-muted-foreground">目前沒有分類</p>
      )}
    </div>
  );
}
