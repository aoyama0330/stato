const KEY = 'stato-api-key';
export const loadApiKey = () => localStorage.getItem(KEY) ?? '';
export const saveApiKey = (k: string) => localStorage.setItem(KEY, k);

const GMAIL_KEY = 'stato-gmail-client-id';
export const loadGmailClientId = () => localStorage.getItem(GMAIL_KEY) ?? '';
export const saveGmailClientId = (k: string) => localStorage.setItem(GMAIL_KEY, k);
