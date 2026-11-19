// =====================================================================
// Objets magiques, consommables, améliorations, récompenses et marchand.
//
// Un objet décrit ses effets dans `mods`, ce qui permet de l'équiper puis
// de le retirer (pour le donner à un autre héros) :
//   nombres     : ca, pvMax, bonusArme, bonusDegats, bonusSort, ddSort,
//                 bonusSauv, bonusSoin, emp1, emp2 (emplacements de sorts)
//   traits      : capacités spéciales lues par le moteur de combat
//                 (nombres additionnés, autres valeurs posées / retirées)
//   rarete      : 'commun', 'rare', 'legendaire' ou 'maudit'
//   classes     : classes pouvant le porter (null = toutes)
// Traits reconnus par combat.js : armeElem {des, type}, voile, phenix,
//   arcEclair (dés), vol, epines (dés), critMin, init, benitDebut,
//   manaDebut, resist [types], cacheDebut, regen, peurReduite,
//   peurDebut, sangSort, peurMin, saigne, orMult, bonusTest
// =====================================================================

const RARETES = {
  commun: { nom: 'Commun', couleur: '#c9c2b6', prix: [55, 70] },
  rare: { nom: 'Rare', couleur: '#6aa8ff', prix: [90, 115] },
  legendaire: { nom: 'Légendaire', couleur: '#ffad3b', prix: [150, 185] },
  maudit: { nom: 'Maudit', couleur: '#c060ff', prix: [45, 60] }
};

const ARMES = ['guerrier', 'roublard', 'barbare', 'paladin', 'rodeur', 'moine'];
const LANCEURS = ['clerc', 'magicien', 'barde', 'druide', 'paladin', 'rodeur', 'occultiste'];
const ARMURES = ['guerrier', 'clerc', 'paladin', 'barbare'];

