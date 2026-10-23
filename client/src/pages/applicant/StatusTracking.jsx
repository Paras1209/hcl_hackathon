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
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center max-w-md mx-auto shadow-xs font-sans">
        <AlertCircle className="w-10 h-10 mx-auto text-rose-500 mb-3" />
        <h3 className="text-base font-bold text-slate-900 mb-1">Application Record Not Found</h3>
        <p className="text-xs text-slate-500 mb-5 leading-relaxed">{error || 'Please submit an application to begin tracking.'}</p>
        <Link
          to="/applicant/apply"
          className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition-colors inline-block shadow-xs"
        >
          Submit New Application
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-4xl mx-auto font-sans">
      {/* Top Application Header */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-slate-900">
              Application {application.applicationId}
            </h1>
            <span className="text-xs bg-slate-100 text-slate-700 font-semibold px-2.5 py-0.5 rounded-full border border-slate-200">
              Submitted: {formatDate(application.applicationDate)}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Applicant: <span className="font-semibold text-slate-900">{application.fullName}</span> ·{' '}
            PAN: <span className="font-mono text-slate-700 font-semibold">{maskPAN(application.panNumber)}</span>
          </p>
        </div>

        <button
          onClick={loadData}
          className="px-3.5 py-2 text-slate-700 hover:text-blue-700 hover:bg-blue-50 rounded-xl border border-slate-200 text-xs font-semibold flex items-center gap-2 transition-colors self-start sm:self-center cursor-pointer shadow-xs"
          title="Refresh status"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Status</span>
        </button>
      </div>

      {/* Status Timeline Component */}
      <StatusTimeline application={application} timeline={timeline} />

      {/* Application Snapshot Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
          Declared Application Parameters
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Full Legal Name</span>
            <span className="font-bold text-slate-900 mt-0.5 block">{application.fullName}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Date of Birth</span>
            <span className="font-medium text-slate-800 mt-0.5 block">{application.dob}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Aadhaar (Last 4)</span>
            <span className="font-bold text-slate-900 font-mono mt-0.5 block">
              {maskAadhaar(application.aadhaarLast4)}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Mobile Number</span>
            <span className="font-medium text-slate-800 mt-0.5 block">{application.mobile}</span>
          </div>
          <div className="sm:col-span-2">
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Residential Address</span>
            <span className="text-slate-700 mt-0.5 block leading-relaxed">
              {application.address}, {application.city}, {application.state} - {application.pincode}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Annual Income</span>
            <span className="font-medium text-slate-800 mt-0.5 block">{formatCurrency(application.annualIncome)}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Attached Files</span>
            <span className="font-semibold text-blue-600 mt-0.5 block">
              {application.documents?.length || application.documentsCount || 3} verified specimens
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
