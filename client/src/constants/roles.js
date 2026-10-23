export const ROLES = {
  APPLICANT: 'APPLICANT',
  OFFICER: 'OFFICER',      // Maker
  CHECKER: 'CHECKER',      // Compliance Officer
};

export const ROLE_LABELS = {
  [ROLES.APPLICANT]: 'Applicant',
  [ROLES.OFFICER]: 'KYC Officer (Maker)',
  [ROLES.CHECKER]: 'Compliance Officer (Checker)',
};

export const DEMO_USERS = {
  APPLICANT: {
    id: 'USR_APP_01',
    name: 'Ravi Kumar Sharma',
    email: 'ravi.sharma@example.com',
    role: ROLES.APPLICANT,
    applicationId: 'A2000004',
  },
  OFFICER: {
    id: 'USR_OFFICER_U1',
    name: 'Ananya Verma (Officer U1)',
    email: 'ananya.verma@deccandigital.internal',
    role: ROLES.OFFICER,
  },
  OFFICER_2: {
    id: 'USR_OFFICER_U2',
    name: 'Vikram Seth (Officer U2)',
    email: 'vikram.seth@deccandigital.internal',
    role: ROLES.OFFICER,
  },
  CHECKER: {
    id: 'USR_CHECKER_C1',
    name: 'Suresh Patel (Checker C1)',
    email: 'suresh.patel@deccandigital.internal',
    role: ROLES.CHECKER,
  },
};