const OBJETS = {
  // ------------------------------------------------------- communs
  epee_plus1: { nom: 'Épée longue +1', icone: '⚔️', rarete: 'commun', classes: ['guerrier', 'paladin', 'rodeur'], desc: '+1 au toucher et aux dégâts avec les armes.', mods: { bonusArme: 1, bonusDegats: 1 } },
  bouclier_plus1: { nom: 'Bouclier +1', icone: '🛡️', rarete: 'commun', classes: ARMURES, desc: '+1 CA.', mods: { ca: 1 } },
  amulette_vigueur: { nom: 'Amulette de vigueur', icone: '📿', rarete: 'commun', classes: null, desc: '+6 PV maximum.', mods: { pvMax: 6 } },
  heaume_fer: { nom: 'Heaume de fer', icone: '⛑️', rarete: 'commun', classes: ARMURES, desc: '+1 CA et +3 PV maximum.', mods: { ca: 1, pvMax: 3 } },
  bottes_vivacite: { nom: 'Bottes de vivacité', icone: '🥾', rarete: 'commun', classes: null, desc: '+5 à l\'initiative.', mods: { traits: { init: 5 } } },
  gants_archer: { nom: 'Gants d\'archer', icone: '🧤', rarete: 'commun', classes: ARMES, desc: '+1 au toucher avec les armes.', mods: { bonusArme: 1 } },
  robe_etoilee: { nom: 'Robe étoilée', icone: '🥻', rarete: 'commun', classes: ['magicien', 'barde', 'druide', 'occultiste'], desc: '+1 CA et +4 PV maximum.', mods: { ca: 1, pvMax: 4 } },
  cristal_lumiere: { nom: 'Cristal de lumière', icone: '💎', rarete: 'commun', classes: ['clerc', 'druide', 'paladin', 'barde'], desc: '+3 PV à chaque soin.', mods: { bonusSoin: 3 } },
  ceinture_force: { nom: 'Ceinture de force', icone: '🎗️', rarete: 'commun', classes: ARMES, desc: '+1 aux dégâts et +3 PV maximum.', mods: { bonusDegats: 1, pvMax: 3 } },
  anneau_protection: { nom: 'Anneau de protection', icone: '💍', rarete: 'commun', classes: null, desc: '+1 aux jets de sauvegarde et +2 PV maximum.', mods: { bonusSauv: 1, pvMax: 2 } },

  // ---------------------------------------------------------- rares
  gantelets_ogre: { nom: 'Gantelets de puissance', icone: '🥊', rarete: 'rare', classes: ARMURES, desc: '+2 aux dégâts avec les armes.', mods: { bonusDegats: 2 } },
  dague_venin: { nom: 'Dague venimeuse', icone: '🐍', rarete: 'rare', classes: ['roublard', 'rodeur', 'moine'], desc: '+1 au toucher et +2 aux dégâts avec les armes.', mods: { bonusArme: 1, bonusDegats: 2 } },
  bottes_elfiques: { nom: 'Bottes elfiques', icone: '👢', rarete: 'rare', classes: ['roublard', 'rodeur', 'moine'], desc: 'Commence chaque combat caché (avantage à la première attaque).', mods: { traits: { cacheDebut: true } } },
  pierre_chance: { nom: 'Pierre porte-bonheur', icone: '🍀', rarete: 'rare', classes: null, desc: '+1 aux jets de sauvegarde et aux tests.', mods: { bonusSauv: 1, traits: { bonusTest: 1 } } },
  cape_protection: { nom: 'Cape de protection', icone: '🧥', rarete: 'rare', classes: null, desc: '+1 CA et +1 aux jets de sauvegarde.', mods: { ca: 1, bonusSauv: 1 } },
  talisman_bravoure: { nom: 'Talisman de bravoure', icone: '🦁', rarete: 'rare', classes: null, desc: 'La Peur gagnée est réduite de moitié.', mods: { traits: { peurReduite: true } } },
  baguette_mage: { nom: 'Baguette du mage de guerre +1', icone: '🪄', rarete: 'rare', classes: ['magicien', 'barde', 'druide', 'occultiste'], desc: '+1 aux attaques de sort et au DD des sorts.', mods: { bonusSort: 1, ddSort: 1 } },
  symbole_sacre: { nom: 'Symbole sacré béni', icone: '📯', rarete: 'rare', classes: ['clerc', 'druide', 'paladin'], desc: '+1 au DD des sorts et +2 PV à chaque soin.', mods: { ddSort: 1, bonusSoin: 2 } },
  perle_pouvoir: { nom: 'Perle de pouvoir', icone: '🔵', rarete: 'rare', classes: ['clerc', 'magicien', 'barde', 'druide', 'paladin', 'rodeur'], desc: '+1 emplacement de sort de niveau 1.', mods: { emp1: 1 } },
  anneau_vitalite: { nom: 'Anneau de vitalité', icone: '❤️‍🩹', rarete: 'rare', classes: null, desc: 'Récupère 2 PV au début de chacun de ses tours.', mods: { traits: { regen: 2 } } },
  lame_flammes: { nom: 'Lame de flammes', icone: '🔥', rarete: 'rare', classes: ARMES, desc: 'Les coups d\'arme infligent +1d6 dégâts de feu.', mods: { traits: { armeElem: { des: '1d6', type: 'feu' } } } },
  lame_givre: { nom: 'Lame de givre', icone: '🧊', rarete: 'rare', classes: ARMES, desc: 'Les coups d\'arme infligent +1d6 dégâts de froid.', mods: { traits: { armeElem: { des: '1d6', type: 'froid' } } } },
  cape_ombre: { nom: 'Cape de l\'ombre', icone: '🌫️', rarete: 'rare', classes: null, desc: 'La première attaque contre le porteur à chaque combat rate.', mods: { traits: { voile: true } } },
  baton_foudre: { nom: 'Bâton de foudre', icone: '⚡', rarete: 'rare', classes: ['magicien', 'druide'], desc: 'Quand une attaque de sort touche, un éclair frappe un autre ennemi (1d8).', mods: { traits: { arcEclair: '1d8' } } },
  lame_vampirique: { nom: 'Lame vampirique', icone: '🩸', rarete: 'rare', classes: ARMES, desc: 'Chaque coup d\'arme rend la moitié des dégâts en PV (6 max).', mods: { traits: { vol: true } } },
  armure_epines: { nom: 'Armure à épines', icone: '🌵', rarete: 'rare', classes: ARMURES, desc: 'Un ennemi qui touche le porteur au corps à corps subit 1d6 dégâts.', mods: { traits: { epines: '1d6' } } },
  lame_aceree: { nom: 'Lame acérée', icone: '🗡️', rarete: 'rare', classes: ARMES, desc: 'Critique sur 19 ou 20.', mods: { traits: { critMin: 19 } } },
  encensoir: { nom: 'Encensoir béni', icone: '🪔', rarete: 'rare', classes: ['clerc', 'paladin', 'barde'], desc: 'Au début de chaque combat, toute l\'équipe est bénie pendant 2 tours.', mods: { traits: { benitDebut: true } } },
  pierre_mana: { nom: 'Pierre de mana', icone: '🔮', rarete: 'rare', classes: LANCEURS, desc: 'Récupère un emplacement de niveau 1 au début de chaque combat.', mods: { traits: { manaDebut: true } } },
  amulette_tombe: { nom: 'Amulette de la tombe', icone: '⚱️', rarete: 'rare', classes: null, desc: 'Résistance aux dégâts nécrotiques et psychiques (moitié).', mods: { traits: { resist: ['nécrotique', 'psychique'] } } },
  anneau_feu: { nom: 'Anneau de résistance au feu', icone: '🧯', rarete: 'rare', classes: null, desc: 'Résistance au feu et au poison (moitié).', mods: { traits: { resist: ['feu', 'poison'] } } },

  // --------------------------------------------------- légendaires
  amulette_phenix: { nom: 'Amulette du phénix', icone: '🐦‍🔥', rarete: 'legendaire', classes: null, desc: 'Une fois par combat, se relève avec 10 PV au lieu de tomber à terre.', mods: { traits: { phenix: true } } },
  epee_solaire: { nom: 'Épée solaire', icone: '☀️', rarete: 'legendaire', classes: ARMES, desc: '+1 au toucher ; les coups d\'arme infligent +1d8 radiant.', mods: { bonusArme: 1, traits: { armeElem: { des: '1d8', type: 'radiant' } } } },
  couronne_archimage: { nom: 'Couronne de l\'archimage', icone: '🎓', rarete: 'legendaire', classes: ['magicien', 'barde', 'druide'], desc: '+2 aux sorts et au DD, +1 emplacement de niveau 2.', mods: { bonusSort: 2, ddSort: 2, emp2: 1 } },
  relique_sainte: { nom: 'Relique du saint', icone: '✴️', rarete: 'legendaire', classes: ['clerc', 'paladin', 'druide'], desc: '+2 au DD des sorts, +4 PV à chaque soin, équipe bénie en début de combat.', mods: { ddSort: 2, bonusSoin: 4, traits: { benitDebut: true } } },
  manteau_invisible: { nom: 'Manteau d\'invisibilité', icone: '👻', rarete: 'legendaire', classes: ['roublard', 'rodeur', 'moine'], desc: '+1 CA, commence caché, la première attaque contre lui rate.', mods: { ca: 1, traits: { cacheDebut: true, voile: true } } },
  coeur_dragon: { nom: 'Cœur de dragon', icone: '🐉', rarete: 'legendaire', classes: null, desc: '+12 PV max, résistance au feu, récupère 1 PV par tour.', mods: { pvMax: 12, traits: { resist: ['feu'], regen: 1 } } },

  // -------------------------------------------------------- maudits
  hache_sanglante: { nom: 'Hache sanglante', icone: '🪓', rarete: 'maudit', classes: ARMES, desc: '+3 aux dégâts avec les armes. Malédiction : +15 Peur au début de chaque combat.', mods: { bonusDegats: 3, traits: { peurDebut: 15 } } },
  grimoire_interdit: { nom: 'Grimoire interdit', icone: '📕', rarete: 'maudit', classes: LANCEURS, desc: '+2 aux sorts et au DD. Malédiction : chaque emplacement dépensé coûte 3 PV.', mods: { bonusSort: 2, ddSort: 2, traits: { sangSort: 3 } } },
  masque_dement: { nom: 'Masque du dément', icone: '🎭', rarete: 'maudit', classes: null, desc: '+2 au toucher (armes et sorts). Malédiction : la Peur ne descend jamais sous 30.', mods: { bonusArme: 2, bonusSort: 2, traits: { peurMin: 30 } } },
  couronne_avare: { nom: 'Couronne de l\'avare', icone: '🪙', rarete: 'maudit', classes: null, desc: '+50 % d\'or gagné. Malédiction : −2 CA.', mods: { ca: -2, traits: { orMult: 0.5 } } },
  anneau_sang: { nom: 'Anneau de sang', icone: '🩸', rarete: 'maudit', classes: null, desc: '+12 PV maximum et +1 dégâts. Malédiction : perd 1 PV au début de chaque tour.', mods: { pvMax: 12, bonusDegats: 1, traits: { saigne: 1 } } }
};

