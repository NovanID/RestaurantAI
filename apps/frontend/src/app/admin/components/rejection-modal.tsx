'use client';

import { useEffect, useRef, useState, FormEvent } from 'react';

interface RejectionModalProps {
  isOpen: boolean;
  reservationCode: string;
  customerName?: string;
  isLoading?: boolean;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

export function RejectionModal({
  isOpen,
  reservationCode,
  customerName,
  isLoading = false,
  onConfirm,
  onCancel,
}: RejectionModalProps) {
  const [reason, setReason] = useState('');
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      setReason('');
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

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onConfirm(reason.trim());
  };

  if (!isOpen) return null;

  return (
    <dialog
      ref={dialogRef}
      className="backdrop:bg-black/70 backdrop:backdrop-blur-xs bg-[var(--panel)] border border-[var(--line-strong)] rounded-lg max-w-md w-full p-6 shadow-2xl text-left m-auto text-[var(--sand)]"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="border-b border-[var(--line)] pb-3 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold tracking-wide text-[var(--sand)]">
              Tolak Reservasi Meja
            </h3>
            <p className="text-[11px] font-mono text-[var(--brass)] mt-0.5">
              {reservationCode} {customerName ? `— ${customerName}` : ''}
            </p>
          </div>
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

        <div>
          <label className="block text-[11px] font-mono uppercase text-[var(--muted)] mb-1">
            Alasan Penolakan (opsional)
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Contoh: Meja penuh di jam tersebut, kendala operasional dapur..."
            rows={3}
            className="w-full field-input text-xs resize-none"
            autoFocus
          />
        </div>

        <div className="flex gap-2 justify-end pt-2 border-t border-[var(--line)]">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="btn-outline text-xs"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="btn-chili text-xs"
          >
            {isLoading ? 'Menolak...' : 'Tolak Reservasi'}
          </button>
        </div>
      </form>
    </dialog>
  );
}
