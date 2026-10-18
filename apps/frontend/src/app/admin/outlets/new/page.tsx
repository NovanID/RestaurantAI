'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface FormData {
  name: string;
  slug: string;
  address: string;
  city: string;
  phone: string;
  whatsapp: string;
  email: string;
}

export default function CreateOutletPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    slug: '',
    address: '',
    city: '',
    phone: '',
    whatsapp: '',
    email: '',
  });

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
      const token = localStorage.getItem('accessToken');
      
      const response = await fetch(`${API_URL}/admin/outlets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        router.push('/admin/outlets');
      } else {
        const data = await response.json().catch(() => ({}));
        setError(data.error?.message || 'Gagal menambahkan cabang outlet.');
      }
    } catch (err) {
      console.error('Create error:', err);
      setError('Terjadi kendala jaringan saat menghubungi server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 antialiased">
      <div>
        <Link 
          href="/admin/outlets" 
          className="text-xs font-mono text-[var(--muted)] hover:text-[var(--sand)] inline-flex items-center gap-1.5 mb-3"
        >
          <span>←</span>
          <span>Kembali ke Daftar Cabang</span>
        </Link>
        <h1 className="text-xl font-bold tracking-tight text-[var(--sand)]">
          Tambah Cabang Restoran Baru
        </h1>
        <p className="text-xs text-[var(--sand-muted)] mt-1">
          Daftarkan lokasi fisik rumah makan Minang untuk operasional meja dan reservasi.
        </p>
      </div>

      {error && (
        <div className="bg-[var(--chili-bg)] border border-[var(--chili-border)] text-[var(--chili-light)] px-4 py-3 rounded text-xs">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-[var(--panel)] border border-[var(--line)] rounded-lg p-6 space-y-5">
        <div>
          <label className="block text-[11px] font-mono uppercase text-[var(--muted)] mb-1">
            Nama Cabang Restoran *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            placeholder="mis. Rumah Makan Minang - Cabang Tebet"
            required
            className="w-full field-input text-xs"
          />
        </div>

        <div>
          <label className="block text-[11px] font-mono uppercase text-[var(--muted)] mb-1">
            Slug URL Identitas *
          </label>
          <input
            type="text"
            value={formData.slug}
            onChange={(e) => handleInputChange('slug', e.target.value.toLowerCase().replace(/\s+/g, '-'))}
            placeholder="mis. tebet"
            required
            className="w-full field-input font-mono text-xs"
          />
          <p className="text-[11px] text-[var(--muted)] mt-1 font-mono">
            Hanya huruf kecil, angka, dan tanda hubung (-).
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-mono uppercase text-[var(--muted)] mb-1">
              Alamat Lengkap
            </label>
            <textarea
              value={formData.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              placeholder="Jl. Tebet Barat Dalam Raya No. 12..."
              rows={2}
              className="w-full field-input text-xs resize-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono uppercase text-[var(--muted)] mb-1">
              Kota / Wilayah
            </label>
            <input
              type="text"
              value={formData.city}
              onChange={(e) => handleInputChange('city', e.target.value)}
              placeholder="mis. Jakarta Selatan"
              className="w-full field-input text-xs"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-mono uppercase text-[var(--muted)] mb-1">
              Nomor Telepon
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              placeholder="021-8291122"
              className="w-full field-input font-mono text-xs"
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono uppercase text-[var(--muted)] mb-1">
              WhatsApp CS Outlet
            </label>
            <input
              type="tel"
              value={formData.whatsapp}
              onChange={(e) => handleInputChange('whatsapp', e.target.value)}
              placeholder="081299991122"
              className="w-full field-input font-mono text-xs"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-mono uppercase text-[var(--muted)] mb-1">
            Email Cabang
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            placeholder="tebet@minangasli.com"
            className="w-full field-input font-mono text-xs"
          />
        </div>

        <div className="flex gap-3 pt-4 border-t border-[var(--line)] justify-end">
          <Link
            href="/admin/outlets"
            className="btn-outline text-xs"
          >
            Batal
          </Link>
          <button
            type="submit"
            disabled={loading || !formData.name.trim() || !formData.slug.trim()}
            className="btn-brass text-xs"
          >
            {loading ? 'Menyimpan...' : 'Daftarkan Cabang'}
          </button>
        </div>
      </form>
    </div>
  );
}
