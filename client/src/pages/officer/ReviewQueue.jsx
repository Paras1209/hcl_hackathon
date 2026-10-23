import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Inbox,
  Search,
  Filter,
  AlertTriangle,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react';
import { reviewApi } from '../../api/review';
import {
  STATUS_LABELS,
  STATUS_COLORS,
  RISK_COLORS,
  APPLICATION_STATUS,
  RISK_CATEGORY,
} from '../../constants/statuses';
import { maskPAN, formatDateTime } from '../../utils/formatters';
import { SkeletonTable, EmptyState } from '../../components/LoadingState';

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
    <div className="space-y-4 font-sans">
      {/* Operational Header Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Review Queue
            </h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              {queue.length} Active
            </span>
            {highRiskCount > 0 && (
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                {highRiskCount} High Risk
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Prioritized by risk category (<span className="text-rose-600 font-semibold">HIGH first</span>), followed by submission timestamp.
          </p>
        </div>

        {/* Quick Filter Pill Group */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs">
          <button
            onClick={() => setFilters((p) => ({ ...p, status: APPLICATION_STATUS.IN_REVIEW, riskCategory: 'ALL' }))}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
              filters.status === APPLICATION_STATUS.IN_REVIEW && filters.riskCategory === 'ALL'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            In Review
          </button>
          <button
            onClick={() => setFilters((p) => ({ ...p, riskCategory: RISK_CATEGORY.HIGH }))}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
              filters.riskCategory === RISK_CATEGORY.HIGH
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            High Risk
          </button>
          <button
            onClick={() => setFilters((p) => ({ ...p, status: 'ALL', riskCategory: 'ALL' }))}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
              filters.status === 'ALL'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Cases
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-3.5 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <form onSubmit={handleSearchSubmit} className="flex-1 min-w-[240px] max-w-sm relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
            placeholder="Search by case ID, applicant name, or PAN..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-slate-50/50 text-slate-900"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Status Dropdown */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 text-[11px] font-semibold uppercase">Status:</span>
            <select
              value={filters.status}
              onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
              className="px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="ALL">All Statuses</option>
              <option value={APPLICATION_STATUS.IN_REVIEW}>In Review</option>
              <option value={APPLICATION_STATUS.PENDING_CHECKER}>Pending Checker</option>
              <option value={APPLICATION_STATUS.RESUBMISSION_REQUESTED}>Resubmission Requested</option>
              <option value={APPLICATION_STATUS.AUTO_APPROVED}>Auto Approved</option>
              <option value={APPLICATION_STATUS.AUTO_REJECTED}>Auto Rejected</option>
            </select>
          </div>

          {/* Reason Code Dropdown */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 text-[11px] font-semibold uppercase">Rule:</span>
            <select
              value={filters.reasonCode}
              onChange={(e) => setFilters((prev) => ({ ...prev, reasonCode: e.target.value }))}
              className="px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 max-w-[180px] truncate"
            >
              <option value="ALL">All Rule Triggers</option>
              <option value="LOW_EXTRACTION_CONFIDENCE">Low Extraction Confidence</option>
              <option value="NAME_MISMATCH_MINOR">Minor Name Mismatch</option>
              <option value="ADDRESS_PROOF_STALE">Stale Address Proof</option>
              <option value="PEP_MATCH">PEP Match</option>
              <option value="DOCUMENT_MISSING">Document Missing</option>
              <option value="DOCUMENT_EXPIRED">Document Expired</option>
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
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Case ID</th>
                  <th className="py-3 px-4">Applicant</th>
                  <th className="py-3 px-4">Risk Level</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Triggered Rules</th>
                  <th className="py-3 px-4">Submitted At</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
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
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-bold text-blue-600 block font-mono">
                          {app.applicationId}
                        </span>
                        <span className="text-[11px] text-slate-400 block mt-0.5 font-mono">
                          {maskPAN(app.panNumber)}
                        </span>
                      </td>

                      {/* Applicant */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-semibold text-slate-900 block">{app.fullName}</span>
                        <span className="text-[11px] text-slate-400 block">
                          {app.city}, {app.state}
                        </span>
                      </td>

                      {/* Risk */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {app.riskCategory ? (
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                              RISK_COLORS[app.riskCategory]
                            }`}
                          >
                            {isHighRisk && <AlertTriangle className="w-3 h-3 text-rose-600" />}
                            {app.riskCategory}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                            STATUS_COLORS[app.status] || 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {STATUS_LABELS[app.status] || app.status}
                        </span>
                      </td>

                      {/* Triggered Reasons */}
                      <td className="py-3.5 px-4">
                        {app.reasonCodes && app.reasonCodes.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {app.reasonCodes.slice(0, 2).map((code) => (
                              <span
                                key={code}
                                className="px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-md text-[11px] font-medium font-mono"
                              >
                                {code}
                              </span>
                            ))}
                            {app.reasonCodes.length > 2 && (
                              <span className="text-[11px] text-slate-400 font-semibold self-center">
                                +{app.reasonCodes.length - 2}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-emerald-700 text-xs flex items-center gap-1 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Clean
                          </span>
                        )}
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 text-slate-500 text-xs whitespace-nowrap">
                        {formatDateTime(app.applicationDate)}
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/officer/review/${app.applicationId}`);
                          }}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors inline-flex items-center gap-1 shadow-xs cursor-pointer"
                        >
                          <span>Review</span>
                          <ChevronRight className="w-3.5 h-3.5" />
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
