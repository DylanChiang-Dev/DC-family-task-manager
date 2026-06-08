import { zodResolver } from "@hookform/resolvers/zod";
import { createTaskSchema, type CreateTaskInput, type TaskResponse } from "@ftm/shared";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCategories } from "@/features/categories/hooks";
import { ApiError } from "@/lib/api-client";
import { useCreateTask, useUpdateTask } from "./hooks";

export function TaskFormDialog({
  open,
  task,
  onOpenChange,
}: {
  open: boolean;
  task?: TaskResponse;
  onOpenChange: (open: boolean) => void;
}) {
  const isEdit = !!task;
  const createMutation = useCreateTask();
  const updateMutation = useUpdateTask();
  const { data: categories } = useCategories();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateTaskInput>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: {
      title: task?.title ?? "",
      description: task?.description ?? "",
      priority: task?.priority ?? "medium",
      status: task?.status ?? "pending",
      taskType: task?.taskType ?? "normal",
      dueDate: task?.dueDate ?? null,
      categoryId: task?.categoryId ?? null,
    },
  });

  const onSubmit = async (values: CreateTaskInput) => {
    const input: CreateTaskInput = {
      ...values,
      description: values.description || null,
      dueDate: values.dueDate || null,
      categoryId: values.categoryId || null,
    };

    try {
      if (isEdit && task) {
        await updateMutation.mutateAsync({ id: task.id, input });
      } else {
        await createMutation.mutateAsync(input);
      }
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "儲存失敗");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "編輯任務" : "新增任務"}</DialogTitle>
          <DialogDescription>填寫任務內容、優先級與截止日期。</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="title">標題</Label>
            <Input id="title" {...register("title")} />
            {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="description">描述</Label>
            <Textarea id="description" {...register("description")} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>優先級</Label>
              <Select
                defaultValue={watch("priority")}
                onValueChange={(v) => setValue("priority", v as CreateTaskInput["priority"])}
              >
                <SelectTrigger aria-label="優先級">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">低</SelectItem>
                  <SelectItem value="medium">中</SelectItem>
                  <SelectItem value="high">高</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dueDate">截止日期</Label>
              <Input
                id="dueDate"
                type="date"
                {...register("dueDate", { setValueAs: (v) => v || null })}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>分類</Label>
            <Select
              defaultValue={watch("categoryId") ? String(watch("categoryId")) : "none"}
              onValueChange={(v) => setValue("categoryId", v === "none" ? null : Number(v))}
            >
              <SelectTrigger aria-label="分類">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">不分類</SelectItem>
                {(categories ?? []).map((category) => (
                  <SelectItem key={category.id} value={String(category.id)}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isEdit ? "儲存" : "建立"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
