"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { ConfirmationModal } from "../components/confirmation-modal";

interface MenuItem {
  id: string;
  name: string;
  description?: string;
  priceIdr: number;
  categoryId?: string;
  imageUrl?: string;
  tags?: string[];
  isActive: boolean;
  isAvailable: boolean;
  category?: {
    id: string;
    name: string;
  };
}

interface Category {
  id: string;
  name: string;
}

export default function MenuItemsPage() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedAvailability, setSelectedAvailability] = useState("");

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<MenuItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    priceIdr: 0,
    categoryId: "",
    tags: "",
    isActive: true,
    isAvailable: true,
    imageUrl: "",
  });
  const [isUploading, setIsUploading] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";
      const token = localStorage.getItem("accessToken");
      const headers = { Authorization: `Bearer ${token}` };

      const [itemsRes, catsRes] = await Promise.all([
        fetch(`${API_URL}/admin/menu-items`, { headers }),
        fetch(`${API_URL}/admin/menu-categories`, { headers }),
      ]);

      if (itemsRes.ok && catsRes.ok) {
        const itemsJson = await itemsRes.json();
        const catsJson = await catsRes.json();

        const itemsList = Array.isArray(itemsJson)
          ? itemsJson
          : Array.isArray(itemsJson?.data)
            ? itemsJson.data
            : [];
        const catsList = Array.isArray(catsJson)
          ? catsJson
          : Array.isArray(catsJson?.data)
            ? catsJson.data
            : [];

        setItems(itemsList);
        setCategories(catsList);
      }
    } catch (error) {
      console.error("Failed to fetch menu data:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!showModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowModal(false);
        setEditingItem(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showModal]);

  const handleEdit = (item: MenuItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description || "",
      priceIdr: item.priceIdr,
      categoryId: item.categoryId || "",
      tags: item.tags?.join(", ") || "",
      isActive: item.isActive,
      isAvailable: item.isAvailable,
      imageUrl: item.imageUrl || "",
    });
    setShowModal(true);
  };

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const handleDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";
      const token = localStorage.getItem("accessToken");

      const response = await fetch(`${API_URL}/admin/menu-items/${itemToDelete.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        setItemToDelete(null);
        void fetchData();
      } else {
        alert("Gagal menghapus item menu.");
      }
    } catch (error) {
      console.error("Delete error:", error);
      alert("Terjadi kesalahan saat menghapus menu.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleStatus = async (itemId: string, currentStatus: boolean) => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";
      const token = localStorage.getItem("accessToken");

      const response = await fetch(`${API_URL}/admin/menu-items/${itemId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      if (response.ok) {
        void fetchData();
      }
    } catch (error) {
      console.error("Toggle status error:", error);
    }
  };

  const handleToggleAvailability = async (itemId: string, currentStatus: boolean) => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";
      const token = localStorage.getItem("accessToken");

      const response = await fetch(`${API_URL}/admin/menu-items/${itemId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isAvailable: !currentStatus }),
      });

      if (response.ok) {
        void fetchData();
      }
    } catch (error) {
      console.error("Toggle availability error:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setIsSaving(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";
      const token = localStorage.getItem("accessToken");

      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        priceIdr: Math.floor(Number(formData.priceIdr) || 0),
        categoryId: formData.categoryId || undefined,
        tags: formData.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        isActive: formData.isActive,
        isAvailable: formData.isAvailable,
        imageUrl: formData.imageUrl.trim() || undefined,
      };

      const endpoint = editingItem
        ? `${API_URL}/admin/menu-items/${editingItem.id}`
        : `${API_URL}/admin/menu-items`;

      const method = editingItem ? "PATCH" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        void fetchData();
        setShowModal(false);
        setEditingItem(null);
      } else {
        const data = await response.json().catch(() => ({}));
        alert(data.error?.message || "Gagal menyimpan item menu");
      }
    } catch (error) {
      console.error("Save error:", error);
      alert("Terjadi kesalahan saat menyimpan menu");
    } finally {
      setIsSaving(false);
    }
  };

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchSearch =
        !search.trim() ||
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(search.toLowerCase()));
      const matchCat = !selectedCategory || item.categoryId === selectedCategory;
      const matchAvail =
        !selectedAvailability ||
        (selectedAvailability === "ready" ? item.isAvailable : !item.isAvailable);
      return matchSearch && matchCat && matchAvail;
    });
  }, [items, search, selectedCategory, selectedAvailability]);

  return (
    <div className="space-y-6 antialiased">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--line)] pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[var(--sand)]">
            Katalog Menu Masakan Minang
          </h1>
          <p className="text-xs text-[var(--sand-muted)] mt-1">
            Pengaturan harga, ketersediaan stok dapur (ready/habis), dan status aktif hidangan.
          </p>
        </div>
        <button
          onClick={() => {
            setEditingItem(null);
            setFormData({
              name: "",
              description: "",
              priceIdr: 0,
              categoryId: categories[0]?.id || "",
              tags: "",
              isActive: true,
              isAvailable: true,
              imageUrl: "",
            });
            setShowModal(true);
          }}
          className="btn-brass text-xs"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>Tambah Menu Baru</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[var(--panel)] border border-[var(--line)] rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Cari hidangan (mis. Rendang, Ayam Pop)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full field-input text-xs pl-9"
            />
          </div>

          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full field-input text-xs"
            >
              <option value="">Semua Kategori</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={selectedAvailability}
              onChange={(e) => setSelectedAvailability(e.target.value)}
              className="w-full field-input text-xs"
            >
              <option value="">Semua Kesiapan Stok</option>
              <option value="ready">Tersedia (Ready)</option>
              <option value="out">Habis (Out of Stock)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabular Menu Items List */}
      <div className="bg-[var(--panel)] border border-[var(--line)] rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[var(--line)] bg-[var(--panel-elevated)] text-[var(--sand-muted)] uppercase font-mono text-[11px]">
              <tr>
                <th className="py-3 px-4">Nama Hidangan</th>
                <th className="py-3 px-4">Kategori</th>
                <th className="py-3 px-4">Harga (IDR)</th>
                <th className="py-3 px-4">Tags Rasa</th>
                <th className="py-3 px-4">Kesiapan Stok</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line)]">
              {isLoading ? (
                <tr>
                  <td className="p-8 text-center text-[var(--muted)]" colSpan={7}>
                    <div className="inline-flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-[var(--brass)] border-t-transparent rounded-full animate-spin" />
                      <span className="font-mono">Memuat buku menu...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td className="p-8 text-center text-[var(--muted)]" colSpan={7}>
                    Tidak ada hidangan yang cocok dengan filter pencarian.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-[var(--panel-elevated)] transition-colors">
                    {/* Name & desc */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded border border-[var(--line)] bg-[var(--panel-input)] shrink-0 overflow-hidden flex items-center justify-center">
                          {item.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={item.imageUrl.startsWith('/') ? `${new URL(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1').origin}${item.imageUrl}` : item.imageUrl}
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="font-mono text-[10px] text-[var(--muted)] font-bold">RM</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-[var(--sand)]">{item.name}</div>
                          {item.description && (
                            <div className="text-[11px] text-[var(--muted)] line-clamp-1 max-w-sm mt-0.5">
                              {item.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-[var(--panel-input)] border border-[var(--line)] font-mono text-[11px] text-[var(--sand-muted)]">
                        {item.category?.name || "Tanpa Kategori"}
                      </span>
                    </td>

                    {/* Price */}
                    <td className="py-3 px-4 font-mono font-semibold text-[var(--sand)]">
                      Rp {item.priceIdr.toLocaleString("id-ID")}
                    </td>

                    {/* Tags */}
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {item.tags && item.tags.length > 0 ? (
                          item.tags.map((t) => (
                            <span
                              key={t}
                              className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[var(--panel-elevated)] border border-[var(--line)] text-[var(--sand-muted)]"
                            >
                              #{t}
                            </span>
                          ))
                        ) : (
                          <span className="text-[11px] text-[var(--muted)]">-</span>
                        )}
                      </div>
                    </td>

                    {/* Availability toggle */}
                    <td className="py-3 px-4">
                      <button
                        onClick={() => void handleToggleAvailability(item.id, item.isAvailable)}
                        className={`badge-status cursor-pointer ${item.isAvailable ? "confirmed" : "rejected"}`}
                        title="Klik untuk mengubah ketersediaan stok dapur"
                      >
                        {item.isAvailable ? "● Ready" : "○ Habis"}
                      </button>
                    </td>

                    {/* Status active toggle */}
                    <td className="py-3 px-4">
                      <button
                        onClick={() => void handleToggleStatus(item.id, item.isActive)}
                        className={`badge-status cursor-pointer ${item.isActive ? "active" : "inactive"}`}
                        title="Klik untuk mengaktifkan / menonaktifkan"
                      >
                        {item.isActive ? "Aktif" : "Nonaktif"}
                      </button>
                    </td>

                    {/* Action buttons */}
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(item)}
                          className="text-xs font-mono text-[var(--brass)] hover:underline"
                        >
                          Ubah
                        </button>
                        <span className="text-[var(--line-strong)]">|</span>
                        <button
                          onClick={() => setItemToDelete(item)}
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
          <span>
            Total Item Menu: {filteredItems.length} dari {items.length} item
          </span>
          <span>Buku Dapur Rumah Makan Minang</span>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs"
        >
          <div className="bg-[var(--panel)] border border-[var(--line-strong)] rounded-lg max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
              <h2 className="text-sm font-semibold text-[var(--sand)] uppercase tracking-wider">
                {editingItem ? "Ubah Rincian Hidangan" : "Tambah Hidangan Baru"}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingItem(null);
                }}
                className="text-[var(--muted)] hover:text-[var(--sand)] text-lg leading-none"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-mono uppercase text-[var(--muted)] mb-1">
                  Nama Menu Masakan *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="mis. Rendang Batiah Spesial"
                  required
                  className="w-full field-input"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase text-[var(--muted)] mb-1">
                  Deskripsi / Keterangan
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, description: e.target.value }))
                  }
                  placeholder="Keterangan bumbu, tekstur rasa, atau catatan sajian..."
                  rows={2}
                  className="w-full field-input resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono uppercase text-[var(--muted)] mb-1">
                    Harga Satuan (IDR) *
                  </label>
                  <input
                    type="number"
                    value={formData.priceIdr}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        priceIdr: parseFloat(e.target.value) || 0,
                      }))
                    }
                    min="0"
                    step="500"
                    placeholder="28000"
                    required
                    className="w-full field-input font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase text-[var(--muted)] mb-1">
                    Kategori Menu
                  </label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, categoryId: e.target.value }))
                    }
                    className="w-full field-input"
                  >
                    <option value="">Pilih Kategori...</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase text-[var(--muted)] mb-1">
                  Foto Menu Masakan (File Upload atau URL)
                </label>
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={formData.imageUrl}
                    onChange={(e) => setFormData((prev) => ({ ...prev, imageUrl: e.target.value }))}
                    placeholder="https://... atau upload file di samping"
                    className="flex-1 field-input font-mono text-xs"
                  />
                  <label className="btn-outline text-xs whitespace-nowrap cursor-pointer">
                    {isUploading ? "Mengunggah..." : "Pilih File"}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      disabled={isUploading}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setIsUploading(true);
                        try {
                          const API_URL =
                            process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";
                          const token = localStorage.getItem("accessToken");
                          const body = new FormData();
                          body.append("file", file);
                          const res = await fetch(`${API_URL}/admin/menu-items/upload`, {
                            method: "POST",
                            headers: { Authorization: `Bearer ${token}` },
                            body,
                          });
                          const json = await res.json();
                          if (res.ok && json.data?.url) {
                            setFormData((prev) => ({ ...prev, imageUrl: json.data.url }));
                          } else {
                            alert(json.error?.message || "Gagal mengunggah file gambar.");
                          }
                        } catch {
                          alert("Gagal menghubungi server untuk upload gambar.");
                        } finally {
                          setIsUploading(false);
                        }
                      }}
                    />
                  </label>
                </div>
                {formData.imageUrl && (
                  <div className="mt-2 flex items-center gap-3 p-2 rounded bg-[var(--panel-input)] border border-[var(--line)]">
                    <div className="w-12 h-12 rounded overflow-hidden bg-[var(--panel-elevated)] border border-[var(--line)] shrink-0 flex items-center justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={formData.imageUrl.startsWith('/') ? `${new URL(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1').origin}${formData.imageUrl}` : formData.imageUrl}
                        key={formData.imageUrl}
                        alt="Preview Foto Menu"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-mono text-[var(--sand)] truncate">{formData.imageUrl}</p>

                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase text-[var(--muted)] mb-1">
                  Tags Rasa (pisahkan dengan koma)
                </label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData((prev) => ({ ...prev, tags: e.target.value }))}
                  placeholder="pedas, gurih, favorit, berkuah"
                  className="w-full field-input font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <label className="flex items-center gap-2 cursor-pointer p-2 rounded bg-[var(--panel-input)] border border-[var(--line)]">
                  <input
                    type="checkbox"
                    checked={formData.isAvailable}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, isAvailable: e.target.checked }))
                    }
                    className="accent-[var(--brass)]"
                  />
                  <span className="text-[var(--sand)]">Stok Ready (Tersedia)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer p-2 rounded bg-[var(--panel-input)] border border-[var(--line)]">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, isActive: e.target.checked }))
                    }
                    className="accent-[var(--brass)]"
                  />
                  <span className="text-[var(--sand)]">Status Aktif di Menu</span>
                </label>
              </div>

              <div className="flex gap-2 pt-4 border-t border-[var(--line)] justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingItem(null);
                  }}
                  className="btn-outline text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving || !formData.name.trim()}
                  className="btn-brass text-xs"
                >
                  {isSaving ? "Menyimpan..." : editingItem ? "Simpan Perubahan" : "Buat Item Menu"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={Boolean(itemToDelete)}
        title="Hapus Item Menu"
        message={`Item "${itemToDelete?.name || ""}" akan dihapus dari daftar menu aktif cabang.`}
        confirmLabel="Hapus Menu"
        isLoading={isDeleting}
        onConfirm={() => void handleDelete()}
        onCancel={() => setItemToDelete(null)}
      />
    </div>
  );
}
