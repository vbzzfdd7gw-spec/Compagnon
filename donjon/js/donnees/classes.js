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
// Actions préparées : 5, ou 6 pour les lanceurs de sorts ; les autres attendent dans le grimoire
function maxActions(pj) { return CLASSES[pj.classe] && CLASSES[pj.classe].emplacements ? MAX_ACTIONS + 1 : MAX_ACTIONS; }
// Apprend une action : préparée s'il reste de la place, sinon rangée dans le grimoire
function apprendre(pj, id) {
  pj.grimoire = pj.grimoire || [];
  if (pj.actions.includes(id) || pj.grimoire.includes(id)) return '';
  if (pj.actions.length < maxActions(pj)) { pj.actions.push(id); return `nouveau sort préparé : ${ACTIONS[id].nom}`; }
  pj.grimoire.push(id);
  return `${ACTIONS[id].nom} rangé dans le grimoire`;
}
// Trois sorts proposés à la montée de niveau (le sort de PROGRESSION en fait toujours partie)
function optionsSorts(pj, niv, fixe) {
  const connus = new Set([...pj.actions, ...(pj.grimoire || [])]);
  const maxEmpl = Math.max(0, ...Object.keys(pj.emplacements || {}).map(Number));
  const ok = id => ACTIONS[id] && !connus.has(id) && (ACTIONS[id].niveauMin || 0) <= niv && (!ACTIONS[id].niveau || ACTIONS[id].niveau <= maxEmpl);
  const pool = Des.melanger((CLASSES[pj.classe].poolActions || []).filter(id => ok(id) && id !== fixe && (ACTIONS[id].sort || ACTIONS[id].niveau)));
  const choix = (fixe && ok(fixe) ? [fixe] : []).concat(pool).slice(0, 3);
  return choix;
}
// Choix en attente résolus sans le joueur (Chaos, simulateur, ancienne sauvegarde)
function resoudreChoixSorts(pj, auHasard = false) {
  while (pj.choixSorts && pj.choixSorts.length) { const c = pj.choixSorts.shift(); if (c.length) apprendre(pj, auHasard ? Des.hasard(c) : c[0]); }
}

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
    poolActions: ['mot_guerison', 'paroles_espoir', 'priere_soins', 'renvoi', 'esprits_gardiens', 'bannissement', 'blessure', 'bouclier_foi', 'immobilisation', 'soins_groupe'],
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
    poolActions: ['sommeil', 'rayon_givre', 'vague_tonnante', 'orbe_chromatique', 'boule_feu', 'tempete_grele', 'bannissement', 'rayon_empoisonne', 'fracassement', 'immobilisation', 'invisibilite', 'image_miroir', 'lenteur', 'terreur'],
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
    poolActions: ['faveur_divine', 'defi', 'renvoi', 'soins', 'bouclier_foi', 'heroisme', 'injonction'],
    desc: 'Aura de protection : +1 aux sauvegardes de toute l\'équipe tant qu\'il est debout. Châtiment divin dévastateur.'
  },
  rodeur: {
    nom: 'Rôdeur', icone: '🏹', couleur: '#5f8b3a', ligne: 'arriere', role: 'Distance · traque',
    pv: 24, ca: 15,
    caracs: { FOR: 12, DEX: 16, CON: 14, INT: 10, SAG: 14, CHA: 8 },
    maitrise: 2, bonusArme: 5, bonusSort: 4, ddSort: 12,
    sauvegardes: ['FOR', 'DEX'], deVie: 10, emplacements: { 1: 3 },
    actions: ['arc_long', 'epees_jumelles', 'marque_chasseur', 'volee'],
    poolActions: ['tir_precis', 'piege', 'coup_bas', 'soins', 'frappe_zephyr'],
    desc: 'Tireur régulier. Sa Marque du chasseur ajoute 1d6 à toutes ses attaques contre la cible.'
  },
  barde: {
    nom: 'Barde', icone: '🎻', couleur: '#c0508a', ligne: 'arriere', role: 'Soutien · contrôle',
    pv: 23, ca: 14,
    caracs: { FOR: 8, DEX: 14, CON: 12, INT: 12, SAG: 10, CHA: 16 },
    maitrise: 2, bonusArme: 4, bonusSort: 5, ddSort: 13,
    sauvegardes: ['DEX', 'CHA'], deVie: 8, emplacements: { 1: 4, 2: 2 },
    actions: ['rapiere', 'moquerie', 'inspiration', 'mot_guerison'],
    poolActions: ['murmure', 'chant_courage', 'sommeil', 'hypnose', 'confusion', 'lueurs_feeriques', 'fracassement', 'immobilisation', 'invisibilite', 'soins_groupe', 'terreur'],
    desc: 'Inspire ses alliés (+1d6), affaiblit les ennemis, soigne et calme la Peur.'
  },
  druide: {
    nom: 'Druide', icone: '🌿', couleur: '#4f9a6a', ligne: 'arriere', role: 'Soins · contrôle',
    pv: 28, ca: 16,
    caracs: { FOR: 10, DEX: 12, CON: 14, INT: 12, SAG: 16, CHA: 10 },
    maitrise: 2, bonusArme: 3, bonusSort: 5, ddSort: 13,
    sauvegardes: ['INT', 'SAG'], deVie: 8, emplacements: { 1: 4, 2: 2 },
    actions: ['flammeche', 'soins', 'enchevetrement', 'rayon_lune'],
    poolActions: ['gourdin', 'peau_ecorce', 'vague_tonnante', 'appel_foudre', 'fletrissement', 'tempete_grele', 'lueurs_feeriques', 'chaleur_metal', 'immobilisation', 'tempete_neige'],
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
  ensorceleur: {
    nom: 'Ensorceleur', icone: '🌟', couleur: '#d0503a', ligne: 'arriere', role: 'Dégâts · métamagie',
    pv: 24, ca: 13, ressources: { sorcellerie: 4 }, ressourcesNiv5: { sorcellerie: 6 },
    caracs: { FOR: 8, DEX: 14, CON: 14, INT: 10, SAG: 10, CHA: 16 },
    maitrise: 2, bonusArme: 4, bonusSort: 5, ddSort: 13,
    sauvegardes: ['CON', 'CHA'], deVie: 6, emplacements: { 1: 4, 2: 3 },
    actions: ['trait_feu', 'orbe_chromatique', 'rayon_ardent', 'sort_jumele', 'sort_intensifie'],
    poolActions: ['poigne_electrique', 'mains_brulantes', 'source_magie', 'eclair', 'tempete_grele', 'fletrissement', 'rayon_empoisonne', 'fracassement', 'immobilisation', 'image_miroir', 'lenteur', 'tempete_neige', 'terreur'],
    desc: 'Magie innée : 4 points de sorcellerie (6 au niveau 5) pour la métamagie, en action bonus : sort jumelé (deux cibles) ou intensifié (×1,5 dégâts).'
  },
  artificier: {
    nom: 'Artificier', icone: '⚙️', couleur: '#b8863a', ligne: 'avant', role: 'Soutien · inventions',
    pv: 28, ca: 17,
    caracs: { FOR: 10, DEX: 14, CON: 14, INT: 16, SAG: 12, CHA: 8 },
    maitrise: 2, bonusArme: 5, bonusSort: 5, ddSort: 13,
    sauvegardes: ['CON', 'INT'], deVie: 8, emplacements: { 1: 3 },
    actions: ['arbalete_artificier', 'trait_feu', 'soins', 'infusion_arme'],
    poolActions: ['graisse', 'fiole_acide', 'vague_tonnante', 'aide', 'lueurs_feeriques', 'invisibilite'],
    desc: 'Inventeur polyvalent : arbalète et tours de magie, soins, et infusions qui enchantent les armes des alliés.'
  },
  occultiste: {
    nom: 'Occultiste', icone: '🧿', couleur: '#7a3fb0', ligne: 'arriere', role: 'Distance · malédictions',
    pv: 24, ca: 13, pacte: true,
    caracs: { FOR: 8, DEX: 14, CON: 14, INT: 12, SAG: 10, CHA: 16 },
    maitrise: 2, bonusArme: 4, bonusSort: 5, ddSort: 13,
    sauvegardes: ['SAG', 'CHA'], deVie: 8, emplacements: { 2: 2 },
    actions: ['decharge_occulte', 'malefice', 'bras_hadar', 'effroi'],
    poolActions: ['armure_agathys', 'decharge_repoussante', 'faim_hadar', 'fletrissement', 'bannissement', 'fracassement', 'immobilisation', 'invisibilite', 'image_miroir', 'terreur'],
    desc: 'Magie de pacte : seulement 2 emplacements, toujours lancés au niveau maximum et récupérés à chaque repos court. Décharge occulte à volonté, Maléfice en action bonus.'
  }
};

