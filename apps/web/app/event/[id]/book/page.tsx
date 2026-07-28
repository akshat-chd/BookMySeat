"use client";

import { useParams } from "next/navigation";
import { SaleConsole } from "../../../../components/sale-console";
import Link from "next/link";
import { useAuth } from "../../../../lib/auth-context";

export default function BookEventPage() {
  const { id } = useParams();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-[var(--bg-main)]">
      {/* Navigation */}
      <nav className="w-full bg-white border-b border-[var(--line)] sticky top-0 z-50">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3 md:px-8">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-1.5">
              <div className="w-7 h-7 bg-[var(--primary)] rounded-md flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>
              </div>
              <span className="text-lg font-extrabold tracking-tight text-[var(--text-main)]">book<span className="text-[var(--primary)]">my</span>seat</span>
            </Link>
            <span className="text-[var(--line)]">|</span>
            <span className="text-sm font-medium text-[var(--text-muted)]">Select Seats</span>
          </div>
          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-[var(--primary-light)] text-[var(--primary)] rounded-full flex items-center justify-center text-xs font-bold">
                  {user.name?.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-medium text-[var(--text-main)] hidden sm:block">{user.name}</span>
              </div>
            ) : (
              <Link href="/login" className="text-sm font-semibold text-[var(--primary)] hover:underline">Sign In</Link>
            )}
          </div>
        </div>
      </nav>

      <main>
        <SaleConsole eventId={id as string} />
      </main>
    </div>
  );
}
