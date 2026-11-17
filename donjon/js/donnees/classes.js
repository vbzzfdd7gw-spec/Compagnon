// =====================================================================
// Classes des personnages (niveau 3, bonus de maîtrise +2).
//   actions         : actions connues au départ (identifiants de ACTIONS)
//   poolActions     : actions pouvant être apprises en récompense
//   emplacements    : emplacements de sorts par niveau
//   sauvegardes     : caractéristiques maîtrisées pour les jets de sauvegarde
//   deVie           : taille du dé de vie (le PJ en a 3 au niveau 3)
//   ligne           : ligne de départ ('avant' ou 'arriere')
// =====================================================================

const MAX_ACTIONS = 4;

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
    poolActions: ['mot_guerison', 'paroles_espoir', 'priere_soins', 'renvoi'],
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
    poolActions: ['sommeil', 'rayon_givre', 'vague_tonnante', 'bouclier_sort'],
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
    actions: c.actions.slice(),
    objets: [],
    peur: 0,
    etats: {},
    usages: {},
    traits: {}
  };
}
