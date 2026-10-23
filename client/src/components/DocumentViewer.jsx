import React, { useState } from 'react';
import {
  FileText,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Code2,
} from 'lucide-react';
import { DOCUMENT_TYPE_LABELS } from '../constants/statuses';
import { formatFileSize, formatDateTime } from '../utils/formatters';

export default function DocumentViewer({ documents = [], onSelectDoc, selectedDocId }) {
  const [copied, setCopied] = useState(false);

  if (!documents || documents.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
        <FileText className="w-8 h-8 mx-auto text-slate-400 mb-2" />
        <p className="text-xs font-medium text-slate-600">No documents in attached feed</p>
      </div>
    );
  }

  const activeIndex = Math.max(
    0,
    documents.findIndex((d) => d.docId === selectedDocId)
  );
  const activeDoc = documents[activeIndex] || documents[0];

  const handleCopy = () => {
    if (activeDoc?.textContent) {
      navigator.clipboard.writeText(activeDoc.textContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePrev = () => {
    const prevIdx = (activeIndex - 1 + documents.length) % documents.length;
    onSelectDoc(documents[prevIdx].docId);
  };

  const handleNext = () => {
    const nextIdx = (activeIndex + 1) % documents.length;
    onSelectDoc(documents[nextIdx].docId);
  };

  const isTypeMismatch =
    activeDoc.declaredDocType &&
    activeDoc.classifiedDocType &&
    activeDoc.declaredDocType !== activeDoc.classifiedDocType;

  // Split text content into numbered lines
  const lines = (activeDoc?.textContent || '').split('\n');

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs flex flex-col h-full overflow-hidden text-slate-900">
      {/* Title Bar */}
      <div className="bg-slate-50/80 border-b border-slate-200/80 px-4 py-2.5 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <Code2 className="w-4 h-4 text-blue-600" />
          <span className="font-semibold text-slate-900">OCR Raw Text Feed</span>
          <span className="text-slate-300">|</span>
          <span className="text-slate-600 truncate max-w-[140px] sm:max-w-[200px]">
            {activeDoc.fileName}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-semibold">
            Specimen Feed
          </span>
          <span className="text-slate-500 text-xs font-medium tabular-nums">
            {activeIndex + 1} of {documents.length}
          </span>
        </div>
      </div>

      {/* Document Selector Tabs */}
      <div className="border-b border-slate-200/80 bg-slate-50/40 px-3 py-2 flex items-center gap-1.5 overflow-x-auto doc-scroll">
        {documents.map((doc) => {
          const isActive = doc.docId === activeDoc.docId;
          const mismatch = doc.declaredDocType !== doc.classifiedDocType;
          return (
            <button
              key={doc.docId}
              onClick={() => onSelectDoc(doc.docId)}
              className={`px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-blue-50 text-blue-700 border border-blue-200 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent font-medium'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{DOCUMENT_TYPE_LABELS[doc.declaredDocType] || doc.declaredDocType}</span>
              {mismatch && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" title="Type Mismatch (Rule R2)" />
              )}
            </button>
          );
        })}
      </div>

      {/* Classification & Metadata Bar */}
      <div className="px-4 py-2.5 bg-white border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Declared:</span>
          <span className="text-slate-800 font-medium">
            {DOCUMENT_TYPE_LABELS[activeDoc.declaredDocType]}
          </span>
          <span className="text-slate-300">/</span>
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Classified:</span>
          <span
            className={`px-2 py-0.5 rounded-md text-xs font-semibold border ${
              isTypeMismatch
                ? 'bg-amber-50 text-amber-800 border-amber-200'
                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
            }`}
          >
            {DOCUMENT_TYPE_LABELS[activeDoc.classifiedDocType]}
            <span className="ml-1 opacity-80 tabular-nums">
              ({(activeDoc.docTypeConfidence * 100).toFixed(0)}%)
            </span>
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleCopy}
            className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 rounded-lg border border-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
            title="Copy plain text"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700 font-semibold">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                <span>Copy</span>
              </>
            )}
          </button>

          <button
            onClick={handlePrev}
            className="p-1 text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 rounded-lg border border-slate-200 transition-colors cursor-pointer"
            title="Previous document"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={handleNext}
            className="p-1 text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 rounded-lg border border-slate-200 transition-colors cursor-pointer"
            title="Next document"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mismatch Alert Notice */}
      {isTypeMismatch && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center gap-2 text-xs text-amber-900">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <strong>Classification Flag (Rule R2):</strong> Declared as{' '}
            {DOCUMENT_TYPE_LABELS[activeDoc.declaredDocType]}, but OCR classified as{' '}
            {DOCUMENT_TYPE_LABELS[activeDoc.classifiedDocType]}.
          </span>
        </div>
      )}

      {/* OCR Text Stream Display */}
      <div className="flex-1 p-4 bg-slate-50/60 overflow-y-auto doc-scroll text-xs">
        <div className="bg-white rounded-lg border border-slate-200/80 p-3 shadow-xs">
          <table className="w-full border-collapse">
            <tbody>
              {lines.map((line, idx) => (
                <tr key={idx} className="hover:bg-slate-50/80 leading-relaxed">
                  <td className="w-8 select-none text-right pr-3 text-slate-400 font-mono text-[11px] tabular-nums align-top border-r border-slate-100">
                    {String(idx + 1).padStart(2, '0')}
                  </td>
                  <td className="pl-3 font-mono text-slate-800 text-xs whitespace-pre-wrap break-all">
                    {line || <span className="text-slate-300">~</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer Info */}
      <div className="bg-slate-50/80 border-t border-slate-200/80 px-4 py-2 flex items-center justify-between text-[11px] text-slate-500">
        <span>File size: {formatFileSize(activeDoc.fileSizeBytes || 1400)}</span>
        <span>SHA-256 Verified Specimen</span>
      </div>
    </div>
  );
}
