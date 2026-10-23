import { mockDb, delay } from './client';
import { DEMO_USERS, ROLES } from '../constants/roles';

export const authApi = {
  /**
   * Logs in a user. Supports applicant or officer journeys with automatic role assignment.
   */
  async login({ email, password, journey, role }) {
    await delay(300);

    let user = null;
    if (role && DEMO_USERS[role]) {
      user = DEMO_USERS[role];
    } else if (
      journey === 'OFFICER' ||
      email?.toLowerCase().includes('officer') ||
      email?.toLowerCase().includes('deccan') ||
      email?.toLowerCase().includes('checker') ||
      email?.toLowerCase().includes('internal')
    ) {
      // Backend automatically authenticates bank staff and assigns the appropriate staff profile
      if (email?.toLowerCase().includes('checker') || email?.toLowerCase().includes('suresh')) {
        user = DEMO_USERS.CHECKER;
      } else {
        user = DEMO_USERS.OFFICER;
      }
    } else {
      // Customer applicant journey
      const formattedName = email
        ? email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
        : 'Ravi Kumar Sharma';

      user = {
        id: 'USR_APP_01',
        name: formattedName || 'Ravi Kumar Sharma',
        email: email || 'ravi.sharma@example.com',
        role: ROLES.APPLICANT,
        applicationId: 'A2000004',
      };
    }

    mockDb.setCurrentUser(user);
    localStorage.setItem('onboardiq_auth_token', `mock_jwt_token_${user.id}`);
    return { success: true, data: user };
  },

  /**
   * Mock registration
   */
  async register({ fullName, email, mobile, password, consentKYC }) {
    await delay(400);

    if (!consentKYC) {
      throw new Error('Mandatory consent for KYC verification is required.');
    }

    const newUser = {
      id: `USR_APP_${Date.now().toString().slice(-4)}`,
      name: fullName,
      email,
      mobile,
      role: ROLES.APPLICANT,
      applicationId: null, // Will be set after form submission
    };

    mockDb.setCurrentUser(newUser);
    localStorage.setItem('onboardiq_auth_token', `mock_jwt_token_${newUser.id}`);

    // Audit log
    mockDb.addAudit({
      actor: fullName,
      role: ROLES.APPLICANT,
      action: 'USER_REGISTERED',
      details: `Applicant account created with email ${email}. Mandatory KYC consent accepted.`,
    });

    return { success: true, data: newUser };
  },

  /**
   * Gets current logged-in demo user
   */
  async getCurrentUser() {
    await delay(100);
    const user = mockDb.getCurrentUser();
    return { success: true, data: user };
  },

  /**
   * Demo role switcher
   */
  async switchRole(roleKey) {
    await delay(150);
    const user = DEMO_USERS[roleKey] || DEMO_USERS.OFFICER;
    mockDb.setCurrentUser(user);
    return { success: true, data: user };
  },

  /**
   * Logout
   */
  async logout() {
    await delay(100);
    localStorage.removeItem('onboardiq_auth_token');
    mockDb.setCurrentUser(null);
    return { success: true };
  },
};
