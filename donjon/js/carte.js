// =====================================================================
// Carte d'un étage avec embranchements.
// Rangée 0 = départ (en bas), dernière rangée = boss (en haut).
// =====================================================================

const TYPES_NOEUDS = {
  combat: { nom: 'Combat', icone: '⚔️' },
  elite: { nom: 'Élite', icone: '💀' },
  repos: { nom: 'Repos', icone: '🔥' },
  tresor: { nom: 'Trésor', icone: '💰' },
  evenement: { nom: 'Événement', icone: '❓' },
  boss: { nom: 'Boss', icone: '👑' }
};

const CONFIG_CARTE = {
  rangees: 8,          // 0..7 : 7 = boss, 6 = repos garanti
  colonnes: 4,
  poids: [            // tirage des rangées intermédiaires
    { type: 'combat', poids: 44 },
    { type: 'evenement', poids: 20 },
    { type: 'tresor', poids: 11 },
    { type: 'elite', poids: 14, rangMin: 3 },
    { type: 'repos', poids: 11, rangMin: 2, rangMax: 4 }
  ]
};

const Carte = {
  generer() {
    const R = CONFIG_CARTE.rangees, C = CONFIG_CARTE.colonnes;
    const rangees = [];
    let id = 0;
    for (let r = 0; r < R; r++) {
      let cols;
      if (r === R - 1) cols = [1.5];
      else {
        const n = r === 0 ? 3 : 2 + Math.floor(Math.random() * 3); // 2 à 4
        cols = Des.melanger([0, 1, 2, 3]).slice(0, n).sort((a, b) => a - b);
      }
      rangees.push(cols.map(col => ({ id: id++, rangee: r, col, type: null, liens: [], visite: false, decalage: (Math.random() - 0.5) * 22 })));
    }

    // Liens : chaque nœud vers le(s) plus proche(s) de la rangée suivante
    for (let r = 0; r < R - 1; r++) {
      const ici = rangees[r], suivante = rangees[r + 1];
      for (const n of ici) {
        const tries = suivante.slice().sort((a, b) => Math.abs(a.col - n.col) - Math.abs(b.col - n.col));
        n.liens.push(tries[0].id);
        if (tries[1] && Math.abs(tries[1].col - n.col) <= 1 && Math.random() < 0.55) n.liens.push(tries[1].id);
      }
      // Tout nœud de la rangée suivante doit avoir une arrivée
      for (const s of suivante) {
        if (!ici.some(n => n.liens.includes(s.id))) {
          const proche = ici.slice().sort((a, b) => Math.abs(a.col - s.col) - Math.abs(b.col - s.col))[0];
          proche.liens.push(s.id);
        }
      }
    }

    // Types
    for (const rangee of rangees) {
      for (const n of rangee) {
        const r = n.rangee;
        if (r === R - 1) n.type = 'boss';
        else if (r === R - 2) n.type = 'repos';
        else if (r === 0) n.type = 'combat';
        else {
          const poss = CONFIG_CARTE.poids.filter(p => (p.rangMin === undefined || r >= p.rangMin) && (p.rangMax === undefined || r <= p.rangMax));
          n.type = Des.pondere(poss).type;
        }
      }
    }
    // Au moins un trésor sur la carte
    const tous = rangees.flat();
    if (!tous.some(n => n.type === 'tresor')) {
      const cand = tous.filter(n => n.type === 'combat' && n.rangee > 0);
      if (cand.length) Des.hasard(cand).type = 'tresor';
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
  niveau(noeud) { return noeud.rangee <= 2 ? 'facile' : 'moyen'; },

  // Rendu SVG (boss en haut, départ en bas)
  svg(carte) {
    const R = carte.rangees;
    const L = 360, E = 68, H = R * E + 40;
    const pos = n => ({
      x: 45 + (n.col / 3) * (L - 90) + n.decalage,
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
