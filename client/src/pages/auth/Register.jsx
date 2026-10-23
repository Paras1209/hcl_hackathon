import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowRight, AlertCircle, ShieldCheck } from 'lucide-react';
import { authApi } from '../../api/auth';
import { useToast } from '../../components/Toast';

export default function Register() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    mobile: '',
    password: '',
    confirmPassword: '',
    consentKYC: false,
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { showToast } = useToast();

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.fullName || formData.fullName.trim().length < 3) {
      newErrors.fullName = 'Full legal name is required (min 3 characters).';
    }
    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = 'Please enter a valid email address.';
    }
    if (!formData.mobile || !/^[6-9][0-9]{9}$/.test(formData.mobile.trim())) {
      newErrors.mobile = 'Enter a valid 10-digit Indian mobile number.';
    }
    if (!formData.password || formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters.';
    }
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match.';
    }
    if (!formData.consentKYC) {
      newErrors.consentKYC = 'You must grant consent for electronic KYC screening.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const res = await authApi.register(formData);
      if (res.success) {
        showToast('Profile created. Proceeding to KYC form.', 'success');
        navigate('/applicant/apply');
      }
    } catch (err) {
      showToast(err.message || 'Registration failed', 'error');
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
            Customer KYC Registration
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Create your account to start electronic KYC verification.
          </p>
        </div>

        {/* Card */}
        <div className="bg-white py-8 px-6 sm:px-8 rounded-2xl border border-slate-200/90 shadow-sm">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Create customer profile
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Enter your legal details as they appear on your government documents.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Full Legal Name *
              </label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                placeholder="Ravi Kumar Sharma"
                className={`w-full px-3.5 py-2.5 text-sm rounded-lg border bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-colors ${
                  errors.fullName
                    ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-100'
                    : 'border-slate-300 focus:border-blue-600 focus:ring-blue-100'
                }`}
              />
              {errors.fullName && (
                <p className="mt-1.5 text-xs text-rose-600">{errors.fullName}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Email Address *
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="ravi.sharma@example.com"
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
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Mobile Number (+91) *
              </label>
              <input
                type="tel"
                name="mobile"
                maxLength={10}
                value={formData.mobile}
                onChange={handleChange}
                placeholder="9876543210"
                className={`w-full px-3.5 py-2.5 text-sm rounded-lg border bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-colors ${
                  errors.mobile
                    ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-100'
                    : 'border-slate-300 focus:border-blue-600 focus:ring-blue-100'
                }`}
              />
              {errors.mobile && (
                <p className="mt-1.5 text-xs text-rose-600">{errors.mobile}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Password *
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className={`w-full px-3.5 py-2.5 text-sm rounded-lg border bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-colors ${
                    errors.password
                      ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-100'
                      : 'border-slate-300 focus:border-blue-600 focus:ring-blue-100'
                  }`}
                />
                {errors.password && (
                  <p className="mt-1.5 text-xs text-rose-600">{errors.password}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Confirm *
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className={`w-full px-3.5 py-2.5 text-sm rounded-lg border bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-colors ${
                    errors.confirmPassword
                      ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-100'
                      : 'border-slate-300 focus:border-blue-600 focus:ring-blue-100'
                  }`}
                />
                {errors.confirmPassword && (
                  <p className="mt-1.5 text-xs text-rose-600">{errors.confirmPassword}</p>
                )}
              </div>
            </div>

            {/* Mandatory KYC Consent Checkbox */}
            <div className="pt-2">
              <label className="flex items-start gap-2.5 p-3 rounded-lg bg-slate-50 border border-slate-200/80 cursor-pointer">
                <input
                  type="checkbox"
                  name="consentKYC"
                  checked={formData.consentKYC}
                  onChange={handleChange}
                  className="mt-0.5 w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
                <span className="text-xs text-slate-600 leading-relaxed">
                  I grant voluntary consent to Deccan Digital Bank to electronically verify my identity
                  and document specimens against KYC compliance rules and watchlists.
                </span>
              </label>
              {errors.consentKYC && (
                <p className="mt-1.5 text-xs text-rose-600">{errors.consentKYC}</p>
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
                  <span>Create profile &amp; open KYC form</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-500">
            Already registered?{' '}
            <Link
              to="/login"
              className="text-blue-600 hover:text-blue-700 font-semibold hover:underline"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>

      {/* Subtle Footer */}
      <footer className="mt-8 text-center text-xs text-slate-400 space-y-1">
        <div>Secure onboarding · Privacy protected · Deccan Digital Bank</div>
        <div className="text-[11px] text-slate-400/80">
          © 2026 Deccan Digital Bank Ltd. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
