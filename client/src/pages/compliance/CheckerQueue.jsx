import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  RotateCcw,
  FileText,
  Building2,
  ShieldAlert,
} from 'lucide-react';
import { checkerApi } from '../../api/checker';
import { applicationsApi } from '../../api/applications';
import { authApi } from '../../api/auth';
import { RISK_COLORS, STATUS_LABELS } from '../../constants/statuses';
import { maskPAN } from '../../utils/formatters';
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
    <div className="space-y-4 font-sans">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Dual Authorization Queue
            </h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              {pendingCases.length} Awaiting Sign-off
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Authorizing Officer: <span className="font-semibold text-slate-800">{currentUser?.name}</span> · Dual control enforcement (Rule FR-7): Checker must be a different compliance user than Maker.
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
          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Cases Awaiting Sign-off ({pendingCases.length})
              </span>
            </div>

            <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
              {pendingCases.map((item) => {
                const isSelected = selectedCase?.applicationId === item.applicationId;
                return (
                  <div
                    key={item.applicationId}
                    onClick={() => handleSelectCase(item)}
                    className={`p-4 cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-blue-50/50 border-l-3 border-l-blue-600'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-xs text-blue-600 font-mono">
                        {item.applicationId}
                      </span>
                      {item.riskCategory && (
                        <span
                          className={`text-[11px] font-semibold px-2 py-0.2 rounded-full border ${
                            RISK_COLORS[item.riskCategory]
                          }`}
                        >
                          {item.riskCategory} Risk
                        </span>
                      )}
                    </div>

                    <h4 className="text-sm font-semibold text-slate-900 mt-1">{item.fullName}</h4>

                    <div className="mt-2 text-xs text-slate-500 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 text-[11px]">Maker:</span>
                        <span className="font-medium text-slate-700">
                          {item.makerRecommendation?.officerName || 'KYC Officer'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 text-[11px]">Recommended:</span>
                        <span className="font-semibold text-blue-700">
                          {item.makerRecommendation?.action || 'APPROVE'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Case Inspection & Decision Desk (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            {selectedCase && (
              <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-5">
                {/* Dual Control Segregation Alert */}
                {isMakerCheckerConflict && (
                  <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 flex items-start gap-3">
                    <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block text-rose-800 text-sm">
                        Dual-Control Policy Restriction (Rule FR-7)
                      </span>
                      <p className="text-xs text-rose-700 mt-1 leading-relaxed">
                        You recommended this application as Maker ({selectedCase.makerRecommendation.officerName}).
                        The authorizing checker must be a different compliance user. Please switch persona to complete sign-off.
                      </p>
                    </div>
                  </div>
                )}

                {/* Case Header */}
                <div className="border-b border-slate-100 pb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                      Compliance Inspection
                    </span>
                    <h3 className="text-base font-bold text-slate-900 mt-0.5">
                      {selectedCase.fullName} · <span className="font-mono text-slate-700">{selectedCase.applicationId}</span>
                    </h3>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">
                      PAN: {maskPAN(selectedCase.panNumber)}
                    </p>
                  </div>

                  <span
                    className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                      RISK_COLORS[selectedCase.riskCategory] || 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {selectedCase.riskCategory} Risk
                  </span>
                </div>

                {/* Maker Evidence Card */}
                <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Recommendation:</span>
                    <span className="text-blue-700 font-bold">
                      {selectedCase.makerRecommendation?.action || 'APPROVE'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span className="text-slate-500 font-medium">Recommending Officer:</span>
                    <span className="font-semibold text-slate-900">
                      {selectedCase.makerRecommendation?.officerName || 'KYC Officer'}
                    </span>
                  </div>
                  <div className="pt-2.5 border-t border-slate-200/70">
                    <span className="text-[11px] text-slate-400 uppercase font-semibold block mb-1">
                      Maker Officer Comment:
                    </span>
                    <p className="bg-white p-3 rounded-lg border border-slate-200/70 text-slate-800 leading-relaxed text-xs">
                      "{selectedCase.makerRecommendation?.comment || 'Documents verified.'}"
                    </p>
                  </div>
                </div>

                {/* Documents List */}
                <div className="space-y-2">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                    Submitted Specimen Documents ({caseDetails?.documents?.length || 3})
                  </span>
                  <div className="space-y-1.5 text-xs">
                    {caseDetails?.documents?.map((doc) => (
                      <div
                        key={doc.docId}
                        className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-blue-600" />
                          <span className="font-semibold text-slate-900">{doc.fileName}</span>
                        </div>
                        <span className="text-xs text-slate-500 font-medium">
                          {doc.declaredDocType} ({(doc.docTypeConfidence * 100).toFixed(0)}%)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Checker Decision Buttons */}
                <div className="pt-4 border-t border-slate-100 space-y-3">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                    Authoritative Decision Action
                  </span>

                  <div className="grid grid-cols-3 gap-2.5">
                    <button
                      type="button"
                      disabled={isMakerCheckerConflict}
                      onClick={() => handleInitiateDecision('APPROVE')}
                      className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-40 shadow-xs cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Approve</span>
                    </button>

                    <button
                      type="button"
                      disabled={isMakerCheckerConflict}
                      onClick={() => handleInitiateDecision('SEND_BACK')}
                      className="py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-40 shadow-xs cursor-pointer"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Send Back</span>
                    </button>

                    <button
                      type="button"
                      disabled={isMakerCheckerConflict}
                      onClick={() => handleInitiateDecision('REJECT')}
                      className="py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-40 shadow-xs cursor-pointer"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Reject</span>
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
        <div className="space-y-2 font-sans">
          <label className="text-xs text-slate-700 block font-semibold">
            Checker Rationale Comment *
          </label>
          <textarea
            rows={2}
            value={decisionComment}
            onChange={(e) => setDecisionComment(e.target.value)}
            placeholder="Record compliance decision rationale..."
            className="w-full p-3 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-slate-50/50 text-slate-900"
          />
        </div>
      </ConfirmDialog>

      {/* SYNTHETIC ACCOUNT OPENED MODAL */}
      {accountOpenedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs font-sans">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 p-6 text-center space-y-4">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
              <Building2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900">
                Savings Account Initialized
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Synthetic customer and savings account established in Deccan Digital Bank core banking simulator.
              </p>
            </div>

            <div className="bg-emerald-50/80 border border-emerald-200 p-4 rounded-xl text-left text-xs space-y-2">
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">
                  Account Number
                </span>
                <span className="font-bold text-emerald-900 text-base font-mono">
                  {accountOpenedModal.accountNumber}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">
                  Customer ID
                </span>
                <span className="font-semibold text-slate-800 font-mono">
                  {accountOpenedModal.customerId}
                </span>
              </div>
            </div>

            <button
              onClick={() => setAccountOpenedModal(null)}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl transition-colors cursor-pointer shadow-xs"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
