import * as http from 'http';
import * as https from 'https';
import * as tls from 'tls';
import { URL } from 'url';

export interface HttpRequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  timeout?: number;
  proxy?: string;
  maxRedirects?: number;
}

export interface HttpResponse {
  status: number;
  headers: Record<string, string | string[] | undefined>;
  body: Buffer;
}

export class HttpError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body = ''
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

const DEFAULT_TIMEOUT = 8000;
const USER_AGENT = 'lingua-translate/0.2.0';

function collectHeaders(extra: Record<string, string>): Record<string, string> {
  return {
    'User-Agent': USER_AGENT,
    Accept: 'application/json, text/plain, */*',
    ...extra
  };
}

export async function request(url: string, options: HttpRequestOptions = {}): Promise<HttpResponse> {
  const method = (options.method || 'GET').toUpperCase();
  const timeout = options.timeout || DEFAULT_TIMEOUT;
  const redirects = options.maxRedirects ?? 4;
  const headers = collectHeaders(options.headers || {});
  const body = options.body;

  if (body !== undefined && !('Content-Length' in headers)) {
    headers['Content-Length'] = String(Buffer.byteLength(body));
  }

  const response = options.proxy
    ? await viaProxy(url, { method, headers, body, timeout, proxy: options.proxy })
    : await direct(url, { method, headers, body, timeout });

  if (response.status >= 300 && response.status < 400 && response.headers.location && redirects > 0) {
    const location = Array.isArray(response.headers.location)
      ? response.headers.location[0]
      : response.headers.location;
    const next = new URL(location, url).toString();
    return request(next, {
      ...options,
      method: 'GET',
      body: undefined,
      headers: options.headers,
      maxRedirects: redirects - 1
    });
  }

  if (response.status < 200 || response.status >= 300) {
    throw new HttpError(`HTTP ${response.status}`, response.status, response.body.toString('utf8').slice(0, 300));
  }

  return response;
}

function direct(
  url: string,
  options: { method: string; headers: Record<string, string>; body?: string; timeout: number }
): Promise<HttpResponse> {
  return new Promise((resolve, reject) => {
    const target = new URL(url);
    const isHttps = target.protocol === 'https:';
    const mod = isHttps ? https : http;

    const req = mod.request(
      {
        hostname: target.hostname,
        port: target.port || (isHttps ? 443 : 80),
        path: `${target.pathname}${target.search}`,
        method: options.method,
        headers: options.headers,
        timeout: options.timeout
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => {
          resolve({
            status: res.statusCode || 0,
            headers: res.headers as Record<string, string | string[] | undefined>,
            body: Buffer.concat(chunks)
          });
        });
        res.on('error', reject);
      }
    );

    req.on('timeout', () => req.destroy(new Error('Request timed out')));
    req.on('error', reject);
    if (options.body !== undefined) req.write(options.body);
    req.end();
  });
}

function viaProxy(
  url: string,
  options: { method: string; headers: Record<string, string>; body?: string; timeout: number; proxy: string }
): Promise<HttpResponse> {
  return new Promise((resolve, reject) => {
    let target: URL;
    let proxy: URL;
    try {
      target = new URL(url);
      proxy = new URL(options.proxy);
    } catch {
      reject(new Error('Invalid proxy URL; expected something like http://127.0.0.1:7890'));
      return;
    }
    if (target.protocol !== 'https:') {
      reject(new Error('The proxy only supports HTTPS targets'));
      return;
    }

    let settled = false;
    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      reject(error);
    };

    const port = target.port || 443;
    const connectHeaders: Record<string, string> = {
      Host: `${target.hostname}:${port}`,
      'Proxy-Connection': 'keep-alive'
    };
    if (proxy.username) {
      const credentials = `${decodeURIComponent(proxy.username)}:${decodeURIComponent(proxy.password || '')}`;
      connectHeaders['Proxy-Authorization'] = `Basic ${Buffer.from(credentials).toString('base64')}`;
    }

    const connectRequest = http.request({
      hostname: proxy.hostname,
      port: proxy.port || 80,
      method: 'CONNECT',
      path: `${target.hostname}:${port}`,
      headers: connectHeaders,
      timeout: options.timeout
    });

    connectRequest.on('connect', (response, socket) => {
      if (response.statusCode !== 200) {
        socket.destroy();
        fail(new Error(`Proxy connection failed (HTTP ${response.statusCode})`));
        return;
      }

      const secureSocket = tls.connect({ socket, servername: target.hostname }, () => {
        const headerLines = [`${options.method} ${target.pathname}${target.search} HTTP/1.1`, `Host: ${target.hostname}`];
        for (const [key, value] of Object.entries(options.headers)) {
          if (key.toLowerCase() === 'host') continue;
          headerLines.push(`${key}: ${value}`);
        }
        headerLines.push('Connection: close', '', '');
        let payload = headerLines.join('\r\n');
        if (options.body !== undefined) payload += options.body;
        secureSocket.write(payload);
      });

      const chunks: Buffer[] = [];
      secureSocket.setTimeout(options.timeout, () => secureSocket.destroy(new Error('Request timed out')));
      secureSocket.on('data', (chunk: Buffer) => chunks.push(chunk));
      secureSocket.on('end', () => {
        if (settled) return;
        settled = true;
        try {
          resolve(parseRaw(Buffer.concat(chunks)));
        } catch (error) {
          reject(error instanceof Error ? error : new Error(String(error)));
        }
      });
      secureSocket.on('error', fail);
    });

    connectRequest.on('timeout', () => connectRequest.destroy(new Error('Proxy connection timed out')));
    connectRequest.on('error', fail);
    connectRequest.end();
  });
}

