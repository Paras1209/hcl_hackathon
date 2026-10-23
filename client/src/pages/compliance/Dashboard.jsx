import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  RefreshCw as RefreshIcon,
  Save as SaveIcon,
  CheckCircle2 as CheckIcon,
  AlertTriangle as AlertIcon,
  Sliders as SlidersIcon,
  Clock,
  TrendingUp,
  FileText,
  Users,
} from 'lucide-react';
import { checkerApi } from '../../api/checker';
import { STATUS_LABELS, STATUS_COLORS, APPLICATION_STATUS } from '../../constants/statuses';
import { formatDate } from '../../utils/formatters';
import { LoadingSpinner } from '../../components/LoadingState';
import { useToast } from '../../components/Toast';

export default function Dashboard() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState('ALL'); // 'ALL' | 'TODAY' | '7D' | '30D'
  const [activeTab, setActiveTab] = useState('ANALYTICS'); // 'ANALYTICS' | 'RULES_CONFIG'

  // Rules Configuration state
  const [rulesConfig, setRulesConfig] = useState(null);
  const [savingRules, setSavingRules] = useState(false);

  const { showToast } = useToast();

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const res = await checkerApi.getDashboardMetrics(dateFilter);
      if (res.success) {
        setMetrics(res.data);
      }
      const cfgRes = await checkerApi.getRuleConfigurations();
      if (cfgRes.success) {
        setRulesConfig(cfgRes.data);
      }
    } catch (e) {
      showToast('Error loading compliance dashboard', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [dateFilter]);

  const handleSaveRules = async () => {
    setSavingRules(true);
    try {
      await checkerApi.updateRuleConfigurations(rulesConfig);
      showToast('Rule parameters updated for subsequent evaluations', 'success');
    } catch (e) {
      showToast('Error saving rule parameters', 'error');
    } finally {
      setSavingRules(false);
    }
  };

  if (loading || !metrics) {
    return <LoadingSpinner message="Calculating FR-10 compliance metrics..." />;
  }

  // Chart data: Status distribution
  const statusChartData = Object.entries(metrics.statusCounts || {})
    .filter(([_, count]) => count > 0)
    .map(([status, count]) => ({
      name: status,
      label: STATUS_LABELS[status] || status,
      code: status,
      count,
    }));

  const STATUS_CHART_COLORS = {
    [APPLICATION_STATUS.AUTO_APPROVED]: '#10b981',
    [APPLICATION_STATUS.APPROVED]: '#059669',
    [APPLICATION_STATUS.IN_REVIEW]: '#f59e0b',
    [APPLICATION_STATUS.PENDING_CHECKER]: '#8b5cf6',
    [APPLICATION_STATUS.RESUBMISSION_REQUESTED]: '#f97316',
    [APPLICATION_STATUS.AUTO_REJECTED]: '#ef4444',
    [APPLICATION_STATUS.REJECTED]: '#e11d48',
    [APPLICATION_STATUS.CLOSED_EXPIRED]: '#64748b',
    [APPLICATION_STATUS.SUBMITTED]: '#3b82f6',
    [APPLICATION_STATUS.EXTRACTING]: '#6366f1',
  };

  // Top 5 Reason Codes Chart Data
  const reasonChartData = (metrics.topReasonCodes || []).map((item) => ({
    name: item.code,
    frequency: item.count,
  }));

  return (
    <div className="space-y-5 font-sans">
      {/* Executive Command Header */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Compliance Dashboard
            </h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              FR-10 Regulatory Intelligence
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time compliance throughput, STP automation rates, dual-control backlogs &amp; exception metrics.
          </p>
        </div>

        {/* Tab & Date Selector Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Segmented View Switcher */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center text-xs">
            <button
              onClick={() => setActiveTab('ANALYTICS')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                activeTab === 'ANALYTICS'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Metrics &amp; Queues
            </button>
            <button
              onClick={() => setActiveTab('RULES_CONFIG')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                activeTab === 'RULES_CONFIG'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Rules Configuration
            </button>
          </div>

          {/* Date Segmented Control */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs">
            {['ALL', 'TODAY', '7D', '30D'].map((range) => (
              <button
                key={range}
                onClick={() => setDateFilter(range)}
                className={`px-2.5 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  dateFilter === range
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {range}
              </button>
            ))}
          </div>

          <button
            onClick={loadDashboard}
            className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl border border-slate-200 text-xs transition-colors cursor-pointer"
            title="Refresh metrics"
          >
            <RefreshIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {activeTab === 'ANALYTICS' ? (
        <>
          {/* EXACT FR-10 KPI METRIC TILES */}
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-3.5">
            {/* 1. Straight-Through Rate */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
              <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block">
                Straight-Through Rate
              </span>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-2xl font-bold text-emerald-600 tabular-nums">
                  {metrics.straightThroughRate}%
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Auto-Approved ÷ Decided
              </p>
            </div>

            {/* 2. Manual Review Rate */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
              <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block">
                Review Rate
              </span>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-2xl font-bold text-amber-600 tabular-nums">
                  {metrics.reviewRate}%
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Target: 30%–40% manual
              </p>
            </div>

            {/* 3. Reject Rate */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
              <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block">
                Rejection Rate
              </span>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-2xl font-bold text-rose-600 tabular-nums">
                  {metrics.rejectRate}%
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Rules R4–R10 adverse
              </p>
            </div>

            {/* 4. Pending Checker Items */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
              <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block">
                Pending Checker
              </span>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-blue-600 tabular-nums">
                  {metrics.pendingCheckerCount}
                </span>
                <span className="text-xs text-slate-400 font-medium">cases</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Awaiting sign-off
              </p>
            </div>

            {/* 5. Average Time in Review */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
              <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block">
                Review TAT (Avg)
              </span>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-slate-900 tabular-nums">
                  {metrics.avgTimeInReviewHours}h
                </span>
                <span className="text-[11px] text-slate-400">SLA: 24h</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Baseline: 3 days
              </p>
            </div>

            {/* 6. Total Decided */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
              <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block">
                Total Decided
              </span>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-slate-900 tabular-nums">
                  {metrics.totalDecided}
                </span>
                <span className="text-xs text-slate-400 font-medium">/ {metrics.totalApplications}</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Within selected window
              </p>
            </div>
          </div>

          {/* Charts Row: Status Distribution & Top 5 Reason Codes */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left: Status Distribution Donut */}
            <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs flex flex-col justify-between">
              <div>
                <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block">
                  Status Distribution
                </span>
                <h3 className="text-sm font-bold text-slate-900 mt-0.5">
                  Lifecycle Volume Allocation
                </h3>
              </div>

              <div className="h-60 my-2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusChartData}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={3}
                    >
                      {statusChartData.map((entry) => (
                        <Cell
                          key={`cell-${entry.code}`}
                          fill={STATUS_CHART_COLORS[entry.code] || '#94a3b8'}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val, name) => [`${val} cases`, name]}
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        color: '#17243a',
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        fontSize: '12px',
                        fontFamily: 'sans-serif',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Status Chips */}
              <div className="grid grid-cols-2 gap-1.5 text-xs pt-3.5 border-t border-slate-100">
                {statusChartData.slice(0, 6).map((item) => (
                  <div key={item.code} className="flex items-center justify-between p-1.5 rounded-lg bg-slate-50">
                    <div className="flex items-center gap-2 truncate">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: STATUS_CHART_COLORS[item.code] || '#94a3b8' }}
                      />
                      <span className="truncate text-slate-700 font-medium">{item.name}</span>
                    </div>
                    <span className="font-bold text-slate-900 ml-1.5 tabular-nums">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Top 5 Reason Codes */}
            <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs flex flex-col justify-between">
              <div>
                <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block">
                  Top 5 Adverse Reason Codes (FR-10)
                </span>
                <h3 className="text-sm font-bold text-slate-900 mt-0.5">
                  Exceptions Ranked by Frequency
                </h3>
              </div>

              <div className="h-64 my-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={reasonChartData}
                    layout="vertical"
                    margin={{ top: 10, right: 20, left: 160, bottom: 5 }}
                  >
                    <XAxis type="number" allowDecimals={false} fontSize={11} stroke="#94a3b8" />
                    <YAxis
                      dataKey="name"
                      type="category"
                      fontSize={11}
                      stroke="#475569"
                      width={155}
                      tickLine={false}
                    />
                    <Tooltip
                      formatter={(val) => [`${val} occurrences`, 'Frequency']}
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        color: '#17243a',
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        fontSize: '12px',
                        fontFamily: 'sans-serif',
                      }}
                    />
                    <Bar dataKey="frequency" fill="#2563eb" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="px-4 py-2.5 bg-slate-50 rounded-xl text-xs text-slate-500 flex items-center justify-between border border-slate-100">
                <span>Evaluated across {metrics.filteredApplications?.length || 0} applications in window</span>
                <span className="font-semibold text-slate-800">Rules Engine R1–R17</span>
              </div>
            </div>
          </div>

          {/* Dataset Table */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Filtered Applications Dataset ({metrics.filteredApplications?.length || 0})
              </h3>
              <span className="text-xs text-slate-400 font-medium">
                Scope: {dateFilter}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200/80">
                    <th className="py-2.5 px-3">Case ID</th>
                    <th className="py-2.5 px-3">Applicant</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Risk</th>
                    <th className="py-2.5 px-3">Triggered Reasons</th>
                    <th className="py-2.5 px-3">Submission Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {metrics.filteredApplications?.slice(0, 7).map((app) => (
                    <tr key={app.applicationId} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-3 font-bold text-blue-600 font-mono">
                        {app.applicationId}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">
                        {app.fullName}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${
                            STATUS_COLORS[app.status]
                          }`}
                        >
                          {STATUS_LABELS[app.status] || app.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-700">
                        {app.riskCategory || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500">
                        {app.reasonCodes?.join(', ') || 'None'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap">
                        {formatDate(app.applicationDate)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* RULES & WATCHLISTS CONFIGURATION CONSOLE */
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Compliance Parameters &amp; Watchlist Thresholds
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Runtime configuration for rules R1 to R17 as specified in Case Study Section 6.1.
              </p>
            </div>

            <button
              onClick={handleSaveRules}
              disabled={savingRules}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50 shadow-xs cursor-pointer"
            >
              <SaveIcon className="w-4 h-4" />
              <span>{savingRules ? 'Saving...' : 'Save Configuration'}</span>
            </button>
          </div>

          {rulesConfig && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 text-xs">
              {/* Extraction Confidence */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                <label className="text-xs text-slate-700 font-semibold block">
                  Min Usable Field Confidence
                </label>
                <input
                  type="number"
                  step="0.05"
                  min="0.5"
                  max="1.0"
                  value={rulesConfig.minFieldConfidence}
                  onChange={(e) =>
                    setRulesConfig({ ...rulesConfig, minFieldConfidence: parseFloat(e.target.value) })
                  }
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                <span className="text-[11px] text-slate-400 block">
                  Default: 0.80. Below this triggers R3 LOW_EXTRACTION_CONFIDENCE.
                </span>
              </div>

              {/* Name Match Pass */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                <label className="text-xs text-slate-700 font-semibold block">
                  Name Match Pass Threshold
                </label>
                <input
                  type="number"
                  step="0.05"
                  min="0.7"
                  max="1.0"
                  value={rulesConfig.nameMatchPassThreshold}
                  onChange={(e) =>
                    setRulesConfig({
                      ...rulesConfig,
                      nameMatchPassThreshold: parseFloat(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                <span className="text-[11px] text-slate-400 block">
                  Default: 0.90. Above this is auto-pass without review.
                </span>
              </div>

              {/* Name Match Reject */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                <label className="text-xs text-slate-700 font-semibold block">
                  Name Match Reject Threshold
                </label>
                <input
                  type="number"
                  step="0.05"
                  min="0.5"
                  max="0.85"
                  value={rulesConfig.nameMatchRejectThreshold}
                  onChange={(e) =>
                    setRulesConfig({
                      ...rulesConfig,
                      nameMatchRejectThreshold: parseFloat(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                <span className="text-[11px] text-slate-400 block">
                  Default: 0.75. Below this triggers R9 NAME_MISMATCH (REJECT).
                </span>
              </div>

              {/* Watchlist Match Threshold */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                <label className="text-xs text-slate-700 font-semibold block">
                  Watchlist Match Threshold
                </label>
                <input
                  type="number"
                  step="0.05"
                  value={rulesConfig.watchlistMatchThreshold}
                  onChange={(e) =>
                    setRulesConfig({
                      ...rulesConfig,
                      watchlistMatchThreshold: parseFloat(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                <span className="text-[11px] text-slate-400 block">
                  Default: 0.90. Similarity &ge; 0.90 triggers R10 SANCTIONS_MATCH.
                </span>
              </div>

              {/* Address Proof Max Age */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                <label className="text-xs text-slate-700 font-semibold block">
                  Address Proof Max Age (Days)
                </label>
                <input
                  type="number"
                  value={rulesConfig.addressProofMaxAgeDays}
                  onChange={(e) =>
                    setRulesConfig({
                      ...rulesConfig,
                      addressProofMaxAgeDays: parseInt(e.target.value, 10),
                    })
                  }
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                <span className="text-[11px] text-slate-400 block">
                  Default: 90 days. Utility bills older trigger R13.
                </span>
              </div>

              {/* Resubmission Window Days */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                <label className="text-xs text-slate-700 font-semibold block">
                  Resubmission SLA Window (Days)
                </label>
                <input
                  type="number"
                  value={rulesConfig.resubmissionWindowDays}
                  onChange={(e) =>
                    setRulesConfig({
                      ...rulesConfig,
                      resubmissionWindowDays: parseInt(e.target.value, 10),
                    })
                  }
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                <span className="text-[11px] text-slate-400 block">
                  Default: 7 days. Beyond this marks CLOSED_EXPIRED.
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
