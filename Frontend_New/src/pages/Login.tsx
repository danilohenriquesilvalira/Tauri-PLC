import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { EclusaScene } from '../components/login/EclusaScene';
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
    <div className="fixed inset-0 overflow-hidden select-none">

      {/* ── 3D Background ───────────────────────────────────── */}
      <div className="absolute inset-0 z-0">
        <EclusaScene />
      </div>

      {/* ── Gradient vignette ───────────────────────────────── */}
      <div className="absolute inset-0 z-[1] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at center, transparent 30%, #020B18 100%)' }}
      />
      <div className="absolute inset-0 z-[1] pointer-events-none bg-gradient-to-b from-[#020B18]/50 via-transparent to-[#020B18]/70" />

      {/* ── Login panel ─────────────────────────────────────── */}
      <div className="absolute inset-0 z-10 flex items-center justify-center p-4">
        <div className={`w-full max-w-[360px] animate-fade-in-up ${shake ? 'animate-shake' : ''}`}>

          {/* Card único — branding + formulário, tudo contido */}
          <div
            className="rounded-2xl overflow-hidden shadow-2xl relative"
            style={{
              background: 'linear-gradient(165deg, rgba(14,40,58,0.95), rgba(7,15,28,0.97))',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 25px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.07)',
            }}
          >
            {/* Faixa de destaque no topo do card */}
            <div
              className="absolute top-0 left-0 right-0 h-[3px]"
              style={{ background: 'linear-gradient(90deg, #00A651, #28FF52, #00D2C8)' }}
            />

            {/* Branding */}
            <div className="flex flex-col items-center px-6 pt-8 pb-5 border-b border-white/[0.07]">
              <img
                src="/EDP_Original.svg"
                alt="EDP"
                className="h-8 w-auto brightness-0 invert opacity-90 select-none mb-4"
                draggable={false}
              />
              <h1 className="text-white text-[20px] font-light tracking-[0.08em] uppercase text-center leading-tight">
                Eclusa de Navegação
              </h1>
              <p className="text-[#28FF52]/80 text-[10px] tracking-[0.24em] mt-1.5 uppercase font-medium">
                Crestuma-Lever
              </p>
              <p className="text-white/35 text-[9px] tracking-[0.2em] mt-2 uppercase">
                Sistema de Gestão Integrada
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 px-6 py-6" autoComplete="off">

              {/* Username */}
              <div className="space-y-1.5">
                <label className="block text-white/45 text-[10px] tracking-[0.18em] uppercase font-medium">
                  Utilizador
                </label>
                <div
                  className="flex items-center gap-3 rounded-xl px-3.5 py-3 transition-all duration-200 focus-within:ring-1 focus-within:ring-[#28FF52]/40"
                  style={{ background: 'rgba(255,255,255,0.09)', border: '1px solid rgba(255,255,255,0.14)' }}
                >
                  <svg className="w-4 h-4 text-white/30 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                  <input
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="Introduza o utilizador"
                    className="flex-1 bg-transparent text-white text-sm placeholder:text-white/20 outline-none"
                    autoComplete="off"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="block text-white/45 text-[10px] tracking-[0.18em] uppercase font-medium">
                  Palavra-passe
                </label>
                <div
                  className="flex items-center gap-3 rounded-xl px-3.5 py-3 transition-all duration-200 focus-within:ring-1 focus-within:ring-[#28FF52]/40"
                  style={{ background: 'rgba(255,255,255,0.09)', border: '1px solid rgba(255,255,255,0.14)' }}
                >
                  <svg className="w-4 h-4 text-white/30 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="flex-1 bg-transparent text-white text-sm placeholder:text-white/20 outline-none"
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(v => !v)}
                    className="text-white/30 hover:text-white/60 transition-colors flex-shrink-0"
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
                <div
                  className="rounded-xl px-3.5 py-2.5"
                  style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)' }}
                >
                  <p className="text-red-400 text-[11px] text-center leading-snug">{error}</p>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full relative overflow-hidden rounded-xl py-3.5 text-[13px] font-semibold tracking-wide transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed mt-1"
                style={{
                  background: loading
                    ? 'linear-gradient(135deg, #00803F, #1FCC44)'
                    : 'linear-gradient(135deg, #00A651, #28FF52)',
                  color: '#020B18',
                  boxShadow: '0 0 24px rgba(40,255,82,0.25)',
                }}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a10 10 0 00-10 10h4z" />
                    </svg>
                    A verificar...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    ENTRAR NO SISTEMA
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </span>
                )}
              </button>

            </form>
          </div>

          {/* Footer */}
          <p className="text-center text-white/45 text-[9px] mt-6 tracking-[0.18em] uppercase">
            EDP Produção · Eclusa de Navegação · Crestuma-Lever · © {new Date().getFullYear()}
          </p>
        </div>
      </div>

    </div>
  );
}
