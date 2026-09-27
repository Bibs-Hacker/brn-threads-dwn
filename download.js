const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36';
const ALLOWED_MEDIA_HOSTS = new Set([
  'scontent.cdninstagram.com',
  'scontent.xx.fbcdn.net',
  'scontent-lax3-1.xx.fbcdn.net',
  'scontent-nrt1-1.xx.fbcdn.net'
]);

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).send('Method not allowed.');

  try {
    const raw = req.query?.url;
    if (!raw) return res.status(400).send('Missing media URL.');

    const media = new URL(raw);
    if (!['http:', 'https:'].includes(media.protocol)) throw new Error('Invalid media URL.');

    // Keep this endpoint from becoming a general-purpose open proxy.
    // Threads media is normally served from Meta CDN hosts.
    const host = media.hostname.toLowerCase();
    if (!host.endsWith('fbcdn.net') && !ALLOWED_MEDIA_HOSTS.has(host)) {
      throw new Error('Unsupported media host.');
    }

    const response = await fetch(media, {
      headers: { 'User-Agent': UA, 'Accept': 'video/mp4,video/*,*/*;q=0.8' },
      redirect: 'follow'
    });

    if (!response.ok || !response.body) throw new Error(`Media server returned HTTP ${response.status}.`);

    res.setHeader('Content-Type', response.headers.get('content-type') || 'video/mp4');
    res.setHeader('Content-Disposition', 'attachment; filename="threadsave-video.mp4"');
    const len = response.headers.get('content-length');
    if (len) res.setHeader('Content-Length', len);

    const reader = response.body.getReader();
    const pump = async () => {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        res.write(Buffer.from(value));
      }
      res.end();
    };
    await pump();
  } catch (error) {
    if (!res.headersSent) res.status(422).send(error?.message || 'Download failed.');
    else res.end();
  }
}
