'use client';

import { useState, useEffect } from 'react';

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
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    priceIdr: 0,
    categoryId: '',
    tags: '' as string, // comma-separated
    isActive: true,
    isAvailable: true,
    imageUrl: '',
  });

  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
      
      // Fetch items
      const itemsResponse = await fetch(`${API_URL}/admin/menu-items`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      // Fetch categories
      const categoriesResponse = await fetch(`${API_URL}/admin/menu-categories`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (itemsResponse.ok && categoriesResponse.ok) {
        const itemsData = await itemsResponse.json();
        const categoriesData = await categoriesResponse.json();
        
        setItems(itemsData.data || itemsData);
        setCategories(categoriesData.data || categoriesData);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (item: MenuItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description || '',
      priceIdr: item.priceIdr,
      categoryId: item.categoryId || '',
      tags: item.tags?.join(', ') || '',
      isActive: item.isActive,
      isAvailable: item.isAvailable,
      imageUrl: item.imageUrl || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (itemId: string) => {
    if (!confirm('Yakin ingin menghapus item ini?')) return;

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
      
      const response = await fetch(`${API_URL}/admin/menu-items/${itemId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (response.ok) {
        fetchData();
      } else {
        alert('Gagal menghapus item');
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Terjadi kesalahan saat menghapus');
    }
  };

  const handleToggleStatus = async (itemId: string, currentStatus: boolean) => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
      
      const response = await fetch(`${API_URL}/admin/menu-items/${itemId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      if (response.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('Toggle status error:', error);
    }
  };

  const handleToggleAvailability = async (itemId: string, currentStatus: boolean) => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
      
      const response = await fetch(`${API_URL}/admin/menu-items/${itemId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify({ isAvailable: !currentStatus }),
      });

      if (response.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('Toggle availability error:', error);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) return;

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
      
      const payload = {
        name: formData.name,
        description: formData.description,
        priceIdr: Math.floor(formData.priceIdr),
        categoryId: formData.categoryId || undefined,
        tags: formData.tags.split(',').map(t => t.trim()).filter(t => t),
        isActive: formData.isActive,
        isAvailable: formData.isAvailable,
        imageUrl: formData.imageUrl || undefined,
      };

      const endpoint = editingItem 
        ? `${API_URL}/admin/menu-items/${editingItem.id}`
        : `${API_URL}/admin/menu-items`;
      
      const method = editingItem ? 'PATCH' : 'POST';

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        fetchData();
        setShowModal(false);
        setEditingItem(null);
      } else {
        const data = await response.json();
        alert(data.error?.message || 'Gagal menyimpan item');
      }
    } catch (error) {
      console.error('Save error:', error);
      alert('Terjadi kesalahan saat menyimpan');
    }
  };

  const handleImageUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    setUploading(true);

    try {
      // For now, we'll use a placeholder URL approach
      // In production, implement actual upload to S3/Cloudinary or local storage
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          imageUrl: reader.result as string, // Base64 encoding (for demo only)
        }));
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Upload error:', error);
      setUploading(false);
      alert('Upload failed');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-1">Menu Items</h1>
          <p className="text-gray-400 text-sm">Kelola menu restoran dan pengaturan harga</p>
        </div>
        <button 
          onClick={() => {
            setEditingItem(null);
            setFormData({
              name: '',
              description: '',
              priceIdr: 0,
              categoryId: '',
              tags: '',
              isActive: true,
              isAvailable: true,
              imageUrl: '',
            });
            setShowModal(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
        >
          <span>+</span>
          <span>Tambah Item Menu</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-800/50 backdrop-blur rounded-xl p-4 border border-slate-700">
        <div className="flex gap-4 items-center">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search menu items..."
              className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select className="px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">All Categories</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
          <select className="px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="available">Available</option>
            <option value="unavailable">Unavailable</option>
          </select>
        </div>
      </div>

      {/* Items List */}
      {items.length === 0 ? (
        <div className="bg-slate-800/50 backdrop-blur rounded-xl p-12 border border-slate-700 text-center">
          <div className="text-6xl mb-4">🍽️</div>
          <h3 className="text-lg font-semibold mb-2">Belum ada menu item</h3>
          <p className="text-gray-400 mb-6">Tambahkan item menu pertama Anda untuk pelanggan</p>
          <button 
            onClick={() => setShowModal(true)}
            className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
          >
            <span>+</span>
            <span>Buat Menu Baru</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {items.map((item) => (
            <div 
              key={item.id}
              className={`bg-slate-800/50 backdrop-blur rounded-xl border overflow-hidden transition-all group ${
                item.isActive 
                  ? 'border-slate-700 hover:border-blue-500' 
                  : 'border-gray-700 opacity-60 grayscale'
              }`}
            >
              {/* Image Section */}
              <div className="relative h-48 bg-gradient-to-br from-slate-700 to-slate-800">
                {item.imageUrl ? (
                  <img 
                    src={item.imageUrl} 
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl">
                    🍽️
                  </div>
                )}
                
                {/* Badges Overlay */}
                <div className="absolute top-3 left-3 flex gap-2">
                  {!item.isActive && (
                    <span className="bg-red-500/90 text-white px-2 py-1 rounded-full text-xs font-medium">
                      Inactive
                    </span>
                  )}
                  {!item.isAvailable && (
                    <span className="bg-orange-500/90 text-white px-2 py-1 rounded-full text-xs font-medium">
                      Habis
                    </span>
                  )}
                </div>
              </div>

              {/* Content Section */}
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg truncate">{item.name}</h3>
                    {item.category && (
                      <p className="text-sm text-gray-400">@{item.category.name}</p>
                    )}
                  </div>
                  <p className="font-bold text-blue-400 ml-2 shrink-0">
                    {formatPrice(item.priceIdr)}
                  </p>
                </div>

                {item.description && (
                  <p className="text-sm text-gray-400 line-clamp-2 mb-3">
                    {item.description}
                  </p>
                )}

                {item.tags && item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {item.tags.slice(0, 3).map(tag => (
                      <span key={tag} className="text-xs px-2 py-1 bg-slate-700/50 text-gray-300 rounded-md">
                        #{tag}
                      </span>
                    ))}
                    {item.tags.length > 3 && (
                      <span className="text-xs text-gray-500">+{item.tags.length - 3}</span>
                    )}
                  </div>
                )}

                {/* Toggle Controls */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-700">
                  <div className="flex items-center space-x-3">
                    <label className="text-sm text-gray-400">Status:</label>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={item.isActive}
                        onChange={() => handleToggleStatus(item.id, item.isActive)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-green-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:h-5 after:w-5 after:transition-all"></div>
                    </label>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <label className="text-sm text-gray-400">Ready:</label>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={item.isAvailable}
                        onChange={() => handleToggleAvailability(item.id, item.isAvailable)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:h-5 after:w-5 after:transition-all"></div>
                    </label>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-4 pt-4 border-t border-slate-700 flex items-center justify-between">
                  <button 
                    onClick={() => handleEdit(item)}
                    className="text-sm text-blue-400 hover:text-blue-300 font-medium"
                  >
                    Edit →
                  </button>
                  <button 
                    onClick={() => handleDelete(item.id)}
                    className="text-sm text-red-400 hover:text-red-300 font-medium"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-800 rounded-xl border border-slate-700 max-w-2xl w-full my-8 p-6">
            <h2 className="text-xl font-semibold mb-4">
              {editingItem ? 'Edit Menu Item' : 'Create New Menu Item'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Item Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Nasi Goreng Spesial, Rendang Daging"
                  required
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe ingredients, taste, or special notes..."
                  rows={3}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Price (IDR) *
                  </label>
                  <input
                    type="number"
                    value={formData.priceIdr}
                    onChange={(e) => setFormData(prev => ({ ...prev, priceIdr: parseFloat(e.target.value) || 0 }))}
                    min="0"
                    placeholder="e.g., 35000"
                    required
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Category *
                  </label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) => setFormData(prev => ({ ...prev, categoryId: e.target.value }))}
                    required
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select category...</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                  placeholder="e.g., spicy, vegetarian, bestseller"
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Used for filtering and search</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Image Upload
                </label>
                <div className="flex items-center gap-4">
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(file);
                      }}
                      className="hidden"
                    />
                    <div className={`px-4 py-2 rounded-lg border-2 border-dashed transition-colors cursor-pointer ${
                      uploading 
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-slate-600 hover:border-slate-500'
                    }`}>
                      {uploading ? (
                        <span className="text-blue-400">Uploading...</span>
                      ) : (
                        <span className="text-gray-300">📷 Upload Image</span>
                      )}
                    </div>
                  </label>
                  {formData.imageUrl && (
                    <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-slate-600">
                      <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Note: Image upload using base64 (demo mode). Production should use cloud storage.
                </p>
              </div>

              <div className="flex items-center space-x-4 pt-2">
                <label className="inline-flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                  />
                  <span className="ml-2 text-gray-300">Active (visible in menu)</span>
                </label>
              </div>

              <div className="flex items-center space-x-4">
                <label className="inline-flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.isAvailable}
                    onChange={(e) => setFormData(prev => ({ ...prev, isAvailable: e.target.checked }))}
                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                  />
                  <span className="ml-2 text-gray-300">Available (not out of stock)</span>
                </label>
              </div>

              <div className="flex gap-4 pt-4 border-t border-slate-700">
                <button
                  type="submit"
                  disabled={!formData.name.trim()}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors"
                >
                  {editingItem ? 'Update Item' : 'Create Item'}
                </button>
                
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingItem(null);
                  }}
                  className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
