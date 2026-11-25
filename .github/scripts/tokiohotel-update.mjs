// Met à jour tokiohotel/data/live.json : actus (Google Actus RSS) + dates de concert (Bandsintown).
// Lancé chaque jour par .github/workflows/tokiohotel-update.yml. Aucune dépendance.
import { readFile, writeFile } from 'node:fs/promises';

const OUT = new URL('../../tokiohotel/data/live.json', import.meta.url);
const APP_ID = process.env.BANDSINTOWN_APP_ID || 'th-fanhub';
const UA = 'Mozilla/5.0 (compatible; th-fanhub-updater/1.0)';

const FEEDS = [
  { lang: 'fr', url: 'https://news.google.com/rss/search?q=%22Tokio+Hotel%22&hl=fr&gl=FR&ceid=FR:fr' },
  { lang: 'de', url: 'https://news.google.com/rss/search?q=%22Tokio+Hotel%22&hl=de&gl=DE&ceid=DE:de' },
  { lang: 'en', url: 'https://news.google.com/rss/search?q=%22Tokio+Hotel%22&hl=en-US&gl=US&ceid=US:en' },
];

const decode = s => String(s ?? '')
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&amp;/g, '&').trim();
const tag = (xml, name) => { const m = xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`)); return m ? decode(m[1]) : ''; };

export function parseRss(xml, lang) {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(([, it]) => {
    const source = tag(it, 'source');
    let title = tag(it, 'title');
    if (source && title.endsWith(' - ' + source)) title = title.slice(0, -(source.length + 3));
    const d = new Date(tag(it, 'pubDate'));
    return { t: title, u: tag(it, 'link'), s: source, d: isNaN(d) ? null : d.toISOString(), lang };
  }).filter(n => n.t && n.u && n.d && /tokio\s*hotel|kaulitz|listing|sch[äa]fer/i.test(n.t));
}

const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

async function get(url, type) {
  const r = await fetch(url, { headers: { 'user-agent': UA, accept: type } });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText} — ${url}`);
  return type.includes('json') ? r.json() : r.text();
}

async function news() {
  const all = [];
  for (const f of FEEDS) {
    try { const items = parseRss(await get(f.url, 'application/rss+xml'), f.lang); console.log(`Actus ${f.lang} : ${items.length}`); all.push(...items); }
    catch (e) { console.warn('Actus', f.lang, 'échec :', e.message); }
  }
  const seen = new Set();
  return all.sort((a, b) => b.d.localeCompare(a.d))
    .filter(n => { const k = norm(n.t).slice(0, 70); if (seen.has(k)) return false; seen.add(k); return true; })
    .slice(0, 40);
}

export function mapEvent(e) {
  const v = e.venue || {};
  const offers = (e.offers || []).filter(o => o.url).map(o => ({ l: o.type === 'Tickets' ? 'Billets' : (o.type || 'Billets'), u: o.url, st: o.status || '' }));
  return {
    date: String(e.datetime || e.starts_at || '').slice(0, 10),
    time: String(e.datetime || '').slice(11, 16),
    city: v.city || '', country: v.country || '', region: v.region || '',
    venue: v.name || v.location || '', title: e.title || '', festival: !!(e.festival_start_date || e.festival_datetime_display_rule),
    lineup: e.lineup || [], url: e.url || '', offers,
    soldOut: offers.length > 0 && offers.every(o => /sold/i.test(o.st)),
  };
}

async function events() {
  const url = `https://rest.bandsintown.com/artists/${encodeURIComponent('Tokio Hotel')}/events?app_id=${encodeURIComponent(APP_ID)}&date=upcoming`;
  try {
    const data = await get(url, 'application/json');
    if (!Array.isArray(data)) throw new Error('réponse inattendue : ' + JSON.stringify(data).slice(0, 200));
    const list = data.map(mapEvent).filter(e => /^\d{4}-\d{2}-\d{2}$/.test(e.date)).sort((a, b) => a.date.localeCompare(b.date));
    console.log(`Concerts Bandsintown : ${list.length}`);
    return list;
  } catch (e) { console.warn('Concerts : échec :', e.message); return null; }
}

async function main() {
  let prev = {};
  try { prev = JSON.parse(await readFile(OUT, 'utf8')); } catch {}
  const [n, ev] = await Promise.all([news(), events()]);
  const next = {
    news: n.length ? n : (prev.news || []),
    events: ev ?? (prev.events || []),
    eventsSource: ev ? 'Bandsintown' : (prev.eventsSource || null),
  };
  const same = JSON.stringify({ ...prev, updatedAt: undefined }) === JSON.stringify({ ...next, updatedAt: undefined });
  if (same) { console.log('Aucun changement.'); return; }
  next.updatedAt = new Date().toISOString();
  await writeFile(OUT, JSON.stringify(next, null, 1) + '\n');
  console.log(`live.json mis à jour : ${next.news.length} actus, ${next.events.length} concerts.`);
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch(e => { console.error(e); process.exit(1); });
