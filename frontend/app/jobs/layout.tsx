'use client';

import { ProtectedRoute } from '@/components/auth/protected-route';
import { Sidebar } from '@/components/navigation/sidebar';

export default function JobsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <div className="flex h-screen bg-secondary">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </ProtectedRoute>
  );
}

