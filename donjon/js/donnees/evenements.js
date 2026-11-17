// =====================================================================
// Événements (cases ❓ de la carte).
// Chaque choix a `texte`, une `condition(jeu)` facultative et une
// fonction `resoudre(jeu)` qui renvoie { lignes: [...], recompense? }.
//   recompense : 'normal' | 'objets' → affiche l'écran de récompense ensuite
// Utilitaires de jeu disponibles : jeu.pj(classe), jeu.debout(),
//   jeu.meilleur(carac) (héros debout le plus doué), jeu.lanceur() (héros
//   debout avec un emplacement de niveau 1), jeu.test(pj, carac, dd),
//   jeu.soigner(pj, n), jeu.blesser(pj, n),
//   jeu.peur(pj, n), jeu.potions
// =====================================================================

const EVENEMENTS = [
  {
    id: 'autel',
    titre: 'L\'autel oublié',
    texte: 'Un autel couvert de cire noire luit faiblement. Une présence semble attendre une prière.',
    choix: [
      {
        texte: 'Le héros le plus sage prie (SAG DD 12)',
        condition: j => !!j.meilleur('SAG'),
        resoudre(j) {
          const c = j.meilleur('SAG');
          const t = j.test(c, 'SAG', 12, true);
          if (t.reussite) {
            j.debout().forEach(p => j.peur(p, -25));
            return { lignes: [t.texte, 'Une chaleur douce envahit la salle : toute l\'équipe perd 25 Peur.'] };
          }
          j.debout().forEach(p => j.peur(p, 15));
          return { lignes: [t.texte, 'Un murmure glacial répond… Toute l\'équipe gagne 15 Peur.'] };
        }
      },
      {
        texte: 'Profaner l\'autel et prendre les offrandes',
        resoudre(j) {
          j.debout().forEach(p => j.peur(p, 10));
          return { lignes: ['Vous raflez les offrandes sous des rires lointains. Toute l\'équipe gagne 10 Peur.'], recompense: 'objets' };
        }
      },
      { texte: 'Passer votre chemin', resoudre: () => ({ lignes: ['Vous laissez l\'autel derrière vous.'] }) }
    ]
  },
  {
    id: 'coffre',
    titre: 'Le coffre piégé',
    texte: 'Un coffre bardé de fer. Des aiguilles dépassent de la serrure.',
    choix: [
      {
        texte: 'Le héros le plus adroit crochète (DEX DD 13)',
        condition: j => !!j.meilleur('DEX'),
        resoudre(j) {
          const r = j.meilleur('DEX');
          const t = j.test(r, 'DEX', 13, true);
          if (t.reussite) return { lignes: [t.texte, 'Clic ! Le coffre s\'ouvre sans un bruit.'], recompense: 'objets' };
          const d = Des.lancer('2d6');
          j.blesser(r, d.total);
          return { lignes: [t.texte, `Une aiguille empoisonnée ! ${r.nom} subit ${d.texte} dégâts.`] };
        }
      },
      {
        texte: 'Le héros le plus fort force le coffre (FOR DD 15)',
        condition: j => !!j.meilleur('FOR'),
        resoudre(j) {
          const g = j.meilleur('FOR');
          const t = j.test(g, 'FOR', 15, false);
          if (t.reussite) return { lignes: [t.texte, 'Le couvercle cède !'], recompense: 'normal' };
          const d = Des.lancer('1d10');
          j.blesser(g, d.total);
          return { lignes: [t.texte, `Le piège se déclenche : ${d.texte} dégâts à ${g.nom}.`] };
        }
      },
      { texte: 'Ne pas y toucher', resoudre: () => ({ lignes: ['Prudence est mère de sûreté.'] }) }
    ]
  },
  {
    id: 'blesse',
    titre: 'Le voyageur blessé',
    texte: 'Un aventurier agonise contre un mur. « Aidez-moi… je vous récompenserai. »',
    choix: [
      {
        texte: 'Un lanceur de sorts dépense un emplacement de niveau 1 pour le soigner',
        condition: j => !!j.lanceur(),
        resoudre(j) {
          j.lanceur().emplacements[1].restant--;
          j.debout().forEach(p => j.peur(p, -10));
          return { lignes: ['Le voyageur se relève et vous offre son équipement. Toute l\'équipe perd 10 Peur.'], recompense: 'normal' };
        }
      },
      {
        texte: 'Lui donner une potion de soins',
        condition: j => j.potions > 0,
        resoudre(j) {
          j.potions--;
          return { lignes: ['Il boit la potion et vous tend un objet en remerciement.'], recompense: 'objets' };
        }
      },
      {
        texte: 'L\'abandonner',
        resoudre(j) {
          j.debout().forEach(p => j.peur(p, 10));
          return { lignes: ['Ses gémissements vous suivent longtemps… Toute l\'équipe gagne 10 Peur.'] };
        }
      }
    ]
  },
  {
    id: 'fontaine',
    titre: 'La fontaine trouble',
    texte: 'Une eau scintillante coule d\'une gueule de pierre. Elle sent le fer et la menthe.',
    choix: [
      {
        texte: 'Toute l\'équipe boit (d20)',
        resoudre(j) {
          const r = Des.d20();
          const lignes = [`🎲 ${r.texte}`];
          if (r.nat <= 7) {
            for (const p of j.debout()) {
              const d = Des.lancer('1d6');
              j.blesser(p, d.total);
              lignes.push(`${p.nom} est empoisonné : ${d.texte} dégâts.`);
            }
          } else if (r.nat <= 14) {
            for (const p of j.equipe) {
              const d = Des.lancer('2d8');
              j.soigner(p, d.total);
              lignes.push(`${p.nom} récupère ${d.texte} PV.`);
            }
          } else {
            for (const p of j.equipe) { p.pvMax += 3; j.soigner(p, 3); }
            lignes.push('Une vigueur nouvelle : +3 PV maximum pour toute l\'équipe !');
          }
          return { lignes };
        }
      },
      {
        texte: 'Remplir une fiole (+1 potion)',
        resoudre(j) { j.potions++; return { lignes: ['Vous obtenez une potion de soins.'] }; }
      }
    ]
  },
  {
    id: 'bibliotheque',
    titre: 'La bibliothèque engloutie',
    texte: 'Des grimoires moisis s\'empilent dans une alcôve inondée.',
    choix: [
      {
        texte: 'Le héros le plus érudit étudie (INT DD 13)',
        condition: j => !!j.meilleur('INT'),
        resoudre(j) {
          const m = j.meilleur('INT');
          const t = j.test(m, 'INT', 13, true);
          if (t.reussite) {
            for (const niv in m.emplacements) m.emplacements[niv].restant = m.emplacements[niv].max;
            if (!Object.keys(m.emplacements).length) j.soigner(m, 20);
            return { lignes: [t.texte, `${m.nom} récupère tous ses emplacements de sorts${Object.keys(m.emplacements).length ? '' : ' (il n\'en a pas… mais gagne 20 PV)'}.`] };
          }
          j.peur(m, 20);
          return { lignes: [t.texte, 'Des glyphes interdits brûlent ses yeux : +20 Peur.'] };
        }
      },
      { texte: 'Repartir', resoudre: () => ({ lignes: ['Les livres retournent à leur silence.'] }) }
    ]
  }
];
