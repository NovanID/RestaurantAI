'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    // Clear authentication tokens
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    
    // Optionally clear cookies if set server-side
    document.cookie = 'accessToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    document.cookie = 'tenantSlug=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';

    // Redirect to login after clearing
    setTimeout(() => {
      router.push('/admin/login');
    }, 500);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-gray-400">Logging out...</p>
      </div>
    </div>
  );
}
