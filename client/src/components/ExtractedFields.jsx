import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Edit3,
  ShieldCheck,
  ShieldAlert,
  UserCheck,
  ArrowRight,
  TrendingUp,
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
        <p className="text-xs font-mono">SELECT A DOCUMENT IN LEFT TERMINAL TO INSPECT EXTRACTED ENTITIES</p>
      </div>
    );
  }

  const fields = activeDoc.extractedFields || [];

  const getDeclaredValueForField = (fieldName) => {
    switch (fieldName) {
      case 'name':
        return application.fullName;
      case 'dob':
        return application.dob;
      case 'gender':
        return application.gender;
      case 'pan_number':
        return application.panNumber;
      case 'aadhaar_last4':
        return application.aadhaarLast4;
      case 'pincode':
        return application.pincode;
      case 'address':
        return application.address;
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
    <div className="space-y-4">
      {/* Identity Telemetry Header */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
              IDENTITY RECONCILIATION SUMMARY
            </span>
            <h4 className="text-sm font-bold text-slate-900 mt-0.5">
              {application.fullName}
            </h4>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-slate-500">NAME MATCH SCORE:</span>
            <span
              className={`text-xs font-mono font-bold px-2.5 py-1 rounded-md border ${
                application.nameMatchScore >= 0.90
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : application.nameMatchScore >= 0.75
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}
            >
              {(application.nameMatchScore * 100).toFixed(2)}% ({application.nameMatchScore.toFixed(4)})
            </span>
          </div>
        </div>

        {/* Triggered Reason Codes / Status Pills */}
        <div className="mt-3 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-mono text-slate-400 uppercase">FLAGS:</span>
            {application.reasonCodes && application.reasonCodes.length > 0 ? (
              application.reasonCodes.map((code) => {
                const detail = REASON_CODE_DETAILS[code];
                return (
                  <span
                    key={code}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-mono"
                    title={detail?.officerMessage || code}
                  >
                    <AlertTriangle className="w-3 h-3 text-amber-600" />
                    <span>{code}</span>
                  </span>
                );
              })
            ) : (
              <span className="text-emerald-700 font-mono text-[11px] flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> PASS (NO ANOMALIES)
              </span>
            )}
          </div>

          <span className="text-[10px] font-mono text-slate-400">
            RULES R1–R17 CHECKED
          </span>
        </div>
      </div>

      {/* Watchlist Hit Callout (if any) */}
      {sanctionsMatch && (
        <div className="bg-rose-50/70 border border-rose-200 rounded-xl p-3.5 text-xs text-rose-950 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-bold font-mono text-rose-700 text-xs">
              <ShieldAlert className="w-4 h-4 text-rose-600" />
              <span>SANCTIONS WATCHLIST HIT — {sanctionsMatch.listId}</span>
            </div>
            <span className="text-[10px] font-mono bg-rose-200/60 text-rose-800 px-1.5 py-0.2 rounded font-bold">
              100.0% MATCH
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono bg-white/80 p-2.5 rounded-lg border border-rose-100">
            <div>
              <span className="text-slate-400 text-[9px] block">LISTED NAME</span>
              <span className="font-semibold">{sanctionsMatch.name}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[9px] block">ALIAS</span>
              <span className="font-semibold">{sanctionsMatch.alias}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[9px] block">PROGRAM</span>
              <span className="font-semibold">{sanctionsMatch.program}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[9px] block">NATIONALITY</span>
              <span className="font-semibold">{sanctionsMatch.nationality || 'XA'}</span>
            </div>
          </div>
        </div>
      )}

      {pepMatch && (
        <div className="bg-purple-50/70 border border-purple-200 rounded-xl p-3.5 text-xs text-purple-950 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-bold font-mono text-purple-700 text-xs">
              <UserCheck className="w-4 h-4 text-purple-600" />
              <span>POLITICALLY EXPOSED PERSON (PEP) HIT — {pepMatch.pepId}</span>
            </div>
            <span className="text-[10px] font-mono bg-purple-200/60 text-purple-800 px-1.5 py-0.2 rounded font-bold">
              ENHANCED DUE DILIGENCE
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] font-mono bg-white/80 p-2.5 rounded-lg border border-purple-100">
            <div>
              <span className="text-slate-400 text-[9px] block">NAME</span>
              <span className="font-semibold">{pepMatch.name}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[9px] block">POSITION</span>
              <span className="font-semibold truncate block">{pepMatch.position}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[9px] block">CATEGORY</span>
              <span className="font-semibold">{pepMatch.category}</span>
            </div>
          </div>
        </div>
      )}

      {/* Extracted Entity Table */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-800">
              Extracted Entities ({activeDoc.fileName})
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              ID: {activeDoc.docId}
            </span>
          </div>

          <span className="text-[11px] font-mono text-slate-500">
            Confidence Threshold: <span className="font-bold text-slate-700">&ge; 0.80</span>
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {fields.map((field) => {
            const declaredVal = getDeclaredValueForField(field.fieldName);
            const isLowConfidence = field.confidence < 0.80;
            const isOfficerCorrected = field.source === 'OFFICER';

            return (
              <div
                key={field.fieldName}
                className={`p-3.5 transition-colors ${
                  isLowConfidence
                    ? 'bg-amber-50/40 border-l-2 border-l-amber-500'
                    : isOfficerCorrected
                    ? 'bg-blue-50/30 border-l-2 border-l-blue-500'
                    : 'hover:bg-slate-50/50'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-800">
                        {getFieldLabel(field.fieldName)}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        [{field.fieldName}]
                      </span>
                      <span
                        className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded ${
                          isOfficerCorrected
                            ? 'bg-blue-100 text-blue-800 border border-blue-200'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {field.source || 'AI_OCR'}
                      </span>
                    </div>

                    {/* Value Comparison Line */}
                    <div className="mt-1.5 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                      <div className="bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100 flex items-center justify-between">
                        <span className="text-[9px] text-slate-400 uppercase font-sans">
                          Declared:
                        </span>
                        <span className="font-medium text-slate-700 truncate ml-2">
                          {field.fieldName === 'pan_number'
                            ? maskPAN(declaredVal)
                            : field.fieldName === 'aadhaar_last4'
                            ? maskAadhaar(declaredVal)
                            : declaredVal || 'N/A'}
                        </span>
                      </div>

                      <div
                        className={`px-2.5 py-1.5 rounded-lg border flex items-center justify-between ${
                          isLowConfidence
                            ? 'bg-amber-100/60 border-amber-300 text-amber-950 font-bold'
                            : 'bg-slate-50 border-slate-100 text-slate-800'
                        }`}
                      >
                        <span className="text-[9px] text-slate-400 uppercase font-sans">
                          Extracted:
                        </span>
                        <span className="font-medium truncate ml-2">
                          {field.fieldName === 'pan_number'
                            ? maskPAN(field.value)
                            : field.fieldName === 'aadhaar_last4'
                            ? maskAadhaar(field.value)
                            : field.value || 'NOT EXTRACTED'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Confidence Badge & Quick Correct Button */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1.5 shrink-0">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-semibold border ${
                        isLowConfidence
                          ? 'bg-amber-100 text-amber-900 border-amber-300'
                          : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      }`}
                    >
                      {isLowConfidence && <AlertTriangle className="w-3 h-3 text-amber-600" />}
                      <span>{formatConfidence(field.confidence)}</span>
                    </span>

                    <button
                      onClick={() =>
                        onOpenCorrectionModal({
                          docId: activeDoc.docId,
                          fieldName: field.fieldName,
                          fieldLabel: getFieldLabel(field.fieldName),
                          currentValue: field.value,
                          declaredValue: declaredVal,
                        })
                      }
                      className="px-2.5 py-1 rounded-lg text-[11px] font-mono text-blue-600 hover:text-blue-700 hover:bg-blue-50 border border-blue-200 transition-colors flex items-center gap-1"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>CORRECT</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
