"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useAuth } from "../lib/auth-context";
import { getEvents, searchEvents } from "../lib/api";
import { formatCurrency, type EventResponse } from "@flashdrop/shared";

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

function MovieCardImage({ src, alt, name }: { src?: string; alt: string; name: string }) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className="absolute inset-0 bg-gradient-to-br from-[#1a1145] via-[#2d1b69] to-[#0f172a] flex flex-col items-center justify-center p-4">
        <svg className="w-10 h-10 mb-2 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" /></svg>
        <span className="text-white font-bold text-xs text-center leading-tight">{name}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      onError={() => setFailed(true)}
      className="object-cover w-full h-full transition duration-500 group-hover:scale-105"
    />
  );
}

export default function Home() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<EventResponse[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeFilter, setActiveFilter] = useState("All");
  
  const debouncedQuery = useDebounce(searchQuery, 300);
  const searchRef = useRef<HTMLDivElement>(null);
  
  const { user, logout } = useAuth();

  useEffect(() => {
    if (debouncedQuery.trim()) {
      setIsSearching(true);
      searchEvents(debouncedQuery).then(results => {
        setSearchResults(results);
        setIsSearching(false);
        setShowDropdown(true);
      }).catch(() => setIsSearching(false));
    } else {
      setSearchResults([]);
      setShowDropdown(false);
    }
  }, [debouncedQuery]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    getEvents()
      .then(data => {
        setEvents(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const categories = ["All", "Concert", "Sports", "Sci-Fi", "Animation", "Comedy", "Musical"];

  const filteredEvents = activeFilter === "All" 
    ? events 
    : events.filter((e: any) => {
        if (activeFilter === "Sci-Fi") return ["Sci-Fi Thriller", "Sci-Fi"].includes(e.genre);
        return e.genre === activeFilter;
      });

  const formatEventDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return {
      day: d.toLocaleDateString("en-IN", { day: "2-digit" }),
      month: d.toLocaleDateString("en-IN", { month: "short" }).toUpperCase(),
      time: d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }).toUpperCase()
    };
  };

  return (
    <div className="min-h-screen bg-[var(--bg-main)]">
      {/* ─── Top Navigation ─── */}
      <nav className="w-full bg-white border-b border-[var(--line)] sticky top-0 z-50">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3 md:px-8">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-1.5">
            <div className="w-8 h-8 bg-[var(--primary)] rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>
            </div>
            <span className="text-xl font-extrabold tracking-tight text-[var(--text-main)]">
              book<span className="text-[var(--primary)]">my</span>seat
            </span>
          </Link>

          {/* Search */}
          <div className="hidden md:flex flex-1 max-w-lg mx-8" ref={searchRef}>
            <div className="relative w-full">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => { if (searchResults.length > 0) setShowDropdown(true); }}
                placeholder="Search for Movies, Events, Plays, Sports..."
                className="w-full bg-[var(--bg-soft)] border border-[var(--line)] rounded-full pl-10 pr-4 py-2.5 text-sm text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] transition"
              />
              
              {/* Search Dropdown */}
              {showDropdown && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl border border-[var(--line)] shadow-xl overflow-hidden z-50">
                  {isSearching ? (
                    <div className="p-4 text-center text-sm text-[var(--text-muted)]">Searching...</div>
                  ) : searchResults.length > 0 ? (
                    <div className="flex flex-col">
                      {searchResults.map(result => (
                        <Link 
                          href={`/event/${result.id}`} 
                          key={result.id}
                          className="px-4 py-3 hover:bg-[var(--bg-soft)] transition border-b border-[var(--line)] last:border-0 flex justify-between items-center"
                        >
                          <div>
                            <div className="text-sm font-bold text-[var(--text-main)]">{result.name}</div>
                            <div className="text-xs text-[var(--text-muted)]">{result.description.substring(0, 50)}...</div>
                          </div>
                          <svg className="w-4 h-4 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-sm text-[var(--text-muted)]">No results found</div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-4">
                <Link href="/tickets" className="text-sm font-semibold text-[var(--primary)] hidden sm:block hover:underline">
                  My Tickets
                </Link>
                <div className="w-px h-5 bg-[var(--line)] hidden sm:block"></div>
                <Link href="/profile" className="flex items-center gap-3 hover:opacity-80 transition">
                  <div className="w-8 h-8 bg-[var(--primary-light)] text-[var(--primary)] rounded-full flex items-center justify-center text-sm font-bold">
                    {user.name?.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-semibold text-[var(--text-main)] hidden sm:block">{user.name}</span>
                </Link>
                <button onClick={logout} className="text-xs text-[var(--text-muted)] hover:text-[var(--primary)] transition ml-1">Logout</button>
              </div>
            ) : (
              <Link href="/login" className="bg-[var(--primary)] text-white font-semibold text-sm px-5 py-2.5 rounded-lg hover:bg-[var(--primary-hover)] transition shadow-sm">
                Sign in
              </Link>
            )}
          </div>
        </div>

      </nav>


      {/* ─── Hero Banner ─── */}
      <div className="bg-gradient-to-br from-[#1a1145] via-[#2d1b69] to-[#0f172a] py-12 px-4">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-2xl overflow-hidden bg-gradient-to-r from-[var(--primary)] to-[#9333ea] p-8 md:p-12 text-white relative">
            <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl"></div>
            <div className="relative z-10 max-w-xl">
              <p className="text-sm font-semibold uppercase tracking-widest text-white/80 mb-2">🎬 Trending Now</p>
              <h1 className="text-3xl md:text-4xl font-extrabold mb-3 leading-tight">Book tickets for the latest blockbusters</h1>
              <p className="text-white/70 mb-6 text-lg">Discover and book movies, concerts, plays and sporting events near you — all with real-time seat selection.</p>
              <div className="flex gap-3">
                <a href="#movies" className="bg-white text-[var(--primary)] font-bold text-sm px-6 py-3 rounded-lg hover:bg-white/90 transition shadow-lg">
                  Explore Now
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

        {/* Recommended Events Header */}
        <div className="mx-auto max-w-7xl px-4 mt-12 mb-6 md:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <h2 className="text-2xl font-extrabold tracking-tight text-[var(--text-main)]">Recommended Events</h2>
            <Link href="#" className="text-sm font-semibold text-[var(--primary)] hover:underline">See All &rsaquo;</Link>
          </div>
          
          {/* Filter Pills */}
          <div className="flex items-center gap-3 mt-6 overflow-x-auto pb-2 scrollbar-hide">
            {categories.map(cat => (
              <button 
                key={cat}
                onClick={() => setActiveFilter(cat)}
                className={`whitespace-nowrap px-5 py-2 rounded-full text-sm font-semibold transition ${
                  activeFilter === cat 
                    ? 'bg-[var(--primary)] text-white shadow-sm border border-[var(--primary)]' 
                    : 'bg-white text-[var(--text-main)] border border-[var(--line)] hover:border-[var(--primary)]/50 hover:bg-[var(--bg-soft)]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Movie Grid */}
        <main id="movies" className="mx-auto w-full max-w-7xl px-4 py-10 md:px-8">
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-6">
            {[1,2,3,4].map(i => (
              <div key={i} className="animate-fade-in-up" style={{animationDelay: `${i * 80}ms`}}>
                <div className="aspect-[2/3] w-full skeleton mb-4"></div>
                <div className="h-5 w-3/4 skeleton mb-2"></div>
                <div className="h-4 w-1/2 skeleton"></div>
              </div>
            ))}
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-[var(--bg-soft)] rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" /></svg>
            </div>
            <h3 className="text-lg font-semibold text-[var(--text-main)] mb-1">No events available</h3>
            <p className="text-sm text-[var(--text-muted)]">Make sure the API server is running and the database is seeded.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-6">
            {filteredEvents.map((event, i) => (
              <Link href={`/event/${event.id}`} key={event.id} className="group animate-fade-in-up" style={{animationDelay: `${i * 60}ms`}}>
                <div className="relative aspect-[2/3] w-full overflow-hidden rounded-2xl bg-[var(--bg-soft)] mb-3 shadow-sm group-hover:shadow-xl transition-all duration-300">
                  <MovieCardImage src={event.posterUrl} alt={event.name} name={event.name} />
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition duration-300 flex items-end p-4 z-10">
                    <span className="text-white text-sm font-semibold">Book Now →</span>
                  </div>
                  {/* Genre badge */}
                  <div className="absolute top-3 left-3 z-10">
                    <span className="bg-white/90 backdrop-blur-sm text-[var(--text-main)] text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-sm">
                      {event.genre}
                    </span>
                  </div>
                  {/* Date badge */}
                  {event.releaseDate && (() => {
                    const d = formatEventDate(event.releaseDate);
                    return d ? (
                      <div className="absolute top-3 right-3 z-10 bg-[var(--primary)] text-white rounded-lg px-2 py-1 text-center shadow-md">
                        <div className="text-[11px] font-black leading-none">{d.day}</div>
                        <div className="text-[9px] font-bold leading-none opacity-90">{d.month}</div>
                      </div>
                    ) : null;
                  })()}
                </div>
                <h3 className="font-bold text-[var(--text-main)] text-sm leading-snug group-hover:text-[var(--primary)] transition line-clamp-2 mb-1">{event.name}</h3>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  {event.releaseDate && (
                    <span className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      {new Date(event.releaseDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                  )}
                  <span className="text-xs font-bold text-[var(--primary)] ml-auto">{formatCurrency(event.price / 100)}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* ─── Footer ─── */}
      <footer className="border-t border-[var(--line)] bg-white mt-12">
        <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-[var(--primary)] rounded flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>
            </div>
            <span className="text-sm font-bold text-[var(--text-main)]">bookmyseat</span>
          </div>
          <p className="text-xs text-[var(--text-muted)]">© 2026 BookMySeat. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="/dashboard" className="text-xs text-[var(--text-muted)] hover:text-[var(--primary)] transition">My Profile</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