/** Parse the raw HTTP response as latin1: one character equals one byte, which makes it easy to slice chunked responses by byte. */
function parseRaw(raw: Buffer): HttpResponse {
  const text = raw.toString('latin1');
  const split = text.indexOf('\r\n\r\n');
  if (split < 0) throw new Error('Incomplete data from the proxy');

  const head = text.slice(0, split);
  const body = text.slice(split + 4);
  const statusLine = head.split('\r\n')[0] || '';
  const status = Number(statusLine.split(' ')[1] || 0);

  const headers: Record<string, string> = {};
  for (const line of head.split('\r\n').slice(1)) {
    const colon = line.indexOf(':');
    if (colon > 0) headers[line.slice(0, colon).toLowerCase()] = line.slice(colon + 1).trim();
  }

  const decoded = /chunked/i.test(headers['transfer-encoding'] || '') ? decodeChunked(body) : body;
  return { status, headers, body: Buffer.from(decoded, 'latin1') };
}

function decodeChunked(body: string): string {
  let output = '';
  let index = 0;
  while (index < body.length) {
    const lineEnd = body.indexOf('\r\n', index);
    if (lineEnd < 0) break;
    const size = parseInt(body.slice(index, lineEnd), 16);
    if (!size || Number.isNaN(size)) break;
    const start = lineEnd + 2;
    output += body.slice(start, start + size);
    index = start + size + 2;
  }
  return output;
}

export async function getJson<T = unknown>(url: string, options: HttpRequestOptions = {}): Promise<T> {
  const response = await request(url, options);
  try {
    return JSON.parse(response.body.toString('utf8')) as T;
  } catch {
    throw new Error('Service did not return valid JSON');
  }
}

export async function getText(url: string, options: HttpRequestOptions = {}): Promise<string> {
  const response = await request(url, options);
  return response.body.toString('utf8');
}

export async function postJson<T = unknown>(
  url: string,
  payload: unknown,
  options: HttpRequestOptions = {}
): Promise<T> {
  const response = await request(url, {
    ...options,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    body: JSON.stringify(payload)
  });
  try {
    return JSON.parse(response.body.toString('utf8')) as T;
  } catch {
    throw new Error('Service did not return valid JSON');
  }
}

export async function postForm<T = unknown>(
  url: string,
  fields: Record<string, string>,
  options: HttpRequestOptions = {}
): Promise<T> {
  const body = new URLSearchParams(fields).toString();
  const response = await request(url, {
    ...options,
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...(options.headers || {}) },
    body
  });
  try {
    return JSON.parse(response.body.toString('utf8')) as T;
  } catch {
    throw new Error('Service did not return valid JSON');
  }
}

export async function getBinary(url: string, options: HttpRequestOptions = {}): Promise<{ status: number; body: Buffer }> {
  const response = await request(url, options);
  return { status: response.status, body: response.body };
}

export function decodeEntities(value: string): string {
  return value
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

/** Split long text into chunks the service accepts, preferring sentence boundaries. */
export function splitChunks(text: string, limit: number): string[] {
  const paragraphs = text.split(/\n{2,}/).filter((part) => part.trim());
  const chunks: string[] = [];

  for (const paragraph of paragraphs) {
    if (paragraph.length <= limit) {
      chunks.push(paragraph);
      continue;
    }
    let rest = paragraph;
    while (rest.length > limit) {
      let cut = Math.max(
        rest.lastIndexOf('. ', limit),
        rest.lastIndexOf('。', limit),
        rest.lastIndexOf('! ', limit),
        rest.lastIndexOf('? ', limit),
        rest.lastIndexOf('; ', limit)
      );
      if (cut < limit / 3) cut = limit - 1;
      chunks.push(rest.slice(0, cut + 1));
      rest = rest.slice(cut + 1).trimStart();
    }
    if (rest) chunks.push(rest);
  }

  return chunks.length ? chunks : [text];
}
