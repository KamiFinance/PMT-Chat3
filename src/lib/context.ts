import { createContext, useContext } from 'react';
import type { Wallet, Profile } from '../types';

interface AppContextValue {
  wallet: Wallet | null;
  profile: Profile;
  isDemo: boolean;
  darkMode: boolean;
  toggleTheme: () => void;
}

export const AppContext = createContext<AppContextValue>({
  wallet: null,
  profile: { name: '', bio: '', avatarUrl: null, address: null },
  isDemo: false,
  darkMode: true,
  toggleTheme: () => {},
});

export function useApp() {
  return useContext(AppContext);
}
