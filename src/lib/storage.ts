const KEY = 'stato-api-key';
export const loadApiKey = () => localStorage.getItem(KEY) ?? '';
export const saveApiKey = (k: string) => localStorage.setItem(KEY, k);

const GMAIL_KEY = 'stato-gmail-client-id';
export const loadGmailClientId = () => localStorage.getItem(GMAIL_KEY) ?? '';
export const saveGmailClientId = (k: string) => localStorage.setItem(GMAIL_KEY, k);

export interface UserProfile { name: string; company: string; role: string; }
const PROFILE_KEY = 'stato-user-profile';
export const loadUserProfile = (): UserProfile => {
  try { return JSON.parse(localStorage.getItem(PROFILE_KEY) ?? '{}'); } catch { return { name: '', company: '', role: '' }; }
};
export const saveUserProfile = (p: UserProfile) => localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
