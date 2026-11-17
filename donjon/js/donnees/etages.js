// =====================================================================
// Étages de l'expédition. Chaque étage a sa carte, ses rencontres et son
// boss ; battre le boss fait monter l'équipe d'un niveau et descendre.
//   rencontres.facile : premières rangées de la carte, puis .moyen
//   theme             : ambiance 3D (voir THEMES_3D dans modeles3d.js)
//   force             : renfort des monstres { pv: ×, toucher: +, degats: +, dd: +, ca: + }
// Une rencontre : { avant: [monstres], arriere: [monstres] }
// =====================================================================

// Renfort appliqué à tous les étages de toutes les campagnes (compense la
// puissance des objets) : ajouté à la `force` de chaque étage.
const RENFORT_GLOBAL = { pv: 0.25, toucher: 0, degats: 0, dd: 0 };

const ETAGES = [
  {
    nom: 'Les Cryptes', theme: 'crypte', force: { pv: 1.3, toucher: 1, degats: 1, dd: 1 },
    intro: 'Des couloirs de pierre froide où dorment les morts… et ceux qui les pillent.',
    rencontres: {
      facile: [
        { avant: ['gobelin', 'gobelin'], arriere: ['gobelin'] },
        { avant: ['loup', 'loup'], arriere: [] },
        { avant: ['squelette'], arriere: ['squelette'] },
        { avant: ['zombie'], arriere: ['cultiste'] },
        { avant: ['loup', 'gobelin'], arriere: ['gobelin'] }
      ],
      moyen: [
        { avant: ['zombie', 'squelette'], arriere: ['cultiste'] },
        { avant: ['loup', 'loup'], arriere: ['gobelin', 'gobelin'] },
        { avant: ['squelette', 'squelette'], arriere: ['squelette', 'cultiste'] },
        { avant: ['zombie', 'zombie'], arriere: ['cultiste'] },
        { avant: ['gobelin', 'gobelin'], arriere: ['cultiste', 'cultiste'] }
      ],
      elite: [
        { avant: ['ogre'], arriere: ['gobelin', 'gobelin'] },
        { avant: ['zombie', 'ogre'], arriere: ['cultiste'] },
        { avant: ['loup', 'ogre', 'loup'], arriere: [] }
      ],
      boss: [{ avant: ['grukk'], arriere: ['gobelin', 'gobelin'] }]
    }
  },
  {
    nom: 'Les Grottes', theme: 'grotte', force: { pv: 1.2, toucher: 1, degats: 1, dd: 0 },
    intro: 'Un dédale humide où rôdent des meutes affamées et des sorciers d\'os.',
    rencontres: {
      facile: [
        { avant: ['loup', 'loup'], arriere: ['gobelin', 'gobelin'] },
        { avant: ['ogre'], arriere: ['gobelin', 'gobelin'] },
        { avant: ['zombie', 'loup'], arriere: ['mage_squelette'] },
        { avant: ['squelette', 'squelette'], arriere: ['mage_squelette'] }
      ],
      moyen: [
        { avant: ['loup', 'loup'], arriere: ['gobelin', 'gobelin'] },
        { avant: ['ogre', 'zombie'], arriere: ['mage_squelette'] },
        { avant: ['squelette', 'squelette'], arriere: ['mage_squelette', 'mage_squelette'] },
        { avant: ['ogre', 'loup'], arriere: ['cultiste', 'cultiste'] }
      ],
      elite: [
        { avant: ['ogre', 'loup'], arriere: ['gobelin', 'gobelin'] },
        { avant: ['loup', 'ogre'], arriere: ['mage_squelette'] }
      ],
      boss: [{ avant: ['chevalier_squelette', 'squelette'], arriere: ['mage_squelette'] }]
    }
  },
  {
    nom: 'Le Sanctuaire', theme: 'sanctuaire', force: { pv: 1.35, toucher: 1, degats: 2, dd: 1 },
    intro: 'Le cœur du culte. L\'air vibre d\'une magie nécrotique.',
    rencontres: {
      facile: [
        { avant: ['zombie', 'zombie'], arriere: ['cultiste', 'cultiste'] },
        { avant: ['squelette', 'squelette'], arriere: ['mage_squelette', 'cultiste'] },
        { avant: ['ogre', 'zombie'], arriere: ['cultiste'] }
      ],
      moyen: [
        { avant: ['ogre', 'zombie'], arriere: ['cultiste', 'mage_squelette'] },
        { avant: ['squelette', 'squelette', 'zombie'], arriere: ['mage_squelette', 'mage_squelette'] },
        { avant: ['ogre', 'ogre'], arriere: ['mage_squelette', 'cultiste'] }
      ],
      elite: [
        { avant: ['ogre', 'ogre'], arriere: ['cultiste', 'mage_squelette'] },
        { avant: ['zombie', 'zombie', 'zombie'], arriere: ['mage_squelette', 'mage_squelette'] }
      ],
      boss: [{ avant: ['squelette', 'squelette'], arriere: ['morvagne'] }]
    }
  }
];
