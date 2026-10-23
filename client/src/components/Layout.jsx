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
  AlertCircle,
  RefreshCw,
  LogOut,
  Command,
  Activity,
  Layers,
  ArrowRight,
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
            title: 'APPLICANT WORKSPACE',
            items: [
              { name: 'Application Status', to: '/applicant/status', icon: CheckCircle },
              { name: 'Submit Application', to: '/applicant/apply', icon: FileText },
              { name: 'Documents', to: '/applicant/upload', icon: Upload },
              { name: 'Resubmission', to: '/applicant/resubmission', icon: RefreshCw },
            ],
          },
        ];
      case ROLES.CHECKER:
        return [
          {
            title: 'COMPLIANCE OVERSIGHT',
            items: [
              { name: 'Dashboard', to: '/compliance/dashboard', icon: LayoutDashboard },
              { name: 'Pending Checker', to: '/compliance/checker', icon: ShieldCheck },
              { name: 'Rules & Watchlists', to: '/compliance/rules', icon: Sliders },
              { name: 'Audit Trail', to: '/compliance/audit', icon: History },
            ],
          },
        ];
      case ROLES.OFFICER:
      default:
        return [
          {
            title: 'MAKER DESK',
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

  return (
    <div className="min-h-screen flex bg-[#f8fafc] text-slate-900 font-sans antialiased">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Obsidian Terminal Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-[#090d16] text-slate-300 flex flex-col justify-between border-r border-[#151d2f] transition-transform duration-200 ease-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Brand Header with Minimalist Geometric Mark */}
          <div className="h-16 px-5 flex items-center justify-between border-b border-[#151d2f]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white font-mono font-bold text-sm tracking-tighter shadow-sm border border-blue-400/30">
                IQ
              </div>
              <div className="leading-tight">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-sm tracking-tight text-white font-mono">
                    ONBOARD<span className="text-blue-400">IQ</span>
                  </span>
                  <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    V1.0
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono tracking-wider uppercase block">
                  Deccan Digital Bank
                </span>
              </div>
            </div>

            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-slate-400 hover:text-white p-1 rounded-md"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Active Terminal Session Pill */}
          <div className="px-4 pt-4 pb-2">
            <div className="p-2.5 rounded-xl bg-[#0e1424] border border-[#1b253b] text-xs">
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">
                <span>Active Console</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <p className="font-semibold text-slate-100 truncate text-xs">
                {currentUser.name}
              </p>
              <p className="text-[10px] font-mono text-blue-400 mt-0.5 truncate">
                {ROLE_LABELS[currentUser.role] || currentUser.role}
              </p>
            </div>
          </div>

          {/* Sectioned Navigation Links */}
          <div className="flex-1 px-3 py-2 overflow-y-auto space-y-4">
            {navSections.map((section, sIdx) => (
              <div key={sIdx}>
                <div className="px-3 pb-1.5 text-[9px] font-mono font-bold tracking-widest text-slate-500 uppercase">
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
                          `group flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                            isActive
                              ? 'bg-blue-600/15 text-blue-400 font-semibold border border-blue-500/30 shadow-xs'
                              : 'text-slate-400 hover:text-slate-200 hover:bg-[#12192c]/60'
                          }`
                        }
                      >
                        {({ isActive }) => (
                          <>
                            <Icon
                              className={`w-4 h-4 transition-colors shrink-0 ${
                                isActive ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300'
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

          {/* Sidebar Footer with Institutional Badge */}
          <div className="p-3 border-t border-[#151d2f] bg-[#070a11]">
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                DDB KERNEL ONLINE
              </span>
              <span>IST</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Surface Canvas */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Operations Navbar */}
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
              <span className="text-slate-400 font-mono hidden sm:inline">TERMINAL</span>
              <span className="text-slate-300 hidden sm:inline">/</span>
              <span className="font-semibold text-slate-800 capitalize truncate">
                {location.pathname.split('/')[2]?.replace('-', ' ') ||
                  location.pathname.split('/')[1] ||
                  'Overview'}
              </span>
            </div>
          </div>

          {/* Right Action Cluster */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Live Synthetic Badge */}
            <div className="hidden md:flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-[10px] font-mono text-slate-600">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              <span>SIMULATION PACK ACTIVE</span>
            </div>

            {/* DEMO ROLE SWITCHER PILL */}
            <div className="relative">
              <button
                onClick={() => setRoleMenuOpen(!roleMenuOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white text-xs font-mono font-medium rounded-lg transition-colors border border-slate-700 shadow-xs"
                title="Switch demo role for evaluation"
              >
                <User className="w-3.5 h-3.5 text-blue-400" />
                <span className="hidden sm:inline text-slate-400">ROLE:</span>
                <span className="font-semibold text-slate-100">{currentUser.role}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {roleMenuOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 z-50 p-2 animate-in fade-in duration-150">
                  <div className="px-3 py-1.5 text-[10px] font-mono font-bold tracking-wider text-slate-400 uppercase border-b border-slate-100">
                    Switch Evaluator Persona
                  </div>
                  <div className="space-y-1 mt-1">
                    <button
                      onClick={() => handleSwitchRole('APPLICANT', '/applicant/status')}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between transition-colors ${
                        currentUser.role === ROLES.APPLICANT
                          ? 'bg-blue-50 text-blue-700 font-bold'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div>
                        <span className="block font-medium">Applicant Portal</span>
                        <span className="text-[10px] text-slate-400 font-mono">Ravi Kumar Sharma</span>
                      </div>
                      {currentUser.role === ROLES.APPLICANT && (
                        <CheckCircle className="w-4 h-4 text-blue-600" />
                      )}
                    </button>

                    <button
                      onClick={() => handleSwitchRole('OFFICER', '/officer/queue')}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between transition-colors ${
                        currentUser.role === ROLES.OFFICER && currentUser.id === 'USR_OFFICER_U1'
                          ? 'bg-blue-50 text-blue-700 font-bold'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div>
                        <span className="block font-medium">KYC Officer (Maker U1)</span>
                        <span className="text-[10px] text-slate-400 font-mono">Ananya Verma</span>
                      </div>
                      {currentUser.id === 'USR_OFFICER_U1' && (
                        <CheckCircle className="w-4 h-4 text-blue-600" />
                      )}
                    </button>

                    <button
                      onClick={() => handleSwitchRole('OFFICER_2', '/officer/queue')}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between transition-colors ${
                        currentUser.id === 'USR_OFFICER_U2'
                          ? 'bg-blue-50 text-blue-700 font-bold'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div>
                        <span className="block font-medium">KYC Officer 2 (Maker U2)</span>
                        <span className="text-[10px] text-slate-400 font-mono">Vikram Seth</span>
                      </div>
                      {currentUser.id === 'USR_OFFICER_U2' && (
                        <CheckCircle className="w-4 h-4 text-blue-600" />
                      )}
                    </button>

                    <button
                      onClick={() => handleSwitchRole('CHECKER', '/compliance/dashboard')}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between transition-colors ${
                        currentUser.role === ROLES.CHECKER
                          ? 'bg-blue-50 text-blue-700 font-bold'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div>
                        <span className="block font-medium">Compliance Officer (Checker)</span>
                        <span className="text-[10px] text-slate-400 font-mono">Suresh Patel</span>
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
                className="flex items-center gap-2 p-1 rounded-lg hover:bg-slate-100 transition-colors"
                aria-label="User profile"
              >
                <div className="w-7 h-7 rounded-md bg-slate-900 text-white flex items-center justify-center text-xs font-mono font-bold">
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
                    <p className="text-[10px] text-slate-400 font-mono truncate mt-0.5">{currentUser.email}</p>
                  </div>

                  <div className="p-1">
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 rounded-lg flex items-center gap-2 transition-colors font-medium"
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
