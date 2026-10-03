import {
  getFromLocalStorage,
  saveToLocalStorage,
  removeFromLocalStorage,
} from '@/utils/localStorage';
import { jwtDecode } from 'jwt-decode';

// Members keep developer JWTs per wallet, and use only those their own wallet
// signed (signer_address). Owners keep the per-license list. TeamProvider sets
// the signer while a member team is active.
let memberSigner: string | null = null;
export const setMemberDevJwtSigner = (signer: string | null) => {
  memberSigner = signer ? signer.toLowerCase() : null;
};

const getKey = (clientId: string) =>
  memberSigner
    ? `devJwt_${clientId}_${memberSigner}_list_v1`
    : `devJwt_${clientId}_list_v1`;

export interface StoredJwt {
  token: string;
  createdAt: number;
}

export const saveDevJwt = (clientId: string, token: string) => {
  const key = getKey(clientId);
  const existingTokens = getFromLocalStorage<StoredJwt[]>(key) || [];
  const newToken: StoredJwt = { token, createdAt: Date.now() };
  return saveToLocalStorage(key, [...existingTokens, newToken]);
};

const getValidTokens = (clientId: string): StoredJwt[] => {
  const tokens = getFromLocalStorage<StoredJwt[]>(getKey(clientId)) || [];
  const now = Date.now();
  return tokens
    .filter((storedJwt) => {
      try {
        const decoded = jwtDecode<{ exp?: number; signer_address?: string }>(
          storedJwt.token,
        );
        const exp = decoded.exp ? decoded.exp * 1000 : null;
        if (exp && now > exp) return false;
        return memberSigner
          ? decoded.signer_address?.toLowerCase() === memberSigner
          : true;
      } catch {
        return false;
      }
    })
    .sort((a, b) => b.createdAt - a.createdAt);
};

export const getDevJwt = (clientId: string) => {
  if (typeof window === 'undefined') {
    return null;
  }
  const validTokens = getValidTokens(clientId);
  return validTokens.length ? validTokens[0].token : null;
};

export const getAllDevJwts = (clientId: string) => {
  return getValidTokens(clientId);
};

export const removeDevJwt = (clientId: string, tokenToRemove: string) => {
  const key = getKey(clientId);
  const tokens = getFromLocalStorage<StoredJwt[]>(key);
  if (!tokens) return;

  const remainingTokens = tokens.filter(({ token }) => token !== tokenToRemove);

  if (remainingTokens.length === 0) {
    removeFromLocalStorage(key);
  } else {
    saveToLocalStorage(key, remainingTokens);
  }
};

// Sign-out (contracts C4): every developer JWT this browser holds, owner keys
// and member keys alike.
export const clearAllDevJwts = () => {
  if (typeof window === 'undefined') return;
  Object.keys(localStorage)
    .filter((key) => key.startsWith('devJwt_'))
    .forEach((key) => localStorage.removeItem(key));
};
