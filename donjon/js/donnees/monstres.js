// =====================================================================
// Monstres inspirés du SRD 5e, et rencontres.
// Les actions des monstres utilisent le même format que ACTIONS
// (voir actions.js), avec `jet` et `dd` donnés en nombres.
//   poids       : fréquence de choix par l'IA
//   recharge    : nombre de tours avant réutilisation
//   parCombat   : utilisations max par combat
//   vuln / resist / immun : types de dégâts
//   immunEtats  : états qui ne s'appliquent pas
//   mortVivant  : sensible au Renvoi, immunisé au Sommeil
//   robustesse  : Robustesse des morts-vivants (zombie)
//   actionsParTour : nombre d'actions par tour (boss)
// =====================================================================

const MONSTRES = {
  gobelin: {
    nom: 'Gobelin', icone: '👺', pv: 7, ca: 15,
    caracs: { FOR: 8, DEX: 14, CON: 10, INT: 10, SAG: 8, CHA: 8 },
    actions: [
      { nom: 'Cimeterre', type: 'attaque', rangsLanceur: [1, 2], cible: 'ennemi', rangsCibles: [1, 2], jet: 4, degats: '1d6+2', typeDeg: 'tranchant', poids: 3 },
      { nom: 'Arc court', type: 'attaque', rangsLanceur: [2, 3, 4], cible: 'ennemi', rangsCibles: [1, 2, 3, 4], jet: 4, degats: '1d6+2', typeDeg: 'perforant', poids: 2 }
    ]
  },
  squelette: {
    nom: 'Squelette', icone: '💀', pv: 13, ca: 13, mortVivant: true,
    caracs: { FOR: 10, DEX: 14, CON: 15, INT: 6, SAG: 8, CHA: 5 },
    vuln: ['contondant'], immun: ['poison'], immunEtats: ['empoisonne'],
    actions: [
      { nom: 'Épée courte', type: 'attaque', rangsLanceur: [1, 2], cible: 'ennemi', rangsCibles: [1, 2], jet: 4, degats: '1d6+2', typeDeg: 'perforant', poids: 3 },
      { nom: 'Arc court', type: 'attaque', rangsLanceur: [2, 3, 4], cible: 'ennemi', rangsCibles: [1, 2, 3, 4], jet: 4, degats: '1d6+2', typeDeg: 'perforant', poids: 2 }
    ]
  },
  loup: {
    nom: 'Loup', icone: '🐺', pv: 11, ca: 13,
    caracs: { FOR: 12, DEX: 15, CON: 12, INT: 3, SAG: 12, CHA: 6 },
    actions: [
      { nom: 'Morsure', type: 'attaque', rangsLanceur: [1, 2], cible: 'ennemi', rangsCibles: [1, 2], jet: 4, degats: '2d4+2', typeDeg: 'perforant',
        effetSiTouche: { etat: 'renverse', duree: 1, sauvegarde: { carac: 'FOR', dd: 11 } }, poids: 3 },
      { nom: 'Bond', type: 'attaque', rangsLanceur: [3, 4], cible: 'ennemi', rangsCibles: [1, 2, 3], jet: 4, degats: '1d6+2', typeDeg: 'perforant', poids: 1 }
    ]
  },
  cultiste: {
    nom: 'Cultiste', icone: '🧙', pv: 9, ca: 12,
    caracs: { FOR: 11, DEX: 12, CON: 10, INT: 10, SAG: 11, CHA: 10 },
    actions: [
      { nom: 'Cimeterre', type: 'attaque', rangsLanceur: [1, 2], cible: 'ennemi', rangsCibles: [1, 2], jet: 3, degats: '1d6+1', typeDeg: 'tranchant', poids: 2 },
      { nom: 'Murmures impies', type: 'sauvegarde', rangsLanceur: [1, 2, 3, 4], cible: 'ennemi', rangsCibles: [1, 2, 3, 4],
        carac: 'SAG', dd: 11, degats: '1d4', typeDeg: 'psychique', moitie: false, effetSiEchec: { peur: 15 }, poids: 2 }
    ]
  },
  zombie: {
    nom: 'Zombie', icone: '🧟', pv: 22, ca: 8, mortVivant: true, robustesse: true,
    caracs: { FOR: 13, DEX: 6, CON: 16, INT: 3, SAG: 6, CHA: 5 },
    immun: ['poison'], immunEtats: ['empoisonne'],
    sauvegardesBonus: { SAG: 0 },
    actions: [
      { nom: 'Coup', type: 'attaque', rangsLanceur: [1, 2], cible: 'ennemi', rangsCibles: [1, 2], jet: 3, degats: '1d6+1', typeDeg: 'contondant', poids: 1 }
    ]
  },
  ogre: {
    nom: 'Ogre', icone: '👹', pv: 59, ca: 11, elite: true,
    caracs: { FOR: 19, DEX: 8, CON: 16, INT: 5, SAG: 7, CHA: 7 },
    actions: [
      { nom: 'Massue', type: 'attaque', rangsLanceur: [1, 2], cible: 'ennemi', rangsCibles: [1, 2], jet: 6, degats: '2d8+4', typeDeg: 'contondant', poids: 3 },
      { nom: 'Javeline', type: 'attaque', rangsLanceur: [1, 2, 3], cible: 'ennemi', rangsCibles: [2, 3, 4], jet: 6, degats: '2d6+4', typeDeg: 'perforant', poids: 1 }
    ]
  },

  // ------------------------------- BOSS --------------------------------
  morvagne: {
    nom: 'Morvagne la Nécromancienne', icone: '☠️', pv: 85, ca: 15, boss: true, actionsParTour: 2,
    caracs: { FOR: 10, DEX: 14, CON: 14, INT: 18, SAG: 14, CHA: 12 },
    sauvegardesBonus: { INT: 7, SAG: 5 },
    resist: ['nécrotique'],
    actions: [
      { nom: 'Bâton d\'os', type: 'attaque', rangsLanceur: [1, 2], cible: 'ennemi', rangsCibles: [1, 2], jet: 6, degats: '1d8+3', typeDeg: 'contondant', poids: 2 },
      { nom: 'Rayon nécrotique', type: 'attaque', rangsLanceur: [1, 2, 3, 4], cible: 'ennemi', rangsCibles: [1, 2, 3, 4], jet: 7, degats: '2d8+2', typeDeg: 'nécrotique', poids: 3 },
      { nom: 'Vague d\'effroi', type: 'sauvegarde', zone: true, rangsLanceur: [1, 2, 3, 4], cible: 'ennemi', rangsCibles: [1, 2, 3, 4],
        carac: 'SAG', dd: 14, degats: '2d6', typeDeg: 'psychique', moitie: true, effetSiEchec: { peur: 20 }, poids: 2, recharge: 3 },
      { nom: 'Relever les morts', type: 'special', special: 'invoquer', invocation: 'squelette', rangsLanceur: [1, 2, 3, 4], cible: 'soi', rangsCibles: [], poids: 3, parCombat: 2 }
    ]
  }
};

// Rencontres : listes ordonnées du rang 1 au rang 4.
// `facile` pour les premières rangées de la carte, `moyen` ensuite.
const RENCONTRES = {
  facile: [
    ['gobelin', 'gobelin', 'gobelin'],
    ['loup', 'loup'],
    ['squelette', 'squelette'],
    ['zombie', 'cultiste'],
    ['gobelin', 'loup', 'gobelin']
  ],
  moyen: [
    ['zombie', 'squelette', 'cultiste'],
    ['loup', 'loup', 'gobelin', 'gobelin'],
    ['squelette', 'squelette', 'squelette', 'cultiste'],
    ['zombie', 'zombie', 'cultiste'],
    ['gobelin', 'gobelin', 'cultiste', 'cultiste']
  ],
  elite: [
    ['ogre', 'gobelin', 'gobelin'],
    ['zombie', 'ogre', 'cultiste'],
    ['loup', 'ogre', 'loup']
  ],
  boss: [
    ['squelette', 'squelette', 'morvagne']
  ]
};
