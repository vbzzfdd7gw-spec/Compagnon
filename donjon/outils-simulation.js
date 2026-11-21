// Simulation d'expéditions complètes sans affichage, pour l'équilibrage.
const fs = require('fs'), vm = require('vm');
const D = require('path').join(__dirname, 'js') + '/';
const file = [];
const ctx = { DIFF_SIM: process.env.DIFF || '', SANS_ELITE: !!process.env.SANS_ELITE, SANS_PHASE: !!process.env.SANS_PHASE, localStorage: { getItem: () => null, setItem() {} }, console, Math, JSON, Object, Array, Set, Map, file, setTimeout: (f) => file.push(f), Reglages: { vitesse: 1 } };
vm.createContext(ctx);
for (const f of ['des.js', 'donnees/actions.js', 'donnees/classes.js', 'donnees/monstres.js', 'donnees/objets.js', 'donnees/etages.js', 'donnees/campagnes.js', 'donnees/sousclasses.js', 'combat.js', 'carte.js'])
  vm.runInContext(fs.readFileSync(D + f, 'utf8').replace(/^const (\w+) =/gm, 'var $1 =').replace(/^class (\w+)/gm, 'var $1 = class $1'), ctx);
// SANS_SC=1 : héros sans sous-classe (comparaison)
// CHAOS_SEUL=mutation|pouvoir|aucun : ne garde que cet effet du Chaos (comparaison)
if (process.env.CHAOS_SEUL) vm.runInContext(`var _ac = Combat.prototype.appliquerChaos; Combat.prototype.appliquerChaos = function (t, f) {
  _ac.call(this, t, f); const k = '${process.env.CHAOS_SEUL}';
  for (const m of this.ennemis) { m.chaos.mutations = m.chaos.mutations.filter(x => x === k); m.chaos.pouvoirs = m.chaos.pouvoirs.filter(x => x === k); } };`, ctx);
if (process.env.SANS_SC) vm.runInContext('appliquerSousClasse = pj => pj; niveauSousClasse = () => [];', ctx);
// SC_SEUL=classe[:sousclasse] : seule cette classe reçoit une sous-classe
if (process.env.SC_SEUL) vm.runInContext(`var _asc = appliquerSousClasse, _nsc = niveauSousClasse;
  var _sc = '${process.env.SC_SEUL}'.split(':');
  appliquerSousClasse = (pj, id) => pj.classe === _sc[0] ? _asc(pj, _sc[1] || id) : pj;
  niveauSousClasse = (pj, n) => pj.classe === _sc[0] ? _nsc(pj, n) : [];`, ctx);
