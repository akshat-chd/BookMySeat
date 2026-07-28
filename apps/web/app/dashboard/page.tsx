import Link from "next/link";

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-main)]">
      <nav className="w-full bg-white border-b border-[var(--line)] sticky top-0 z-50">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3 md:px-8">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-1.5">
              <div className="w-7 h-7 bg-[var(--primary)] rounded-md flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>
              </div>
              <span className="text-lg font-extrabold tracking-tight text-[var(--text-main)]">book<span className="text-[var(--primary)]">my</span>seat</span>
            </Link>
            <span className="text-[var(--line)]">|</span>
            <span className="text-sm font-semibold text-[var(--text-secondary)]">My Profile</span>
          </div>
          <Link
            href="/"
            className="text-sm font-semibold text-[var(--primary)] hover:underline flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            Back to Home
          </Link>
        </div>
      </nav>

      <div className="mx-auto max-w-5xl px-4 py-12 md:px-8">
        <h1 className="text-3xl font-extrabold mb-8 text-[var(--text-main)]">My Tickets & Bookings</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-6">
            
            {/* Upcoming Booking Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-[var(--line)] overflow-hidden flex flex-col sm:flex-row relative">
              <div className="absolute top-4 right-4 bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">Confirmed</div>
              <div className="w-full sm:w-48 h-48 bg-slate-100">
                <img src="https://picsum.photos/seed/deadpool/800/1200" alt="Deadpool & Wolverine" className="w-full h-full object-cover" />
              </div>
              <div className="p-6 flex flex-col justify-between flex-1">
                <div>
                  <h3 className="text-xl font-bold text-[var(--text-main)] mb-1">Deadpool & Wolverine</h3>
                  <p className="text-sm text-[var(--text-muted)] mb-4">Fri, Aug 23, 2025 • 7:00 PM</p>
                  
                  <div className="flex gap-6 mb-4">
                    <div>
                      <p className="text-xs text-[var(--text-muted)] uppercase font-semibold">Row</p>
                      <p className="text-lg font-bold text-[var(--primary)]">F</p>
                    </div>
                    <div>
                      <p className="text-xs text-[var(--text-muted)] uppercase font-semibold">Seats</p>
                      <p className="text-lg font-bold text-[var(--primary)]">14, 15</p>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-3 mt-4">
                  <button className="flex-1 bg-[var(--primary)] text-white text-sm font-semibold py-2.5 rounded-lg hover:opacity-90 transition text-center">View E-Ticket</button>
                  <button className="flex-1 bg-[var(--bg-soft)] text-[var(--text-main)] text-sm font-semibold py-2.5 rounded-lg border border-[var(--line)] hover:bg-slate-50 transition text-center">Get Directions</button>
                </div>
              </div>
            </div>

            {/* Past Booking Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-[var(--line)] overflow-hidden flex flex-col sm:flex-row opacity-75 grayscale-[20%]">
              <div className="absolute top-4 right-4 bg-slate-100 text-slate-500 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">Past Event</div>
              <div className="w-full sm:w-48 h-40 bg-slate-100">
                <img src="https://picsum.photos/seed/dune2/800/1200" alt="Dune Part Two" className="w-full h-full object-cover" />
              </div>
              <div className="p-5 flex flex-col justify-between flex-1">
                <div>
                  <h3 className="text-lg font-bold text-[var(--text-main)] mb-1">Dune: Part Two</h3>
                  <p className="text-sm text-[var(--text-muted)] mb-4">Sat, Feb 28, 2024 • 2:30 PM</p>
                </div>
                <button className="bg-[var(--bg-soft)] text-[var(--text-main)] text-sm font-semibold py-2 rounded-lg border border-[var(--line)] hover:bg-slate-50 transition text-center">Rate your experience</button>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-[var(--line)] p-6">
              <div className="w-16 h-16 bg-[var(--primary-light)] text-[var(--primary)] rounded-full flex items-center justify-center text-2xl font-bold mb-4">A</div>
              <h3 className="text-lg font-bold text-[var(--text-main)]">Alex Johnson</h3>
              <p className="text-sm text-[var(--text-muted)] mb-6">alex.johnson@example.com</p>
              
              <div className="space-y-3">
                <button className="w-full text-left px-4 py-3 text-sm font-semibold text-[var(--text-main)] bg-[var(--bg-soft)] hover:bg-slate-50 rounded-lg transition">Edit Profile</button>
                <button className="w-full text-left px-4 py-3 text-sm font-semibold text-[var(--text-main)] bg-[var(--bg-soft)] hover:bg-slate-50 rounded-lg transition">Payment Methods</button>
                <button className="w-full text-left px-4 py-3 text-sm font-semibold text-[var(--text-main)] bg-[var(--bg-soft)] hover:bg-slate-50 rounded-lg transition">Notification Preferences</button>
                <button className="w-full text-left px-4 py-3 text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition mt-4">Sign Out</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
