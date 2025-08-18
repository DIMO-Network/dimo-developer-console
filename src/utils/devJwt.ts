import {
  getFromLocalStorage,
  saveToLocalStorage,
  removeFromLocalStorage,
} from '@/utils/localStorage';
import { jwtDecode } from 'jwt-decode';

const getKey = (clientId: string) => `devJwt_${clientId}_list_v1`;

export interface StoredJwt {
  token: string;
  createdAt: number;
}

export const saveDevJwt = (clientId: string, token: string) => {
  const key = getKey(clientId);
  const existingTokens = getFromLocalStorage<StoredJwt[]>(key) || [];

  // Add new token with creation timestamp
  const newToken: StoredJwt = {
    token,
    createdAt: Date.now(),
  };

  return saveToLocalStorage(key, [...existingTokens, newToken]);
};

const getValidTokens = (clientId: string): StoredJwt[] => {
  const key = getKey(clientId);
  const tokens = getFromLocalStorage<StoredJwt[]>(key) || [];

  console.log(`🔍 JWT VALIDATION CHECK for ${clientId}`);
  console.log('Raw tokens from localStorage:', tokens.length);

  const now = Date.now();
  const validTokens = tokens.filter((storedJwt, index) => {
    try {
      const decoded = jwtDecode(storedJwt.token);
      const exp = decoded.exp ? decoded.exp * 1000 : null;
      const isExpired = exp ? now > exp : false;

      console.log(
        `Token ${index}: Created ${new Date(storedJwt.createdAt).toISOString()}, Expires: ${exp ? new Date(exp).toISOString() : 'Never'}, Expired: ${isExpired}`,
      );

      if (isExpired) {
        console.log(`❌ Token ${index} is EXPIRED`);
        return false;
      }
      console.log(`✅ Token ${index} is VALID`);
      return true;
    } catch (error) {
      console.error(`❌ Token ${index} is MALFORMED:`, error);
      return false;
    }
  });

  console.log(`Valid tokens after filtering: ${validTokens.length}/${tokens.length}`);

  return validTokens.sort((a, b) => b.createdAt - a.createdAt);
};

export const getDevJwt = (clientId: string) => {
  console.log('==========================================');
  console.log('🔒 COMPREHENSIVE JWT RETRIEVAL DEBUG');
  console.log('==========================================');
  console.log('Environment:', typeof window !== 'undefined' ? 'Browser' : 'Server');
  console.log(
    'Domain:',
    typeof window !== 'undefined' ? window.location.hostname : 'N/A',
  );
  console.log(
    'User Agent:',
    typeof window !== 'undefined' ? navigator.userAgent.substring(0, 50) + '...' : 'N/A',
  );
  console.log('Client ID:', clientId);
  console.log('localStorage key:', `devJwt_${clientId}_list_v1`);

  // Check if localStorage is available
  console.log(
    'localStorage available:',
    typeof window !== 'undefined' && window.localStorage !== undefined,
  );

  if (typeof window === 'undefined') {
    console.log('❌ SSR detected - no localStorage access');
    console.log('--- End localStorage JWT Check ---');
    return null;
  }

  const validTokens = getValidTokens(clientId);
  const token = validTokens.length ? validTokens[0].token : null;

  console.log('💻Local JWT Found:', !!token);
  if (token) {
    console.log('Local JWT Preview:', token.substring(0, 30) + '...');
    console.log('Local JWT Length:', token.length);
    try {
      const decoded = jwtDecode(token);
      console.log('JWT Claims Preview:', {
        iss: decoded.iss,
        sub: decoded.sub,
        aud: decoded.aud,
        exp: decoded.exp ? new Date(decoded.exp * 1000).toISOString() : null,
        iat: decoded.iat ? new Date(decoded.iat * 1000).toISOString() : null,
      });
    } catch (error) {
      console.error('❌ Failed to decode JWT:', error);
    }
  } else {
    console.log('❌ NO VALID JWT FOUND');
    // Diagnostic info when no token found
    try {
      const rawData = localStorage.getItem(`devJwt_${clientId}_list_v1`);
      console.log('Raw localStorage data:', rawData ? 'Exists' : 'Null/Empty');
      if (rawData) {
        console.log('Raw data length:', rawData.length);
        console.log('Raw data preview:', rawData.substring(0, 100) + '...');
      }
    } catch (error) {
      console.error('❌ localStorage access error:', error);
    }
  }
  console.log('==========================================');
  console.log('--- End localStorage JWT Check ---');

  return token;
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
