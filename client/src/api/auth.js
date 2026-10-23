import { mockDb, delay } from './client';
import { DEMO_USERS, ROLES } from '../constants/roles';

export const authApi = {
  /**
   * Logs in a user. Supports demo role presets or standard credentials.
   */
  async login({ email, password, role }) {
    await delay(300);

    // If role requested or recognized demo email
    let user = null;
    if (role && DEMO_USERS[role]) {
      user = DEMO_USERS[role];
    } else if (email?.includes('checker')) {
      user = DEMO_USERS.CHECKER;
    } else if (email?.includes('officer') || email?.includes('maker')) {
      user = DEMO_USERS.OFFICER;
    } else {
      user = {
        id: `USR_${Date.now()}`,
        name: email.split('@')[0].replace('.', ' '),
        email,
        role: role || ROLES.APPLICANT,
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
