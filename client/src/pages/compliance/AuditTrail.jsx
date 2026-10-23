import React, { useState, useEffect } from 'react';
import { History, Download, Search } from 'lucide-react';
import { mockDb } from '../../api/client';
import { formatDateTime } from '../../utils/formatters';
import { useToast } from '../../components/Toast';

export default function AuditTrail() {
  const [logs, setLogs] = useState([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const { showToast } = useToast();

  const loadLogs = () => {
    let all = mockDb.getAudit();
    if (search) {
      const q = search.toLowerCase();
      all = all.filter(
        (l) =>
          l.applicationId?.toLowerCase().includes(q) ||
          l.actor?.toLowerCase().includes(q) ||
          l.action?.toLowerCase().includes(q) ||
          l.details?.toLowerCase().includes(q)
      );
    }
    if (roleFilter !== 'ALL') {
      all = all.filter((l) => l.role === roleFilter);
    }
    setLogs(all);
  };

  useEffect(() => {
    loadLogs();
  }, [search, roleFilter]);

  const handleExportCSV = () => {
    const headers = ['id', 'timestamp', 'applicationId', 'actor', 'role', 'action', 'details'];
    const rows = logs.map((l) => [
      l.id,
      l.timestamp,
      l.applicationId || '',
      `"${l.actor || ''}"`,
      l.role || '',
      l.action || '',
      `"${(l.details || '').replace(/"/g, '""')}"`,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `onboardiq_audit_trail_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Audit trail exported as CSV (Rule FR-9 / FR-11)', 'success');
  };

  return (
    <div className="space-y-4 font-sans">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Regulatory Audit Trail
            </h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              {logs.length} Events
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Immutable, append-only chronological log of all document reviews, field corrections, and maker-checker decisions (Rules FR-9 and FR-11).
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl transition-colors flex items-center gap-2 self-start sm:self-center shadow-xs cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Filter and Search */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-3.5 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex-1 min-w-[240px] max-w-sm relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search events by ID, actor, or description..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-slate-50/50 text-slate-900"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-400 text-[11px] font-semibold uppercase">Role:</span>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="ALL">All Roles</option>
            <option value="OFFICER">Officer (Maker)</option>
            <option value="CHECKER">Checker (Compliance)</option>
            <option value="APPLICANT">Applicant</option>
            <option value="SYSTEM">System Engine</option>
          </select>
        </div>
      </div>

      {/* Event Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200/80">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Case ID</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/70">
                  <td className="py-3 px-4 text-slate-500 whitespace-nowrap text-xs">
                    {formatDateTime(log.timestamp)}
                  </td>
                  <td className="py-3 px-4 font-bold text-blue-600 font-mono whitespace-nowrap">
                    {log.applicationId || '—'}
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-900 whitespace-nowrap">{log.actor}</td>
                  <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-medium">
                      {log.role}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-800 whitespace-nowrap">{log.action}</td>
                  <td className="py-3 px-4 text-slate-600 max-w-lg leading-relaxed">
                    {log.details}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
