// Mock of every backend the console calls server-side or via configurable hosts.
// Unhandled requests are logged so missing endpoints are easy to spot.
import http from 'node:http';
import { loadKeys } from './keys.mjs';
import * as fx from './fixtures.mjs';

const PORT = 3001;
const DCX_BALANCE = BigInt(process.env.HARNESS_DCX ?? '250') * 10n ** 18n;
const ENTRY_POINT = '0x0000000071727de22e5e9d8baf0edac6f37da032';
const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS',
};
const keys = await loadKeys();

const send = (res, status, body) => {
  res.writeHead(status, { 'content-type': 'application/json', ...CORS });
  res.end(JSON.stringify(body));
};
const readBody = (req) =>
  new Promise((resolve) => {
    let data = '';
    req.on('data', (c) => (data += c));
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : null);
      } catch {
        resolve(null);
      }
    });
  });

const pad32 = (hex) => hex.replace(/^0x/, '').toLowerCase().padStart(64, '0');
const rpc = ({ id, method, params }) => {
  const ok = (result) => ({ jsonrpc: '2.0', id, result });
  switch (method) {
    case 'eth_chainId':
      return ok('0x13882');
    case 'eth_blockNumber':
      return ok('0x1');
    case 'eth_getCode':
      return ok('0x');
    case 'eth_call': {
      const to = params?.[0]?.to?.toLowerCase();
      if (to === ENTRY_POINT) {
        // getSenderAddress always reverts with SenderAddressResult(address).
        return {
          jsonrpc: '2.0',
          id,
          error: {
            code: 3,
            message: 'execution reverted',
            data: '0x6ca7b806' + pad32(fx.KERNEL),
          },
        };
      }
      return ok('0x' + pad32(DCX_BALANCE.toString(16)));
    }
    default:
      console.log(`[mock] unhandled rpc ${method}`);
      return ok('0x');
  }
};

const routes = [
  ['GET', /^\/keys$/, () => ({ keys: [keys.publicJwk] })],
  ['GET', /^\/api\/me$/, () => fx.USER],
  ['GET', /^\/ga\/api\/account\/[^/]+$/, () => fx.SUB_ORG],
  [
    'GET',
    /^\/api\/my\/apps$/,
    () => ({ data: fx.APPS, totalItems: fx.APPS.length, totalPages: 1 }),
  ],
  ['GET', /^\/api\/my\/workspace$/, () => fx.WORKSPACE],
  ['GET', /^\/api\/my\/workspace\/by-token\/[^/]+$/, () => fx.WORKSPACE],
  ['GET', /^\/api\/my\/workspace\/[^/]+\/brands$/, () => fx.BRANDS],
  ['GET', /^\/api\/my\/configurations$/, () => fx.CONFIGURATIONS],
  [
    'GET',
    /^\/api\/my\/configurations\/([^/]+)$/,
    (m) => ({ configuration: fx.configurationDetail(m[1]) }),
  ],
  ['GET', /^\/api\/my\/connections$/, () => ({ data: fx.CONNECTIONS })],
  [
    'GET',
    /^\/api\/my\/connections\/([^/]+)$/,
    (m) => fx.CONNECTIONS.find((c) => c.id === m[1]) ?? null,
  ],
  ['GET', /^\/api\/my\/simulated-vehicles$/, () => ({ data: fx.SIMULATED_VEHICLES })],
  [
    'GET',
    /^\/api\/my\/team\/collaborator$/,
    () => ({
      data: fx.COLLABORATORS,
      totalItems: fx.COLLABORATORS.length,
      totalPages: 1,
    }),
  ],
  ['GET', /^\/api\/crypto\/[^/]+$/, () => fx.CRYPTO_PRICE],
  [
    'GET',
    /^\/credits\/v1\/credits\/([^/]+)\/usage$/,
    (m, url) => fx.creditUsage(m[1], url),
  ],
  ['POST', /^\/turnkey\/public\/v1\/query\/list_wallets$/, () => fx.TK_WALLETS],
  [
    'POST',
    /^\/turnkey\/public\/v1\/query\/get_wallet_account$/,
    () => fx.TK_WALLET_ACCOUNT,
  ],
  ['POST', /^\/turnkey\/public\/v1\/query\/list_private_keys$/, () => fx.TK_PRIVATE_KEYS],
  ['GET', /^\/events\/(?:v1\/)?webhooks$/, () => fx.WEBHOOKS],
  ['GET', /^\/events\/(?:v1\/)?webhooks\/[^/]+$/, () => fx.WEBHOOK_ASSETS],
];

http
  .createServer(async (req, res) => {
    if (req.method === 'OPTIONS') {
      res.writeHead(204, CORS);
      return res.end();
    }
    const url = new URL(req.url, `http://localhost:${PORT}`);
    if (/^\/(rpc|bundler|paymaster)/.test(url.pathname)) {
      const body = await readBody(req);
      return send(res, 200, Array.isArray(body) ? body.map(rpc) : rpc(body ?? {}));
    }
    for (const [method, re, handler] of routes) {
      const m = url.pathname.match(re);
      if (m && req.method === method) return send(res, 200, handler(m, url));
    }
    console.log(`[mock] unhandled ${req.method} ${url.pathname}${url.search}`);
    send(res, 404, { message: 'not mocked' });
  })
  .listen(PORT, () => console.log(`[mock] listening on http://localhost:${PORT}`));
