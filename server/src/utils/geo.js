/**
 * Best-effort extraction of latitude/longitude from a Google Maps URL.
 *
 * Handles the common link shapes that actually contain coordinates:
 *   - https://www.google.com/maps/@19.0760,72.8777,15z
 *   - https://www.google.com/maps/place/Name/@19.0760,72.8777,15z/...
 *   - https://maps.google.com/?q=19.0760,72.8777
 *   - https://www.google.com/maps?q=19.0760,72.8777
 *   - https://www.google.com/maps/search/?api=1&query=19.0760,72.8777
 *   - ...!3d19.0760!4d72.8777... (embedded/data links)
 *   - a bare "19.0760,72.8777" string
 *
 * Short links (maps.app.goo.gl / goo.gl/maps) redirect and do NOT contain
 * coordinates in the URL itself, so they return null — the raw link is still
 * stored so users can open it.
 *
 * @param {string} link
 * @returns {{ lat: number, lng: number } | null}
 */
export function parseLatLngFromMapsLink(input) {
  if (!input || typeof input !== 'string') return null;

  // Google's expanded pages often percent-encode the "!" separators (%21) and
  // commas (%2C). Decode a copy so the coordinate patterns below can match.
  let link = input;
  try {
    if (/%2[1c]/i.test(input)) link = decodeURIComponent(input);
  } catch { /* keep original on malformed encoding */ }

  const clamp = (lat, lng) =>
    Number.isFinite(lat) && Number.isFinite(lng) &&
    lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
      ? { lat, lng }
      : null;

  // !3d<lat>!4d<lng>  (data / embed links — marker position)
  const dMatch = link.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  if (dMatch) {
    const r = clamp(parseFloat(dMatch[1]), parseFloat(dMatch[2]));
    if (r) return r;
  }

  // !2d<lng>!3d<lat>  (place preview / viewport center — note: lng THEN lat)
  const d23Match = link.match(/!2d(-?\d+(?:\.\d+)?)!3d(-?\d+(?:\.\d+)?)/);
  if (d23Match) {
    const r = clamp(parseFloat(d23Match[2]), parseFloat(d23Match[1]));
    if (r) return r;
  }

  // @<lat>,<lng>  (map view center)
  const atMatch = link.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (atMatch) {
    const r = clamp(parseFloat(atMatch[1]), parseFloat(atMatch[2]));
    if (r) return r;
  }

  // query / q / ll / center / destination / daddr / saddr params: =<lat>,<lng>
  const qMatch = link.match(/[?&](?:q|query|ll|sll|center|destination|daddr|saddr)=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (qMatch) {
    const r = clamp(parseFloat(qMatch[1]), parseFloat(qMatch[2]));
    if (r) return r;
  }

  // URL-encoded comma: q=<lat>%2C<lng>
  const encMatch = link.match(/[?&](?:q|query|ll|sll|center|destination)=(-?\d+(?:\.\d+)?)%2C(-?\d+(?:\.\d+)?)/i);
  if (encMatch) {
    const r = clamp(parseFloat(encMatch[1]), parseFloat(encMatch[2]));
    if (r) return r;
  }

  // In-page/script forms: LatLng(<lat>,<lng>)  or  "latitude":<lat>,"longitude":<lng>
  const latLngFn = link.match(/LatLng\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\)/);
  if (latLngFn) {
    const r = clamp(parseFloat(latLngFn[1]), parseFloat(latLngFn[2]));
    if (r) return r;
  }

  const latLngJson = link.match(/"latitude"\s*:\s*(-?\d+(?:\.\d+)?)\s*,\s*"longitude"\s*:\s*(-?\d+(?:\.\d+)?)/);
  if (latLngJson) {
    const r = clamp(parseFloat(latLngJson[1]), parseFloat(latLngJson[2]));
    if (r) return r;
  }

  // bare "lat,lng"
  const bare = link.trim().match(/^(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)$/);
  if (bare) {
    const r = clamp(parseFloat(bare[1]), parseFloat(bare[2]));
    if (r) return r;
  }

  return null;
}

