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
  Send,
  Edit3,
} from 'lucide-react';
import { reviewApi } from '../../api/review';
import { applicationsApi } from '../../api/applications';
import DocumentViewer from '../../components/DocumentViewer';
import ExtractedFields from '../../components/ExtractedFields';
import ConfirmDialog from '../../components/ConfirmDialog';
import { LoadingSpinner } from '../../components/LoadingState';
import { useToast } from '../../components/Toast';
import { maskPAN, formatDateTime } from '../../utils/formatters';
import { STATUS_LABELS, RISK_COLORS } from '../../constants/statuses';

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
      const res = await reviewApi.submitFieldCorrection(application.applicationId, {
        docId: selectedFieldToCorrect.docId,
        field: selectedFieldToCorrect.field,
        correctedValue,
        correctionReason,
      });

      if (res.success) {
        showToast(`Corrected ${selectedFieldToCorrect.fieldName}. Rules re-evaluated.`, 'success');
        setCorrectionModalOpen(false);
        loadReviewData();
      }
    } catch (e) {
      showToast(e.message || 'Error updating field correction', 'error');
    } finally {
      setCorrectionSubmitting(false);
    }
  };

  // Submit Maker Recommendation (FR-7)
  const handleConfirmRecommendation = async () => {
    setRecommendationSubmitting(true);
    try {
      const res = await reviewApi.submitRecommendation(application.applicationId, {
        action: recommendationAction,
        comment: recommendationComment,
      });

      if (res.success) {
        setConfirmModalOpen(false);
        showToast(
          `Recommendation submitted: ${recommendationAction}. Routed to Compliance Checker.`,
          'success'
        );
        navigate('/officer/queue');
      }
    } catch (e) {
      showToast(e.message || 'Failed to submit recommendation', 'error');
    } finally {
      setRecommendationSubmitting(false);
    }
  };

  if (loading || !application) {
    return <LoadingSpinner message="Loading review desk telemetry..." />;
  }

  return (
    <div className="space-y-5 font-sans">
      {/* Top Header */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/officer/queue')}
            className="p-2 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            title="Back to Review Queue"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold text-slate-900">
                Case {application.applicationId}
              </h1>
              <span
                className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                  RISK_COLORS[application.riskCategory] || 'bg-slate-100 text-slate-700'
                }`}
              >
                {application.riskCategory} Risk
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold border border-slate-200">
                {STATUS_LABELS[application.status] || application.status}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Applicant: <strong className="text-slate-800 font-semibold">{application.fullName}</strong> · PAN:{' '}
              <span className="font-mono text-slate-700 font-semibold">{maskPAN(application.panNumber)}</span> · Submitted:{' '}
              {formatDateTime(application.applicationDate)}
            </p>
          </div>
        </div>

        {/* Header Right Status */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-500">Dual Authorization:</span>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200">
            Maker Preparation Desk
          </span>
        </div>
      </div>

      {/* Split-Screen Review Workbench */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[580px]">
        {/* Left: OCR Raw Text & Document Viewer (5 cols) */}
        <div className="lg:col-span-5 flex flex-col min-h-[520px]">
          <DocumentViewer
            documents={documents}
            selectedDocId={selectedDocId}
            onSelectDoc={(id) => setSelectedDocId(id)}
          />
        </div>

        {/* Right: Extracted Entities, Discrepancies, and Decision Panel (7 cols) */}
        <div className="lg:col-span-7 flex flex-col space-y-4">
          <ExtractedFields
            application={application}
            document={documents.find((d) => d.docId === selectedDocId) || documents[0]}
            onOpenCorrectionModal={handleOpenCorrection}
            sanctionsMatch={sanctionsMatch}
            pepMatch={pepMatch}
          />

          {/* Maker Recommendation Desk */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Maker Recommendation Desk
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Prepare your assessment. All recommendations are routed to a separate compliance checker for final authorization.
              </p>
            </div>

            {/* Recommendation Choice Tabs */}
            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setRecommendationAction('APPROVE')}
                className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  recommendationAction === 'APPROVE'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 ring-2 ring-emerald-500/20'
                    : 'text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Approve</span>
              </button>

              <button
                type="button"
                onClick={() => setRecommendationAction('REQUEST_RESUBMISSION')}
                className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  recommendationAction === 'REQUEST_RESUBMISSION'
                    ? 'bg-amber-50 text-amber-800 border-amber-300 ring-2 ring-amber-500/20'
                    : 'text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <RefreshCw className="w-4 h-4 text-amber-600" />
                <span>Resubmission</span>
              </button>

              <button
                type="button"
                onClick={() => setRecommendationAction('REJECT')}
                className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  recommendationAction === 'REJECT'
                    ? 'bg-rose-50 text-rose-800 border-rose-300 ring-2 ring-rose-500/20'
                    : 'text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <XCircle className="w-4 h-4 text-rose-600" />
                <span>Reject</span>
              </button>
            </div>

            {/* Mandatory Comment */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Maker Comment (Min 10 characters) *
                </label>
                <span className="text-[11px] text-slate-400 tabular-nums">
                  {recommendationComment.length}/10 chars
                </span>
              </div>
              <textarea
                rows={2}
                value={recommendationComment}
                onChange={(e) => setRecommendationComment(e.target.value)}
                placeholder="State operational rationale for recommendation or specify requested replacement document..."
                className="w-full p-3 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-slate-50/50 text-slate-900"
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
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl transition-colors flex items-center gap-2 shadow-xs cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Submit Recommendation</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Chronological Audit Log Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-3.5">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <History className="w-4 h-4 text-blue-600" />
            <span>Case Audit Event Log (Rule FR-9)</span>
          </h3>
          <span className="text-xs text-slate-500 font-medium">
            {auditTrail.length} recorded events
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200/80">
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Actor</th>
                <th className="py-2.5 px-3">Role</th>
                <th className="py-2.5 px-3">Action</th>
                <th className="py-2.5 px-3">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {auditTrail.map((entry) => (
                <tr key={entry.id} className="hover:bg-slate-50/70">
                  <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                    {formatDateTime(entry.timestamp)}
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-slate-900">{entry.actor}</td>
                  <td className="py-2.5 px-3 text-slate-600">{entry.role}</td>
                  <td className="py-2.5 px-3 font-semibold text-blue-600">{entry.action}</td>
                  <td className="py-2.5 px-3 text-slate-600 max-w-md">{entry.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* FIELD CORRECTION MODAL */}
      {correctionModalOpen && selectedFieldToCorrect && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden font-sans">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-blue-600" />
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                  Manual Field Correction · {selectedFieldToCorrect.fieldName}
                </h4>
              </div>
              <button
                onClick={() => setCorrectionModalOpen(false)}
                className="text-xs text-slate-400 hover:text-slate-700 font-semibold cursor-pointer"
              >
                Cancel
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 leading-relaxed">
                Applying a correction updates field confidence to <strong>1.00</strong>, sets source to{' '}
                <strong>OFFICER</strong>, records an audit event, and re-evaluates compliance rules automatically.
              </div>

              {/* Before/Declared */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                    Declared
                  </span>
                  <span className="font-bold text-slate-800 break-all mt-0.5 block">
                    {selectedFieldToCorrect.declaredValue || 'N/A'}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                    Extracted
                  </span>
                  <span className="font-bold text-slate-800 break-all mt-0.5 block">
                    {selectedFieldToCorrect.currentValue || 'N/A'}
                  </span>
                </div>
              </div>

              {/* Corrected Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Corrected Value *
                </label>
                <input
                  type="text"
                  value={correctedValue}
                  onChange={(e) => setCorrectedValue(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-slate-900"
                />
              </div>

              {/* Reason */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Correction Reason (Min 10 chars) *
                  </label>
                  <span className="text-[11px] text-slate-400 tabular-nums">
                    {correctionReason.length}/10 chars
                  </span>
                </div>
                <textarea
                  rows={2}
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  placeholder="State OCR scan correction justification..."
                  className="w-full p-3 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-slate-900"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-end gap-2.5 text-xs">
              <button
                type="button"
                onClick={() => setCorrectionModalOpen(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-200/70 rounded-xl font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={correctionSubmitting || correctionReason.trim().length < 10}
                onClick={handleSubmitCorrection}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {correctionSubmitting ? 'Applying...' : 'Apply Correction'}
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
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-700">
          <span className="font-semibold block text-slate-900 mb-1">Recorded Comment:</span>
          "{recommendationComment}"
        </div>
      </ConfirmDialog>
    </div>
  );
}
