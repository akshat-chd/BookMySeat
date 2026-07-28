"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  EventResponse,
  SeatResponse
} from "@flashdrop/shared";
import { formatCurrency } from "@flashdrop/shared";
import { io, type Socket } from "socket.io-client";
import { getEvent, getSeats, reserveSeat } from "../lib/api";
import { useAuth } from "../lib/auth-context";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL;

export function SaleConsole({ eventId }: { eventId: string }) {
  const [eventData, setEventData] = useState<EventResponse | null>(null);
  const [seats, setSeats] = useState<SeatResponse[]>([]);
  const [selectedSeats, setSelectedSeats] = useState<SeatResponse[]>([]);
  const [reserving, setReserving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    const load = async () => {
      const [eventResponse, seatsResponse] = await Promise.all([
        getEvent(eventId).catch(() => null),
        getSeats(eventId).catch(() => [])
      ]);
      setEventData(eventResponse);
      setSeats(seatsResponse);
    };

    void load();
    const dataInterval = window.setInterval(() => {
      void getSeats(eventId).then(setSeats).catch(() => undefined);
    }, 3000);

    return () => {
      window.clearInterval(dataInterval);
    };
  }, [eventId]);

  useEffect(() => {
    if (!socketRef.current) {
      socketRef.current = io(SOCKET_URL ?? window.location.origin, {
        path: "/socket.io"
      });

      socketRef.current.on("seat:locked", (payload: any) => {
        if (payload.eventId === eventId) {
          setSeats(prev => prev.map(s => payload.seatIds.includes(s.id) ? { ...s, status: "LOCKED" } : s));
        }
      });

      socketRef.current.on("seat:sold", (payload: any) => {
        if (payload.eventId === eventId) {
          setSeats(prev => prev.map(s => payload.seatIds.includes(s.id) ? { ...s, status: "SOLD" } : s));
        }
      });

      socketRef.current.emit("join-event", eventId);
    }

    return () => {
      socketRef.current?.disconnect();
    };
  }, [eventId]);

  const toggleSeat = (seat: SeatResponse) => {
    if (seat.status !== "AVAILABLE") return;
    setError(null);

    setSelectedSeats(prev => {
      const isSelected = prev.some(s => s.id === seat.id);
      if (isSelected) {
        return prev.filter(s => s.id !== seat.id);
      } else {
        if (prev.length >= 10) {
          setError("You can only select up to 10 seats.");
          return prev;
        }
        return [...prev, seat];
      }
    });
  };

  const handleCheckout = async () => {
    if (!user) {
      router.push("/login");
      return;
    }
    if (selectedSeats.length === 0) return;

    setReserving(true);
    setError(null);

    try {
      const idempotencyKey = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
      const seatIds = selectedSeats.map(s => s.id);

      const response = await reserveSeat(eventId, seatIds, user.id, idempotencyKey);

      if (response.status === "SOLD_OUT") {
        setError("One or more selected seats are no longer available. Please try again.");
        setSelectedSeats([]);
        setReserving(false);
        return;
      }

      if (response.status === "RESERVED" && response.reservationId) {
        router.push(`/checkout/${response.reservationId}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect to server.");
      setReserving(false);
    }
  };

  const getSeatMultiplier = (row: string) => {
    if (['A', 'B', 'C'].includes(row)) return 1.5;
    if (['D', 'E', 'F', 'G'].includes(row)) return 1;
    return 0.8;
  };

  const getSeatTierName = (row: string) => {
    if (['A', 'B', 'C'].includes(row)) return "VIP";
    if (['D', 'E', 'F', 'G'].includes(row)) return "Standard";
    return "Economy";
  };

  const getSeatTierClass = (row: string) => {
    if (['A', 'B', 'C'].includes(row)) return "border-[#d4af37] text-[#d4af37]"; // Gold for VIP
    if (['D', 'E', 'F', 'G'].includes(row)) return "border-[var(--primary)] text-[var(--primary)]"; // Blue for Standard
    return "border-gray-400 text-gray-500"; // Gray for Economy
  };

  const sortedSeats = [...seats].sort((a, b) => {
    if (a.row === b.row) return a.number - b.number;
    return a.row.localeCompare(b.row);
  });

  const basePrice = eventData?.price ?? 0;
  const totalPrice = selectedSeats.reduce((sum, seat) => {
    return sum + (basePrice * getSeatMultiplier(seat.row));
  }, 0) / 100;

  if (!eventData) return null;

  const availableCount = seats.filter(s => s.status === "AVAILABLE").length;

  return (
    <div className="flex flex-col w-full pb-32">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-8 md:px-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-extrabold text-[var(--text-main)]">Select Your Seats</h2>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              {eventData?.name} — <span className="font-semibold text-[var(--primary)]">{formatCurrency((eventData?.price || 0) / 100)}</span> per ticket
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2 bg-[var(--signal-light)] text-[var(--signal)] text-xs font-bold px-3 py-1.5 rounded-full">
            <span className="w-2 h-2 bg-[var(--signal)] rounded-full animate-pulse"></span>
            {availableCount} seats available
          </div>
        </div>

        {error && (
          <div className="bg-[var(--danger-light)] border border-red-200 text-red-700 p-4 rounded-xl text-sm font-medium flex items-center gap-2">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            {error}
          </div>
        )}

        {/* Seat Map */}
        <section className="panel p-6 md:p-10 relative overflow-hidden">
          {/* Subtle pattern */}
          <div className="absolute inset-0 opacity-[0.015] bg-[linear-gradient(to_right,#9ca3af_1px,transparent_1px),linear-gradient(to_bottom,#9ca3af_1px,transparent_1px)] bg-[size:20px_20px]"></div>

          <div className="relative z-10 flex flex-col items-center">
            {/* Screen */}
            <div className="w-full max-w-3xl mb-12">
              <div className="h-10 bg-gradient-to-b from-[var(--bg-soft)] to-transparent rounded-t-[100%] flex items-center justify-center border-t-2 border-[var(--line)]">
                <span className="uppercase tracking-[0.5em] text-[var(--text-muted)] text-[10px] font-bold mt-1">SCREEN THIS WAY</span>
              </div>
            </div>

            {/* Seats Grid */}
            <div className="flex flex-col gap-2 md:gap-3 max-w-full overflow-x-auto pb-4 px-2">
              {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'].map((rowLabel) => {
                const rowSeats = sortedSeats.filter(s => s.row === rowLabel);
                if (!rowSeats.length) return null;

                return (
                  <div key={`row-${rowLabel}`} className="flex items-center gap-3 min-w-max">
                    <div className="w-5 font-mono text-[var(--text-muted)] font-bold text-center text-xs">{rowLabel}</div>

                    <div className="flex gap-1.5">
                      {rowSeats.map((seat) => {
                        const isSelected = selectedSeats.some(s => s.id === seat.id);
                        return (
                          <button
                            key={seat.id}
                            onClick={() => toggleSeat(seat)}
                            disabled={seat.status !== "AVAILABLE"}
                            className={`seat w-8 h-9 md:w-10 md:h-11 rounded-t-lg rounded-b-sm flex items-center justify-center text-[10px] md:text-xs font-bold transition-all border-2
                              ${seat.status === 'AVAILABLE' && !isSelected
                                ? `bg-[var(--bg-soft)] ${getSeatTierClass(seat.row)} hover:bg-[var(--primary-light)] hover:-translate-y-0.5 cursor-pointer`
                                : ''}
                              ${seat.status === 'LOCKED'
                                ? 'bg-[var(--warning-light)] border-[var(--warning)] text-[var(--warning)] cursor-not-allowed'
                                : ''}
                              ${seat.status === 'SOLD'
                                ? 'bg-[var(--bg-soft)] border-gray-200 text-gray-300 cursor-not-allowed opacity-40 line-through'
                                : ''}
                              ${isSelected
                                ? '!bg-[var(--primary)] !text-white ring-2 ring-[var(--primary)]/30 -translate-y-0.5 shadow-md border-[var(--primary)]'
                                : ''}
                            `}
                            title={`Seat ${seat.row}${seat.number} (${getSeatTierName(seat.row)}) — ${seat.status}`}
                          >
                            {seat.number}
                          </button>
                        );
                      })}
                    </div>

                    <div className="w-5 font-mono text-[var(--text-muted)] font-bold text-center text-xs">{rowLabel}</div>
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-5 mt-10 text-xs font-medium text-[var(--text-secondary)] justify-center">
              <div className="flex items-center gap-2"><div className="w-5 h-5 bg-[var(--bg-soft)] rounded-t-md rounded-b-sm border-2 border-[#d4af37]" /> VIP (1.5x)</div>
              <div className="flex items-center gap-2"><div className="w-5 h-5 bg-[var(--bg-soft)] rounded-t-md rounded-b-sm border-2 border-[var(--primary)]" /> Standard (1x)</div>
              <div className="flex items-center gap-2"><div className="w-5 h-5 bg-[var(--bg-soft)] rounded-t-md rounded-b-sm border-2 border-gray-400" /> Economy (0.8x)</div>
              <div className="flex items-center gap-2 ml-4"><div className="w-5 h-5 bg-[var(--primary)] rounded-t-md rounded-b-sm" /> <span className="text-[var(--primary)] font-semibold">Selected</span></div>
              <div className="flex items-center gap-2"><div className="w-5 h-5 bg-[var(--warning-light)] rounded-t-md rounded-b-sm" /> In Another Cart</div>
              <div className="flex items-center gap-2"><div className="w-5 h-5 bg-[var(--bg-soft)] rounded-t-md rounded-b-sm opacity-40 border border-[var(--line)]" /> Sold</div>
            </div>
          </div>
        </section>
      </div>

      {/* Sticky Bottom Checkout Bar */}
      {selectedSeats.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[var(--line)] p-4 md:p-5 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] z-50 animate-fade-in-up">
          <div className="mx-auto max-w-7xl flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <div className="flex flex-col">
                <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-bold">Selected ({selectedSeats.length})</span>
                <span className="text-sm font-bold text-[var(--text-main)] max-w-xs truncate">
                  {selectedSeats.map(s => `${s.row}${s.number}`).join(", ")}
                </span>
              </div>
              <div className="w-px h-8 bg-[var(--line)] hidden md:block"></div>
              <div className="flex flex-col">
                <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-bold">Total</span>
                <span className="text-xl font-extrabold text-[var(--primary)]">{formatCurrency(totalPrice)}</span>
              </div>
            </div>

            <button
              onClick={handleCheckout}
              disabled={reserving}
              className="bg-[var(--primary)] text-white px-8 py-3.5 rounded-xl font-bold text-sm hover:bg-[var(--primary-hover)] transition shadow-md w-full md:w-auto disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {reserving ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                  Locking Seats...
                </>
              ) : (
                "Proceed to Checkout"
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
