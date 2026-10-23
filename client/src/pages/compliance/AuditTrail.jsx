import React, { useState, useEffect } from 'react';
import { History, Download, Search, Filter } from 'lucide-react';
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
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200/90 px-5 py-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900 tracking-tight font-mono">
              AUDIT TRAIL // IMMUTABLE EVENT STREAM (FR-9)
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 font-bold">
              {logs.length} EVENTS
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Append-only verification log: document views, field corrections with before/after values, recommendations and decisions.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-mono font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 self-start sm:self-center"
        >
          <Download className="w-3.5 h-3.5 text-blue-400" />
          <span>EXPORT CSV</span>
        </button>
      </div>

      {/* Filter and Search */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-3 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex-1 min-w-[220px] max-w-sm relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by ID, actor, or event type..."
            className="w-full pl-8 pr-3 py-1.5 text-xs font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
          />
        </div>

        <div className="flex items-center gap-1 text-xs font-mono">
          <span className="text-slate-400 text-[10px]">ROLE:</span>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-2 py-1 border border-slate-200 rounded-lg bg-white font-mono text-xs text-slate-800 focus:outline-none"
          >
            <option value="ALL">ALL ROLES</option>
            <option value="OFFICER">OFFICER (MAKER)</option>
            <option value="CHECKER">CHECKER</option>
            <option value="APPLICANT">APPLICANT</option>
            <option value="SYSTEM">SYSTEM</option>
          </select>
        </div>
      </div>

      {/* Event Table */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead>
              <tr className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <th className="py-2.5 px-3">TIMESTAMP</th>
                <th className="py-2.5 px-3">CASE ID</th>
                <th className="py-2.5 px-3">ACTOR</th>
                <th className="py-2.5 px-3">ROLE</th>
                <th className="py-2.5 px-3">ACTION</th>
                <th className="py-2.5 px-3 font-sans">DETAILS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[11px]">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/70">
                  <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                    {formatDateTime(log.timestamp)}
                  </td>
                  <td className="py-2.5 px-3 font-bold text-blue-600">
                    {log.applicationId || '—'}
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-slate-900">{log.actor}</td>
                  <td className="py-2.5 px-3 text-slate-600">{log.role}</td>
                  <td className="py-2.5 px-3 font-semibold text-slate-800">{log.action}</td>
                  <td className="py-2.5 px-3 font-sans text-slate-600 max-w-lg leading-relaxed">
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