// Équipe / retire un objet (sens = +1 ou −1)
function modifierObjet(pj, cle, sens) {
  const m = OBJETS[cle].mods || {};
  for (const k of ['ca', 'bonusArme', 'bonusDegats', 'bonusSort', 'ddSort', 'bonusSauv', 'bonusSoin']) if (m[k]) pj[k] += m[k] * sens;
  if (m.pvMax) { pj.pvMax += m.pvMax * sens; pj.pv = Math.min(pj.pvMax, pj.pv + (sens > 0 ? m.pvMax : 0)); }
  for (const [k, n] of [['emp1', 1], ['emp2', 2]]) {
    if (!m[k]) continue;
    if (!pj.emplacements[n]) pj.emplacements[n] = { max: 0, restant: 0 };
    pj.emplacements[n].max += m[k] * sens;
    pj.emplacements[n].restant = Math.max(0, Math.min(pj.emplacements[n].max, pj.emplacements[n].restant + m[k] * sens));
  }
  for (const [k, v] of Object.entries(m.traits || {})) {
    if (typeof v === 'number') pj.traits[k] = (pj.traits[k] || 0) + v * sens;
    else if (Array.isArray(v)) {
      const liste = pj.traits[k] || [];
      pj.traits[k] = sens > 0 ? [...liste, ...v] : liste.filter((x, i) => !v.includes(x) || liste.indexOf(x) !== i);
    } else if (sens > 0) pj.traits[k] = v;
    else delete pj.traits[k];
  }
}
function equiperObjet(pj, cle) { modifierObjet(pj, cle, 1); pj.objets.push(cle); }
function retirerObjet(pj, cle) { modifierObjet(pj, cle, -1); pj.objets.splice(pj.objets.indexOf(cle), 1); }

