"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../lib/auth-context";
import { getUserOrders } from "../../lib/api";

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [ordersCount, setOrdersCount] = useState<number>(0);
  const [ticketsCount, setTicketsCount] = useState<number>(0);

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }

    getUserOrders(user.id)
      .then(orders => {
        setOrdersCount(orders.length);
        const totalTickets = orders.reduce((acc: number, order: any) => acc + (order.seats?.length || 0), 0);
        setTicketsCount(totalTickets);
      })
      .catch(() => {});
  }, [user, router]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[var(--bg-main)] pb-20">
      {/* Navbar */}
      <nav className="w-full bg-white border-b border-[var(--line)] sticky top-0 z-50">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3 md:px-8">
          <Link href="/" className="flex items-center gap-1.5">
            <div className="w-8 h-8 bg-[var(--primary)] rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>
            </div>
            <span className="text-xl font-extrabold tracking-tight text-[var(--text-main)]">
              book<span className="text-[var(--primary)]">my</span>seat
            </span>
          </Link>

          <div className="flex items-center gap-4">
            <Link href="/tickets" className="text-sm font-semibold text-[var(--primary)] hover:underline">My Tickets</Link>
            <div className="w-px h-5 bg-[var(--line)] mx-2 hidden sm:block"></div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[var(--primary-light)] text-[var(--primary)] rounded-full flex items-center justify-center text-sm font-bold">
                {user.name?.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-semibold text-[var(--text-main)] hidden sm:block">{user.name}</span>
              <button onClick={logout} className="text-xs text-[var(--text-muted)] hover:text-[var(--primary)] transition ml-1">Logout</button>
            </div>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-3xl px-4 py-12 md:px-8">
        <div className="bg-white rounded-2xl border border-[var(--line)] shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-[var(--primary)] to-blue-400 h-32 relative">
            <div className="absolute -bottom-10 left-8">
              <div className="w-24 h-24 bg-white rounded-full p-1 shadow-md">
                <div className="w-full h-full bg-[var(--primary-light)] text-[var(--primary)] rounded-full flex items-center justify-center text-4xl font-bold">
                  {user.name?.charAt(0).toUpperCase()}
                </div>
              </div>
            </div>
          </div>
          
          <div className="pt-16 pb-8 px-8">
            <h1 className="text-2xl font-extrabold text-[var(--text-main)]">{user.name}</h1>
            <p className="text-[var(--text-muted)] text-sm mb-8">{user.email}</p>
            
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-[var(--bg-soft)] rounded-xl p-4 border border-[var(--line)] text-center">
                <div className="text-2xl font-extrabold text-[var(--primary)]">{ordersCount}</div>
                <div className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Total Orders</div>
              </div>
              <div className="bg-[var(--bg-soft)] rounded-xl p-4 border border-[var(--line)] text-center">
                <div className="text-2xl font-extrabold text-[var(--primary)]">{ticketsCount}</div>
                <div className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Tickets Booked</div>
              </div>
            </div>
            
            <h2 className="text-lg font-bold text-[var(--text-main)] mb-4 border-b border-[var(--line)] pb-2">Account Settings</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Full Name</label>
                <input type="text" disabled value={user.name} className="w-full bg-[var(--bg-soft)] border border-[var(--line)] rounded-lg px-4 py-2.5 text-sm text-[var(--text-main)] cursor-not-allowed" />
              </div>
              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Email Address</label>
                <input type="email" disabled value={user.email} className="w-full bg-[var(--bg-soft)] border border-[var(--line)] rounded-lg px-4 py-2.5 text-sm text-[var(--text-main)] cursor-not-allowed" />
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-2 italic">* Profile editing is disabled in this demo environment.</p>
            </div>
            
            <div className="mt-8 pt-6 border-t border-[var(--line)]">
              <button onClick={logout} className="text-sm font-semibold text-red-500 hover:text-red-600 transition">
                Sign out of all devices
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
