// A full page load, so server actions, Apollo and React Query all start over
// reading the new active_team cookie. Wrapped so tests can assert it.
export const hardNavigate = (path: string) => window.location.assign(path);
