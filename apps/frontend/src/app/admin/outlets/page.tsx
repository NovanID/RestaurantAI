'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

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
  const [showModal, setShowModal] = useState(false);
  const [editingOutlet, setEditingOutlet] = useState<Outlet | null>(null);

  useEffect(() => {
    fetchOutlets();
  }, []);

  const fetchOutlets = async () => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
      const response = await fetch(`${API_URL}/admin/outlets`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setOutlets(data.data || data);
      }
    } catch (error) {
      console.error('Failed to fetch outlets:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (outlet: Outlet) => {
    setEditingOutlet(outlet);
    setShowModal(true);
  };

  const handleDelete = async (outletId: string) => {
    if (!confirm('Yakin ingin menghapus outlet ini?')) return;

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
      
      const response = await fetch(`${API_URL}/admin/outlets/${outletId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (response.ok) {
        fetchOutlets();
      } else {
        alert('Gagal menghapus outlet');
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Terjadi kesalahan saat menghapus');
    }
  };

  const handleSave = async (formData: FormData) => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
      const outletId = editingOutlet?.id;
      
      const url = outletId 
        ? `${API_URL}/admin/outlets/${outletId}`
        : `${API_URL}/admin/outlets`;
      
      const method = outletId ? 'PATCH' : 'POST';

      const token = localStorage.getItem('accessToken');
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(Object.fromEntries(formData)),
      });

      if (response.ok) {
        fetchOutlets();
        setShowModal(false);
        setEditingOutlet(null);
      } else {
        const data = await response.json();
        alert(data.error?.message || 'Gagal menyimpan outlet');
      }
    } catch (error) {
      console.error('Save error:', error);
      alert('Terjadi kesalahan saat menyimpan');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-1">Outlets</h1>
          <p className="text-gray-400 text-sm">Kelola cabang restoran dan pengaturan operasional</p>
        </div>
        <Link 
          href="/admin/outlets/new"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
        >
          <span>+</span>
          <span>Tambah Outlet</span>
        </Link>
      </div>

      {/* Outlet List */}
      {isLoading ? (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : outlets.length === 0 ? (
        <div className="bg-slate-800/50 backdrop-blur rounded-xl p-12 border border-slate-700 text-center">
          <div className="text-6xl mb-4">🏢</div>
          <h3 className="text-lg font-semibold mb-2">Belum ada outlet</h3>
          <p className="text-gray-400 mb-6">Tambahkan outlet pertama Anda untuk mulai mengatur operasional restoran</p>
          <Link 
            href="/admin/outlets/new"
            className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
          >
            <span>+</span>
            <span>Buat Outlet Baru</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {outlets.map((outlet) => (
            <div 
              key={outlet.id}
              className="bg-slate-800/50 backdrop-blur rounded-xl border border-slate-700 overflow-hidden hover:border-blue-500 transition-all group"
            >
              <div className={`h-2 ${outlet.isActive ? 'bg-green-500' : 'bg-gray-500'}`} />
              
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold mb-1">{outlet.name}</h3>
                    <p className="text-gray-400 text-sm">@{outlet.slug}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    outlet.isActive 
                      ? 'bg-green-500/10 text-green-400' 
                      : 'bg-gray-500/10 text-gray-400'
                  }`}>
                    {outlet.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                {outlet.address && (
                  <p className="text-gray-300 text-sm mb-2 flex items-start space-x-2">
                    <svg className="w-4 h-4 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>{outlet.address}, {outlet.city}</span>
                  </p>
                )}

                {(outlet.phone || outlet.email) && (
                  <div className="space-y-1 text-sm text-gray-400">
                    {outlet.phone && (
                      <p className="flex items-center space-x-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        <span>{outlet.phone}</span>
                      </p>
                    )}
                    {outlet.email && (
                      <p className="flex items-center space-x-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <span>{outlet.email}</span>
                      </p>
                    )}
                  </div>
                )}

                <div className="mt-6 pt-4 border-t border-slate-700 flex items-center justify-between">
                  <button 
                    onClick={() => handleEdit(outlet)}
                    className="text-sm text-blue-400 hover:text-blue-300 font-medium"
                  >
                    Edit Settings →
                  </button>
                  <button 
                    onClick={() => handleDelete(outlet.id)}
                    className="text-sm text-red-400 hover:text-red-300 font-medium"
                  >
                    Delete
                  </button>
                </div>
              </div>

              <div className="px-6 py-3 bg-slate-900/50 border-t border-slate-700">
                <Link 
                  href={`/admin/outlets/${outlet.id}/settings`}
                  className="block text-xs text-gray-500 hover:text-gray-400"
                >
                  Configure hours, areas & tables
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal - Could be implemented as separate page */}
    </div>
  );
}
