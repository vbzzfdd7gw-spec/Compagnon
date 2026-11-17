// =====================================================================
// Classes des personnages (niveau 3, bonus de maîtrise +2).
//   actions         : actions connues au départ (identifiants de ACTIONS)
//   poolActions     : actions pouvant être apprises en récompense
//   emplacements    : emplacements de sorts par niveau
//   sauvegardes     : caractéristiques maîtrisées pour les jets de sauvegarde
//   deVie           : taille du dé de vie (le PJ en a 3 au niveau 3)
//   ligne           : ligne de départ ('avant' ou 'arriere')
// =====================================================================

const MAX_ACTIONS = 5;

const CLASSES = {
  guerrier: {
    nom: 'Guerrier', icone: '🛡️', couleur: '#c0553a', ligne: 'avant',
    pv: 28, ca: 18,
    caracs: { FOR: 16, DEX: 12, CON: 14, INT: 10, SAG: 12, CHA: 10 },
    maitrise: 2, bonusArme: 5, bonusSort: 0, ddSort: 0,
    sauvegardes: ['FOR', 'CON'], deVie: 10, emplacements: {},
    actions: ['epee_longue', 'coup_bouclier', 'defi', 'second_souffle'],
    poolActions: ['balayage', 'arbalete', 'charge', 'cri_ralliement'],
    desc: 'Tient la première ligne. Robuste, protège ses alliés.'
  },
  clerc: {
    nom: 'Clerc', icone: '✝️', couleur: '#d8b04a', ligne: 'avant',
    pv: 24, ca: 18,
    caracs: { FOR: 14, DEX: 10, CON: 14, INT: 10, SAG: 16, CHA: 12 },
    maitrise: 2, bonusArme: 4, bonusSort: 5, ddSort: 13,
    sauvegardes: ['SAG', 'CHA'], deVie: 8, emplacements: { 1: 4, 2: 2 },
    actions: ['masse', 'flamme_sacree', 'soins', 'benediction'],
    poolActions: ['mot_guerison', 'paroles_espoir', 'priere_soins', 'renvoi', 'esprits_gardiens'],
    desc: 'Soigne, bénit et calme la Peur. Emplacements de sorts limités.'
  },
  roublard: {
    nom: 'Roublard', icone: '🗡️', couleur: '#5f9b6a', ligne: 'arriere',
    pv: 21, ca: 14,
    caracs: { FOR: 10, DEX: 16, CON: 12, INT: 13, SAG: 12, CHA: 12 },
    maitrise: 2, bonusArme: 5, bonusSort: 0, ddSort: 0,
    sauvegardes: ['DEX', 'INT'], deVie: 8, emplacements: {},
    actions: ['rapiere', 'arc_court', 'se_cacher'],
    poolActions: ['lame_empoisonnee', 'feinte', 'dague_lancer', 'pas_lateral'],
    sournoise: '2d6',
    desc: 'Attaque sournoise (+2d6) une fois par tour : avec avantage, ou si la cible est en ligne Avant et qu\'un autre allié debout est en ligne Avant.'
  },
  magicien: {
    nom: 'Magicien', icone: '🔮', couleur: '#6b72d6', ligne: 'arriere',
    pv: 16, ca: 12,
    caracs: { FOR: 8, DEX: 14, CON: 12, INT: 16, SAG: 12, CHA: 10 },
    maitrise: 2, bonusArme: 4, bonusSort: 5, ddSort: 13,
    sauvegardes: ['INT', 'SAG'], deVie: 6, emplacements: { 1: 4, 2: 2 },
    actions: ['trait_feu', 'projectile_magique', 'mains_brulantes', 'rayon_ardent'],
    poolActions: ['sommeil', 'rayon_givre', 'vague_tonnante', 'bouclier_sort', 'boule_feu'],
    desc: 'Fragile mais dévastateur depuis l\'arrière. Emplacements de sorts limités.'
  }
};

const ORDRE_CLASSES = ['guerrier', 'clerc', 'roublard', 'magicien'];

