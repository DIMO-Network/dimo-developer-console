import { clearConsoleBrowserState } from '@/utils/consoleSession';

describe('clearConsoleBrowserState', () => {
  it('removes every stored developer JWT and the active team, nothing else', () => {
    localStorage.setItem('devJwt_0xaaa_list_v1', '[]');
    localStorage.setItem('devJwt_0xaaa_0x9f1e_list_v1', '[]');
    localStorage.setItem('theme', '"dark"');
    document.cookie = 'active_team=team-acme; Path=/';
    clearConsoleBrowserState();
    expect(localStorage.getItem('devJwt_0xaaa_list_v1')).toBeNull();
    expect(localStorage.getItem('devJwt_0xaaa_0x9f1e_list_v1')).toBeNull();
    expect(localStorage.getItem('theme')).toBe('"dark"');
    expect(document.cookie).not.toContain('active_team=team-acme');
  });
});
