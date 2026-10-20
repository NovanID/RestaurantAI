import { Suspense } from 'react';
import CustomerHomeClient, { MenuItem, Outlet } from './customer-home-client';

async function CustomerDataContent() {
  const apiUrl = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const tenantId = process.env.PUBLIC_MENU_TENANT_ID || '74523d6c-541a-4607-88a0-ac0df9c15f48';

  let menuItems: MenuItem[] = [];
  let outlets: Outlet[] = [];

  try {
    const [menuRes, outletsRes] = await Promise.all([
      fetch(`${apiUrl}/menu?tenant_id=${encodeURIComponent(tenantId)}`, {
        cache: 'no-store',
        signal: AbortSignal.timeout(5000),
      }),
      fetch(`${apiUrl}/outlets?tenant_id=${encodeURIComponent(tenantId)}`, {
        cache: 'no-store',
        signal: AbortSignal.timeout(5000),
      }),
    ]);

    if (menuRes.ok) {
      const payload = await menuRes.json();
      menuItems = Array.isArray(payload) ? payload : payload.data ?? [];
    }

    if (outletsRes.ok) {
      const payload = await outletsRes.json();
      outlets = Array.isArray(payload) ? payload : payload.data ?? [];
    }
  } catch {
    // Fallback if backend offline during build
  }

  return (
    <CustomerHomeClient
      menuItems={menuItems}
      outlets={outlets}
      tenantId={tenantId}
    />
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#101614] text-[#ECE8AF] flex items-center justify-center font-mono text-sm">
          Memuat sajian Minang Asli...
        </div>
      }
    >
      <CustomerDataContent />
    </Suspense>
  );
}
