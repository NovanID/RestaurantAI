import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AdminShell } from './admin-shell';

export const metadata: Metadata = {
  title: 'Operasional | Rumah Makan Minang',
  description: 'Panel Operasional Rumah Makan Minang',
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--ironwood)]" />}>
      <AdminShell>{children}</AdminShell>
    </Suspense>
  );
}
