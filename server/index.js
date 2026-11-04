// Public, read-only API for club facts. No database, no secrets, no member data.
import http from 'node:http';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { realpathSync } from 'node:fs';
import { handleMcp } from './mcp.js';

export const data = JSON.parse(readFileSync(new URL('./data.json', import.meta.url), 'utf8'));
const MAX_BODY = 64 * 1024;
const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept, Mcp-Protocol-Version',
  'X-Content-Type-Options': 'nosniff'
};
const ROUTES = {
  '/health': () => ({ ok: true, service: 'csk-public-api', reviewed: data.reviewed }),
  '/api/club': () => ({ schema: data.schema, reviewed: data.reviewed, club: data.club, links: data.links, projects: data.projects, notPublished: data.notPublished }),
  '/api/programs': () => ({ reviewed: data.reviewed, programs: data.programs, publishedSchedule: data.publishedSchedule }),
  '/api/locations': () => ({ reviewed: data.reviewed, hasOwnPool: data.club.hasOwnPool, locations: data.facilities })
};

function send(res, status, body) {
  res.writeHead(status, { ...HEADERS, 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', chunk => {
      size += chunk.length;
      if (size > MAX_BODY) { reject(Object.assign(new Error('too large'), { status: 413 })); req.destroy(); return; }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
      catch { reject(Object.assign(new Error('invalid json'), { status: 400 })); }
    });
    req.on('error', reject);
  });
}

export function createApp() {
  return http.createServer(async (req, res) => {
    const path = new URL(req.url, 'http://localhost').pathname;
    if (req.method === 'OPTIONS') { res.writeHead(204, HEADERS); res.end(); return; }
    if (path === '/mcp') {
      if (req.method !== 'POST') { send(res, 405, { error: 'method_not_allowed' }); return; }
      Object.entries(HEADERS).forEach(([k, v]) => res.setHeader(k, v));
      try { await handleMcp(req, res, await readJson(req), data); }
      catch (error) { if (!res.headersSent) send(res, error.status || 500, { error: error.status ? error.message : 'server_error' }); }
      return;
    }
    const route = ROUTES[path];
    if (!route) { send(res, 404, { error: 'not_found' }); return; }
    if (req.method !== 'GET') { send(res, 405, { error: 'method_not_allowed' }); return; }
    res.setHeader('Cache-Control', 'public, max-age=3600');
    send(res, 200, route());
  });
}

const invoked = process.argv[1] && pathToFileURL(realpathSync(process.argv[1])).href === import.meta.url;
if (invoked) {
  const port = Number(process.env.PORT) || 3000;
  createApp().listen(port, '0.0.0.0', () => console.log('csk-public-api listening on ' + port));
}
