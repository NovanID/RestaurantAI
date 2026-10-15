'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Outlet {
  id: string;
  name: string;
  slug: string;
}

interface OpeningHour {
  id: string;
  outletId: string;
  weekday: number; // 0 = Sunday, 6 = Saturday
  openTime: string;
  closeTime: string;
  isClosed: boolean;
}

interface DiningArea {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

interface RestaurantTable {
  id: string;
  tableNumber: string;
  capacity: number;
  status: 'active' | 'inactive';
  area?: DiningArea;
}

export default function OutletSettingsPage() {
  const [outletId, setOutletId] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [outlet, setOutlet] = useState<Outlet | null>(null);
  const [openingHours, setOpeningHours] = useState<OpeningHour[]>([]);
  const [areas, setAreas] = useState<DiningArea[]>([]);
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [activeTab, setActiveTab] = useState<'hours' | 'areas' | 'tables'>('hours');

  useEffect(() => {
    setOutletId(window.location.pathname.split('/')[3] ?? '');
  }, []);

  useEffect(() => {
    if (outletId) {
      fetchOutletData();
    }
  }, [outletId]);

  const fetchOutletData = async () => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
      
      // Fetch outlet details
      const response = await fetch(`${API_URL}/admin/outlets/${outletId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setOutlet(data.data);
        
        // Also fetch related data
        fetchOpeningHours(data.data.id);
        fetchAreas(data.data.id);
        fetchTables(data.data.id);
      }
    } catch (error) {
      console.error('Failed to fetch outlet data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOpeningHours = async (outletId: string) => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
      const response = await fetch(`${API_URL}/admin/outlets/${outletId}/opening-hours`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setOpeningHours(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch opening hours:', error);
    }
  };

  const fetchAreas = async (outletId: string) => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
      const response = await fetch(`${API_URL}/admin/outlets/${outletId}/areas`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAreas(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch areas:', error);
    }
  };

  const fetchTables = async (outletId: string) => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
      const response = await fetch(`${API_URL}/admin/outlets/${outletId}/tables`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTables(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch tables:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!outlet) {
    return (
      <div className="bg-slate-800/50 backdrop-blur rounded-xl p-8 border border-slate-700">
        <p className="text-gray-400">Outlet not found</p>
        <Link href="/admin/outlets" className="text-blue-400 hover:text-blue-300 mt-4 inline-block">
          ← Back to Outlets
        </Link>
      </div>
    );
  }

  const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="mb-4">
          <Link 
            href="/admin/outlets" 
            className="text-sm text-gray-400 hover:text-gray-300 flex items-center space-x-1"
          >
            <span>←</span>
            <span>Back to Outlets</span>
          </Link>
        </div>
        <h1 className="text-2xl font-bold mb-1">{outlet.name} - Settings</h1>
        <p className="text-gray-400 text-sm">Manage operating hours, dining areas, and table configuration</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-700">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'hours' as const, label: 'Opening Hours', icon: '🕐' },
            { id: 'areas' as const, label: 'Dining Areas', icon: '📍' },
            { id: 'tables' as const, label: 'Tables', icon: '🪑' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'hours' && (
        <OpeningHoursSection 
          outletId={outletId}
          openingHours={openingHours}
          weekdays={weekdays}
          onSave={() => fetchOpeningHours(outletId)}
          onChange={setOpeningHours}
        />
      )}

      {activeTab === 'areas' && (
        <AreasSection 
          outletId={outletId}
          areas={areas}
          onRefresh={() => fetchAreas(outletId)}
        />
      )}

      {activeTab === 'tables' && (
        <TablesSection 
          outletId={outletId}
          areas={areas}
          tables={tables}
          onRefresh={() => fetchTables(outletId)}
        />
      )}
    </div>
  );
}

// Opening Hours Tab Component
function OpeningHoursSection({ 
  outletId, 
  openingHours, 
  weekdays,
  onSave,
  onChange,
}: { 
  outletId: string;
  openingHours: OpeningHour[];
  weekdays: string[];
  onSave: () => void;
  onChange: (hours: OpeningHour[]) => void;
}) {
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
      
      const formattedHours = openingHours.map(hour => ({
        outletId: hour.outletId,
        weekday: hour.weekday,
        openTime: hour.openTime,
        closeTime: hour.closeTime,
        isClosed: hour.isClosed,
      }));

      const response = await fetch(`${API_URL}/admin/outlets/${outletId}/opening-hours`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify(formattedHours),
      });

      if (response.ok) {
        onSave();
        alert('Opening hours saved successfully');
      }
    } catch (error) {
      console.error('Save error:', error);
      alert('Failed to save opening hours');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-slate-800/50 backdrop-blur rounded-xl border border-slate-700 overflow-hidden">
      <div className="p-6 border-b border-slate-700">
        <h2 className="text-lg font-semibold mb-1">Operating Schedule</h2>
        <p className="text-gray-400 text-sm">Set your restaurant's weekly operating hours</p>
      </div>

      <table className="w-full">
        <thead className="bg-slate-900/50">
          <tr>
            <th className="text-left py-3 px-6 text-sm font-medium text-gray-300">Day</th>
            <th className="text-left py-3 px-6 text-sm font-medium text-gray-300">Status</th>
            <th className="text-left py-3 px-6 text-sm font-medium text-gray-300">Open Time</th>
            <th className="text-left py-3 px-6 text-sm font-medium text-gray-300">Close Time</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700">
          {weekdays.map((day, index) => {
            const hour = openingHours.find(h => h.weekday === index) || {
              openTime: '09:00',
              closeTime: '21:00',
              isClosed: false,
            };

            return (
              <tr key={index} className="hover:bg-slate-700/30">
                <td className="py-3 px-6 text-sm">
                  <strong>{day}</strong>
                </td>
                <td className="py-3 px-6 text-sm">
                  <label className="inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hour.isClosed}
                      onChange={(e) => {
                        const updated = openingHours.find(h => h.weekday === index);
                        if (updated) {
                          onChange(openingHours.map((item) => item.weekday === index ? { ...item, isClosed: e.target.checked } : item));
                        }
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    <span className="ml-3 text-sm text-gray-300">
                      {hour.isClosed ? 'Closed' : 'Open'}
                    </span>
                  </label>
                </td>
                <td className="py-3 px-6 text-sm">
                  {hour.isClosed ? (
                    <span className="text-gray-500 italic">-</span>
                  ) : (
                    <input
                      type="time"
                      value={hour.openTime}
                      onChange={(e) => {
                        const updated = openingHours.find(h => h.weekday === index);
                        if (updated) {
                          onChange(openingHours.map((item) => item.weekday === index ? { ...item, openTime: e.target.value } : item));
                        }
                      }}
                      className="bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                </td>
                <td className="py-3 px-6 text-sm">
                  {!hour.isClosed && (
                    <input
                      type="time"
                      value={hour.closeTime}
                      onChange={(e) => {
                        const updated = openingHours.find(h => h.weekday === index);
                        if (updated) {
                          onChange(openingHours.map((item) => item.weekday === index ? { ...item, closeTime: e.target.value } : item));
                        }
                      }}
                      className="bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="p-6 bg-slate-900/50 border-t border-slate-700 flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}

// Dining Areas Section
function AreasSection({ 
  outletId, 
  areas,
  onRefresh 
}: { 
  outletId: string;
  areas: DiningArea[];
  onRefresh: () => void;
}) {
  const [newAreaName, setNewAreaName] = useState('');
  const [creating, setCreating] = useState(false);

  const handleAddArea = async () => {
    if (!newAreaName.trim()) return;

    setCreating(true);
    
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
      
      const response = await fetch(`${API_URL}/admin/outlets/${outletId}/areas`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify({ name: newAreaName }),
      });

      if (response.ok) {
        setNewAreaName('');
        onRefresh();
      }
    } catch (error) {
      console.error('Add area error:', error);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="bg-slate-800/50 backdrop-blur rounded-xl border border-slate-700">
      <div className="p-6 border-b border-slate-700">
        <h2 className="text-lg font-semibold mb-1">Dining Areas</h2>
        <p className="text-gray-400 text-sm">Create and manage seating areas within this outlet</p>
      </div>

      <div className="p-6 border-b border-slate-700">
        <div className="flex gap-4">
          <input
            type="text"
            value={newAreaName}
            onChange={(e) => setNewAreaName(e.target.value)}
            placeholder="Enter area name (e.g., Main Hall, VIP Room)"
            className="flex-1 px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            onKeyDown={(e) => e.key === 'Enter' && handleAddArea()}
          />
          <button
            onClick={handleAddArea}
            disabled={creating || !newAreaName.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg transition-colors"
          >
            {creating ? 'Adding...' : '+ Add Area'}
          </button>
        </div>
      </div>

      {areas.length === 0 ? (
        <div className="p-12 text-center text-gray-400">
          No dining areas yet. Create one to start organizing your seating layout.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
          {areas.map((area) => (
            <div key={area.id} className="bg-slate-700/50 border border-slate-600 rounded-lg p-4 hover:border-blue-500 transition-colors">
              <h3 className="font-semibold text-lg mb-1">{area.name}</h3>
              <p className="text-sm text-gray-400">Created {new Date(area.createdAt).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Tables Section
function TablesSection({ 
  outletId, 
  areas,
  tables,
  onRefresh 
}: { 
  outletId: string;
  areas: DiningArea[];
  tables: RestaurantTable[];
  onRefresh: () => void;
}) {
  const [newTableNumber, setNewTableNumber] = useState('');
  const [newCapacity, setNewCapacity] = useState(4);
  const [newAreaId, setNewAreaId] = useState('');
  const [creating, setCreating] = useState(false);

  const handleAddTable = async () => {
    if (!newTableNumber.trim()) return;

    setCreating(true);
    
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
      
      const response = await fetch(`${API_URL}/admin/outlets/${outletId}/tables`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify({
          tableNumber: newTableNumber,
          capacity: newCapacity,
          areaId: newAreaId || undefined,
        }),
      });

      if (response.ok) {
        setNewTableNumber('');
        setNewAreaId('');
        onRefresh();
      }
    } catch (error) {
      console.error('Add table error:', error);
    } finally {
      setCreating(false);
    }
  };

  const handleToggleTableStatus = async (tableId: string, currentStatus: 'active' | 'inactive') => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
      
      const response = await fetch(`${API_URL}/admin/tables/${tableId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify({ status: currentStatus === 'active' ? 'inactive' : 'active' }),
      });

      if (response.ok) {
        onRefresh();
      }
    } catch (error) {
      console.error('Toggle status error:', error);
    }
  };

  return (
    <div className="bg-slate-800/50 backdrop-blur rounded-xl border border-slate-700">
      <div className="p-6 border-b border-slate-700">
        <h2 className="text-lg font-semibold mb-1">Table Configuration</h2>
        <p className="text-gray-400 text-sm">Add and configure individual tables for reservations</p>
      </div>

      <div className="p-6 border-b border-slate-700">
        <div className="flex gap-4 flex-wrap">
          <input
            type="text"
            value={newTableNumber}
            onChange={(e) => setNewTableNumber(e.target.value)}
            placeholder="Table #"
            className="flex-1 min-w-[120px] px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          
          <select
            value={newCapacity}
            onChange={(e) => setNewCapacity(Number(e.target.value))}
            className="px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {[1, 2, 3, 4, 5, 6, 8, 10, 12].map(n => (
              <option key={n} value={n}>{n} people</option>
            ))}
          </select>

          <select
            value={newAreaId}
            onChange={(e) => setNewAreaId(e.target.value)}
            className="flex-1 min-w-[150px] px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">No specific area</option>
            {areas.map(area => (
              <option key={area.id} value={area.id}>{area.name}</option>
            ))}
          </select>

          <button
            onClick={handleAddTable}
            disabled={creating || !newTableNumber.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg transition-colors"
          >
            {creating ? 'Adding...' : '+ Add Table'}
          </button>
        </div>
      </div>

      {tables.length === 0 ? (
        <div className="p-12 text-center text-gray-400">
          No tables configured yet. Add tables to start accepting reservations.
        </div>
      ) : (
        <div className="overflow-x-auto p-6">
          <table className="w-full">
            <thead className="bg-slate-900/50">
              <tr>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-300">Table #</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-300">Area</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-300">Capacity</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-300">Status</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {tables.map(table => (
                <tr key={table.id} className="hover:bg-slate-700/30">
                  <td className="py-3 px-4 text-sm font-medium">
                    <strong>{table.tableNumber}</strong>
                  </td>
                  <td className="py-3 px-4 text-sm">
                    {table.area?.name || '-'}
                  </td>
                  <td className="py-3 px-4 text-sm">
                    {table.capacity} people
                  </td>
                  <td className="py-3 px-4 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      table.status === 'active'
                        ? 'bg-green-500/10 text-green-400'
                        : 'bg-red-500/10 text-red-400'
                    }`}>
                      {table.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm">
                    <button
                      onClick={() => handleToggleTableStatus(table.id, table.status)}
                      className="text-blue-400 hover:text-blue-300"
                    >
                      {table.status === 'active' ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
