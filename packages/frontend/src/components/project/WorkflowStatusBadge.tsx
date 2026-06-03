"use client";

import { CheckCircle2, Clock3, RefreshCw, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WorkflowStatus } from "@/utils/projectWorkflow";

export function WorkflowStatusBadge({ status }: { status: WorkflowStatus }) {
  const config = {
    pending: { label: "待处理", className: "badge-outline text-muted-foreground", icon: Clock3 },
    active: { label: "生成中", className: "badge-warning", icon: RefreshCw },
    review: { label: "待确认", className: "badge-info", icon: CheckCircle2 },
    done: { label: "完成", className: "badge-success", icon: CheckCircle2 },
    error: { label: "需处理", className: "badge-error", icon: TriangleAlert },
  }[status];
  const Icon = config.icon;

  return (
    <span className={cn("badge badge-sm gap-1", config.className)}>
      <Icon className={cn("h-3 w-3", status === "active" && "animate-spin")} />
      {config.label}
    </span>
  );
}
