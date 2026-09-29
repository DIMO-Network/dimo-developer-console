import { identityData } from './fixtures.mjs';

const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' };

// Fulfils identity-api GraphQL requests from the browser. opts go to identityData.
export async function identityHandler(route, opts) {
  const request = route.request();
  if (request.method() === 'OPTIONS')
    return route.fulfill({ status: 204, headers: CORS });
  const body = request.postDataJSON();
  const ops = Array.isArray(body) ? body : [body];
  const results = ops.map((op) => ({ data: identityData(op?.variables ?? {}, opts) }));
  return route.fulfill({
    status: 200,
    headers: CORS,
    json: Array.isArray(body) ? results : results[0],
  });
}
