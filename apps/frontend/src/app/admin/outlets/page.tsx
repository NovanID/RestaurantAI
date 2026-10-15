'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ConfirmationModal } from '../components/confirmation-modal';

interface Outlet {
  id: string;
  name: string;
  slug: string;
  address?: string;
  city?: string;
  phone?: string;
  email?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function OutletsPage() {
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [outletToDelete, setOutletToDelete] = useState<Outlet | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchOutlets = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
      const response = await fetch(`${API_URL}/admin/outlets`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const list = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
        setOutlets(list);
      } else {
        throw new Error('Gagal mengambil data cabang.');
      }
    } catch (err) {
      console.error('Failed to fetch outlets:', err);
      setError('Data cabang outlet tidak dapat dimuat.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchOutlets();
  }, [fetchOutlets]);

  const handleDelete = async () => {
    if (!outletToDelete) return;
    setIsDeleting(true);

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
      const response = await fetch(`${API_URL}/admin/outlets/${outletToDelete.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (response.ok) {
        setOutletToDelete(null);
        void fetchOutlets();
      } else {
        alert('Gagal menghapus cabang');
      }
    } catch (err) {
      console.error('Delete error:', err);
      alert('Terjadi kesalahan saat menghapus cabang');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 antialiased">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--line)] pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[var(--sand)]">
            Cabang Restoran (Outlets)
          </h1>
          <p className="text-xs text-[var(--sand-muted)] mt-1">
            Pengelolaan lokasi operasional, nomor kontak, jadwal buka, dan tata letak meja.
          </p>
        </div>
        <Link 
          href="/admin/outlets/new"
          className="btn-brass text-xs"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>Tambah Cabang Baru</span>
        </Link>
      </div>

      {error && (
        <div className="bg-[var(--chili-bg)] border border-[var(--chili-border)] text-[var(--chili-light)] px-4 py-3 rounded text-xs">
          {error}
        </div>
      )}

      {/* Outlet Cards Grid */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-3">
          <div className="w-8 h-8 border-2 border-[var(--brass)] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-mono text-[var(--muted)]">Memuat data cabang outlet...</p>
        </div>
      ) : outlets.length === 0 ? (
        <div className="bg-[var(--panel)] border border-[var(--line)] rounded-lg p-12 text-center">
          <div className="w-12 h-12 rounded border border-[var(--line)] bg-[var(--panel-input)] flex items-center justify-center mx-auto mb-3 text-[var(--muted)]">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-[var(--sand)]">Belum ada cabang terdaftar</h3>
          <p className="text-xs text-[var(--sand-muted)] mt-1 mb-5">
            Tambahkan cabang pertama Anda untuk mulai mengatur operasional dan meja makan.
          </p>
          <Link href="/admin/outlets/new" className="btn-brass text-xs">
            + Tambah Cabang Sekarang
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {outlets.map((outlet) => (
            <div 
              key={outlet.id}
              className="bg-[var(--panel)] border border-[var(--line)] rounded-lg overflow-hidden flex flex-col hover:border-[var(--line-strong)] transition-all"
            >
              {/* Header */}
              <div className="p-5 flex-1">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <h3 className="font-semibold text-base text-[var(--sand)] tracking-tight">
                      {outlet.name}
                    </h3>
                    <p className="text-xs font-mono text-[var(--brass)] mt-0.5">
                      slug: @{outlet.slug}
                    </p>
                  </div>
                  <span className={`badge-status ${outlet.isActive ? 'active' : 'inactive'}`}>
                    {outlet.isActive ? 'Aktif' : 'Nonaktif'}
                  </span>
                </div>

                {outlet.address && (
                  <p className="text-xs text-[var(--sand-muted)] flex items-start gap-2 mb-3">
                    <svg className="w-3.5 h-3.5 mt-0.5 text-[var(--muted)] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>{outlet.address}{outlet.city ? `, ${outlet.city}` : ''}</span>
                  </p>
                )}

                <div className="space-y-1 text-xs text-[var(--muted)] font-mono border-t border-[var(--line)] pt-3">
                  {outlet.phone && (
                    <div className="flex items-center gap-2">
                      <svg className="w-3.5 h-3.5 text-[var(--muted)] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      <span>{outlet.phone}</span>
                    </div>
                  )}
                  {outlet.email && (
                    <div className="flex items-center gap-2">
                      <svg className="w-3.5 h-3.5 text-[var(--muted)] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <span>{outlet.email}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Footer */}
              <div className="px-5 py-3 bg-[var(--panel-elevated)] border-t border-[var(--line)] flex items-center justify-between text-xs">
                <Link 
                  href={`/admin/outlets/${outlet.id}/settings`}
                  className="font-mono text-[var(--brass)] hover:underline inline-flex items-center gap-1"
                >
                  <span>Konfigurasi Meja & Jam</span>
                  <span>→</span>
                </Link>
                <button
                  onClick={() => setOutletToDelete(outlet)}
                  className="font-mono text-[var(--chili-light)] hover:underline"
                >
                  Hapus
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmationModal
        isOpen={Boolean(outletToDelete)}
        title="Nonaktifkan Cabang"
        message={`Cabang ${outletToDelete?.name || ''} akan dinonaktifkan dan tidak lagi tampil untuk tamu. Data operasional tetap tersimpan.`}
        confirmLabel="Nonaktifkan Cabang"
        isLoading={isDeleting}
        onConfirm={() => void handleDelete()}
        onCancel={() => setOutletToDelete(null)}
      />
    </div>
  );
}
