import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import http from 'node:http';
import https from 'node:https';
import { parseRecipeJsonLd, type RecipeDraft } from './parse.js';

const MAX_BYTES = 1_000_000;
const MAX_REDIRECTS = 3;
const TIMEOUT_MS = 8_000;
export interface ResolvedAddress { address: string; family: number; }

export async function fetchRecipeDraft(input: string): Promise<RecipeDraft> {
  let url = input;
  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects++) {
    const addresses = await publicAddresses(url);
    const response = await requestPage(url, addresses);
    if (response.status >= 300 && response.status < 400 && response.location) {
      if (redirects === MAX_REDIRECTS) throw new Error('Too many redirects');
      url = new URL(response.location, url).toString();
      continue;
    }
    if (response.status < 200 || response.status >= 300) throw new Error('Recipe page could not be read');
    const draft = parseRecipeJsonLd(response.body, url);
    if (!draft) throw new Error('No supported Recipe JSON-LD found; paste the recipe text instead');
    return draft;
  }
  throw new Error('Too many redirects');
}

export async function publicAddresses(input: string, resolveHost = boundedLookup): Promise<ResolvedAddress[]> {
  let url: URL;
  try { url = new URL(input); } catch { throw new Error('Enter a valid recipe URL'); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('Only public HTTP(S) URLs are supported');
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '').replace(/\.$/, '');
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal') || host.endsWith('.test')) throw new Error('Private network URLs are blocked');
  const ipVersion = isIP(host);
  const addresses = ipVersion ? [{ address: host, family: ipVersion }] : await resolveHost(host);
  if (!addresses.length || addresses.some(address => !isPublicIp(address.address))) throw new Error('Private network URLs are blocked');
  return addresses;
}

async function boundedLookup(host: string): Promise<ResolvedAddress[]> {
  let timer: ReturnType<typeof setTimeout>;
  try {
    return await Promise.race([
      lookup(host, { all: true, verbatim: true }),
      new Promise<ResolvedAddress[]>((_, reject) => { timer = setTimeout(() => reject(new Error('Recipe host lookup timed out')), 4_000); }),
    ]);
  } finally { clearTimeout(timer!); }
}

function isPublicIp(address: string): boolean {
  const version = isIP(address);
  if (version === 4) {
    const [a, b] = address.split('.').map(Number);
    return !(a === 0 || a === 10 || a === 127 || a >= 224 || a === 169 && b === 254 || a === 172 && b >= 16 && b <= 31 ||
      a === 192 && (b === 0 || b === 168) || a === 198 && (b === 18 || b === 19 || b === 51) || a === 203 && b === 0 && address.split('.')[2] === '113' || a === 100 && b >= 64 && b <= 127);
  }
  if (version !== 6) return false;
  const normalized = address.toLowerCase();
  return !(/^::/.test(normalized) || /^f[cd]/.test(normalized) || /^fe[89ab]/.test(normalized) || /^ff/.test(normalized) ||
    /^100:/.test(normalized) || /^2001:(?:0{0,3}0|0{0,3}2|0{0,2}10|0{0,2}20|0{0,1}db8):/.test(normalized) || /^2002:/.test(normalized) || /^64:ff9b:/.test(normalized));
}

function requestPage(input: string, addresses: ResolvedAddress[]): Promise<{ status: number; location?: string; body: string }> {
  return new Promise((resolve, reject) => {
    const url = new URL(input);
    const client = url.protocol === 'https:' ? https : http;
    let bytes = 0;
    const chunks: Buffer[] = [];
    const request = client.get(url, {
      headers: { 'User-Agent': 'AmugonnaRecipeImporter/1.0', Accept: 'text/html,application/xhtml+xml' },
      timeout: TIMEOUT_MS,
      lookup: (_hostname, options, callback) => {
        const chosen = addresses[0];
        if (typeof options === 'object' && options.all) callback(null, addresses);
        else callback(null, chosen.address, chosen.family);
      },
    }, response => {
      response.on('data', chunk => {
        bytes += Buffer.byteLength(chunk);
        if (bytes > MAX_BYTES) { request.destroy(new Error('Recipe page is too large')); return; }
        chunks.push(Buffer.from(chunk));
      });
      response.on('end', () => resolve({ status: response.statusCode ?? 0, location: response.headers.location, body: Buffer.concat(chunks).toString('utf8') }));
    });
    const timer = setTimeout(() => request.destroy(new Error('Recipe page timed out')), TIMEOUT_MS);
    request.on('close', () => clearTimeout(timer));
    request.on('timeout', () => request.destroy(new Error('Recipe page timed out')));
    request.on('error', reject);
  });
}
