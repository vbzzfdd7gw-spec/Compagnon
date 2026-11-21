// =====================================================================
// Dés : lancers et mise en forme lisible pour le journal.
// Formats acceptés : "1d8+3", "2d6", "1d8+1d6+2", "5", "3d4+3".
// =====================================================================
// Hasard du jeu : Math.random d'ordinaire ; suit une graine pendant le défi
// quotidien (même carte, mêmes rencontres pour tout le monde). Les effets
// visuels gardent Math.random pour ne pas dérégler la suite de nombres.
const Hasard = {
  etat: null,                      // null = Math.random ; sinon entier (mulberry32)
  graine(n) { this.etat = n >>> 0; },
  libre() { this.etat = null; },
  suivant() {
    if (this.etat === null) return Math.random();
    let t = (this.etat = (this.etat + 0x6D2B79F5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
};
function alea() { return Hasard.suivant(); }

const Des = {
  d(faces) {
    return 1 + Math.floor(alea() * faces);
  },

  // Découpe une expression en termes {n, faces, signe} ou {fixe, signe}
  analyser(expr) {
    const termes = [];
    const propre = String(expr).replace(/\s+/g, '');
    const re = /([+-]?)(\d*)d(\d+)|([+-]?)(\d+)/gi;
    let m;
    while ((m = re.exec(propre)) !== null) {
      if (m[3]) {
        termes.push({ signe: m[1] === '-' ? -1 : 1, n: m[2] ? parseInt(m[2], 10) : 1, faces: parseInt(m[3], 10) });
      } else if (m[5]) {
        termes.push({ signe: m[4] === '-' ? -1 : 1, fixe: parseInt(m[5], 10) });
      }
    }
    return termes;
  },

  // Lance une expression. critique = dés doublés (pas le modificateur).
  // Renvoie { total, texte } ; texte ressemble à "2d6[3,5] + 3 = 11".
  lancer(expr, critique = false) {
    const termes = this.analyser(expr);
    let total = 0;
    const morceaux = [];
    for (const t of termes) {
      if (t.faces) {
        const n = critique ? t.n * 2 : t.n;
        const des = [];
        for (let i = 0; i < n; i++) des.push(this.d(t.faces));
        const s = des.reduce((a, b) => a + b, 0) * t.signe;
        total += s;
        morceaux.push((t.signe < 0 ? '− ' : '') + `${n}d${t.faces}[${des.join(',')}]`);
      } else {
        total += t.fixe * t.signe;
        if (t.fixe !== 0) morceaux.push((t.signe < 0 ? '− ' : '') + t.fixe);
      }
    }
    total = Math.max(0, total);
    let texte = morceaux.join(' + ').replace(/\+ −/g, '−');
    if (morceaux.length > 1 || termes.some(t => t.faces && (critique ? t.n * 2 : t.n) > 1)) texte += ` = ${total}`;
    return { total, texte };
  },

  // Jet de d20. mode : 1 = avantage, -1 = désavantage, 0 = normal.
  d20(mode = 0) {
    const a = this.d(20);
    if (mode === 0) return { nat: a, texte: `d20[${a}]` };
    const b = this.d(20);
    const nat = mode > 0 ? Math.max(a, b) : Math.min(a, b);
    return { nat, texte: `d20 ${mode > 0 ? 'avantage' : 'désavantage'}[${a},${b}→${nat}]` };
  },

  // Valeur moyenne (pour l'IA et les affichages)
  moyenne(expr) {
    return this.analyser(expr).reduce((s, t) => s + t.signe * (t.faces ? t.n * (t.faces + 1) / 2 : t.fixe), 0);
  },

  hasard(liste) {
    return liste[Math.floor(alea() * liste.length)];
  },

  melanger(liste) {
    const l = liste.slice();
    for (let i = l.length - 1; i > 0; i--) {
      const j = Math.floor(alea() * (i + 1));
      [l[i], l[j]] = [l[j], l[i]];
    }
    return l;
  },

  // Tirage pondéré : [{poids, ...}] ou objet {cle: poids}
  pondere(entrees) {
    const total = entrees.reduce((s, e) => s + e.poids, 0);
    let r = alea() * total;
    for (const e of entrees) {
      r -= e.poids;
      if (r <= 0) return e;
    }
    return entrees[entrees.length - 1];
  }
};

// Modificateur de caractéristique 5e
function modCarac(valeur) {
  return Math.floor((valeur - 10) / 2);
}

function signe(n) {
  return n >= 0 ? `+${n}` : `${n}`;
}