// ---------------------------------------------------------------------
// Consommables : utilisés en combat depuis le sac (actions dans actions.js)
// ---------------------------------------------------------------------
const CONSOMMABLES = {
  potion: { nom: 'Potion de soins', icone: '🧴', desc: 'Un allié récupère 2d4+2 PV (même à terre).', prix: 20 },
  potion_sup: { nom: 'Potion de soins supérieure', icone: '🍷', desc: 'Un allié récupère 4d4+4 PV (même à terre).', prix: 45 },
  elixir_courage: { nom: 'Élixir de courage', icone: '🧉', desc: 'Un allié perd 40 Peur.', prix: 30 },
  bombe: { nom: 'Bombe incendiaire', icone: '💣', desc: 'Ligne Avant ennemie : sauvegarde de DEX DD 13, 2d6+2 feu (moitié si réussite).', prix: 35 },
  parchemin_feu: { nom: 'Parchemin de boule de feu', icone: '📜', desc: 'Tous les ennemis : sauvegarde de DEX DD 14, 6d6 feu (moitié si réussite).', prix: 70 },
  eau_benite: { nom: 'Eau bénite', icone: '💧', desc: 'Un ennemi : 3d6 radiant, touche automatiquement.', prix: 30 }
};

const AMELIORATIONS = {
  entrainement: {
    nom: 'Entraînement martial', icone: '🎯',
    desc: '+1 au toucher avec les armes.',
    condition: pj => !['magicien', 'druide', 'barde', 'occultiste'].includes(pj.classe),
    appliquer(pj) { pj.bonusArme += 1; }
  },
  endurance: {
    nom: 'Endurance', icone: '❤️',
    desc: '+5 PV maximum (et soigne 5 PV).',
    appliquer(pj) { pj.pvMax += 5; pj.pv += 5; }
  },
  armure: {
    nom: 'Armure renforcée', icone: '🪖',
    desc: '+1 CA.',
    appliquer(pj) { pj.ca += 1; }
  },
  volonte: {
    nom: 'Volonté de fer', icone: '🧠',
    desc: '+1 aux jets de sauvegarde et −20 Peur.',
    appliquer(pj) { pj.bonusSauv += 1; pj.peur = Math.max(0, pj.peur - 20); }
  },
  concentration: {
    nom: 'Étude des arcanes', icone: '📖',
    desc: '+1 emplacement de sort de niveau 1.',
    condition: pj => !!pj.emplacements[1] && !CLASSES[pj.classe].pacte,
    appliquer(pj) { pj.emplacements[1].max += 1; pj.emplacements[1].restant += 1; }
  },
  puissance: {
    nom: 'Puissance magique', icone: '🌟',
    desc: '+1 emplacement de sort de niveau 2.',
    condition: pj => !!pj.emplacements[2] && !CLASSES[pj.classe].pacte,
    appliquer(pj) { pj.emplacements[2].max += 1; pj.emplacements[2].restant += 1; }
  },
  precision: {
    nom: 'Précision des sorts', icone: '🎇',
    desc: '+1 aux attaques de sort et au DD des sorts.',
    condition: pj => pj.ddSort > 0,
    appliquer(pj) { pj.bonusSort += 1; pj.ddSort += 1; }
  },
  robustesse: {
    nom: 'Robustesse', icone: '🎲',
    desc: '+1 dé de vie (max et restant).',
    appliquer(pj) { pj.desVie.max += 1; pj.desVie.restant += 1; }
  }
};

