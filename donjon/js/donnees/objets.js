// =====================================================================
// Récompenses : objets magiques et améliorations.
//   classes   : classes pouvant le recevoir (null = toutes)
//   condition : fonction(pj) facultative pour restreindre
//   appliquer : fonction(pj) qui modifie le personnage
// =====================================================================

const OBJETS = {
  epee_plus1: {
    nom: 'Épée longue +1', icone: '⚔️', classes: ['guerrier'],
    desc: '+1 au toucher et aux dégâts avec les armes.',
    appliquer(pj) { pj.bonusArme += 1; pj.bonusDegats += 1; }
  },
  bouclier_plus1: {
    nom: 'Bouclier +1', icone: '🛡️', classes: ['guerrier', 'clerc'],
    desc: '+1 CA.',
    appliquer(pj) { pj.ca += 1; }
  },
  cape_protection: {
    nom: 'Cape de protection', icone: '🧥', classes: null,
    desc: '+1 CA et +1 aux jets de sauvegarde.',
    appliquer(pj) { pj.ca += 1; pj.bonusSauv += 1; }
  },
  amulette_vigueur: {
    nom: 'Amulette de vigueur', icone: '📿', classes: null,
    desc: '+6 PV maximum.',
    appliquer(pj) { pj.pvMax += 6; pj.pv += 6; }
  },
  baguette_mage: {
    nom: 'Baguette du mage de guerre +1', icone: '🪄', classes: ['magicien'],
    desc: '+1 aux attaques de sort et au DD des sorts.',
    appliquer(pj) { pj.bonusSort += 1; pj.ddSort += 1; }
  },
  symbole_sacre: {
    nom: 'Symbole sacré béni', icone: '📯', classes: ['clerc'],
    desc: '+1 au DD des sorts et +2 PV à chaque soin.',
    appliquer(pj) { pj.ddSort += 1; pj.bonusSoin += 2; }
  },
  bottes_elfiques: {
    nom: 'Bottes elfiques', icone: '👢', classes: ['roublard'],
    desc: 'Commence chaque combat caché (avantage à la première attaque).',
    appliquer(pj) { pj.traits.cacheDebut = true; }
  },
  pierre_chance: {
    nom: 'Pierre porte-bonheur', icone: '🍀', classes: null,
    desc: '+1 aux jets de sauvegarde et aux tests de caractéristique.',
    appliquer(pj) { pj.bonusSauv += 1; pj.traits.bonusTest = (pj.traits.bonusTest || 0) + 1; }
  },
  talisman_bravoure: {
    nom: 'Talisman de bravoure', icone: '🦁', classes: null,
    desc: 'La Peur gagnée est réduite de moitié.',
    appliquer(pj) { pj.traits.peurReduite = true; }
  },
  perle_pouvoir: {
    nom: 'Perle de pouvoir', icone: '🔵', classes: ['clerc', 'magicien'],
    desc: '+1 emplacement de sort de niveau 1.',
    appliquer(pj) { pj.emplacements[1].max += 1; pj.emplacements[1].restant += 1; }
  },
  gantelets_ogre: {
    nom: 'Gantelets de puissance', icone: '🧤', classes: ['guerrier', 'clerc'],
    desc: '+2 aux dégâts avec les armes.',
    appliquer(pj) { pj.bonusDegats += 2; }
  },
  dague_venin: {
    nom: 'Dague venimeuse', icone: '🐍', classes: ['roublard'],
    desc: '+1 au toucher et +2 aux dégâts avec les armes.',
    appliquer(pj) { pj.bonusArme += 1; pj.bonusDegats += 2; }
  },
  anneau_vitalite: {
    nom: 'Anneau de vitalité', icone: '💍', classes: null,
    desc: 'Récupère 2 PV au début de chacun de ses tours (s\'il est debout).',
    appliquer(pj) { pj.traits.regen = (pj.traits.regen || 0) + 2; }
  }
};

