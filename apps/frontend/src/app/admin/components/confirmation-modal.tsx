'use client';

import { useEffect, useRef } from 'react';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmationModal({
  isOpen,
  title,
  message,
  confirmLabel = 'Lanjutkan',
  cancelLabel = 'Batal',
  variant = 'danger',
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmationModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      triggerRef.current = document.activeElement as HTMLElement | null;
      if (!dialog.open) {
        dialog.showModal();
      }
    } else if (dialog.open) {
      dialog.close();
      triggerRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleCancel = (e: Event) => {
      e.preventDefault();
      if (!isLoading) onCancel();
    };

    dialog.addEventListener('cancel', handleCancel);
    return () => dialog.removeEventListener('cancel', handleCancel);
  }, [isLoading, onCancel]);

  if (!isOpen) return null;

  return (
    <dialog
      ref={dialogRef}
      className="backdrop:bg-black/70 backdrop:backdrop-blur-xs bg-[var(--panel)] border border-[var(--line-strong)] rounded-lg max-w-md w-full p-6 shadow-2xl text-left m-auto text-[var(--sand)]"
    >
      <div className="space-y-4">
        <div className="border-b border-[var(--line)] pb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold tracking-wide text-[var(--sand)]">
            {title}
          </h3>
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="text-[var(--muted)] hover:text-[var(--sand)] text-xs font-mono"
            aria-label="Tutup"
          >
            ✕
          </button>
        </div>

        <p className="text-xs text-[var(--sand-muted)] leading-relaxed">
          {message}
        </p>

        <div className="flex gap-2 justify-end pt-2 border-t border-[var(--line)]">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="btn-outline text-xs"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={variant === 'danger' ? 'btn-chili text-xs' : 'btn-brass text-xs'}
          >
            {isLoading ? 'Memproses...' : confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
