// =====================================================================
// Carte d'un étage avec embranchements.
// Rangée 0 = départ (en bas), dernière rangée = boss (en haut).
// =====================================================================

const TYPES_NOEUDS = {
  combat: { nom: 'Combat', icone: '⚔️' },
  elite: { nom: 'Élite', icone: '💀' },
  repos: { nom: 'Feu de camp', icone: '🔥' },
  marchand: { nom: 'Marchand', icone: '🛒' },
  tresor: { nom: 'Trésor', icone: '💰' },
  evenement: { nom: 'Événement', icone: '❓' },
  boss: { nom: 'Boss', icone: '👑' }
};

const CONFIG_CARTE = {
  rangees: 15,         // 0..14 : 14 = boss, 13 = feu de camp garanti
  rangeeTresor: 7,     // rangée de trésors au milieu de l'étage
  colonnes: 5,
  chemins: 6,          // nombre de chemins tracés de bas en haut (ils se croisent et se rejoignent)
  poids: [             // tirage des salles intermédiaires
    { type: 'combat', poids: 35 },
    { type: 'evenement', poids: 21 },
    { type: 'elite', poids: 15, rangMin: 4 },
    { type: 'repos', poids: 13, rangMin: 3, rangMax: 11 },
    { type: 'marchand', poids: 10, rangMin: 2, rangMax: 12 },
    { type: 'tresor', poids: 4, rangMin: 2 }
  ],
  // Types qu'on ne veut pas deux fois de suite sur un même chemin
  pasDeuxFois: ['elite', 'repos', 'marchand', 'tresor'],
  minimum: { elite: 3, marchand: 2, repos: 2 }   // au moins autant par étage (hors feu final)
};

