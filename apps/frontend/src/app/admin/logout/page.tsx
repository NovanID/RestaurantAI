'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    localStorage.removeItem('tenantSlug');
    
    document.cookie = 'accessToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    document.cookie = 'tenantSlug=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';

    const timer = setTimeout(() => {
      router.push('/admin/login');
    }, 400);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--ironwood)] text-[var(--sand)]">
      <div className="text-center space-y-3">
        <div className="w-8 h-8 border-2 border-[var(--brass)] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs font-mono text-[var(--sand-muted)] uppercase tracking-wider">
          Menutup sesi petugas...
        </p>
      </div>
    </div>
  );
}
