import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, Mail, Lock, Phone, User, ArrowRight } from 'lucide-react';
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
      newErrors.fullName = 'Full legal name is required (min 3 chars)';
    }
    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Enter a valid email address';
    }
    if (!formData.mobile || !/^[6-9][0-9]{9}$/.test(formData.mobile)) {
      newErrors.mobile = 'Enter a valid 10-digit Indian mobile number';
    }
    if (!formData.password || formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters long';
    }
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    if (!formData.consentKYC) {
      newErrors.consentKYC = 'You must grant consent for electronic KYC screening';
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
    <div className="min-h-screen bg-[#070a12] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 text-slate-100 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="w-10 h-10 rounded-lg bg-blue-600 text-white font-mono font-bold text-base flex items-center justify-center mx-auto shadow-md border border-blue-400/30 mb-3">
          IQ
        </div>
        <h2 className="text-xl font-bold font-mono tracking-tight text-white">
          APPLICANT ONBOARDING // PROFILE SETUP
        </h2>
        <p className="mt-1 text-xs text-slate-400 font-mono">
          Deccan Digital Bank • Digital Savings Account Registration
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-[#0b0f19] py-7 px-6 sm:px-8 rounded-xl border border-[#1b253b] shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
            <div>
              <label className="block font-mono text-[11px] text-slate-300 mb-1">
                FULL LEGAL NAME (AS PER GOVT ID) *
              </label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                placeholder="Ravi Kumar Sharma"
                className="w-full px-3 py-2 text-xs font-mono bg-[#070a12] border border-[#1e293b] rounded-lg text-slate-100 focus:outline-none focus:border-blue-500"
              />
              {errors.fullName && <p className="text-[11px] text-rose-400 mt-1 font-mono">{errors.fullName}</p>}
            </div>

            <div>
              <label className="block font-mono text-[11px] text-slate-300 mb-1">
                EMAIL ADDRESS *
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="ravi.sharma@example.com"
                className="w-full px-3 py-2 text-xs font-mono bg-[#070a12] border border-[#1e293b] rounded-lg text-slate-100 focus:outline-none focus:border-blue-500"
              />
              {errors.email && <p className="text-[11px] text-rose-400 mt-1 font-mono">{errors.email}</p>}
            </div>

            <div>
              <label className="block font-mono text-[11px] text-slate-300 mb-1">
                MOBILE NUMBER (+91) *
              </label>
              <input
                type="text"
                name="mobile"
                maxLength={10}
                value={formData.mobile}
                onChange={handleChange}
                placeholder="9876543210"
                className="w-full px-3 py-2 text-xs font-mono bg-[#070a12] border border-[#1e293b] rounded-lg text-slate-100 focus:outline-none focus:border-blue-500"
              />
              {errors.mobile && <p className="text-[11px] text-rose-400 mt-1 font-mono">{errors.mobile}</p>}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-mono text-[11px] text-slate-300 mb-1">PASSWORD *</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 text-xs font-mono bg-[#070a12] border border-[#1e293b] rounded-lg text-slate-100 focus:outline-none focus:border-blue-500"
                />
                {errors.password && <p className="text-[11px] text-rose-400 mt-1 font-mono">{errors.password}</p>}
              </div>

              <div>
                <label className="block font-mono text-[11px] text-slate-300 mb-1">CONFIRM *</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 text-xs font-mono bg-[#070a12] border border-[#1e293b] rounded-lg text-slate-100 focus:outline-none focus:border-blue-500"
                />
                {errors.confirmPassword && (
                  <p className="text-[11px] text-rose-400 mt-1 font-mono">{errors.confirmPassword}</p>
                )}
              </div>
            </div>

            {/* Mandatory KYC Consent Checkbox */}
            <div className="pt-2">
              <label className="flex items-start gap-2 p-2.5 rounded-lg bg-[#070a12] border border-[#1e293b] cursor-pointer">
                <input
                  type="checkbox"
                  name="consentKYC"
                  checked={formData.consentKYC}
                  onChange={handleChange}
                  className="mt-0.5 w-3.5 h-3.5 text-blue-600 rounded border-slate-700 bg-slate-900 focus:ring-blue-500"
                />
                <span className="text-[11px] text-slate-400 leading-relaxed font-sans">
                  I grant voluntary consent to Deccan Digital Bank to electronically verify my identity
                  and document specimens against KYC compliance rules and watchlists.
                </span>
              </label>
              {errors.consentKYC && (
                <p className="text-[11px] text-rose-400 mt-1 font-mono">{errors.consentKYC}</p>
              )}
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
                  <span>CREATE PROFILE &amp; OPEN KYC FORM</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-5 text-center text-xs text-slate-400 font-sans">
            Already have an active profile?{' '}
            <Link to="/login" className="text-blue-400 hover:text-blue-300 font-semibold hover:underline">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
