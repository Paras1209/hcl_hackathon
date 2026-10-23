import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Upload,
  FileText,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Calendar,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { applicationsApi } from '../../api/applications';
import { DOCUMENT_TYPES, DOCUMENT_TYPE_LABELS, APPLICATION_STATUS } from '../../constants/statuses';
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
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center max-w-md mx-auto">
        <AlertTriangle className="w-8 h-8 mx-auto text-amber-500 mb-2" />
        <p className="text-xs font-mono font-semibold text-slate-800">NO ACTIVE RESUBMISSION PENDING</p>
      </div>
    );
  }

  const isExpired = application.status === APPLICATION_STATUS.CLOSED_EXPIRED;

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200/90 px-5 py-4 shadow-xs">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold text-slate-900 font-mono">
            DOCUMENT RESUBMISSION REQUIRED
          </h2>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-orange-50 text-orange-700 border border-orange-200 font-bold">
            ACTION REQUIRED
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Case: <span className="font-mono font-bold text-slate-800">{application.applicationId}</span> •{' '}
          Applicant: <span className="font-semibold text-slate-800">{application.fullName}</span>
        </p>
      </div>

      {isExpired ? (
        <div className="p-6 bg-slate-100 border border-slate-300 rounded-xl text-slate-800 text-center space-y-2 font-mono">
          <Clock className="w-8 h-8 mx-auto text-slate-500" />
          <h3 className="text-sm font-bold text-slate-900">
            RESUBMISSION WINDOW EXPIRED (STATUS: CLOSED_EXPIRED)
          </h3>
          <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed font-sans">
            The mandatory 7-day document replacement window has closed. Please submit a new application.
          </p>
        </div>
      ) : (
        <>
          {/* Officer Request Banner */}
          <div className="bg-orange-50/60 border border-orange-200 rounded-xl p-5 space-y-3">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
              <div>
                <span className="text-[10px] font-mono font-bold text-orange-800 uppercase block">
                  REVIEWING OFFICER INSTRUCTION:
                </span>
                <p className="text-xs text-orange-950 mt-1 leading-relaxed bg-white/80 p-3 rounded-lg border border-orange-200/60 font-medium">
                  "{application.resubmissionRequest?.reasonNote ||
                    application.makerRecommendation?.comment ||
                    'Please upload a valid replacement document.'}"
                </p>
              </div>
            </div>

            {/* Deadline */}
            <div className="flex items-center justify-between text-xs font-mono pt-2 border-t border-orange-200/50">
              <div className="flex items-center gap-1.5 text-orange-900">
                <Clock className="w-3.5 h-3.5 text-orange-600" />
                <span>DEADLINE: {formatDateTime(application.resubmissionRequest?.deadline || new Date(Date.now() + 6 * 86400000))}</span>
              </div>
              <span className="text-[11px] text-slate-500">7-DAY SLA</span>
            </div>
          </div>

          {/* Replacement Upload Form */}
          <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs space-y-4">
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
              UPLOAD REPLACEMENT SPECIMEN FILE
            </span>

            {error && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs font-mono text-rose-800">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Document Category
              </label>
              <select
                value={declaredDocType}
                onChange={(e) => setDeclaredDocType(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
              >
                <option value={DOCUMENT_TYPES.ELECTRICITY_BILL}>ELECTRICITY_BILL (Address Proof)</option>
                <option value={DOCUMENT_TYPES.BANK_STATEMENT}>BANK_STATEMENT (Address Proof)</option>
                <option value={DOCUMENT_TYPES.DRIVING_LICENCE}>DRIVING_LICENCE</option>
                <option value={DOCUMENT_TYPES.PAN_CARD}>PAN_CARD</option>
                <option value={DOCUMENT_TYPES.AADHAAR_CARD}>AADHAAR_CARD</option>
              </select>
            </div>

            {/* Drop Zone */}
            <label className="border border-dashed border-slate-300 hover:border-blue-500 rounded-lg p-6 text-center cursor-pointer bg-slate-50/40 hover:bg-blue-50/20 transition-colors flex flex-col items-center gap-1.5 font-mono">
              <Upload className="w-5 h-5 text-blue-600 mb-1" />
              <span className="text-xs font-semibold text-slate-800 block">
                {file ? file.name : 'CLICK TO SELECT REPLACEMENT .TXT FILE'}
              </span>
              <span className="text-[10px] text-slate-400 block">
                {file ? `${formatFileSize(file.size)} • Ready` : 'UTF-8 text • Max 1 MB'}
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
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-mono font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {submitting ? (
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>SUBMIT REPLACEMENT TO MAKER QUEUE</span>
                </>
              )}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
