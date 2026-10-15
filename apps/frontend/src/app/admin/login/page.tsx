'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface LoginResponse {
  data?: {
    accessToken: string;
    user: {
      id: string;
      name: string;
      email: string;
      role: string;
      tenantId: string;
      tenantSlug: string;
    };
  };
  error?: {
    code: string;
    message: string;
  };
}

export default function LoginPage() {
  const router = useRouter();
  const [tenantSlug, setTenantSlug] = useState('padang-sederhana');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const storedToken = localStorage.getItem('accessToken');
    const storedTenant = localStorage.getItem('tenantSlug');
    if (storedToken && storedTenant) {
      router.push('/admin/dashboard');
    }
  }, [router]);

  if (!mounted) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#101614', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '32px', height: '32px', border: '3px solid #D98327', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
      
      const response = await fetch(`${API_URL}/admin/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenantSlug: tenantSlug.trim(),
          email: email.trim(),
          password,
        }),
      });

      const data: LoginResponse = await response.json();

      if (response.ok && data.data) {
        document.cookie = `accessToken=${encodeURIComponent(data.data.accessToken)}; Path=/; SameSite=Lax; Max-Age=900`;
        localStorage.setItem('accessToken', data.data.accessToken);
        localStorage.setItem('tenantSlug', data.data.user.tenantSlug);
        localStorage.setItem('user', JSON.stringify(data.data.user));

        window.location.href = '/admin/dashboard';
      } else {
        setError(data.error?.message || 'Kredensial tidak valid atau restoran tidak ditemukan.');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Gagal menghubungi server backend. Pastikan layanan aktif.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#101614',
        color: '#EDE6DB',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        fontFamily: 'var(--font-sans), system-ui, sans-serif',
      }}
    >
      <div style={{ maxWidth: '440px', width: '100%' }}>
        {/* Brand identity header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '52px',
              height: '52px',
              borderRadius: '8px',
              border: '2px solid #D98327',
              backgroundColor: 'rgba(217, 131, 39, 0.15)',
              color: '#D98327',
              fontWeight: 700,
              fontSize: '1.25rem',
              letterSpacing: '0.05em',
              marginBottom: '1rem',
              fontFamily: 'monospace',
            }}
          >
            RM
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#EDE6DB', margin: 0 }}>
            Rumah Makan Minang
          </h1>
          <p
            style={{
              fontSize: '0.75rem',
              color: '#8E9C96',
              fontFamily: 'monospace',
              marginTop: '0.375rem',
              letterSpacing: '0.05em',
            }}
          >
            PORTAL OTORISASI OPERASIONAL
          </p>
        </div>

        {/* Login Card with visible borders and palette accents */}
        <div
          style={{
            backgroundColor: '#16201D',
            border: '1px solid #2C3E37',
            borderTop: '3px solid #D98327',
            borderRadius: '8px',
            padding: '2rem',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
          }}
        >
          <div style={{ borderBottom: '1px solid #2C3E37', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
            <h2
              style={{
                fontSize: '0.875rem',
                fontWeight: 600,
                color: '#EDE6DB',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                margin: 0,
              }}
            >
              Masuk Petugas
            </h2>
            <p style={{ fontSize: '0.75rem', color: '#ECE8AF', marginTop: '0.25rem', opacity: 0.85 }}>
              Gunakan akun staff atau pengelola yang terdaftar.
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Tenant Slug */}
            <div>
              <label
                htmlFor="tenantSlug"
                style={{
                  display: 'block',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: '#ECE8AF',
                  marginBottom: '0.375rem',
                  textTransform: 'uppercase',
                  fontFamily: 'monospace',
                  letterSpacing: '0.05em',
                }}
              >
                Slug Restoran (Tenant)
              </label>
              <input
                type="text"
                id="tenantSlug"
                value={tenantSlug}
                onChange={(e) => setTenantSlug(e.target.value)}
                placeholder="padang-sederhana"
                required
                className="field-input"
                style={{
                  fontFamily: 'monospace',
                }}
              />
              <span style={{ display: 'block', fontSize: '0.6875rem', color: '#8E9C96', marginTop: '0.375rem' }}>
                Identitas unik restoran di database sistem.
              </span>
            </div>

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                style={{
                  display: 'block',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: '#ECE8AF',
                  marginBottom: '0.375rem',
                  textTransform: 'uppercase',
                  fontFamily: 'monospace',
                  letterSpacing: '0.05em',
                }}
              >
                Email Petugas
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                placeholder="admin@minangasli.com"
                required
                className="field-input"
                style={{
                  fontFamily: 'monospace',
                }}
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                style={{
                  display: 'block',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: '#ECE8AF',
                  marginBottom: '0.375rem',
                  textTransform: 'uppercase',
                  fontFamily: 'monospace',
                  letterSpacing: '0.05em',
                }}
              >
                Kata Sandi
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="••••••••"
                required
                className="field-input"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div
                role="alert"
                style={{
                  backgroundColor: 'rgba(196, 67, 50, 0.15)',
                  border: '1px solid rgba(196, 67, 50, 0.4)',
                  borderRadius: '4px',
                  padding: '0.75rem',
                  fontSize: '0.75rem',
                  color: '#E05747',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <svg style={{ width: '1rem', height: '1rem', flexShrink: 0 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* Submit Button with Palette Ochre */}
            <button
              type="submit"
              disabled={isLoading}
              style={{
                marginTop: '0.5rem',
                backgroundColor: '#D98327',
                color: '#101614',
                fontWeight: 700,
                fontSize: '0.8125rem',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                padding: '0.75rem 1rem',
                borderRadius: '4px',
                border: 'none',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.7 : 1,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                transition: 'background-color 0.15s ease',
              }}
              onMouseEnter={(e) => {
                if (!isLoading) e.currentTarget.style.backgroundColor = '#BF6F1C';
              }}
              onMouseLeave={(e) => {
                if (!isLoading) e.currentTarget.style.backgroundColor = '#D98327';
              }}
            >
              {isLoading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ width: '14px', height: '14px', border: '2px solid #101614', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 1s linear infinite' }} />
                  <span>Memverifikasi...</span>
                </div>
              ) : (
                'Masuk Operasional'
              )}
            </button>
          </form>
        </div>

        <p style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.75rem', color: '#8E9C96' }}>
          Slug restoran berbeda dari slug cabang. Hubungi pengelola untuk akses akun Anda.
        </p>
      </div>
    </div>
  );
}
