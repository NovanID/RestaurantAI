'use client';

import { useState, useEffect } from 'react';

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
  const [newName, setNewName] = useState('');
  const [newSortOrder, setNewSortOrder] = useState(0);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
      const response = await fetch(`${API_URL}/admin/menu-categories`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setCategories(data.data || data);
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setNewName(category.name);
    setNewSortOrder(category.sortOrder);
    setShowAddModal(true);
  };

  const handleDelete = async (categoryId: string) => {
    if (!confirm('Yakin ingin menghapus kategori ini?')) return;

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
      
      const response = await fetch(`${API_URL}/admin/menu-categories/${categoryId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (response.ok) {
        fetchCategories();
      } else {
        alert('Gagal menghapus kategori');
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Terjadi kesalahan saat menghapus');
    }
  };

  const handleToggleStatus = async (categoryId: string, currentStatus: boolean) => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
      
      const response = await fetch(`${API_URL}/admin/menu-categories/${categoryId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      if (response.ok) {
        fetchCategories();
      }
    } catch (error) {
      console.error('Toggle status error:', error);
    }
  };

  const handleSave = async () => {
    if (!newName.trim()) return;

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
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify({
          name: newName,
          sortOrder: newSortOrder,
        }),
      });

      if (response.ok) {
        fetchCategories();
        setShowAddModal(false);
        setEditingCategory(null);
        setNewName('');
        setNewSortOrder(0);
      } else {
        const data = await response.json();
        alert(data.error?.message || 'Gagal menyimpan kategori');
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
          <h1 className="text-2xl font-bold mb-1">Menu Categories</h1>
          <p className="text-gray-400 text-sm">Kelola kategori menu untuk organisasi dan penataan item</p>
        </div>
        <button 
          onClick={() => {
            setEditingCategory(null);
            setNewName('');
            setNewSortOrder(0);
            setShowAddModal(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
        >
          <span>+</span>
          <span>Tambah Kategori</span>
        </button>
      </div>

      {/* Categories List */}
      {isLoading ? (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : categories.length === 0 ? (
        <div className="bg-slate-800/50 backdrop-blur rounded-xl p-12 border border-slate-700 text-center">
          <div className="text-6xl mb-4">📁</div>
          <h3 className="text-lg font-semibold mb-2">Belum ada kategori</h3>
          <p className="text-gray-400 mb-6">Buat kategori pertama Anda untuk mulai mengorganisasi menu</p>
          <button 
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
          >
            <span>+</span>
            <span>Buat Kategori Baru</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category) => (
            <div 
              key={category.id}
              className={`bg-slate-800/50 backdrop-blur rounded-xl border transition-all group ${
                category.isActive 
                  ? 'border-slate-700 hover:border-blue-500' 
                  : 'border-gray-700 opacity-60 grayscale'
              }`}
            >
              <div className={`h-2 ${category.isActive ? 'bg-green-500' : 'bg-gray-500'}`} />
              
              <div className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold mb-1">{category.name}</h3>
                    <p className="text-gray-400 text-sm">Sort order: #{category.sortOrder}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    category.isActive 
                      ? 'bg-green-500/10 text-green-400' 
                      : 'bg-gray-500/10 text-gray-400'
                  }`}>
                    {category.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-700 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <label className="text-sm text-gray-400">Status:</label>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={category.isActive}
                        onChange={() => handleToggleStatus(category.id, category.isActive)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                    </label>
                  </div>
                  
                  <button 
                    onClick={() => handleEdit(category)}
                    className="text-sm text-blue-400 hover:text-blue-300 font-medium"
                  >
                    Edit →
                  </button>
                </div>

                <button 
                  onClick={() => handleDelete(category.id)}
                  className="mt-3 text-sm text-red-400 hover:text-red-300 font-medium"
                >
                  Delete category
                </button>
              </div>

              <div className="px-6 py-3 bg-slate-900/50 border-t border-slate-700">
                <p className="text-xs text-gray-500">Created {new Date(category.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-slate-800 rounded-xl border border-slate-700 max-w-md w-full p-6">
            <h2 className="text-xl font-semibold mb-4">
              {editingCategory ? 'Edit Category' : 'Create New Category'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Category Name *
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g., Rendang Specials, Rice Meals"
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Sort Order
                </label>
                <input
                  type="number"
                  value={newSortOrder}
                  onChange={(e) => setNewSortOrder(Number(e.target.value))}
                  min="0"
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Lower numbers appear first in lists</p>
              </div>

              <div className="flex gap-4 pt-4 border-t border-slate-700">
                <button
                  onClick={handleSave}
                  disabled={!newName.trim()}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                >
                  {editingCategory ? 'Update' : 'Create'}
                </button>
                
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingCategory(null);
                    setNewName('');
                    setNewSortOrder(0);
                  }}
                  className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
