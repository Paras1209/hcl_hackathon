import React, { useState, useEffect } from 'react';
import { Upload, FileText, CheckCircle2, AlertCircle, Eye, ShieldAlert } from 'lucide-react';
import { DOCUMENT_TYPES, DOCUMENT_TYPE_LABELS } from '../../constants/statuses';
import { applicationsApi } from '../../api/applications';
import { validateDocumentFile } from '../../utils/validators';
import { formatFileSize, formatDateTime } from '../../utils/formatters';
import { useToast } from '../../components/Toast';
import { LoadingSpinner } from '../../components/LoadingState';

export default function DocumentUpload() {
  const [documents, setDocuments] = useState([]);
  const [activeApp, setActiveApp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [previewDoc, setPreviewDoc] = useState(null);
  const { showToast } = useToast();

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await applicationsApi.getMyApplications();
      if (res.success && res.data.length > 0) {
        const currentApp = res.data[0];
        setActiveApp(currentApp);
        const fullApp = await applicationsApi.getApplication(currentApp.applicationId);
        setDocuments(fullApp.data.documents || []);
      }
    } catch (e) {
      console.warn('Failed to load applicant documents', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    files.forEach((file) => {
      const val = validateDocumentFile(file);
      if (!val.valid) {
        showToast(val.error, 'error');
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target.result;
        const newDoc = {
          docId: `D${Date.now().toString().slice(-7)}`,
          applicationId: activeApp?.applicationId || 'A2000004',
          fileName: file.name,
          fileSize: file.size,
          declaredDocType: DOCUMENT_TYPES.OTHER,
          classifiedDocType: DOCUMENT_TYPES.OTHER,
          docTypeConfidence: 0.95,
          textContent: text,
          uploadedAt: new Date().toISOString(),
          extractedFields: [],
        };
        setDocuments((prev) => [newDoc, ...prev]);
        showToast(`Document ${file.name} uploaded successfully`, 'success');
      };
      reader.readAsText(file);
    });
  };

  if (loading) {
    return <LoadingSpinner message="Accessing submitted document feed..." />;
  }

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200/90 px-5 py-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900 font-mono">
              DOCUMENT FEED // CASE {activeApp?.applicationId || 'A2000004'}
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-bold">
              {documents.length} ATTACHED
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            UTF-8 OCR plain text stream files uploaded for identity and address verification.
          </p>
        </div>

        <label className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-mono font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shrink-0">
          <Upload className="w-3.5 h-3.5 text-blue-400" />
          <span>UPLOAD .TXT</span>
          <input
            type="file"
            multiple
            accept=".txt"
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>
      </div>

      {/* Documents List */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">
            SUBMITTED SPECIMEN FILES ({documents.length})
          </span>
          <span className="text-[10px] font-mono text-slate-400">ENCODING: UTF-8</span>
        </div>

        {documents.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs font-mono">
            NO SPECIMEN DOCUMENTS FOUND
          </div>
        ) : (
          <div className="divide-y divide-slate-100 font-mono text-xs">
            {documents.map((doc) => (
              <div
                key={doc.docId}
                className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 truncate">
                        {doc.fileName}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        [{doc.docId}]
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 block">
                      {formatFileSize(doc.fileSize)} • {formatDateTime(doc.uploadedAt)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-semibold">
                    {DOCUMENT_TYPE_LABELS[doc.declaredDocType] || doc.declaredDocType}
                  </span>

                  <button
                    onClick={() => setPreviewDoc(doc)}
                    className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
                    title="Inspect plain text"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs font-mono">
          <div className="bg-[#0b0f19] text-slate-200 rounded-xl max-w-xl w-full border border-[#1b253b] overflow-hidden shadow-2xl">
            <div className="p-3 bg-[#070a12] border-b border-[#1b253b] flex items-center justify-between text-xs">
              <span className="font-bold text-slate-300">{previewDoc.fileName}</span>
              <button
                onClick={() => setPreviewDoc(null)}
                className="text-[11px] text-slate-400 hover:text-white"
              >
                CLOSE
              </button>
            </div>
            <pre className="p-4 text-xs font-mono max-h-80 overflow-y-auto whitespace-pre-wrap leading-relaxed select-text">
              {previewDoc.textContent}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
