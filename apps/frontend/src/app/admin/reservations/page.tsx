"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type Reservation = {
  id: string;
  code: string;
  startAt: string;
  partySize: number;
  status: string;
  customer: { name: string; phone: string };
  outlet: { name: string };
  table: { tableNumber: string };
};

const statuses = ["", "pending", "confirmed", "rejected", "cancelled", "completed"];
const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

export default function ReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const request = useCallback(
    async (path: string, options?: RequestInit) => {
      const token = window.localStorage.getItem("accessToken");
      const response = await fetch(`${apiBaseUrl}${path}`, {
        ...options,
        headers: { Authorization: `Bearer ${token}`, ...options?.headers },
      });
      if (!response.ok) throw new Error("Permintaan reservasi gagal.");
      return response.json();
    },
    [],
  );

  const loadReservations = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (search.trim()) params.set("query", search.trim());
      setReservations(await request(`/reservations/admin?${params}`));
    } catch {
      setError("Daftar reservasi tidak dapat dimuat. Pastikan Anda sudah login.");
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

  async function changeStatus(id: string, action: "approve" | "reject") {
    try {
      await request(`/reservations/admin/${id}/${action}`, { method: "POST" });
      await loadReservations();
    } catch {
      setError("Status reservasi tidak dapat diperbarui.");
    }
  }

  return (
    <main className="min-h-screen bg-zinc-50 p-6 text-zinc-900">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-2xl font-semibold">Reservasi</h1>
        <form className="mt-6 flex flex-wrap gap-3" onSubmit={submitSearch}>
          <input
            aria-label="Cari nama atau kode"
            className="rounded border bg-white px-3 py-2"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari nama atau kode"
          />
          <select
            aria-label="Filter status"
            className="rounded border bg-white px-3 py-2"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            {statuses.map((value) => (
              <option key={value} value={value}>
                {value || "Semua status"}
              </option>
            ))}
          </select>
          <button className="rounded bg-zinc-900 px-4 py-2 text-white" type="submit">Cari</button>
        </form>
        {error && (
          <p className="mt-4 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}
        <div className="mt-6 overflow-x-auto rounded border bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-zinc-100 text-zinc-600">
              <tr>
                <th className="p-3">Kode</th>
                <th className="p-3">Tamu</th>
                <th className="p-3">Waktu</th>
                <th className="p-3">Meja</th>
                <th className="p-3">Status</th>
                <th className="p-3">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td className="p-3" colSpan={6}>Memuat…</td></tr>
              ) : reservations.length === 0 ? (
                <tr><td className="p-3" colSpan={6}>Tidak ada reservasi.</td></tr>
              ) : (
                reservations.map((reservation) => (
                  <tr className="border-b" key={reservation.id}>
                    <td className="p-3">{reservation.code}</td>
                    <td className="p-3">
                      {reservation.customer.name}<br />
                      <span className="text-zinc-500">{reservation.customer.phone} · {reservation.partySize} orang</span>
                    </td>
                    <td className="p-3">{new Date(reservation.startAt).toLocaleString("id-ID")}</td>
                    <td className="p-3">{reservation.outlet.name} · {reservation.table.tableNumber}</td>
                    <td className="p-3 capitalize">{reservation.status}</td>
                    <td className="p-3">
                      {reservation.status === "pending" && (
                        <div className="flex gap-2">
                          <button className="rounded bg-emerald-700 px-3 py-1 text-white" onClick={() => void changeStatus(reservation.id, "approve")} type="button">Approve</button>
                          <button className="rounded bg-red-700 px-3 py-1 text-white" onClick={() => void changeStatus(reservation.id, "reject")} type="button">Reject</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