// ---------------------------------------------------------------------
// Récompenses. Une offre : { categorie, pj, cle, titre, icone, desc, rarete?, quantite? }
// ---------------------------------------------------------------------
const CHANCES_RARETE = {
  combat: { commun: 60, rare: 30, legendaire: 3, maudit: 7 },
  elite: { commun: 25, rare: 50, legendaire: 15, maudit: 10 },
  tresor: { commun: 30, rare: 45, legendaire: 15, maudit: 10 },
  boss: { commun: 0, rare: 55, legendaire: 40, maudit: 5 },
  marchand: { commun: 45, rare: 40, legendaire: 8, maudit: 7 }
};

// Chance qu'un combat ordinaire propose un objet magique (élites et boss : garanti)
const CHANCE_OBJET_COMBAT = 0.45;

const Recompenses = {
  tirerRarete(source) {
    const c = CHANCES_RARETE[source] || CHANCES_RARETE.combat;
    return Des.pondere(Object.entries(c).map(([r, poids]) => ({ r, poids }))).r;
  },

  offreObjet(equipe, exclure = [], source = 'combat') {
    const voulu = this.tirerRarete(source);
    const liste = rarete => {
      const possibles = [];
      for (const [cle, o] of Object.entries(OBJETS)) {
        if (exclure.includes(cle) || (rarete && o.rarete !== rarete)) continue;
        const cibles = equipe.filter(pj => (!o.classes || o.classes.includes(pj.classe)) && !pj.objets.includes(cle));
        if (cibles.length) possibles.push({ cle, o, cibles });
      }
      return possibles;
    };
    let possibles = liste(voulu);
    if (!possibles.length) possibles = liste(null);
    if (!possibles.length) return null;
    const { cle, o, cibles } = Des.hasard(possibles);
    const pj = Des.hasard(cibles);
    return { categorie: 'objet', pj: pj.id, cle, titre: o.nom, icone: o.icone, desc: o.desc, rarete: o.rarete };
  },

  offreConsommable() {
    const cles = Object.keys(CONSOMMABLES).filter(c => c !== 'potion');
    const cle = Des.hasard(cles), c = CONSOMMABLES[cle];
    const quantite = ['bombe', 'elixir_courage', 'eau_benite'].includes(cle) ? 2 : 1;
    return { categorie: 'consommable', cle, quantite, titre: (quantite > 1 ? quantite + ' × ' : '') + c.nom, icone: c.icone, desc: c.desc };
  },

  offreAction(equipe) {
    const possibles = [];
    for (const pj of equipe) {
      for (const cle of CLASSES[pj.classe].poolActions) {
        if (!pj.actions.includes(cle) && (pj.niveau || 3) >= (ACTIONS[cle].niveauMin || 0)) possibles.push({ pj, cle });
      }
    }
    if (!possibles.length) return null;
    const { pj, cle } = Des.hasard(possibles);
    const a = ACTIONS[cle];
    return { categorie: 'action', pj: pj.id, cle, titre: a.nom, icone: a.icone, desc: a.desc };
  },

  offreAmelioration(equipe) {
    const possibles = [];
    for (const [cle, am] of Object.entries(AMELIORATIONS)) {
      for (const pj of equipe) if (!am.condition || am.condition(pj)) possibles.push({ cle, am, pj });
    }
    const { cle, am, pj } = Des.hasard(possibles);
    return { categorie: 'amelioration', pj: pj.id, cle, titre: am.nom, icone: am.icone, desc: am.desc };
  },

  // Combat : objet seulement avec CHANCE_OBJET_COMBAT, + action, amélioration ou consommable
  // Élite / boss : 2 objets garantis, de meilleure rareté, + 1 action ; trésor : 3 objets
  generer(equipe, { elite = false, boss = false, objetsSeulement = false } = {}) {
    const source = boss ? 'boss' : elite ? 'elite' : objetsSeulement ? 'tresor' : 'combat';
    const offres = [];
    const nbObjets = objetsSeulement ? 3 : (elite || boss ? 2 : (Math.random() < CHANCE_OBJET_COMBAT ? 1 : 0));
    for (let i = 0; i < nbObjets; i++) {
      const o = this.offreObjet(equipe, offres.map(x => x.cle), source);
      if (o) offres.push(o);
    }
    if (!objetsSeulement) {
      const a = this.offreAction(equipe);
      if (a) offres.push(a);
    }
    while (offres.length < 3) {
      const x = Math.random() < 0.4 ? this.offreConsommable() : this.offreAmelioration(equipe);
      if (!offres.some(y => y.cle === x.cle && y.pj === x.pj)) offres.push(x);
    }
    return Des.melanger(offres.slice(0, 3));
  },

  // `jeu` est nécessaire pour les consommables
  appliquer(offre, pj, jeu) {
    if (offre.categorie === 'objet') equiperObjet(pj, offre.cle);
    else if (offre.categorie === 'amelioration') {
      AMELIORATIONS[offre.cle].appliquer(pj);
      pj.ameliorations = pj.ameliorations || [];
      pj.ameliorations.push(offre.cle);
    } else if (offre.categorie === 'consommable' && jeu) jeu.ajouterStock(offre.cle, offre.quantite || 1);
    // Les actions sont gérées par jeu.js (choix éventuel d'une action à oublier)
  }
};

