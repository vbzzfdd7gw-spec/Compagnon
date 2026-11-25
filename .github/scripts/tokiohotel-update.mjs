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
  const offers = (e.offers || []).filter(o => o.url).map(o => ({ l: (o.type === 'Tickets' ? 'Billets' : (o.type || 'Billets')) + ' (Bandsintown)', u: o.url, st: o.status || '' }));
  return {
    date: String(e.datetime || e.starts_at || '').slice(0, 10),
    time: String(e.datetime || '').slice(11, 16),
    city: v.city || '', country: v.country || '', region: v.region || '',
    venue: v.name || v.location || '', title: e.title || '', festival: !!(e.festival_start_date || e.festival_datetime_display_rule),
    lineup: e.lineup || [], url: e.url || '', offers,
    soldOut: offers.length > 0 && offers.every(o => /sold/i.test(o.st)),
  };
}

// ---- Dates du site officiel (tokiohotel.com) ----
const MON = { JAN:'01',FEB:'02',MAR:'03',APR:'04',MAY:'05',JUN:'06',JUL:'07',AUG:'08',SEP:'09',SEPT:'09',OCT:'10',NOV:'11',DEC:'12' };
const htmlText = h => decode(h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<br\s*\/?>|<\/(div|li|p|h\d|span|a|td|tr)>/gi, '\n').replace(/<[^>]+>/g, ' ')).replace(/[ \t\u00a0]+/g, ' ').replace(/\n\s*/g, '\n');

export function parseOfficial(html) {
  // Découpe la page en blocs commençant chacun par une date ; les liens « Tickets » d'un bloc appartiennent à cette date.
  const D = '(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEPT?|OCT|NOV|DEC)\\.?\\s+(\\d{1,2}),?\\s+(\\d{4})';
  const hits = [...html.matchAll(new RegExp(D, 'gi'))];
  const starts = [];
  for (const h of hits) {
    const prev = starts[starts.length - 1];
    // « JUL. 09, 2027 - JUL. 11, 2027 » : la 2e date fait partie du même bloc
    if (prev && /^[\s\-–]*$/.test(htmlText(html.slice(prev.end, h.index)))) { prev.end = h.index + h[0].length; continue; }
    starts.push({ m: h, idx: h.index, end: h.index + h[0].length });
  }
  const out = [];
  starts.forEach((b, i) => {
    const chunk = html.slice(b.end, i + 1 < starts.length ? starts[i + 1].idx : b.end + 4000);
    const links = [...chunk.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)]
      .filter(m => /ticket|billet/i.test(htmlText(m[2]))).map(m => decode(m[1])).filter(u => /^https?:/.test(u));
    const text = htmlText(chunk).replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
    const body = text.split(/\bTICKETS\b/i)[0].replace(/^[\s\-–]+/, '').trim().slice(0, 160);
    if (!body) return;
    const [, mon, day, year] = b.m;
    const date = `${year}-${MON[mon.toUpperCase()]}-${day.padStart(2, '0')}`;
    let title = '', place = body;
    const k = body.lastIndexOf(' - ');
    if (k > 0) { title = body.slice(0, k).trim(); place = body.slice(k + 3).trim(); }
    const [city, ...rest] = place.replace(/\b(sold\s*out|ausverkauft|complet|few tickets left|low tickets)\b/gi, '').split(',').map(x => x.replace(/\*/g, '').trim()).filter(Boolean);
    const offers = [...new Set(links)].map(u => ({ l: /bandsintown/i.test(u) ? 'Bandsintown' : 'Billets (site officiel)', u, st: '' }))
      .sort((a, b) => (a.l === 'Bandsintown') - (b.l === 'Bandsintown'));
    out.push({ date, time: '', city: city || place, country: rest.join(', '), region: '', venue: title, title, festival: /festival|fest\b/i.test(title),
      lineup: [], url: '', offers, soldOut: /sold\s*out|ausverkauft|complet/i.test(text.split(/\bTICKETS\b/i).slice(0, 2).join(' ')) });
  });
  // dédoublonne (même date + ville)
  const seen = new Set();
  return out.filter(e => { const k = e.date + norm(e.city); if (seen.has(k)) return false; seen.add(k); return true; });
}

