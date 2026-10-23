import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FileText, ArrowRight, RefreshCw, AlertCircle } from 'lucide-react';
import { applicationsApi } from '../../api/applications';
import StatusTimeline from '../../components/StatusTimeline';
import { LoadingSpinner } from '../../components/LoadingState';
import { maskPAN, maskAadhaar, formatCurrency, formatDate } from '../../utils/formatters';

export default function StatusTracking() {
  const { id } = useParams();
  const [application, setApplication] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      let targetId = id;

      if (!targetId) {
        const myApps = await applicationsApi.getMyApplications();
        if (myApps.success && myApps.data.length > 0) {
          targetId = myApps.data[0].applicationId;
        } else {
          targetId = 'A2000004';
        }
      }

      const appRes = await applicationsApi.getApplication(targetId);
      if (appRes.success) {
        setApplication(appRes.data);
      }

      const timelineRes = await applicationsApi.getApplicationTimeline(targetId);
      if (timelineRes.success) {
        setTimeline(timelineRes.data);
      }
    } catch (e) {
      setError(e.message || 'Failed to load application status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  if (loading) {
    return <LoadingSpinner message="Retrieving verification progression timeline..." />;
  }

  if (error || !application) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center max-w-md mx-auto">
        <AlertCircle className="w-8 h-8 mx-auto text-rose-500 mb-2" />
        <h3 className="text-sm font-bold text-slate-900 mb-1 font-mono">CASE NOT FOUND</h3>
        <p className="text-xs text-slate-500 mb-4">{error || 'Please submit an application first.'}</p>
        <Link
          to="/applicant/apply"
          className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-mono font-semibold hover:bg-slate-800 transition-colors inline-block"
        >
          SUBMIT NEW APPLICATION
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Top Application Header */}
      <div className="bg-white rounded-xl border border-slate-200/90 px-5 py-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900 font-mono">
              APPLICATION {application.applicationId}
            </h2>
            <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
              SUBMITTED: {formatDate(application.applicationDate)}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Applicant: <span className="font-semibold text-slate-800">{application.fullName}</span> •{' '}
            Masked PAN: <span className="font-mono text-slate-700">{maskPAN(application.panNumber)}</span>
          </p>
        </div>

        <button
          onClick={loadData}
          className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg border border-slate-200 text-xs font-mono flex items-center gap-1.5 transition-colors self-start sm:self-center"
          title="Refresh status"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>SYNC</span>
        </button>
      </div>

      {/* Status Timeline Component */}
      <StatusTimeline application={application} timeline={timeline} />

      {/* Application Snapshot Card */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs space-y-3">
        <h3 className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider">
          DECLARED APPLICATION PARAMETERS
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
          <div>
            <span className="text-slate-400 block text-[9px] uppercase font-sans">Full Name</span>
            <span className="font-bold text-slate-900">{application.fullName}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[9px] uppercase font-sans">Date of Birth</span>
            <span>{application.dob}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[9px] uppercase font-sans">Aadhaar Last 4</span>
            <span className="font-bold text-slate-800">
              {maskAadhaar(application.aadhaarLast4)}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[9px] uppercase font-sans">Mobile</span>
            <span>{application.mobile}</span>
          </div>
          <div className="sm:col-span-2">
            <span className="text-slate-400 block text-[9px] uppercase font-sans">Residential Address</span>
            <span className="text-slate-700">
              {application.address}, {application.city}, {application.state} - {application.pincode}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[9px] uppercase font-sans">Annual Income</span>
            <span className="text-slate-700">{formatCurrency(application.annualIncome)}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[9px] uppercase font-sans">Attached Files</span>
            <span className="font-bold text-blue-600">
              {application.documents?.length || application.documentsCount || 3} documents
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
