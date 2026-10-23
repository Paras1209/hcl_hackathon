import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Edit3,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';
import { formatConfidence, maskPAN, maskAadhaar } from '../utils/formatters';
import { REASON_CODE_DETAILS } from '../utils/reasonCodeMessages';

export default function ExtractedFields({
  application,
  document: activeDoc,
  onOpenCorrectionModal,
  sanctionsMatch,
  pepMatch,
}) {
  if (!activeDoc) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
        <p className="text-xs font-medium text-slate-600">Select a document to inspect extracted entities</p>
      </div>
    );
  }

  const fields = activeDoc.extractedFields || [];

  const getDeclaredValueForField = (fieldName) => {
    switch (fieldName) {
      case 'doc_type':
      case 'name':
      case 'dob':
      case 'gender':
      case 'pan_number':
      case 'aadhaar_last4':
      case 'address':
      case 'pincode':
      case 'document_date':
      case 'valid_until':
        return null;
      default:
        return null;
    }
  };

  const getFieldLabel = (fieldName) => {
    const labels = {
      doc_type: 'Document Type',
      name: 'Full Legal Name',
      dob: 'Date of Birth',
      gender: 'Gender',
      pan_number: 'PAN Number',
      aadhaar_last4: 'Aadhaar (Last 4)',
      address: 'Residential Address',
      pincode: 'Postal PIN Code',
      document_date: 'Document Issue Date',
      valid_until: 'Validity / Expiry Date',
    };
    return labels[fieldName] || fieldName;
  };

  return (
    <div className="space-y-4 font-sans">
      {/* Identity Summary Header */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Identity Reconciliation Summary
            </span>
            <h4 className="text-base font-bold text-slate-900 mt-0.5">
              {application.fullName}
            </h4>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Name Match Score:</span>
            <span
              className={`text-xs font-semibold px-2.5 py-1 rounded-lg border tabular-nums ${
                application.nameMatchScore >= 0.90
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : application.nameMatchScore >= 0.75
                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}
            >
              {(application.nameMatchScore * 100).toFixed(1)}% ({application.nameMatchScore.toFixed(4)})
            </span>
          </div>
        </div>

        {/* Triggered Reason Codes / Status Badges */}
        <div className="mt-3.5 flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Flags:</span>
            {application.reasonCodes && application.reasonCodes.length > 0 ? (
              application.reasonCodes.map((code) => {
                const detail = REASON_CODE_DETAILS[code];
                return (
                  <span
                    key={code}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-xs font-medium"
                    title={detail?.officerMessage || code}
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    <span>{code}</span>
                  </span>
                );
              })
            ) : (
              <span className="text-emerald-700 font-medium text-xs flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Pass (No active anomalies)
              </span>
            )}
          </div>

          <span className="text-[11px] text-slate-400 font-medium">
            Rules R1–R17 verified
          </span>
        </div>
      </div>

      {/* Watchlist Hit Callout (if any) */}
      {sanctionsMatch && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-xs text-rose-950 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-rose-800 text-xs">
              <ShieldAlert className="w-4 h-4 text-rose-600" />
              <span>Sanctions Watchlist Hit — {sanctionsMatch.listId}</span>
            </div>
            <span className="text-[11px] bg-rose-200/70 text-rose-900 px-2 py-0.5 rounded-full font-bold">
              100% Match
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-white/90 p-3 rounded-lg border border-rose-100">
            <div>
              <span className="text-slate-400 text-[10px] uppercase font-semibold block">Listed Name</span>
              <span className="font-semibold text-slate-900">{sanctionsMatch.name}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] uppercase font-semibold block">Alias</span>
              <span className="font-semibold text-slate-900">{sanctionsMatch.alias}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] uppercase font-semibold block">Date of Birth</span>
              <span className="font-semibold text-slate-900">{sanctionsMatch.dob}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] uppercase font-semibold block">Program</span>
              <span className="font-semibold text-slate-900">{sanctionsMatch.program}</span>
            </div>
          </div>
          <p className="text-[11px] text-rose-700 leading-relaxed font-medium">
            Regulatory Policy: Rule R15 requires immediate auto-rejection when sanctions hit is positive.
          </p>
        </div>
      )}

      {/* PEP Match Callout */}
      {pepMatch && !sanctionsMatch && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-950 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-amber-800 text-xs">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              <span>Politically Exposed Person (PEP) Screening Hit</span>
            </div>
            <span className="text-[11px] bg-amber-200/70 text-amber-900 px-2 py-0.5 rounded-full font-bold">
              Review Required
            </span>
          </div>
          <p className="text-[11px] text-amber-800 leading-relaxed">
            Applicant matches PEP registry ({pepMatch.name}, {pepMatch.designation}). Enhanced due diligence and maker-checker approval required.
          </p>
        </div>
      )}

      {/* Extracted Fields Table */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h5 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
              Entity Extraction &amp; Reconciliation Table
            </h5>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Comparison between declared applicant input and extracted document values.
            </p>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            {fields.length} {fields.length === 1 ? 'entity' : 'entities'} detected
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-2.5 px-4">Entity</th>
                <th className="py-2.5 px-4">Declared Value</th>
                <th className="py-2.5 px-4">Extracted Value</th>
                <th className="py-2.5 px-4">Confidence</th>
                <th className="py-2.5 px-4">Source</th>
                <th className="py-2.5 px-4 text-right">Correction</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {fields.map((f, idx) => {
                const declaredVal = getDeclaredValueForField(f.fieldName);
                const hasMismatch =
                  declaredVal !== null &&
                  f.value !== null &&
                  String(declaredVal).trim().toLowerCase() !== String(f.value).trim().toLowerCase();
                const isLowConfidence = f.confidence < 0.80;

                return (
                  <tr
                    key={idx}
                    className={`hover:bg-slate-50/70 transition-colors ${
                      hasMismatch ? 'bg-amber-50/30' : ''
                    }`}
                  >
                    <td className="py-3 px-4 font-semibold text-slate-900 whitespace-nowrap">
                      {getFieldLabel(f.fieldName)}
                    </td>

                    <td className="py-3 px-4 text-slate-600 font-medium whitespace-nowrap">
                      {f.fieldName === 'pan_number'
                        ? maskPAN(declaredVal || '')
                        : f.fieldName === 'aadhaar_last4'
                        ? maskAadhaar(declaredVal || '')
                        : declaredVal || <span className="text-slate-300 italic">—</span>}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold ${hasMismatch ? 'text-amber-800' : 'text-slate-900'}`}>
                          {f.fieldName === 'pan_number'
                            ? maskPAN(f.value || '')
                            : f.fieldName === 'aadhaar_last4'
                            ? maskAadhaar(f.value || '')
                            : f.value || <span className="text-slate-300 italic">Not detected</span>}
                        </span>
                        {hasMismatch && (
                          <span
                            className="px-1.5 py-0.2 rounded text-[10px] bg-amber-100 text-amber-800 border border-amber-200 font-semibold"
                            title="Declared and extracted values do not match exactly"
                          >
                            Mismatch
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold tabular-nums ${
                          f.confidence >= 0.85
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : f.confidence >= 0.70
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {(f.confidence * 100).toFixed(0)}%
                      </span>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                          f.source === 'OFFICER'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {f.source || 'SYSTEM'}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() =>
                          onOpenCorrectionModal({
                            docId: activeDoc.docId,
                            field: f.fieldName,
                            fieldName: getFieldLabel(f.fieldName),
                            currentValue: f.value,
                            declaredValue: declaredVal,
                            confidence: f.confidence,
                          })
                        }
                        className="px-2.5 py-1 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors border border-blue-200 shadow-xs cursor-pointer inline-flex items-center gap-1"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Correct</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
