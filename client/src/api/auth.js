import { apiClient, mockDb, delay } from './client';
import { DEMO_USERS, ROLES } from '../constants/roles';

export const authApi = {
  /**
   * Login with real backend
   */
  async login({ email, password }) {
    try {
      const response = await apiClient.post('/auth/login', { email, password });
      if (response.success) {
        const user = response.data;
        // Store token from backend
        if (response.token) {
          localStorage.setItem('onboardiq_auth_token', response.token);
        }
        mockDb.setCurrentUser(user);
        return response;
      }
    } catch (error) {
      // Fallback to mock for demo if backend unavailable
      console.warn('Backend login failed, falling back to mock', error);
      return await this.loginMock({ email, password });
    }
  },

  /**
   * Register with real backend
   */
  async register({ fullName, email, mobile, password, consentKYC }) {
    try {
      const response = await apiClient.post('/auth/register', {
        fullName,
        email,
        mobile,
        password,
        consentKYC,
      });
      if (response.success) {
        mockDb.setCurrentUser(response.data);
        if (response.token) {
          localStorage.setItem('onboardiq_auth_token', response.token);
        }
        return response;
      }
    } catch (error) {
      // Fallback to mock
      console.warn('Backend register failed, falling back to mock', error);
      return await this.registerMock({ fullName, email, mobile, password, consentKYC });
    }
  },

  /**
   * Get current user from backend
   */
  async getCurrentUser() {
    try {
      const response = await apiClient.get('/auth/me');
      if (response.success) {
        mockDb.setCurrentUser(response.data);
      }
      return response;
    } catch (error) {
      // Fallback to mock
      console.warn('Backend get user failed, using mock', error);
      await delay(100);
      const user = mockDb.getCurrentUser();
      return { success: true, data: user };
    }
  },

  /**
   * Logout from backend
   */
  async logout() {
    try {
      const response = await apiClient.post('/auth/logout');
      localStorage.removeItem('onboardiq_auth_token');
      mockDb.setCurrentUser(null);
      return response;
    } catch (error) {
      // Always cleanup local state
      localStorage.removeItem('onboardiq_auth_token');
      mockDb.setCurrentUser(null);
      return { success: true };
    }
  },

  /**
   * Switch demo role (for evaluation mode)
   */
  async switchRole(roleKey) {
    await delay(150);
    
    let user = null;
    if (roleKey === 'APPLICANT') {
      user = DEMO_USERS.APPLICANT;
    } else if (roleKey === 'OFFICER') {
      user = DEMO_USERS.OFFICER;
    } else if (roleKey === 'OFFICER_2') {
      user = DEMO_USERS.OFFICER_2;
    } else if (roleKey === 'CHECKER') {
      user = DEMO_USERS.CHECKER;
    } else {
      throw new Error(`Unknown role key: ${roleKey}`);
    }

    mockDb.setCurrentUser(user);
    localStorage.setItem('onboardiq_auth_token', `mock_jwt_token_${user.id}`);
    
    return { success: true, data: user };
  },

  // ===== FALLBACK MOCK METHODS =====
  async loginMock({ email, password, journey, role }) {
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
      if (email?.toLowerCase().includes('checker') || email?.toLowerCase().includes('suresh')) {
        user = DEMO_USERS.CHECKER;
      } else {
        user = DEMO_USERS.OFFICER;
      }
    } else {
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

  async registerMock({ fullName, email, mobile, password, consentKYC }) {
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
      applicationId: null,
    };

    mockDb.setCurrentUser(newUser);
    localStorage.setItem('onboardiq_auth_token', `mock_jwt_token_${newUser.id}`);

    mockDb.addAudit({
      actor: fullName,
      role: ROLES.APPLICANT,
      action: 'USER_REGISTERED',
      details: `Applicant account created with email ${email}. Mandatory KYC consent accepted.`,
    });

    return { success: true, data: newUser };
  },
};
