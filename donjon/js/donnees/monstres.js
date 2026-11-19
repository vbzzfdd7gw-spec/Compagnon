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
    nom: 'Cultiste', icone: '🧙', pv: 14, ca: 13, criMort: 6,
    caracs: { FOR: 11, DEX: 12, CON: 12, INT: 10, SAG: 13, CHA: 14 },
    actions: [
      { nom: 'Dague rituelle', type: 'attaque', depuis: ['avant'], cible: 'ennemi', vise: ['avant'], jet: 4, degats: '1d6+2', typeDeg: 'perforant',
        effetSiTouche: { peur: 6 }, poids: 2 },
      { nom: 'Murmures impies', type: 'sauvegarde', depuis: ['avant', 'arriere'], cible: 'ennemi', vise: ['avant', 'arriere'],
        carac: 'SAG', dd: 12, degats: '2d4', typeDeg: 'psychique', moitie: false, effetSiEchec: { peur: 12 }, poids: 3 },
      { nom: 'Marque du culte', type: 'sauvegarde', depuis: ['avant', 'arriere'], cible: 'ennemi', vise: ['avant', 'arriere'],
        carac: 'SAG', dd: 13, moitie: false, effetSiEchec: { etat: 'maudit', duree: 3 }, poids: 2, recharge: 3 },
      { nom: 'Ferveur fanatique', type: 'special', special: 'ferveur', depuis: ['avant', 'arriere'], cible: 'soi', vise: [], poids: 2, recharge: 4 }
    ]
  },
  kobold: {
    nom: 'Kobold', icone: '🦎', pv: 7, ca: 13,
    caracs: { FOR: 7, DEX: 15, CON: 9, INT: 8, SAG: 7, CHA: 8 },
    actions: [
      { nom: 'Dague', type: 'attaque', depuis: ['avant'], cible: 'ennemi', vise: ['avant'], jet: 4, degats: '1d4+2', typeDeg: 'perforant', poids: 2 },
      { nom: 'Fronde', type: 'attaque', depuis: ['avant', 'arriere'], cible: 'ennemi', vise: ['avant', 'arriere'], jet: 4, degats: '1d4+2', typeDeg: 'contondant', poids: 2 },
      { nom: 'Pot de poix', type: 'sauvegarde', depuis: ['arriere'], cible: 'ennemi', vise: ['avant'], carac: 'DEX', dd: 11, degats: '1d6', typeDeg: 'feu', moitie: false,
        effetSiEchec: { etat: 'entrave', duree: 1 }, poids: 1, recharge: 3 }
    ]
  },
  gnoll: {
    nom: 'Gnoll', icone: '🐗', pv: 22, ca: 15,
    caracs: { FOR: 14, DEX: 12, CON: 11, INT: 6, SAG: 10, CHA: 7 },
    actions: [
      { nom: 'Lance', type: 'attaque', depuis: ['avant'], cible: 'ennemi', vise: ['avant'], jet: 4, degats: '1d10+2', typeDeg: 'perforant', poids: 3 },
      { nom: 'Arc long', type: 'attaque', depuis: ['avant', 'arriere'], cible: 'ennemi', vise: ['avant', 'arriere'], jet: 3, degats: '1d8+1', typeDeg: 'perforant', poids: 2 },
      { nom: 'Ricanement', type: 'sauvegarde', zone: true, depuis: ['avant', 'arriere'], cible: 'ennemi', vise: ['avant', 'arriere'], carac: 'SAG', dd: 11, moitie: false,
        effetSiEchec: { peur: 8 }, poids: 1, recharge: 4 }
    ]
  },
  hobgobelin: {
    nom: 'Capitaine hobgobelin', icone: '🎖️', pv: 34, ca: 17,
    caracs: { FOR: 15, DEX: 14, CON: 14, INT: 12, SAG: 10, CHA: 13 },
    actions: [
      { nom: 'Épée longue', type: 'attaque', depuis: ['avant'], cible: 'ennemi', vise: ['avant'], jet: 5, degats: '2d8+2', typeDeg: 'tranchant', poids: 3 },
      { nom: 'Javeline', type: 'attaque', depuis: ['avant', 'arriere'], cible: 'ennemi', vise: ['avant', 'arriere'], jet: 5, degats: '1d6+2', typeDeg: 'perforant', poids: 1 },
      { nom: 'Ordres de bataille', type: 'special', special: 'ferveur', depuis: ['avant', 'arriere'], cible: 'soi', vise: [], poids: 2, recharge: 4 }
    ]
  },
  araignee: {
    nom: 'Araignée géante', icone: '🕷️', pv: 26, ca: 14,
    caracs: { FOR: 14, DEX: 16, CON: 12, INT: 2, SAG: 11, CHA: 4 },
    actions: [
      { nom: 'Morsure venimeuse', type: 'attaque', depuis: ['avant'], cible: 'ennemi', vise: ['avant'], jet: 5, degats: '1d8+3', typeDeg: 'perforant',
        effetSiTouche: { etat: 'empoisonne', duree: 2, sauvegarde: { carac: 'CON', dd: 11 } }, poids: 3 },
      { nom: 'Toile', type: 'sauvegarde', depuis: ['avant', 'arriere'], cible: 'ennemi', vise: ['avant', 'arriere'], carac: 'DEX', dd: 12, moitie: false,
        effetSiEchec: { etat: 'entrave', duree: 2 }, poids: 2, recharge: 3 }
    ]
  },
  spectre: {
    nom: 'Spectre', icone: '👻', pv: 22, ca: 12, mortVivant: true,
    caracs: { FOR: 1, DEX: 14, CON: 11, INT: 10, SAG: 10, CHA: 11 },
    resist: ['tranchant', 'perforant', 'contondant'], immun: ['poison', 'nécrotique'], immunEtats: ['empoisonne', 'renverse'],
    actions: [
      { nom: 'Drain de vie', type: 'attaque', depuis: ['avant', 'arriere'], cible: 'ennemi', vise: ['avant', 'arriere'], jet: 4, degats: '3d6', typeDeg: 'nécrotique', sort: true, poids: 3 },
      { nom: 'Plainte glaçante', type: 'sauvegarde', zone: true, depuis: ['avant', 'arriere'], cible: 'ennemi', vise: ['avant', 'arriere'], carac: 'SAG', dd: 12, degats: '1d6', typeDeg: 'psychique', moitie: false,
        effetSiEchec: { peur: 15 }, poids: 1, recharge: 3 }
    ]
  },
  dragonnet: {
    nom: 'Dragonnet rouge', icone: '🐲', pv: 28, ca: 16, elite: true,
    caracs: { FOR: 19, DEX: 10, CON: 17, INT: 12, SAG: 11, CHA: 15 },
    resist: ['feu'],
    actions: [
      { nom: 'Morsure', type: 'attaque', depuis: ['avant'], cible: 'ennemi', vise: ['avant'], jet: 6, degats: '1d10+4', typeDeg: 'perforant', poids: 3 },
      { nom: 'Souffle de feu', type: 'sauvegarde', zone: true, depuis: ['avant', 'arriere'], cible: 'ennemi', vise: ['avant'], carac: 'DEX', dd: 12, degats: '4d6', typeDeg: 'feu', moitie: true, poids: 2, recharge: 3 }
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
  chef_kobold: {
    nom: 'Grizzik, prêtre du Dragon', icone: '🦎', pv: 50, ca: 14, boss: true, actionsParTour: 2,
    caracs: { FOR: 10, DEX: 16, CON: 14, INT: 12, SAG: 14, CHA: 16 },
    actions: [
      { nom: 'Sceptre écaillé', type: 'attaque', depuis: ['avant'], cible: 'ennemi', vise: ['avant'], jet: 6, degats: '1d8+3', typeDeg: 'contondant', poids: 2 },
      { nom: 'Trait de flammes', type: 'attaque', depuis: ['avant', 'arriere'], cible: 'ennemi', vise: ['avant', 'arriere'], jet: 6, degats: '2d10', typeDeg: 'feu', sort: true, poids: 3 },
      { nom: 'Gloire au Dragon !', type: 'special', special: 'ferveur', depuis: ['avant', 'arriere'], cible: 'soi', vise: [], poids: 2, recharge: 3 },
      { nom: 'Appel de la tribu', type: 'special', special: 'invoquer', invocation: 'kobold', depuis: ['avant', 'arriere'], cible: 'soi', vise: [], poids: 2, parCombat: 3 }
    ]
  },
  ignaroth: {
    nom: 'Ignaroth le Dragon rouge', icone: '🐉', pv: 165, ca: 18, boss: true, actionsParTour: 2,
    caracs: { FOR: 23, DEX: 10, CON: 21, INT: 14, SAG: 11, CHA: 19 },
    sauvegardesBonus: { DEX: 4, CON: 9, SAG: 4, CHA: 8 },
    immun: ['feu'],
    actions: [
      { nom: 'Morsure', type: 'attaque', depuis: ['avant'], cible: 'ennemi', vise: ['avant'], jet: 10, degats: '2d10+6', typeDeg: 'perforant', poids: 3 },
      { nom: 'Griffes', type: 'attaque', depuis: ['avant'], cible: 'ennemi', vise: ['avant'], jet: 10, degats: '2d6+6', typeDeg: 'tranchant', poids: 3 },
      { nom: 'Coup de queue', type: 'sauvegarde', zone: true, depuis: ['avant'], cible: 'ennemi', vise: ['avant'], carac: 'DEX', dd: 16, degats: '2d8+6', typeDeg: 'contondant', moitie: true,
        effetSiEchec: { etat: 'renverse', duree: 1 }, poids: 2, recharge: 2 },
      { nom: 'Souffle infernal', type: 'sauvegarde', zone: true, depuis: ['avant', 'arriere'], cible: 'ennemi', vise: ['avant', 'arriere'], carac: 'DEX', dd: 15, degats: '8d6', typeDeg: 'feu', moitie: true, poids: 4, recharge: 4 },
      { nom: 'Présence terrifiante', type: 'sauvegarde', zone: true, depuis: ['avant', 'arriere'], cible: 'ennemi', vise: ['avant', 'arriere'], carac: 'SAG', dd: 15, moitie: false,
        effetSiEchec: { peur: 30 }, poids: 2, recharge: 5 }
    ]
  },
  reine_araignee: {
    nom: 'Vel\'Thira, reine des Toiles', icone: '🕸️', pv: 120, ca: 16, boss: true, actionsParTour: 2,
    caracs: { FOR: 16, DEX: 18, CON: 16, INT: 14, SAG: 14, CHA: 16 },
    sauvegardesBonus: { DEX: 7, CON: 6, SAG: 5 },
    immun: ['poison'], immunEtats: ['empoisonne'],
    actions: [
      { nom: 'Crochets', type: 'attaque', depuis: ['avant'], cible: 'ennemi', vise: ['avant'], jet: 8, degats: '2d8+4', typeDeg: 'perforant',
        effetSiTouche: { etat: 'empoisonne', duree: 2, sauvegarde: { carac: 'CON', dd: 15 } }, poids: 3 },
      { nom: 'Rayon d\'ombre', type: 'attaque', depuis: ['avant', 'arriere'], cible: 'ennemi', vise: ['avant', 'arriere'], jet: 8, degats: '3d8', typeDeg: 'nécrotique', sort: true, poids: 2 },
      { nom: 'Pluie de toiles', type: 'sauvegarde', zone: true, depuis: ['avant', 'arriere'], cible: 'ennemi', vise: ['avant', 'arriere'], carac: 'DEX', dd: 15, moitie: false,
        effetSiEchec: { etat: 'entrave', duree: 2 }, poids: 2, recharge: 3 },
      { nom: 'Ponte', type: 'special', special: 'invoquer', invocation: 'araignee', depuis: ['avant', 'arriere'], cible: 'soi', vise: [], poids: 2, parCombat: 2 }
    ]
  },
  seigneur_guerre: {
    nom: 'Kargath, seigneur de guerre', icone: '⚔️', pv: 150, ca: 19, boss: true, actionsParTour: 2,
    caracs: { FOR: 20, DEX: 14, CON: 18, INT: 14, SAG: 12, CHA: 16 },
    sauvegardesBonus: { FOR: 8, CON: 7, SAG: 4 },
    actions: [
      { nom: 'Épée bâtarde', type: 'attaque', depuis: ['avant'], cible: 'ennemi', vise: ['avant'], jet: 9, degats: '2d10+5', typeDeg: 'tranchant', poids: 4 },
      { nom: 'Coup de bouclier', type: 'attaque', depuis: ['avant'], cible: 'ennemi', vise: ['avant'], jet: 9, degats: '1d8+5', typeDeg: 'contondant',
        effetSiTouche: { etat: 'etourdi', duree: 1, sauvegarde: { carac: 'CON', dd: 16 } }, poids: 1, recharge: 3 },
      { nom: 'Ordres de bataille', type: 'special', special: 'ferveur', depuis: ['avant', 'arriere'], cible: 'soi', vise: [], poids: 2, recharge: 3 },
      { nom: 'Renforts !', type: 'special', special: 'invoquer', invocation: 'gnoll', depuis: ['avant', 'arriere'], cible: 'soi', vise: [], poids: 2, parCombat: 2 }
    ]
  },
  dracoliche: {
    nom: 'Morthaxx la Dracoliche', icone: '☠️', pv: 150, ca: 17, boss: true, actionsParTour: 2, mortVivant: true,
    caracs: { FOR: 24, DEX: 10, CON: 22, INT: 18, SAG: 15, CHA: 20 },
    sauvegardesBonus: { DEX: 5, CON: 11, SAG: 7, CHA: 10 },
    resist: ['tranchant', 'perforant', 'contondant'], immun: ['nécrotique', 'poison'], immunEtats: ['empoisonne', 'etourdi', 'renverse'],
    actions: [
      { nom: 'Morsure putride', type: 'attaque', depuis: ['avant'], cible: 'ennemi', vise: ['avant'], jet: 11, degats: '2d10+7', typeDeg: 'perforant', poids: 3 },
      { nom: 'Griffes d\'os', type: 'attaque', depuis: ['avant'], cible: 'ennemi', vise: ['avant'], jet: 11, degats: '2d6+7', typeDeg: 'tranchant', poids: 2 },
      { nom: 'Souffle de mort', type: 'sauvegarde', zone: true, depuis: ['avant', 'arriere'], cible: 'ennemi', vise: ['avant', 'arriere'], carac: 'CON', dd: 16, degats: '8d6', typeDeg: 'nécrotique', moitie: true, poids: 3, recharge: 4 },
      { nom: 'Regard de l\'au-delà', type: 'sauvegarde', zone: true, depuis: ['avant', 'arriere'], cible: 'ennemi', vise: ['avant', 'arriere'], carac: 'SAG', dd: 16, moitie: false,
        effetSiEchec: { peur: 25 }, poids: 2, recharge: 4 },
      { nom: 'Lever les ossements', type: 'special', special: 'invoquer', invocation: 'squelette', depuis: ['avant', 'arriere'], cible: 'soi', vise: [], poids: 2, parCombat: 3 }
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
