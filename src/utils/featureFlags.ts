// Off until the template backend (definitions worker writes, entitlement) is
// ready for production. Set NEXT_PUBLIC_TEMPLATE_EDITOR_ENABLED=true in an
// environment to turn the template editor on there; it is read at build time.
export const TEMPLATE_EDITOR_ENABLED =
  process.env.NEXT_PUBLIC_TEMPLATE_EDITOR_ENABLED === 'true';

// Off until part 1 enforces the signer check in an environment and the team
// live pass succeeds there (contracts Rollout 5). While off: no Grant, no Data
// access column, members don't get Vehicles; teams and the key registry stay.
export const TEAM_DATA_ACCESS_ENABLED =
  process.env.NEXT_PUBLIC_TEAM_DATA_ACCESS_ENABLED === 'true';
