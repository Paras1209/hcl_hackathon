import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Upload,
  FileText,
  AlertTriangle,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { applicationsApi } from '../../api/applications';
import { DOCUMENT_TYPES, APPLICATION_STATUS } from '../../constants/statuses';
import { validateDocumentFile } from '../../utils/validators';
import { formatDateTime, formatFileSize } from '../../utils/formatters';
import { useToast } from '../../components/Toast';
import { LoadingSpinner } from '../../components/LoadingState';

export default function Resubmission() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState(null);
  const [declaredDocType, setDeclaredDocType] = useState(DOCUMENT_TYPES.ELECTRICITY_BILL);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const targetId = id || 'A2000011';
      const res = await applicationsApi.getApplication(targetId);
      if (res.success) {
        setApplication(res.data);
        if (res.data.resubmissionRequest?.documentTypeNeeded) {
          setDeclaredDocType(res.data.resubmissionRequest.documentTypeNeeded);
        }
      }
    } catch (e) {
      setError('Could not load resubmission request.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (!selected) return;

    const val = validateDocumentFile(selected);
    if (!val.valid) {
      setError(val.error);
      showToast(val.error, 'error');
      return;
    }
    setError('');

    const reader = new FileReader();
    reader.onload = (event) => {
      setFile({
        name: selected.name,
        size: selected.size,
        content: event.target.result,
      });
    };
    reader.readAsText(selected);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please attach the replacement document.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await applicationsApi.submitResubmission(application.applicationId, {
        file,
        declaredDocType,
      });
      if (res.success) {
        showToast('Replacement document submitted successfully', 'success');
        navigate(`/applicant/status/${application.applicationId}`);
      }
    } catch (err) {
      setError(err.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Checking resubmission instructions..." />;
  }

  if (!application) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center max-w-md mx-auto shadow-xs font-sans">
        <AlertTriangle className="w-10 h-10 mx-auto text-amber-500 mb-3" />
        <h3 className="text-base font-bold text-slate-900 mb-1">No Active Resubmission Pending</h3>
        <p className="text-xs text-slate-500">Your documents are currently verified or under review.</p>
      </div>
    );
  }

  const isExpired = application.status === APPLICATION_STATUS.CLOSED_EXPIRED;

  return (
    <div className="space-y-5 max-w-3xl mx-auto font-sans">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl font-bold text-slate-900">
            Document Resubmission Required
          </h1>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
            Action Required
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Case: <span className="font-mono font-bold text-slate-900">{application.applicationId}</span> ·{' '}
          Applicant: <span className="font-semibold text-slate-800">{application.fullName}</span>
        </p>
      </div>

      {isExpired ? (
        <div className="p-8 bg-slate-100 border border-slate-200 rounded-2xl text-slate-800 text-center space-y-3">
          <Clock className="w-10 h-10 mx-auto text-slate-500" />
          <h3 className="text-base font-bold text-slate-900">
            Resubmission Window Expired (Closed)
          </h3>
          <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
            The mandatory 7-day document replacement window has closed. Please register and submit a new application.
          </p>
        </div>
      ) : (
        <>
          {/* Officer Request Banner */}
          <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-6 space-y-4">
            <div className="flex items-start gap-3.5">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="text-xs font-bold text-amber-900 uppercase tracking-wide block">
                  Reviewing Officer Instruction
                </span>
                <p className="text-xs text-amber-950 mt-1.5 leading-relaxed bg-white/90 p-3.5 rounded-xl border border-amber-200/70 font-medium shadow-xs">
                  "{application.resubmissionRequest?.reasonNote ||
                    application.makerRecommendation?.comment ||
                    'Please upload a valid replacement document.'}"
                </p>
              </div>
            </div>

            {/* Deadline */}
            <div className="flex items-center justify-between text-xs pt-3 border-t border-amber-200/60">
              <div className="flex items-center gap-2 text-amber-950 font-medium">
                <Clock className="w-4 h-4 text-amber-600" />
                <span>Deadline: {formatDateTime(application.resubmissionRequest?.deadline || new Date(Date.now() + 6 * 86400000))}</span>
              </div>
              <span className="text-xs text-amber-800 font-semibold bg-amber-100/80 px-2 py-0.5 rounded-full">
                7-Day SLA
              </span>
            </div>
          </div>

          {/* Replacement Upload Form */}
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-5">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Upload Replacement Specimen File
            </h3>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-medium">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Document Category
              </label>
              <select
                value={declaredDocType}
                onChange={(e) => setDeclaredDocType(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-white text-slate-900"
              >
                <option value={DOCUMENT_TYPES.ELECTRICITY_BILL}>Electricity Bill (Address Proof)</option>
                <option value={DOCUMENT_TYPES.BANK_STATEMENT}>Bank Statement (Address Proof)</option>
                <option value={DOCUMENT_TYPES.DRIVING_LICENCE}>Driving Licence</option>
                <option value={DOCUMENT_TYPES.PAN_CARD}>PAN Card</option>
                <option value={DOCUMENT_TYPES.AADHAAR_CARD}>Aadhaar Card (Last 4 Digits)</option>
              </select>
            </div>

            {/* Drop Zone */}
            <label className="border border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-8 text-center cursor-pointer bg-slate-50/50 hover:bg-blue-50/20 transition-colors flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-xs">
                <Upload className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-slate-800 block mt-1">
                {file ? file.name : 'Select or drop replacement .txt specimen'}
              </span>
              <span className="text-[11px] text-slate-400 block">
                {file ? `${formatFileSize(file.size)} · Ready to submit` : 'UTF-8 text file · Max 1 MB'}
              </span>
              <input
                type="file"
                accept=".txt"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>

            <button
              type="submit"
              disabled={submitting || !file}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-xs cursor-pointer"
            >
              {submitting ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  <span>Submit Replacement to Maker Queue</span>
                </>
              )}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
