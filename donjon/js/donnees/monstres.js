// =====================================================================
// Monstres inspirés du SRD 5e, et rencontres.
// Les actions des monstres utilisent le même format que ACTIONS
// (voir actions.js), avec `jet` et `dd` donnés en nombres.
// `depuis` / `vise` : lignes 'avant' / 'arriere' (corps à corps = ['avant']).
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
      { nom: 'Cimeterre', type: 'attaque', depuis: ['avant'], cible: 'ennemi', vise: ['avant'], jet: 4, degats: '1d6+2', typeDeg: 'tranchant', poids: 3 },
      { nom: 'Arc court', type: 'attaque', depuis: ['avant', 'arriere'], cible: 'ennemi', vise: ['avant', 'arriere'], jet: 4, degats: '1d6+2', typeDeg: 'perforant', poids: 2 }
    ]
  },
  squelette: {
    nom: 'Squelette', icone: '💀', pv: 13, ca: 13, mortVivant: true,
    caracs: { FOR: 10, DEX: 14, CON: 15, INT: 6, SAG: 8, CHA: 5 },
    vuln: ['contondant'], immun: ['poison'], immunEtats: ['empoisonne'],
    actions: [
      { nom: 'Épée courte', type: 'attaque', depuis: ['avant'], cible: 'ennemi', vise: ['avant'], jet: 4, degats: '1d6+2', typeDeg: 'perforant', poids: 3 },
      { nom: 'Arc court', type: 'attaque', depuis: ['avant', 'arriere'], cible: 'ennemi', vise: ['avant', 'arriere'], jet: 4, degats: '1d6+2', typeDeg: 'perforant', poids: 2 }
    ]
  },
  loup: {
    nom: 'Loup', icone: '🐺', pv: 11, ca: 13,
    caracs: { FOR: 12, DEX: 15, CON: 12, INT: 3, SAG: 12, CHA: 6 },
    actions: [
      { nom: 'Morsure', type: 'attaque', depuis: ['avant'], cible: 'ennemi', vise: ['avant'], jet: 4, degats: '2d4+2', typeDeg: 'perforant',
        effetSiTouche: { etat: 'renverse', duree: 1, sauvegarde: { carac: 'FOR', dd: 11 } }, poids: 3 },
      { nom: 'Bond', type: 'attaque', depuis: ['arriere'], cible: 'ennemi', vise: ['avant', 'arriere'], jet: 4, degats: '1d6+2', typeDeg: 'perforant', poids: 1 }
    ]
  },
  cultiste: {
    nom: 'Cultiste', icone: '🧙', pv: 9, ca: 12,
    caracs: { FOR: 11, DEX: 12, CON: 10, INT: 10, SAG: 11, CHA: 10 },
    actions: [
      { nom: 'Cimeterre', type: 'attaque', depuis: ['avant'], cible: 'ennemi', vise: ['avant'], jet: 3, degats: '1d6+1', typeDeg: 'tranchant', poids: 2 },
      { nom: 'Murmures impies', type: 'sauvegarde', depuis: ['avant', 'arriere'], cible: 'ennemi', vise: ['avant', 'arriere'],
        carac: 'SAG', dd: 11, degats: '1d4', typeDeg: 'psychique', moitie: false, effetSiEchec: { peur: 15 }, poids: 2 }
    ]
  },
  zombie: {
    nom: 'Zombie', icone: '🧟', pv: 22, ca: 8, mortVivant: true, robustesse: true,
    caracs: { FOR: 13, DEX: 6, CON: 16, INT: 3, SAG: 6, CHA: 5 },
    immun: ['poison'], immunEtats: ['empoisonne'],
    sauvegardesBonus: { SAG: 0 },
    actions: [
      { nom: 'Coup', type: 'attaque', depuis: ['avant'], cible: 'ennemi', vise: ['avant'], jet: 3, degats: '1d6+1', typeDeg: 'contondant', poids: 1 }
    ]
  },
  ogre: {
    nom: 'Ogre', icone: '👹', pv: 59, ca: 11, elite: true,
    caracs: { FOR: 19, DEX: 8, CON: 16, INT: 5, SAG: 7, CHA: 7 },
    actions: [
      { nom: 'Massue', type: 'attaque', depuis: ['avant'], cible: 'ennemi', vise: ['avant'], jet: 6, degats: '2d8+4', typeDeg: 'contondant', poids: 3 },
      { nom: 'Javeline', type: 'attaque', depuis: ['avant', 'arriere'], cible: 'ennemi', vise: ['avant', 'arriere'], jet: 6, degats: '2d6+4', typeDeg: 'perforant', poids: 1 }
    ]
  },

  mage_squelette: {
    nom: 'Mage squelette', icone: '🦴', pv: 18, ca: 12, mortVivant: true,
    caracs: { FOR: 8, DEX: 14, CON: 12, INT: 14, SAG: 10, CHA: 6 },
    vuln: ['contondant'], immun: ['poison'], immunEtats: ['empoisonne'],
    actions: [
      { nom: 'Trait nécrotique', type: 'attaque', depuis: ['avant', 'arriere'], cible: 'ennemi', vise: ['avant', 'arriere'], jet: 5, degats: '2d8', typeDeg: 'nécrotique', sort: true, poids: 3 },
      { nom: 'Main glaciale', type: 'sauvegarde', depuis: ['avant', 'arriere'], cible: 'ennemi', vise: ['avant', 'arriere'], carac: 'CON', dd: 12, degats: '1d8', typeDeg: 'froid', moitie: false, sort: true,
        effetSiEchec: { etat: 'entrave', duree: 1 }, poids: 1 }
    ]
  },

  // ------------------------------- BOSS --------------------------------
  grukk: {
    nom: 'Grukk le Brise-Os', icone: '👹', pv: 72, ca: 13, boss: true,
    caracs: { FOR: 20, DEX: 8, CON: 18, INT: 6, SAG: 9, CHA: 8 },
    sauvegardesBonus: { FOR: 7, CON: 6 },
    actions: [
      { nom: 'Massue colossale', type: 'attaque', depuis: ['avant'], cible: 'ennemi', vise: ['avant'], jet: 7, degats: '2d10+5', typeDeg: 'contondant', poids: 3 },
      { nom: 'Balayage', type: 'sauvegarde', zone: true, depuis: ['avant'], cible: 'ennemi', vise: ['avant'], carac: 'DEX', dd: 14, degats: '2d6+5', typeDeg: 'contondant', moitie: true,
        effetSiEchec: { etat: 'renverse', duree: 1 }, poids: 2, recharge: 3 },
      { nom: 'Rugissement', type: 'sauvegarde', zone: true, depuis: ['avant', 'arriere'], cible: 'ennemi', vise: ['avant', 'arriere'], carac: 'SAG', dd: 13, degats: '1d6', typeDeg: 'psychique', moitie: false,
        effetSiEchec: { peur: 20 }, poids: 1, recharge: 4 },
      { nom: 'Rocher', type: 'attaque', depuis: ['avant', 'arriere'], cible: 'ennemi', vise: ['avant', 'arriere'], jet: 7, degats: '2d8+5', typeDeg: 'contondant', poids: 1 }
    ]
  },
  chevalier_squelette: {
    nom: 'Le Chevalier sans repos', icone: '⚔️', pv: 68, ca: 16, boss: true, actionsParTour: 2, mortVivant: true,
    caracs: { FOR: 18, DEX: 11, CON: 16, INT: 10, SAG: 12, CHA: 14 },
    sauvegardesBonus: { FOR: 7, CON: 6, SAG: 4 },
    resist: ['nécrotique', 'perforant'], immun: ['poison'], immunEtats: ['empoisonne'],
    actions: [
      { nom: 'Lame funeste', type: 'attaque', depuis: ['avant'], cible: 'ennemi', vise: ['avant'], jet: 8, degats: '1d10+5', typeDeg: 'tranchant', poids: 4 },
      { nom: 'Coup de pavois', type: 'attaque', depuis: ['avant'], cible: 'ennemi', vise: ['avant'], jet: 8, degats: '1d6+5', typeDeg: 'contondant',
        effetSiTouche: { etat: 'etourdi', duree: 1, sauvegarde: { carac: 'CON', dd: 15 } }, poids: 1, recharge: 3 },
      { nom: 'Regard d\'outre-tombe', type: 'sauvegarde', depuis: ['avant', 'arriere'], cible: 'ennemi', vise: ['avant', 'arriere'], carac: 'SAG', dd: 14, degats: '2d8', typeDeg: 'nécrotique', moitie: true,
        effetSiEchec: { peur: 15 }, poids: 2 },
      { nom: 'Relever les morts', type: 'special', special: 'invoquer', invocation: 'squelette', depuis: ['avant', 'arriere'], cible: 'soi', vise: [], poids: 2, parCombat: 2 }
    ]
  },
  roi_gobelin: {
    nom: 'Snikrak, Roi gobelin', icone: '👑', pv: 52, ca: 16, boss: true, actionsParTour: 2,
    caracs: { FOR: 10, DEX: 18, CON: 14, INT: 12, SAG: 10, CHA: 14 },
    sauvegardesBonus: { DEX: 6 },
    actions: [
      { nom: 'Cimeterre royal', type: 'attaque', depuis: ['avant'], cible: 'ennemi', vise: ['avant'], jet: 6, degats: '1d8+4', typeDeg: 'tranchant', poids: 3 },
      { nom: 'Arbalète de poing', type: 'attaque', depuis: ['avant', 'arriere'], cible: 'ennemi', vise: ['avant', 'arriere'], jet: 6, degats: '1d10+3', typeDeg: 'perforant', poids: 3 },
      { nom: 'Bombe puante', type: 'sauvegarde', zone: true, depuis: ['avant', 'arriere'], cible: 'ennemi', vise: ['avant'], carac: 'CON', dd: 13, degats: '2d6', typeDeg: 'poison', moitie: true,
        effetSiEchec: { etat: 'empoisonne', duree: 2 }, poids: 1, recharge: 3 },
      { nom: 'À moi la horde !', type: 'special', special: 'invoquer', invocation: 'gobelin', depuis: ['avant', 'arriere'], cible: 'soi', vise: [], poids: 2, parCombat: 2 }
    ]
  },
  loup_alpha: {
    nom: 'Croc-de-Lune', icone: '🐺', pv: 70, ca: 14, boss: true, actionsParTour: 2,
    caracs: { FOR: 18, DEX: 16, CON: 15, INT: 6, SAG: 13, CHA: 10 },
    sauvegardesBonus: { DEX: 5, CON: 4 },
    actions: [
      { nom: 'Morsure féroce', type: 'attaque', depuis: ['avant'], cible: 'ennemi', vise: ['avant'], jet: 7, degats: '2d6+4', typeDeg: 'perforant',
        effetSiTouche: { etat: 'renverse', duree: 1, sauvegarde: { carac: 'FOR', dd: 14 } }, poids: 4 },
      { nom: 'Bond sauvage', type: 'attaque', depuis: ['avant', 'arriere'], cible: 'ennemi', vise: ['avant', 'arriere'], jet: 7, degats: '1d10+4', typeDeg: 'perforant', poids: 2 },
      { nom: 'Hurlement lunaire', type: 'sauvegarde', zone: true, depuis: ['avant', 'arriere'], cible: 'ennemi', vise: ['avant', 'arriere'], carac: 'SAG', dd: 13, degats: '1d4', typeDeg: 'psychique', moitie: false,
        effetSiEchec: { peur: 15 }, poids: 1, recharge: 3 },
      { nom: 'Appel de la meute', type: 'special', special: 'invoquer', invocation: 'loup', depuis: ['avant', 'arriere'], cible: 'soi', vise: [], poids: 2, parCombat: 2 }
    ]
  },
  grukk_tyran: {
    nom: 'Grukk le Tyran', icone: '👹', pv: 110, ca: 14, boss: true, actionsParTour: 2,
    caracs: { FOR: 22, DEX: 8, CON: 20, INT: 6, SAG: 10, CHA: 10 },
    sauvegardesBonus: { FOR: 8, CON: 7 },
    actions: [
      { nom: 'Hache du tyran', type: 'attaque', depuis: ['avant'], cible: 'ennemi', vise: ['avant'], jet: 8, degats: '2d12+6', typeDeg: 'tranchant', poids: 4 },
      { nom: 'Tourbillon', type: 'sauvegarde', zone: true, depuis: ['avant'], cible: 'ennemi', vise: ['avant'], carac: 'DEX', dd: 15, degats: '3d6+6', typeDeg: 'tranchant', moitie: true,
        effetSiEchec: { etat: 'renverse', duree: 1 }, poids: 2, recharge: 3 },
      { nom: 'Cri de guerre', type: 'sauvegarde', zone: true, depuis: ['avant', 'arriere'], cible: 'ennemi', vise: ['avant', 'arriere'], carac: 'SAG', dd: 15, degats: '1d8', typeDeg: 'psychique', moitie: false,
        effetSiEchec: { peur: 20 }, poids: 1, recharge: 4 },
      { nom: 'Rocher', type: 'attaque', depuis: ['avant', 'arriere'], cible: 'ennemi', vise: ['avant', 'arriere'], jet: 8, degats: '2d10+6', typeDeg: 'contondant', poids: 1 }
    ]
  },
  pretre_eclipse: {
    nom: 'Prêtre de l\'Éclipse', icone: '🌘', pv: 30, ca: 14, elite: true,
    caracs: { FOR: 10, DEX: 12, CON: 12, INT: 12, SAG: 16, CHA: 14 },
    actions: [
      { nom: 'Rayon d\'ombre', type: 'attaque', depuis: ['avant', 'arriere'], cible: 'ennemi', vise: ['avant', 'arriere'], jet: 6, degats: '2d8+3', typeDeg: 'nécrotique', sort: true, poids: 3 },
      { nom: 'Prière noire', type: 'special', special: 'soinAllies', soin: '2d8+3', depuis: ['avant', 'arriere'], cible: 'soi', vise: [], poids: 2, recharge: 3 },
      { nom: 'Murmures impies', type: 'sauvegarde', depuis: ['avant', 'arriere'], cible: 'ennemi', vise: ['avant', 'arriere'], carac: 'SAG', dd: 13, degats: '1d6', typeDeg: 'psychique', moitie: false,
        effetSiEchec: { peur: 15 }, poids: 2 }
    ]
  },
  velkor: {
    nom: 'Velkor, Grand Prêtre', icone: '🌑', pv: 100, ca: 15, boss: true, actionsParTour: 2,
    caracs: { FOR: 12, DEX: 14, CON: 16, INT: 16, SAG: 20, CHA: 18 },
    sauvegardesBonus: { SAG: 9, CHA: 8, CON: 6 },
    resist: ['nécrotique', 'psychique'],
    actions: [
      { nom: 'Dague de l\'Éclipse', type: 'attaque', depuis: ['avant'], cible: 'ennemi', vise: ['avant'], jet: 9, degats: '2d6+5', typeDeg: 'perforant', poids: 2 },
      { nom: 'Flétrissure', type: 'attaque', depuis: ['avant', 'arriere'], cible: 'ennemi', vise: ['avant', 'arriere'], jet: 8, degats: '2d10+4', typeDeg: 'nécrotique', sort: true, poids: 3 },
      { nom: 'Éclipse totale', type: 'sauvegarde', zone: true, depuis: ['avant', 'arriere'], cible: 'ennemi', vise: ['avant', 'arriere'], carac: 'SAG', dd: 15, degats: '2d8+2', typeDeg: 'psychique', moitie: true,
        effetSiEchec: { peur: 20 }, poids: 2, recharge: 3 },
      { nom: 'Relever les fidèles', type: 'special', special: 'invoquer', invocation: 'zombie', depuis: ['avant', 'arriere'], cible: 'soi', vise: [], poids: 2, parCombat: 3 }
    ]
  },
  morvagne: {
    nom: 'Morvagne la Nécromancienne', icone: '☠️', pv: 120, ca: 16, boss: true, actionsParTour: 2,
    caracs: { FOR: 10, DEX: 14, CON: 14, INT: 18, SAG: 14, CHA: 12 },
    sauvegardesBonus: { INT: 7, SAG: 5 },
    resist: ['nécrotique'],
    actions: [
      { nom: 'Bâton d\'os', type: 'attaque', depuis: ['avant'], cible: 'ennemi', vise: ['avant'], jet: 6, degats: '1d8+3', typeDeg: 'contondant', poids: 2 },
      { nom: 'Rayon nécrotique', type: 'attaque', depuis: ['avant', 'arriere'], cible: 'ennemi', vise: ['avant', 'arriere'], jet: 7, degats: '3d8+2', typeDeg: 'nécrotique', poids: 3 },
      { nom: 'Vague d\'effroi', type: 'sauvegarde', zone: true, depuis: ['avant', 'arriere'], cible: 'ennemi', vise: ['avant', 'arriere'],
        carac: 'SAG', dd: 14, degats: '2d6', typeDeg: 'psychique', moitie: true, effetSiEchec: { peur: 20 }, poids: 2, recharge: 3 },
      { nom: 'Relever les morts', type: 'special', special: 'invoquer', invocation: 'squelette', depuis: ['avant', 'arriere'], cible: 'soi', vise: [], poids: 3, parCombat: 2 }
    ]
  }
};
