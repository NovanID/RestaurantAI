'use client';

import { useState, useEffect, useCallback } from 'react';
import { ConfirmationModal } from '../components/confirmation-modal';

interface Category {
  id: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSortOrder, setNewSortOrder] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
      const response = await fetch(`${API_URL}/admin/menu-categories`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const list = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
        setCategories(list);
      } else {
        throw new Error('Gagal memuat daftar kategori.');
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err);
      setError('Daftar kategori gagal dimuat dari server.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    if (!showAddModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowAddModal(false);
        setEditingCategory(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAddModal]);

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setNewName(category.name);
    setNewSortOrder(category.sortOrder);
    setShowAddModal(true);
  };

  const handleDelete = async () => {
    if (!categoryToDelete) return;
    setIsDeleting(true);

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
      const response = await fetch(`${API_URL}/admin/menu-categories/${categoryToDelete.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (response.ok) {
        setCategoryToDelete(null);
        void fetchCategories();
      } else {
        alert('Gagal menghapus kategori');
      }
    } catch (err) {
      console.error('Delete error:', err);
      alert('Terjadi kesalahan saat menghapus kategori');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleStatus = async (categoryId: string, currentStatus: boolean) => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
      const response = await fetch(`${API_URL}/admin/menu-categories/${categoryId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      if (response.ok) {
        void fetchCategories();
      }
    } catch (err) {
      console.error('Toggle status error:', err);
    }
  };

  const handleSave = async () => {
    if (!newName.trim()) return;

    setIsSaving(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
      const endpoint = editingCategory 
        ? `${API_URL}/admin/menu-categories/${editingCategory.id}`
        : `${API_URL}/admin/menu-categories`;
      const method = editingCategory ? 'PATCH' : 'POST';

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify({
          name: newName.trim(),
          sortOrder: Number(newSortOrder) || 0,
        }),
      });

      if (response.ok) {
        void fetchCategories();
        setShowAddModal(false);
        setEditingCategory(null);
        setNewName('');
        setNewSortOrder(0);
      } else {
        const data = await response.json().catch(() => ({}));
        alert(data.error?.message || 'Gagal menyimpan kategori');
      }
    } catch (err) {
      console.error('Save error:', err);
      alert('Terjadi kesalahan saat menyimpan kategori');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 antialiased">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--line)] pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[var(--sand)]">
            Kategori Menu Masakan
          </h1>
          <p className="text-xs text-[var(--sand-muted)] mt-1">
            Pengelompokan hidangan (Lauk Utama, Gulai, Sayur, Minuman) dan nomor urut tampil.
          </p>
        </div>
        <button 
          onClick={() => {
            setEditingCategory(null);
            setNewName('');
            setNewSortOrder(categories.length + 1);
            setShowAddModal(true);
          }}
          className="btn-brass text-xs"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>Tambah Kategori</span>
        </button>
      </div>

      {error && (
        <div className="bg-[var(--chili-bg)] border border-[var(--chili-border)] text-[var(--chili-light)] px-4 py-3 rounded text-xs">
          {error}
        </div>
      )}

      {/* Tabular Categories Ledger */}
      <div className="bg-[var(--panel)] border border-[var(--line)] rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[var(--line)] bg-[var(--panel-elevated)] text-[var(--sand-muted)] uppercase font-mono text-[11px]">
              <tr>
                <th className="py-3 px-4">Urutan</th>
                <th className="py-3 px-4">Nama Kategori</th>
                <th className="py-3 px-4">Tanggal Pembuatan</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line)]">
              {isLoading ? (
                <tr>
                  <td className="p-8 text-center text-[var(--muted)]" colSpan={5}>
                    <div className="inline-flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-[var(--brass)] border-t-transparent rounded-full animate-spin" />
                      <span className="font-mono">Memuat kelompok menu...</span>
                    </div>
                  </td>
                </tr>
              ) : categories.length === 0 ? (
                <tr>
                  <td className="p-8 text-center text-[var(--muted)]" colSpan={5}>
                    Belum ada kategori yang terdaftar di database.
                  </td>
                </tr>
              ) : (
                categories.map((category) => (
                  <tr key={category.id} className="hover:bg-[var(--panel-elevated)] transition-colors">
                    {/* Sort Order */}
                    <td className="py-3 px-4 font-mono font-semibold text-[var(--brass)]">
                      #{category.sortOrder}
                    </td>

                    {/* Name */}
                    <td className="py-3 px-4 font-medium text-[var(--sand)] text-sm">
                      {category.name}
                    </td>

                    {/* Created Date */}
                    <td className="py-3 px-4 font-mono text-[var(--muted)]">
                      {new Date(category.createdAt).toLocaleDateString('id-ID', {
                        year: 'numeric',
                        month: 'short',
                        day: '2-digit',
                      })}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4">
                      <button
                        onClick={() => void handleToggleStatus(category.id, category.isActive)}
                        className={`badge-status cursor-pointer ${category.isActive ? 'active' : 'inactive'}`}
                        title="Klik untuk mengubah status aktif"
                      >
                        {category.isActive ? 'Aktif' : 'Nonaktif'}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button 
                          onClick={() => handleEdit(category)}
                          className="text-xs font-mono text-[var(--brass)] hover:underline"
                        >
                          Ubah
                        </button>
                        <span className="text-[var(--line-strong)]">|</span>
                        <button 
                          onClick={() => setCategoryToDelete(category)}
                          className="text-xs font-mono text-[var(--chili-light)] hover:underline"
                        >
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="p-3 border-t border-[var(--line)] bg-[var(--panel-elevated)] flex items-center justify-between text-[11px] text-[var(--muted)] font-mono">
          <span>Total: {categories.length} kelompok menu</span>
          <span>Struktur Taksonomi Masakan Minang</span>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-[var(--panel)] border border-[var(--line-strong)] rounded-lg max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
              <h2 className="text-sm font-semibold text-[var(--sand)] uppercase tracking-wider">
                {editingCategory ? 'Ubah Rincian Kategori' : 'Buat Kategori Baru'}
              </h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingCategory(null);
                }}
                className="text-[var(--muted)] hover:text-[var(--sand)] text-lg leading-none"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-mono uppercase text-[var(--muted)] mb-1">
                  Nama Kategori Hidangan *
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="mis. Lauk Utama, Gulai, Minuman Tradisional"
                  className="w-full field-input text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase text-[var(--muted)] mb-1">
                  Nomor Urut Tampil (Sort Order)
                </label>
                <input
                  type="number"
                  value={newSortOrder}
                  onChange={(e) => setNewSortOrder(Number(e.target.value))}
                  min="0"
                  className="w-full field-input font-mono text-xs"
                />
                <p className="text-[11px] text-[var(--muted)] mt-1">
                  Angka lebih kecil tampil lebih dulu di daftar menu.
                </p>
              </div>

              <div className="flex gap-2 pt-4 border-t border-[var(--line)] justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingCategory(null);
                    setNewName('');
                    setNewSortOrder(0);
                  }}
                  className="btn-outline text-xs"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving || !newName.trim()}
                  className="btn-brass text-xs"
                >
                  {isSaving ? 'Menyimpan...' : (editingCategory ? 'Simpan Perubahan' : 'Buat Kategori')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={Boolean(categoryToDelete)}
        title="Hapus Kategori Menu"
        message={`Kategori "${categoryToDelete?.name || ''}" akan dihapus. Pastikan hidangan di bawah kategori ini sudah dipindahkan atau dinonaktifkan.`}
        confirmLabel="Hapus Kategori"
        isLoading={isDeleting}
        onConfirm={() => void handleDelete()}
        onCancel={() => setCategoryToDelete(null)}
      />
    </div>
  );
}
