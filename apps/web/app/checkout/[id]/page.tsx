"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { io, type Socket } from "socket.io-client";
import QRCode from "react-qr-code";
import type { SaleUiStatus } from "@flashdrop/shared";
import { API_BASE_URL, getReservation } from "../../../lib/api";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL;

export default function CheckoutPage() {
  const { id } = useParams();
  const socketRef = useRef<Socket | null>(null);

  const [status, setStatus] = useState<SaleUiStatus>("RESERVED");
  const [message, setMessage] = useState("Your seats are locked. Complete your purchase below.");

  useEffect(() => {
    let isMounted = true;

    // Check initial reservation status from REST API
    if (id) {
      getReservation(id as string)
        .then((data) => {
          if (!isMounted) return;
          if (data.status === "CONVERTED") {
            setStatus("CONFIRMED");
            setMessage("Your seats are confirmed! Enjoy the show.");
          } else if (data.status === "EXPIRED") {
            setStatus("ERROR");
            setMessage("Payment failed or your reservation expired.");
          }
        })
        .catch(() => {});
    }

    if (!socketRef.current) {
      socketRef.current = io(SOCKET_URL ?? window.location.origin, {
        path: "/socket.io"
      });

      socketRef.current.on("order:processing", () => {
        setStatus("PROCESSING");
        setMessage("Processing your payment securely...");
      });

      socketRef.current.on("order:confirmed", () => {
        setStatus("CONFIRMED");
        setMessage("Your seats are confirmed! Enjoy the show.");
      });

      socketRef.current.on("order:failed", () => {
        setStatus("ERROR");
        setMessage("Payment failed or your reservation expired.");
      });

      socketRef.current.emit("join-reservation", id);
    }

    return () => {
      isMounted = false;
      socketRef.current?.disconnect();
    };
  }, [id]);

  const handleSimulatePayment = async () => {
    setStatus("PROCESSING");
    setMessage("Processing your payment securely...");

    // Poll REST API to confirm state update in case socket event was already missed
    for (let i = 0; i < 5; i++) {
      await new Promise((r) => setTimeout(r, 600));
      try {
        const data = await getReservation(id as string);
        if (data.status === "CONVERTED") {
          setStatus("CONFIRMED");
          setMessage("Your seats are confirmed! Enjoy the show.");
          return;
        } else if (data.status === "EXPIRED") {
          setStatus("ERROR");
          setMessage("Payment failed or your reservation expired.");
          return;
        }
      } catch (err) {}
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-main)] flex flex-col">
      {/* Navigation */}
      <nav className="w-full bg-white border-b border-[var(--line)]">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3 md:px-8">
          <Link href="/" className="flex items-center gap-1.5">
            <div className="w-7 h-7 bg-[var(--primary)] rounded-md flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>
            </div>
            <span className="text-lg font-extrabold tracking-tight text-[var(--text-main)]">book<span className="text-[var(--primary)]">my</span>seat</span>
          </Link>
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
            <span className="w-6 h-6 bg-[var(--primary)] text-white rounded-full flex items-center justify-center text-[10px] font-bold">1</span>
            <span className="font-medium">Select Seats</span>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            <span className="w-6 h-6 bg-[var(--primary)] text-white rounded-full flex items-center justify-center text-[10px] font-bold">2</span>
            <span className="font-bold text-[var(--text-main)]">Payment</span>
          </div>
        </div>
      </nav>

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          {/* Checkout Card */}
          <div className="panel p-8 md:p-10 text-center">
            <h1 className="text-2xl font-extrabold text-[var(--text-main)] mb-2">Checkout</h1>
            <p className="text-sm text-[var(--text-muted)] mb-8">
              Reservation: <code className="bg-[var(--bg-soft)] text-[var(--text-secondary)] text-xs px-2 py-1 rounded-md font-mono">{id}</code>
            </p>

            {/* Reserved State */}
            {status === "RESERVED" && (
              <div className="bg-[var(--bg-soft)] border border-[var(--line)] p-6 rounded-2xl">
                <div className="w-12 h-12 bg-[var(--primary-light)] rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-[var(--primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                </div>
                <p className="text-sm text-[var(--text-secondary)] font-medium mb-6">{message}</p>
                <button
                  onClick={handleSimulatePayment}
                  className="w-full bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-bold py-4 rounded-xl transition shadow-md text-sm"
                >
                  Pay Now (Simulated)
                </button>
                <p className="text-[10px] text-[var(--text-muted)] mt-3">This will securely confirm your booking</p>
              </div>
            )}

            {/* Processing State */}
            {status === "PROCESSING" && (
              <div className="bg-[var(--primary-light)] border border-[var(--primary)]/20 p-8 rounded-2xl">
                <div className="w-12 h-12 bg-[var(--primary)] rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-white animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                </div>
                <h3 className="text-lg font-bold text-[var(--text-main)] mb-2">Processing Payment...</h3>
                <p className="text-sm text-[var(--text-secondary)]">{message}</p>
              </div>
            )}

            {/* Confirmed State */}
            {status === "CONFIRMED" && (
              <div className="bg-[var(--signal-light)] border border-green-200 p-8 rounded-2xl">
                <div className="w-16 h-16 bg-[var(--signal)] rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                </div>
                <h3 className="text-2xl font-extrabold text-[var(--text-main)] mb-2">Tickets Confirmed! 🎉</h3>
                <p className="text-sm text-[var(--text-secondary)] mb-6">{message}</p>
                
                <div className="flex justify-center mb-6">
                  <div className="p-4 bg-white rounded-2xl shadow-sm border border-[var(--line)]">
                    <QRCode value={id as string} size={160} level="H" />
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <Link
                    href="/tickets"
                    className="inline-flex justify-center items-center gap-2 bg-[var(--text-main)] text-white font-semibold py-3 px-8 rounded-xl hover:bg-[var(--text-secondary)] transition text-sm"
                  >
                    View My Tickets
                  </Link>
                  <Link href="/" className="text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text-main)] transition">
                    Back to Home
                  </Link>
                </div>
              </div>
            )}

            {/* Error State */}
            {status === "ERROR" && (
              <div className="bg-[var(--danger-light)] border border-red-200 p-8 rounded-2xl">
                <div className="w-16 h-16 bg-[var(--danger)] rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                </div>
                <h3 className="text-2xl font-extrabold text-[var(--text-main)] mb-2">Transaction Failed</h3>
                <p className="text-sm text-[var(--text-secondary)] mb-6">{message}</p>
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 bg-[var(--text-main)] text-white font-semibold py-3 px-8 rounded-xl hover:bg-[var(--text-secondary)] transition text-sm"
                >
                  Go Back
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
