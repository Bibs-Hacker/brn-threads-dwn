import express from 'express';
import { Readable } from 'node:stream';

const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json({ limit: '32kb' }));
app.use(express.static('public'));

const THREADS_HOSTS = new Set(['threads.net', 'www.threads.net', 'threads.com', 'www.threads.com']);
const UA = 'Mozilla/5.0 (compatible; ThreadSaveBot/1.0; +https://example.com/threadsave)';

function validateThreadsUrl(raw) {
  let url;
  try { url = new URL(raw); } catch { throw new Error('Please paste a valid Threads URL.'); }
  if (!THREADS_HOSTS.has(url.hostname.toLowerCase())) throw new Error('That is not a Threads URL.');
  if (!/^https?:$/.test(url.protocol)) throw new Error('Only HTTP(S) URLs are supported.');
  return url;
}

function decodeEscapes(s) {
  return s.replaceAll('\\u0025', '%').replaceAll('\\u0026', '&').replaceAll('\\u003D', '=').replaceAll('\\/', '/').replaceAll('\\u002F', '/').replaceAll('&amp;', '&');
}

function extractVideoUrls(html) {
  const normalized = decodeEscapes(html);
  const candidates = [];
  const patterns = [
    /https?:\\?\/\\?\/[^"'\\s<>]+?\.mp4(?:\?[^"'\\s<>]*)?/gi,
    /https?:\\?\/\\?\/[^"'\\s<>]+?\.mp4[^"'\\s<>]*/gi
  ];
  for (const re of patterns) for (const m of normalized.matchAll(re)) candidates.push(m[0]);
  return [...new Set(candidates.map(x => x.replaceAll('\\\\/', '/')))].filter(x => /\.mp4/i.test(x));
}

async function resolveThreads(raw) {
  const url = validateThreadsUrl(raw);
  const response = await fetch(url, { headers: { 'User-Agent': UA, 'Accept': 'text/html,application/xhtml+xml' }, redirect: 'follow' });
  if (!response.ok) throw new Error(`Threads returned HTTP ${response.status}.`);
  const html = await response.text();
  const videos = extractVideoUrls(html);
  if (!videos.length) throw new Error('No public video URL was found. The post may be image-only, private, unavailable, or Threads may have changed its page format.');
  return { sourceUrl: response.url, videos };
}

app.post('/api/analyze', async (req, res) => {
  try {
    if (!req.body?.url) return res.status(400).json({ error: 'Paste a Threads URL.' });
    const result = await resolveThreads(req.body.url);
    res.json({ ok: true, sourceUrl: result.sourceUrl, videos: result.videos.map((url, i) => ({ id: i + 1, url })) });
  } catch (e) {
    res.status(422).json({ ok: false, error: e.message });
  }
});

app.get('/api/download', async (req, res) => {
  try {
    const media = new URL(req.query.url);
    if (!['http:', 'https:'].includes(media.protocol)) throw new Error('Invalid media URL.');
    const response = await fetch(media, { headers: { 'User-Agent': UA, 'Accept': 'video/mp4,*/*' }, redirect: 'follow' });
    if (!response.ok || !response.body) throw new Error(`Media server returned HTTP ${response.status}.`);
    res.setHeader('Content-Type', response.headers.get('content-type') || 'video/mp4');
    res.setHeader('Content-Disposition', 'attachment; filename="threadsave-video.mp4"');
    const len = response.headers.get('content-length');
    if (len) res.setHeader('Content-Length', len);
    Readable.fromWeb(response.body).pipe(res);
  } catch (e) {
    res.status(422).send(e.message);
  }
});

app.listen(PORT, () => console.log(`ThreadSave running on http://localhost:${PORT}`));
