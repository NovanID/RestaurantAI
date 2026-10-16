"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { getReservationStatusMeta } from "../components/status-badge";
import { RejectionModal } from "../components/rejection-modal";

interface Reservation {
  id: string;
  code: string;
  startAt: string;
  partySize: number;
  status: string;
  notes?: string;
  rejectionReason?: string;
  customer: { name: string; phone: string };
  outlet: { name: string };
  table: { tableNumber: string };
}

const STATUS_FILTERS = [
  { value: "", label: "Semua Status" },
  { value: "pending", label: "Pending (Menunggu)" },
  { value: "confirmed", label: "Terkonfirmasi" },
  { value: "rejected", label: "Ditolak" },
  { value: "cancelled", label: "Dibatalkan" },
  { value: "completed", label: "Selesai" },
];

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

export default function ReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectingReservation, setRejectingReservation] = useState<Reservation | null>(null);

  const request = useCallback(async (path: string, options?: RequestInit) => {
    const token = window.localStorage.getItem("accessToken");
    const response = await fetch(`${apiBaseUrl}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(options?.body ? { "Content-Type": "application/json" } : {}),
        ...options?.headers,
      },
    });
    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new Error(errorBody?.error?.message || "Permintaan gagal diproses.");
    }
    return response.json();
  }, []);

  const loadReservations = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (search.trim()) params.set("query", search.trim());

      const res = await request(`/reservations/admin?${params.toString()}`);
      // Unpack envelope: response interceptor wraps data in { data: [...] }
      const list: Reservation[] = Array.isArray(res)
        ? res
        : Array.isArray(res?.data)
          ? res.data
          : [];
      setReservations(list);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Daftar reservasi tidak dapat dimuat.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [request, search, status]);

  useEffect(() => {
    void loadReservations();
  }, [loadReservations]);

  async function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await loadReservations();
  }

  async function executeStatusChange(id: string, action: "approve" | "reject", reason?: string) {
    setProcessingId(id);
    setError("");
    try {
      await request(`/reservations/admin/${id}/${action}`, {
        method: "POST",
        body: action === "reject" ? JSON.stringify({ reason: reason || "" }) : undefined,
      });
      await loadReservations();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Status reservasi gagal diperbarui.";
      setError(msg);
    } finally {
      setProcessingId(null);
      setRejectingReservation(null);
    }
  }

  function handleApprove(id: string) {
    void executeStatusChange(id, "approve");
  }

  function openRejectModal(reservation: Reservation) {
    setRejectingReservation(reservation);
  }

  return (
    <div className="space-y-6 antialiased">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--line)] pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[var(--sand)]">
            Manajemen Reservasi Meja
          </h1>
          <p className="text-xs text-[var(--sand-muted)] mt-1">
            Validasi kedatangan tamu, konfirmasi slot, dan penolakan meja secara terpusat.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void loadReservations()}
            disabled={loading}
            className="btn-outline text-xs"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            <span>Segarkan</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[var(--panel)] border border-[var(--line)] rounded-lg p-4">
        <form className="flex flex-col md:flex-row gap-3" onSubmit={submitSearch}>
          <div className="flex-1 relative">
            <input
              type="text"
              aria-label="Cari nama atau kode reservasi"
              className="w-full field-input text-xs font-mono pl-9"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari kode booking (mis. RSV-123) atau nama tamu..."
            />
          </div>
          <div className="w-full md:w-56">
            <select
              aria-label="Filter status reservasi"
              className="w-full field-input text-xs"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              {STATUS_FILTERS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
          <button className="btn-brass text-xs px-5" type="submit">
            Terapkan Filter
          </button>
        </form>
      </div>

      {/* Error alert */}
      {error && (
        <div className="bg-[var(--chili-bg)] border border-[var(--chili-border)] text-[var(--chili-light)] px-4 py-3 rounded text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError("")} className="underline text-[11px] ml-4">
            Tutup
          </button>
        </div>
      )}

      {/* Tabular Reservations Ledger */}
      <div className="bg-[var(--panel)] border border-[var(--line)] rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[var(--line)] bg-[var(--panel-elevated)] text-[var(--sand-muted)] uppercase font-mono text-[11px]">
              <tr>
                <th className="py-3 px-4">Kode Booking</th>
                <th className="py-3 px-4">Tamu & Kontak</th>
                <th className="py-3 px-4">Jadwal Kedatangan</th>
                <th className="py-3 px-4">Outlet & Meja</th>
                <th className="py-3 px-4">Kapasitas</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Aksi Petugas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line)]">
              {loading ? (
                <tr>
                  <td className="p-8 text-center text-[var(--muted)]" colSpan={7}>
                    <div className="inline-flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-[var(--brass)] border-t-transparent rounded-full animate-spin" />
                      <span className="font-mono">Memuat buku reservasi...</span>
                    </div>
                  </td>
                </tr>
              ) : reservations.length === 0 ? (
                <tr>
                  <td className="p-8 text-center text-[var(--muted)]" colSpan={7}>
                    Tidak ada catatan reservasi yang cocok dengan kriteria pencarian.
                  </td>
                </tr>
              ) : (
                reservations.map((reservation) => (
                  <tr
                    className="hover:bg-[var(--panel-elevated)] transition-colors"
                    key={reservation.id}
                  >
                    {/* Code */}
                    <td className="py-3 px-4">
                      <span className="font-mono font-semibold text-[var(--brass)] text-xs">
                        {reservation.code}
                      </span>
                      {reservation.notes && (
                        <div
                          className="text-[10px] text-[var(--muted)] mt-0.5 line-clamp-1 italic"
                          title={reservation.notes}
                        >
                          "{reservation.notes}"
                        </div>
                      )}
                    </td>

                    {/* Customer */}
                    <td className="py-3 px-4">
                      <div className="font-medium text-[var(--sand)]">
                        {reservation.customer?.name}
                      </div>
                      <div className="font-mono text-[11px] text-[var(--muted)]">
                        {reservation.customer?.phone}
                      </div>
                    </td>

                    {/* Schedule */}
                    <td className="py-3 px-4 font-mono text-[var(--sand-muted)]">
                      {new Date(reservation.startAt).toLocaleString("id-ID", {
                        weekday: "short",
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>

                    {/* Outlet & Table */}
                    <td className="py-3 px-4">
                      <div className="text-[var(--sand)]">{reservation.outlet?.name}</div>
                      <div className="font-mono text-[11px] text-[var(--muted)]">
                        Meja:{" "}
                        <span className="text-[var(--sand-muted)] font-semibold">
                          {reservation.table?.tableNumber}
                        </span>
                      </div>
                    </td>

                    {/* Party Size */}
                    <td className="py-3 px-4 font-mono text-[var(--sand)]">
                      {reservation.partySize} orang
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4">
                      {(() => {
                        const meta = getReservationStatusMeta(reservation.status);
                        return (
                          <span className={`badge-status ${meta.badgeClass}`}>{meta.label}</span>
                        );
                      })()}
                      {reservation.rejectionReason && (
                        <div
                          className="text-[10px] text-[var(--chili-light)] mt-1 line-clamp-1"
                          title={reservation.rejectionReason}
                        >
                          Alasan: {reservation.rejectionReason}
                        </div>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      {reservation.status === "pending" ? (
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          <button
                            disabled={processingId === reservation.id}
                            className="btn-pandan disabled:opacity-50"
                            onClick={() => handleApprove(reservation.id)}
                            type="button"
                          >
                            Setujui
                          </button>
                          <button
                            disabled={processingId === reservation.id}
                            className="btn-chili disabled:opacity-50"
                            onClick={() => openRejectModal(reservation)}
                            type="button"
                          >
                            Tolak
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] font-mono text-[var(--muted)]">
                          — Selesai —
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        <div className="p-3 border-t border-[var(--line)] bg-[var(--panel-elevated)] flex items-center justify-between text-[11px] text-[var(--muted)] font-mono">
          <span>Total Baris: {reservations.length} data</span>
          <span>Data sesuai filter aktif</span>
        </div>
      </div>

      <RejectionModal
        isOpen={Boolean(rejectingReservation)}
        reservationCode={rejectingReservation?.code || ""}
        customerName={rejectingReservation?.customer?.name}
        isLoading={Boolean(processingId)}
        onConfirm={(reason) => {
          if (rejectingReservation) {
            void executeStatusChange(rejectingReservation.id, "reject", reason);
          }
        }}
        onCancel={() => setRejectingReservation(null)}
      />
    </div>
  );
}
