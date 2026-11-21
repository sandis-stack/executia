/**
 * TASK-47 — visitor country for currency (Vercel geo header when present).
 */
export default function handler(req, res) {
  const country =
    req.headers['x-vercel-ip-country'] ||
    req.headers['x-vercel-ip-country'.toLowerCase()] ||
    null;
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.status(200).json({
    country: country ? String(country).toUpperCase() : null,
    source: country ? 'vercel-geo' : 'unknown',
  });
}
