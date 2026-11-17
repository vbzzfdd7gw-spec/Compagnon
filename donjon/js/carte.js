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
  rangees: 10,         // 0..9 : 9 = boss, 8 = feu de camp garanti
  colonnes: 5,
  chemins: 6,          // nombre de chemins tracés de bas en haut (ils se croisent et se rejoignent)
  poids: [             // tirage des salles intermédiaires
    { type: 'combat', poids: 35 },
    { type: 'evenement', poids: 21 },
    { type: 'elite', poids: 15, rangMin: 3 },
    { type: 'repos', poids: 13, rangMin: 3, rangMax: 6 },
    { type: 'marchand', poids: 10, rangMin: 2, rangMax: 7 },
    { type: 'tresor', poids: 5, rangMin: 2 }
  ],
  // Types qu'on ne veut pas deux fois de suite sur un même chemin
  pasDeuxFois: ['elite', 'repos', 'marchand', 'tresor'],
  minimum: { elite: 2, marchand: 1, repos: 1 }   // au moins autant par étage (hors feu final)
};

const Carte = {
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
      const interdits = new Set(parents(n).map(p => p.type).filter(t => CONFIG_CARTE.pasDeuxFois.includes(t)));
      if (r === R - 3) interdits.add('repos');            // pas de feu juste avant le feu final
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
  niveau(noeud) { return noeud.rangee <= 3 ? 'facile' : 'moyen'; },

  // Rendu SVG (boss en haut, départ en bas)
  svg(carte) {
    const R = carte.rangees;
    const L = 340, E = 60, H = R * E + 40;
    const pos = n => ({
      x: 40 + (n.col / (CONFIG_CARTE.colonnes - 1)) * (L - 80) + n.decalage,
      y: H - 34 - n.rangee * E
    });
    const acc = this.accessibles(carte);
    let lignes = '', cercles = '';
    for (const n of carte.noeuds) {
      const p = pos(n);
      for (const lid of n.liens) {
        const m = this.noeud(carte, lid), q = pos(m);
        const parcouru = n.visite && m.visite;
        const possible = carte.position === n.id && acc.includes(lid);
        lignes += `<line x1="${p.x}" y1="${p.y}" x2="${q.x}" y2="${q.y}" class="lien${parcouru ? ' parcouru' : ''}${possible ? ' possible' : ''}"/>`;
      }
    }
    for (const n of carte.noeuds) {
      const p = pos(n);
      const t = TYPES_NOEUDS[n.type];
      const classes = ['noeud', 't-' + n.type];
      if (n.visite) classes.push('visite');
      if (acc.includes(n.id)) classes.push('accessible');
      if (carte.position === n.id) classes.push('actuel');
      const r = n.type === 'boss' ? 26 : 19;
      cercles += `<g class="${classes.join(' ')}" data-noeud="${n.id}" transform="translate(${p.x},${p.y})">
        <circle r="${r}"/><text y="1" font-size="${n.type === 'boss' ? 24 : 18}">${t.icone}</text>
        <title>${t.nom}</title></g>`;
    }
    return `<svg class="carte-svg" viewBox="0 0 ${L} ${H}" preserveAspectRatio="xMidYMid meet">${lignes}${cercles}</svg>`;
  }
};
