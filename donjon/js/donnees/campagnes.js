// =====================================================================
// Campagnes : chacune est une expédition de plusieurs étages (même format
// que ETAGES dans etages.js). Terminer une campagne débloque la suivante.
//   debloquee  : ouverte dès le départ
//   apres      : identifiant de la campagne à terminer pour la débloquer
//   regles     : { potions: potions de départ, peurMult: multiplicateur de Peur, or: or de départ }
//   fin        : texte de victoire
//   aleatoire  : mode « Chaos » : étages tirés au hasard parmi toutes les
//                campagnes (genererEtagesAleatoires), une seule carte double
//   apresTout  : débloquée quand toutes les autres campagnes sont terminées
// La progression (campagnes débloquées, victoires, record) est mémorisée
// dans le navigateur, indépendamment de la partie en cours.
// =====================================================================

const CAMPAGNES = [
  {
    id: 'crypte', nom: 'La Crypte de Morvagne', icone: '☠️', difficulte: 1, debloquee: true,
    resume: 'Une nécromancienne relève les morts sous la ville. Descendez dans ses cryptes et mettez fin à son rituel.',
    regles: { potions: 2, peurMult: 1 },
    fin: 'Morvagne la Nécromancienne n\'est plus. Les cryptes retrouvent le silence.',
    etages: ETAGES
  },
  {
    id: 'horde', nom: 'La Horde de Grukk', icone: '👹', difficulte: 2, apres: 'crypte',
    resume: 'Grukk a survécu et rassemble gobelins et loups dans une forteresse souterraine. Frappez avant que la horde ne déferle.',
    regles: { potions: 4, peurMult: 1 },
    regleTexte: 'Départ avec 4 potions.',
    fin: 'Le Tyran est tombé. Sans chef, la horde se disperse dans les profondeurs.',
    etages: [
      {
        nom: 'Le Camp gobelin', theme: 'grotte', force: { pv: 1.2, toucher: 0, degats: 1, dd: 0 },
        intro: 'Des tentes de peaux, des feux qui fument : le camp avancé de la horde.',
        rencontres: {
          facile: [
            { avant: ['gobelin', 'gobelin'], arriere: ['gobelin', 'gobelin'] },
            { avant: ['loup', 'gobelin'], arriere: ['gobelin'] },
            { avant: ['loup', 'loup'], arriere: ['gobelin'] }
          ],
          moyen: [
            { avant: ['ogre', 'gobelin'], arriere: ['gobelin'] },
            { avant: ['loup', 'loup'], arriere: ['gobelin', 'gobelin'] },
            { avant: ['gobelin', 'gobelin', 'gobelin'], arriere: ['gobelin', 'cultiste'] }
          ],
          elite: [
            { avant: ['ogre'], arriere: ['gobelin', 'gobelin'] },
            { avant: ['ogre', 'loup'], arriere: ['gobelin'] }
          ],
          boss: [{ avant: ['gobelin', 'gobelin'], arriere: ['roi_gobelin'] }]
        }
      },
      {
        nom: 'Les Tanières', theme: 'grotte', force: { pv: 1.1, toucher: 1, degats: 1, dd: 1 },
        intro: 'Des galeries tapissées d\'os rongés. On entend hurler au loin.',
        rencontres: {
          facile: [
            { avant: ['loup', 'loup'], arriere: ['loup'] },
            { avant: ['ogre'], arriere: ['gobelin', 'gobelin'] },
            { avant: ['loup', 'loup'], arriere: ['gobelin', 'gobelin'] }
          ],
          moyen: [
            { avant: ['loup', 'loup', 'loup'], arriere: ['gobelin'] },
            { avant: ['ogre', 'loup'], arriere: ['gobelin', 'gobelin'] },
            { avant: ['ogre', 'ogre'], arriere: ['gobelin'] }
          ],
          elite: [
            { avant: ['ogre', 'ogre'], arriere: ['gobelin', 'gobelin'] },
            { avant: ['loup', 'ogre', 'loup'], arriere: ['gobelin'] }
          ],
          boss: [{ avant: ['loup_alpha', 'loup'], arriere: ['loup'] }]
        }
      },
      {
        nom: 'La Forteresse', theme: 'crypte', force: { pv: 1.3, toucher: 1, degats: 2, dd: 1 },
        intro: 'Des murailles taillées dans la roche. Grukk vous attend sur son trône d\'os.',
        rencontres: {
          facile: [
            { avant: ['ogre', 'ogre'], arriere: ['gobelin', 'gobelin'] },
            { avant: ['loup', 'ogre'], arriere: ['gobelin', 'mage_squelette'] }
          ],
          moyen: [
            { avant: ['ogre', 'ogre'], arriere: ['gobelin', 'gobelin'] },
            { avant: ['ogre', 'loup', 'loup'], arriere: ['gobelin'] },
            { avant: ['ogre', 'gobelin'], arriere: ['gobelin', 'mage_squelette'] }
          ],
          elite: [
            { avant: ['ogre', 'ogre'], arriere: ['ogre', 'gobelin'] },
            { avant: ['grukk', 'loup'], arriere: ['gobelin'] }
          ],
          boss: [{ avant: ['grukk_tyran'], arriere: ['gobelin', 'gobelin'] }]
        }
      }
    ]
  },
  {
    id: 'eclipse', nom: 'Le Culte de l\'Éclipse', icone: '🌑', difficulte: 3, apres: 'horde',
    resume: 'Derrière Morvagne et Grukk se cachait un culte qui veut éteindre le soleil. Affrontez ses prêtres jusqu\'au cœur du temple.',
    regles: { potions: 2, peurMult: 1.3 },
    regleTexte: 'La Peur monte 30 % plus vite.',
    fin: 'Velkor s\'effondre et l\'éclipse se dissipe. La lumière revient sur le royaume.',
    etages: [
      {
        nom: 'Les Catacombes', theme: 'crypte', force: { pv: 1.0, toucher: 0, degats: 0, dd: 0 },
        intro: 'Des niches funéraires à perte de vue. Certaines sont vides… depuis peu.',
        rencontres: {
          facile: [
            { avant: ['zombie', 'zombie'], arriere: ['cultiste'] },
            { avant: ['squelette', 'squelette'], arriere: ['cultiste'] },
            { avant: ['zombie', 'squelette'], arriere: ['mage_squelette'] }
          ],
          moyen: [
            { avant: ['zombie', 'zombie'], arriere: ['cultiste', 'cultiste'] },
            { avant: ['squelette', 'squelette'], arriere: ['mage_squelette', 'cultiste'] },
            { avant: ['zombie', 'squelette'], arriere: ['pretre_eclipse'] }
          ],
          elite: [
            { avant: ['zombie', 'squelette'], arriere: ['pretre_eclipse'] },
            { avant: ['ogre'], arriere: ['pretre_eclipse'] }
          ],
          boss: [{ avant: ['squelette', 'squelette'], arriere: ['pretre_eclipse', 'pretre_eclipse'] }]
        }
      },
      {
        nom: 'Le Cloître noir', theme: 'sanctuaire', force: { pv: 1.0, toucher: 0, degats: 1, dd: 0 },
        intro: 'Les chants du culte résonnent sous des voûtes peintes de soleils noirs.',
        rencontres: {
          facile: [
            { avant: ['zombie', 'zombie'], arriere: ['cultiste', 'cultiste'] },
            { avant: ['squelette', 'squelette'], arriere: ['pretre_eclipse'] }
          ],
          moyen: [
            { avant: ['ogre', 'zombie'], arriere: ['pretre_eclipse', 'cultiste'] },
            { avant: ['squelette', 'squelette', 'zombie'], arriere: ['mage_squelette', 'pretre_eclipse'] },
            { avant: ['zombie', 'zombie'], arriere: ['cultiste', 'cultiste', 'mage_squelette'] }
          ],
          elite: [
            { avant: ['ogre', 'zombie'], arriere: ['pretre_eclipse'] },
            { avant: ['zombie', 'zombie'], arriere: ['pretre_eclipse', 'cultiste'] }
          ],
          boss: [{ avant: ['chevalier_squelette', 'zombie'], arriere: ['pretre_eclipse'] }]
        }
      },
      {
        nom: 'Le Temple de l\'Éclipse', theme: 'sanctuaire', force: { pv: 1.1, toucher: 1, degats: 1, dd: 0 },
        intro: 'L\'autel du culte. Au-dessus, un soleil noir palpite.',
        rencontres: {
          facile: [
            { avant: ['ogre', 'zombie'], arriere: ['pretre_eclipse', 'cultiste'] },
            { avant: ['squelette', 'squelette'], arriere: ['mage_squelette', 'pretre_eclipse'] }
          ],
          moyen: [
            { avant: ['ogre', 'ogre'], arriere: ['pretre_eclipse', 'cultiste'] },
            { avant: ['zombie', 'zombie', 'squelette'], arriere: ['pretre_eclipse', 'mage_squelette'] }
          ],
          elite: [
            { avant: ['chevalier_squelette'], arriere: ['pretre_eclipse', 'cultiste'] },
            { avant: ['ogre', 'ogre'], arriere: ['pretre_eclipse', 'pretre_eclipse'] }
          ],
          boss: [{ avant: ['zombie', 'zombie'], arriere: ['velkor', 'pretre_eclipse'] }]
        }
      }
    ]
  },
  {
    id: 'marais', nom: 'Le Marais des Noyés', icone: '🐸', difficulte: 3, apres: 'horde',
    resume: 'Les villages du delta disparaissent un à un. Dans la brume, les hommes-lézards servent une guenaude qui noie les vivants pour en faire ses serviteurs.',
    regles: { potions: 3, peurMult: 1.1 },
    regleTexte: 'Les trolls se régénèrent : achevez-les vite.',
    fin: 'Mère Fangeuse s\'enfonce dans la vase en hurlant. La brume se lève enfin sur le delta.',
    etages: [
      {
        nom: 'Les Rives brumeuses', theme: 'marais', force: { pv: 1.0, toucher: 0, degats: 0, dd: 0 },
        intro: 'Des roseaux plus hauts qu\'un homme, et des yeux jaunes qui vous suivent depuis l\'eau.',
        rencontres: {
          facile: [
            { avant: ['homme_lezard'], arriere: ['crapaud'] },
            { avant: ['crapaud', 'crapaud'], arriere: [] },
            { avant: ['noye', 'noye'], arriere: [] },
            { avant: ['homme_lezard', 'homme_lezard'], arriere: [] }
          ],
          moyen: [
            { avant: ['homme_lezard', 'homme_lezard'], arriere: ['crapaud'] },
            { avant: ['noye', 'homme_lezard'], arriere: ['feu_follet'] },
            { avant: ['crapaud', 'crapaud'], arriere: ['feu_follet'] }
          ],
          elite: [
            { avant: ['troll'], arriere: ['crapaud'] },
            { avant: ['homme_lezard', 'homme_lezard'], arriere: ['feu_follet', 'feu_follet'] }
          ],
          boss: [{ avant: ['chef_lezard'], arriere: ['homme_lezard'] }]
        }
      },
      {
        nom: 'Le Village englouti', theme: 'marais', force: { pv: 1.05, toucher: 0, degats: 1, dd: 0 },
        intro: 'Des toits de chaume affleurent à la surface. Les anciens habitants marchent encore… sous l\'eau.',
        rencontres: {
          facile: [
            { avant: ['noye', 'noye'], arriere: ['feu_follet'] },
            { avant: ['homme_lezard', 'crapaud'], arriere: ['homme_lezard'] }
          ],
          moyen: [
            { avant: ['noye', 'noye', 'noye'], arriere: ['feu_follet'] },
            { avant: ['homme_lezard', 'homme_lezard'], arriere: ['feu_follet', 'crapaud'] },
            { avant: ['troll'], arriere: [] }
          ],
          elite: [
            { avant: ['troll', 'noye'], arriere: ['feu_follet'] },
            { avant: ['troll'], arriere: ['homme_lezard', 'homme_lezard'] }
          ],
          boss: [{ avant: ['troll', 'troll'], arriere: ['feu_follet'] }]
        }
      },
      {
        nom: 'L\'Antre de la guenaude', theme: 'marais', force: { pv: 1.1, toucher: 1, degats: 1, dd: 0 },
        intro: 'Une hutte bâtie sur des os, au milieu d\'un étang noir. Une voix chantonne une berceuse.',
        rencontres: {
          facile: [
            { avant: ['noye', 'troll'], arriere: [] },
            { avant: ['homme_lezard', 'homme_lezard'], arriere: ['feu_follet', 'feu_follet'] }
          ],
          moyen: [
            { avant: ['troll', 'homme_lezard'], arriere: ['feu_follet'] },
            { avant: ['noye', 'noye'], arriere: ['feu_follet', 'feu_follet'] }
          ],
          elite: [
            { avant: ['troll', 'troll'], arriere: [] },
            { avant: ['chef_lezard'], arriere: ['feu_follet'] }
          ],
          boss: [{ avant: ['noye', 'troll'], arriere: ['guenaude'] }]
        }
      }
    ]
  },
  {
    id: 'dragon', nom: 'Le Repaire d\'Ignaroth', icone: '🐉', difficulte: 4, apres: 'eclipse',
    resume: 'Un dragon rouge s\'est éveillé sous la montagne. Ses kobolds pillent les villages et ses dragonnets gardent les tunnels de lave.',
    regles: { potions: 3, peurMult: 1.2 },
    regleTexte: 'La Peur monte 20 % plus vite. Gare aux souffles de feu.',
    fin: 'Ignaroth s\'effondre dans un torrent de flammes. Son trésor est à vous, et la montagne se tait enfin.',
    etages: [
      {
        nom: 'Les Tunnels kobolds', theme: 'volcan', force: { pv: 1.1, toucher: 0, degats: 0, dd: 0 },
        intro: 'Des galeries étroites, pleines de pièges et de petits yeux luisants.',
        rencontres: {
          facile: [
            { avant: ['kobold', 'kobold'], arriere: ['kobold', 'kobold'] },
            { avant: ['kobold', 'loup'], arriere: ['kobold', 'kobold'] },
            { avant: ['gnoll'], arriere: ['kobold', 'kobold'] }
          ],
          moyen: [
            { avant: ['gnoll', 'kobold'], arriere: ['kobold', 'kobold'] },
            { avant: ['ogre'], arriere: ['kobold', 'kobold', 'kobold'] },
            { avant: ['kobold', 'kobold', 'kobold'], arriere: ['cultiste', 'kobold'] }
          ],
          elite: [
            { avant: ['dragonnet'], arriere: ['kobold', 'kobold'] },
            { avant: ['ogre', 'gnoll'], arriere: ['kobold'] }
          ],
          boss: [{ avant: ['kobold', 'kobold'], arriere: ['chef_kobold'] }]
        }
      },
      {
        nom: 'La Caverne des Drakes', theme: 'volcan', force: { pv: 1.05, toucher: 0, degats: 1, dd: 0 },
        intro: 'La chaleur devient étouffante. Des œufs énormes reposent dans la lave refroidie.',
        rencontres: {
          facile: [
            { avant: ['gnoll', 'gnoll'], arriere: ['kobold', 'kobold'] },
            { avant: ['dragonnet'], arriere: ['kobold'] }
          ],
          moyen: [
            { avant: ['dragonnet', 'kobold'], arriere: ['kobold', 'cultiste'] },
            { avant: ['ogre', 'gnoll'], arriere: ['kobold', 'kobold'] },
            { avant: ['hobgobelin', 'gnoll'], arriere: ['kobold'] }
          ],
          elite: [
            { avant: ['dragonnet', 'dragonnet'], arriere: [] },
            { avant: ['dragonnet', 'ogre'], arriere: ['kobold'] }
          ],
          boss: [{ avant: ['dragonnet', 'dragonnet'], arriere: ['chef_kobold'] }]
        }
      },
      {
        nom: 'L\'Antre du Dragon', theme: 'volcan', force: { pv: 1.0, toucher: 1, degats: 1, dd: 0 },
        intro: 'Une salle immense pavée d\'or fondu. Deux yeux s\'ouvrent dans les ténèbres.',
        rencontres: {
          facile: [
            { avant: ['dragonnet', 'gnoll'], arriere: ['kobold'] },
            { avant: ['hobgobelin', 'hobgobelin'], arriere: ['kobold'] }
          ],
          moyen: [
            { avant: ['dragonnet', 'dragonnet'], arriere: ['kobold'] },
            { avant: ['ogre', 'dragonnet'], arriere: ['cultiste'] }
          ],
          elite: [
            { avant: ['dragonnet', 'dragonnet'], arriere: ['cultiste', 'cultiste'] },
            { avant: ['grukk', 'dragonnet'], arriere: [] }
          ],
          boss: [{ avant: ['ignaroth'], arriere: ['kobold', 'kobold'] }]
        }
      }
    ]
  },
  {
    id: 'toiles', nom: 'Les Profondeurs de Vel\'Thira', icone: '🕷️', difficulte: 5, apres: 'dragon',
    resume: 'Sous le monde, une reine araignée tisse sa toile entre les vivants et les morts. Des spectres hantent ses galeries.',
    regles: { potions: 2, peurMult: 1.3 },
    regleTexte: 'La Peur monte 30 % plus vite. Poisons et toiles partout.',
    fin: 'La reine des Toiles se recroqueville et s\'éteint. Les spectres s\'apaisent enfin.',
    etages: [
      {
        nom: 'Les Galeries tissées', theme: 'toiles', force: { pv: 1.0, toucher: 0, degats: 0, dd: 0 },
        intro: 'Des fils argentés pendent du plafond. Tout ce qui les touche finit dévoré.',
        rencontres: {
          facile: [
            { avant: ['araignee'], arriere: ['kobold', 'kobold'] },
            { avant: ['araignee', 'loup'], arriere: [] },
            { avant: ['squelette', 'squelette'], arriere: ['spectre'] }
          ],
          moyen: [
            { avant: ['araignee', 'araignee'], arriere: ['kobold'] },
            { avant: ['zombie', 'araignee'], arriere: ['spectre'] },
            { avant: ['araignee'], arriere: ['spectre', 'mage_squelette'] }
          ],
          elite: [
            { avant: ['araignee', 'araignee', 'araignee'], arriere: [] },
            { avant: ['chevalier_squelette'], arriere: ['spectre'] }
          ],
          boss: [{ avant: ['araignee', 'araignee'], arriere: ['spectre', 'spectre'] }]
        }
      },
      {
        nom: 'La Nécropole engloutie', theme: 'toiles', force: { pv: 1.0, toucher: 0, degats: 1, dd: 0 },
        intro: 'Une ville morte, à moitié noyée. Des silhouettes pâles glissent au-dessus de l\'eau.',
        rencontres: {
          facile: [
            { avant: ['zombie', 'zombie'], arriere: ['spectre'] },
            { avant: ['araignee', 'squelette'], arriere: ['spectre'] }
          ],
          moyen: [
            { avant: ['zombie', 'araignee'], arriere: ['spectre', 'spectre'] },
            { avant: ['squelette', 'squelette'], arriere: ['mage_squelette', 'spectre'] },
            { avant: ['ogre', 'araignee'], arriere: ['spectre'] }
          ],
          elite: [
            { avant: ['chevalier_squelette', 'araignee'], arriere: ['spectre'] },
            { avant: ['araignee', 'araignee'], arriere: ['spectre', 'spectre'] }
          ],
          boss: [{ avant: ['chevalier_squelette', 'zombie'], arriere: ['spectre', 'mage_squelette'] }]
        }
      },
      {
        nom: 'Le Trône des Toiles', theme: 'toiles', force: { pv: 1.0, toucher: 1, degats: 1, dd: 0 },
        intro: 'Un cocon gigantesque palpite au centre d\'une toile immense.',
        rencontres: {
          facile: [
            { avant: ['araignee', 'araignee'], arriere: ['spectre'] },
            { avant: ['zombie', 'zombie'], arriere: ['spectre', 'spectre'] }
          ],
          moyen: [
            { avant: ['araignee', 'araignee', 'araignee'], arriere: ['spectre'] },
            { avant: ['chevalier_squelette'], arriere: ['spectre', 'spectre'] }
          ],
          elite: [
            { avant: ['araignee', 'araignee'], arriere: ['spectre', 'spectre', 'mage_squelette'] },
            { avant: ['chevalier_squelette', 'araignee'], arriere: ['spectre', 'spectre'] }
          ],
          boss: [{ avant: ['araignee', 'araignee'], arriere: ['reine_araignee'] }]
        }
      }
    ]
  },
  {
    id: 'givre', nom: 'La Citadelle de Givre', icone: '❄️', difficulte: 5, apres: 'dragon',
    resume: 'Un hiver éternel descend des montagnes. Au sommet d\'une citadelle de glace, une reine immortelle veut geler le monde entier.',
    regles: { potions: 3, peurMult: 1.2 },
    regleTexte: 'Le froid gèle les gestes : attention aux entraves. Le feu fait des ravages ici.',
    fin: 'Le cœur gelé de la Reine se brise. Pour la première fois depuis des années, la neige fond.',
    etages: [
      {
        nom: 'Le Col des Hurlements', theme: 'givre', force: { pv: 0.9, toucher: 0, degats: 0, dd: 0 },
        intro: 'Le vent hurle dans le col. Ou peut-être sont-ce des loups.',
        rencontres: {
          facile: [
            { avant: ['loup_givre', 'loup_givre'], arriere: [] },
            { avant: ['yeti'], arriere: [] },
            { avant: ['loup_givre'], arriere: ['esprit_glace'] }
          ],
          moyen: [
            { avant: ['loup_givre', 'loup_givre'], arriere: ['esprit_glace'] },
            { avant: ['yeti', 'loup_givre'], arriere: [] },
            { avant: ['esprit_glace', 'esprit_glace'], arriere: ['pretresse_givre'] }
          ],
          elite: [
            { avant: ['yeti', 'yeti'], arriere: [] },
            { avant: ['yeti'], arriere: ['pretresse_givre', 'esprit_glace'] }
          ],
          boss: [{ avant: ['yeti', 'yeti'], arriere: ['loup_givre'] }]
        }
      },
      {
        nom: 'Les Remparts gelés', theme: 'givre', force: { pv: 0.95, toucher: 0, degats: 1, dd: 0 },
        intro: 'Des soldats changés en statues de glace montent la garde. Certains bougent encore.',
        rencontres: {
          facile: [
            { avant: ['yeti', 'loup_givre'], arriere: [] },
            { avant: ['esprit_glace', 'esprit_glace'], arriere: ['pretresse_givre'] }
          ],
          moyen: [
            { avant: ['yeti', 'esprit_glace'], arriere: ['pretresse_givre'] },
            { avant: ['loup_givre', 'loup_givre', 'loup_givre'], arriere: ['pretresse_givre'] },
            { avant: ['yeti', 'yeti'], arriere: ['esprit_glace'] }
          ],
          elite: [
            { avant: ['yeti', 'yeti'], arriere: ['pretresse_givre'] },
            { avant: ['esprit_glace', 'esprit_glace'], arriere: ['pretresse_givre', 'pretresse_givre'] }
          ],
          boss: [{ avant: ['geant_givre'], arriere: ['loup_givre'] }]
        }
      },
      {
        nom: 'Le Palais de cristal', theme: 'givre', force: { pv: 1.0, toucher: 1, degats: 1, dd: 0 },
        intro: 'Tout est de glace pure : les murs, les colonnes, le trône. Votre souffle gèle avant de toucher le sol.',
        rencontres: {
          facile: [
            { avant: ['yeti', 'esprit_glace'], arriere: ['pretresse_givre'] },
            { avant: ['loup_givre', 'loup_givre'], arriere: ['esprit_glace', 'esprit_glace'] }
          ],
          moyen: [
            { avant: ['yeti', 'yeti'], arriere: ['pretresse_givre', 'esprit_glace'] },
            { avant: ['esprit_glace', 'esprit_glace', 'esprit_glace'], arriere: ['pretresse_givre'] }
          ],
          elite: [
            { avant: ['geant_givre'], arriere: ['pretresse_givre'] },
            { avant: ['yeti', 'yeti'], arriere: ['pretresse_givre', 'pretresse_givre'] }
          ],
          boss: [{ avant: ['esprit_glace', 'yeti'], arriere: ['reine_hiver'] }]
        }
      }
    ]
  },
  {
    id: 'legion', nom: 'La Légion de Fer', icone: '🎖️', difficulte: 6, apres: 'toiles',
    resume: 'Une armée de hobgobelins et de gnolls marche sur le royaume. Infiltrez leur forteresse et abattez leur seigneur de guerre.',
    regles: { potions: 1, peurMult: 1.2 },
    regleTexte: 'Une seule potion au départ. Des ennemis disciplinés qui se galvanisent.',
    fin: 'Kargath tombe, et sans lui la Légion de Fer se débande.',
    etages: [
      {
        nom: 'Le Camp de la Légion', theme: 'crypte', force: { pv: 1.0, toucher: 0, degats: 0, dd: 0 },
        intro: 'Des tentes alignées au cordeau, des tambours de guerre, des sentinelles partout.',
        rencontres: {
          facile: [
            { avant: ['gnoll', 'gnoll'], arriere: ['gobelin'] },
            { avant: ['hobgobelin'], arriere: ['gobelin', 'gobelin'] },
            { avant: ['gnoll', 'loup'], arriere: ['gnoll'] }
          ],
          moyen: [
            { avant: ['hobgobelin', 'gnoll'], arriere: ['gobelin', 'gobelin'] },
            { avant: ['ogre', 'gnoll'], arriere: ['gnoll'] },
            { avant: ['gnoll', 'gnoll', 'gnoll'], arriere: ['gobelin'] }
          ],
          elite: [
            { avant: ['hobgobelin', 'hobgobelin'], arriere: ['gnoll'] },
            { avant: ['ogre', 'ogre'], arriere: ['gnoll'] }
          ],
          boss: [{ avant: ['hobgobelin', 'hobgobelin'], arriere: ['gnoll', 'gnoll'] }]
        }
      },
      {
        nom: 'Les Fosses aux bêtes', theme: 'grotte', force: { pv: 1.0, toucher: 0, degats: 1, dd: 0 },
        intro: 'Des cages, des chaînes, et l\'odeur des bêtes de guerre affamées.',
        rencontres: {
          facile: [
            { avant: ['loup', 'loup', 'gnoll'], arriere: ['gnoll'] },
            { avant: ['ogre', 'hobgobelin'], arriere: [] }
          ],
          moyen: [
            { avant: ['loup_alpha'], arriere: ['gnoll', 'gnoll'] },
            { avant: ['hobgobelin', 'ogre'], arriere: ['gnoll'] },
            { avant: ['araignee', 'araignee'], arriere: ['hobgobelin'] }
          ],
          elite: [
            { avant: ['ogre', 'ogre'], arriere: ['hobgobelin'] },
            { avant: ['hobgobelin', 'hobgobelin', 'gnoll'], arriere: ['gnoll'] }
          ],
          boss: [{ avant: ['grukk_tyran'], arriere: ['gnoll', 'gnoll'] }]
        }
      },
      {
        nom: 'La Citadelle de Fer', theme: 'crypte', force: { pv: 1.0, toucher: 1, degats: 1, dd: 0 },
        intro: 'Des murailles noires, des étendards rouges. Kargath vous attend dans la salle du trône.',
        rencontres: {
          facile: [
            { avant: ['hobgobelin', 'hobgobelin'], arriere: ['gnoll'] },
            { avant: ['ogre', 'gnoll'], arriere: ['gnoll', 'gnoll'] }
          ],
          moyen: [
            { avant: ['hobgobelin', 'hobgobelin'], arriere: ['gnoll', 'gnoll'] },
            { avant: ['ogre', 'hobgobelin'], arriere: ['cultiste', 'gnoll'] }
          ],
          elite: [
            { avant: ['hobgobelin', 'hobgobelin', 'hobgobelin'], arriere: ['gnoll'] },
            { avant: ['grukk', 'hobgobelin'], arriere: ['gnoll'] }
          ],
          boss: [{ avant: ['seigneur_guerre', 'hobgobelin'], arriere: ['gnoll'] }]
        }
      }
    ]
  },
  {
    id: 'tombeau', nom: 'Le Tombeau d\'Ankh-Sethi', icone: '🏺', difficulte: 6, apres: 'toiles',
    resume: 'Une tempête de sable a dégagé l\'entrée d\'un tombeau maudit. Le Roi-Momie s\'éveille, et sa malédiction s\'étend sur le désert.',
    regles: { potions: 3, peurMult: 1.2 },
    regleTexte: 'Momies et pharaon craignent le feu. Les nuées de scarabées résistent aux armes.',
    fin: 'Les bandelettes d\'Ankh-Sethi s\'embrasent. Son tombeau s\'effondre et le désert retrouve le silence.',
    etages: [
      {
        nom: 'La Nécropole des sables', theme: 'desert', force: { pv: 0.9, toucher: 0, degats: 0, dd: 0 },
        intro: 'Des tombes à demi ensevelies. Le sable remue tout seul par endroits.',
        rencontres: {
          facile: [
            { avant: ['chacal', 'chacal'], arriere: [] },
            { avant: ['scarabees'], arriere: ['chacal'] },
            { avant: ['momie'], arriere: [] },
            { avant: ['squelette', 'squelette'], arriere: ['chacal'] }
          ],
          moyen: [
            { avant: ['momie', 'chacal'], arriere: ['chacal'] },
            { avant: ['scarabees', 'scarabees'], arriere: ['chacal'] },
            { avant: ['momie', 'squelette'], arriere: ['mage_squelette'] }
          ],
          elite: [
            { avant: ['momie', 'momie'], arriere: ['pretre_momie'] },
            { avant: ['chacal', 'chacal'], arriere: ['pretre_momie'] }
          ],
          boss: [{ avant: ['chacal', 'chacal'], arriere: ['pretre_momie'] }]
        }
      },
      {
        nom: 'Les Galeries des embaumeurs', theme: 'desert', force: { pv: 0.95, toucher: 0, degats: 1, dd: 0 },
        intro: 'Des jarres scellées, des tables de pierre, et une odeur de résine et de mort.',
        rencontres: {
          facile: [
            { avant: ['momie', 'momie'], arriere: [] },
            { avant: ['scarabees', 'chacal'], arriere: ['chacal'] }
          ],
          moyen: [
            { avant: ['momie', 'scarabees'], arriere: ['pretre_momie'] },
            { avant: ['chacal', 'chacal'], arriere: ['chacal', 'mage_squelette'] },
            { avant: ['momie', 'momie'], arriere: ['chacal'] }
          ],
          elite: [
            { avant: ['momie', 'momie'], arriere: ['pretre_momie', 'chacal'] },
            { avant: ['scarabees', 'scarabees'], arriere: ['pretre_momie'] }
          ],
          boss: [{ avant: ['momie', 'momie'], arriere: ['pretre_momie', 'pretre_momie'] }]
        }
      },
      {
        nom: 'La Chambre du pharaon', theme: 'desert', force: { pv: 1.1, toucher: 1, degats: 1, dd: 1 },
        intro: 'Des murs couverts d\'or et de hiéroglyphes. Au centre, un sarcophage dont le couvercle a glissé.',
        rencontres: {
          facile: [
            { avant: ['momie', 'chacal'], arriere: ['pretre_momie'] },
            { avant: ['scarabees', 'scarabees'], arriere: ['chacal'] }
          ],
          moyen: [
            { avant: ['momie', 'momie'], arriere: ['pretre_momie'] },
            { avant: ['chacal', 'chacal', 'chacal'], arriere: ['pretre_momie'] }
          ],
          elite: [
            { avant: ['momie', 'momie', 'scarabees'], arriere: ['pretre_momie'] },
            { avant: ['chacal', 'chacal'], arriere: ['pretre_momie', 'pretre_momie'] }
          ],
          boss: [{ avant: ['momie', 'chacal'], arriere: ['pharaon'] }]
        }
      }
    ]
  },
  {
    id: 'abime', nom: 'Le Cœur de l\'Abîme', icone: '🌀', difficulte: 7, apres: 'legion',
    resume: 'Tous les maux que vous avez combattus venaient d\'ici. Au fond de l\'Abîme dort Morthaxx, un dragon mort-vivant.',
    regles: { potions: 3, peurMult: 1.3 },
    regleTexte: 'Le défi ultime. La Peur monte 30 % plus vite.',
    fin: 'Morthaxx retombe en poussière. L\'Abîme se referme, et avec lui toutes les ténèbres du royaume.',
    etages: [
      {
        nom: 'Les Marches de l\'Abîme', theme: 'abime', force: { pv: 1.0, toucher: 0, degats: 1, dd: 0 },
        intro: 'Un escalier sans fin s\'enfonce dans une brume verdâtre.',
        rencontres: {
          facile: [
            { avant: ['zombie', 'squelette'], arriere: ['cultiste'] },
            { avant: ['gnoll', 'kobold'], arriere: ['cultiste'] },
            { avant: ['araignee'], arriere: ['kobold', 'kobold'] }
          ],
          moyen: [
            { avant: ['zombie', 'zombie'], arriere: ['cultiste'] },
            { avant: ['hobgobelin', 'gnoll'], arriere: ['cultiste'] },
            { avant: ['araignee', 'squelette'], arriere: ['spectre', 'kobold'] }
          ],
          elite: [
            { avant: ['dragonnet'], arriere: ['cultiste', 'kobold'] },
            { avant: ['ogre', 'zombie'], arriere: ['spectre'] }
          ],
          boss: [{ avant: ['ogre', 'zombie'], arriere: ['cultiste', 'spectre'] }]
        }
      },
      {
        nom: 'Le Labyrinthe des Âmes', theme: 'abime', force: { pv: 1.0, toucher: 0, degats: 1, dd: 0 },
        intro: 'Les murs gémissent. Chaque couloir ramène au même carrefour.',
        rencontres: {
          facile: [
            { avant: ['zombie', 'squelette'], arriere: ['spectre', 'cultiste'] },
            { avant: ['gnoll', 'gnoll'], arriere: ['cultiste', 'kobold'] }
          ],
          moyen: [
            { avant: ['ogre'], arriere: ['spectre', 'cultiste'] },
            { avant: ['araignee', 'araignee'], arriere: ['spectre'] },
            { avant: ['hobgobelin', 'gnoll'], arriere: ['mage_squelette', 'cultiste'] }
          ],
          elite: [
            { avant: ['dragonnet'], arriere: ['spectre', 'cultiste'] },
            { avant: ['grukk'], arriere: ['pretre_eclipse'] }
          ],
          boss: [{ avant: ['chevalier_squelette', 'zombie'], arriere: ['spectre'] }]
        }
      },
      {
        nom: 'Le Cœur de l\'Abîme', theme: 'abime', force: { pv: 1.0, toucher: 0, degats: 0, dd: 0 },
        intro: 'Un ossuaire titanesque. Au centre, un squelette de dragon se redresse lentement.',
        rencontres: {
          facile: [
            { avant: ['zombie', 'squelette'], arriere: ['spectre', 'cultiste'] },
            { avant: ['dragonnet', 'kobold'], arriere: ['cultiste'] }
          ],
          moyen: [
            { avant: ['ogre', 'squelette'], arriere: ['spectre', 'pretre_eclipse'] },
            { avant: ['dragonnet', 'gnoll'], arriere: ['spectre'] }
          ],
          elite: [
            { avant: ['dragonnet', 'dragonnet'], arriere: ['spectre'] },
            { avant: ['chevalier_squelette'], arriere: ['pretre_eclipse', 'spectre'] }
          ],
          boss: [{ avant: ['squelette', 'squelette'], arriere: ['dracoliche'] }]
        }
      }
    ]
  },
  {
    id: 'chaos', nom: 'Le Dédale du Chaos', icone: '🎲', difficulte: 8, aleatoire: true, apresTout: true,
    resume: 'Toutes les campagnes se mélangent : une seule carte deux fois plus longue, des monstres de partout et deux boss tirés au hasard. Les héros partent au niveau 4.',
    regles: { potions: 5, peurMult: 1.2, or: 120 },
    regleTexte: 'Carte double, monstres mutants, 2 boss aléatoires dotés de pouvoirs du chaos. Départ au niveau 4 avec 5 potions et 120 or.',
    fin: 'Le Dédale se referme derrière vous. Plus aucun cauchemar ne vous résiste.',
    etages: []
  }
];

