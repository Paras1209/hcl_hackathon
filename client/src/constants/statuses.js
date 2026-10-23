export const APPLICATION_STATUS = {
  SUBMITTED: 'SUBMITTED',
  EXTRACTING: 'EXTRACTING',
  AUTO_APPROVED: 'AUTO_APPROVED',
  IN_REVIEW: 'IN_REVIEW',
  RESUBMISSION_REQUESTED: 'RESUBMISSION_REQUESTED',
  PENDING_CHECKER: 'PENDING_CHECKER',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  AUTO_REJECTED: 'AUTO_REJECTED',
  CLOSED_EXPIRED: 'CLOSED_EXPIRED',
};

export const STATUS_LABELS = {
  [APPLICATION_STATUS.SUBMITTED]: 'Application Submitted',
  [APPLICATION_STATUS.EXTRACTING]: 'Processing Documents',
  [APPLICATION_STATUS.AUTO_APPROVED]: 'Auto Approved',
  [APPLICATION_STATUS.IN_REVIEW]: 'In Review (KYC Maker)',
  [APPLICATION_STATUS.RESUBMISSION_REQUESTED]: 'Resubmission Requested',
  [APPLICATION_STATUS.PENDING_CHECKER]: 'Pending Checker',
  [APPLICATION_STATUS.APPROVED]: 'Approved',
  [APPLICATION_STATUS.REJECTED]: 'Rejected',
  [APPLICATION_STATUS.AUTO_REJECTED]: 'Auto Rejected',
  [APPLICATION_STATUS.CLOSED_EXPIRED]: 'Closed (Expired)',
};

export const STATUS_COLORS = {
  [APPLICATION_STATUS.SUBMITTED]: 'bg-blue-50 text-blue-700 border-blue-200',
  [APPLICATION_STATUS.EXTRACTING]: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  [APPLICATION_STATUS.AUTO_APPROVED]: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  [APPLICATION_STATUS.IN_REVIEW]: 'bg-amber-50 text-amber-700 border-amber-200',
  [APPLICATION_STATUS.RESUBMISSION_REQUESTED]: 'bg-orange-50 text-orange-700 border-orange-200',
  [APPLICATION_STATUS.PENDING_CHECKER]: 'bg-purple-50 text-purple-700 border-purple-200',
  [APPLICATION_STATUS.APPROVED]: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  [APPLICATION_STATUS.REJECTED]: 'bg-rose-50 text-rose-700 border-rose-200',
  [APPLICATION_STATUS.AUTO_REJECTED]: 'bg-rose-50 text-rose-700 border-rose-200',
  [APPLICATION_STATUS.CLOSED_EXPIRED]: 'bg-slate-100 text-slate-700 border-slate-300',
};

export const RISK_CATEGORY = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
};

export const RISK_COLORS = {
  [RISK_CATEGORY.LOW]: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  [RISK_CATEGORY.MEDIUM]: 'bg-amber-50 text-amber-700 border-amber-200',
  [RISK_CATEGORY.HIGH]: 'bg-rose-50 text-rose-700 border-rose-200',
};

export const DOCUMENT_TYPES = {
  PAN_CARD: 'PAN_CARD',
  AADHAAR_CARD: 'AADHAAR_CARD',
  ELECTRICITY_BILL: 'ELECTRICITY_BILL',
  BANK_STATEMENT: 'BANK_STATEMENT',
  DRIVING_LICENCE: 'DRIVING_LICENCE',
  OTHER: 'OTHER',
};

export const DOCUMENT_TYPE_LABELS = {
  [DOCUMENT_TYPES.PAN_CARD]: 'PAN Card',
  [DOCUMENT_TYPES.AADHAAR_CARD]: 'Aadhaar Card (Last 4 Digits)',
  [DOCUMENT_TYPES.ELECTRICITY_BILL]: 'Electricity Bill (Address Proof)',
  [DOCUMENT_TYPES.BANK_STATEMENT]: 'Bank Statement (Address Proof)',
  [DOCUMENT_TYPES.DRIVING_LICENCE]: 'Driving Licence (Address Proof)',
  [DOCUMENT_TYPES.OTHER]: 'Other Document',
};

export const OCCUPATIONS = [
  { code: 'SALARIED_PRIVATE', label: 'Salaried - Private Sector', riskLevel: 'LOW' },
  { code: 'SALARIED_PUBLIC', label: 'Salaried - Public / Govt Sector', riskLevel: 'LOW' },
  { code: 'SELF_EMPLOYED_PROFESSIONAL', label: 'Self Employed - Professional (Doctor, Lawyer, CA)', riskLevel: 'LOW' },
  { code: 'SELF_EMPLOYED_BUSINESS', label: 'Self Employed - General Business', riskLevel: 'MEDIUM' },
  { code: 'STUDENT', label: 'Student', riskLevel: 'LOW' },
  { code: 'RETIRED', label: 'Retired', riskLevel: 'LOW' },
  { code: 'HOMEMAKER', label: 'Homemaker', riskLevel: 'LOW' },
  { code: 'REAL_ESTATE_DEVELOPER', label: 'Real Estate Developer / Agent', riskLevel: 'MEDIUM' },
  { code: 'MONEY_LENDER_EXCHANGE', label: 'Money Service / Foreign Exchange Broker', riskLevel: 'HIGH' },
  { code: 'CASINO_GAMING', label: 'Casino / Gaming Operations', riskLevel: 'HIGH' },
  { code: 'ARMS_DEFENCE_CONTRACTOR', label: 'Arms / Defence Supplier', riskLevel: 'HIGH' },
  { code: 'JEWELLER_BULLION_DEALER', label: 'Jeweller / Bullion Dealer / Precious Stones', riskLevel: 'HIGH' },
];
