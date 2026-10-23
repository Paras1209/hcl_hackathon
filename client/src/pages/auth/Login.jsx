import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight, User, Building2, AlertCircle, ShieldCheck } from 'lucide-react';
import { authApi } from '../../api/auth';
import { useToast } from '../../components/Toast';

export default function Login() {
  const [journey, setJourney] = useState('APPLICANT'); // 'APPLICANT' | 'OFFICER'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();
  const { showToast } = useToast();

  const validate = () => {
    const errs = {};
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      errs.email = journey === 'APPLICANT' 
        ? 'Please enter your registered email address.' 
        : 'Please enter your corporate email address.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      errs.email = 'Please enter a valid email address (e.g. name@domain.com).';
    }

    if (!password) {
      errs.password = 'Please enter your account password.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const routeUserAfterLogin = (user) => {
    if (user.role === 'APPLICANT') {
      navigate('/applicant/status');
    } else if (user.role === 'CHECKER') {
      navigate('/compliance/dashboard');
    } else {
      navigate('/officer/queue');
    }
  };

  const handleLogin = async (e) => {
    e?.preventDefault();
    setErrors({});

    if (!validate()) {
      return;
    }

    setLoading(true);

    try {
      const res = await authApi.login({
        email: email.trim(),
        password,
        journey,
      });

      if (res.success) {
        showToast(`Authenticated: ${res.data.name}`, 'success');
        routeUserAfterLogin(res.data);
      }
    } catch (err) {
      setErrors({
        general: err.message || 'Invalid credentials. Please verify your email and password.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (targetJourney) => {
    setErrors({});
    setLoading(true);

    try {
      if (targetJourney === 'APPLICANT') {
        const res = await authApi.login({
          email: 'ravi.sharma@example.com',
          password: 'Password123!',
          journey: 'APPLICANT',
          role: 'APPLICANT',
        });
        if (res.success) {
          showToast(`Signed in as ${res.data.name} (Applicant)`, 'success');
          routeUserAfterLogin(res.data);
        }
      } else {
        // Authorized bank officer - backend automatically assigns officer profile
        const res = await authApi.login({
          email: 'ananya.verma@deccandigital.internal',
          password: 'BankPassword123!',
          journey: 'OFFICER',
          role: 'OFFICER',
        });
        if (res.success) {
          showToast(`Signed in as ${res.data.name} (Bank Operations)`, 'success');
          routeUserAfterLogin(res.data);
        }
      }
    } catch (err) {
      setErrors({ general: 'Demo authentication failed. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between py-10 px-4 sm:px-6 lg:px-8 font-sans antialiased text-slate-900">
      <div className="w-full max-w-md mx-auto">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-600 text-white font-bold text-lg shadow-sm ring-4 ring-blue-50 mb-3.5">
            IQ
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Onboard<span className="text-blue-600">IQ</span>
          </h1>
          <p className="mt-1 text-xs font-medium uppercase tracking-wider text-slate-500">
            Secure Digital Banking Onboarding
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Sign in to manage your KYC application securely.
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white py-8 px-6 sm:px-8 rounded-2xl border border-slate-200/90 shadow-sm">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Welcome back
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Sign in to continue.
            </p>
          </div>

          {/* User Journey Segmented Control */}
          <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl mb-6 border border-slate-200/50">
            <button
              type="button"
              onClick={() => {
                setJourney('APPLICANT');
                setErrors({});
              }}
              className={`py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
                journey === 'APPLICANT'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <User className="w-3.5 h-3.5 text-blue-600" />
              <span>I'm a customer</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setJourney('OFFICER');
                setErrors({});
              }}
              className={`py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
                journey === 'OFFICER'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building2 className="w-3.5 h-3.5 text-slate-700" />
              <span>I'm a bank employee</span>
            </button>
          </div>

          {/* General Error Banner */}
          {errors.general && (
            <div className="mb-5 p-3 rounded-lg bg-rose-50 border border-rose-200/80 flex items-start gap-2.5 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errors.general}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-4" noValidate>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {journey === 'APPLICANT' ? 'Email Address' : 'Corporate Email Address'}
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) {
                    setErrors((prev) => ({ ...prev, email: null }));
                  }
                }}
                placeholder={
                  journey === 'APPLICANT'
                    ? 'name@example.com'
                    : 'employee@deccandigital.internal'
                }
                className={`w-full px-3.5 py-2.5 text-sm rounded-lg border bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-colors ${
                  errors.email
                    ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-100'
                    : 'border-slate-300 focus:border-blue-600 focus:ring-blue-100'
                }`}
              />
              {errors.email && (
                <p className="mt-1.5 text-xs text-rose-600">{errors.email}</p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Password
                </label>
                {journey === 'OFFICER' ? (
                  <span className="text-[11px] text-slate-400">Internal SSO</span>
                ) : (
                  <span className="text-[11px] text-slate-400">Case security PIN</span>
                )}
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) {
                      setErrors((prev) => ({ ...prev, password: null }));
                    }
                  }}
                  placeholder="Enter your password"
                  className={`w-full px-3.5 py-2.5 pr-10 text-sm rounded-lg border bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-colors ${
                    errors.password
                      ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-100'
                      : 'border-slate-300 focus:border-blue-600 focus:ring-blue-100'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1.5 text-xs text-rose-600">{errors.password}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-sm rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-60 shadow-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign in</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Contextual Journey Footnotes */}
          {journey === 'APPLICANT' ? (
            <div className="mt-5 text-center text-xs text-slate-500">
              New customer?{' '}
              <Link
                to="/register"
                className="text-blue-600 hover:text-blue-700 font-semibold hover:underline"
              >
                Apply for an account
              </Link>
            </div>
          ) : (
            <div className="mt-5 p-2.5 rounded-lg bg-slate-50 border border-slate-200/70 text-center text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>Authorized personnel only. Sessions are audited for compliance.</span>
            </div>
          )}

          {/* Discreet Evaluation Demo Bar */}
          <div className="mt-7 pt-5 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[11px] font-semibold tracking-wider uppercase text-slate-400">
                Evaluation Demo Access
              </span>
              <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                Simulated Auth
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleDemoLogin('APPLICANT')}
                className="text-left p-2.5 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/40 bg-slate-50/60 transition-colors cursor-pointer group"
              >
                <span className="text-xs font-semibold text-slate-800 group-hover:text-blue-700 block">
                  Applicant Demo
                </span>
                <span className="text-[11px] text-slate-500 block truncate">
                  Ravi Kumar Sharma
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleDemoLogin('OFFICER')}
                className="text-left p-2.5 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/40 bg-slate-50/60 transition-colors cursor-pointer group"
              >
                <span className="text-xs font-semibold text-slate-800 group-hover:text-blue-700 block">
                  Officer Demo
                </span>
                <span className="text-[11px] text-slate-500 block truncate">
                  Operations Desk
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Understated Institutional Footer */}
      <footer className="mt-8 text-center text-xs text-slate-400 space-y-1">
        <div>Secure onboarding · Privacy protected · Deccan Digital Bank</div>
        <div className="text-[11px] text-slate-400/80">
          © 2026 Deccan Digital Bank Ltd. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
