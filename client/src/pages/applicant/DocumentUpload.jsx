import React, { useState, useEffect } from 'react';
import { Upload, FileText, CheckCircle2, AlertCircle, Eye, X } from 'lucide-react';
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
      const isPDF = file.name.toLowerCase().endsWith('.pdf');
      
      reader.onload = (event) => {
        const content = event.target.result;
        const newDoc = {
          docId: `D${Date.now().toString().slice(-7)}`,
          applicationId: activeApp?.applicationId || 'A2000004',
          fileName: file.name,
          fileSize: file.size,
          declaredDocType: DOCUMENT_TYPES.OTHER,
          classifiedDocType: DOCUMENT_TYPES.OTHER,
          docTypeConfidence: 0.95,
          textContent: isPDF ? '[PDF Document - Binary Content]' : content,
          fileContent: isPDF ? content : null,
          mimeType: isPDF ? 'application/pdf' : 'text/plain',
          uploadedAt: new Date().toISOString(),
          extractedFields: [],
        };
        setDocuments((prev) => [newDoc, ...prev]);
        showToast(`Document ${file.name} uploaded successfully`, 'success');
      };
      
      if (isPDF) {
        reader.readAsDataURL(file);
      } else {
        reader.readAsText(file);
      }
    });
  };

  if (loading) {
    return <LoadingSpinner message="Accessing submitted document vault..." />;
  }

  return (
    <div className="space-y-5 max-w-4xl mx-auto font-sans">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Document Vault
            </h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              Case {activeApp?.applicationId || 'A2000004'}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              {documents.length} Files Attached
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Upload identity and address verification documents (PDF or TXT format).
          </p>
        </div>

        <label className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl transition-colors flex items-center gap-2 cursor-pointer shrink-0 shadow-xs">
          <Upload className="w-4 h-4" />
          <span>Upload Documents</span>
          <input
            type="file"
            multiple
            accept=".pdf,.txt"
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>
      </div>

      {/* Documents List */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Submitted Documents ({documents.length})
          </span>
          <span className="text-xs text-slate-400 font-medium">PDF & TXT Files</span>
        </div>

        {documents.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No documents found in vault
          </div>
        ) : (
          <div className="divide-y divide-slate-100 text-xs">
            {documents.map((doc) => (
              <div
                key={doc.docId}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900 truncate">
                        {doc.fileName}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        [{doc.docId}]
                      </span>
                    </div>
                    <span className="text-xs text-slate-500 block mt-0.5">
                      {formatFileSize(doc.fileSize)} · Uploaded {formatDateTime(doc.uploadedAt)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200">
                    {DOCUMENT_TYPE_LABELS[doc.declaredDocType] || doc.declaredDocType}
                  </span>

                  <button
                    onClick={() => setPreviewDoc(doc)}
                    className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-slate-200 cursor-pointer"
                    title={doc.mimeType === 'application/pdf' ? 'View PDF' : 'Inspect plain text'}
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs font-sans">
          <div className="bg-white text-slate-900 rounded-2xl max-w-4xl w-full h-[90vh] border border-slate-200 overflow-hidden shadow-2xl flex flex-col">
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs">
              <span className="font-bold text-slate-900 text-sm truncate">{previewDoc.fileName}</span>
              <button
                onClick={() => setPreviewDoc(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-md transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              {previewDoc.mimeType === 'application/pdf' ? (
                <iframe
                  src={previewDoc.fileContent}
                  className="w-full h-full"
                  title="PDF Preview"
                />
              ) : (
                <pre className="p-5 text-xs font-mono h-full overflow-y-auto whitespace-pre-wrap leading-relaxed select-text bg-slate-50/50 text-slate-800">
                  {previewDoc.textContent}
                </pre>
              )}
            </div>
            <div className="p-3 bg-slate-50 border-t border-slate-100 text-right">
              <button
                onClick={() => setPreviewDoc(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
