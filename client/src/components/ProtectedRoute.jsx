import React, { useState, useEffect } from 'react';
import { ShieldAlert, ArrowRight } from 'lucide-react';
import { authApi } from '../api/auth';
import { ROLE_LABELS, ROLES } from '../constants/roles';
import { LoadingSpinner } from './LoadingState';

export default function ProtectedRoute({ allowedRoles = [], children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkUser() {
      try {
        const res = await authApi.getCurrentUser();
        if (res.success) {
          setCurrentUser(res.data);
        }
      } catch (e) {
        console.warn('Auth check error', e);
      } finally {
        setLoading(false);
      }
    }
    checkUser();
  }, []);

  if (loading) {
    return <LoadingSpinner message="Verifying role permissions..." />;
  }

  // If user role is not in allowedRoles, show friendly demo role switcher screen
  if (currentUser && allowedRoles.length > 0 && !allowedRoles.includes(currentUser.role)) {
    const recommendedRole = allowedRoles[0];

    const handleSwitch = async () => {
      setLoading(true);
      await authApi.switchRole(recommendedRole);
      const updated = await authApi.getCurrentUser();
      setCurrentUser(updated.data);
      setLoading(false);
    };

    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mb-4 shadow-sm">
          <ShieldAlert className="w-7 h-7" />
        </div>

        <h3 className="text-lg font-bold text-slate-900 mb-1">
          Role-Restricted View
        </h3>
        <p className="text-xs text-slate-500 mb-6 leading-relaxed">
          This operational screen requires the{' '}
          <span className="font-semibold text-slate-800">
            {allowedRoles.map((r) => ROLE_LABELS[r] || r).join(' or ')}
          </span>{' '}
          role. You are currently browsing as{' '}
          <span className="font-semibold text-slate-800">
            {ROLE_LABELS[currentUser.role] || currentUser.role}
          </span>
          .
        </p>

        <button
          onClick={handleSwitch}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-2"
        >
          <span>Switch to {ROLE_LABELS[recommendedRole]}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return children;
}
