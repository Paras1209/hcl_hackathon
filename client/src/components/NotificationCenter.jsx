import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, ShieldAlert, CheckCircle2, AlertTriangle, FileText } from 'lucide-react';
import { notificationsApi } from '../api/notifications';
import { formatDateTime } from '../utils/formatters';
import { useNavigate } from 'react-router-dom';

export default function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const loadNotifications = async () => {
    try {
      const res = await notificationsApi.getNotifications();
      if (res.success) {
        setNotifications(res.data);
        setUnreadCount(res.unreadCount);
      }
    } catch (e) {
      console.warn('Failed to load notifications', e);
    }
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 8000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id, e) => {
    e?.stopPropagation();
    await notificationsApi.markAsRead(id);
    loadNotifications();
  };

  const handleMarkAllRead = async () => {
    await notificationsApi.markAllAsRead();
    loadNotifications();
  };

  const handleNotificationClick = async (notif) => {
    if (!notif.read) {
      await handleMarkAsRead(notif.id);
    }
    setIsOpen(false);

    if (notif.applicationId) {
      if (notif.role === 'OFFICER') {
        navigate(`/officer/review/${notif.applicationId}`);
      } else if (notif.role === 'CHECKER') {
        navigate('/compliance/checker');
      } else {
        navigate(`/applicant/status/${notif.applicationId}`);
      }
    }
  };

  const getNotifIcon = (type) => {
    switch (type) {
      case 'APPLICATION_APPROVED':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      case 'CHECKER_PENDING':
      case 'REVIEW_ASSIGNMENT':
        return <AlertTriangle className="w-4 h-4 text-amber-600" />;
      case 'RESUBMISSION_REQUESTED':
        return <FileText className="w-4 h-4 text-orange-600" />;
      default:
        return <ShieldAlert className="w-4 h-4 text-blue-600" />;
    }
  };

  return (
    <div className="relative font-sans" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
        aria-label="Notifications"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-600 rounded-full ring-2 ring-white" />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 overflow-hidden animate-in fade-in duration-150">
          <div className="px-4 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
            <div>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                Activity Feed
              </span>
              <span className="text-xs font-bold text-slate-900">
                {unreadCount} Unread Alert{unreadCount === 1 ? '' : 's'}
              </span>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1 hover:underline cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" /> Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                No notification events recorded
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`p-3.5 hover:bg-slate-50 cursor-pointer transition-colors flex items-start gap-3 ${
                    !n.read ? 'bg-blue-50/30' : ''
                  }`}
                >
                  <div className="p-2 rounded-lg bg-slate-100/80 shrink-0 mt-0.5">
                    {getNotifIcon(n.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-xs font-bold truncate ${!n.read ? 'text-slate-900' : 'text-slate-700'}`}>
                        {n.title}
                      </span>
                      {!n.read && (
                        <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                      {n.message}
                    </p>
                    <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-400">
                      <span>{formatDateTime(n.timestamp)}</span>
                      {n.applicationId && (
                        <span className="font-mono text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-semibold">
                          {n.applicationId}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
