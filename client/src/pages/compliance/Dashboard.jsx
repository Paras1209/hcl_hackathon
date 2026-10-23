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
  LayoutDashboard as DashIcon,
  Calendar as CalIcon,
  CheckCircle2 as CheckIcon,
  AlertTriangle as AlertIcon,
  Sliders as SlidersIcon,
  ShieldCheck as ShieldCheckIcon,
  RefreshCw as RefreshIcon,
  Save as SaveIcon,
  Layers as LayersIcon,
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
    <div className="space-y-4">
      {/* Executive Command Header */}
      <div className="bg-white rounded-xl border border-slate-200/90 px-5 py-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900 tracking-tight font-mono">
              COMPLIANCE DASHBOARD // FR-10 INTELLIGENCE
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 font-bold">
              AUDITED
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Throughput, straight-through automation, dual-control volume &amp; compliance metrics.
          </p>
        </div>

        {/* Tab & Date Selector Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Segmented View Switcher */}
          <div className="bg-slate-100 p-0.5 rounded-lg flex items-center text-xs font-mono">
            <button
              onClick={() => setActiveTab('ANALYTICS')}
              className={`px-3 py-1 rounded transition-colors ${
                activeTab === 'ANALYTICS'
                  ? 'bg-white text-slate-900 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              METRICS &amp; QUEUES
            </button>
            <button
              onClick={() => setActiveTab('RULES_CONFIG')}
              className={`px-3 py-1 rounded transition-colors ${
                activeTab === 'RULES_CONFIG'
                  ? 'bg-white text-slate-900 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              RULES CONFIG
            </button>
          </div>

          {/* Date Segmented Control */}
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs font-mono">
            {['ALL', 'TODAY', '7D', '30D'].map((range) => (
              <button
                key={range}
                onClick={() => setDateFilter(range)}
                className={`px-2.5 py-1 rounded transition-colors ${
                  dateFilter === range
                    ? 'bg-slate-900 text-white font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {range}
              </button>
            ))}
          </div>

          <button
            onClick={loadDashboard}
            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg border border-slate-200 text-xs transition-colors"
            title="Refresh metrics"
          >
            <RefreshIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {activeTab === 'ANALYTICS' ? (
        <>
          {/* EXACT FR-10 KPI METRIC TILES (Institutional Terminal Design) */}
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
            {/* 1. Straight-Through Rate */}
            <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs">
              <span className="text-[10px] text-slate-400 font-mono font-bold tracking-wider uppercase block">
                STRAIGHT-THROUGH RATE
              </span>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-emerald-600 font-mono tabular-nums">
                  {metrics.straightThroughRate}%
                </span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1.5 font-mono">
                AUTO_APPROVED ÷ Decided
              </p>
            </div>

            {/* 2. Manual Review Rate */}
            <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs">
              <span className="text-[10px] text-slate-400 font-mono font-bold tracking-wider uppercase block">
                REVIEW RATE
              </span>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-amber-600 font-mono tabular-nums">
                  {metrics.reviewRate}%
                </span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1.5 font-mono">
                Target: 30%–40% manual
              </p>
            </div>

            {/* 3. Reject Rate */}
            <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs">
              <span className="text-[10px] text-slate-400 font-mono font-bold tracking-wider uppercase block">
                REJECT RATE
              </span>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-rose-600 font-mono tabular-nums">
                  {metrics.rejectRate}%
                </span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1.5 font-mono">
                Failed rules R4–R10
              </p>
            </div>

            {/* 4. Pending Checker Items */}
            <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs">
              <span className="text-[10px] text-slate-400 font-mono font-bold tracking-wider uppercase block">
                PENDING CHECKER
              </span>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-purple-600 font-mono tabular-nums">
                  {metrics.pendingCheckerCount}
                </span>
                <span className="text-[10px] font-mono text-slate-400">cases</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1.5 font-mono">
                Awaiting authorization
              </p>
            </div>

            {/* 5. Average Time in Review */}
            <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs">
              <span className="text-[10px] text-slate-400 font-mono font-bold tracking-wider uppercase block">
                AVG TIME IN REVIEW
              </span>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-slate-900 font-mono tabular-nums">
                  {metrics.avgTimeInReviewHours}h
                </span>
                <span className="text-[10px] font-mono text-slate-400">SLA: 24h</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1.5 font-mono">
                Baseline: 3 days
              </p>
            </div>

            {/* 6. Total Decided */}
            <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs">
              <span className="text-[10px] text-slate-400 font-mono font-bold tracking-wider uppercase block">
                TOTAL DECIDED
              </span>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-blue-600 font-mono tabular-nums">
                  {metrics.totalDecided}
                </span>
                <span className="text-[10px] font-mono text-slate-400">/ {metrics.totalApplications}</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1.5 font-mono">
                Decided in window
              </p>
            </div>
          </div>

          {/* Charts Row: Status Distribution & Top 5 Reason Codes */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left: Status Distribution Donut */}
            <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between">
              <div>
                <span className="text-[10px] text-slate-400 font-mono font-bold tracking-wider uppercase block">
                  LIFECYCLE STATUS DISTRIBUTION
                </span>
                <p className="text-xs text-slate-500 mt-0.5 font-mono">
                  Active volume across the 10 lifecycle stages
                </p>
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
                        backgroundColor: '#0b0f19',
                        color: '#f8fafc',
                        border: '1px solid #1e293b',
                        borderRadius: '8px',
                        fontFamily: 'monospace',
                        fontSize: '11px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Status Chips */}
              <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono pt-3 border-t border-slate-100">
                {statusChartData.slice(0, 6).map((item) => (
                  <div key={item.code} className="flex items-center justify-between p-1 rounded bg-slate-50">
                    <div className="flex items-center gap-1.5 truncate">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: STATUS_CHART_COLORS[item.code] || '#94a3b8' }}
                      />
                      <span className="truncate text-slate-600">{item.name}</span>
                    </div>
                    <span className="font-bold text-slate-900 ml-1.5">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Top 5 Reason Codes */}
            <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between">
              <div>
                <span className="text-[10px] text-slate-400 font-mono font-bold tracking-wider uppercase block">
                  TOP 5 TRIGGERED REASON CODES (FR-10)
                </span>
                <p className="text-xs text-slate-500 mt-0.5 font-mono">
                  Ranked by frequency from filtered sample dataset
                </p>
              </div>

              <div className="h-64 my-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={reasonChartData}
                    layout="vertical"
                    margin={{ top: 10, right: 20, left: 150, bottom: 5 }}
                  >
                    <XAxis type="number" allowDecimals={false} fontSize={10} stroke="#94a3b8" />
                    <YAxis
                      dataKey="name"
                      type="category"
                      fontSize={10}
                      stroke="#475569"
                      width={145}
                      tickLine={false}
                    />
                    <Tooltip
                      formatter={(val) => [`${val} occurrences`, 'Frequency']}
                      contentStyle={{
                        backgroundColor: '#0b0f19',
                        color: '#f8fafc',
                        border: '1px solid #1e293b',
                        borderRadius: '8px',
                        fontFamily: 'monospace',
                        fontSize: '11px',
                      }}
                    />
                    <Bar dataKey="frequency" fill="#2563eb" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="px-3 py-2 bg-slate-50 rounded-lg text-[10px] font-mono text-slate-500 flex items-center justify-between border border-slate-100">
                <span>Evaluated across {metrics.filteredApplications?.length || 0} applications</span>
                <span className="font-bold text-slate-700">RULES R1–R17 ENGINE</span>
              </div>
            </div>
          </div>

          {/* Dataset Table */}
          <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold font-mono text-slate-800 uppercase tracking-wider">
                FILTERED APPLICATIONS DATASET ({metrics.filteredApplications?.length || 0})
              </h3>
              <span className="text-[10px] font-mono text-slate-400">
                DATE SCOPE: {dateFilter}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs font-mono">
                <thead>
                  <tr className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                    <th className="py-2.5 px-3">CASE ID</th>
                    <th className="py-2.5 px-3 font-sans">APPLICANT</th>
                    <th className="py-2.5 px-3">STATUS</th>
                    <th className="py-2.5 px-3">RISK</th>
                    <th className="py-2.5 px-3">TRIGGERED REASONS</th>
                    <th className="py-2.5 px-3">DATE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[11px]">
                  {metrics.filteredApplications?.slice(0, 7).map((app) => (
                    <tr key={app.applicationId} className="hover:bg-slate-50/70">
                      <td className="py-2 px-3 font-bold text-blue-600">
                        {app.applicationId}
                      </td>
                      <td className="py-2 px-3 font-sans font-semibold text-slate-900">
                        {app.fullName}
                      </td>
                      <td className="py-2 px-3">
                        <span
                          className={`px-1.5 py-0.2 rounded text-[10px] font-semibold border ${
                            STATUS_COLORS[app.status]
                          }`}
                        >
                          {app.status}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-bold text-slate-700">
                        {app.riskCategory || '—'}
                      </td>
                      <td className="py-2 px-3 text-slate-500">
                        {app.reasonCodes?.join(', ') || 'NONE'}
                      </td>
                      <td className="py-2 px-3 text-slate-400 whitespace-nowrap">
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
        <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs space-y-5 font-mono">
          <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                COMPLIANCE PARAMETERS &amp; WATCHLIST THRESHOLDS
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5 font-sans">
                Runtime configuration for rules R1 to R17 as specified in Case Study Section 6.1.
              </p>
            </div>

            <button
              onClick={handleSaveRules}
              disabled={savingRules}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <SaveIcon className="w-3.5 h-3.5 text-blue-400" />
              <span>{savingRules ? 'SAVING...' : 'SAVE CONFIGURATION'}</span>
            </button>
          </div>

          {rulesConfig && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              {/* Extraction Confidence */}
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
                <label className="text-[10px] text-slate-500 uppercase block font-bold">
                  MIN USABLE FIELD CONFIDENCE
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
                  className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-200 rounded bg-white"
                />
                <span className="text-[10px] text-slate-400 block font-sans">
                  Default: 0.80. Below this triggers R3 LOW_EXTRACTION_CONFIDENCE.
                </span>
              </div>

              {/* Name Match Pass */}
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
                <label className="text-[10px] text-slate-500 uppercase block font-bold">
                  NAME MATCH PASS THRESHOLD
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
                  className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-200 rounded bg-white"
                />
                <span className="text-[10px] text-slate-400 block font-sans">
                  Default: 0.90. Above this is auto-pass without review.
                </span>
              </div>

              {/* Name Match Reject */}
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
                <label className="text-[10px] text-slate-500 uppercase block font-bold">
                  NAME MATCH REJECT THRESHOLD
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
                  className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-200 rounded bg-white"
                />
                <span className="text-[10px] text-slate-400 block font-sans">
                  Default: 0.75. Below this triggers R9 NAME_MISMATCH (REJECT).
                </span>
              </div>

              {/* Watchlist Match Threshold */}
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
                <label className="text-[10px] text-slate-500 uppercase block font-bold">
                  WATCHLIST MATCH THRESHOLD
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
                  className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-200 rounded bg-white"
                />
                <span className="text-[10px] text-slate-400 block font-sans">
                  Default: 0.90. Similarity &ge; 0.90 triggers R10 SANCTIONS_MATCH.
                </span>
              </div>

              {/* Address Proof Max Age */}
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
                <label className="text-[10px] text-slate-500 uppercase block font-bold">
                  ADDRESS PROOF MAX AGE (DAYS)
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
                  className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-200 rounded bg-white"
                />
                <span className="text-[10px] text-slate-400 block font-sans">
                  Default: 90 days. Utility bills older trigger R13.
                </span>
              </div>

              {/* Resubmission Window Days */}
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
                <label className="text-[10px] text-slate-500 uppercase block font-bold">
                  RESUBMISSION SLA WINDOW (DAYS)
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
                  className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-200 rounded bg-white"
                />
                <span className="text-[10px] text-slate-400 block font-sans">
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
