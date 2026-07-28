"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../lib/auth-context";
import Link from "next/link";
import { API_BASE_URL, sendOtp } from "../../lib/api";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [demoOtp, setDemoOtp] = useState<string | null>(null);
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await sendOtp(email);
      setOtpSent(true);
      if (data.otp) {
        setDemoOtp(data.otp);
      }
    } catch (err: any) {
      setError(err.message || "Failed to send verification code");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const endpoint = isRegister ? "/auth/register" : "/auth/login";
      const payload = isRegister ? { email, password, name, otp } : { email, password };

      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Authentication failed");
      }

      login(data);
      router.push("/");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setError("");
    setOtpSent(false);
    setDemoOtp(null);
    setOtp("");
  };

  return (
    <div className="min-h-screen bg-[var(--bg-main)] flex">
      {/* Left panel — decorative */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#1a1145] via-[#2d1b69] to-[#0f172a] items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[var(--primary)]/20 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-500/20 rounded-full blur-[100px]"></div>
        <div className="relative z-10 text-white max-w-md">
          <div className="flex items-center gap-2 mb-8">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>
            </div>
            <span className="text-2xl font-extrabold tracking-tight">bookmyseat</span>
          </div>
          <h2 className="text-4xl font-extrabold leading-tight mb-4">Your entertainment,<br />one click away.</h2>
          <p className="text-white/60 text-lg leading-relaxed">Book movies, events, plays and sports with real-time seat availability and seamless checkout.</p>
          <div className="flex gap-6 mt-10 text-sm text-white/50">
            <div className="flex items-center gap-2"><svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> Instant Booking</div>
            <div className="flex items-center gap-2"><svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> Secure Payments</div>
            <div className="flex items-center gap-2"><svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> E-Tickets</div>
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-10">
            <div className="w-8 h-8 bg-[var(--primary)] rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>
            </div>
            <span className="text-xl font-extrabold">book<span className="text-[var(--primary)]">my</span>seat</span>
          </div>

          <h1 className="text-3xl font-extrabold text-[var(--text-main)] mb-2">
            {isRegister ? "Create your account" : "Welcome back"}
          </h1>
          <p className="text-[var(--text-muted)] mb-8 text-base">
            {isRegister ? "Sign up to start booking tickets." : "Sign in to continue booking."}
          </p>

          {error && (
            <div className="bg-[var(--danger-light)] border border-red-200 text-red-700 p-3 rounded-xl mb-6 text-sm font-medium flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              {error}
            </div>
          )}

          {demoOtp && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3.5 rounded-xl mb-6 text-xs font-semibold flex items-center justify-between">
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4 text-emerald-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Verification OTP Code:
              </span>
              <span className="font-mono bg-emerald-100 text-emerald-900 px-2.5 py-1 rounded-md text-sm font-bold tracking-wider">{demoOtp}</span>
            </div>
          )}

          <form onSubmit={isRegister && !otpSent ? handleSendOtp : handleSubmit} className="space-y-5">
            {isRegister && (
              <div>
                <label className="block text-sm font-semibold text-[var(--text-secondary)] mb-1.5">Full Name</label>
                <input
                  type="text"
                  required
                  disabled={otpSent}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-white border border-[var(--line)] rounded-xl px-4 py-3 text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] transition text-sm disabled:opacity-60"
                  placeholder="John Doe"
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-semibold text-[var(--text-secondary)] mb-1.5">Email Address</label>
              <input
                type="email"
                required
                disabled={otpSent}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white border border-[var(--line)] rounded-xl px-4 py-3 text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] transition text-sm disabled:opacity-60"
                placeholder="john@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[var(--text-secondary)] mb-1.5">Password</label>
              <input
                type="password"
                required
                disabled={otpSent}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white border border-[var(--line)] rounded-xl px-4 py-3 text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] transition text-sm disabled:opacity-60"
                placeholder="••••••••"
              />
            </div>

            {isRegister && otpSent && (
              <div>
                <label className="block text-sm font-semibold text-[var(--text-secondary)] mb-1.5">6-Digit Verification Code (OTP)</label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  className="w-full bg-white border-2 border-[var(--primary)] rounded-xl px-4 py-3 text-center text-lg font-mono font-bold tracking-widest text-[var(--text-main)] focus:outline-none transition"
                  placeholder="123456"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-bold py-3.5 rounded-xl transition disabled:opacity-50 text-sm shadow-sm"
            >
              {loading
                ? "Please wait..."
                : isRegister
                ? otpSent
                  ? "Verify OTP & Create Account"
                  : "Send Verification Code"
                : "Sign In"}
            </button>
          </form>

          <div className="mt-8 text-center">
            <button
              onClick={() => {
                setIsRegister(!isRegister);
                resetForm();
              }}
              className="text-sm text-[var(--text-muted)] hover:text-[var(--primary)] transition"
            >
              {isRegister ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
            </button>
          </div>

          <div className="mt-6 text-center">
            <Link href="/" className="text-sm text-[var(--text-muted)] hover:text-[var(--primary)] transition inline-flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
