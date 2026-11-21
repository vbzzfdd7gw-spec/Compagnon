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
//   triangle                   : N = touche la cible choisie et ses N−1 voisins
//                                les plus proches (même ligne d'abord)
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
//   ressource                  : coûte 1 de cette ressource du héros (rage, supériorité…)
//   actionBonus                : le héros rejoue aussitôt (une fois par tour)
//   requiertEtat               : utilisable seulement sous cet état (ex. 'ours')
//   effroi                     : Peur infligée aux monstres (moitié si sauvegarde réussie)
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


  boule_feu: {
    nom: 'Boule de feu', icone: '💥', type: 'sauvegarde', niveau: 3, zone: true, sort: true, niveauMin: 5,
    depuis: ['avant', 'arriere'], cible: 'ennemi', vise: ['avant', 'arriere'],
    carac: 'DEX', dd: 'sort', degats: '8d6', typeDeg: 'feu', moitie: true,
    desc: 'Niv. 3. Tous les ennemis : sauvegarde de DEX, 8d6 feu (moitié si réussite).'
  },

  // -------------------------------- BARBARE ---------------------------
  hache_2m: {
    nom: 'Hache à deux mains', icone: '🪓', type: 'attaque', arme: true,
    depuis: ['avant'], cible: 'ennemi', vise: ['avant'],
    jet: 'arme', degats: '1d12+3', typeDeg: 'tranchant',
    desc: 'Corps à corps. 1d12+3 tranchant.'
  },
  rage: {
    nom: 'Rage', icone: '😡', type: 'soutien', ressource: 'rage', pasSiActif: true, actionBonus: true,
    depuis: ['avant', 'arriere'], cible: 'soi', vise: [],
    etat: { nom: 'rage', duree: 10 }, peur: -10,
    desc: 'Action bonus (vous rejouez aussitôt). Jusqu\'à la fin du combat : +2 aux dégâts d\'arme et moitié de TOUS les dégâts reçus. −10 Peur. 3 rages jusqu\'au prochain repos long.'
  },
  frappe_temeraire: {
    nom: 'Frappe téméraire', icone: '💥', type: 'attaque', arme: true, avantage: true,
    depuis: ['avant'], cible: 'ennemi', vise: ['avant'],
    jet: 'arme', degats: '1d12+3', typeDeg: 'tranchant', etatLanceur: { nom: 'temeraire', duree: 1 },
    desc: 'Attaque avec avantage (1d12+3), mais les ennemis ont avantage contre vous jusqu\'à votre prochain tour.'
  },
  hachette: {
    nom: 'Hachette lancée', icone: '🪃', type: 'attaque', arme: true,
    depuis: ['avant', 'arriere'], cible: 'ennemi', vise: ['avant', 'arriere'],
    jet: 'arme', degats: '1d6+3', typeDeg: 'tranchant',
    desc: 'À distance. 1d6+3 tranchant.'
  },
  fureur: {
    nom: 'Tourbillon de fureur', icone: '🌪️', type: 'attaque', arme: true, zone: true, parCombat: 1,
    depuis: ['avant'], cible: 'ennemi', vise: ['avant'],
    jet: 'arme', degats: '1d12+3', typeDeg: 'tranchant',
    desc: 'Frappe chaque ennemi de la ligne Avant (1d12+3). Une fois par combat.'
  },
  coup_tete: {
    nom: 'Coup de tête', icone: '🐏', type: 'attaque', arme: true,
    depuis: ['avant'], cible: 'ennemi', vise: ['avant'],
    jet: 'arme', degats: '1d6+3', typeDeg: 'contondant',
    effetSiTouche: { etat: 'etourdi', duree: 1, sauvegarde: { carac: 'CON', dd: 13 } },
    desc: '1d6+3. Si touché : sauvegarde de CON DD 13 ou étourdi 1 tour.'
  },

  // -------------------------------- PALADIN ---------------------------
  chatiment: {
    nom: 'Châtiment divin', icone: '⚡', type: 'attaque', arme: true, niveau: 1,
    depuis: ['avant'], cible: 'ennemi', vise: ['avant'],
    jet: 'arme', degats: '1d8+1d8+3', typeDeg: 'radiant',
    desc: 'Niv. 1. Épée chargée de lumière : 1d8+3 +1d8 radiant.'
  },
  imposition: {
    nom: 'Imposition des mains', icone: '🤲', type: 'soin', parCombat: 1,
    depuis: ['avant', 'arriere'], cible: 'allie', vise: ['avant', 'arriere'],
    soin: '2d6+3', peur: -10,
    desc: 'Un allié (même à terre) récupère 2d6+3 PV. Une fois par combat.'
  },
  faveur_divine: {
    nom: 'Serment de protection', icone: '🛡️', type: 'soutien', niveau: 1,
    depuis: ['avant', 'arriere'], cible: 'allie', vise: ['avant', 'arriere'], vivantsSeulement: true,
    etat: { nom: 'ecorce', duree: 3 },
    desc: 'Niv. 1. Un allié gagne +3 CA pendant 3 tours.'
  },

  // -------------------------------- RÔDEUR ----------------------------
  arc_long: {
    nom: 'Arc long', icone: '🏹', type: 'attaque', arme: true,
    depuis: ['avant', 'arriere'], cible: 'ennemi', vise: ['avant', 'arriere'],
    jet: 'arme', degats: '1d8+3', typeDeg: 'perforant',
    desc: 'À distance. 1d8+3 perforant.'
  },
  epees_jumelles: {
    nom: 'Épées jumelles', icone: '⚔️', type: 'attaque', arme: true, nbAttaques: 2,
    depuis: ['avant'], cible: 'ennemi', vise: ['avant'],
    jet: 'arme', degats: '1d6+2', typeDeg: 'tranchant',
    desc: 'Deux coups au corps à corps, 1d6+2 chacun.'
  },
  marque_chasseur: {
    nom: 'Marque du chasseur', icone: '🎯', type: 'special', special: 'marque', niveau: 1,
    depuis: ['avant', 'arriere'], cible: 'ennemi', vise: ['avant', 'arriere'],
    desc: 'Niv. 1. Marque un ennemi : vos attaques contre lui infligent +1d6 jusqu\'à la fin du combat.'
  },
  volee: {
    nom: 'Volée de flèches', icone: '🌧️', type: 'attaque', arme: true, zone: true, parCombat: 1,
    depuis: ['avant', 'arriere'], cible: 'ennemi', vise: ['avant', 'arriere'],
    jet: 'arme', degats: '1d8+3', typeDeg: 'perforant',
    desc: 'Une flèche sur chaque ennemi (1d8+3). Une fois par combat.'
  },
  tir_precis: {
    nom: 'Tir précis', icone: '🎯', type: 'attaque', arme: true, avantage: true,
    depuis: ['arriere'], cible: 'ennemi', vise: ['avant', 'arriere'],
    jet: 'arme', degats: '1d8+3', typeDeg: 'perforant',
    desc: 'Depuis l\'arrière, tir avec avantage. 1d8+3.'
  },
  piege: {
    nom: 'Piège à mâchoires', icone: '🪤', type: 'sauvegarde', niveau: 1, sort: true,
    depuis: ['avant', 'arriere'], cible: 'ennemi', vise: ['avant'],
    carac: 'DEX', dd: 'sort', degats: '2d6', typeDeg: 'perforant', moitie: false,
    effetSiEchec: { etat: 'renverse', duree: 1 },
    desc: 'Niv. 1. Ligne Avant : sauvegarde de DEX ou 2d6 et renversé.'
  },

  // --------------------------------- BARDE ----------------------------
  moquerie: {
    nom: 'Moquerie cruelle', icone: '🤡', type: 'sauvegarde', sort: true,
    depuis: ['avant', 'arriere'], cible: 'ennemi', vise: ['avant', 'arriere'],
    carac: 'SAG', dd: 'sort', degats: '1d6', typeDeg: 'psychique', moitie: false,
    effetSiEchec: { etat: 'entrave', duree: 1 },
    desc: 'Tour de magie. Sauvegarde de SAG ou 1d6 psychique et désavantage à sa prochaine attaque.'
  },
  inspiration: {
    nom: 'Inspiration bardique', icone: '🎵', type: 'soutien',
    depuis: ['avant', 'arriere'], cible: 'allie', vise: ['avant', 'arriere'], vivantsSeulement: true,
    etat: { nom: 'inspire', duree: 99 }, peur: -5,
    desc: 'Un allié ajoute 1d6 à sa prochaine attaque ou sauvegarde. −5 Peur.'
  },
  murmure: {
    nom: 'Murmure dissonant', icone: '🎶', type: 'sauvegarde', niveau: 1, sort: true,
    depuis: ['avant', 'arriere'], cible: 'ennemi', vise: ['avant', 'arriere'],
    carac: 'SAG', dd: 'sort', degats: '3d6', typeDeg: 'psychique', moitie: true,
    desc: 'Niv. 1. Sauvegarde de SAG, 3d6 psychique (moitié si réussite).'
  },
  chant_courage: {
    nom: 'Chant de courage', icone: '🎻', type: 'soin', zone: true, parCombat: 2,
    depuis: ['avant', 'arriere'], cible: 'allie', vise: ['avant', 'arriere'], vivantsSeulement: true,
    soin: '1d4', peur: -15,
    desc: 'Tous les alliés : 1d4 PV et −15 Peur. Deux fois par combat.'
  },
  hypnose: {
    nom: 'Motif hypnotique', icone: '🌀', type: 'sauvegarde', niveau: 3, zone: true, sort: true, niveauMin: 5,
    depuis: ['avant', 'arriere'], cible: 'ennemi', vise: ['avant', 'arriere'],
    carac: 'SAG', dd: 'sort', moitie: false, effetSiEchec: { etat: 'etourdi', duree: 1 },
    desc: 'Niv. 3. Tous les ennemis : sauvegarde de SAG ou étourdis 1 tour.'
  },

  // --------------------------------- DRUIDE ---------------------------
  gourdin: {
    nom: 'Gourdin magique', icone: '🪵', type: 'attaque',
    depuis: ['avant'], cible: 'ennemi', vise: ['avant'],
    jet: 'sort', degats: '1d8+3', typeDeg: 'contondant',
    desc: 'Corps à corps imprégné de magie (bonus de sort). 1d8+3.'
  },
  flammeche: {
    nom: 'Flammèche', icone: '🔥', type: 'attaque', sort: true,
    depuis: ['avant', 'arriere'], cible: 'ennemi', vise: ['avant', 'arriere'],
    jet: 'sort', degats: '1d10', typeDeg: 'feu',
    desc: 'Tour de magie. Attaque de sort, 1d10 feu.'
  },
  enchevetrement: {
    nom: 'Enchevêtrement', icone: '🌿', type: 'sauvegarde', niveau: 1, zone: true, sort: true,
    depuis: ['avant', 'arriere'], cible: 'ennemi', vise: ['avant'],
    carac: 'FOR', dd: 'sort', degats: '1d8', typeDeg: 'perforant', moitie: false, effetSiEchec: { etat: 'entrave', duree: 2 },
    desc: 'Niv. 1. Ligne Avant : sauvegarde de FOR ou 1d8 et entravés (désavantage) 2 tours.'
  },
  rayon_lune: {
    nom: 'Rayon de lune', icone: '🌙', type: 'sauvegarde', niveau: 2, sort: true, triangle: 3,
    depuis: ['avant', 'arriere'], cible: 'ennemi', vise: ['avant', 'arriere'],
    carac: 'CON', dd: 'sort', degats: '2d10', typeDeg: 'radiant', moitie: true,
    desc: 'Niv. 2. Un triangle de lumière : la cible et ses 2 voisins les plus proches (3 ennemis au moins s\'ils sont là). Sauvegarde de CON, 2d10 radiant (moitié si réussite).'
  },
  peau_ecorce: {
    nom: 'Peau d\'écorce', icone: '🌳', type: 'soutien', niveau: 2,
    depuis: ['avant', 'arriere'], cible: 'allie', vise: ['avant', 'arriere'], vivantsSeulement: true,
    etat: { nom: 'ecorce', duree: 4 },
    desc: 'Niv. 2. Un allié gagne +3 CA pendant 4 tours.'
  },
  appel_foudre: {
    nom: 'Appel de la foudre', icone: '🌩️', type: 'sauvegarde', niveau: 3, sort: true, niveauMin: 5,
    depuis: ['avant', 'arriere'], cible: 'ennemi', vise: ['avant', 'arriere'],
    carac: 'DEX', dd: 'sort', degats: '4d10', typeDeg: 'tonnerre', moitie: true,
    desc: 'Niv. 3. Sauvegarde de DEX, 4d10 tonnerre (moitié si réussite).'
  },

  // ---------------------------------- MOINE ---------------------------
  arts_martiaux: {
    nom: 'Arts martiaux', icone: '👊', type: 'attaque', arme: true, nbAttaques: 2,
    depuis: ['avant'], cible: 'ennemi', vise: ['avant'],
    jet: 'arme', degats: '1d6+3', typeDeg: 'contondant',
    desc: 'Deux coups à mains nues, 1d6+3 chacun.'
  },
  deluge: {
    nom: 'Déluge de coups', icone: '🥋', type: 'attaque', arme: true, nbAttaques: 3, parCombat: 1,
    depuis: ['avant'], cible: 'ennemi', vise: ['avant'],
    jet: 'arme', degats: '1d6+3', typeDeg: 'contondant',
    desc: 'Trois coups rapides, 1d6+3 chacun. Une fois par combat (ki).'
  },
  frappe_etourdissante: {
    nom: 'Frappe étourdissante', icone: '💫', type: 'attaque', arme: true, parCombat: 1,
    depuis: ['avant'], cible: 'ennemi', vise: ['avant'],
    jet: 'arme', degats: '1d6+3', typeDeg: 'contondant',
    effetSiTouche: { etat: 'etourdi', duree: 1, sauvegarde: { carac: 'CON', dd: 13 } },
    desc: '1d6+3. Si touché : sauvegarde de CON DD 13 ou étourdi. Une fois par combat (ki).'
  },
  defense_patiente: {
    nom: 'Défense patiente', icone: '🧘', type: 'soutien',
    depuis: ['avant', 'arriere'], cible: 'soi', vise: [],
    etat: { nom: 'esquive', duree: 1 }, peur: -10,
    desc: 'Les attaques contre vous ont désavantage jusqu\'à votre prochain tour. −10 Peur.'
  },
  coup_pied_vol: {
    nom: 'Coup de pied volant', icone: '🦶', type: 'attaque', arme: true, deplacement: 'avant',
    depuis: ['arriere'], cible: 'ennemi', vise: ['avant'],
    jet: 'arme', degats: '2d6+3', typeDeg: 'contondant',
    desc: 'Depuis l\'arrière : bondit en ligne Avant et frappe. 2d6+3.'
  },

  orbe_chromatique: {
    nom: 'Orbe chromatique', icone: '🔴', type: 'attaque', niveau: 1, sort: true,
    depuis: ['avant', 'arriere'], cible: 'ennemi', vise: ['avant', 'arriere'],
    jet: 'sort', degats: '3d8', typeDeg: 'tonnerre',
    desc: 'Niv. 1. Attaque de sort : 3d8 tonnerre.'
  },
  coup_bas: {
    nom: 'Coup bas', icone: '🦵', type: 'attaque', arme: true, sournoise: true,
    depuis: ['avant'], cible: 'ennemi', vise: ['avant'],
    jet: 'arme', degats: '1d6+3', typeDeg: 'contondant',
    effetSiTouche: { etat: 'renverse', duree: 1, sauvegarde: { carac: 'DEX', dd: 13 } },
    desc: '1d6+3 (+ sournoise). Si touché : sauvegarde de DEX DD 13 ou renversé (les attaques contre lui ont avantage).'
  },

  // ------------------------------- OCCULTISTE --------------------------
  decharge_occulte: {
    nom: 'Décharge occulte', icone: '🟣', type: 'attaque', sort: true, rayons: 'decharge2',
    depuis: ['avant', 'arriere'], cible: 'ennemi', vise: ['avant', 'arriere'],
    jet: 'sort', degats: '1d10+3', typeDeg: 'force',
    desc: 'Tour de magie. Rayon de force : 1d10+3 (Décharge déchirante). Deux rayons au niveau 5.'
  },
  malefice: {
    nom: 'Maléfice', icone: '🧿', type: 'special', special: 'marque', niveau: 1, sort: true, actionBonus: true,
    depuis: ['avant', 'arriere'], cible: 'ennemi', vise: ['avant', 'arriere'],
    desc: 'Action bonus. Maudit un ennemi : vos attaques contre lui infligent +1d6 jusqu\'à la fin du combat.'
  },
  bras_hadar: {
    nom: 'Bras d\'Hadar', icone: '🦑', type: 'sauvegarde', niveau: 1, zone: true, sort: true,
    depuis: ['avant', 'arriere'], cible: 'ennemi', vise: ['avant'],
    carac: 'FOR', dd: 'sort', degats: '3d6', typeDeg: 'nécrotique', moitie: true,
    desc: 'Pacte. Des tentacules jaillissent sur la ligne Avant ennemie : sauvegarde de FOR, 3d6 nécrotique (moitié si réussite).'
  },
  effroi: {
    nom: 'Effroi', icone: '👁️', type: 'sauvegarde', niveau: 1, sort: true,
    depuis: ['avant', 'arriere'], cible: 'ennemi', vise: ['avant', 'arriere'],
    carac: 'SAG', dd: 'sort', degats: '2d6', typeDeg: 'psychique', moitie: false,
    effetSiEchec: { etat: 'etourdi', duree: 1 },
    desc: 'Pacte. Sauvegarde de SAG ou 2d6 psychique et paralysé de terreur (perd son tour).'
  },
  armure_agathys: {
    nom: 'Armure d\'Agathys', icone: '❄️', type: 'soutien', niveau: 1, sort: true, pasSiActif: true,
    depuis: ['avant', 'arriere'], cible: 'soi', vise: [],
    etat: { nom: 'agathys', duree: 10 },
    desc: 'Pacte. Jusqu\'à la fin du combat : +2 CA, et un ennemi qui vous frappe au corps à corps subit 5 dégâts de froid.'
  },
  decharge_repoussante: {
    nom: 'Décharge repoussante', icone: '💨', type: 'attaque', sort: true,
    depuis: ['avant', 'arriere'], cible: 'ennemi', vise: ['avant'],
    jet: 'sort', degats: '1d10+3', typeDeg: 'force', recul: 1,
    desc: 'Tour de magie. 1d10+3 force et repousse la cible en ligne Arrière.'
  },
  faim_hadar: {
    nom: 'Faim d\'Hadar', icone: '🌑', type: 'sauvegarde', niveau: 3, zone: true, sort: true, niveauMin: 5,
    depuis: ['avant', 'arriere'], cible: 'ennemi', vise: ['avant', 'arriere'],
    carac: 'DEX', dd: 'sort', degats: '4d6', typeDeg: 'froid', moitie: true,
    effetSiEchec: { etat: 'entrave', duree: 1 },
    desc: 'Pacte. Un néant glacial engloutit tous les ennemis : sauvegarde de DEX, 4d6 froid (moitié), entravés si échec.'
  },

  // ------------------------------ ENSORCELEUR --------------------------
  sort_jumele: {
    nom: 'Sort jumelé', icone: '♊', type: 'soutien', ressource: 'sorcellerie', actionBonus: true, pasSiActif: true,
    depuis: ['avant', 'arriere'], cible: 'soi', vise: [], etat: { nom: 'jumele', duree: 99 },
    desc: 'Métamagie (1 point de sorcellerie), action bonus. Votre prochain sort à cible unique touche aussi une deuxième cible.'
  },
  sort_intensifie: {
    nom: 'Sort intensifié', icone: '💢', type: 'soutien', ressource: 'sorcellerie', actionBonus: true, pasSiActif: true,
    depuis: ['avant', 'arriere'], cible: 'soi', vise: [], etat: { nom: 'intensifie', duree: 99 },
    desc: 'Métamagie (1 point de sorcellerie), action bonus. Votre prochain sort de dégâts inflige ×1,5 dégâts.'
  },
  source_magie: {
    nom: 'Source de magie', icone: '🌟', type: 'special', special: 'sourceMagie', ressource: 'sorcellerie', actionBonus: true,
    depuis: ['avant', 'arriere'], cible: 'soi', vise: [],
    desc: 'Action bonus. Convertit 1 point de sorcellerie en un emplacement de sort de niveau 1.'
  },
  poigne_electrique: {
    nom: 'Poigne électrique', icone: '⚡', type: 'attaque', sort: true, avantage: true,
    depuis: ['avant'], cible: 'ennemi', vise: ['avant'], jet: 'sort', degats: '1d8+1', typeDeg: 'foudre', effetSiTouche: { etat: 'entrave', duree: 1 },
    desc: 'Tour de magie, corps à corps avec avantage. 1d8+1 foudre ; la cible a désavantage à sa prochaine attaque.'
  },
  eclair: {
    nom: 'Éclair', icone: '🌩️', type: 'sauvegarde', niveau: 3, sort: true, triangle: 3, niveauMin: 5,
    depuis: ['avant', 'arriere'], cible: 'ennemi', vise: ['avant', 'arriere'], carac: 'DEX', dd: 'sort', degats: '8d6', typeDeg: 'foudre', moitie: true,
    desc: 'Niv. 3. Un trait de foudre traverse la cible et ses 2 voisins : sauvegarde de DEX, 8d6 foudre (moitié si réussite).'
  },
  // ------------------------------ ARTIFICIER ----------------------------
  arbalete_artificier: {
    nom: 'Arbalète à répétition', icone: '🏹', type: 'attaque', arme: true,
    depuis: ['avant', 'arriere'], cible: 'ennemi', vise: ['avant', 'arriere'], jet: 'arme', degats: '1d8+2', typeDeg: 'perforant',
    desc: 'À distance. 1d8+2 perforant.'
  },
  infusion_arme: {
    nom: 'Infusion : arme améliorée', icone: '🔧', type: 'soutien', parCombat: 1,
    depuis: ['avant', 'arriere'], cible: 'allie', vise: ['avant', 'arriere'], vivantsSeulement: true, etat: { nom: 'infuse', duree: 99 },
    desc: 'Un allié : +1 au toucher et +1d4 force avec ses armes jusqu\'à la fin du combat. Une fois par combat.'
  },
  graisse: {
    nom: 'Graisse', icone: '🛢️', type: 'sauvegarde', niveau: 1, zone: true, sort: true,
    depuis: ['avant', 'arriere'], cible: 'ennemi', vise: ['avant'], carac: 'DEX', dd: 'sort', moitie: false,
    effetSiEchec: { etat: 'renverse', duree: 1 },
    desc: 'Niv. 1. Ligne Avant ennemie : sauvegarde de DEX ou renversés (les attaques contre eux ont avantage).'
  },
  fiole_acide: {
    nom: 'Fiole d\'acide', icone: '🧪', type: 'sauvegarde', sort: true,
    depuis: ['avant', 'arriere'], cible: 'ennemi', vise: ['avant', 'arriere'], carac: 'DEX', dd: 'sort', degats: '1d6+2', typeDeg: 'acide', moitie: false,
    desc: 'Tour de magie. Sauvegarde de DEX ou 1d6+2 acide.'
  },
  aide: {
    nom: 'Aide', icone: '💪', type: 'special', special: 'aide', niveau: 2, zone: true, niveauMin: 5,
    depuis: ['avant', 'arriere'], cible: 'allie', vise: ['avant', 'arriere'], vivantsSeulement: true,
    desc: 'Niv. 2. Tous les alliés debout gagnent 6 PV temporaires et récupèrent 6 PV.'
  },
  canon_occulte: {
    nom: 'Canon occulte', icone: '💣', type: 'soutien', parCombat: 1, actionBonus: true,
    depuis: ['avant', 'arriere'], cible: 'soi', vise: [], etat: { nom: 'canon', duree: 99 },
    desc: 'Action bonus. Installe un canon qui tire tout seul (1d6 force sur l\'ennemi le plus faible) après chacune de vos actions.'
  },
  gantelet_tonnerre: {
    nom: 'Gantelet tonnerre', icone: '🥊', type: 'attaque', sort: true,
    depuis: ['avant'], cible: 'ennemi', vise: ['avant'], jet: 'sort', degats: '1d8+3', typeDeg: 'tonnerre', effetSiTouche: { etat: 'entrave', duree: 1 },
    desc: 'Armure arcanique. 1d8+3 tonnerre ; la cible a désavantage à sa prochaine attaque.'
  },
  elixir: {
    nom: 'Élixir expérimental', icone: '⚗️', type: 'special', special: 'elixir', parCombat: 1,
    depuis: ['avant', 'arriere'], cible: 'allie', vise: ['avant', 'arriere'],
    desc: 'Un allié (même à terre) boit un élixir : 2d4+4 PV et un effet au hasard (béni, esquive, −20 Peur ou PV temporaires). Une fois par combat.'
  },

  // ----------------------------- SOUS-CLASSES --------------------------
  croc_en_jambe: {
    nom: 'Croc-en-jambe', icone: '♟️', type: 'attaque', arme: true, ressource: 'superiorite',
    depuis: ['avant'], cible: 'ennemi', vise: ['avant'],
    jet: 'arme', degats: '1d8+1d8+3', typeDeg: 'tranchant',
    effetSiTouche: { etat: 'renverse', duree: 1, sauvegarde: { carac: 'FOR', dd: 13 } },
    desc: 'Manœuvre (dé de supériorité, récupéré au repos court). 1d8+3 +1d8 ; sauvegarde de FOR DD 13 ou renversé.'
  },
  pretre_guerre: {
    nom: 'Prêtre de guerre', icone: '⚔️', type: 'attaque', arme: true, nbAttaques: 2, parCombat: 1,
    depuis: ['avant'], cible: 'ennemi', vise: ['avant'],
    jet: 'arme', degats: '1d6+2', typeDeg: 'contondant',
    desc: 'Deux coups de masse (1d6+2 chacun). Une fois par combat.'
  },
  rayon_affaiblissant: {
    nom: 'Rayon affaiblissant', icone: '🦴', type: 'sauvegarde', niveau: 1, sort: true,
    depuis: ['avant', 'arriere'], cible: 'ennemi', vise: ['avant', 'arriere'],
    carac: 'CON', dd: 'sort', degats: '2d6', typeDeg: 'nécrotique', moitie: true,
    effetSiEchec: { etat: 'affaibli', duree: 3 },
    desc: 'Niv. 1. Sauvegarde de CON, 2d6 nécrotique (moitié si réussite) ; si échec, la cible inflige moitié dégâts avec ses armes pendant 3 tours.'
  },
  arme_sacree: {
    nom: 'Arme sacrée', icone: '🌟', type: 'soutien', parCombat: 1, actionBonus: true,
    depuis: ['avant', 'arriere'], cible: 'soi', vise: [],
    etat: { nom: 'armeSacree', duree: 3 },
    desc: 'Action bonus (vous rejouez aussitôt). +2 au toucher avec les armes pendant 3 tours. Une fois par combat.'
  },
  voeu_inimitie: {
    nom: 'Vœu d\'inimitié', icone: '🔥', type: 'special', special: 'inimitie', parCombat: 1, actionBonus: true,
    depuis: ['avant', 'arriere'], cible: 'ennemi', vise: ['avant', 'arriere'],
    desc: 'Action bonus. Avantage à vos attaques contre cet ennemi pendant 3 tours. Une fois par combat.'
  },
  forme_ours: {
    nom: 'Forme d\'ours', icone: '🐻', type: 'special', special: 'forme_ours', ressource: 'forme', actionBonus: true, pasSiActif: true,
    etat: { nom: 'ours' },
    depuis: ['avant', 'arriere'], cible: 'soi', vise: [],
    desc: 'Action bonus. Devient un ours : passe en ligne Avant avec des PV temporaires (12, 16 au niv. 4, 20 au niv. 5). Redevient druide quand ils sont épuisés. 2 charges (3 au niv. 4, 4 au niv. 5) : le repos court en rend une, le repos long toutes.'
  },
  griffes_ours: {
    nom: 'Griffes d\'ours', icone: '🐾', type: 'attaque', arme: true, requiertEtat: 'ours', rayons: 'griffes2',
    depuis: ['avant'], cible: 'ennemi', vise: ['avant'],
    jet: 'sort', degats: '1d10+2', typeDeg: 'tranchant',
    desc: 'En forme d\'ours seulement. 1d10+2 tranchant (deux coups au niv. 5).'
  },
  deluge_ouvert: {
    nom: 'Déluge renversant', icone: '✋', type: 'attaque', arme: true, nbAttaques: 3, parCombat: 1,
    depuis: ['avant'], cible: 'ennemi', vise: ['avant'],
    jet: 'arme', degats: '1d6+3', typeDeg: 'contondant',
    effetSiTouche: { etat: 'renverse', duree: 1, sauvegarde: { carac: 'DEX', dd: 13 } },
    desc: 'Trois coups (1d6+3) ; chacun : sauvegarde de DEX DD 13 ou renversé. Une fois par combat (ki).'
  },
  plenitude: {
    nom: 'Plénitude physique', icone: '☯️', type: 'soin', ressource: 'plenitude',
    depuis: ['avant', 'arriere'], cible: 'soi', vise: [],
    soin: '2d6+8', peur: -10,
    desc: 'Récupère 2d6+8 PV et −10 Peur. Une fois par repos long.'
  },
  pas_ombre: {
    nom: 'Pas de l\'ombre', icone: '🌑', type: 'soutien', parCombat: 1, actionBonus: true,
    depuis: ['avant', 'arriere'], cible: 'soi', vise: [],
    etat: { nom: 'cache', duree: 99 }, peur: -5,
    desc: 'Action bonus. Disparaît dans l\'ombre : avantage à votre prochaine attaque. −5 Peur. Une fois par combat.'
  },
  chuchotements: {
    nom: 'Chuchotements', icone: '🐙', type: 'sauvegarde', sort: true,
    depuis: ['avant', 'arriere'], cible: 'ennemi', vise: ['avant', 'arriere'],
    carac: 'SAG', dd: 'sort', degats: '1d8', typeDeg: 'psychique', moitie: false,
    desc: 'Tour de magie. Sauvegarde de SAG ou 1d8 psychique (+15 Peur au monstre avec Esprit éveillé).'
  },
  murmures_dements: {
    nom: 'Murmures déments', icone: '🌀', type: 'sauvegarde', niveau: 1, sort: true, triangle: 3, effroi: 20,
    depuis: ['avant', 'arriere'], cible: 'ennemi', vise: ['avant', 'arriere'],
    carac: 'SAG', dd: 'sort', degats: '2d8', typeDeg: 'psychique', moitie: true,
    desc: 'Pacte. Triangle de 3 ennemis : sauvegarde de SAG, 2d8 psychique (moitié si réussite) et +20 Peur (moitié si réussite).'
  },
  // ------------------------- ACTIONS COMMUNES ------------------------
  changer_ligne: {
    nom: 'Changer de ligne', icone: '↕️', type: 'special', special: 'changer_ligne', commune: true,
    depuis: ['avant', 'arriere'], cible: 'soi', vise: [],
    desc: 'Passez de la ligne Avant à la ligne Arrière, ou l\'inverse.'
  },
  sac: {
    nom: 'Sac', icone: '🎒', type: 'special', special: 'sac', commune: true,
    depuis: ['avant', 'arriere'], cible: 'soi', vise: [],
    desc: 'Ouvre le sac : potions, bombes, parchemins…'
  },
  esquiver: {
    nom: 'Esquiver', icone: '🛡', type: 'soutien', commune: true,
    depuis: ['avant', 'arriere'], cible: 'soi', vise: [],
    etat: { nom: 'esquive', duree: 1 },
    desc: 'Les attaques contre vous ont désavantage jusqu\'à votre prochain tour.'
  }
};

