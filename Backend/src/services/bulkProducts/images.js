import crypto from 'crypto';
import dns from 'dns';
import fs from 'fs';
import http from 'http';
import https from 'https';
import net from 'net';
import path from 'path';
import sharp from 'sharp';
import AdmZip from 'adm-zip';
import { IMAGE_DISK_ROOT, IMAGE_EXT, IMAGE_PUBLIC_PREFIX, LIMITS } from './constants.js';

// ───────────── SSRF guard: the server never downloads from internal addresses ─────────────

const isPrivateV4 = (ip) => {
  const p = ip.split('.').map(Number);
  if (p.length !== 4 || p.some((n) => !Number.isInteger(n))) return true;
  const [a, b] = p;
  return (
    a === 0 || a === 10 || a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
};
export const isPrivateAddress = (ip) => {
  if (net.isIPv4(ip)) return isPrivateV4(ip);
  if (net.isIPv6(ip)) {
    const v = ip.toLowerCase();
    if (v === '::' || v === '::1') return true;
    if (v.startsWith('fc') || v.startsWith('fd') || v.startsWith('fe8') || v.startsWith('fe9') || v.startsWith('fea') || v.startsWith('feb')) return true;
    const mapped = v.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateV4(mapped[1]);
    return false;
  }
  return true;
};

/** dns lookup that refuses private results; used as the socket's `lookup` so redirects and DNS rebinding are covered too. */
const safeLookup = (hostname, options, cb) => {
  dns.lookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return cb(err);
    const list = addresses.filter((a) => !isPrivateAddress(a.address));
    if (list.length === 0) return cb(new Error('Image address is not allowed'));
    if (options && options.all) return cb(null, list);
    return cb(null, list[0].address, list[0].family);
  });
};

const downloadOnce = (urlStr, redirectsLeft) =>
  new Promise((resolve, reject) => {
    let url;
    try { url = new URL(urlStr); } catch { return reject(new Error('Invalid image URL')); }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return reject(new Error('Only http(s) image links are allowed'));
    if (url.username || url.password) return reject(new Error('Image link must not contain credentials'));
    if (url.port && !['80', '443'].includes(url.port)) return reject(new Error('Image link uses a port that is not allowed'));
    if (net.isIP(url.hostname) && isPrivateAddress(url.hostname)) return reject(new Error('Image address is not allowed'));
    const lib = url.protocol === 'https:' ? https : http;
    const req = lib.get(url, { lookup: safeLookup, timeout: 15000, headers: { 'User-Agent': 'SavitriBulkImport/1.0', Accept: 'image/*' } }, (res) => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
        res.resume();
        if (redirectsLeft <= 0) return reject(new Error('Too many redirects'));
        return resolve(downloadOnce(new URL(res.headers.location, url).toString(), redirectsLeft - 1));
      }
      if (res.statusCode !== 200) { res.resume(); return reject(new Error(`Image link returned HTTP ${res.statusCode}`)); }
      const declared = Number(res.headers['content-length'] || 0);
      if (declared > LIMITS.maxImageBytes) { res.resume(); return reject(new Error('Image is larger than 8 MB')); }
      const chunks = [];
      let size = 0;
      res.on('data', (c) => {
        size += c.length;
        if (size > LIMITS.maxImageBytes) { req.destroy(new Error('Image is larger than 8 MB')); return; }
        chunks.push(c);
      });
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    });
    req.on('timeout', () => req.destroy(new Error('Image download timed out')));
    req.on('error', reject);
  });

export const downloadImage = (url) => downloadOnce(url, 3);

// ───────────── conversion + storage ─────────────

