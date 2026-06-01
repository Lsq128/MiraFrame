"use client";

import * as React from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Modal, ModalBody, ModalFooter } from "./modal";
import { Button } from "./button";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "default";
  isLoading?: boolean;
}

const variantStyles = {
  danger: { icon: "text-destructive", iconBg: "bg-destructive/10", buttonVariant: "destructive" as const },
  warning: { icon: "text-yellow-600 dark:text-yellow-500", iconBg: "bg-yellow-100 dark:bg-yellow-900/30", buttonVariant: "secondary" as const },
  default: { icon: "text-primary", iconBg: "bg-primary/10", buttonVariant: "default" as const },
};

export function ConfirmModal({ isOpen, onClose, onConfirm, title = "确认操作", message, confirmText = "确认", cancelText = "取消", variant = "default", isLoading = false }: ConfirmModalProps) {
  const styles = variantStyles[variant];
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalBody className="py-6">
        <div className="flex items-start gap-4">
          <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full", styles.iconBg)}>
            <AlertTriangle className={cn("h-5 w-5", styles.icon)} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-semibold leading-none tracking-tight">{title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{message}</p>
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="outline" onClick={onClose} disabled={isLoading}>{cancelText}</Button>
        <Button variant={styles.buttonVariant} onClick={onConfirm} disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {confirmText}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
