// =====================================================================
// Bibliothèque des actions des personnages.
//
// Champs d'une action :
//   nom, icone, desc           : affichage
//   type                       : 'attaque' (jet d20 contre CA), 'sauvegarde' (la cible
//                                fait un jet de sauvegarde contre un DD), 'auto'
//                                (touche toujours), 'soin', 'soutien' (applique un
//                                état), 'special' (code dédié dans combat.js)
//   depuis                     : lignes d'où l'on peut l'utiliser : 'avant', 'arriere'
//   cible                      : 'ennemi', 'allie' ou 'soi'
//   vise                       : lignes visées (côté ennemi ou allié selon `cible`).
//                                ['avant'] = corps à corps. Si toute la ligne Avant
//                                visée est hors de combat, la ligne Arrière devient
//                                atteignable.
//   zone                       : true = touche toutes les cibles valides
//   jet                        : 'arme' (bonus d'attaque), 'sort' (bonus de sort) ou nombre
//   degats, typeDeg            : dés de dégâts et type (tranchant, feu…)
//   nbAttaques                 : plusieurs jets (ex. Rayon ardent)
//   sournoise                  : éligible à l'attaque sournoise du Roublard
//   avantage                   : l'attaque est faite avec avantage
//   carac, dd, moitie          : pour type 'sauvegarde' ; dd = 'sort' ou un nombre
//   soin                       : dés de soin
//   peur                       : variation de Peur appliquée aux cibles
//   etat {nom, duree}          : état appliqué (soutien) ; voir ETATS dans combat.js
//   effetSiTouche/effetSiEchec : {etat, duree, sauvegarde?:{carac, dd}}
//   recul                      : repousse la cible de N rangs
//   niveau                     : coûte un emplacement de sort de ce niveau
//   parCombat                  : nombre d'utilisations par combat
//   deplacement: 'avant'       : le lanceur passe en ligne Avant avant d'agir
//   special                    : nom d'un traitement spécial (combat.js)
// =====================================================================

