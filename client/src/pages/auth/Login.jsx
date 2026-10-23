import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, Mail, ArrowRight, User, Terminal } from 'lucide-react';
import { authApi } from '../../api/auth';
import { useToast } from '../../components/Toast';

export default function Login() {
  const [email, setEmail] = useState('ravi.sharma@example.com');
  const [password, setPassword] = useState('SecurePass123!');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { showToast } = useToast();

  const handleLogin = async (e) => {
    e?.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await authApi.login({ email, password });
      if (res.success) {
        showToast(`Authenticated: ${res.data.name}`, 'success');
        if (res.data.role === 'APPLICANT') {
          navigate('/applicant/status');
        } else if (res.data.role === 'CHECKER') {
          navigate('/compliance/dashboard');
        } else {
          navigate('/officer/queue');
        }
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (roleKey) => {
    setLoading(true);
    try {
      const res = await authApi.switchRole(roleKey);
      if (res.success) {
        showToast(`Signed in as ${res.data.name} (${res.data.role})`, 'success');
        if (res.data.role === 'APPLICANT') {
          navigate('/applicant/status');
        } else if (res.data.role === 'CHECKER') {
          navigate('/compliance/dashboard');
        } else {
          navigate('/officer/queue');
        }
      }
    } catch (err) {
      setError('Quick login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070a12] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 text-slate-100 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Minimalist Geometric Mark */}
        <div className="w-10 h-10 rounded-lg bg-blue-600 text-white font-mono font-bold text-base flex items-center justify-center mx-auto shadow-md border border-blue-400/30 mb-3">
          IQ
        </div>
        <h2 className="text-xl font-bold font-mono tracking-tight text-white">
          ONBOARD<span className="text-blue-400">IQ</span> // OPERATIONS TERMINAL
        </h2>
        <p className="mt-1 text-xs text-slate-400 font-mono">
          Deccan Digital Bank • Intelligent KYC &amp; Verification Desk
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-[#0b0f19] py-7 px-6 sm:px-8 rounded-xl border border-[#1b253b] shadow-2xl">
          {error && (
            <div className="mb-4 p-2.5 bg-rose-950/60 border border-rose-800/60 rounded-lg text-xs font-mono text-rose-300">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-3.5 text-xs">
            <div>
              <label className="block font-mono text-[11px] text-slate-300 mb-1">
                CORPORATE OR APPLICANT EMAIL
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@deccandigital.internal"
                  className="w-full px-3 py-2 text-xs font-mono bg-[#070a12] border border-[#1e293b] rounded-lg text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block font-mono text-[11px] text-slate-300 mb-1">
                PASSWORD
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-3 py-2 text-xs font-mono bg-[#070a12] border border-[#1e293b] rounded-lg text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-mono font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 shadow-xs"
            >
              {loading ? (
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>AUTHENTICATE TERMINAL SESSION</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Quick Evaluator Role Switcher Buttons */}
          <div className="mt-5 pt-5 border-t border-[#1b253b]">
            <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider block text-center mb-2.5">
              ONE-CLICK EVALUATION PERSONAS
            </span>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <button
                type="button"
                onClick={() => handleQuickLogin('OFFICER')}
                className="p-2 text-left bg-[#0e1424] hover:bg-[#151f38] border border-[#1b253b] rounded-lg transition-colors"
              >
                <span className="text-blue-400 font-bold block text-[11px]">MAKER U1</span>
                <span className="text-[10px] text-slate-400 block truncate">Ananya Verma</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('CHECKER')}
                className="p-2 text-left bg-[#0e1424] hover:bg-[#151f38] border border-[#1b253b] rounded-lg transition-colors"
              >
                <span className="text-purple-400 font-bold block text-[11px]">CHECKER C1</span>
                <span className="text-[10px] text-slate-400 block truncate">Suresh Patel</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('APPLICANT')}
                className="col-span-2 p-2 text-left bg-[#0e1424] hover:bg-[#151f38] border border-[#1b253b] rounded-lg transition-colors flex items-center justify-between"
              >
                <div>
                  <span className="text-emerald-400 font-bold block text-[11px]">APPLICANT PORTAL</span>
                  <span className="text-[10px] text-slate-400 block font-sans">Ravi Kumar Sharma (Case A2000004)</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
              </button>
            </div>
          </div>

          <div className="mt-5 text-center text-xs text-slate-400 font-sans">
            New customer onboarding?{' '}
            <Link to="/register" className="text-blue-400 hover:text-blue-300 font-semibold hover:underline">
              Register here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