/** Any supported image -> optimised WebP stored under uploads/products/bulk/<sellerId>/. Returns the public URL. */
export const storeAsWebp = async (buffer, sellerId) => {
  if (!buffer || buffer.length === 0) throw new Error('Empty image');
  if (buffer.length > LIMITS.maxImageBytes) throw new Error('Image is larger than 8 MB');
  let image;
  try {
    image = sharp(buffer, { failOn: 'error', limitInputPixels: LIMITS.maxImagePixels, animated: false });
    const meta = await image.metadata();
    if (!['jpeg', 'png', 'webp', 'gif', 'avif', 'heif'].includes(meta.format)) throw new Error('Unsupported image type');
  } catch (err) {
    throw new Error(err.message === 'Unsupported image type' ? 'Unsupported image type (use JPG, PNG, WEBP, GIF or AVIF)' : 'File is not a valid image');
  }
  const out = await image.rotate().resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
  const hash = crypto.createHash('sha256').update(out).digest('hex').slice(0, 24);
  const dir = path.join(IMAGE_DISK_ROOT, String(sellerId));
  await fs.promises.mkdir(dir, { recursive: true });
  const file = path.join(dir, `${hash}.webp`);
  if (!fs.existsSync(file)) await fs.promises.writeFile(file, out);
  return `${IMAGE_PUBLIC_PREFIX}/${sellerId}/${hash}.webp`;
};

// ───────────── ZIP of images ─────────────

const baseKey = (name) => path.basename(String(name).replace(/\\/g, '/')).toLowerCase();
const stem = (name) => baseKey(name).replace(/\.[^.]+$/, '');

/** Opens the ZIP and indexes only safe image entries by file name. Entry paths are never used on disk. */
export const openImagesZip = (zipPath) => {
  let zip;
  try { zip = new AdmZip(zipPath); } catch { throw new Error('The images ZIP could not be read'); }
  const entries = zip.getEntries();
  if (entries.length > LIMITS.maxZipEntries) throw new Error(`The images ZIP has too many files (max ${LIMITS.maxZipEntries})`);
  const byName = new Map(); // lower-case file name -> entry
  let total = 0;
  for (const e of entries) {
    if (e.isDirectory) continue;
    const name = baseKey(e.entryName);
    if (name.startsWith('.') || name.startsWith('__macosx')) continue;
    if (e.entryName.includes('..')) continue;
    if (!IMAGE_EXT.has(path.extname(name))) continue;
    total += e.header.size;
    if (e.header.size > LIMITS.maxImageBytes) continue; // reported per product when referenced
    if (total > 600 * 1024 * 1024) throw new Error('The images ZIP expands to more than 600 MB');
    if (!byName.has(name)) byName.set(name, e);
  }
  return { zip, byName };
};

/**
 * Image file names that belong to a SKU: SKU.ext first, then SKU_1.ext, SKU-2.ext, SKU 3.ext, SKU(4).ext ...
 * A file whose whole name is another SKU of the sheet is never borrowed.
 */
export const zipFilesForSku = (byName, sku, sheetSkus) => {
  const key = String(sku).toLowerCase();
  const out = [];
  const numbered = [];
  for (const name of byName.keys()) {
    const s = stem(name);
    if (s === key) { out.push({ name, order: 0 }); continue; }
    if (sheetSkus.has(s)) continue;
    const m = s.startsWith(key) ? s.slice(key.length).match(/^(?:[_\-\s]?(\d{1,2})|\s*\((\d{1,2})\))$/) : null;
    if (m) numbered.push({ name, order: Number(m[1] || m[2]) });
  }
  numbered.sort((a, b) => a.order - b.order);
  return [...out, ...numbered].map((x) => x.name);
};

export const zipEntryData = (zipHandle, fileName) => {
  const e = zipHandle.byName.get(String(fileName).toLowerCase());
  if (!e) throw new Error(`"${fileName}" was not found in the images ZIP`);
  if (e.header.size > LIMITS.maxImageBytes) throw new Error(`"${fileName}" is larger than 8 MB`);
  const data = e.getData();
  if (data.length > LIMITS.maxImageBytes) throw new Error(`"${fileName}" is larger than 8 MB`);
  return data;
};