const ACTIONS_COMMUNES = ['changer_ligne', 'sac', 'esquiver'];

// Consommables (utilisés depuis le sac ; `consommable` = clé du stock, voir CONSOMMABLES)
const ACTIONS_SAC = {
  potion: {
    nom: 'Potion de soins', icone: '🧴', type: 'soin', consommable: 'potion', special: 'potion',
    depuis: ['avant', 'arriere'], cible: 'allie', vise: ['avant', 'arriere'], inclureATerre: true,
    soin: '2d4+2', desc: 'Un allié (même à terre) récupère 2d4+2 PV.'
  },
  potion_sup: {
    nom: 'Potion supérieure', icone: '🍷', type: 'soin', consommable: 'potion_sup', special: 'potion',
    depuis: ['avant', 'arriere'], cible: 'allie', vise: ['avant', 'arriere'], inclureATerre: true,
    soin: '4d4+4', desc: 'Un allié (même à terre) récupère 4d4+4 PV.'
  },
  elixir_courage: {
    nom: 'Élixir de courage', icone: '🧉', type: 'soin', consommable: 'elixir_courage', special: 'potion',
    depuis: ['avant', 'arriere'], cible: 'allie', vise: ['avant', 'arriere'], vivantsSeulement: true,
    soin: '0', peur: -40, desc: 'Un allié perd 40 Peur.'
  },
  bombe: {
    nom: 'Bombe incendiaire', icone: '💣', type: 'sauvegarde', consommable: 'bombe', zone: true,
    depuis: ['avant', 'arriere'], cible: 'ennemi', vise: ['avant'],
    carac: 'DEX', dd: 13, degats: '2d6+2', typeDeg: 'feu', moitie: true,
    desc: 'Ligne Avant ennemie : sauvegarde de DEX DD 13, 2d6+2 feu (moitié si réussite).'
  },
  parchemin_feu: {
    nom: 'Parchemin de boule de feu', icone: '📜', type: 'sauvegarde', consommable: 'parchemin_feu', zone: true, sort: true,
    depuis: ['avant', 'arriere'], cible: 'ennemi', vise: ['avant', 'arriere'],
    carac: 'DEX', dd: 14, degats: '6d6', typeDeg: 'feu', moitie: true,
    desc: 'Tous les ennemis : sauvegarde de DEX DD 14, 6d6 feu (moitié si réussite).'
  },
  eau_benite: {
    nom: 'Eau bénite', icone: '💧', type: 'auto', consommable: 'eau_benite',
    depuis: ['avant', 'arriere'], cible: 'ennemi', vise: ['avant', 'arriere'],
    degats: '3d6', typeDeg: 'radiant', desc: 'Un ennemi : 3d6 radiant, touche automatiquement.'
  }
};
Object.assign(ACTIONS, ACTIONS_SAC);
