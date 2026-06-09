import { zodResolver } from "@hookform/resolvers/zod";
import {
  createScheduleBlockSchema,
  type CreateScheduleBlockInput,
  type ScheduleBlockResponse,
} from "@ftm/shared";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ColorSwatchPicker } from "@/components/ui/color-swatch-picker";
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
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api-client";
import { useCreateScheduleBlock, useUpdateScheduleBlock } from "./hooks";

export function ScheduleBlockDialog({
  open,
  onOpenChange,
  block,
  defaultDate,
  onDelete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  block?: ScheduleBlockResponse | null;
  defaultDate: string;
  onDelete?: () => void;
}) {
  const isEdit = !!block;
  const createMutation = useCreateScheduleBlock();
  const updateMutation = useUpdateScheduleBlock();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CreateScheduleBlockInput>({
    resolver: zodResolver(createScheduleBlockSchema),
    defaultValues: {
      title: block?.title ?? "",
      location: block?.location ?? "",
      startDate: block?.startDate ?? defaultDate,
      endDate: block?.endDate ?? defaultDate,
      color: block?.color ?? "#0EA5E9",
      note: block?.note ?? "",
    },
  });

  const onSubmit = async (values: CreateScheduleBlockInput) => {
    const input: CreateScheduleBlockInput = {
      ...values,
      location: values.location || null,
      note: values.note || null,
    };

    try {
      if (isEdit && block) {
        await updateMutation.mutateAsync({ id: block.id, input });
      } else {
        await createMutation.mutateAsync(input);
      }
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "儲存行程失敗");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "編輯行程" : "新增行程"}</DialogTitle>
          <DialogDescription>設定一段全天或跨天的位置狀態。</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="scheduleTitle">標題</Label>
            <Input id="scheduleTitle" {...register("title")} />
            {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="scheduleLocation">地點</Label>
            <Input id="scheduleLocation" {...register("location")} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="scheduleStartDate">開始日期</Label>
              <Input id="scheduleStartDate" type="date" {...register("startDate")} />
              {errors.startDate && <p className="text-sm text-destructive">{errors.startDate.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="scheduleEndDate">結束日期</Label>
              <Input id="scheduleEndDate" type="date" {...register("endDate")} />
              {errors.endDate && <p className="text-sm text-destructive">{errors.endDate.message}</p>}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>顏色</Label>
            <Controller
              control={control}
              name="color"
              render={({ field }) => (
                <ColorSwatchPicker value={field.value} onChange={field.onChange} />
              )}
            />
            {errors.color && <p className="text-sm text-destructive">{errors.color.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="scheduleNote">備註</Label>
            <Textarea id="scheduleNote" {...register("note")} />
          </div>
          <DialogFooter className="gap-2 sm:justify-between">
            {isEdit && onDelete ? (
              <Button
                type="button"
                variant="destructive"
                onClick={() => {
                  onOpenChange(false);
                  onDelete();
                }}
              >
                刪除行程
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                取消
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isEdit ? "儲存行程" : "新增行程"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
