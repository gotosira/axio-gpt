"use client";
import { useEffect, useState } from "react";

export default function ResetPasswordPage() {
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("token") || "";
    setToken(t);
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (!token) { setMessage("Invalid or missing token"); return; }
    if (!password || password !== confirm) { setMessage("Passwords do not match"); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Reset failed');
      setMessage('Password updated. You may now sign in.');
      setTimeout(()=>{ window.location.href = '/login'; }, 1200);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Reset failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#eef2f6] text-[#0f172a] flex items-center justify-center px-6">
      <form onSubmit={submit} className="w-full max-w-md bg-white border border-[#e5eaf1] rounded-lg p-6">
        <h1 className="text-xl font-semibold">Set a new password</h1>
        <p className="text-sm text-[#6b7280] mt-1">Enter and confirm your new password.</p>
        {message && (
          <div className="mt-3 p-3 text-sm rounded border" style={{background:'#f8fafc', borderColor:'#e5eaf1'}}>{message}</div>
        )}
        <div className="mt-4">
          <label className="text-sm font-medium" htmlFor="password">New password</label>
          <input id="password" type="password" className="mt-1 w-full h-10 rounded-md border border-[#cfd8e3] px-3 bg-white" value={password} onChange={(e)=>setPassword(e.target.value)} required />
        </div>
        <div className="mt-4">
          <label className="text-sm font-medium" htmlFor="confirm">Confirm password</label>
          <input id="confirm" type="password" className="mt-1 w-full h-10 rounded-md border border-[#cfd8e3] px-3 bg-white" value={confirm} onChange={(e)=>setConfirm(e.target.value)} required />
        </div>
        <button type="submit" disabled={loading} className="mt-6 w-full h-10 rounded-md bg-[#0b5cd6] text-white font-semibold hover:bg-[#0a56c8]">{loading ? 'Updating…' : 'Update password'}</button>
      </form>
    </div>
  );
}


