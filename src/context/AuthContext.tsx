import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserAccount, UserRole, CompanySettings } from '../types';
import { AuthService } from '../services/authService';
import { CompanyService } from '../services/companyService';

interface AuthContextType {
  user: UserAccount | null;
  role: UserRole | null;
  settings: CompanySettings | null;
  loading: boolean;
  isSetupComplete: boolean;
  refreshState: () => Promise<void>;
  login: (email: string, pass: string) => Promise<UserAccount>;
  logout: () => Promise<void>;
  switchRoleForTesting: (role: UserRole) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as any);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserAccount | null>(null);
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSetupComplete, setIsSetupComplete] = useState<boolean>(false);

  const refreshState = async () => {
    try {
      const currentSettings = await CompanyService.getSettings();
      setSettings(currentSettings);
      const setupDone = Boolean(currentSettings && currentSettings.setupComplete);
      setIsSetupComplete(setupDone);

      const currentUser = AuthService.getCurrentUser();
      setUser(currentUser);
    } catch (e) {
      console.warn('Auth refresh error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshState();
  }, []);

  const login = async (email: string, pass: string) => {
    const loggedUser = await AuthService.login(email, pass);
    setUser(loggedUser);
    await refreshState();
    return loggedUser;
  };

  const logout = async () => {
    await AuthService.logout();
    setUser(null);
    await refreshState();
  };

  const switchRoleForTesting = async (targetRole: UserRole) => {
    const users = await AuthService.getUsers();
    let target = users.find((u) => u.role === targetRole && u.active);
    if (!target) {
      // Create a test user for that role if not existing
      const uid = `demo_${targetRole}`;
      target = {
        uid,
        email: `${targetRole}@example.com`,
        role: targetRole,
        displayName: `${targetRole.toUpperCase()} User`,
        active: true,
        createdAt: new Date().toISOString(),
      };
    }
    localStorage.setItem('hcm_current_user', JSON.stringify(target));
    setUser(target);
    await refreshState();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user ? user.role : null,
        settings,
        loading,
        isSetupComplete,
        refreshState,
        login,
        logout,
        switchRoleForTesting,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
