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
    nom: 'Guerrier', icone: '🛡️', couleur: '#c0553a', ligne: 'avant', role: 'Front · protège',
    pv: 28, ca: 18,
    caracs: { FOR: 16, DEX: 12, CON: 14, INT: 10, SAG: 12, CHA: 10 },
    maitrise: 2, bonusArme: 5, bonusSort: 0, ddSort: 0,
    sauvegardes: ['FOR', 'CON'], deVie: 10, emplacements: {},
    actions: ['epee_longue', 'coup_bouclier', 'defi', 'second_souffle'],
    poolActions: ['balayage', 'arbalete', 'charge', 'cri_ralliement'],
    desc: 'Tient la première ligne. Robuste, protège ses alliés.'
  },
  clerc: {
    nom: 'Clerc', icone: '✝️', couleur: '#d8b04a', ligne: 'avant', role: 'Soins · soutien',
    pv: 24, ca: 18,
    caracs: { FOR: 14, DEX: 10, CON: 14, INT: 10, SAG: 16, CHA: 12 },
    maitrise: 2, bonusArme: 4, bonusSort: 5, ddSort: 13,
    sauvegardes: ['SAG', 'CHA'], deVie: 8, emplacements: { 1: 4, 2: 2 },
    actions: ['masse', 'flamme_sacree', 'soins', 'benediction'],
    poolActions: ['mot_guerison', 'paroles_espoir', 'priere_soins', 'renvoi', 'esprits_gardiens'],
    desc: 'Soigne, bénit et calme la Peur. Emplacements de sorts limités.'
  },
  roublard: {
    nom: 'Roublard', icone: '🗡️', couleur: '#5f9b6a', ligne: 'arriere', role: 'Dégâts · sournois',
    pv: 26, ca: 15,
    caracs: { FOR: 10, DEX: 16, CON: 12, INT: 13, SAG: 12, CHA: 12 },
    maitrise: 2, bonusArme: 5, bonusSort: 0, ddSort: 0,
    sauvegardes: ['DEX', 'INT'], deVie: 8, emplacements: {},
    actions: ['rapiere', 'arc_court', 'se_cacher'],
    poolActions: ['lame_empoisonnee', 'feinte', 'dague_lancer', 'coup_bas'],
    sournoise: '2d6',
    desc: 'Attaque sournoise (+2d6) une fois par tour : avec avantage, ou si la cible est en ligne Avant et qu\'un autre allié debout est en ligne Avant.'
  },
  magicien: {
    nom: 'Magicien', icone: '🔮', couleur: '#6b72d6', ligne: 'arriere', role: 'Dégâts de zone',
    pv: 22, ca: 13,
    caracs: { FOR: 8, DEX: 14, CON: 12, INT: 16, SAG: 12, CHA: 10 },
    maitrise: 2, bonusArme: 4, bonusSort: 5, ddSort: 13,
    sauvegardes: ['INT', 'SAG'], deVie: 6, emplacements: { 1: 4, 2: 2 },
    actions: ['trait_feu', 'projectile_magique', 'mains_brulantes', 'rayon_ardent'],
    poolActions: ['sommeil', 'rayon_givre', 'vague_tonnante', 'orbe_chromatique', 'boule_feu'],
    desc: 'Fragile mais dévastateur depuis l\'arrière. Emplacements de sorts limités.'
  },
  barbare: {
    nom: 'Barbare', icone: '🪓', couleur: '#b5562f', ligne: 'avant', role: 'Front · encaisse',
    pv: 32, ca: 14, ressources: { rage: 3 },
    caracs: { FOR: 16, DEX: 14, CON: 16, INT: 8, SAG: 12, CHA: 10 },
    maitrise: 2, bonusArme: 5, bonusSort: 0, ddSort: 0,
    sauvegardes: ['FOR', 'CON'], deVie: 12, emplacements: {},
    actions: ['hache_2m', 'rage', 'frappe_temeraire', 'hachette'],
    poolActions: ['fureur', 'coup_tete', 'cri_ralliement'],
    desc: 'Beaucoup de PV. Sa rage dure tout le combat : +2 aux dégâts et moitié de tous les dégâts reçus. 3 rages jusqu\'au repos long.'
  },
  paladin: {
    nom: 'Paladin', icone: '⚜️', couleur: '#e0c060', ligne: 'avant', role: 'Front · soutien',
    pv: 24, ca: 17, traits: { aura: true },
    caracs: { FOR: 16, DEX: 10, CON: 14, INT: 8, SAG: 10, CHA: 16 },
    maitrise: 2, bonusArme: 5, bonusSort: 5, ddSort: 13,
    sauvegardes: ['SAG', 'CHA'], deVie: 10, emplacements: { 1: 2 },
    actions: ['epee_longue', 'chatiment', 'imposition', 'benediction'],
    poolActions: ['faveur_divine', 'defi', 'renvoi', 'soins'],
    desc: 'Aura de protection : +1 aux sauvegardes de toute l\'équipe tant qu\'il est debout. Châtiment divin dévastateur.'
  },
  rodeur: {
    nom: 'Rôdeur', icone: '🏹', couleur: '#5f8b3a', ligne: 'arriere', role: 'Distance · traque',
    pv: 24, ca: 15,
    caracs: { FOR: 12, DEX: 16, CON: 14, INT: 10, SAG: 14, CHA: 8 },
    maitrise: 2, bonusArme: 5, bonusSort: 4, ddSort: 12,
    sauvegardes: ['FOR', 'DEX'], deVie: 10, emplacements: { 1: 3 },
    actions: ['arc_long', 'epees_jumelles', 'marque_chasseur', 'volee'],
    poolActions: ['tir_precis', 'piege', 'coup_bas'],
    desc: 'Tireur régulier. Sa Marque du chasseur ajoute 1d6 à toutes ses attaques contre la cible.'
  },
  barde: {
    nom: 'Barde', icone: '🎻', couleur: '#c0508a', ligne: 'arriere', role: 'Soutien · contrôle',
    pv: 23, ca: 14,
    caracs: { FOR: 8, DEX: 14, CON: 12, INT: 12, SAG: 10, CHA: 16 },
    maitrise: 2, bonusArme: 4, bonusSort: 5, ddSort: 13,
    sauvegardes: ['DEX', 'CHA'], deVie: 8, emplacements: { 1: 4, 2: 2 },
    actions: ['rapiere', 'moquerie', 'inspiration', 'mot_guerison'],
    poolActions: ['murmure', 'chant_courage', 'sommeil', 'hypnose'],
    desc: 'Inspire ses alliés (+1d6), affaiblit les ennemis, soigne et calme la Peur.'
  },
  druide: {
    nom: 'Druide', icone: '🌿', couleur: '#4f9a6a', ligne: 'arriere', role: 'Soins · contrôle',
    pv: 28, ca: 16,
    caracs: { FOR: 10, DEX: 12, CON: 14, INT: 12, SAG: 16, CHA: 10 },
    maitrise: 2, bonusArme: 3, bonusSort: 5, ddSort: 13,
    sauvegardes: ['INT', 'SAG'], deVie: 8, emplacements: { 1: 4, 2: 2 },
    actions: ['flammeche', 'soins', 'enchevetrement', 'rayon_lune'],
    poolActions: ['gourdin', 'peau_ecorce', 'vague_tonnante', 'appel_foudre'],
    desc: 'Soigne, entrave les ennemis et frappe avec la magie de la nature.'
  },
  moine: {
    nom: 'Moine', icone: '👊', couleur: '#d08a30', ligne: 'avant', role: 'Front · mobile',
    pv: 22, ca: 16,
    caracs: { FOR: 10, DEX: 16, CON: 14, INT: 10, SAG: 16, CHA: 8 },
    maitrise: 2, bonusArme: 5, bonusSort: 0, ddSort: 0,
    sauvegardes: ['FOR', 'DEX'], deVie: 8, emplacements: {},
    actions: ['arts_martiaux', 'deluge', 'frappe_etourdissante', 'defense_patiente'],
    poolActions: ['coup_pied_vol', 'coup_tete', 'feinte'],
    desc: 'Plusieurs coups par tour, étourdit ses cibles et esquive facilement.'
  },
  occultiste: {
    nom: 'Occultiste', icone: '🧿', couleur: '#7a3fb0', ligne: 'arriere', role: 'Distance · malédictions',
    pv: 24, ca: 13, pacte: true,
    caracs: { FOR: 8, DEX: 14, CON: 14, INT: 12, SAG: 10, CHA: 16 },
    maitrise: 2, bonusArme: 4, bonusSort: 5, ddSort: 13,
    sauvegardes: ['SAG', 'CHA'], deVie: 8, emplacements: { 2: 2 },
    actions: ['decharge_occulte', 'malefice', 'bras_hadar', 'effroi'],
    poolActions: ['armure_agathys', 'decharge_repoussante', 'faim_hadar'],
    desc: 'Magie de pacte : seulement 2 emplacements, toujours lancés au niveau maximum et récupérés à chaque repos court. Décharge occulte à volonté, Maléfice en action bonus.'
  }
};

