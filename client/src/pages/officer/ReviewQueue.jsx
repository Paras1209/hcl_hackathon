import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Inbox,
  Search,
  Filter,
  AlertTriangle,
  FileText,
  Clock,
  CheckCircle2,
  ChevronRight,
  ShieldAlert,
  ArrowUpDown,
} from 'lucide-react';
import { reviewApi } from '../../api/review';
import {
  STATUS_LABELS,
  STATUS_COLORS,
  RISK_COLORS,
  APPLICATION_STATUS,
  RISK_CATEGORY,
} from '../../constants/statuses';
import { maskPAN, formatDateTime, formatDate } from '../../utils/formatters';
import { LoadingSpinner, SkeletonTable, EmptyState } from '../../components/LoadingState';

export default function ReviewQueue() {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: APPLICATION_STATUS.IN_REVIEW,
    riskCategory: 'ALL',
    reasonCode: 'ALL',
    search: '',
  });

  const navigate = useNavigate();

  const loadQueue = async () => {
    try {
      setLoading(true);
      const res = await reviewApi.getReviewQueue(filters);
      if (res.success) {
        setQueue(res.data);
      }
    } catch (e) {
      console.warn('Error loading review queue', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
  }, [filters.status, filters.riskCategory, filters.reasonCode]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadQueue();
  };

  const highRiskCount = queue.filter((a) => a.riskCategory === RISK_CATEGORY.HIGH).length;

  return (
    <div className="space-y-4">
      {/* Operational Header Bar */}
      <div className="bg-white rounded-xl border border-slate-200/90 px-5 py-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900 tracking-tight font-mono">
              REVIEW QUEUE // MAKER CONSOLE
            </h2>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-semibold">
              {queue.length} ACTIVE
            </span>
            {highRiskCount > 0 && (
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 font-bold flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-rose-600" />
                {highRiskCount} HIGH RISK
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Prioritized by risk category (<span className="text-rose-600 font-semibold">HIGH first</span>), followed by submission timestamp.
          </p>
        </div>

        {/* Quick Filter Pill Group */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg text-xs font-mono">
          <button
            onClick={() => setFilters((p) => ({ ...p, status: APPLICATION_STATUS.IN_REVIEW, riskCategory: 'ALL' }))}
            className={`px-2.5 py-1 rounded transition-colors ${
              filters.status === APPLICATION_STATUS.IN_REVIEW && filters.riskCategory === 'ALL'
                ? 'bg-white text-slate-900 font-bold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            IN REVIEW
          </button>
          <button
            onClick={() => setFilters((p) => ({ ...p, riskCategory: RISK_CATEGORY.HIGH }))}
            className={`px-2.5 py-1 rounded transition-colors ${
              filters.riskCategory === RISK_CATEGORY.HIGH
                ? 'bg-rose-600 text-white font-bold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            HIGH RISK
          </button>
          <button
            onClick={() => setFilters((p) => ({ ...p, status: 'ALL', riskCategory: 'ALL' }))}
            className={`px-2.5 py-1 rounded transition-colors ${
              filters.status === 'ALL'
                ? 'bg-white text-slate-900 font-bold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            ALL CASES
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-3 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 min-w-[220px] max-w-sm relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
            placeholder="Search by ID, name, or PAN..."
            className="w-full pl-8 pr-3 py-1.5 text-xs font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Dropdown */}
          <div className="flex items-center gap-1 text-xs font-mono">
            <span className="text-slate-400 text-[10px]">STATUS:</span>
            <select
              value={filters.status}
              onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
              className="px-2 py-1 border border-slate-200 rounded-lg bg-white text-xs font-mono text-slate-800 focus:outline-none"
            >
              <option value="ALL">ALL STATUSES</option>
              <option value={APPLICATION_STATUS.IN_REVIEW}>IN_REVIEW</option>
              <option value={APPLICATION_STATUS.PENDING_CHECKER}>PENDING_CHECKER</option>
              <option value={APPLICATION_STATUS.RESUBMISSION_REQUESTED}>RESUBMISSION_REQUESTED</option>
              <option value={APPLICATION_STATUS.AUTO_APPROVED}>AUTO_APPROVED</option>
              <option value={APPLICATION_STATUS.AUTO_REJECTED}>AUTO_REJECTED</option>
            </select>
          </div>

          {/* Reason Code Dropdown */}
          <div className="flex items-center gap-1 text-xs font-mono">
            <span className="text-slate-400 text-[10px]">RULE:</span>
            <select
              value={filters.reasonCode}
              onChange={(e) => setFilters((prev) => ({ ...prev, reasonCode: e.target.value }))}
              className="px-2 py-1 border border-slate-200 rounded-lg bg-white text-xs font-mono text-slate-800 focus:outline-none max-w-[160px] truncate"
            >
              <option value="ALL">ALL REASONS</option>
              <option value="LOW_EXTRACTION_CONFIDENCE">LOW_EXTRACTION_CONFIDENCE</option>
              <option value="NAME_MISMATCH_MINOR">NAME_MISMATCH_MINOR</option>
              <option value="ADDRESS_PROOF_STALE">ADDRESS_PROOF_STALE</option>
              <option value="PEP_MATCH">PEP_MATCH</option>
              <option value="DOCUMENT_MISSING">DOCUMENT_MISSING</option>
              <option value="DOCUMENT_EXPIRED">DOCUMENT_EXPIRED</option>
            </select>
          </div>
        </div>
      </div>

      {/* Queue Data Table */}
      {loading ? (
        <SkeletonTable rows={5} cols={6} />
      ) : queue.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="No cases match this queue filter"
          description="Clear search or adjust criteria to display pending cases."
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-200 text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-2.5 px-4">CASE ID</th>
                  <th className="py-2.5 px-4">APPLICANT</th>
                  <th className="py-2.5 px-4">RISK</th>
                  <th className="py-2.5 px-4">STATUS</th>
                  <th className="py-2.5 px-4">TRIGGERED RULES</th>
                  <th className="py-2.5 px-4">SUBMISSION TIME</th>
                  <th className="py-2.5 px-4 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {queue.map((app) => {
                  const isHighRisk = app.riskCategory === RISK_CATEGORY.HIGH;
                  return (
                    <tr
                      key={app.applicationId}
                      onClick={() => navigate(`/officer/review/${app.applicationId}`)}
                      className={`hover:bg-slate-50/80 cursor-pointer transition-colors ${
                        isHighRisk ? 'bg-rose-50/25' : ''
                      }`}
                    >
                      {/* Application ID & Masked PAN */}
                      <td className="py-3 px-4 font-mono">
                        <span className="font-bold text-blue-600 block">
                          {app.applicationId}
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          {maskPAN(app.panNumber)}
                        </span>
                      </td>

                      {/* Applicant */}
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-900 block">{app.fullName}</span>
                        <span className="text-[10px] text-slate-400 font-mono block">
                          {app.city}, {app.state}
                        </span>
                      </td>

                      {/* Risk */}
                      <td className="py-3 px-4 font-mono">
                        {app.riskCategory ? (
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${
                              RISK_COLORS[app.riskCategory]
                            }`}
                          >
                            {isHighRisk && <AlertTriangle className="w-2.5 h-2.5 text-rose-600" />}
                            {app.riskCategory}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 font-mono">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold border ${
                            STATUS_COLORS[app.status] || 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {app.status}
                        </span>
                      </td>

                      {/* Triggered Reasons */}
                      <td className="py-3 px-4 font-mono text-[11px]">
                        {app.reasonCodes && app.reasonCodes.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {app.reasonCodes.slice(0, 2).map((code) => (
                              <span
                                key={code}
                                className="px-1.5 py-0.2 bg-amber-50 text-amber-800 border border-amber-200 rounded text-[10px]"
                              >
                                {code}
                              </span>
                            ))}
                            {app.reasonCodes.length > 2 && (
                              <span className="text-[10px] text-slate-400 font-semibold">
                                +{app.reasonCodes.length - 2}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-emerald-600 font-mono text-[10px] flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> CLEAN
                          </span>
                        )}
                      </td>

                      {/* Date */}
                      <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                        {formatDateTime(app.applicationDate)}
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/officer/review/${app.applicationId}`);
                          }}
                          className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded font-mono text-[11px] font-semibold transition-colors inline-flex items-center gap-1"
                        >
                          <span>OPEN</span>
                          <ChevronRight className="w-3 h-3 text-blue-400" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
