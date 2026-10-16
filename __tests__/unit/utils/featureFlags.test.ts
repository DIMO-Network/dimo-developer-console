const load = async (value: string | undefined): Promise<boolean> => {
  const previous = process.env.NEXT_PUBLIC_TEAM_DATA_ACCESS_ENABLED;
  if (value === undefined) delete process.env.NEXT_PUBLIC_TEAM_DATA_ACCESS_ENABLED;
  else process.env.NEXT_PUBLIC_TEAM_DATA_ACCESS_ENABLED = value;
  let flag = false;
  await jest.isolateModulesAsync(async () => {
    flag = (await import('@/utils/featureFlags')).TEAM_DATA_ACCESS_ENABLED;
  });
  if (previous === undefined) delete process.env.NEXT_PUBLIC_TEAM_DATA_ACCESS_ENABLED;
  else process.env.NEXT_PUBLIC_TEAM_DATA_ACCESS_ENABLED = previous;
  return flag;
};

describe('TEAM_DATA_ACCESS_ENABLED', () => {
  it('is on only for the exact string "true"', async () => {
    expect(await load('true')).toBe(true);
    expect(await load('TRUE')).toBe(false);
    expect(await load('1')).toBe(false);
    expect(await load(undefined)).toBe(false);
  });
});