// ---------------------------------------------------------------------
// Or et marchand
// ---------------------------------------------------------------------
const GAINS_OR = { combat: [12, 22], elite: [35, 55], boss: [80, 100], tresor: [45, 70] };

const Marchand = {
  prixObjet(o) { const [a, b] = RARETES[o.rarete].prix; return a + Math.floor(Math.random() * (b - a + 1)); },

  // Stock : potions, 2 consommables, 3 objets, 1 action, 1 amélioration, 2 services
  generer(equipe) {
    const stock = [{ categorie: 'consommable', cle: 'potion', quantite: 1, stock: 3, icone: '🧴', titre: 'Potion de soins', desc: CONSOMMABLES.potion.desc, prix: CONSOMMABLES.potion.prix }];
    const pris = [];
    while (pris.length < 2) {
      const cle = Des.hasard(Object.keys(CONSOMMABLES).filter(c => c !== 'potion' && !pris.includes(c)));
      pris.push(cle);
      const c = CONSOMMABLES[cle];
      stock.push({ categorie: 'consommable', cle, quantite: 1, stock: 2, icone: c.icone, titre: c.nom, desc: c.desc, prix: c.prix });
    }
    const objets = [];
    for (let i = 0; i < 3; i++) { const o = Recompenses.offreObjet(equipe, objets.map(x => x.cle), 'marchand'); if (o) objets.push(o); }
    for (const o of objets) stock.push({ ...o, prix: this.prixObjet(o) });
    const a = Recompenses.offreAction(equipe);
    if (a) stock.push({ ...a, prix: 60 + Math.floor(Math.random() * 15) });
    const am = Recompenses.offreAmelioration(equipe);
    stock.push({ ...am, prix: 50 + Math.floor(Math.random() * 15) });
    stock.push({ categorie: 'soin', icone: '⛑️', titre: 'Soins du guérisseur', desc: 'Toute l\'équipe récupère la moitié de ses PV max (relève les héros à terre).', prix: 35 });
    stock.push({ categorie: 'encens', icone: '🕯️', titre: 'Encens apaisant', desc: 'Toute l\'équipe perd 30 points de Peur.', prix: 25 });
    return stock;
  },

  appliquer(art, jeu) {
    const pj = art.pj ? jeu.equipe.find(p => p.id === art.pj) : null;
    switch (art.categorie) {
      case 'consommable': jeu.ajouterStock(art.cle, art.quantite || 1); break;
      case 'action': pj.actions.push(art.cle); break;
      case 'objet': case 'amelioration': Recompenses.appliquer(art, pj, jeu); break;
      case 'soin': jeu.equipe.forEach(p => { p.pv = Math.min(p.pvMax, Math.max(0, p.pv) + Math.ceil(p.pvMax / 2)); }); break;
      case 'encens': jeu.equipe.forEach(p => { p.peur = Math.max(p.traits.peurMin || 0, p.peur - 30); }); break;
    }
  }
};
