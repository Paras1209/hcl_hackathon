import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  FileText,
  Upload,
  CheckCircle,
  Inbox,
  LayoutDashboard,
  ShieldCheck,
  History,
  Sliders,
  Menu,
  X,
  User,
  ChevronDown,
  Building2,
  RefreshCw,
  LogOut,
  Bell,
  Sparkles,
} from 'lucide-react';
import { ROLES, DEMO_USERS, ROLE_LABELS } from '../constants/roles';
import { authApi } from '../api/auth';
import { useToast } from './Toast';
import NotificationCenter from './NotificationCenter';

export default function Layout() {
  const [currentUser, setCurrentUser] = useState(DEMO_USERS.OFFICER);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();

  const loadCurrentUser = async () => {
    try {
      const res = await authApi.getCurrentUser();
      if (res.success && res.data) {
        setCurrentUser(res.data);
      }
    } catch (e) {
      console.warn('Failed to load current user', e);
    }
  };

  useEffect(() => {
    loadCurrentUser();
  }, []);

  const handleSwitchRole = async (roleKey, targetRoute) => {
    try {
      const res = await authApi.switchRole(roleKey);
      if (res.success) {
        setCurrentUser(res.data);
        setRoleMenuOpen(false);
        showToast(`Active Session: ${res.data.name} (${ROLE_LABELS[res.data.role]})`, 'info');
        if (targetRoute) {
          navigate(targetRoute);
        } else if (res.data.role === ROLES.APPLICANT) {
          navigate('/applicant/status');
        } else if (res.data.role === ROLES.OFFICER) {
          navigate('/officer/queue');
        } else if (res.data.role === ROLES.CHECKER) {
          navigate('/compliance/dashboard');
        }
      }
    } catch (e) {
      showToast('Error switching demo role', 'error');
    }
  };

  const handleLogout = async () => {
    await authApi.logout();
    showToast('Session terminated', 'info');
    navigate('/login');
  };

  // Build role-aware navigation sections
  const getNavSections = () => {
    switch (currentUser.role) {
      case ROLES.APPLICANT:
        return [
          {
            title: 'Applicant Journey',
            items: [
              { name: 'Application Status', to: '/applicant/status', icon: CheckCircle },
              { name: 'New Application', to: '/applicant/apply', icon: FileText },
              { name: 'Document Vault', to: '/applicant/upload', icon: Upload },
              { name: 'Resubmission Desk', to: '/applicant/resubmission', icon: RefreshCw },
            ],
          },
        ];
      case ROLES.CHECKER:
        return [
          {
            title: 'Compliance Oversight',
            items: [
              { name: 'Compliance Dashboard', to: '/compliance/dashboard', icon: LayoutDashboard },
              { name: 'Dual Authorization Queue', to: '/compliance/checker', icon: ShieldCheck },
              { name: 'Rules Configuration', to: '/compliance/rules', icon: Sliders },
              { name: 'Regulatory Audit Log', to: '/compliance/audit', icon: History },
            ],
          },
        ];
      case ROLES.OFFICER:
      default:
        return [
          {
            title: 'KYC Operations Desk',
            items: [
              { name: 'Review Queue', to: '/officer/queue', icon: Inbox },
              { name: 'Review Workspace', to: '/officer/review/A2000004', icon: FileText },
              { name: 'Audit History', to: '/compliance/audit', icon: History },
            ],
          },
        ];
    }
  };

  const navSections = getNavSections();

  const getBreadcrumbTitle = () => {
    const parts = location.pathname.split('/').filter(Boolean);
    if (parts.length === 0) return 'Overview';
    const lastPart = parts[parts.length - 1];
    return lastPart.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  };

  return (
    <div className="min-h-screen flex bg-[#f5f7fa] text-slate-900 font-sans antialiased">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Modern Light Fintech Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white text-slate-800 flex flex-col justify-between border-r border-slate-200/90 shadow-[1px_0_3px_rgba(0,0,0,0.02)] transition-transform duration-200 ease-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Brand Header */}
          <div className="h-16 px-5 flex items-center justify-between border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-600 text-white font-bold text-sm flex items-center justify-center shadow-xs ring-2 ring-blue-50">
                IQ
              </div>
              <div className="leading-tight">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-sm tracking-tight text-slate-900">
                    Onboard<span className="text-blue-600">IQ</span>
                  </span>
                  <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-full bg-blue-50 text-blue-700 border border-blue-200/60">
                    v1.0
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 font-medium block">
                  Deccan Digital Bank
                </span>
              </div>
            </div>

            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-slate-400 hover:text-slate-700 p-1 rounded-md"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Active User Session Card */}
          <div className="p-3.5 pb-2">
            <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/70 text-xs">
              <div className="flex items-center justify-between text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                <span>Active Profile</span>
                <span className="flex items-center gap-1 text-emerald-600 normal-case font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Live
                </span>
              </div>
              <p className="font-semibold text-slate-900 truncate">
                {currentUser.name}
              </p>
              <p className="text-[11px] font-medium text-blue-600 mt-0.5 truncate">
                {ROLE_LABELS[currentUser.role] || currentUser.role}
              </p>
            </div>
          </div>

          {/* Sectioned Navigation Links */}
          <div className="flex-1 px-3 py-2 overflow-y-auto space-y-4">
            {navSections.map((section, sIdx) => (
              <div key={sIdx}>
                <div className="px-3 pb-1.5 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                  {section.title}
                </div>
                <nav className="space-y-0.5">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        onClick={() => setSidebarOpen(false)}
                        className={({ isActive }) =>
                          `group flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-colors ${
                            isActive
                              ? 'bg-blue-50 text-blue-700 font-semibold border-l-2 border-blue-600 shadow-xs'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium'
                          }`
                        }
                      >
                        {({ isActive }) => (
                          <>
                            <Icon
                              className={`w-4 h-4 transition-colors shrink-0 ${
                                isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'
                              }`}
                            />
                            <span className="truncate">{item.name}</span>
                          </>
                        )}
                      </NavLink>
                    );
                  })}
                </nav>
              </div>
            ))}
          </div>

          {/* Sidebar Footer */}
          <div className="p-3 border-t border-slate-100 bg-slate-50/50">
            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Compliance Engine Online
              </span>
              <span className="text-[10px] font-medium text-slate-400">IST</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Surface Canvas */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Navbar */}
        <header className="h-14 bg-white border-b border-slate-200/90 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-1.5 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100"
              aria-label="Open sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Breadcrumb Path */}
            <div className="flex items-center gap-2 text-xs min-w-0">
              <span className="text-slate-400 hidden sm:inline font-medium">Workspace</span>
              <span className="text-slate-300 hidden sm:inline">/</span>
              <span className="font-semibold text-slate-800 truncate">
                {getBreadcrumbTitle()}
              </span>
            </div>
          </div>

          {/* Right Action Cluster */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Live Synthetic Badge */}
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200 text-[11px] font-medium text-slate-600">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              <span>Simulation Pack Active</span>
            </div>

            {/* DEMO ROLE SWITCHER PILL */}
            <div className="relative">
              <button
                onClick={() => setRoleMenuOpen(!roleMenuOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition-colors border border-slate-200 shadow-xs cursor-pointer"
                title="Switch demo role for evaluation"
              >
                <User className="w-3.5 h-3.5 text-blue-600" />
                <span className="hidden sm:inline text-slate-500 font-normal">Role:</span>
                <span className="text-slate-900">{currentUser.role}</span>
                <ChevronDown className="w-3 h-3 text-slate-400 ml-0.5" />
              </button>

              {roleMenuOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 z-50 p-2 animate-in fade-in duration-150">
                  <div className="px-3 py-2 text-[10px] font-bold tracking-wider text-slate-400 uppercase border-b border-slate-100">
                    Switch Evaluator Persona
                  </div>
                  <div className="space-y-1 mt-1">
                    <button
                      onClick={() => handleSwitchRole('APPLICANT', '/applicant/status')}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer ${
                        currentUser.role === ROLES.APPLICANT
                          ? 'bg-blue-50 text-blue-700 font-bold'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div>
                        <span className="block font-semibold">Applicant Portal</span>
                        <span className="text-[11px] text-slate-500">Ravi Kumar Sharma</span>
                      </div>
                      {currentUser.role === ROLES.APPLICANT && (
                        <CheckCircle className="w-4 h-4 text-blue-600" />
                      )}
                    </button>

                    <button
                      onClick={() => handleSwitchRole('OFFICER', '/officer/queue')}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer ${
                        currentUser.role === ROLES.OFFICER && currentUser.id === 'USR_OFFICER_U1'
                          ? 'bg-blue-50 text-blue-700 font-bold'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div>
                        <span className="block font-semibold">KYC Officer (Maker U1)</span>
                        <span className="text-[11px] text-slate-500">Ananya Verma</span>
                      </div>
                      {currentUser.id === 'USR_OFFICER_U1' && (
                        <CheckCircle className="w-4 h-4 text-blue-600" />
                      )}
                    </button>

                    <button
                      onClick={() => handleSwitchRole('OFFICER_2', '/officer/queue')}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer ${
                        currentUser.id === 'USR_OFFICER_U2'
                          ? 'bg-blue-50 text-blue-700 font-bold'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div>
                        <span className="block font-semibold">KYC Officer 2 (Maker U2)</span>
                        <span className="text-[11px] text-slate-500">Vikram Seth</span>
                      </div>
                      {currentUser.id === 'USR_OFFICER_U2' && (
                        <CheckCircle className="w-4 h-4 text-blue-600" />
                      )}
                    </button>

                    <button
                      onClick={() => handleSwitchRole('CHECKER', '/compliance/dashboard')}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer ${
                        currentUser.role === ROLES.CHECKER
                          ? 'bg-blue-50 text-blue-700 font-bold'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div>
                        <span className="block font-semibold">Compliance Officer (Checker)</span>
                        <span className="text-[11px] text-slate-500">Suresh Patel</span>
                      </div>
                      {currentUser.role === ROLES.CHECKER && (
                        <CheckCircle className="w-4 h-4 text-blue-600" />
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Notification Center */}
            <NotificationCenter />

            {/* User Profile Menu */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="User profile"
              >
                <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs font-bold shadow-xs">
                  {currentUser.name
                    ?.split(' ')
                    .map((n) => n[0])
                    .join('')
                    .substring(0, 2) || 'US'}
                </div>
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 z-50 p-2 animate-in fade-in duration-150">
                  <div className="p-3 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-900 truncate">{currentUser.name}</p>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">{currentUser.email}</p>
                  </div>

                  <div className="p-1">
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 rounded-lg flex items-center gap-2 transition-colors font-semibold cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Dynamic Page Canvas */}
        <main className="flex-1 p-4 sm:p-6 lg:p-7 max-w-[1400px] w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
