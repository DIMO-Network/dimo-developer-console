// Off until the template backend (definitions worker writes, entitlement) is
// ready for production. Set NEXT_PUBLIC_TEMPLATE_EDITOR_ENABLED=true in an
// environment to turn the template editor on there; it is read at build time.
export const TEMPLATE_EDITOR_ENABLED =
  process.env.NEXT_PUBLIC_TEMPLATE_EDITOR_ENABLED === 'true';
