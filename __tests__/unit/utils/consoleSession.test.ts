import { clearConsoleBrowserState, startConsoleSession } from '@/utils/consoleSession';

const store = () => {
  localStorage.setItem('devJwt_0xaaa_list_v1', '[]');
  localStorage.setItem('devJwt_0xaaa_0x9f1e_list_v1', '[]');
  localStorage.setItem('theme', '"dark"');
  document.cookie = 'active_team=team-acme; Path=/';
};

describe('clearConsoleBrowserState', () => {
  beforeEach(() => localStorage.clear());

  it('removes every stored developer JWT and the active team, nothing else', () => {
    store();
    clearConsoleBrowserState();
    expect(localStorage.getItem('devJwt_0xaaa_list_v1')).toBeNull();
    expect(localStorage.getItem('devJwt_0xaaa_0x9f1e_list_v1')).toBeNull();
    expect(localStorage.getItem('theme')).toBe('"dark"');
    expect(document.cookie).not.toContain('active_team=team-acme');
  });
});

describe('startConsoleSession', () => {
  beforeEach(() => localStorage.clear());

  it('keeps developer JWTs and the active team when the same account signs in again', () => {
    startConsoleSession('sub-jane');
    store();
    startConsoleSession('sub-jane');
    expect(localStorage.getItem('devJwt_0xaaa_list_v1')).toBe('[]');
    expect(document.cookie).toContain('active_team=team-acme');
  });

  it('starts clean for another account', () => {
    startConsoleSession('sub-jane');
    store();
    startConsoleSession('sub-sam');
    expect(localStorage.getItem('devJwt_0xaaa_list_v1')).toBeNull();
    expect(document.cookie).not.toContain('active_team=team-acme');
  });

  it('starts clean when no account was recorded', () => {
    store();
    startConsoleSession('sub-jane');
    expect(localStorage.getItem('devJwt_0xaaa_0x9f1e_list_v1')).toBeNull();
  });

  it('forgets the account on an explicit sign-out', () => {
    startConsoleSession('sub-jane');
    clearConsoleBrowserState();
    store();
    startConsoleSession('sub-jane');
    expect(localStorage.getItem('devJwt_0xaaa_list_v1')).toBeNull();
  });
});
