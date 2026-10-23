import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  RefreshCw,
  FileText,
  AlertTriangle,
  History,
  ShieldAlert,
  Send,
  Edit3,
  Layers,
  Clock,
} from 'lucide-react';
import { reviewApi } from '../../api/review';
import { applicationsApi } from '../../api/applications';
import DocumentViewer from '../../components/DocumentViewer';
import ExtractedFields from '../../components/ExtractedFields';
import ConfirmDialog from '../../components/ConfirmDialog';
import { LoadingSpinner } from '../../components/LoadingState';
import { useToast } from '../../components/Toast';
import { maskPAN, formatDateTime } from '../../utils/formatters';
import { APPLICATION_STATUS, STATUS_LABELS, RISK_COLORS } from '../../constants/statuses';

export default function ReviewWorkbench() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [application, setApplication] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [selectedDocId, setSelectedDocId] = useState(null);
  const [sanctionsMatch, setSanctionsMatch] = useState(null);
  const [pepMatch, setPepMatch] = useState(null);
  const [auditTrail, setAuditTrail] = useState([]);

  // Field Correction Modal State
  const [correctionModalOpen, setCorrectionModalOpen] = useState(false);
  const [selectedFieldToCorrect, setSelectedFieldToCorrect] = useState(null);
  const [correctedValue, setCorrectedValue] = useState('');
  const [correctionReason, setCorrectionReason] = useState('');
  const [correctionSubmitting, setCorrectionSubmitting] = useState(false);

  // Recommendation State
  const [recommendationAction, setRecommendationAction] = useState('APPROVE');
  const [recommendationComment, setRecommendationComment] = useState('');
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [recommendationSubmitting, setRecommendationSubmitting] = useState(false);

  const loadReviewData = async () => {
    try {
      setLoading(true);
      const targetId = id || 'A2000004';
      const res = await reviewApi.getApplicationReview(targetId);
      if (res.success) {
        setApplication(res.data.application);
        setDocuments(res.data.documents);
        setSanctionsMatch(res.data.sanctionsMatch);
        setPepMatch(res.data.pepMatch);

        if (res.data.documents.length > 0 && !selectedDocId) {
          setSelectedDocId(res.data.documents[0].docId);
        }
      }

      // Load full audit history
      const fullApp = await applicationsApi.getApplication(targetId);
      if (fullApp.success) {
        setAuditTrail(fullApp.data.auditHistory || []);
      }
    } catch (e) {
      showToast('Error loading application review workspace', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReviewData();
  }, [id]);

  // Open Correction Modal
  const handleOpenCorrection = (fieldData) => {
    setSelectedFieldToCorrect(fieldData);
    setCorrectedValue(fieldData.currentValue || '');
    setCorrectionReason('');
    setCorrectionModalOpen(true);
  };

  // Submit Field Correction (FR-6)
  const handleSubmitCorrection = async () => {
    if (!correctionReason || correctionReason.trim().length < 10) {
      showToast('Mandatory correction reason must be at least 10 characters', 'error');
      return;
    }

    setCorrectionSubmitting(true);
    try {
      const res = await reviewApi.correctExtractedField(application.applicationId, {
        docId: selectedFieldToCorrect.docId,
        fieldName: selectedFieldToCorrect.fieldName,
        correctedValue,
        reason: correctionReason,
      });

      if (res.success) {
        showToast(
          `Field corrected to "${correctedValue}" (Confidence: 1.00, Source: OFFICER)`,
          'success'
        );
        setCorrectionModalOpen(false);
        loadReviewData();
      }
    } catch (err) {
      showToast(err.message || 'Correction failed', 'error');
    } finally {
      setCorrectionSubmitting(false);
    }
  };

  // Submit Officer Recommendation
  const handleConfirmRecommendation = async () => {
    if (!recommendationComment || recommendationComment.trim().length < 10) {
      showToast('Mandatory officer comment must be at least 10 characters', 'error');
      return;
    }

    setRecommendationSubmitting(true);
    try {
      const res = await reviewApi.submitOfficerRecommendation(application.applicationId, {
        action: recommendationAction,
        comment: recommendationComment,
      });

      if (res.success) {
        showToast(
          `Recommendation [${recommendationAction}] submitted. Case moved to ${res.data.status}.`,
          'success'
        );
        setConfirmModalOpen(false);
        navigate('/officer/queue');
      }
    } catch (err) {
      showToast(err.message || 'Submission failed', 'error');
    } finally {
      setRecommendationSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Opening review desk &amp; registering document view audit..." />;
  }

  if (!application) {
    return null;
  }

  const activeDoc = documents.find((d) => d.docId === selectedDocId) || documents[0];

  return (
    <div className="space-y-5">
      {/* Workspace Operational Header */}
      <div className="bg-white rounded-xl border border-slate-200/90 px-5 py-3.5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/officer/queue')}
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
            title="Back to queue"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-base text-slate-900">
                CASE {application.applicationId}
              </span>
              <span className="text-slate-300">/</span>
              <span className="font-semibold text-slate-800 text-sm">{application.fullName}</span>
              <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                PAN: {maskPAN(application.panNumber)}
              </span>
            </div>
          </div>
        </div>

        {/* Current Status & Refresh */}
        <div className="flex items-center gap-2">
          {application.riskCategory && (
            <span
              className={`text-[11px] font-mono font-bold px-2.5 py-1 rounded border ${
                RISK_COLORS[application.riskCategory]
              }`}
            >
              {application.riskCategory} RISK
            </span>
          )}
          <span className="text-xs font-mono font-semibold text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded">
            {STATUS_LABELS[application.status] || application.status}
          </span>
          <button
            onClick={loadReviewData}
            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg border border-slate-200 text-xs transition-colors"
            title="Reload case data"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Split-Screen Review Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: OCR Document Terminal (5 cols) */}
        <div className="lg:col-span-5 h-[690px]">
          <DocumentViewer
            documents={documents}
            selectedDocId={selectedDocId}
            onSelectDoc={(id) => setSelectedDocId(id)}
          />
        </div>

        {/* Right Column: Entity Inspector & Recommendation (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          <ExtractedFields
            application={application}
            document={activeDoc}
            onOpenCorrectionModal={handleOpenCorrection}
            sanctionsMatch={sanctionsMatch}
            pepMatch={pepMatch}
          />

          {/* Maker Recommendation Desk */}
          <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-2.5 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">
                  MAKER RECOMMENDATION DESK (FR-6)
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Recommendation will be submitted for dual-control Compliance Checker authorization.
                </p>
              </div>

              <span className="text-[10px] font-mono font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded">
                DUAL AUTHORIZATION
              </span>
            </div>

            {/* Recommendation Buttons */}
            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setRecommendationAction('APPROVE')}
                className={`p-2.5 rounded-lg border text-xs font-mono font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  recommendationAction === 'APPROVE'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 ring-1 ring-emerald-500/20'
                    : 'text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>APPROVE</span>
              </button>

              <button
                type="button"
                onClick={() => setRecommendationAction('REQUEST_RESUBMISSION')}
                className={`p-2.5 rounded-lg border text-xs font-mono font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  recommendationAction === 'REQUEST_RESUBMISSION'
                    ? 'bg-orange-50 text-orange-800 border-orange-300 ring-1 ring-orange-500/20'
                    : 'text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <RefreshCw className="w-4 h-4 text-orange-600" />
                <span>RESUBMISSION</span>
              </button>

              <button
                type="button"
                onClick={() => setRecommendationAction('REJECT')}
                className={`p-2.5 rounded-lg border text-xs font-mono font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  recommendationAction === 'REJECT'
                    ? 'bg-rose-50 text-rose-800 border-rose-300 ring-1 ring-rose-500/20'
                    : 'text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <XCircle className="w-4 h-4 text-rose-600" />
                <span>REJECT</span>
              </button>
            </div>

            {/* Mandatory Comment */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-mono font-semibold text-slate-700">
                  MAKER COMMENTS (MIN 10 CHARS) *
                </label>
                <span className="text-[10px] font-mono text-slate-400">
                  {recommendationComment.length}/10 chars
                </span>
              </div>
              <textarea
                rows={2}
                value={recommendationComment}
                onChange={(e) => setRecommendationComment(e.target.value)}
                placeholder="State operational rationale for recommendation or specify requested replacement document..."
                className="w-full p-2.5 text-xs font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-slate-50/50"
              />
            </div>

            {/* Submit Button */}
            <div className="pt-1 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  if (recommendationComment.trim().length < 10) {
                    showToast('Comment must be at least 10 characters long', 'error');
                    return;
                  }
                  setConfirmModalOpen(true);
                }}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-mono font-semibold text-xs rounded-lg transition-colors flex items-center gap-2 shadow-xs"
              >
                <Send className="w-3.5 h-3.5 text-blue-400" />
                <span>SUBMIT RECOMMENDATION</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Chronological Audit Log Table */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold font-mono text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <History className="w-3.5 h-3.5 text-blue-600" />
            CASE AUDIT EVENT LOG (RULE FR-9)
          </h3>
          <span className="text-[10px] font-mono text-slate-400">
            {auditTrail.length} RECORDED EVENTS
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead>
              <tr className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <th className="py-2 px-3">TIMESTAMP</th>
                <th className="py-2 px-3">ACTOR</th>
                <th className="py-2 px-3">ROLE</th>
                <th className="py-2 px-3">ACTION</th>
                <th className="py-2 px-3 font-sans">DETAILS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[11px]">
              {auditTrail.map((entry) => (
                <tr key={entry.id} className="hover:bg-slate-50/70">
                  <td className="py-2 px-3 text-slate-500 whitespace-nowrap">
                    {formatDateTime(entry.timestamp)}
                  </td>
                  <td className="py-2 px-3 font-semibold text-slate-800">{entry.actor}</td>
                  <td className="py-2 px-3 text-slate-600">{entry.role}</td>
                  <td className="py-2 px-3 font-semibold text-blue-600">{entry.action}</td>
                  <td className="py-2 px-3 font-sans text-slate-600 max-w-md">{entry.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* FIELD CORRECTION MODAL */}
      {correctionModalOpen && selectedFieldToCorrect && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden font-mono">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-blue-600" />
                <h4 className="text-xs font-bold text-slate-900 uppercase">
                  MANUAL FIELD CORRECTION // {selectedFieldToCorrect.fieldName}
                </h4>
              </div>
              <button
                onClick={() => setCorrectionModalOpen(false)}
                className="text-xs text-slate-400 hover:text-slate-700"
              >
                CANCEL
              </button>
            </div>

            <div className="p-5 space-y-3.5">
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-900 font-sans leading-relaxed">
                Applying a correction updates field confidence to <strong>1.00</strong>, sets source to{' '}
                <strong>OFFICER</strong>, records an audit event, and re-evaluates mock rules.
              </div>

              {/* Before/Declared */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-[9px] text-slate-400 uppercase block font-sans">
                    Declared
                  </span>
                  <span className="font-bold text-slate-800 break-all">
                    {selectedFieldToCorrect.declaredValue || 'N/A'}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-[9px] text-slate-400 uppercase block font-sans">
                    Extracted
                  </span>
                  <span className="font-bold text-slate-800 break-all">
                    {selectedFieldToCorrect.currentValue || 'N/A'}
                  </span>
                </div>
              </div>

              {/* Corrected Input */}
              <div>
                <label className="block text-[11px] text-slate-700 mb-1">
                  CORRECTED VALUE *
                </label>
                <input
                  type="text"
                  value={correctedValue}
                  onChange={(e) => setCorrectedValue(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Reason */}
              <div>
                <label className="block text-[11px] text-slate-700 mb-1">
                  CORRECTION REASON (MIN 10 CHARS) *
                </label>
                <textarea
                  rows={2}
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  placeholder="State OCR scan correction basis..."
                  className="w-full p-2.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  {correctionReason.length}/10 chars
                </span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setCorrectionModalOpen(false)}
                className="px-3 py-1.5 text-slate-600 hover:bg-slate-200 rounded-lg"
              >
                CANCEL
              </button>
              <button
                type="button"
                disabled={correctionSubmitting || correctionReason.trim().length < 10}
                onClick={handleSubmitCorrection}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
              >
                {correctionSubmitting ? 'APPLYING...' : 'APPLY CORRECTION'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION DIALOG */}
      <ConfirmDialog
        isOpen={confirmModalOpen}
        title={`Confirm ${recommendationAction} Recommendation`}
        message={`Are you sure you want to submit the recommendation [${recommendationAction}] for Case ${application.applicationId}? Case will be routed to Compliance Checker.`}
        confirmLabel="Submit Recommendation"
        type={recommendationAction === 'REJECT' ? 'danger' : 'info'}
        loading={recommendationSubmitting}
        onConfirm={handleConfirmRecommendation}
        onCancel={() => setConfirmModalOpen(false)}
      >
        <div className="bg-slate-50 p-2.5 rounded-lg border text-xs font-mono text-slate-700">
          <span className="font-semibold block text-slate-900 mb-1">Recorded Comment:</span>
          "{recommendationComment}"
        </div>
      </ConfirmDialog>
    </div>
  );
}
