import { DATA_API, DATA_ERRORS } from './fixtures.mjs';

// Fulfils /api/data/telemetry and /api/data/fetch from the browser. The
// operation name in the posted query picks the fixture; a function fixture
// gets the variables. notShared: every call answers 403 like the proxy does.
// dataErrors: operation names answered with their DATA_ERRORS body (HTTP 200,
// data: null, errors), the way gqlgen refuses a privilege.
export async function dataApiHandler(route, { notShared = false, dataErrors = [] } = {}) {
  if (notShared) {
    return route.fulfill({
      status: 403,
      json: { error: 'This asset is not shared with the license', code: 'NOT_SHARED' },
    });
  }
  const { query = '', variables = {} } = route.request().postDataJSON() ?? {};
  const name = /^\s*query\s+(\w+)/.exec(query)?.[1];
  if (dataErrors.includes(name)) {
    return route.fulfill({
      status: 200,
      json: DATA_ERRORS[name] ?? {
        data: null,
        errors: [{ message: `harness: ${name} refused` }],
      },
    });
  }
  const fx = DATA_API[name];
  if (!fx)
    return route.fulfill({
      status: 200,
      json: { errors: [{ message: `harness: no fixture for ${name}` }] },
    });
  return route.fulfill({
    status: 200,
    json: { data: typeof fx === 'function' ? fx(variables) : fx },
  });
}