const ACTIONS = {
  // ------------------------------- GUERRIER ---------------------------
  epee_longue: {
    nom: 'Épée longue', icone: '⚔️', type: 'attaque', arme: true,
    depuis: ['avant'], cible: 'ennemi', vise: ['avant'],
    jet: 'arme', degats: '1d8+3', typeDeg: 'tranchant',
    desc: 'Attaque au corps à corps. 1d8+3 tranchant.'
  },
  coup_bouclier: {
    nom: 'Coup de bouclier', icone: '🛡️', type: 'attaque', arme: true,
    depuis: ['avant'], cible: 'ennemi', vise: ['avant'],
    jet: 'arme', degats: '1d4+3', typeDeg: 'contondant',
    effetSiTouche: { etat: 'etourdi', duree: 1, sauvegarde: { carac: 'CON', dd: 13 } },
    desc: '1d4+3 contondant. Si touché : sauvegarde de CON DD 13 ou étourdi 1 tour.'
  },
  defi: {
    nom: 'Défi', icone: '📣', type: 'soutien',
    depuis: ['avant'], cible: 'soi', vise: [],
    etat: { nom: 'defi', duree: 1 },
    desc: '+2 CA et les ennemis vous ciblent en priorité jusqu\'à votre prochain tour.'
  },
  second_souffle: {
    nom: 'Second souffle', icone: '💨', type: 'soin', parCombat: 1,
    depuis: ['avant', 'arriere'], cible: 'soi', vise: [],
    soin: '1d10+3', peur: -10,
    desc: 'Récupère 1d10+3 PV et −10 Peur. Une fois par combat.'
  },
  balayage: {
    nom: 'Balayage', icone: '🌀', type: 'attaque', arme: true, zone: true,
    depuis: ['avant'], cible: 'ennemi', vise: ['avant'],
    jet: 'arme', degats: '1d6+3', typeDeg: 'tranchant',
    desc: 'Attaque tous les ennemis de la ligne Avant (un jet chacun). 1d6+3.'
  },
  arbalete: {
    nom: 'Arbalète lourde', icone: '🏹', type: 'attaque', arme: true,
    depuis: ['avant', 'arriere'], cible: 'ennemi', vise: ['avant', 'arriere'],
    jet: 3, degats: '1d10+1', typeDeg: 'perforant',
    desc: 'Tir à distance (+3 au toucher). 1d10+1 perforant.'
  },
  charge: {
    nom: 'Charge', icone: '🐗', type: 'attaque', arme: true, deplacement: 'avant',
    depuis: ['arriere'], cible: 'ennemi', vise: ['avant'],
    jet: 'arme', degats: '1d8+1d6+3', typeDeg: 'tranchant',
    desc: 'Depuis l\'arrière : passe en ligne Avant puis frappe. 1d8+1d6+3.'
  },
  cri_ralliement: {
    nom: 'Cri de ralliement', icone: '🎺', type: 'soin', zone: true, parCombat: 1,
    depuis: ['avant', 'arriere'], cible: 'allie', vise: ['avant', 'arriere'], vivantsSeulement: true,
    soin: '1d6', peur: -15,
    desc: 'Tous les alliés debout récupèrent 1d6 PV et −15 Peur. Une fois par combat.'
  },

  // -------------------------------- CLERC -----------------------------
  masse: {
    nom: 'Masse d\'armes', icone: '🔨', type: 'attaque', arme: true,
    depuis: ['avant'], cible: 'ennemi', vise: ['avant'],
    jet: 'arme', degats: '1d6+2', typeDeg: 'contondant',
    desc: 'Corps à corps. 1d6+2 contondant (efficace contre les squelettes).'
  },
  flamme_sacree: {
    nom: 'Flamme sacrée', icone: '🔥', type: 'sauvegarde', sort: true,
    depuis: ['avant', 'arriere'], cible: 'ennemi', vise: ['avant', 'arriere'],
    carac: 'DEX', dd: 'sort', degats: '1d8', typeDeg: 'radiant', moitie: false,
    desc: 'Tour de magie. Sauvegarde de DEX ou 1d8 radiant.'
  },
  soins: {
    nom: 'Soins', icone: '✚', type: 'soin', niveau: 1, sort: true,
    depuis: ['avant', 'arriere'], cible: 'allie', vise: ['avant', 'arriere'],
    soin: '1d8+3', peur: -5,
    desc: 'Niv. 1. Un allié (même à terre) récupère 1d8+3 PV.'
  },
  benediction: {
    nom: 'Bénédiction', icone: '✨', type: 'soutien', niveau: 1, zone: true, sort: true,
    depuis: ['avant', 'arriere'], cible: 'allie', vise: ['avant', 'arriere'], vivantsSeulement: true,
    etat: { nom: 'benit', duree: 3 },
    desc: 'Niv. 1. Tous les alliés : +1d4 aux attaques et sauvegardes pendant 3 tours.'
  },
  mot_guerison: {
    nom: 'Mot de guérison', icone: '💬', type: 'soin', niveau: 1, sort: true,
    depuis: ['avant', 'arriere'], cible: 'allie', vise: ['avant', 'arriere'],
    soin: '2d4+3', peur: -10,
    desc: 'Niv. 1. Un allié récupère 2d4+3 PV et −10 Peur.'
  },
  paroles_espoir: {
    nom: 'Paroles d\'espoir', icone: '🕯️', type: 'soin', sort: true,
    depuis: ['avant', 'arriere'], cible: 'allie', vise: ['avant', 'arriere'], vivantsSeulement: true,
    soin: '0', peur: -25,
    desc: 'Tour de magie. Un allié perd 25 points de Peur.'
  },
  priere_soins: {
    nom: 'Prière de soins', icone: '🙏', type: 'soin', niveau: 2, zone: true, sort: true,
    depuis: ['avant', 'arriere'], cible: 'allie', vise: ['avant', 'arriere'],
    soin: '2d8+3', peur: -5,
    desc: 'Niv. 2. Tous les alliés (même à terre) récupèrent 2d8+3 PV.'
  },
  renvoi: {
    nom: 'Renvoi des morts-vivants', icone: '☀️', type: 'special', special: 'renvoi', parCombat: 1,
    depuis: ['avant', 'arriere'], cible: 'ennemi', vise: ['avant', 'arriere'], zone: true,
    carac: 'SAG', dd: 'sort',
    desc: 'Une fois par combat. Chaque mort-vivant : sauvegarde de SAG ou étourdi 2 tours.'
  },

  esprits_gardiens: {
    nom: 'Esprits gardiens', icone: '👼', type: 'sauvegarde', niveau: 3, zone: true, sort: true, niveauMin: 5,
    depuis: ['avant', 'arriere'], cible: 'ennemi', vise: ['avant', 'arriere'],
    carac: 'SAG', dd: 'sort', degats: '3d8', typeDeg: 'radiant', moitie: true,
    desc: 'Niv. 3. Tous les ennemis : sauvegarde de SAG, 3d8 radiant (moitié si réussite).'
  },

  // ------------------------------- ROUBLARD ---------------------------
  rapiere: {
    nom: 'Rapière', icone: '🗡️', type: 'attaque', arme: true, sournoise: true,
    depuis: ['avant'], cible: 'ennemi', vise: ['avant'],
    jet: 'arme', degats: '1d8+3', typeDeg: 'perforant',
    desc: 'Corps à corps. 1d8+3 perforant. Attaque sournoise possible.'
  },
  arc_court: {
    nom: 'Arc court', icone: '🏹', type: 'attaque', arme: true, sournoise: true,
    depuis: ['avant', 'arriere'], cible: 'ennemi', vise: ['avant', 'arriere'],
    jet: 'arme', degats: '1d6+3', typeDeg: 'perforant',
    desc: 'À distance. 1d6+3 perforant. Attaque sournoise possible.'
  },
  se_cacher: {
    nom: 'Se cacher', icone: '🌑', type: 'soutien',
    depuis: ['arriere'], cible: 'soi', vise: [],
    etat: { nom: 'cache', duree: 99 },
    desc: 'Votre prochaine attaque est faite avec avantage (donc attaque sournoise).'
  },
  lame_empoisonnee: {
    nom: 'Lame empoisonnée', icone: '🧪', type: 'attaque', arme: true, sournoise: true,
    depuis: ['avant'], cible: 'ennemi', vise: ['avant'],
    jet: 'arme', degats: '1d4+3', typeDeg: 'perforant',
    effetSiTouche: { etat: 'empoisonne', duree: 2, sauvegarde: { carac: 'CON', dd: 13 } },
    desc: '1d4+3. Si touché : sauvegarde de CON DD 13 ou empoisonné 2 tours (désavantage aux attaques).'
  },
  feinte: {
    nom: 'Feinte', icone: '🎭', type: 'attaque', arme: true, sournoise: true, avantage: true,
    depuis: ['avant'], cible: 'ennemi', vise: ['avant'],
    jet: 'arme', degats: '1d6+3', typeDeg: 'perforant',
    desc: 'Attaque avec avantage. 1d6+3 (+ attaque sournoise).'
  },
  dague_lancer: {
    nom: 'Dagues de lancer', icone: '🔪', type: 'attaque', arme: true, nbAttaques: 2,
    depuis: ['avant', 'arriere'], cible: 'ennemi', vise: ['avant', 'arriere'],
    jet: 'arme', degats: '1d4+3', typeDeg: 'perforant',
    desc: 'Deux lancers sur la même cible. 1d4+3 chacun.'
  },
  pas_lateral: {
    nom: 'Esquive instinctive', icone: '🌪️', type: 'soutien',
    depuis: ['avant', 'arriere'], cible: 'soi', vise: [],
    etat: { nom: 'esquive', duree: 1 }, peur: -10,
    desc: 'Les attaques contre vous ont désavantage jusqu\'à votre prochain tour. −10 Peur.'
  },

  // ------------------------------- MAGICIEN ---------------------------
  trait_feu: {
    nom: 'Trait de feu', icone: '🔥', type: 'attaque', sort: true,
    depuis: ['avant', 'arriere'], cible: 'ennemi', vise: ['avant', 'arriere'],
    jet: 'sort', degats: '1d10', typeDeg: 'feu',
    desc: 'Tour de magie. Attaque de sort, 1d10 feu.'
  },
  projectile_magique: {
    nom: 'Projectile magique', icone: '✴️', type: 'auto', niveau: 1, sort: true,
    depuis: ['avant', 'arriere'], cible: 'ennemi', vise: ['avant', 'arriere'],
    degats: '3d4+3', typeDeg: 'force',
    desc: 'Niv. 1. Touche automatiquement : 3d4+3 force.'
  },
  mains_brulantes: {
    nom: 'Mains brûlantes', icone: '🖐️', type: 'sauvegarde', niveau: 1, zone: true, sort: true,
    depuis: ['avant', 'arriere'], cible: 'ennemi', vise: ['avant'],
    carac: 'DEX', dd: 'sort', degats: '3d6', typeDeg: 'feu', moitie: true,
    desc: 'Niv. 1. Toute la ligne Avant ennemie : sauvegarde de DEX, 3d6 feu (moitié si réussite).'
  },
  rayon_ardent: {
    nom: 'Rayon ardent', icone: '☄️', type: 'attaque', niveau: 2, nbAttaques: 3, sort: true,
    depuis: ['avant', 'arriere'], cible: 'ennemi', vise: ['avant', 'arriere'],
    jet: 'sort', degats: '2d6', typeDeg: 'feu',
    desc: 'Niv. 2. Trois attaques de sort sur la cible, 2d6 feu chacune.'
  },
  sommeil: {
    nom: 'Sommeil', icone: '💤', type: 'special', special: 'sommeil', niveau: 1, zone: true, sort: true,
    depuis: ['avant', 'arriere'], cible: 'ennemi', vise: ['avant', 'arriere'],
    desc: 'Niv. 1. Lancez 5d8 : les ennemis aux PV les plus bas s\'endorment dans cette limite (sauf morts-vivants).'
  },
  rayon_givre: {
    nom: 'Rayon de givre', icone: '❄️', type: 'attaque', sort: true,
    depuis: ['avant', 'arriere'], cible: 'ennemi', vise: ['avant', 'arriere'],
    jet: 'sort', degats: '1d8', typeDeg: 'froid',
    effetSiTouche: { etat: 'entrave', duree: 1 },
    desc: 'Tour de magie. 1d8 froid ; la cible a désavantage à sa prochaine attaque.'
  },
  vague_tonnante: {
    nom: 'Vague tonnante', icone: '🌊', type: 'sauvegarde', niveau: 1, zone: true, sort: true,
    depuis: ['avant'], cible: 'ennemi', vise: ['avant'],
    carac: 'CON', dd: 'sort', degats: '2d8', typeDeg: 'tonnerre', moitie: true,
    effetSiEchec: { recul: 1 },
    desc: 'Niv. 1. Ligne Avant ennemie : sauvegarde de CON, 2d8 tonnerre (moitié si réussite), repoussé à l\'arrière si échec.'
  },
  bouclier_sort: {
    nom: 'Bouclier', icone: '🔰', type: 'soutien', niveau: 1, sort: true,
    depuis: ['avant', 'arriere'], cible: 'soi', vise: [],
    etat: { nom: 'bouclier', duree: 1 },
    desc: 'Niv. 1. +5 CA jusqu\'à votre prochain tour.'
  },

  boule_feu: {
    nom: 'Boule de feu', icone: '💥', type: 'sauvegarde', niveau: 3, zone: true, sort: true, niveauMin: 5,
    depuis: ['avant', 'arriere'], cible: 'ennemi', vise: ['avant', 'arriere'],
    carac: 'DEX', dd: 'sort', degats: '8d6', typeDeg: 'feu', moitie: true,
    desc: 'Niv. 3. Tous les ennemis : sauvegarde de DEX, 8d6 feu (moitié si réussite).'
  },

  // ------------------------- ACTIONS COMMUNES ------------------------
  changer_ligne: {
    nom: 'Changer de ligne', icone: '↕️', type: 'special', special: 'changer_ligne', commune: true,
    depuis: ['avant', 'arriere'], cible: 'soi', vise: [],
    desc: 'Passez de la ligne Avant à la ligne Arrière, ou l\'inverse.'
  },
  potion: {
    nom: 'Potion de soins', icone: '🧴', type: 'special', special: 'potion', commune: true,
    depuis: ['avant', 'arriere'], cible: 'allie', vise: ['avant', 'arriere'], inclureATerre: true,
    desc: 'Vous ou un allié (même à terre) récupère 2d4+2 PV.'
  },
  esquiver: {
    nom: 'Esquiver', icone: '🛡', type: 'soutien', commune: true,
    depuis: ['avant', 'arriere'], cible: 'soi', vise: [],
    etat: { nom: 'esquive', duree: 1 },
    desc: 'Les attaques contre vous ont désavantage jusqu\'à votre prochain tour.'
  }
};

const ACTIONS_COMMUNES = ['changer_ligne', 'potion', 'esquiver'];
