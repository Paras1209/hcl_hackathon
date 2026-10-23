import React, { useState } from 'react';
import {
  FileText,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  ShieldAlert,
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
        <p className="text-xs font-mono">NO DOCUMENTS IN ATTACHED FEED</p>
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
    <div className="bg-[#0b0f19] rounded-xl border border-[#1b253b] shadow-sm flex flex-col h-full overflow-hidden text-slate-300">
      {/* Terminal Title Bar */}
      <div className="bg-[#070a12] border-b border-[#1b253b] px-3.5 py-2 flex items-center justify-between text-[11px] font-mono">
        <div className="flex items-center gap-2">
          <Code2 className="w-3.5 h-3.5 text-blue-400" />
          <span className="font-semibold text-slate-200">OCR RAW TEXT FEED</span>
          <span className="text-[10px] text-slate-500">|</span>
          <span className="text-slate-400 truncate max-w-[140px] sm:max-w-[200px]">
            {activeDoc.fileName}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
            SPECIMEN
          </span>
          <span className="text-slate-500 font-mono text-[10px]">
            [{activeIndex + 1}/{documents.length}]
          </span>
        </div>
      </div>

      {/* Document Selector Pills */}
      <div className="border-b border-[#1b253b] bg-[#0c1220] px-2 py-1.5 flex items-center gap-1.5 overflow-x-auto terminal-scroll">
        {documents.map((doc) => {
          const isActive = doc.docId === activeDoc.docId;
          const mismatch = doc.declaredDocType !== doc.classifiedDocType;
          return (
            <button
              key={doc.docId}
              onClick={() => onSelectDoc(doc.docId)}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-mono flex items-center gap-1.5 whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/40 font-semibold shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#151e33] border border-transparent'
              }`}
            >
              <FileText className="w-3 h-3" />
              <span>{DOCUMENT_TYPE_LABELS[doc.declaredDocType] || doc.declaredDocType}</span>
              {mismatch && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title="Type Mismatch (Rule R2)" />
              )}
            </button>
          );
        })}
      </div>

      {/* Classification & Metadata Bar */}
      <div className="px-3.5 py-2 bg-[#0a0e18] border-b border-[#1b253b] flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] text-slate-500 uppercase">DECLARED:</span>
          <span className="text-slate-300 font-medium">
            {DOCUMENT_TYPE_LABELS[activeDoc.declaredDocType]}
          </span>
          <span className="text-slate-600">/</span>
          <span className="text-[10px] text-slate-500 uppercase">CLASSIFIED:</span>
          <span
            className={`px-1.5 py-0.5 rounded text-[11px] font-semibold border ${
              isTypeMismatch
                ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
            }`}
          >
            {DOCUMENT_TYPE_LABELS[activeDoc.classifiedDocType]}
            <span className="ml-1 opacity-80">
              {(activeDoc.docTypeConfidence * 100).toFixed(0)}%
            </span>
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleCopy}
            className="px-2 py-1 bg-[#131b2d] hover:bg-[#1a253e] text-slate-300 rounded border border-[#232f4b] text-[11px] font-mono flex items-center gap-1 transition-colors"
            title="Copy plain text"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400">COPIED</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3 text-slate-400" />
                <span>COPY</span>
              </>
            )}
          </button>

          <button
            onClick={handlePrev}
            className="p-1 text-slate-400 hover:text-white bg-[#131b2d] hover:bg-[#1a253e] rounded border border-[#232f4b] transition-colors"
            title="Previous"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleNext}
            className="p-1 text-slate-400 hover:text-white bg-[#131b2d] hover:bg-[#1a253e] rounded border border-[#232f4b] transition-colors"
            title="Next"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {isTypeMismatch && (
        <div className="px-3.5 py-2 bg-amber-950/40 border-b border-amber-800/40 flex items-center gap-2 text-[11px] text-amber-300 font-mono">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>
            DISCREPANCY R2: Declared type '{DOCUMENT_TYPE_LABELS[activeDoc.declaredDocType]}' differs
            from classified '{DOCUMENT_TYPE_LABELS[activeDoc.classifiedDocType]}'
          </span>
        </div>
      )}

      {/* Code/OCR Stream Viewer with Line Numbers */}
      <div className="flex-1 overflow-y-auto terminal-scroll bg-[#060911] text-slate-300 font-mono text-xs p-3 select-text">
        <table className="w-full border-collapse">
          <tbody>
            {lines.map((lineText, idx) => (
              <tr key={idx} className="hover:bg-slate-900/60 leading-relaxed group">
                <td className="w-8 pr-3 text-right text-slate-600 select-none text-[11px] font-mono align-top pt-0.5">
                  {(idx + 1).toString().padStart(2, '0')}
                </td>
                <td className="text-slate-200 font-mono whitespace-pre-wrap break-all">
                  {lineText || ' '}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Terminal Status Bar */}
      <div className="px-3 py-1.5 bg-[#070a12] border-t border-[#1b253b] text-[10px] font-mono text-slate-500 flex items-center justify-between">
        <span>ENCODING: UTF-8</span>
        <span>SIZE: {formatFileSize(activeDoc.fileSize)}</span>
        <span>ID: {activeDoc.docId}</span>
      </div>
    </div>
  );
}
