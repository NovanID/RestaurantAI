import { Suspense } from 'react';
import CustomerHomeClient, { MenuItem, Outlet } from './customer-home-client';

async function CustomerDataContent() {


  let menuItems: MenuItem[] = [];
  let outlets: Outlet[] = [];
  let tenantId = '';

  try {
    const tenantRes = await fetch(`${apiUrl}/tenant?slug=${encodeURIComponent(tenantSlug)}`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    });

    if (!tenantRes.ok) {
      throw new Error('Tenant tidak ditemukan');
    }

    const tenantPayload = await tenantRes.json();
    tenantId = tenantPayload.data?.id;

    if (!tenantId) {
      throw new Error('Respons tenant tidak valid');
    }

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
