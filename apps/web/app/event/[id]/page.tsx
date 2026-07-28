"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../../lib/auth-context";
import { getEvent } from "../../../lib/api";
import { formatCurrency } from "@flashdrop/shared";
function EventBanner({ bannerUrl, name }: { bannerUrl?: string; name: string }) {
  const [failed, setFailed] = useState(false);

  if (!bannerUrl || failed) {
    return <div className="absolute inset-0 bg-gradient-to-br from-[#1a1145] via-[#2d1b69] to-[#0f172a]" />;
  }

  return (
    <img
      src={bannerUrl}
      alt={name}
      onError={() => setFailed(true)}
      className="absolute inset-0 w-full h-full object-cover opacity-25 blur-sm"
    />
  );
}

function EventPoster({ posterUrl, name }: { posterUrl?: string; name: string }) {
  const [failed, setFailed] = useState(false);

  if (!posterUrl || failed) {
    return (
      <div className="w-56 h-80 bg-gradient-to-br from-purple-900 to-slate-900 rounded-2xl shadow-2xl ring-1 ring-white/10 flex flex-col items-center justify-center p-6 text-center">
        <svg className="w-14 h-14 text-white/30 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" /></svg>
        <span className="text-white font-bold text-sm leading-tight">{name}</span>
      </div>
    );
  }

  return (
    <img
      src={posterUrl}
      alt={name}
      onError={() => setFailed(true)}
      className="w-56 h-80 object-cover rounded-2xl shadow-2xl ring-1 ring-white/10"
    />
  );
}

export default function EventDetailsPage() {
  const { id } = useParams();
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { user, logout } = useAuth();

  const handleShare = async () => {
    if (!event) return;
    try {
      if (navigator.share) {
        await navigator.share({
          title: event.name,
          text: `Check out ${event.name} on bookmyseat!`,
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        alert("Link copied to clipboard!");
      }
    } catch (err) {
      console.error("Error sharing:", err);
    }
  };

  useEffect(() => {
    getEvent(id as string)
      .then(data => {
        setEvent(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-main)] flex justify-center items-center">
        <div className="w-8 h-8 border-3 border-[var(--primary)] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-[var(--bg-main)] flex flex-col items-center justify-center p-4">
        <h2 className="text-2xl font-bold text-[var(--text-main)] mb-2">Event not found</h2>
        <p className="text-[var(--text-muted)] mb-6">The event you're looking for doesn't exist or has been removed.</p>
        <Link href="/" className="text-sm font-semibold text-[var(--primary)] hover:underline">← Back to Home</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-main)]">
      {/* Navigation */}
      <nav className="w-full bg-white border-b border-[var(--line)] sticky top-0 z-50">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3 md:px-8">
          <Link href="/" className="flex items-center gap-1.5">
            <div className="w-7 h-7 bg-[var(--primary)] rounded-md flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>
            </div>
            <span className="text-lg font-extrabold tracking-tight text-[var(--text-main)]">book<span className="text-[var(--primary)]">my</span>seat</span>
          </Link>
          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-[var(--primary-light)] text-[var(--primary)] rounded-full flex items-center justify-center text-sm font-bold">
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

      {/* Hero Banner */}
      <div className="relative w-full bg-gradient-to-br from-[#1a1145] via-[#2d1b69] to-[#0f172a] overflow-hidden">
        <EventBanner bannerUrl={event.bannerUrl} name={event.name} />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-transparent" />

        <div className="relative mx-auto flex w-full max-w-7xl items-end gap-8 px-4 md:px-8 py-12 md:py-16 min-h-[420px]">
          {/* Poster */}
          <div className="hidden md:block flex-shrink-0">
            <EventPoster posterUrl={event.posterUrl} name={event.name} />
          </div>

          {/* Info */}
          <div className="flex-1 pb-2">
            <span className="inline-flex items-center bg-white/10 backdrop-blur-md text-white text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider mb-4 border border-white/10">
              {event.genre}
            </span>
            <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4 leading-tight max-w-2xl">
              {event.name}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-white/70 font-medium text-sm mb-8">
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                {event.duration} min
              </span>
              <span className="w-1 h-1 bg-white/40 rounded-full"></span>
              <span>{event.genre}</span>
              <span className="w-1 h-1 bg-white/40 rounded-full"></span>
              <span className="font-bold text-white">{formatCurrency(event.price / 100)}</span>
            </div>

            <div className="flex flex-wrap items-center gap-4 mt-8">
              <Link
                href={`/event/${event.id}/book`}
                className="inline-flex items-center gap-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-bold text-base px-8 py-4 rounded-xl transition shadow-lg"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>
                Book Tickets
              </Link>
              
              <button
                onClick={handleShare}
                className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-bold text-base px-6 py-4 rounded-xl transition backdrop-blur-sm"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                Share
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* About */}
      <div className="mx-auto w-full max-w-7xl px-4 py-12 md:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2">
            <h2 className="text-xl font-extrabold text-[var(--text-main)] mb-4">About the Event</h2>
            <p className="text-[var(--text-secondary)] text-base leading-relaxed">
              {event.description}
            </p>
          </div>

          {/* Quick Info Card */}
          <div className="panel p-6 h-fit">
            <h3 className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-wider mb-4">Event Info</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-[var(--bg-soft)] rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <div>
                  <p className="text-xs text-[var(--text-muted)]">Duration</p>
                  <p className="text-sm font-semibold text-[var(--text-main)]">{event.duration} minutes</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-[var(--bg-soft)] rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
                </div>
                <div>
                  <p className="text-xs text-[var(--text-muted)]">Genre</p>
                  <p className="text-sm font-semibold text-[var(--text-main)]">{event.genre}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-[var(--bg-soft)] rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <div>
                  <p className="text-xs text-[var(--text-muted)]">Price</p>
                  <p className="text-sm font-semibold text-[var(--primary)]">{formatCurrency(event.price / 100)}</p>
                </div>
              </div>
              {event.releaseDate && (
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-[var(--primary-light)] rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-[var(--primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--text-muted)]">Date</p>
                    <p className="text-sm font-semibold text-[var(--text-main)]">
                      {new Date(event.releaseDate).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "long", year: "numeric" })}
                    </p>
                    <p className="text-xs text-[var(--primary)] font-semibold">
                      {new Date(event.releaseDate).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }).toUpperCase()}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <Link
              href={`/event/${event.id}/book`}
              className="w-full mt-6 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-bold text-sm py-3 rounded-xl transition block text-center"
            >
              Book Tickets
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