const Carte = {
  // Carte double (mode Chaos) : deux cartes l'une au-dessus de l'autre, le boss
  // de la première ouvre sur tout le départ de la seconde.
  genererDouble() {
    const a = this.generer(), b = this.generer(), R = CONFIG_CARTE.rangees, n = a.noeuds.length;
    for (const x of b.noeuds) { x.id += n; x.rangee += R; x.liens = x.liens.map(i => i + n); }
    const boss = a.noeuds.find(x => x.type === 'boss');
    boss.liens = b.noeuds.filter(x => x.rangee === R).map(x => x.id);
    return { noeuds: [...a.noeuds, ...b.noeuds], position: null, rangees: 2 * R, double: true };
  },

  generer() {
    const R = CONFIG_CARTE.rangees, C = CONFIG_CARTE.colonnes;
    const grille = {};                       // "r,c" → nœud
    let id = 0;
    const noeud = (r, c) => {
      const k = r + ',' + c;
      if (!grille[k]) grille[k] = { id: id++, rangee: r, col: c, type: null, liens: [], visite: false, decalage: (Math.random() - 0.5) * 16 };
      return grille[k];
    };
    const liens = new Set();                 // "r,c1>c2"
    // Deux liens entre les mêmes rangées ne doivent pas se croiser
    const croise = (r, c1, c2) => [...liens].some(l => {
      const [rr, rest] = l.split(','); if (+rr !== r) return false;
      const [a, b] = rest.split('>').map(Number);
      return (a < c1 && b > c2) || (a > c1 && b < c2);
    });

    // Tracé des chemins (départs répartis sur la largeur)
    const departs = Des.melanger([0, 1, 2, 3, 4, 0, 1, 2, 3, 4]).slice(0, CONFIG_CARTE.chemins);
    if (new Set(departs).size < 3) departs.splice(0, 3, 0, 2, 4);
    for (const d of departs) {
      let c = d;
      noeud(0, c);
      for (let r = 0; r < R - 2; r++) {
        const options = Des.melanger([c - 1, c, c + 1].filter(x => x >= 0 && x < C));
        let suivant = options.find(x => !croise(r, c, x)) ?? c;
        liens.add(`${r},${c}>${suivant}`);
        noeud(r + 1, suivant);
        c = suivant;
      }
    }
    // Boss au sommet, relié à toute la rangée précédente
    const boss = noeud(R - 1, (C - 1) / 2);
    for (const l of liens) {
      const [r, rest] = l.split(','); const [a, b] = rest.split('>').map(Number);
      const n = grille[`${r},${a}`], m = grille[`${+r + 1},${b}`];
      if (!n.liens.includes(m.id)) n.liens.push(m.id);
    }
    const tous = Object.values(grille);
    tous.filter(n => n.rangee === R - 2).forEach(n => n.liens.push(boss.id));
    const parId = {};
    tous.forEach(n => { parId[n.id] = n; });
    const parents = n => tous.filter(p => p.liens.includes(n.id));

    // Types de salles
    tous.sort((a, b) => a.rangee - b.rangee);
    for (const n of tous) {
      const r = n.rangee;
      if (n === boss) { n.type = 'boss'; continue; }
      if (r === R - 2) { n.type = 'repos'; continue; }
      if (r === 0) { n.type = 'combat'; continue; }
      if (r === CONFIG_CARTE.rangeeTresor) { n.type = 'tresor'; continue; }
      const interdits = new Set(parents(n).map(p => p.type).filter(t => CONFIG_CARTE.pasDeuxFois.includes(t)));
      if (r === R - 3) interdits.add('repos');            // pas de feu juste avant le feu final
      if (r === CONFIG_CARTE.rangeeTresor - 1 || r === CONFIG_CARTE.rangeeTresor + 1) interdits.add('tresor');
      const poss = CONFIG_CARTE.poids.filter(p => !interdits.has(p.type)
        && (p.rangMin === undefined || r >= p.rangMin) && (p.rangMax === undefined || r <= p.rangMax));
      n.type = Des.pondere(poss).type;
    }
    // Minimums garantis (on transforme des combats ordinaires)
    for (const [type, min] of Object.entries(CONFIG_CARTE.minimum)) {
      const regle = CONFIG_CARTE.poids.find(p => p.type === type);
      let manque = min - tous.filter(n => n.type === type && n.rangee < R - 2).length;
      const cand = Des.melanger(tous.filter(n => n.type === 'combat' && n.rangee >= (regle.rangMin || 1) && n.rangee <= (regle.rangMax ?? R - 3)
        && !parents(n).some(p => p.type === type) && !n.liens.some(i => parId[i].type === type)));
      while (manque-- > 0 && cand.length) cand.pop().type = type;
    }
    return { noeuds: tous, position: null, rangees: R };
  },

  noeud(carte, id) { return carte.noeuds.find(n => n.id === id); },

  // Nœuds accessibles depuis la position actuelle
  accessibles(carte) {
    if (carte.position === null) return carte.noeuds.filter(n => n.rangee === 0).map(n => n.id);
    return this.noeud(carte, carte.position).liens.slice();
  },

  // Difficulté des combats selon la rangée
  niveau(noeud) { return noeud.rangee % CONFIG_CARTE.rangees <= 4 ? 'facile' : 'moyen'; },

  // Rendu SVG façon carte au trésor : parchemin, chemins à l'encre, médaillons, croquis du thème
  svg(carte) {
    const R = carte.rangees;
    const L = 340, E = 64, H = R * E + 40;
    const pos = n => ({
      x: 40 + (n.col / (CONFIG_CARTE.colonnes - 1)) * (L - 80) + n.decalage,
      y: H - 34 - n.rangee * E
    });
    const acc = this.accessibles(carte);
    // Thème de chaque moitié (carte double du Chaos) pour les croquis
    const themeA = r => {
      try { const et = Jeu.etages(); return (carte.double ? et[Math.min(et.length - 1, Math.floor(r / CONFIG_CARTE.rangees))] : Jeu.etageCourant()).theme; } catch (e) { return 'crypte'; }
    };
    let graine = carte.noeuds.length * 7919 + (carte.noeuds[0] ? Math.round(carte.noeuds[0].decalage * 100) : 0);
    const alea = () => (graine = (graine * 9301 + 49297) % 233280) / 233280;
    // Croquis à l'encre dans les espaces vides
    const pts = carte.noeuds.map(pos);
    let croquis = '';
    for (let y = 30; y < H - 20; y += 34) for (let x = 18; x < L - 10; x += 38) {
      const cx = x + (alea() - 0.5) * 16, cy = y + (alea() - 0.5) * 16;
      if (pts.some(p => Math.hypot(p.x - cx, p.y - cy) < 34) || alea() < 0.45) continue;
      const theme = themeA(Math.round((H - 34 - cy) / E));
      const liste = CROQUIS_THEMES[theme] || CROQUIS_THEMES.crypte;
      croquis += `<g transform="translate(${cx.toFixed(1)},${cy.toFixed(1)}) scale(${(0.8 + alea() * 0.5).toFixed(2)})">${CROQUIS[liste[Math.floor(alea() * liste.length)]]}</g>`;
    }
    // Chemins : courbes à l'encre
    let lignes = '';
    for (const n of carte.noeuds) {
      const p = pos(n);
      for (const lid of n.liens) {
        const m = this.noeud(carte, lid), q = pos(m);
        const parcouru = n.visite && m.visite;
        const possible = carte.position === n.id && acc.includes(lid);
        const mx = (p.x + q.x) / 2 + (q.y - p.y) * 0.08 * (n.col % 2 ? 1 : -1), my = (p.y + q.y) / 2;
        lignes += `<path d="M${p.x},${p.y} Q${mx.toFixed(1)},${my.toFixed(1)} ${q.x},${q.y}" class="lien${parcouru ? ' parcouru' : ''}${possible ? ' possible' : ''}"/>`;
      }
    }
    // Salles : médaillons colorés selon leur type
    let cercles = '';
    for (const n of carte.noeuds) {
      const p = pos(n);
      const t = TYPES_NOEUDS[n.type];
      const classes = ['noeud', 't-' + n.type];
      if (n.visite) classes.push('visite');
      if (acc.includes(n.id)) classes.push('accessible');
      if (carte.position === n.id) classes.push('actuel');
      const r = n.type === 'boss' ? 27 : 19;
      const pion = carte.position === n.id
        ? `<g class="pion" transform="translate(0,${-r - 4})"><path d="M0,0 C-9,-10 -9,-22 0,-24 C9,-22 9,-10 0,0Z" fill="#b8282a" stroke="#3a1008" stroke-width="1.5"/><circle cy="-15" r="4" fill="#fff4d8"/></g>` : '';
      cercles += `<g class="${classes.join(' ')}" data-noeud="${n.id}" transform="translate(${p.x},${p.y})">
        <circle class="ombre-noeud" r="${r}" cy="2.5"/>
        <circle class="fond-noeud" r="${r}" fill="url(#med-${n.type})"/>
        <circle class="bord-noeud" r="${r - 3.5}"/>
        <text y="1" font-size="${n.type === 'boss' ? 25 : 18}">${t.icone}</text>
        ${n.visite && carte.position !== n.id ? `<path class="coche" d="M${-r * 0.55},${-r * 0.1} L${-r * 0.1},${r * 0.45} L${r * 0.6},${-r * 0.55}"/>` : ''}
        ${pion}<title>${t.nom}</title></g>`;
    }
    const degrades = Object.entries(COULEURS_NOEUDS).map(([k, [c1, c2]]) =>
      `<radialGradient id="med-${k}" cx="40%" cy="35%" r="70%"><stop offset="0%" stop-color="${c1}"/><stop offset="100%" stop-color="${c2}"/></radialGradient>`).join('');
    return `<svg class="carte-svg" viewBox="0 0 ${L} ${H}" preserveAspectRatio="xMidYMid meet">
      <defs>${degrades}
        <radialGradient id="parchemin" cx="50%" cy="50%" r="75%"><stop offset="0%" stop-color="#ead7ab"/><stop offset="70%" stop-color="#d4b47a"/><stop offset="100%" stop-color="#8a6230"/></radialGradient>
        <filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4"/><feColorMatrix values="0 0 0 0 0.35  0 0 0 0 0.22  0 0 0 0 0.08  0 0 0 0.18 0"/></filter>
        <filter id="taches" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="3" seed="9"/><feColorMatrix values="0 0 0 0 0.45  0 0 0 0 0.3  0 0 0 0 0.12  0 0 0 0.9 -0.35"/></filter>
      </defs>
      <rect width="${L}" height="${H}" fill="url(#parchemin)"/>
      <rect width="${L}" height="${H}" filter="url(#taches)"/>
      <rect width="${L}" height="${H}" filter="url(#grain)"/>
      <g class="croquis">${croquis}</g>
      ${lignes}${cercles}
    </svg>`;
  }
};

