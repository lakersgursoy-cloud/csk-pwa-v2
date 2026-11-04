import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { createApp } from '../index.js';

let server, base;
before(async () => {
  server = createApp();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => { server.closeAllConnections(); server.close(); });
const get = async path => { const r = await fetch(base + path); return { status: r.status, headers: r.headers, body: await r.json() }; };

test('health and public endpoints answer with CORS', async () => {
  const h = await get('/health');
  assert.equal(h.status, 200);
  assert.equal(h.body.ok, true);
  assert.equal(h.headers.get('access-control-allow-origin'), '*');
  assert.equal((await get('/api/club')).body.club.registeredDate, '2023-02-27');
  assert.equal((await get('/api/programs')).body.programs.length, 8);
  const l = await get('/api/locations');
  assert.equal(l.body.hasOwnPool, false);
  assert.equal(l.body.locations.length, 3);
  assert.ok(l.body.locations.every(x => x.ownedByClub === false));
});

test('published data has no fee, phone, federation code or removed venue', async () => {
  const all = JSON.stringify([(await get('/api/club')).body, (await get('/api/programs')).body, (await get('/api/locations')).body]);
  assert.doesNotMatch(all, /0530|\+90|\bTL\b|₺|\b9[.,]?000\b|\b14[.,]?000\b|Ümitköy|Sportif|2022|lakersgursoy/);
  assert.doesNotMatch(all, /kulüp kodu|federationCode":\s*"?\d/);
  assert.match(JSON.stringify((await get('/api/locations')).body), /Yenimahalle/);
});

test('unknown paths and writes are refused', async () => {
  assert.equal((await get('/api/members')).status, 404);
  assert.equal((await fetch(base + '/api/club', { method: 'POST' })).status, 405);
  assert.equal((await fetch(base + '/mcp')).status, 405);
  const bad = await fetch(base + '/mcp', { method: 'POST', body: '{', headers: { 'Content-Type': 'application/json' } });
  assert.equal(bad.status, 400);
});

test('a real MCP client lists and calls the read-only tools', async () => {
  const client = new Client({ name: 'csk-test', version: '1.0.0' });
  await client.connect(new StreamableHTTPClientTransport(new URL(base + '/mcp')));
  const { tools } = await client.listTools();
  assert.deepEqual(tools.map(t => t.name).sort(), ['get_club_profile', 'get_published_schedule', 'list_locations', 'list_programs', 'list_projects']);
  assert.ok(tools.every(t => t.annotations.readOnlyHint === true));
  const out = await client.callTool({ name: 'list_locations', arguments: {} });
  assert.equal(JSON.parse(out.content[0].text).length, 3);
  await client.close();
});
