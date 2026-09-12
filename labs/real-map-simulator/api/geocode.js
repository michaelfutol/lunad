const SEARCH_URL = 'https://nominatim.openstreetmap.org/search';
const REVERSE_URL = 'https://nominatim.openstreetmap.org/reverse';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  const q = String(req.query.q || '').trim();
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  const headers = {
    'user-agent': 'LUNAD-Mobility-Lab/0.1 (controlled testing)',
    'accept-language': 'en,fil'
  };
  try {
    if (q) {
      const endpoint = new URL(SEARCH_URL);
      endpoint.searchParams.set('format', 'jsonv2');
      endpoint.searchParams.set('limit', '6');
      endpoint.searchParams.set('countrycodes', 'ph');
      endpoint.searchParams.set('addressdetails', '1');
      endpoint.searchParams.set('q', `${q}, Sorsogon, Philippines`);
      const upstream = await fetch(endpoint, { headers });
      if (!upstream.ok) throw new Error(`search ${upstream.status}`);
      const results = await upstream.json();
      return res.status(200).json(results.map(item => ({
        label: item.display_name,
        name: item.name || item.display_name?.split(',')[0] || q,
        lat: Number(item.lat),
        lng: Number(item.lon)
      })));
    }
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      const endpoint = new URL(REVERSE_URL);
      endpoint.searchParams.set('format', 'jsonv2');
      endpoint.searchParams.set('zoom', '18');
      endpoint.searchParams.set('lat', String(lat));
      endpoint.searchParams.set('lon', String(lng));
      const upstream = await fetch(endpoint, { headers });
      if (!upstream.ok) throw new Error(`reverse ${upstream.status}`);
      const item = await upstream.json();
      return res.status(200).json({ label: item.display_name || `Pinned · ${lat.toFixed(5)}, ${lng.toFixed(5)}`, lat, lng });
    }
    return res.status(400).json({ error: 'MISSING_QUERY_OR_COORDINATES' });
  } catch {
    return res.status(502).json({ error: 'GEOCODER_UNAVAILABLE' });
  }
}