// Couleurs des médaillons (clair → sombre)
const COULEURS_NOEUDS = {
  combat: ['#d8b88a', '#8a6a44'], elite: ['#b8708a', '#5a2440'], repos: ['#ffb060', '#b05a1a'], marchand: ['#9ac87a', '#3a6a2a'],
  tresor: ['#ffe080', '#b8861a'], evenement: ['#8ab0e0', '#2e4a7a'], boss: ['#e05a4a', '#6a1010']
};
// Croquis à l'encre (coordonnées autour de 0,0)
const CROQUIS = {
  montagne: '<path class="encre" d="M-12,6 L-4,-6 L2,2 L6,-3 L13,6"/><path class="encre fin" d="M-4,-6 L-2,-2 M6,-3 L7,0"/>',
  rocher: '<path class="encre" d="M-8,5 Q-9,-2 -3,-4 Q4,-6 7,0 Q9,5 -8,5Z"/>',
  sapin: '<path class="encre" d="M0,-10 L-6,-1 L-3,-1 L-8,6 L8,6 L3,-1 L6,-1Z M0,6 L0,10"/>',
  arbre: '<circle class="encre" cx="0" cy="-3" r="6"/><path class="encre" d="M0,3 L0,9"/>',
  vague: '<path class="encre" d="M-12,0 Q-9,-4 -6,0 T0,0 T6,0 T12,0"/><path class="encre fin" d="M-8,5 Q-5,2 -2,5 T4,5"/>',
  roseau: '<path class="encre" d="M-3,8 L-4,-6 M0,8 L1,-9 M3,8 L5,-4"/><path class="encre plein" d="M0,-12 L1,-9 L2,-12Z"/>',
  dune: '<path class="encre" d="M-14,4 Q-6,-6 2,4 M-2,6 Q6,-2 14,6"/>',
  flocon: '<path class="encre" d="M0,-7 L0,7 M-6,-3.5 L6,3.5 M-6,3.5 L6,-3.5"/>',
  tombe: '<path class="encre" d="M-5,7 L-5,-3 Q-5,-8 0,-8 Q5,-8 5,-3 L5,7Z M0,-5 L0,2 M-2.5,-2 L2.5,-2"/>',
  crane: '<circle class="encre" cx="0" cy="-2" r="5"/><circle class="encre plein" cx="-2" cy="-2" r="1.2"/><circle class="encre plein" cx="2" cy="-2" r="1.2"/><path class="encre" d="M-2,3 L-2,6 M2,3 L2,6"/>',
  toile: '<path class="encre fin" d="M0,0 L0,-10 M0,0 L9,-5 M0,0 L9,5 M0,0 L0,10 M0,0 L-9,5 M0,0 L-9,-5"/><path class="encre fin" d="M0,-6 L5,-3 L5,3 L0,6 L-5,3 L-5,-3Z"/>',
  flamme: '<path class="encre" d="M0,8 Q-6,4 -3,-2 Q-1,1 0,-8 Q5,-1 3,3 Q6,2 0,8Z"/>',
  champignon: '<path class="encre" d="M-7,0 Q0,-10 7,0Z M-2,0 L-2,6 L2,6 L2,0"/>',
  cristal: '<path class="encre" d="M0,-9 L4,-2 L2,7 L-2,7 L-4,-2Z M0,-9 L0,7"/>',
  colonne: '<path class="encre" d="M-4,8 L-4,-7 M4,8 L4,-7 M-6,-7 L6,-7 M-6,8 L6,8"/>',
  ancre: '<path class="encre" d="M0,-8 L0,7 M-4,-5 L4,-5 M-7,2 Q0,10 7,2"/><circle class="encre" cx="0" cy="-9" r="1.8"/>',
  bulle: '<circle class="encre fin" cx="-2" cy="2" r="3"/><circle class="encre fin" cx="3" cy="-4" r="2"/>',
  chateau: '<path class="encre" d="M-8,8 L-8,-4 L-5,-4 L-5,-1 L-2,-1 L-2,-6 L2,-6 L2,-1 L5,-1 L5,-4 L8,-4 L8,8Z M-1,8 L-1,3 L1,3 L1,8"/>'
};
const CROQUIS_THEMES = {
  crypte: ['tombe', 'crane', 'rocher', 'colonne'], grotte: ['montagne', 'rocher', 'champignon'], sanctuaire: ['colonne', 'flamme', 'tombe'],
  volcan: ['montagne', 'flamme', 'rocher'], toiles: ['toile', 'crane', 'rocher'], abime: ['cristal', 'crane', 'rocher'],
  marais: ['roseau', 'vague', 'arbre', 'champignon'], givre: ['sapin', 'flocon', 'montagne'], desert: ['dune', 'colonne', 'crane'],
  chateau: ['chateau', 'tombe', 'arbre', 'crane'], suintant: ['bulle', 'champignon', 'rocher'], cote: ['vague', 'ancre', 'rocher', 'bulle']
};
