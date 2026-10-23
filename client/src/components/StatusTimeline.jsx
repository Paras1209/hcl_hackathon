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
import { STATUS_LABELS, APPLICATION_STATUS } from '../constants/statuses';
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
    <div className="space-y-4 font-sans">
      {/* Current Status Banner */}
      <div
        className={`rounded-2xl border p-6 shadow-xs ${
          isApproved
            ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
            : isRejected
            ? 'bg-rose-50/70 border-rose-200 text-rose-950'
            : isResubmission
            ? 'bg-amber-50/70 border-amber-200 text-amber-950'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div
              className={`p-3 rounded-xl border shrink-0 ${
                isApproved
                  ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
                  : isRejected
                  ? 'bg-rose-100 text-rose-700 border-rose-300'
                  : isResubmission
                  ? 'bg-amber-100 text-amber-800 border-amber-300'
                  : 'bg-blue-50 text-blue-600 border-blue-200'
              }`}
            >
              {isApproved && <CheckCircle2 className="w-6 h-6" />}
              {isRejected && <XCircle className="w-6 h-6" />}
              {isResubmission && <AlertTriangle className="w-6 h-6" />}
              {!isApproved && !isRejected && !isResubmission && <Clock className="w-6 h-6" />}
            </div>

            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Current Verification Status
              </span>
              <h2 className="text-xl font-bold mt-0.5 text-slate-900">
                {STATUS_LABELS[application.status] || application.status}
              </h2>
              <p className="text-xs mt-1 leading-relaxed text-slate-600 max-w-xl">
                {isApproved &&
                  'Your electronic KYC verification has succeeded. Welcome to Deccan Digital Bank.'}
                {isRejected &&
                  'Your application could not be approved online based on automated eligibility and regulatory compliance rules.'}
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
              className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 shrink-0 cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              <span>Resubmit Document</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}

          {/* Opened Account Details Card for Approved */}
          {isApproved && application.accountNumber && (
            <div className="bg-white/95 border border-emerald-200 p-4 rounded-xl text-xs space-y-1.5 shrink-0 text-emerald-950 shadow-xs">
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">
                  Account Number
                </span>
                <span className="font-bold text-sm text-emerald-800 font-mono">
                  {application.accountNumber}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">
                  Customer ID
                </span>
                <span className="font-semibold text-slate-800 font-mono">{application.customerId}</span>
              </div>
            </div>
          )}
        </div>

        {/* Reason Explanation Box for Applicants (Safe, Plain-Language) */}
        {application.reasonCodes && application.reasonCodes.length > 0 && (
          <div className="mt-5 pt-4 border-t border-black/5 space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider block text-slate-500">
              Verification Notices &amp; Guidance
            </span>
            <div className="space-y-2">
              {application.reasonCodes.map((code) => (
                <div
                  key={code}
                  className="bg-white/90 border border-slate-200/70 rounded-xl p-3 text-xs flex items-start gap-2.5 shadow-xs"
                >
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block text-slate-900">
                      {getReasonMessage(code, 'APPLICANT')}
                    </span>
                    <span className="text-slate-400 text-[11px] block mt-0.5">
                      Notice Code: <span className="font-mono">{code}</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Vertical Lifecycle Timeline */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-6 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-blue-600" />
          <span>Verification Lifecycle Progression</span>
        </h3>

        <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
          {timeline.map((step, idx) => {
            const isDone = step.completed;
            const isCurrent = step.current;

            return (
              <div key={idx} className="relative flex items-start gap-4">
                {/* Step node icon */}
                <div
                  className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full flex items-center justify-center ring-4 ring-white ${
                    isDone
                      ? 'bg-emerald-600 text-white'
                      : isCurrent
                      ? 'bg-blue-600 text-white animate-pulse'
                      : 'bg-slate-200 text-slate-400'
                  }`}
                >
                  {isDone ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-white" />
                  )}
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <h4
                      className={`text-sm font-semibold ${
                        isCurrent
                          ? 'text-blue-700'
                          : isDone
                          ? 'text-slate-900'
                          : 'text-slate-400'
                      }`}
                    >
                      {step.title}
                    </h4>
                    {step.timestamp && (
                      <span className="text-[11px] text-slate-400 font-medium">
                        {formatDateTime(step.timestamp)}
                      </span>
                    )}
                  </div>
                  {step.description && (
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      {step.description}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
