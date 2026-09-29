/**
 * Runs in jsdom (the project default) on purpose: importing the server-only
 * module where `window` exists must fail. This is gate 1's guarantee, and a
 * convention would not be testable.
 */
describe('services/definitions in a browser', () => {
  it('refuses to load', async () => {
    const { fetchTemplate } = await import('@/services/definitions');
    await expect(fetchTemplate('toyota_camry_2020')).rejects.toThrow(/server-only/);
  });
});
