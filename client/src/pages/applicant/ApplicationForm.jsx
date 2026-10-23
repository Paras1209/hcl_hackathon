import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  CreditCard,
  MapPin,
  Briefcase,
  FileText,
  Upload,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Trash2,
  Eye,
  ShieldCheck,
  X,
} from 'lucide-react';
import { OCCUPATIONS, DOCUMENT_TYPES, DOCUMENT_TYPE_LABELS } from '../../constants/statuses';
import { validateApplicationForm, validateDocumentFile } from '../../utils/validators';
import { maskPAN, maskAadhaar, formatFileSize, formatCurrency } from '../../utils/formatters';
import { applicationsApi } from '../../api/applications';
import { useToast } from '../../components/Toast';

export default function ApplicationForm() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    fullName: 'Ravi Kumar Sharma',
    dob: '1992-04-10',
    gender: 'MALE',
    panNumber: 'ZZKPS5678R',
    aadhaarLast4: '8832',
    mobile: '9988776655',
    email: 'ravi.k.sharma@example.com',
    address: 'B-304, Green Meadows, Baner',
    city: 'Pune',
    state: 'Maharashtra',
    pincode: '411045',
    occupationCode: 'SALARIED_PRIVATE',
    annualIncome: 1400000,
    consentKYC: true,
  });

  const [formErrors, setFormErrors] = useState({});

  // Document Upload State (Min 3 required)
  const [uploadedFiles, setUploadedFiles] = useState([
    {
      id: 'doc-1',
      name: 'pan_card_specimen.txt',
      size: 1420,
      declaredType: DOCUMENT_TYPES.PAN_CARD,
      content: `INCOME TAX DEPARTMENT - GOVT OF INDIA\nPERMANENT ACCOUNT NUMBER CARD\nSYNTHETIC SPECIMEN - NOT A VALID DOCUMENT\nNAME: RAVI K SHARMA\nFATHER: MOHAN SHARMA\nDOB: 10/04/1992\nPAN: ZZKPS5678R`,
    },
    {
      id: 'doc-2',
      name: 'aadhaar_card_specimen.txt',
      size: 1530,
      declaredType: DOCUMENT_TYPES.AADHAAR_CARD,
      content: `UNIQUE IDENTIFICATION AUTHORITY OF INDIA\nGOVERNMENT OF INDIA\nSYNTHETIC SPECIMEN - NOT A VALID DOCUMENT\nNAME: RAVI KUMAR SHARMA\nDOB: 10/04/1992\nGENDER: MALE\nAADHAAR: XXXX XXXX 8832`,
    },
    {
      id: 'doc-3',
      name: 'electricity_bill_specimen.txt',
      size: 1850,
      declaredType: DOCUMENT_TYPES.ELECTRICITY_BILL,
      content: `MAHARASHTRA STATE ELECTRICITY DISTRIBUTION CO. LTD.\nSYNTHETIC SPECIMEN - NOT A VALID DOCUMENT\nCONSUMER NAME: RAVI KUMAR SHARMA\nBILL DATE: 15/02/2026\nADDRESS: B-304, Green Meadows, Baner, Pune\nPIN CODE: 411045`,
    },
  ]);

  const [previewDoc, setPreviewDoc] = useState(null);
  const [docUploadError, setDocUploadError] = useState('');

  // Field change handler
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  // Step 1 Validation
  const handleNextToDocs = () => {
    const errors = validateApplicationForm(formData);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      showToast('Please correct form validation errors', 'error');
      return;
    }
    setFormErrors({});
    setCurrentStep(2);
  };

  // Step 2 Document Upload Handlers
  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    setDocUploadError('');

    files.forEach((file) => {
      const val = validateDocumentFile(file);
      if (!val.valid) {
        setDocUploadError(val.error);
        showToast(val.error, 'error');
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target.result;
        let inferredType = DOCUMENT_TYPES.OTHER;
        const lowerName = file.name.toLowerCase();
        if (lowerName.includes('pan')) inferredType = DOCUMENT_TYPES.PAN_CARD;
        else if (lowerName.includes('aadhaar')) inferredType = DOCUMENT_TYPES.AADHAAR_CARD;
        else if (lowerName.includes('electricity') || lowerName.includes('bill'))
          inferredType = DOCUMENT_TYPES.ELECTRICITY_BILL;
        else if (lowerName.includes('bank') || lowerName.includes('statement'))
          inferredType = DOCUMENT_TYPES.BANK_STATEMENT;
        else if (lowerName.includes('licence') || lowerName.includes('dl'))
          inferredType = DOCUMENT_TYPES.DRIVING_LICENCE;

        const newDoc = {
          id: `doc-${Date.now()}-${Math.random()}`,
          name: file.name,
          size: file.size,
          declaredType: inferredType,
          content: text,
        };

        setUploadedFiles((prev) => [...prev, newDoc]);
      };
      reader.readAsText(file);
    });
  };

  const handleRemoveDoc = (id) => {
    setUploadedFiles((prev) => prev.filter((d) => d.id !== id));
  };

  const handleDeclaredTypeChange = (id, newType) => {
    setUploadedFiles((prev) =>
      prev.map((d) => (d.id === id ? { ...d, declaredType: newType } : d))
    );
  };

  // Step 2 Validation (at least 3 documents required)
  const handleNextToReview = () => {
    if (uploadedFiles.length < 3) {
      setDocUploadError('Case study requirement: Please upload at least three .txt specimen documents.');
      showToast('At least 3 specimen documents are required before submission', 'error');
      return;
    }
    setDocUploadError('');
    setCurrentStep(3);
  };

  // Final Submission
  const handleSubmitApplication = async () => {
    setLoading(true);
    try {
      const res = await applicationsApi.createApplication(formData, uploadedFiles);
      if (res.success) {
        showToast(`Application ${res.data.applicationId} registered successfully`, 'success');
        navigate(`/applicant/status/${res.data.applicationId}`);
      }
    } catch (err) {
      showToast(err.message || 'Submission failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5 max-w-4xl mx-auto font-sans">
      {/* Stepper Header */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Digital Savings Account Application
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Electronic KYC Verification &amp; Identity Onboarding
            </p>
          </div>

          {/* Stepper Progress */}
          <div className="flex items-center gap-1.5 text-xs">
            {[
              { num: 1, label: '1. Profile' },
              { num: 2, label: '2. Documents' },
              { num: 3, label: '3. Review & Submit' },
            ].map((step, idx) => (
              <React.Fragment key={step.num}>
                <button
                  type="button"
                  onClick={() => step.num < currentStep && setCurrentStep(step.num)}
                  disabled={step.num > currentStep}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                    currentStep === step.num
                      ? 'bg-blue-600 text-white shadow-xs'
                      : currentStep > step.num
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'text-slate-400 bg-slate-100 cursor-not-allowed'
                  }`}
                >
                  {currentStep > step.num && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                  <span>{step.label}</span>
                </button>
                {idx < 2 && <span className="text-slate-300">/</span>}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* STEP 1: PERSONAL & FINANCIAL DETAILS */}
      {currentStep === 1 && (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Applicant Legal Profile</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Information must match your government-issued identification documents.
              </p>
            </div>
            <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
              Step 1 of 3
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Full Name */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Full Legal Name *
              </label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleInputChange}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-slate-50/40 text-slate-900"
              />
              {formErrors.fullName && (
                <p className="text-xs text-rose-600 mt-1.5">{formErrors.fullName}</p>
              )}
            </div>

            {/* Date of Birth */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Date of Birth (YYYY-MM-DD) *
              </label>
              <input
                type="date"
                name="dob"
                value={formData.dob}
                onChange={handleInputChange}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-slate-50/40 text-slate-900"
              />
              {formErrors.dob && (
                <p className="text-xs text-rose-600 mt-1.5">{formErrors.dob}</p>
              )}
            </div>

            {/* Gender */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Gender *
              </label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleInputChange}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-white text-slate-900"
              >
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            {/* PAN Number */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                PAN Number (e.g. ABCDE1234F) *
              </label>
              <input
                type="text"
                name="panNumber"
                maxLength={10}
                value={formData.panNumber}
                onChange={handleInputChange}
                className="w-full px-3.5 py-2.5 text-sm font-mono uppercase border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-slate-50/40 text-slate-900"
              />
              {formErrors.panNumber && (
                <p className="text-xs text-rose-600 mt-1.5">{formErrors.panNumber}</p>
              )}
            </div>

            {/* Aadhaar Last 4 Digits */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Aadhaar (Last 4 Digits Only) *
              </label>
              <input
                type="text"
                name="aadhaarLast4"
                maxLength={4}
                value={formData.aadhaarLast4}
                onChange={handleInputChange}
                placeholder="4 digits only"
                className="w-full px-3.5 py-2.5 text-sm font-mono border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-slate-50/40 text-slate-900"
              />
              {formErrors.aadhaarLast4 && (
                <p className="text-xs text-rose-600 mt-1.5">{formErrors.aadhaarLast4}</p>
              )}
            </div>

            {/* Mobile */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Mobile Number (+91) *
              </label>
              <input
                type="tel"
                name="mobile"
                maxLength={10}
                value={formData.mobile}
                onChange={handleInputChange}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-slate-50/40 text-slate-900"
              />
              {formErrors.mobile && (
                <p className="text-xs text-rose-600 mt-1.5">{formErrors.mobile}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Email Address *
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-slate-50/40 text-slate-900"
              />
              {formErrors.email && (
                <p className="text-xs text-rose-600 mt-1.5">{formErrors.email}</p>
              )}
            </div>

            {/* Address */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Residential Address *
              </label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-slate-50/40 text-slate-900"
              />
              {formErrors.address && (
                <p className="text-xs text-rose-600 mt-1.5">{formErrors.address}</p>
              )}
            </div>

            {/* City */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                City *
              </label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleInputChange}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-slate-50/40 text-slate-900"
              />
            </div>

            {/* State */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                State *
              </label>
              <input
                type="text"
                name="state"
                value={formData.state}
                onChange={handleInputChange}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-slate-50/40 text-slate-900"
              />
            </div>

            {/* PIN Code */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Postal PIN Code (6 Digits) *
              </label>
              <input
                type="text"
                name="pincode"
                maxLength={6}
                value={formData.pincode}
                onChange={handleInputChange}
                className="w-full px-3.5 py-2.5 text-sm font-mono border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-slate-50/40 text-slate-900"
              />
              {formErrors.pincode && (
                <p className="text-xs text-rose-600 mt-1.5">{formErrors.pincode}</p>
              )}
            </div>

            {/* Occupation */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Occupation *
              </label>
              <select
                name="occupationCode"
                value={formData.occupationCode}
                onChange={handleInputChange}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-white text-slate-900"
              >
                {OCCUPATIONS.map((occ) => (
                  <option key={occ.code} value={occ.code}>
                    {occ.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Annual Income */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Annual Income (INR) *
              </label>
              <input
                type="number"
                name="annualIncome"
                value={formData.annualIncome}
                onChange={handleInputChange}
                className="w-full px-3.5 py-2.5 text-sm font-mono border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-slate-50/40 text-slate-900"
              />
            </div>
          </div>

          {/* Consent Checkbox */}
          <div className="pt-2">
            <label className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 cursor-pointer">
              <input
                type="checkbox"
                name="consentKYC"
                checked={formData.consentKYC}
                onChange={handleInputChange}
                className="mt-0.5 w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
              />
              <span className="text-xs text-slate-600 leading-relaxed">
                I hereby grant consent to Deccan Digital Bank to process my submitted demographic and
                identification records against regulatory KYC guidelines and watchlists.
              </span>
            </label>
            {formErrors.consentKYC && (
              <p className="text-xs text-rose-600 mt-1.5">{formErrors.consentKYC}</p>
            )}
          </div>

          <div className="flex justify-end pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={handleNextToDocs}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl transition-colors flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <span>Next: Specimen Documents</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: SPECIMEN DOCUMENT UPLOAD */}
      {currentStep === 2 && (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Upload Verification Specimens
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Upload at least three UTF-8 .txt files representing OCR extracted identity documents.
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              {uploadedFiles.length} of 3 Attached
            </span>
          </div>

          {/* Dashed Drop Zone */}
          <label className="border border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-8 flex flex-col items-center justify-center gap-2 cursor-pointer bg-slate-50/50 hover:bg-blue-50/20 transition-colors">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-xs">
              <Upload className="w-6 h-6" />
            </div>
            <div className="text-center">
              <span className="text-xs font-semibold text-slate-800 block mt-1">
                Select or drop .txt specimen files
              </span>
              <span className="text-[11px] text-slate-400 mt-0.5 block">
                UTF-8 text · Max 1 MB each · At least 3 documents required
              </span>
            </div>
            <input
              type="file"
              multiple
              accept=".txt"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          {docUploadError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{docUploadError}</span>
            </div>
          )}

          {/* Uploaded Documents List */}
          <div className="space-y-3">
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
              Attached Documents ({uploadedFiles.length})
            </span>

            <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden text-xs">
              {uploadedFiles.map((doc) => (
                <div
                  key={doc.id}
                  className="p-3.5 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-lg bg-blue-50 text-blue-600 shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="font-semibold text-slate-900 block truncate">
                        {doc.name}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {formatFileSize(doc.size)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={doc.declaredType}
                      onChange={(e) => handleDeclaredTypeChange(doc.id, e.target.value)}
                      className="text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value={DOCUMENT_TYPES.PAN_CARD}>PAN Card</option>
                      <option value={DOCUMENT_TYPES.AADHAAR_CARD}>Aadhaar Card</option>
                      <option value={DOCUMENT_TYPES.ELECTRICITY_BILL}>Electricity Bill</option>
                      <option value={DOCUMENT_TYPES.BANK_STATEMENT}>Bank Statement</option>
                      <option value={DOCUMENT_TYPES.DRIVING_LICENCE}>Driving Licence</option>
                      <option value={DOCUMENT_TYPES.OTHER}>Other Document</option>
                    </select>

                    <button
                      type="button"
                      onClick={() => setPreviewDoc(doc)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                      title="Preview text"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRemoveDoc(doc.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Remove file"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Stepper Navigation */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>

            <button
              type="button"
              onClick={handleNextToReview}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl transition-colors flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <span>Next: Review &amp; Submit</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: REVIEW & SUBMIT */}
      {currentStep === 3 && (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Review &amp; Authorize Submission
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Verify application details before submitting for automated screening.
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              Final Step
            </span>
          </div>

          {/* Details Grid */}
          <div className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200/80 text-xs space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-semibold block">Full Name</span>
                <span className="font-bold text-slate-900 mt-0.5 block">{formData.fullName}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-semibold block">Date of Birth</span>
                <span className="font-medium text-slate-800 mt-0.5 block">{formData.dob}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-semibold block">Masked PAN</span>
                <span className="font-bold text-blue-600 font-mono mt-0.5 block">{maskPAN(formData.panNumber)}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-semibold block">Aadhaar Last 4</span>
                <span className="font-bold text-slate-800 font-mono mt-0.5 block">{maskAadhaar(formData.aadhaarLast4)}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200/60 flex items-center justify-between">
              <span className="text-slate-600 truncate">
                Address: {formData.address}, {formData.city}, {formData.state} - {formData.pincode}
              </span>
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="text-xs text-blue-600 hover:underline font-semibold cursor-pointer"
              >
                Edit
              </button>
            </div>
          </div>

          {/* Attached Documents */}
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Attached Specimen Documents ({uploadedFiles.length})
              </span>
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="text-xs text-blue-600 hover:underline font-semibold cursor-pointer"
              >
                Edit
              </button>
            </div>
            <div className="space-y-1.5">
              {uploadedFiles.map((doc) => (
                <div
                  key={doc.id}
                  className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <span className="font-semibold text-slate-800">{doc.name}</span>
                  </div>
                  <span className="text-slate-500 font-medium">
                    {DOCUMENT_TYPE_LABELS[doc.declaredType] || doc.declaredType}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Submit Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={handleSubmitApplication}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl transition-colors flex items-center gap-2 shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Submit KYC Application</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs font-sans">
          <div className="bg-white text-slate-900 rounded-2xl max-w-xl w-full border border-slate-200 overflow-hidden shadow-2xl">
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs">
              <span className="font-bold text-slate-900 text-sm">{previewDoc.name}</span>
              <button
                onClick={() => setPreviewDoc(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-md transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <pre className="p-5 text-xs font-mono max-h-80 overflow-y-auto whitespace-pre-wrap leading-relaxed select-text bg-slate-50/50 border-b border-slate-100 text-slate-800">
              {previewDoc.content}
            </pre>
            <div className="p-3 bg-slate-50 text-right">
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