const AMELIORATIONS = {
  entrainement: {
    nom: 'Entraînement martial', icone: '🎯',
    desc: '+1 au toucher avec les armes.',
    condition: pj => pj.classe !== 'magicien',
    appliquer(pj) { pj.bonusArme += 1; }
  },
  endurance: {
    nom: 'Endurance', icone: '❤️',
    desc: '+5 PV maximum (et soigne 5 PV).',
    appliquer(pj) { pj.pvMax += 5; pj.pv += 5; }
  },
  armure: {
    nom: 'Armure renforcée', icone: '🪖',
    desc: '+1 CA.',
    appliquer(pj) { pj.ca += 1; }
  },
  volonte: {
    nom: 'Volonté de fer', icone: '🧠',
    desc: '+1 aux jets de sauvegarde et −20 Peur.',
    appliquer(pj) { pj.bonusSauv += 1; pj.peur = Math.max(0, pj.peur - 20); }
  },
  concentration: {
    nom: 'Étude des arcanes', icone: '📖',
    desc: '+1 emplacement de sort de niveau 1.',
    condition: pj => !!pj.emplacements[1],
    appliquer(pj) { pj.emplacements[1].max += 1; pj.emplacements[1].restant += 1; }
  },
  puissance: {
    nom: 'Puissance magique', icone: '🌟',
    desc: '+1 emplacement de sort de niveau 2.',
    condition: pj => !!pj.emplacements[2],
    appliquer(pj) { pj.emplacements[2].max += 1; pj.emplacements[2].restant += 1; }
  },
  precision: {
    nom: 'Précision des sorts', icone: '🎇',
    desc: '+1 aux attaques de sort et au DD des sorts.',
    condition: pj => pj.ddSort > 0,
    appliquer(pj) { pj.bonusSort += 1; pj.ddSort += 1; }
  },
  robustesse: {
    nom: 'Robustesse', icone: '🎲',
    desc: '+1 dé de vie (max et restant).',
    appliquer(pj) { pj.desVie.max += 1; pj.desVie.restant += 1; }
  }
};

// ---------------------------------------------------------------------
// Génération des offres de récompense.
// Chaque offre : { categorie, pj, cle, titre, icone, desc }
// ---------------------------------------------------------------------
const Recompenses = {
  offreObjet(equipe, exclure = []) {
    const possibles = [];
    for (const [cle, o] of Object.entries(OBJETS)) {
      if (exclure.includes(cle)) continue;
      const cibles = equipe.filter(pj => (!o.classes || o.classes.includes(pj.classe)) && !pj.objets.includes(cle));
      if (cibles.length) possibles.push({ cle, o, cibles });
    }
    if (!possibles.length) return null;
    const { cle, o, cibles } = Des.hasard(possibles);
    const pj = Des.hasard(cibles);
    return { categorie: 'objet', pj: pj.id, cle, titre: o.nom, icone: o.icone, desc: o.desc };
  },

  offreAction(equipe) {
    const possibles = [];
    for (const pj of equipe) {
      for (const cle of CLASSES[pj.classe].poolActions) {
        if (!pj.actions.includes(cle) && (pj.niveau || 3) >= (ACTIONS[cle].niveauMin || 0)) possibles.push({ pj, cle });
      }
    }
    if (!possibles.length) return null;
    const { pj, cle } = Des.hasard(possibles);
    const a = ACTIONS[cle];
    return { categorie: 'action', pj: pj.id, cle, titre: a.nom, icone: a.icone, desc: a.desc };
  },

  offreAmelioration(equipe) {
    const possibles = [];
    for (const [cle, am] of Object.entries(AMELIORATIONS)) {
      for (const pj of equipe) if (!am.condition || am.condition(pj)) possibles.push({ cle, am, pj });
    }
    const { cle, am, pj } = Des.hasard(possibles);
    return { categorie: 'amelioration', pj: pj.id, cle, titre: am.nom, icone: am.icone, desc: am.desc };
  },

  // elite = deux objets magiques + une action
  generer(equipe, { elite = false, objetsSeulement = false } = {}) {
    const offres = [];
    const nbObjets = objetsSeulement ? 3 : (elite ? 2 : 1);
    for (let i = 0; i < nbObjets; i++) {
      const o = this.offreObjet(equipe, offres.map(x => x.cle));
      if (o) offres.push(o);
    }
    if (!objetsSeulement) {
      const a = this.offreAction(equipe);
      if (a) offres.push(a);
    }
    while (offres.length < 3) {
      const am = this.offreAmelioration(equipe);
      if (!offres.some(x => x.cle === am.cle && x.pj === am.pj)) offres.push(am);
    }
    return Des.melanger(offres.slice(0, 3));
  },

  appliquer(offre, pj) {
    if (offre.categorie === 'objet') {
      OBJETS[offre.cle].appliquer(pj);
      pj.objets.push(offre.cle);
    } else if (offre.categorie === 'amelioration') {
      AMELIORATIONS[offre.cle].appliquer(pj);
      pj.ameliorations = pj.ameliorations || [];
      pj.ameliorations.push(offre.cle);
    }
    // Les actions sont gérées par jeu.js (choix éventuel d'une action à oublier)
  }
};