// Mode Chaos : deux étages tirés de toutes les campagnes. Le premier mélange
// les étages du milieu (héros niveau 4), le second les étages finaux (niveau 5).
// Chaque rencontre garde la puissance (`force`) et le décor de son étage d'origine.
const PV_CHAOS = 0.87;
function genererEtagesAleatoires() {
  const sources = CAMPAGNES.filter(c => !c.aleatoire && c.etages.length >= 3);
  // PV des monstres un peu réduits : les mutations et pouvoirs du chaos compensent (réglé au simulateur)
  const marquer = (e, r) => ({ ...r, force: { ...e.force, pv: e.force.pv * PV_CHAOS }, theme: e.theme });
  const etage = (idx, nom) => {
    const etages = sources.map(c => c.etages[idx]);
    const pool = k => etages.flatMap(e => (e.rencontres[k] || []).map(r => marquer(e, r)));
    const camp = Des.hasard(sources), e = camp.etages[idx];
    return {
      nom, theme: e.theme, force: e.force, bossDe: camp.id,
      intro: `Au bout de ce dédale vous attend le maître de <b>${e.nom}</b> (${camp.icone} ${camp.nom}).`,
      rencontres: { facile: pool('facile'), moyen: pool('moyen'), elite: pool('elite'), boss: e.rencontres.boss.map(r => marquer(e, r)) }
    };
  };
  return [etage(1, 'Le Dédale : première moitié'), etage(2, 'Le Dédale : cœur du chaos')];
}

