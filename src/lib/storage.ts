const KEY = 'stato-api-key';
export const loadApiKey = () => localStorage.getItem(KEY) ?? '';
export const saveApiKey = (k: string) => localStorage.setItem(KEY, k);
