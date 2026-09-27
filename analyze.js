const THREADS_HOSTS = new Set([
  'threads.net', 'www.threads.net',
  'threads.com', 'www.threads.com'
]);

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36';

function validateThreadsUrl(raw) {
  let url;
  try { url = new URL(raw); } catch { throw new Error('Please paste a valid Threads URL.'); }
  if (!THREADS_HOSTS.has(url.hostname.toLowerCase())) throw new Error('That is not a Threads URL.');
  if (!/^https?:$/.test(url.protocol)) throw new Error('Only HTTP(S) URLs are supported.');
  return url;
}

function decodeEscapes(s) {
  return s
    .replaceAll('\\u0025', '%')
    .replaceAll('\\u0026', '&')
    .replaceAll('\\u003D', '=')
    .replaceAll('\\u003d', '=')
    .replaceAll('\\/', '/')
    .replaceAll('\\u002F', '/')
    .replaceAll('&amp;', '&');
}

function extractVideoUrls(html) {
  const normalized = decodeEscapes(html);
  const candidates = [];
  const patterns = [
    /https?:\\?\/\\?\/[^"'\\s<>]+?\.mp4(?:\?[^"'\\s<>]*)?/gi,
    /https?:\\?\/\\?\/[^"'\\s<>]+?\.mp4[^"'\\s<>]*/gi
  ];
  for (const re of patterns) {
    for (const m of normalized.matchAll(re)) candidates.push(m[0]);
  }
  return [...new Set(candidates
    .map(x => x.replaceAll('\\\\/', '/'))
    .map(x => x.replaceAll('\\u0026', '&'))
    .filter(x => /^https?:\/\//i.test(x) && /\.mp4/i.test(x))
  )];
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed.' });
  try {
    const raw = req.body?.url;
    if (!raw) return res.status(400).json({ ok: false, error: 'Paste a Threads URL.' });

    const url = validateThreadsUrl(raw);
    const response = await fetch(url, {
      headers: {
        'User-Agent': UA,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      redirect: 'follow'
    });

    if (!response.ok) throw new Error(`Threads returned HTTP ${response.status}.`);
    const html = await response.text();
    const videos = extractVideoUrls(html);

    if (!videos.length) {
      throw new Error('No public video URL was found. The post may be image-only, private, unavailable, or Threads may have changed its page format.');
    }

    res.status(200).json({
      ok: true,
      sourceUrl: response.url,
      videos: videos.map((url, i) => ({ id: i + 1, url }))
    });
  } catch (error) {
    res.status(422).json({ ok: false, error: error?.message || 'Could not analyze that post.' });
  }
}