async function official() {
  for (const url of ['https://tokiohotel.com/', 'https://tokiohotel.com/tour', 'https://tokiohotel.com/live', 'https://tokiohotel.com/tour-dates']) {
    try {
      const html = await get(url, 'text/html');
      const list = parseOfficial(html).filter(e => e.date >= new Date().toISOString().slice(0, 10));
      console.log(`Site officiel ${url} : ${list.length} dates`);
      if (!list.length) console.log('Extrait :', htmlText(html).replace(/\n+/g, ' | ').slice(0, 1500));
      if (list.length) return list;
    } catch (e) { console.warn('Site officiel', url, 'échec :', e.message); }
  }
  return null;
}

async function events() {
  const off = await official();
  if (off) return { list: off, source: 'le site officiel' };
  if (!process.env.BANDSINTOWN_APP_ID) return null;
  const url = `https://rest.bandsintown.com/artists/${encodeURIComponent('Tokio Hotel')}/events?app_id=${encodeURIComponent(APP_ID)}&date=upcoming`;
  try {
    const data = await get(url, 'application/json');
    if (!Array.isArray(data)) throw new Error('réponse inattendue : ' + JSON.stringify(data).slice(0, 200));
    const list = data.map(mapEvent).filter(e => /^\d{4}-\d{2}-\d{2}$/.test(e.date)).sort((a, b) => a.date.localeCompare(b.date));
    console.log(`Concerts Bandsintown : ${list.length}`);
    return { list, source: 'Bandsintown' };
  } catch (e) { console.warn('Concerts : échec :', e.message); return null; }
}

// ---- Traduction des titres en français (service Google Traduction public, sans clé ; MyMemory en secours) ----
async function translate(text) {
  try {
    const r = await fetch('https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=fr&dt=t&q=' + encodeURIComponent(text), { headers: { 'user-agent': UA } });
    if (r.ok) { const j = await r.json(); const t = (j[0] || []).map(x => x[0]).join('').trim(); if (t) return t; }
  } catch {}
  try {
    const r = await fetch('https://api.mymemory.translated.net/get?langpair=' + (/[äöüß]/i.test(text) ? 'de' : 'en') + '|fr&q=' + encodeURIComponent(text), { headers: { 'user-agent': UA } });
    if (r.ok) { const j = await r.json(); const t = j?.responseData?.translatedText; if (t && !/MYMEMORY WARNING|QUERY LENGTH/i.test(t)) return decode(t); }
  } catch {}
  return null;
}
async function translateNews(list, prev) {
  const known = new Map((prev || []).filter(n => n.fr).map(n => [n.u, n.fr]));
  let ok = 0, fail = 0;
  for (const n of list) {
    if (n.lang === 'fr') continue;
    if (known.has(n.u)) { n.fr = known.get(n.u); continue; }
    const t = await translate(n.t);
    if (t && t.toLowerCase() !== n.t.toLowerCase()) { n.fr = t; ok++; } else fail++;
    await new Promise(r => setTimeout(r, 250));
  }
  console.log(`Traductions : ${ok} nouvelles, ${fail} échecs`);
  return list;
}

async function main() {
  let prev = {};
  try { prev = JSON.parse(await readFile(OUT, 'utf8')); } catch {}
  const [n0, ev] = await Promise.all([news(), events()]);
  const n = await translateNews(n0, prev.news);
  const next = {
    news: n.length ? n : (prev.news || []),
    events: ev ? ev.list : (prev.events || []),
    eventsSource: ev ? ev.source : (prev.eventsSource || null),
  };
  const same = JSON.stringify({ ...prev, updatedAt: undefined }) === JSON.stringify({ ...next, updatedAt: undefined });
  if (same) { console.log('Aucun changement.'); return; }
  next.updatedAt = new Date().toISOString();
  await writeFile(OUT, JSON.stringify(next, null, 1) + '\n');
  console.log(`live.json mis à jour : ${next.news.length} actus, ${next.events.length} concerts.`);
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch(e => { console.error(e); process.exit(1); });