const SHORT_LINK_HOSTS = ['maps.app.goo.gl', 'goo.gl', 'g.co'];

function isShortMapsLink(link) {
  try {
    const host = new URL(link).hostname.toLowerCase();
    return SHORT_LINK_HOSTS.some(h => host === h || host.endsWith(`.${h}`));
  } catch {
    return false;
  }
}

/**
 * Follow a short Google Maps link (maps.app.goo.gl / goo.gl/maps) to its
 * expanded URL, which contains the coordinates. Returns the final URL string
 * or null if it can't be resolved.
 */
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36';

// Manually walk redirect hops so we can read the Location header on each hop.
// Google short links may point to a consent page whose URL still embeds coords.
async function followRedirects(startUrl, maxHops = 6) {
  let current = startUrl;
  for (let i = 0; i < maxHops; i++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    let resp;
    try {
      resp = await fetch(current, {
        method: 'GET',
        redirect: 'manual',
        signal: controller.signal,
        headers: { 'User-Agent': UA }
      });
    } finally {
      clearTimeout(timer);
    }

    // Any URL along the chain might already contain coordinates.
    if (parseLatLngFromMapsLink(current)) return current;

    const isRedirect = resp.status >= 300 && resp.status < 400;
    const location = resp.headers.get('location');
    if (isRedirect && location) {
      // Resolve relative redirects against the current URL.
      current = new URL(location, current).toString();
      continue;
    }

    // Not a redirect. If fetch auto-followed (redirect not manual on this
    // runtime), resp.url may hold the final URL.
    if (resp.url && resp.url !== current) return resp.url;

    // If the body is HTML, coordinates sometimes appear inside it.
    try {
      const text = await resp.text();
      if (parseLatLngFromMapsLink(text)) return text;
    } catch { /* ignore */ }

    return current;
  }
  return current;
}

async function expandShortLink(link) {
  try {
    // Primary: let fetch auto-follow redirects and inspect the resolved URL.
    // This is the most reliable path (resp.url holds the full coordinate URL).
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const resp = await fetch(link, {
        method: 'GET',
        redirect: 'follow',
        signal: controller.signal,
        headers: { 'User-Agent': UA }
      });
      if (resp.url && parseLatLngFromMapsLink(resp.url)) return resp.url;
      // Some links only reveal coordinates inside the page body.
      const text = await resp.text();
      if (parseLatLngFromMapsLink(text)) return text;
      if (resp.url && !isShortMapsLink(resp.url)) return resp.url;
    } finally {
      clearTimeout(timer);
    }

    // Fallback: manual redirect walking (reads Location header per hop).
    const viaManual = await followRedirects(link);
    if (viaManual) return viaManual;
    return null;
  } catch {
    return null;
  }
}

/**
 * Resolve coordinates from any Google Maps link, expanding short links first
 * when necessary. Async because short links require a network round-trip.
 *
 * @param {string} link
 * @returns {Promise<{ lat: number, lng: number } | null>}
 */
export async function resolveLatLngFromMapsLink(link) {
  if (!link || typeof link !== 'string') return null;

  // Try the raw link first (no network needed for full links).
  const direct = parseLatLngFromMapsLink(link);
  if (direct) return direct;

  // Short links need to be expanded to reveal coordinates.
  if (isShortMapsLink(link)) {
    const expanded = await expandShortLink(link.trim());
    if (process.env.DEBUG_GEO) {
      console.log('[geo] short link:', link);
      console.log('[geo] expanded to:', typeof expanded === 'string' ? expanded.slice(0, 500) : expanded);
    }
    if (expanded) {
      const fromExpanded = parseLatLngFromMapsLink(expanded);
      if (fromExpanded) return fromExpanded;
    }
  }

  return null;
}
