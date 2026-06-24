import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [shake, setShake]       = useState(false);

  const { login } = useAuth();
  const navigate  = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    await new Promise(r => setTimeout(r, 750));

    const ok = login(username.trim(), password);
    if (ok) {
      navigate('/eclusa-regua', { replace: true });
    } else {
      setError('Credenciais inválidas. Verifique utilizador e palavra-passe.');
      setShake(true);
      setTimeout(() => setShake(false), 550);
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 overflow-hidden select-none bg-white">

      {/* ── Faixas marine blue, topo e base ─────────────────── */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-edp-marine z-0" />
      <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-edp-marine z-0" />

      {/* ── Login panel ─────────────────────────────────────── */}
      <div className="absolute inset-0 z-10 flex items-center justify-center p-4">
        <div className={`w-full max-w-[400px] animate-fade-in-up ${shake ? 'animate-shake' : ''}`}>

          {/* Card único — branding + formulário, tudo contido */}
          <div className="rounded-xl bg-white border border-edp-marine/30 shadow-[0_2px_24px_rgba(33,46,62,0.08)]">

            {/* Branding */}
            <div className="flex flex-col items-center px-8 pt-10 pb-7 border-b border-edp-neutral-white-tint">
              <img
                src="/LOGO_EDP_2025.svg"
                alt="EDP"
                className="h-11 w-auto select-none mb-5"
                draggable={false}
              />
              <h1 className="text-edp-marine text-[20px] font-semibold tracking-[0.02em] text-center leading-tight">
                Eclusa de Navegação
              </h1>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 px-8 pt-6 pb-8" autoComplete="off">

              {/* Username */}
              <div className="space-y-2">
                <label className="block text-black text-[11px] tracking-[0.1em] uppercase font-semibold">
                  Utilizador
                </label>
                <div className="flex items-center gap-3 rounded-lg px-4 py-3 bg-edp-neutral-white-wash border border-edp-neutral-lightest focus-within:border-edp-electric transition-colors duration-150">
                  <svg className="w-4 h-4 text-edp-neutral-medium flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                  <input
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    className="flex-1 bg-transparent text-black text-sm outline-none"
                    autoComplete="off"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <label className="block text-black text-[11px] tracking-[0.1em] uppercase font-semibold">
                  Palavra-passe
                </label>
                <div className="flex items-center gap-3 rounded-lg px-4 py-3 bg-edp-neutral-white-wash border border-edp-neutral-lightest focus-within:border-edp-electric transition-colors duration-150">
                  <svg className="w-4 h-4 text-edp-neutral-medium flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="flex-1 bg-transparent text-black text-sm outline-none"
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(v => !v)}
                    className="text-edp-neutral-medium hover:text-edp-marine transition-colors flex-shrink-0"
                    tabIndex={-1}
                  >
                    {showPw
                      ? <EyeSlashIcon className="w-4 h-4" />
                      : <EyeIcon className="w-4 h-4" />
                    }
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="rounded-lg px-3.5 py-2.5 bg-edp-semantic-light-red border border-edp-semantic-red/30">
                  <p className="text-edp-semantic-red text-[11px] text-center leading-snug font-medium">{error}</p>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg py-3 text-[13px] font-bold tracking-wide bg-edp-electric text-edp-marine transition-opacity duration-150 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a10 10 0 00-10 10h4z" />
                    </svg>
                    A verificar...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    ENTRAR NO SISTEMA
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </span>
                )}
              </button>

            </form>
          </div>

          {/* Footer */}
          <p className="text-center text-edp-neutral-medium text-[10px] mt-6 tracking-[0.12em] uppercase">
            EDP Produção · Eclusa de Navegação · © {new Date().getFullYear()}
          </p>
        </div>
      </div>

    </div>
  );
}
