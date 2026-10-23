import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './components/Toast';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

// Auth Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

// Applicant Pages
import ApplicationForm from './pages/applicant/ApplicationForm';
import DocumentUpload from './pages/applicant/DocumentUpload';
import StatusTracking from './pages/applicant/StatusTracking';
import Resubmission from './pages/applicant/Resubmission';

// KYC Officer Pages
import ReviewQueue from './pages/officer/ReviewQueue';
import ReviewWorkbench from './pages/officer/ReviewWorkbench';

// Compliance Checker Pages
import CheckerQueue from './pages/compliance/CheckerQueue';
import Dashboard from './pages/compliance/Dashboard';
import AuditTrail from './pages/compliance/AuditTrail';

import { ROLES } from './constants/roles';

export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Authentication */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* App Shell Protected Routes */}
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/officer/queue" replace />} />

            {/* Applicant Flow */}
            <Route
              path="applicant/apply"
              element={
                <ProtectedRoute allowedRoles={[ROLES.APPLICANT, ROLES.OFFICER, ROLES.CHECKER]}>
                  <ApplicationForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="applicant/upload"
              element={
                <ProtectedRoute allowedRoles={[ROLES.APPLICANT, ROLES.OFFICER, ROLES.CHECKER]}>
                  <DocumentUpload />
                </ProtectedRoute>
              }
            />
            <Route
              path="applicant/status"
              element={
                <ProtectedRoute allowedRoles={[ROLES.APPLICANT, ROLES.OFFICER, ROLES.CHECKER]}>
                  <StatusTracking />
                </ProtectedRoute>
              }
            />
            <Route
              path="applicant/status/:id"
              element={
                <ProtectedRoute allowedRoles={[ROLES.APPLICANT, ROLES.OFFICER, ROLES.CHECKER]}>
                  <StatusTracking />
                </ProtectedRoute>
              }
            />
            <Route
              path="applicant/resubmission"
              element={
                <ProtectedRoute allowedRoles={[ROLES.APPLICANT, ROLES.OFFICER, ROLES.CHECKER]}>
                  <Resubmission />
                </ProtectedRoute>
              }
            />
            <Route
              path="applicant/resubmission/:id"
              element={
                <ProtectedRoute allowedRoles={[ROLES.APPLICANT, ROLES.OFFICER, ROLES.CHECKER]}>
                  <Resubmission />
                </ProtectedRoute>
              }
            />

            {/* KYC Officer (Maker) Flow */}
            <Route
              path="officer/queue"
              element={
                <ProtectedRoute allowedRoles={[ROLES.OFFICER, ROLES.CHECKER]}>
                  <ReviewQueue />
                </ProtectedRoute>
              }
            />
            <Route
              path="officer/review/:id"
              element={
                <ProtectedRoute allowedRoles={[ROLES.OFFICER, ROLES.CHECKER]}>
                  <ReviewWorkbench />
                </ProtectedRoute>
              }
            />

            {/* Compliance Officer (Checker) Flow */}
            <Route
              path="compliance/dashboard"
              element={
                <ProtectedRoute allowedRoles={[ROLES.CHECKER, ROLES.OFFICER]}>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="compliance/checker"
              element={
                <ProtectedRoute allowedRoles={[ROLES.CHECKER, ROLES.OFFICER]}>
                  <CheckerQueue />
                </ProtectedRoute>
              }
            />
            <Route
              path="compliance/rules"
              element={
                <ProtectedRoute allowedRoles={[ROLES.CHECKER]}>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="compliance/audit"
              element={
                <ProtectedRoute allowedRoles={[ROLES.CHECKER, ROLES.OFFICER]}>
                  <AuditTrail />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* Catch all redirect */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}