vm.runInContext(`
function iaPJ(cb, a) {
  const dispo = id => cb.disponibilite(a, ACTIONS[id]).ok;
  const ids = [...a.actions, ...ACTIONS_COMMUNES, ...Object.keys(ACTIONS_SAC)].filter(id => id !== 'sac' && dispo(id));
  // Concentration : ne pas rompre un sort en cours ; rappeler la foudre gratuitement
  if (a.concentration) for (let i = ids.length - 1; i >= 0; i--) if (ACTIONS[ids[i]].concentration && !cb.relanceGratuite(a, ACTIONS[ids[i]])) ids.splice(i, 1);
  for (const id of ['appel_foudre', 'rayon_lune']) if (ids.includes(id) && cb.relanceGratuite(a, ACTIONS[id]) && !cb.pjs.some(p => p.pv <= 0)) { const cs = cb.ciblesValides(a, ACTIONS[id]).sort((x, y) => x.pv - y.pv); if (cs.length) return [ACTIONS[id], cs[0]]; }
  // 1) Soins si un allié est à terre ou bas
  const blesses = cb.pjs.filter(p => p.pv <= 0 || p.pv < p.pvMax * 0.35).sort((x, y) => x.pv / x.pvMax - y.pv / y.pvMax);
  if (blesses.length) {
    for (const id of ['baume_ete', 'main_guerison', 'priere_soins', 'imposition', 'mot_guerison', 'elixir', 'soins', 'second_souffle', 'plenitude', 'cri_ralliement', 'potion_sup', 'potion']) {
      if (!ids.includes(id)) continue;
      const act = ACTIONS[id];
      if ((id === 'second_souffle' || id === 'plenitude') && a.pv > a.pvMax * 0.5) continue;
      if (id === 'potion' && blesses[0].pv > 0 && Math.random() < 0.5) continue;
      const cibles = cb.ciblesValides(a, act);
      const c = act.zone || act.cible === 'soi' ? null : (cibles.find(x => x === blesses[0]) || cibles[0]);
      return [act, c];
    }
  }
  // 1 bis) Capacités de soutien utiles
  if (ids.includes('rage') && !a.etats.rage) return [ACTIONS.rage, null];
  for (const b of ['forme_ours', 'arme_sacree', 'pas_ombre', 'canon_occulte', 'esprit_combatif']) if (ids.includes(b) && !(b === 'pas_ombre' && a.etats.cache)) return [ACTIONS[b], null];
  if (ids.includes('sort_intensifie') && cb.emplacementDispo(a, 1)) return [ACTIONS.sort_intensifie, null];
  if (ids.includes('sort_jumele') && cb.ennemis.filter(e => e.pv > 0).length > 1) return [ACTIONS.sort_jumele, null];
  if (ids.includes('source_magie') && a.emplacements[1] && a.emplacements[1].restant < a.emplacements[1].max) return [ACTIONS.source_magie, null];
  if (ids.includes('infusion_arme')) { const cs = cb.ciblesValides(a, ACTIONS.infusion_arme).filter(p => !p.etats.infuse && p.bonusArme >= 5 && p.ligne === 'avant'); if (cs.length) return [ACTIONS.infusion_arme, cs[0]]; }
  if (ids.includes('manteau_inspiration') && cb.pjs.filter(p => p.pv > 0 && p.pv < p.pvMax * 0.7).length >= 2) return [ACTIONS.manteau_inspiration, null];
  if (ids.includes('aide') && cb.pjs.filter(p => p.pv > 0 && p.pv < p.pvMax * 0.6).length >= 2) return [ACTIONS.aide, null];
  if (ids.includes('voeu_inimitie')) { const cs = cb.ciblesValides(a, ACTIONS.voeu_inimitie).sort((x, y) => y.pv - x.pv); if (cs.length) return [ACTIONS.voeu_inimitie, cs[0]]; }
  for (const mq of ['marque_chasseur', 'malefice']) if (ids.includes(mq) && !cb.ennemis.some(e => e.marquePar === a.id && e.pv > 0)) {
    const cs = cb.ciblesValides(a, ACTIONS[mq]).sort((x, y) => y.pv - x.pv); if (cs.length) return [ACTIONS[mq], cs[0]];
  }
  if (ids.includes('inspiration') && Math.random() < 0.3) { const cs = cb.ciblesValides(a, ACTIONS.inspiration).filter(p => !p.etats.inspire && p !== a); if (cs.length) return [ACTIONS.inspiration, cs[0]]; }
  if (ids.includes('chant_courage') && cb.pjs.some(p => p.peur >= 60)) return [ACTIONS.chant_courage, null];
  if (ids.includes('bannissement') && Math.random() < 0.6) { const cs = cb.ciblesValides(a, ACTIONS.bannissement).sort((x, y) => y.pv - x.pv); if (cs.length && cs[0].pv > 30) return [ACTIONS.bannissement, cs[0]]; }
  // 2) Attaque : meilleure espérance de dégâts sur la cible la plus fragile
  let meilleur = null, score = -1;
  for (const id of ids) {
    const act = ACTIONS[id];
    if (act.cible !== 'ennemi') continue;
    if (act.niveau && Math.random() < 0.45) continue;    // économiser les emplacements
    if (act.consommable && Math.random() < 0.75) continue; // garder les consommables
    const cibles = cb.ciblesValides(a, act);
    if (!cibles.length) continue;
    const moy = act.degats ? Des.moyenne(act.degats) * (act.nbAttaques || 1) : (act.effetSiEchec ? 7 : 2);
    const s = moy * cb.nombreAttaques(a, act) / (act.nbAttaques || 1) * (act.zone ? cibles.length : act.triangle ? Math.min(act.triangle, cibles.length) : 1) * (act.type === 'auto' ? 1.2 : 0.65) + (act.sournoise ? 4 : 0);
    if (s > score) { score = s; meilleur = [act, act.zone ? null : cibles.sort((x, y) => x.pv - y.pv)[0]]; }
  }
  if (meilleur) return meilleur;
  if (ids.includes('benediction') && Math.random() < 0.5) return [ACTIONS.benediction, null];
  if (ids.includes('changer_ligne') && a.ligne === 'arriere' && a.actions.some(i => ACTIONS[i].depuis.length === 1 && ACTIONS[i].depuis[0] === 'avant')) return [ACTIONS.changer_ligne, null];
  return [ACTIONS.esquiver, null];
}
function combattre(equipe, rencontre, jeu, force) {
  const cb = new Combat(equipe, rencontre, jeu, force);
  cb.surMaj = () => 0; cb.delaiMonstre = 0;
  if (jeu.chaos) cb.appliquerChaos(jeu.typeCombat, jeu.final);
  else if (DIFF_SIM && difficulte(DIFF_SIM).chaos) cb.appliquerChaos(jeu.typeCombat, jeu.final, difficulte(DIFF_SIM).chaos);
  else if (jeu.typeCombat === 'elite' && !SANS_ELITE) cb.appliquerChaos(jeu.typeCombat, jeu.final, ELITE_MUTEE);
  if (jeu.final && jeu.typeCombat === 'boss' && !SANS_PHASE) { cb.bossFinal = true; cb.renfortsPhase = jeu.renfortsPhase || []; }
  let fin = null; cb.surFin = r => { fin = r; };
  cb.demarrer();
  let garde = 0;
  while (!fin && garde++ < 20000) {
    if (cb.attenteJoueur && cb.actif) { const [act, c] = iaPJ(cb, cb.actif); cb.jouer(cb.actif, act, c); }
    const f = file.shift(); if (f) f(); else if (!cb.attenteJoueur) break;
  }
  file.length = 0;
  return { fin, rounds: cb.round };
}
function expedition(idC, classes, scs) {
  const camp = CAMPAGNES.find(c => c.id === idC);
  const ETAGES = camp.aleatoire ? genererEtagesAleatoires() : camp.etages;
  const equipe = (classes || ORDRE_CLASSES).map((k, i) => creerPJ(k, scs ? scs[i] : null));
  if (camp.aleatoire) equipe.forEach(p => { monterNiveau(p); resoudreChoixSorts(p, true); p.ressources = ressourcesPJ(p); p.pv = p.pvMax; });
  let xp = camp.aleatoire ? SEUILS_XP[4] : 0;
  const gagnerXP = n => { xp += n; const c = niveauPourXP(xp); for (const p of equipe) { while (p.niveau < c && monterNiveau(p).length); resoudreChoixSorts(p, true); } };
  if (!equipe.some(p => p.ligne === 'avant')) equipe[0].ligne = 'avant';
  if (!equipe.some(p => p.ligne === 'arriere')) equipe[3].ligne = 'arriere';
  const jeu = { potions: camp.regles.potions, peurMult: camp.regles.peurMult + (DIFF_SIM ? difficulte(DIFF_SIM).peur : 0), or: camp.regles.or || 30, equipe, sac: {},
    stock(c) { return c === 'potion' ? this.potions : (this.sac[c] || 0); },
    ajouterStock(c, n = 1) { if (c === 'potion') this.potions += n; else this.sac[c] = (this.sac[c] || 0) + n; },
    retirerStock(c) { if (c === 'potion') this.potions--; else this.sac[c]--; } }; let long = false;
  const log = [];
  for (let etage = 0; etage < ETAGES.length; etage++) {
    const carte = Carte.generer();
    const R = ETAGES[etage].rencontres;
    while (true) {
      const acc = Carte.accessibles(carte);
      const n = Carte.noeud(carte, acc[Math.floor(Math.random() * acc.length)]);
      carte.position = n.id;
      if (['combat', 'elite', 'boss'].includes(n.type)) {
        const liste = n.type === 'combat' ? R[Carte.niveau(n)] : R[n.type];
        const pvAvant = equipe.reduce((s, p) => s + Math.max(0, p.pv) / p.pvMax, 0) / 4;
        let renc = liste[Math.floor(Math.random() * liste.length)];
        if (n.type === 'elite' && !camp.aleatoire && !SANS_ELITE) renc = renforcerElite(renc, etage);
        jeu.chaos = camp.aleatoire; jeu.typeCombat = n.type; jeu.final = etage === ETAGES.length - 1;
        jeu.renfortsPhase = [...new Set([...(R.facile || []), ...(R.moyen || [])].flatMap(r => [...r.avant, ...r.arriere]))];
        const r = combattre(equipe, renc, jeu, camp.aleatoire ? renc.force || ETAGES[etage].force : forceEtage(renc.force || ETAGES[etage].force, etage));
        const pvApres = equipe.reduce((s, p) => s + Math.max(0, p.pv) / p.pvMax, 0) / 4;
        PERTES[etage + n.type] = PERTES[etage + n.type] || [];
        PERTES[etage + n.type].push(pvAvant - pvApres);
        if (r.fin !== 'victoire') return { ok: false, mort: (etage + 1) + ':' + n.type, log };
        const [omin, omax] = GAINS_OR[n.type]; jeu.or += omin + Math.floor(Math.random() * (omax - omin + 1));
        NIVEAUX_BOSS[etage] = NIVEAUX_BOSS[etage] || []; if (n.type === 'boss') { NIVEAUX_BOSS[etage].push(equipe[0].niveau); XP_BOSS[etage] = (XP_BOSS[etage] || []).concat(xp); }
        if (!(n.type === 'boss' && etage === ETAGES.length - 1)) gagnerXP(GAINS_XP[n.type]);
        if (n.type === 'boss') break;
        if (n.type === 'elite') jeu.potions++; else if (Math.random() < 0.3) jeu.potions++;
        const offres = Recompenses.generer(equipe, { elite: n.type === 'elite' });
        const pjDe = o => equipe.find(p => p.id === o.pj);
        const o = offres.find(x => x.categorie !== 'action') || offres[0];
        const pj = equipe.find(p => p.id === o.pj);
        if (o.categorie === 'action') { apprendre(pj, o.cle); } else Recompenses.appliquer(o, pj, jeu);
      } else if (n.type === 'repos') {
        const moy = equipe.reduce((s, p) => s + Math.max(0, p.pv) / p.pvMax, 0) / 4;
        if (!long && (moy < 0.55 || n.rangee >= 6)) {
          long = true;
          for (const p of equipe) {
            p.pv = Math.min(p.pvMax, Math.max(0, p.pv) + Math.ceil(p.pvMax / 2));
            p.peur = Math.max(0, p.peur - 40); if (p.peur < 50) p.crise = null;
            p.desVie.restant = Math.min(p.desVie.max, p.desVie.restant + Math.ceil(p.desVie.max / 2));
            for (const k in p.emplacements) p.emplacements[k].restant = p.emplacements[k].max;
            p.ressources = ressourcesPJ(p);
          }
        } else for (const p of equipe) {
          if (p.pv <= 0) p.pv = 1; p.peur = Math.max(0, p.peur - 15); if (p.peur < 50) p.crise = null;
          reposCourtPJ(p);
          while (p.desVie.restant > 0 && p.pv < p.pvMax * 0.7) { p.desVie.restant--; p.pv = Math.min(p.pvMax, p.pv + Math.max(1, Des.lancer('1d' + p.desVie.face).total + modCarac(p.caracs.CON))); }
        }
      } else if (n.type === 'marchand') {
        const stock = Marchand.generer(equipe);
        const moy = equipe.reduce((s, p) => s + Math.max(0, p.pv) / p.pvMax, 0) / 4;
        const ordre = [moy < 0.6 ? 'soin' : null, 'objet', 'consommable', 'amelioration', 'consommable'].filter(Boolean);
        for (const cat of ordre) {
          const a = stock.find(x => x.categorie === cat && !x.vendu && jeu.or >= x.prix);
          if (!a) continue;
          jeu.or -= a.prix; Marchand.appliquer(a, jeu); if (!(a.stock && --a.stock > 0)) a.vendu = true;
        }
      } else if (n.type === 'tresor' && camp.regles.mimiques && Math.random() < camp.regles.mimiques) {
        jeu.chaos = camp.aleatoire; jeu.typeCombat = 'elite'; jeu.final = etage === ETAGES.length - 1;
        const r = combattre(equipe, { avant: ['mimique'], arriere: [] }, jeu, forceEtage(ETAGES[etage].force, etage));
        if (r.fin !== 'victoire') return { ok: false, mort: (etage + 1) + ':mimique', log };
        gagnerXP(GAINS_XP.elite);
        jeu.potions++;
        const o = Recompenses.offreObjet(equipe, [], 'elite'); if (o) Recompenses.appliquer(o, equipe.find(p => p.id === o.pj), jeu);
      } else if (n.type === 'tresor') {
        jeu.or += 45 + Math.floor(Math.random() * 26);
        jeu.potions++;
        const o = Recompenses.offreObjet(equipe, [], 'tresor'); if (o) Recompenses.appliquer(o, equipe.find(p => p.id === o.pj), jeu);
        const x = Recompenses.offreConsommable(); jeu.ajouterStock(x.cle, x.quantite);
      }
    }
    if (etage < ETAGES.length - 1) { equipe.forEach(p => { p.pv = p.pvMax; p.desVie.restant = p.desVie.max; for (const k in p.emplacements) p.emplacements[k].restant = p.emplacements[k].max; p.peur = 0; p.crise = null; p.ressources = ressourcesPJ(p); }); long = false; jeu.potions++; jeu.or += 90; }
  }
  return { ok: true, log };
}
var PERTES = {}; var NIVEAUX_BOSS = {}; var XP_BOSS = {};
`, ctx);
const N = parseInt(process.argv[2] || '200');
const CAMP = process.argv[3] || 'crypte';
const MODE = process.argv[4] || '';     // 'classes' : équipes aléatoires et bilan par classe
if (MODE === 'classes' || MODE === 'sousclasses') {
  const SC = vm.runInContext('SOUS_CLASSES', ctx);
  const stats = {}; let total = 0;
  const toutes = vm.runInContext('TOUTES_CLASSES', ctx);
  for (let i = 0; i < N; i++) {
    // Équipe « raisonnable » : au moins un héros de front et un soigneur
    let equipe;
    do { equipe = toutes.slice().sort(() => Math.random() - 0.5).slice(0, 4); }
    while (!equipe.some(c => vm.runInContext(`CLASSES['${c}'].ligne`, ctx) === 'avant') || !equipe.some(c => vm.runInContext('SOIGNEURS', ctx).includes(c)));
    const scs = equipe.map(c => MODE === 'sousclasses' ? SC[c][Math.floor(Math.random() * SC[c].length)].id : SC[c][0].id);
    const r = vm.runInContext(`expedition('${CAMP}', ${JSON.stringify(equipe)}, ${JSON.stringify(scs)})`, ctx);
    total += r.ok ? 1 : 0;
    equipe.forEach((c, i) => { const k = MODE === 'sousclasses' ? c + '/' + scs[i] : c; stats[k] = stats[k] || { n: 0, v: 0 }; stats[k].n++; stats[k].v += r.ok ? 1 : 0; });
  }
  console.log(`Équipes aléatoires : ${Math.round(total / N * 100)} % de victoires (${N} expéditions)`);
  for (const [c, x] of Object.entries(stats).sort((a, b) => b[1].v / b[1].n - a[1].v / a[1].n))
    console.log(`  ${c.padEnd(24)} ${String(Math.round(x.v / x.n * 100)).padStart(3)} %  (dans ${x.n} équipes)`);
  process.exit(0);
}
let gagne = 0; const morts = {};
for (let i = 0; i < N; i++) {
  const r = vm.runInContext(`expedition('${CAMP}')`, ctx);
  if (r.ok) gagne++; else morts[r.mort.split('@')[0]] = (morts[r.mort.split('@')[0]] || 0) + 1;
}
console.log(`Victoires : ${gagne}/${N} (${Math.round(gagne / N * 100)} %) ; défaites (étage:type) :`, JSON.stringify(morts));
const P = vm.runInContext('PERTES', ctx);
const NB = vm.runInContext('NIVEAUX_BOSS', ctx); console.log('Niveau moyen au boss de chaque étage :', Object.entries(NB).map(([k, v]) => (+k + 1) + '=' + (v.reduce((a, b) => a + b, 0) / v.length).toFixed(2)).join(' '));
console.log('PV perdus en moyenne par combat (% de l\'équipe) :', Object.entries(P).map(([k, v]) => k + '=' + Math.round(v.reduce((a, b) => a + b, 0) / v.length * 100)).join(' '));
if (process.env.XP) { const X = vm.runInContext('XP_BOSS', ctx); console.log('XP au boss :', Object.entries(X).map(([k, v]) => { v.sort((a, b) => a - b); return (+k + 1) + '= méd ' + v[v.length >> 1] + ' (10 % ' + v[Math.floor(v.length * 0.1)] + ', 90 % ' + v[Math.floor(v.length * 0.9)] + ')'; }).join(' | ')); }