// Crée un personnage jouable à partir de sa classe
function creerPJ(idClasse) {
  const c = CLASSES[idClasse];
  const emplacements = {};
  for (const niv in c.emplacements) emplacements[niv] = { max: c.emplacements[niv], restant: c.emplacements[niv] };
  return {
    id: idClasse, classe: idClasse, nom: c.nom, icone: c.icone, camp: 'pj', ligne: c.ligne,
    pvMax: c.pv, pv: c.pv, ca: c.ca,
    caracs: { ...c.caracs }, maitrise: c.maitrise,
    bonusArme: c.bonusArme, bonusDegats: 0, bonusSort: c.bonusSort, ddSort: c.ddSort,
    bonusSauv: 0, bonusSoin: 0,
    sauvegardes: c.sauvegardes.slice(),
    desVie: { face: c.deVie, restant: 3, max: 3 },
    emplacements,
    niveau: 3,
    actions: c.actions.slice(),
    objets: [],
    peur: 0,
    etats: {},
    usages: {},
    traits: {}
  };
}

// ---------------------------------------------------------------------
// Montée de niveau (après chaque boss d'étage)
//   pv          : PV gagnés par classe
//   emplacements: emplacements de sorts gagnés { niveau: nombre }
//   maitrise    : +1 au bonus de maîtrise (attaques, DD, sauvegardes maîtrisées)
//   bonus       : +1 arme ou sort
//   traits      : capacités (attaqueSupp, sournoise)
//   sort        : sort appris (s'il reste de la place, sinon proposé en récompense)
// ---------------------------------------------------------------------
const PROGRESSION = {
  4: {
    pv: { guerrier: 8, clerc: 7, roublard: 7, magicien: 5 },
    emplacements: { clerc: { 2: 1 }, magicien: { 2: 1 } },
    bonus: { guerrier: 'arme', roublard: 'arme', clerc: 'sort', magicien: 'sort' }
  },
  5: {
    pv: { guerrier: 8, clerc: 7, roublard: 7, magicien: 5 },
    maitrise: true,
    emplacements: { clerc: { 3: 2 }, magicien: { 3: 2 } },
    traits: { guerrier: { attaqueSupp: true }, roublard: { sournoise: '3d6' } },
    sort: { magicien: 'boule_feu', clerc: 'esprits_gardiens' }
  }
};

// Applique le niveau suivant ; renvoie la liste des gains (texte)
function monterNiveau(pj) {
  const niv = (pj.niveau || 3) + 1;
  const p = PROGRESSION[niv];
  if (!p) return [];
  pj.niveau = niv;
  const gains = [];
  const pv = p.pv[pj.classe] || 0;
  pj.pvMax += pv; pj.pv = pj.pvMax;
  pj.desVie.max += 1; pj.desVie.restant = pj.desVie.max;
  gains.push(`+${pv} PV`);
  if (p.maitrise) {
    pj.maitrise += 1; pj.bonusArme += 1;
    if (pj.ddSort) { pj.bonusSort += 1; pj.ddSort += 1; }
    gains.push('maîtrise +3 (+1 attaques et DD)');
  }
  const b = p.bonus && p.bonus[pj.classe];
  if (b === 'arme') { pj.bonusArme += 1; gains.push('+1 au toucher'); }
  if (b === 'sort') { pj.bonusSort += 1; pj.ddSort += 1; gains.push('+1 sorts et DD'); }
  for (const [n, k] of Object.entries((p.emplacements && p.emplacements[pj.classe]) || {})) {
    if (!pj.emplacements[n]) pj.emplacements[n] = { max: 0, restant: 0 };
    pj.emplacements[n].max += k;
    gains.push(`+${k} emplacement${k > 1 ? 's' : ''} niv. ${n}`);
  }
  for (const n in pj.emplacements) pj.emplacements[n].restant = pj.emplacements[n].max;
  const t = p.traits && p.traits[pj.classe];
  if (t) {
    Object.assign(pj.traits, t);
    if (t.attaqueSupp) gains.push('Attaque supplémentaire (2 coups avec les armes)');
    if (t.sournoise) gains.push(`attaque sournoise ${t.sournoise}`);
  }
  const sort = p.sort && p.sort[pj.classe];
  if (sort && !pj.actions.includes(sort)) {
    if (pj.actions.length < MAX_ACTIONS) { pj.actions.push(sort); gains.push(`nouveau sort : ${ACTIONS[sort].nom}`); }
    else gains.push(`${ACTIONS[sort].nom} peut maintenant être appris en récompense`);
  }
  return gains;
}
