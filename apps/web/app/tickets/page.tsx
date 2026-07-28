"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import QRCode from "react-qr-code";
import { useAuth } from "../../lib/auth-context";
import { getUserOrders } from "../../lib/api";

export default function MyTicketsPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }

    getUserOrders(user.id)
      .then(data => {
        setOrders(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [user, router]);

  const handleDownloadIcs = (order: any) => {
    const event = order.event;
    // Assuming event date is 7 days from now for demo purposes
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 7);
    startDate.setHours(19, 0, 0, 0);
    
    const endDate = new Date(startDate);
    endDate.setMinutes(endDate.getMinutes() + (event.duration || 120));

    const formatDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    };

    const icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//bookmyseat//NONSGML v1.0//EN",
      "BEGIN:VEVENT",
      `UID:${order.id}@bookmyseat.com`,
      `DTSTAMP:${formatDate(new Date())}`,
      `DTSTART:${formatDate(startDate)}`,
      `DTEND:${formatDate(endDate)}`,
      `SUMMARY:${event.name}`,
      `DESCRIPTION:Your ticket for ${event.name}. Seats: ${order.seats.map((s:any) => s.row + s.number).join(", ")}`,
      "END:VEVENT",
      "END:VCALENDAR"
    ].join("\n");

    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const link = document.createElement("a");
    link.href = window.URL.createObjectURL(blob);
    link.download = `${event.name.replace(/\s+/g, '_')}_ticket.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
            <Link href="/profile" className="flex items-center gap-3 hover:opacity-80 transition">
              <div className="w-8 h-8 bg-[var(--primary-light)] text-[var(--primary)] rounded-full flex items-center justify-center text-sm font-bold">
                {user.name?.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-semibold text-[var(--text-main)] hidden sm:block">{user.name}</span>
            </Link>
            <button onClick={logout} className="text-xs text-[var(--text-muted)] hover:text-[var(--primary)] transition ml-1">Logout</button>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-4 py-10 md:px-8">
        <h1 className="text-3xl font-extrabold text-[var(--text-main)] mb-2">My Tickets</h1>
        <p className="text-[var(--text-muted)] mb-10">Manage your bookings and view your digital passes.</p>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-3 border-[var(--primary)] border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-[var(--line)] shadow-sm">
            <div className="w-16 h-16 bg-[var(--bg-soft)] rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>
            </div>
            <h3 className="text-lg font-semibold text-[var(--text-main)] mb-1">No tickets found</h3>
            <p className="text-sm text-[var(--text-muted)] mb-6">Looks like you haven't booked any events yet.</p>
            <Link href="/" className="bg-[var(--primary)] text-white px-6 py-2.5 rounded-lg font-semibold text-sm hover:bg-[var(--primary-hover)] transition">
              Explore Events
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {orders.map((order) => (
              <div key={order.id} className="bg-white rounded-2xl border border-[var(--line)] overflow-hidden shadow-sm hover:shadow-md transition">
                <div className="p-6 border-b border-dashed border-[var(--line)] relative">
                  <div className="absolute -bottom-3 -left-3 w-6 h-6 bg-[var(--bg-main)] rounded-full border-t border-r border-[var(--line)]"></div>
                  <div className="absolute -bottom-3 -right-3 w-6 h-6 bg-[var(--bg-main)] rounded-full border-t border-l border-[var(--line)]"></div>
                  
                  <div className="flex justify-between items-start mb-4">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-md uppercase tracking-wider ${order.status === 'CONFIRMED' ? 'bg-[var(--signal-light)] text-[var(--signal)]' : 'bg-[var(--warning-light)] text-[var(--warning)]'}`}>
                      {order.status}
                    </span>
                    <span className="text-xs font-mono text-[var(--text-muted)]">{new Date(order.createdAt).toLocaleDateString()}</span>
                  </div>
                  
                  <h3 className="text-xl font-extrabold text-[var(--text-main)] mb-1">{order.event.name}</h3>
                  <p className="text-sm font-semibold text-[var(--text-muted)]">{order.event.genre}</p>
                  
                  <div className="mt-6 flex flex-wrap gap-2">
                    {order.seats.map((s: any) => (
                      <span key={s.id} className="bg-[var(--bg-soft)] text-[var(--text-main)] text-xs font-bold px-3 py-1.5 rounded-lg border border-[var(--line)]">
                        Seat {s.row}{s.number}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div className="bg-[var(--bg-soft)] p-6 flex flex-col sm:flex-row items-center gap-6">
                  <div className="bg-white p-2 rounded-xl shadow-sm border border-[var(--line)] shrink-0">
                    <QRCode value={order.id} size={80} level="H" />
                  </div>
                  <div className="flex-1 text-center sm:text-left">
                    <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1">Ticket ID</p>
                    <p className="font-mono text-xs text-[var(--text-main)] font-bold break-all">{order.id}</p>
                    <p className="text-xs text-[var(--text-muted)] mt-2">Show this code at the venue</p>
                  </div>
                  <div className="shrink-0">
                    <button 
                      onClick={() => handleDownloadIcs(order)}
                      className="bg-white hover:bg-[var(--bg-main)] text-[var(--text-main)] text-xs font-bold px-4 py-2 border border-[var(--line)] rounded-lg shadow-sm transition flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      Add to Calendar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
