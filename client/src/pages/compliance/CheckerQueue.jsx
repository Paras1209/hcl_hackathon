import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  RotateCcw,
  AlertTriangle,
  FileText,
  Building2,
  ShieldAlert,
} from 'lucide-react';
import { checkerApi } from '../../api/checker';
import { applicationsApi } from '../../api/applications';
import { authApi } from '../../api/auth';
import { RISK_COLORS, STATUS_LABELS } from '../../constants/statuses';
import { maskPAN, formatDateTime } from '../../utils/formatters';
import ConfirmDialog from '../../components/ConfirmDialog';
import { LoadingSpinner, EmptyState } from '../../components/LoadingState';
import { useToast } from '../../components/Toast';

export default function CheckerQueue() {
  const [pendingCases, setPendingCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCase, setSelectedCase] = useState(null);
  const [caseDetails, setCaseDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  // Decision Modal State
  const [decisionType, setDecisionType] = useState('APPROVE');
  const [decisionComment, setDecisionComment] = useState('');
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [decisionSubmitting, setDecisionSubmitting] = useState(false);

  // Success Account Opened Modal
  const [accountOpenedModal, setAccountOpenedModal] = useState(null);

  const { showToast } = useToast();

  const loadData = async () => {
    try {
      setLoading(true);
      const userRes = await authApi.getCurrentUser();
      if (userRes.success) setCurrentUser(userRes.data);

      const res = await checkerApi.getPendingCheckerQueue();
      if (res.success) {
        setPendingCases(res.data);
        if (res.data.length > 0 && !selectedCase) {
          handleSelectCase(res.data[0]);
        }
      }
    } catch (e) {
      showToast('Error loading checker queue', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSelectCase = async (item) => {
    setSelectedCase(item);
    setLoadingDetails(true);
    try {
      const full = await applicationsApi.getApplication(item.applicationId);
      if (full.success) {
        setCaseDetails(full.data);
      }
    } catch (e) {
      console.warn('Error loading case details', e);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleInitiateDecision = (type) => {
    setDecisionType(type);
    setDecisionComment('');
    setConfirmModalOpen(true);
  };

  const handleSubmitDecision = async () => {
    if (!decisionComment || decisionComment.trim().length < 5) {
      showToast('Please enter an explanatory checker comment', 'error');
      return;
    }

    setDecisionSubmitting(true);
    try {
      const res = await checkerApi.submitCheckerDecision(selectedCase.applicationId, {
        decision: decisionType,
        comment: decisionComment,
      });

      if (res.success) {
        setConfirmModalOpen(false);

        if (decisionType === 'APPROVE' && res.syntheticBankingResult) {
          setAccountOpenedModal(res.syntheticBankingResult);
        } else {
          showToast(`Case ${selectedCase.applicationId} marked as ${decisionType}`, 'success');
        }

        setSelectedCase(null);
        setCaseDetails(null);
        loadData();
      }
    } catch (err) {
      if (err.code === 'MAKER_CHECKER_VIOLATION') {
        showToast(err.message, 'error', 6000);
      } else {
        showToast(err.message || 'Decision failed', 'error');
      }
    } finally {
      setDecisionSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Accessing pending checker desk..." />;
  }

  // Maker-checker segregation check
  const isMakerCheckerConflict =
    selectedCase?.makerRecommendation?.officerId &&
    currentUser?.id === selectedCase.makerRecommendation.officerId;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200/90 px-5 py-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900 tracking-tight font-mono">
              PENDING CHECKER QUEUE // DUAL-CONTROL (FR-7)
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 font-bold">
              {pendingCases.length} AWAITING SIGN-OFF
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Active Checker: <span className="font-semibold text-slate-800">{currentUser?.name}</span> • Regulatory segregation: Checker must not match Maker.
          </p>
        </div>
      </div>

      {pendingCases.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="All pending checker cases authorized"
          description="There are currently no cases waiting in the PENDING_CHECKER queue."
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Column: Pending Cases List (5 cols) */}
          <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">
                CASES AWAITING AUTHORIZATION ({pendingCases.length})
              </span>
            </div>

            <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
              {pendingCases.map((item) => {
                const isSelected = selectedCase?.applicationId === item.applicationId;
                return (
                  <div
                    key={item.applicationId}
                    onClick={() => handleSelectCase(item)}
                    className={`p-3.5 cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-purple-50/60 border-l-2 border-l-purple-600'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 font-mono">
                      <span className="font-bold text-xs text-blue-600">
                        {item.applicationId}
                      </span>
                      {item.riskCategory && (
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                            RISK_COLORS[item.riskCategory]
                          }`}
                        >
                          {item.riskCategory} RISK
                        </span>
                      )}
                    </div>

                    <h4 className="text-xs font-bold text-slate-900 mt-1">{item.fullName}</h4>

                    <div className="mt-2 text-[11px] text-slate-500 space-y-0.5 font-mono">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-sans text-[10px]">Maker:</span>
                        <span className="font-medium text-slate-700">
                          {item.makerRecommendation?.officerName || 'KYC Officer'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-sans text-[10px]">Action:</span>
                        <span className="font-bold text-purple-700">
                          {item.makerRecommendation?.action || 'APPROVE'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Case Inspection & Checker Terminal (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            {selectedCase && (
              <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs space-y-5">
                {/* Dual Control Segregation Alert */}
                {isMakerCheckerConflict && (
                  <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-900 flex items-start gap-2.5 font-mono">
                    <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div className="font-sans">
                      <span className="font-bold block text-rose-800">
                        DUAL-CONTROL POLICY RESTRICTION (RULE FR-7)
                      </span>
                      <p className="text-[11px] text-rose-700 mt-0.5 leading-relaxed">
                        You recommended this application as Maker ({selectedCase.makerRecommendation.officerName}).
                        The authorizing checker must be a different compliance user. Switch persona to complete sign-off.
                      </p>
                    </div>
                  </div>
                )}

                {/* Case Header */}
                <div className="border-b border-slate-100 pb-3 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                      CHECKER INSPECTION
                    </span>
                    <h3 className="text-sm font-bold text-slate-900">
                      {selectedCase.fullName} — <span className="font-mono">{selectedCase.applicationId}</span>
                    </h3>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                      PAN: {maskPAN(selectedCase.panNumber)}
                    </p>
                  </div>

                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                      RISK_COLORS[selectedCase.riskCategory] || 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {selectedCase.riskCategory} RISK
                  </span>
                </div>

                {/* Maker Evidence Card */}
                <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-lg space-y-2 text-xs font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 text-[10px] font-sans">RECOMMENDATION:</span>
                    <span className="text-purple-700 font-bold text-xs">
                      {selectedCase.makerRecommendation?.action || 'APPROVE'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span className="text-slate-500 text-[10px] font-sans">RECOMMENDING OFFICER:</span>
                    <span className="font-medium">
                      {selectedCase.makerRecommendation?.officerName || 'KYC Officer'}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-slate-200/60">
                    <span className="text-[10px] text-slate-400 font-sans uppercase font-semibold block mb-1">
                      OFFICER COMMENT:
                    </span>
                    <p className="bg-white p-2.5 rounded border text-slate-800 font-sans leading-relaxed text-xs">
                      "{selectedCase.makerRecommendation?.comment || 'Documents verified.'}"
                    </p>
                  </div>
                </div>

                {/* Documents List */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
                    SUBMITTED SPECIMEN DOCUMENTS ({caseDetails?.documents?.length || 3})
                  </span>
                  <div className="space-y-1 font-mono text-xs">
                    {caseDetails?.documents?.map((doc) => (
                      <div
                        key={doc.docId}
                        className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/80 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <FileText className="w-3.5 h-3.5 text-blue-600" />
                          <span className="font-semibold text-slate-800">{doc.fileName}</span>
                        </div>
                        <span className="text-[11px] text-slate-500">
                          {doc.declaredDocType} ({(doc.docTypeConfidence * 100).toFixed(0)}%)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Checker Decision Buttons */}
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
                    CHECKER ACTION (AUTHORITATIVE DECISION)
                  </span>

                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      disabled={isMakerCheckerConflict}
                      onClick={() => handleInitiateDecision('APPROVE')}
                      className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-mono font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 disabled:opacity-40 shadow-xs"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>APPROVE</span>
                    </button>

                    <button
                      type="button"
                      disabled={isMakerCheckerConflict}
                      onClick={() => handleInitiateDecision('SEND_BACK')}
                      className="py-2.5 px-3 bg-amber-600 hover:bg-amber-700 text-white font-mono font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 disabled:opacity-40 shadow-xs"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>SEND BACK</span>
                    </button>

                    <button
                      type="button"
                      disabled={isMakerCheckerConflict}
                      onClick={() => handleInitiateDecision('REJECT')}
                      className="py-2.5 px-3 bg-rose-600 hover:bg-rose-700 text-white font-mono font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 disabled:opacity-40 shadow-xs"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>REJECT</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CONFIRM DECISION MODAL */}
      <ConfirmDialog
        isOpen={confirmModalOpen}
        title={`Render Checker Decision: ${decisionType}`}
        message={`Are you sure you want to finalize case ${selectedCase?.applicationId} as [${decisionType}]?`}
        confirmLabel={`Confirm ${decisionType}`}
        type={decisionType === 'REJECT' ? 'danger' : decisionType === 'APPROVE' ? 'success' : 'warning'}
        loading={decisionSubmitting}
        onConfirm={handleSubmitDecision}
        onCancel={() => setConfirmModalOpen(false)}
      >
        <div className="space-y-2 font-mono">
          <label className="text-[11px] text-slate-700 block font-sans font-semibold">
            Checker Rationale Comment *
          </label>
          <textarea
            rows={2}
            value={decisionComment}
            onChange={(e) => setDecisionComment(e.target.value)}
            placeholder="Record compliance decision rationale..."
            className="w-full p-2.5 text-xs font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
          />
        </div>
      </ConfirmDialog>

      {/* SYNTHETIC ACCOUNT OPENED MODAL */}
      {accountOpenedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs font-mono">
          <div className="bg-white rounded-xl max-w-md w-full shadow-2xl border border-slate-200 p-6 text-center space-y-4">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center mx-auto">
              <Building2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase">
                SAVINGS ACCOUNT INITIALIZED // MOCK CORE BANKING
              </h3>
              <p className="text-xs text-slate-500 font-sans mt-1">
                Synthetic customer and savings account established in Deccan Digital Bank.
              </p>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-lg text-left text-xs space-y-2">
              <div>
                <span className="text-slate-400 block text-[9px] uppercase font-sans">
                  Account Number
                </span>
                <span className="font-bold text-emerald-800 text-sm">
                  {accountOpenedModal.accountNumber}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[9px] uppercase font-sans">
                  Customer ID
                </span>
                <span className="font-semibold text-slate-800">
                  {accountOpenedModal.customerId}
                </span>
              </div>
            </div>

            <button
              onClick={() => setAccountOpenedModal(null)}
              className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-lg transition-colors"
            >
              DISMISS
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
