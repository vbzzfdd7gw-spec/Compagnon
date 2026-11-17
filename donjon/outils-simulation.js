// Simulation d'expéditions complètes sans affichage, pour l'équilibrage.
const fs = require('fs'), vm = require('vm');
const D = require('path').join(__dirname, 'js') + '/';
const file = [];
const ctx = { localStorage: { getItem: () => null, setItem() {} }, console, Math, JSON, Object, Array, Set, Map, file, setTimeout: (f) => file.push(f), Reglages: { vitesse: 1 } };
vm.createContext(ctx);
for (const f of ['des.js', 'donnees/actions.js', 'donnees/classes.js', 'donnees/monstres.js', 'donnees/objets.js', 'donnees/etages.js', 'donnees/campagnes.js', 'combat.js', 'carte.js'])
  vm.runInContext(fs.readFileSync(D + f, 'utf8').replace(/^const (\w+) =/gm, 'var $1 =').replace(/^class (\w+)/gm, 'var $1 = class $1'), ctx);
vm.runInContext(`
function iaPJ(cb, a) {
  const dispo = id => cb.disponibilite(a, ACTIONS[id]).ok;
  const ids = [...a.actions, ...ACTIONS_COMMUNES].filter(dispo);
  // 1) Soins si un allié est à terre ou bas
  const blesses = cb.pjs.filter(p => p.pv <= 0 || p.pv < p.pvMax * 0.35).sort((x, y) => x.pv / x.pvMax - y.pv / y.pvMax);
  if (blesses.length) {
    for (const id of ['priere_soins', 'mot_guerison', 'soins', 'second_souffle', 'cri_ralliement', 'potion']) {
      if (!ids.includes(id)) continue;
      const act = ACTIONS[id];
      if (id === 'second_souffle' && a.pv > a.pvMax * 0.5) continue;
      if (id === 'potion' && blesses[0].pv > 0 && Math.random() < 0.5) continue;
      const cibles = cb.ciblesValides(a, act);
      const c = act.zone || act.cible === 'soi' ? null : (cibles.find(x => x === blesses[0]) || cibles[0]);
      return [act, c];
    }
  }
  // 2) Attaque : meilleure espérance de dégâts sur la cible la plus fragile
  let meilleur = null, score = -1;
  for (const id of ids) {
    const act = ACTIONS[id];
    if (act.cible !== 'ennemi') continue;
    if (act.niveau && Math.random() < 0.45) continue;    // économiser les emplacements
    const cibles = cb.ciblesValides(a, act);
    if (!cibles.length) continue;
    const moy = act.degats ? Des.moyenne(act.degats) * (act.nbAttaques || 1) : 6;
    const s = moy * (act.zone ? cibles.length : 1) * (act.type === 'auto' ? 1.2 : 0.65) + (act.sournoise ? 4 : 0);
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
function expedition(idC) {
  const camp = CAMPAGNES.find(c => c.id === idC);
  const ETAGES = camp.etages;
  const equipe = ORDRE_CLASSES.map(creerPJ);
  const jeu = { potions: camp.regles.potions, peurMult: camp.regles.peurMult, or: 30, equipe }; let long = false;
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
        const r = combattre(equipe, liste[Math.floor(Math.random() * liste.length)], jeu, ETAGES[etage].force);
        const pvApres = equipe.reduce((s, p) => s + Math.max(0, p.pv) / p.pvMax, 0) / 4;
        PERTES[etage + n.type] = PERTES[etage + n.type] || [];
        PERTES[etage + n.type].push(pvAvant - pvApres);
        if (r.fin !== 'victoire') return { ok: false, mort: (etage + 1) + ':' + n.type, log };
        const [omin, omax] = GAINS_OR[n.type]; jeu.or += omin + Math.floor(Math.random() * (omax - omin + 1));
        if (n.type === 'boss') break;
        if (n.type === 'elite') jeu.potions++; else if (Math.random() < 0.3) jeu.potions++;
        const offres = Recompenses.generer(equipe, { elite: n.type === 'elite' });
        const o = offres.find(x => x.categorie !== 'action') || offres[0];
        const pj = equipe.find(p => p.id === o.pj);
        if (o.categorie === 'action') { if (pj.actions.length >= MAX_ACTIONS) pj.actions.shift(); pj.actions.push(o.cle); } else Recompenses.appliquer(o, pj);
      } else if (n.type === 'repos') {
        const moy = equipe.reduce((s, p) => s + Math.max(0, p.pv) / p.pvMax, 0) / 4;
        if (!long && (moy < 0.55 || n.rangee >= 6)) {
          long = true;
          for (const p of equipe) { p.pv = p.pvMax; p.peur = 0; p.desVie.restant = p.desVie.max; for (const k in p.emplacements) p.emplacements[k].restant = p.emplacements[k].max; }
        } else for (const p of equipe) {
          if (p.pv <= 0) p.pv = 1; p.peur = Math.max(0, p.peur - 10);
          while (p.desVie.restant > 0 && p.pv < p.pvMax * 0.7) { p.desVie.restant--; p.pv = Math.min(p.pvMax, p.pv + Math.max(1, Des.lancer('1d' + p.desVie.face).total + modCarac(p.caracs.CON))); }
        }
      } else if (n.type === 'marchand') {
        const stock = Marchand.generer(equipe);
        const moy = equipe.reduce((s, p) => s + Math.max(0, p.pv) / p.pvMax, 0) / 4;
        const ordre = [moy < 0.6 ? 'soin' : null, 'objet', 'potion', 'amelioration', 'potion'].filter(Boolean);
        for (const cat of ordre) {
          const a = stock.find(x => x.categorie === cat && !x.vendu && jeu.or >= x.prix);
          if (!a) continue;
          jeu.or -= a.prix; Marchand.appliquer(a, jeu); if (!(a.quantite && --a.quantite > 0)) a.vendu = true;
        }
      } else if (n.type === 'tresor') {
        jeu.or += 45 + Math.floor(Math.random() * 26);
        jeu.potions++;
        const o = Recompenses.offreObjet(equipe); if (o) Recompenses.appliquer(o, equipe.find(p => p.id === o.pj));
      }
    }
    if (etage < ETAGES.length - 1) { equipe.forEach(p => { monterNiveau(p); p.peur = 0; }); long = false; jeu.potions++; jeu.or += 90; }
  }
  return { ok: true, log };
}
var PERTES = {};
`, ctx);
const N = parseInt(process.argv[2] || '200');
const CAMP = process.argv[3] || 'crypte';
let gagne = 0; const morts = {};
for (let i = 0; i < N; i++) {
  const r = vm.runInContext(`expedition('${CAMP}')`, ctx);
  if (r.ok) gagne++; else morts[r.mort.split('@')[0]] = (morts[r.mort.split('@')[0]] || 0) + 1;
}
console.log(`Victoires : ${gagne}/${N} (${Math.round(gagne / N * 100)} %) ; défaites (étage:type) :`, JSON.stringify(morts));
const P = vm.runInContext('PERTES', ctx);
console.log('PV perdus en moyenne par combat (% de l\'équipe) :', Object.entries(P).map(([k, v]) => k + '=' + Math.round(v.reduce((a, b) => a + b, 0) / v.length * 100)).join(' '));
