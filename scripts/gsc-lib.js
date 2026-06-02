'use strict';
// GSC API client — zero external deps (Node built-in https + crypto).
// Auth: service-account JWT -> OAuth2 access token -> Search Console API.
const https = require('https');
const crypto = require('crypto');
const fs = require('fs');

const KEY_PATH = process.env.GOOGLE_APPLICATION_CREDENTIALS ||
  process.env.GSC_KEY_PATH ||
  '/home/user/.secrets/theasset-gsc.json';

function b64url(buf) {
  return Buffer.from(buf).toString('base64')
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function loadKey() {
  // Allow passing the JSON via env (for CI secrets) or a file path.
  if (process.env.GSC_KEY_JSON) return JSON.parse(process.env.GSC_KEY_JSON);
  return JSON.parse(fs.readFileSync(KEY_PATH, 'utf8'));
}

function httpsRequest(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function getAccessToken(scope) {
  const key = loadKey();
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = b64url(JSON.stringify({
    iss: key.client_email,
    scope: scope || 'https://www.googleapis.com/auth/webmasters.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }));
  const signingInput = `${header}.${claim}`;
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(signingInput);
  const signature = b64url(signer.sign(key.private_key));
  const jwt = `${signingInput}.${signature}`;

  const params = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion: jwt,
  }).toString();

  const res = await httpsRequest({
    method: 'POST',
    hostname: 'oauth2.googleapis.com',
    path: '/token',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(params),
    },
  }, params);
  if (res.status !== 200) throw new Error(`token error ${res.status}: ${res.body}`);
  return JSON.parse(res.body).access_token;
}

async function api(token, method, path, payload) {
  const body = payload ? JSON.stringify(payload) : null;
  const res = await httpsRequest({
    method,
    hostname: 'searchconsole.googleapis.com',
    path,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(body ? { 'Content-Length': Buffer.byteLength(body) } : {}),
    },
  }, body);
  let parsed;
  try { parsed = JSON.parse(res.body); } catch { parsed = res.body; }
  if (res.status >= 400) throw new Error(`API ${res.status}: ${res.body}`);
  return parsed;
}

async function listSites(token) {
  return api(token, 'GET', '/webmasters/v3/sites');
}

async function searchAnalytics(token, siteUrl, query) {
  const path = `/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;
  return api(token, 'POST', path, query);
}

async function inspectUrl(token, siteUrl, inspectionUrl) {
  // URL Inspection API (indexing status)
  const body = JSON.stringify({ inspectionUrl, siteUrl });
  const res = await httpsRequest({
    method: 'POST',
    hostname: 'searchconsole.googleapis.com',
    path: '/v1/urlInspection/index:inspect',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
    },
  }, body);
  let parsed;
  try { parsed = JSON.parse(res.body); } catch { parsed = res.body; }
  if (res.status >= 400) throw new Error(`Inspect ${res.status}: ${res.body}`);
  return parsed;
}

module.exports = { getAccessToken, listSites, searchAnalytics, inspectUrl, api };