// Équipe par défaut, et ordre d'affichage de toutes les classes
const ORDRE_CLASSES = ['guerrier', 'clerc', 'roublard', 'magicien'];
const TOUTES_CLASSES = ['guerrier', 'barbare', 'paladin', 'moine', 'artificier', 'clerc', 'druide', 'barde', 'roublard', 'rodeur', 'magicien', 'ensorceleur', 'occultiste'];
// Classes capables de soigner (pour les conseils de composition)
const SOIGNEURS = ['clerc', 'paladin', 'druide', 'barde', 'artificier'];

// Crée un personnage jouable à partir de sa classe (et de sa sous-classe, la première par défaut)
function creerPJ(idClasse, idSousClasse) {
  const c = CLASSES[idClasse];
  const emplacements = {};
  for (const niv in c.emplacements) emplacements[niv] = { max: c.emplacements[niv], restant: c.emplacements[niv] };
  const pj = {
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
  return typeof appliquerSousClasse === 'function' ? appliquerSousClasse(pj, typeof idSousClasse === 'string' ? idSousClasse : null) : pj;
}

// ---------------------------------------------------------------------
// Montée de niveau (quand l'XP atteint SEUILS_XP)
//   pv          : PV gagnés par classe
//   emplacements: emplacements de sorts gagnés { niveau: nombre }
//   maitrise    : +1 au bonus de maîtrise (attaques, DD, sauvegardes maîtrisées)
//   bonus       : +1 arme ou sort
//   traits      : capacités (attaqueSupp, sournoise)
//   sort        : sort appris (s'il reste de la place, sinon proposé en récompense)
// ---------------------------------------------------------------------
const PROGRESSION = {
  4: {
    pv: { guerrier: 8, clerc: 7, roublard: 7, magicien: 5, barbare: 9, paladin: 8, rodeur: 7, barde: 6, druide: 6, moine: 6, occultiste: 6, ensorceleur: 5, artificier: 6 },
    emplacements: { clerc: { 2: 1 }, magicien: { 2: 1 }, barde: { 2: 1 }, druide: { 2: 1 }, paladin: { 1: 1 }, rodeur: { 1: 1 }, ensorceleur: { 2: 1 }, artificier: { 1: 1 } },
    bonus: { guerrier: 'arme', roublard: 'arme', clerc: 'sort', magicien: 'sort', barbare: 'arme', paladin: 'arme', rodeur: 'arme', barde: 'sort', druide: 'sort', moine: 'arme', occultiste: 'sort', ensorceleur: 'sort', artificier: 'sort' }
  },
  5: {
    pv: { guerrier: 8, clerc: 7, roublard: 7, magicien: 5, barbare: 9, paladin: 8, rodeur: 7, barde: 6, druide: 6, moine: 6, occultiste: 6, ensorceleur: 5, artificier: 6 },
    maitrise: true,
    emplacements: { clerc: { 3: 2 }, magicien: { 3: 2 }, barde: { 3: 2 }, druide: { 3: 2 }, paladin: { 2: 2 }, rodeur: { 2: 2 }, ensorceleur: { 3: 2 }, artificier: { 2: 2 } },
    traits: { guerrier: { attaqueSupp: true }, roublard: { sournoise: '3d6' }, barbare: { attaqueSupp: true }, paladin: { attaqueSupp: true }, rodeur: { attaqueSupp: true }, occultiste: { decharge2: true } },
    // Magie de pacte : les emplacements montent tous d'un niveau (et non s'ajoutent)
    pacte: { occultiste: { 3: 2 } },
    sort: { magicien: 'boule_feu', clerc: 'esprits_gardiens', barde: 'hypnose', druide: 'appel_foudre', occultiste: 'faim_hadar', ensorceleur: 'eclair', artificier: 'aide' }
  },
  // Niveau 6 : capacité de sous-classe (niv6 dans sousclasses.js), un emplacement de niveau 3
  6: {
    pv: { guerrier: 8, clerc: 7, roublard: 7, magicien: 5, barbare: 9, paladin: 8, rodeur: 7, barde: 6, druide: 6, moine: 6, occultiste: 6, ensorceleur: 5, artificier: 6 },
    emplacements: { clerc: { 3: 1 }, magicien: { 3: 1 }, barde: { 3: 1 }, druide: { 3: 1 }, ensorceleur: { 3: 1 } },
    bonus: { guerrier: 'arme', roublard: 'arme', barbare: 'arme', paladin: 'arme', rodeur: 'arme', moine: 'arme', occultiste: 'sort', artificier: 'sort' },
    traits: { artificier: { attaqueSupp: true } }
  },
  // Niveau 7 : sorts de niveau 4 pour les lanceurs, capacités martiales
  7: {
    pv: { guerrier: 8, clerc: 7, roublard: 7, magicien: 5, barbare: 9, paladin: 8, rodeur: 7, barde: 6, druide: 6, moine: 6, occultiste: 6, ensorceleur: 5, artificier: 6 },
    emplacements: { clerc: { 4: 1 }, magicien: { 4: 1 }, barde: { 4: 1 }, druide: { 4: 1 }, ensorceleur: { 4: 1 }, paladin: { 2: 1 }, rodeur: { 2: 1 }, artificier: { 2: 1 } },
    pacte: { occultiste: { 4: 2 } },
    bonus: { paladin: 'arme', rodeur: 'arme', artificier: 'sort' },
    traits: { guerrier: { indomptable: true }, barbare: { brutal: true, init: 4 }, moine: { evasion: true }, roublard: { evasion: true, sournoise: '4d6' } },
    sort: { magicien: 'tempete_grele', clerc: 'bannissement', barde: 'confusion', druide: 'fletrissement', occultiste: 'fletrissement', ensorceleur: 'tempete_grele' }
  }
};
const NIVEAU_MAX = 7;

// Expérience : gagnée à chaque victoire (et dans certains événements) ;
// seuils d'XP cumulée pour atteindre chaque niveau
const GAINS_XP = { combat: 10, elite: 30, boss: 50 };
const SEUILS_XP = { 4: 70, 5: 200, 6: 320, 7: 420 };
function niveauPourXP(xp) {
  let n = 3;
  while (SEUILS_XP[n + 1] !== undefined && xp >= SEUILS_XP[n + 1]) n++;
  return n;
}

// Applique le niveau suivant ; renvoie la liste des gains (texte)
function monterNiveau(pj) {
  const niv = (pj.niveau || 3) + 1;
  const p = PROGRESSION[niv];
  if (!p) return [];
  pj.niveau = niv;
  const gains = [];
  const pv = p.pv[pj.classe] || 0;
  const resAvant = ressourcesPJ(pj);
  pj.pvMax += pv; if (pj.pv > 0) pj.pv += pv;
  pj.desVie.max += 1; pj.desVie.restant += 1;
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
    pj.emplacements[n].max += k; pj.emplacements[n].restant += k;
    gains.push(`+${k} emplacement${k > 1 ? 's' : ''} niv. ${n}`);
  }
  const pacte = p.pacte && p.pacte[pj.classe];
  if (pacte) {
    const restants = Object.values(pj.emplacements).reduce((t, e) => t + e.restant, 0);
    pj.emplacements = {};
    for (const [n, k] of Object.entries(pacte)) { pj.emplacements[n] = { max: k, restant: Math.min(k, restants) }; gains.push(`emplacements de pacte niv. ${n}`); }
  }
  const t = p.traits && p.traits[pj.classe];
  if (t) {
    for (const [k, v] of Object.entries(t)) pj.traits[k] = k === 'init' ? (pj.traits[k] || 0) + v : v;
    if (t.attaqueSupp) gains.push('Attaque supplémentaire (2 coups avec les armes)');
    if (t.sournoise) gains.push(`attaque sournoise ${t.sournoise}`);
    if (t.indomptable) gains.push('Indomptable (relance une sauvegarde ratée par combat)');
    if (t.brutal) gains.push('Critique brutal (+1 dé aux critiques) et Instinct sauvage (+4 initiative)');
    if (t.evasion) gains.push('Évasion (sauvegarde de DEX réussie : aucun dégât ; ratée : moitié)');
  }
  // Lanceurs de sorts : un nouveau sort au choix parmi trois
  if (CLASSES[pj.classe].emplacements) {
    const choix = optionsSorts(pj, niv, p.sort && p.sort[pj.classe]);
    if (choix.length) { pj.choixSorts = pj.choixSorts || []; pj.choixSorts.push(choix); gains.push('📜 un nouveau sort à choisir'); }
  }
  if (typeof niveauSousClasse === 'function') gains.push(...niveauSousClasse(pj, niv));
  // Ressources gagnées (rages, charges…) : la différence est ajoutée tout de suite
  const resApres = ressourcesPJ(pj);
  pj.ressources = pj.ressources || {};
  for (const r in resApres) if (resApres[r] > (resAvant[r] || 0)) pj.ressources[r] = (pj.ressources[r] || 0) + resApres[r] - (resAvant[r] || 0);
  return gains;
}