// ---------------------------------------------------------------------
// Progression entre les parties (mémorisée dans le navigateur)
// ---------------------------------------------------------------------
const Progression = {
  cle: 'donjon-progression',
  donnees: { terminees: {}, records: {}, test: false },
  charger() {
    try { Object.assign(this.donnees, JSON.parse(localStorage.getItem(this.cle) || '{}')); } catch (e) { /* rien */ }
  },
  sauver() {
    try { localStorage.setItem(this.cle, JSON.stringify(this.donnees)); } catch (e) { /* rien */ }
  },
  campagne(id) { return CAMPAGNES.find(c => c.id === id) || CAMPAGNES[0]; },
  debloquee(c) {
    if (c.debloquee || this.toutDebloque()) return true;
    if (c.apresTout) return CAMPAGNES.every(x => x.aleatoire || this.donnees.terminees[x.id]);
    return !!this.donnees.terminees[c.apres];
  },
  // Mode test : toutes les campagnes et sous-classes sont accessibles
  toutDebloque() { return !!this.donnees.test; },
  basculerTest(actif) { this.donnees.test = actif; this.sauver(); },
  victoires(c) { return this.donnees.terminees[c.id] || 0; },
  record(c) { return this.donnees.records[c.id] || 0; },
  // Note l'étage atteint ; renvoie la campagne nouvellement débloquée s'il y en a une
  noterRecord(id, etage) {
    this.donnees.records[id] = Math.max(this.donnees.records[id] || 0, etage);
    this.sauver();
  },
  noterVictoire(id) {
    const avant = CAMPAGNES.filter(c => this.debloquee(c)).map(c => c.id);
    this.donnees.terminees[id] = (this.donnees.terminees[id] || 0) + 1;
    this.sauver();
    return CAMPAGNES.find(c => this.debloquee(c) && !avant.includes(c.id)) || null;
  }
};
Progression.charger();
// Adresse « …/donjon/?test » : active le mode test ; « ?test=0 » le désactive
try {
  const q = new URLSearchParams(location.search);
  if (q.has('test')) Progression.basculerTest(q.get('test') !== '0');
} catch (e) { /* hors navigateur */ }
