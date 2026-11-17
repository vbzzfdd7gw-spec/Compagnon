// =====================================================================
// Campagnes : chacune est une expédition de plusieurs étages (même format
// que ETAGES dans etages.js). Terminer une campagne débloque la suivante.
//   debloquee  : ouverte dès le départ
//   apres      : identifiant de la campagne à terminer pour la débloquer
//   regles     : { potions: potions de départ, peurMult: multiplicateur de Peur }
//   fin        : texte de victoire
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
    regles: { potions: 2, peurMult: 1.5 },
    regleTexte: 'La Peur monte 50 % plus vite.',
    fin: 'Velkor s\'effondre et l\'éclipse se dissipe. La lumière revient sur le royaume.',
    etages: [
      {
        nom: 'Les Catacombes', theme: 'crypte', force: { pv: 1.1, toucher: 0, degats: 1, dd: 0 },
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
            { avant: ['zombie', 'zombie'], arriere: ['pretre_eclipse'] },
            { avant: ['ogre'], arriere: ['pretre_eclipse', 'cultiste'] }
          ],
          boss: [{ avant: ['squelette', 'squelette'], arriere: ['pretre_eclipse', 'pretre_eclipse'] }]
        }
      },
      {
        nom: 'Le Cloître noir', theme: 'sanctuaire', force: { pv: 1.05, toucher: 0, degats: 1, dd: 0 },
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
        nom: 'Le Temple de l\'Éclipse', theme: 'sanctuaire', force: { pv: 1.25, toucher: 1, degats: 1, dd: 1 },
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
  }
];

// ---------------------------------------------------------------------
// Progression entre les parties (mémorisée dans le navigateur)
// ---------------------------------------------------------------------
const Progression = {
  cle: 'donjon-progression',
  donnees: { terminees: {}, records: {} },
  charger() {
    try { Object.assign(this.donnees, JSON.parse(localStorage.getItem(this.cle) || '{}')); } catch (e) { /* rien */ }
  },
  sauver() {
    try { localStorage.setItem(this.cle, JSON.stringify(this.donnees)); } catch (e) { /* rien */ }
  },
  campagne(id) { return CAMPAGNES.find(c => c.id === id) || CAMPAGNES[0]; },
  debloquee(c) { return c.debloquee || !!this.donnees.terminees[c.apres]; },
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