// Équipe par défaut, et ordre d'affichage de toutes les classes
const ORDRE_CLASSES = ['guerrier', 'clerc', 'roublard', 'magicien'];
const TOUTES_CLASSES = ['guerrier', 'barbare', 'paladin', 'moine', 'clerc', 'druide', 'barde', 'roublard', 'rodeur', 'magicien', 'occultiste'];
// Classes capables de soigner (pour les conseils de composition)
const SOIGNEURS = ['clerc', 'paladin', 'druide', 'barde'];

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
    ressources: { ...(c.ressources || {}) },
    actions: c.actions.slice(),
    objets: [],
    peur: 0,
    etats: {},
    usages: {},
    traits: { ...(c.traits || {}) }
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
    pv: { guerrier: 8, clerc: 7, roublard: 7, magicien: 5, barbare: 9, paladin: 8, rodeur: 7, barde: 6, druide: 6, moine: 6, occultiste: 6 },
    emplacements: { clerc: { 2: 1 }, magicien: { 2: 1 }, barde: { 2: 1 }, druide: { 2: 1 }, paladin: { 1: 1 }, rodeur: { 1: 1 } },
    bonus: { guerrier: 'arme', roublard: 'arme', clerc: 'sort', magicien: 'sort', barbare: 'arme', paladin: 'arme', rodeur: 'arme', barde: 'sort', druide: 'sort', moine: 'arme', occultiste: 'sort' }
  },
  5: {
    pv: { guerrier: 8, clerc: 7, roublard: 7, magicien: 5, barbare: 9, paladin: 8, rodeur: 7, barde: 6, druide: 6, moine: 6, occultiste: 6 },
    maitrise: true,
    emplacements: { clerc: { 3: 2 }, magicien: { 3: 2 }, barde: { 3: 2 }, druide: { 3: 2 }, paladin: { 2: 2 }, rodeur: { 2: 2 } },
    traits: { guerrier: { attaqueSupp: true }, roublard: { sournoise: '3d6' }, barbare: { attaqueSupp: true }, paladin: { attaqueSupp: true }, rodeur: { attaqueSupp: true }, occultiste: { decharge2: true } },
    // Magie de pacte : les emplacements montent tous d'un niveau (et non s'ajoutent)
    pacte: { occultiste: { 3: 2 } },
    sort: { magicien: 'boule_feu', clerc: 'esprits_gardiens', barde: 'hypnose', druide: 'appel_foudre', occultiste: 'faim_hadar' }
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
  const pacte = p.pacte && p.pacte[pj.classe];
  if (pacte) {
    pj.emplacements = {};
    for (const [n, k] of Object.entries(pacte)) { pj.emplacements[n] = { max: k, restant: k }; gains.push(`emplacements de pacte niv. ${n}`); }
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
