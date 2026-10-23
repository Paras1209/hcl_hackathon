import React from 'react';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  FileText,
  ShieldCheck,
  ArrowRight,
  Calendar,
} from 'lucide-react';
import { STATUS_LABELS, STATUS_COLORS, APPLICATION_STATUS } from '../constants/statuses';
import { formatDateTime } from '../utils/formatters';
import { getReasonMessage } from '../utils/reasonCodeMessages';
import { Link } from 'react-router-dom';

export default function StatusTimeline({ application, timeline = [] }) {
  if (!application) return null;

  const isResubmission = application.status === APPLICATION_STATUS.RESUBMISSION_REQUESTED;
  const isApproved =
    application.status === APPLICATION_STATUS.APPROVED ||
    application.status === APPLICATION_STATUS.AUTO_APPROVED;
  const isRejected =
    application.status === APPLICATION_STATUS.REJECTED ||
    application.status === APPLICATION_STATUS.AUTO_REJECTED;

  return (
    <div className="space-y-4">
      {/* Current Status Banner */}
      <div
        className={`rounded-xl border p-5 shadow-xs ${
          isApproved
            ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
            : isRejected
            ? 'bg-rose-50/60 border-rose-200 text-rose-950'
            : isResubmission
            ? 'bg-orange-50/60 border-orange-200 text-orange-950'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div
              className={`p-2.5 rounded-xl border shrink-0 ${
                isApproved
                  ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
                  : isRejected
                  ? 'bg-rose-100 text-rose-700 border-rose-300'
                  : isResubmission
                  ? 'bg-orange-100 text-orange-700 border-orange-300'
                  : 'bg-blue-50 text-blue-600 border-blue-200'
              }`}
            >
              {isApproved && <CheckCircle2 className="w-5 h-5" />}
              {isRejected && <XCircle className="w-5 h-5" />}
              {isResubmission && <AlertTriangle className="w-5 h-5" />}
              {!isApproved && !isRejected && !isResubmission && <Clock className="w-5 h-5" />}
            </div>

            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider opacity-60">
                CURRENT VERIFICATION STATUS
              </span>
              <h2 className="text-base font-bold mt-0.5">
                {STATUS_LABELS[application.status] || application.status}
              </h2>
              <p className="text-xs mt-0.5 leading-relaxed opacity-80 max-w-xl">
                {isApproved &&
                  'Your electronic KYC verification has succeeded. Welcome to Deccan Digital Bank.'}
                {isRejected &&
                  'Your application could not be approved online based on automated eligibility and regulatory rules.'}
                {isResubmission &&
                  'A compliance officer reviewed your submission and requested an updated or replacement document.'}
                {!isApproved &&
                  !isRejected &&
                  !isResubmission &&
                  'Your application is securely moving through automated extraction and KYC verification.'}
              </p>
            </div>
          </div>

          {/* Action Button for Resubmission */}
          {isResubmission && (
            <Link
              to={`/applicant/resubmission/${application.applicationId}`}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-mono font-semibold text-xs rounded-lg shadow-xs transition-colors flex items-center justify-center gap-1.5 shrink-0"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>RESUBMIT DOCUMENT</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}

          {/* Opened Account Details Card for Approved */}
          {isApproved && application.accountNumber && (
            <div className="bg-white/90 border border-emerald-200 p-3.5 rounded-lg text-xs space-y-1 shrink-0 font-mono text-emerald-950">
              <div>
                <span className="text-slate-400 block text-[9px] uppercase font-sans">
                  Account Number
                </span>
                <span className="font-bold text-sm text-emerald-800">
                  {application.accountNumber}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[9px] uppercase font-sans">
                  Customer ID
                </span>
                <span className="font-semibold text-slate-700">{application.customerId}</span>
              </div>
            </div>
          )}
        </div>

        {/* Reason Explanation Box for Applicants (Safe, Plain-Language) */}
        {application.reasonCodes && application.reasonCodes.length > 0 && (
          <div className="mt-4 pt-3 border-t border-black/10 space-y-1.5 font-mono">
            <span className="text-[10px] font-bold uppercase tracking-wider block opacity-70">
              VERIFICATION NOTICES:
            </span>
            <div className="space-y-1.5">
              {application.reasonCodes.map((code) => (
                <div
                  key={code}
                  className="bg-white/80 border border-black/5 rounded-lg p-2.5 text-xs flex items-start gap-2"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block text-slate-900 font-sans">
                      {getReasonMessage(code, 'APPLICANT')}
                    </span>
                    <span className="text-slate-400 text-[10px] block mt-0.5">
                      Flag: {code}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Vertical Lifecycle Timeline */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs">
        <h3 className="text-xs font-bold font-mono text-slate-800 uppercase tracking-wider mb-5 flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5 text-blue-600" />
          VERIFICATION LIFECYCLE PROGRESSION
        </h3>

        <div className="relative pl-6 space-y-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[1px] before:bg-slate-200">
          {timeline.map((step, idx) => {
            return (
              <div key={idx} className="relative group">
                {/* Node icon */}
                <div
                  className={`absolute -left-6 mt-1 w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                    step.current
                      ? 'bg-blue-600 border-white ring-2 ring-blue-100 text-white'
                      : step.completed
                      ? 'bg-emerald-500 border-white text-white'
                      : 'bg-white border-slate-300 text-slate-400'
                  }`}
                >
                  {step.completed ? (
                    <CheckCircle2 className="w-3 h-3" />
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                  )}
                </div>

                <div className="bg-slate-50/40 rounded-lg p-3 border border-slate-100 hover:border-slate-200 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <span className="text-xs font-bold text-slate-900">{step.title}</span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {formatDateTime(step.timestamp)}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 mt-1 leading-relaxed font-sans">
                    {step.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
