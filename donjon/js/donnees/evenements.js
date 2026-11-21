// =====================================================================
// Événements (cases ❓ de la carte).
// Un événement : { id, icone, titre, texte, choix, disponible?(jeu) }.
// Chaque choix a `texte` (chaîne ou fonction(jeu)), une `condition(jeu)`
// facultative, `risque` (bordure rouge) et une fonction `resoudre(jeu)` qui
// renvoie { lignes: [...], choix?, combat?, recompense? } :
//   choix      : suite de l'événement (nouveaux choix)
//   combat     : rencontre à combattre ensuite (élite par défaut)
//   recompense : 'normal' | 'objets' → affiche l'écran de récompense ensuite
// Un même événement ne revient pas deux fois dans une expédition.
// Utilitaires de jeu disponibles : jeu.pj(classe), jeu.debout(),
//   jeu.meilleur(carac) (héros debout le plus doué), jeu.lanceur() (héros
//   debout avec un emplacement de niveau 1), jeu.test(pj, carac, dd),
//   jeu.soigner(pj, n), jeu.blesser(pj, n),
//   jeu.peur(pj, n), jeu.potions, jeu.or, jeu.heros() (héros debout au hasard)
// Objets : jeu.donnerObjet(rareté(s), pj?), jeu.retirerObjetAleatoire(filtre),
//   jeu.ameliorerObjet(), jeu.transformerObjet(pj?), jeu.objetsPortes(filtre),
//   jeu.nomObjet(cle) ; autres : jeu.gagnerOrFixe(n), jeu.pvMax(pj, n),
//   jeu.blesserPct(p), jeu.ajouterStock(cle, n), jeu.rencontreElite()
// =====================================================================

// ---------------------------------------------------------------------
// Événements en plusieurs étapes : les suites sont construites par ces
// fonctions (l'état de l'événement en cours est dans jeu.etat()).
// ---------------------------------------------------------------------
function misePuits(j) { return j.etat().mise || 25; }
function puitsChoix() {
  return [
    {
      texte: j => `Jeter ${misePuits(j)} or dans le puits`,
      condition: j => j.or >= misePuits(j),
      resoudre(j) {
        const mise = misePuits(j);
        j.gagnerOrFixe(-mise);
        j.etat().mise = mise + 15;
        const r = Des.d20(), lignes = [`🎲 ${r.texte}`];
        if (r.nat <= 8) lignes.push('Plouf. Rien ne se passe.');
        else if (r.nat <= 14) { j.ajouterStock('potion_sup', 1); lignes.push('Une bulle remonte : 🍷 une potion de soins supérieure !'); }
        else if (r.nat <= 19) lignes.push('L\'eau scintille !', j.donnerObjet('rare'));
        else lignes.push('Le puits s\'illumine d\'or !', j.donnerObjet('legendaire'));
        return { lignes, choix: puitsChoix() };
      }
    },
    { texte: 'Partir', resoudre: () => ({ lignes: ['Vous laissez le puits à ses murmures.'] }) }
  ];
}

const COUT_PAGES = [0, 3, 6, 10];
function lirePage(j, n) {
  const e = j.etat();
  if (!e.lecteur) e.lecteur = j.meilleur('INT') || j.heros();
  const h = e.lecteur, cout = COUT_PAGES[n];
  j.blesser(h, cout);
  const textes = ['', 'Les mots rampent sur la page… impossible de détourner les yeux.', 'Le livre boit votre sang. Il en réclame encore.', 'La dernière page s\'ouvre sur un trésor caché entre les feuillets !'];
  const lignes = [`📕 ${h.nom} lit la page ${n} : −${cout} PV. ${textes[n]}`];
  if (h.pv <= 0) return { lignes: [...lignes, `${h.nom} s'effondre, vidé de ses forces.`] };
  if (n === 3) return { lignes: [...lignes, j.donnerObjet('legendaire', h)] };
  return {
    lignes,
    choix: [
      { texte: `Lire la page ${n + 1} (−${COUT_PAGES[n + 1]} PV)`, risque: true, resoudre: jj => lirePage(jj, n + 1) },
      {
        texte: n === 2 ? 'Refermer le livre (en gardant le marque-page : objet commun)' : 'Refermer le livre',
        resoudre: jj => ({ lignes: n === 2 ? ['Vous arrachez le marque-page d\'argent.', jj.donnerObjet('commun', h)] : ['Le livre se referme en soupirant.'] })
      }
    ]
  };
}

function cadavreChoix() {
  return [
    {
      texte: j => `Fouiller le sac (risque d'embuscade : ${j.etat().risque || 25} %)`, risque: true,
      resoudre(j) {
        const e = j.etat(), risque = e.risque || 25;
        if (!e.butin) e.butin = Des.melanger(['or', 'objet', 'rien', 'potion']);
        if (alea() * 100 < risque) return { lignes: ['Un grognement derrière vous… le meurtrier est revenu !'], combat: j.rencontreElite() };
        e.risque = risque + 25;
        const b = e.butin.pop(), lignes = [];
        if (b === 'or') lignes.push('Une bourse bien remplie !', j.gagnerOrFixe(45));
        else if (b === 'objet') lignes.push(j.donnerObjet(Des.hasard(['rare', 'rare', 'commun', 'maudit'])));
        else if (b === 'potion') { j.ajouterStock('potion', 2); lignes.push('🧴 Deux potions de soins.'); }
        else lignes.push('Rien d\'intéressant dans cette poche.');
        if (!e.butin.length) return { lignes: [...lignes, 'Le sac est vide.'] };
        return { lignes, choix: cadavreChoix() };
      }
    },
    { texte: 'Partir sans traîner', resoudre: () => ({ lignes: ['Vous vous éloignez prudemment.'] }) }
  ];
}

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
  },
  // ===================================================================
  // Événements à risque et à objets (choix en plusieurs étapes possibles :
  // `resoudre` peut renvoyer `choix` pour proposer une suite, ou `combat`
  // pour déclencher un affrontement).
  // ===================================================================
  {
    id: 'idole', icone: '🗿',
    titre: 'L\'idole d\'or',
    texte: 'Sur un socle de pierre trône une idole d\'or aux yeux de rubis. Les dalles autour sont étrangement propres…',
    choix: [
      {
        texte: 'S\'emparer de l\'idole', risque: true,
        resoudre(j) {
          const ligne = j.donnerObjet(alea() < 0.5 ? 'legendaire' : 'rare');
          return {
            lignes: [ligne, '<b>CLAC !</b> Le plafond commence à s\'effondrer et un grondement monte du couloir !'],
            choix: [
              {
                texte: '🏃 Fuir à toutes jambes (toute l\'équipe perd 20 % de ses PV)',
                resoudre(j) { j.blesserPct(0.2); return { lignes: ['Vous plongez hors de la salle sous une pluie de pierres.'] }; }
              },
              {
                texte: '🤸 Le plus adroit désamorce le mécanisme (DEX DD 15)',
                condition: j => !!j.meilleur('DEX'),
                resoudre(j) {
                  const h = j.meilleur('DEX'), t = j.test(h, 'DEX', 15, true);
                  if (t.reussite) return { lignes: [t.texte, 'Le mécanisme se bloque dans un grincement. Personne n\'est blessé.'] };
                  const d = Des.lancer('4d6'); j.blesser(h, d.total);
                  return { lignes: [t.texte, `Raté ! ${h.nom} est écrasé : ${d.texte} dégâts.`] };
                }
              },
              {
                texte: '⚔️ Affronter le gardien qui arrive',
                resoudre(j) { return { lignes: ['Une silhouette massive surgit de l\'ombre…'], combat: j.rencontreElite() }; }
              }
            ]
          };
        }
      },
      { texte: 'Laisser l\'idole tranquille', resoudre: () => ({ lignes: ['Certains trésors ne valent pas le risque.'] }) }
    ]
  },
  {
    id: 'puits', icone: '🪙',
    titre: 'Le puits aux souhaits',
    texte: 'Un vieux puits couvert de mousse. Au fond, des centaines de pièces scintillent. Une inscription : « Donne, et il te sera rendu. »',
    choix: puitsChoix()
  },
  {
    id: 'grimoire', icone: '📕',
    titre: 'Le grimoire qui murmure',
    texte: 'Un livre relié de peau est posé sur un lutrin. Il s\'ouvre tout seul quand vous approchez, et une voix vous invite à lire…',
    choix: [
      { texte: 'Lire la première page (−3 PV au lecteur)', risque: true, resoudre: j => lirePage(j, 1) },
      { texte: 'Brûler le livre', resoudre(j) { j.debout().forEach(p => j.peur(p, -10)); return { lignes: ['Le livre hurle en se consumant. Étrangement, vous vous sentez plus léger (−10 Peur).'] }; } }
    ]
  },
  {
    id: 'forgeron', icone: '⚒️',
    titre: 'Le forgeron spectral',
    texte: 'Une enclume résonne dans le noir. Un nain fantomatique martèle une lame qui n\'existe pas. « Apportez-moi du métal, voyageurs. »',
    choix: [
      {
        texte: '✨ Améliorer un objet au hasard (30 or) : il devient plus rare',
        condition: j => j.or >= 30 && j.objetsPortes(o => o.rarete !== 'legendaire').length > 0,
        resoudre(j) { j.gagnerOrFixe(-30); return { lignes: ['Le marteau s\'abat dans une gerbe d\'étincelles bleues…', ...j.ameliorerObjet()] }; }
      },
      {
        texte: '🩸 Forger une arme maudite (un objet maudit et 40 or)', risque: true,
        resoudre(j) { return { lignes: [j.donnerObjet('maudit'), j.gagnerOrFixe(40), '« Elle a soif… prenez-en soin. »'] }; }
      },
      { texte: 'Partir', resoudre: () => ({ lignes: ['Le fantôme reprend son ouvrage sans un regard.'] }) }
    ]
  },
  {
    id: 'pacte', icone: '😈',
    titre: 'Le cercle d\'invocation',
    texte: 'Dans un pentacle de sang séché, un diablotin ricane. « Un marché, mortels ? Puissance contre… un petit quelque chose. »',
    choix: [
      {
        texte: 'Accepter le pacte (un objet légendaire et un objet maudit)', risque: true,
        resoudre(j) {
          const h = j.heros();
          return { lignes: [j.donnerObjet('legendaire', h), j.donnerObjet('maudit', h), '« Marché conclu ! » Le diablotin disparaît dans une odeur de soufre.'] };
        }
      },
      {
        texte: 'Le héros le plus charismatique le bannit (CHA DD 14)',
        condition: j => !!j.meilleur('CHA'),
        resoudre(j) {
          const h = j.meilleur('CHA'), t = j.test(h, 'CHA', 14, true);
          if (t.reussite) return { lignes: [t.texte, 'Le diablotin est renvoyé dans les Abysses et abandonne son trésor.', j.donnerObjet('rare')] };
          j.debout().forEach(p => j.peur(p, 25));
          return { lignes: [t.texte, 'Il éclate de rire et vous maudit en s\'évanouissant : toute l\'équipe gagne 25 Peur.'] };
        }
      },
      { texte: 'Effacer le cercle et partir', resoudre: () => ({ lignes: ['Le ricanement s\'éteint lentement.'] }) }
    ]
  },
  {
    id: 'cadavre', icone: '💀',
    titre: 'L\'aventurier mort',
    texte: 'Un aventurier gît contre le mur, son sac encore plein. Des traces de griffes fraîches marquent le sol… son meurtrier rôde peut-être encore.',
    choix: cadavreChoix()
  },
  {
    id: 'roue', icone: '🎡',
    titre: 'La roue du destin',
    texte: 'Un gnome en habit de forain se tient près d\'une immense roue peinte. « Un tour gratuit ! La fortune sourit aux audacieux ! »',
    choix: [
      {
        texte: 'Faire tourner la roue',
        resoudre(j) {
          const r = Des.d(6);
          const lignes = [`🎲 La roue s'arrête sur la case ${r}…`];
          if (r === 1) lignes.push(j.gagnerOrFixe(80), 'Une pluie de pièces !');
          else if (r === 2) lignes.push('Un objet tombe de la roue !', j.donnerObjet('rare'));
          else if (r === 3) { j.equipe.forEach(p => { p.pv = p.pvMax; }); lignes.push('Une lumière dorée : toute l\'équipe récupère tous ses PV.'); }
          else if (r === 4) lignes.push('Un rire sinistre… La roue vous offre un « cadeau ».', j.donnerObjet('maudit'));
          else if (r === 5) { j.blesserPct(0.15); lignes.push('La roue explose ! Toute l\'équipe perd 15 % de ses PV.'); }
          else { j.ajouterStock('potion_sup', 2); lignes.push('🍷 Deux potions de soins supérieures !'); }
          return { lignes };
        }
      },
      { texte: 'Décliner poliment', resoudre: () => ({ lignes: ['« Dommage ! » Le gnome disparaît avec sa roue.'] }) }
    ]
  },
  {
    id: 'temple', icone: '🕍',
    titre: 'Le temple de lumière',
    texte: 'Un sanctuaire intact, baigné d\'une lumière douce. Une prêtresse aveugle vous accueille : « Les ténèbres pèsent sur vous. »',
    choix: [
      {
        texte: '🕊️ Purifier un objet maudit (il disparaît)',
        condition: j => j.objetsPortes(o => o.rarete === 'maudit').length > 0,
        resoudre(j) {
          const x = j.retirerObjetAleatoire(o => o.rarete === 'maudit');
          return { lignes: [`La malédiction se dissipe : ${x.pj.nom} se libère de ${j.nomObjet(x.cle)}.`] };
        }
      },
      {
        texte: '🙏 Faire un don de 40 or (toute l\'équipe récupère la moitié de ses PV)',
        condition: j => j.or >= 40,
        resoudre(j) { j.gagnerOrFixe(-40); j.equipe.forEach(p => j.soigner(p, Math.ceil(p.pvMax / 2))); return { lignes: ['Une chaleur bienfaisante vous enveloppe.'] }; }
      },
      { texte: '🧘 Méditer (toute l\'équipe perd 40 Peur)', resoudre(j) { j.equipe.forEach(p => j.peur(p, -40)); return { lignes: ['Le silence apaise vos esprits.'] }; } }
    ]
  },
  {
    id: 'champignons', icone: '🍄',
    titre: 'Le cercle de champignons',
    texte: 'Des champignons phosphorescents dessinent un cercle parfait. L\'air y est doux et sucré.',
    choix: [
      {
        texte: 'Un héros en mange un', risque: true,
        resoudre(j) {
          const h = j.heros(), r = Des.d(4);
          if (r === 1) { j.pvMax(h, 6); return { lignes: [`${h.nom} se sent revigoré : +6 PV maximum.`] }; }
          if (r === 2) { const d = Des.lancer('2d6'); j.blesser(h, d.total); return { lignes: [`${h.nom} est pris de convulsions : ${d.texte} dégâts.`] }; }
          if (r === 3) return { lignes: [`${h.nom} a une vision et trouve quelque chose sous la mousse !`, j.donnerObjet(['commun', 'rare'], h)] };
          j.peur(h, 30); return { lignes: [`${h.nom} voit des choses horribles… +30 Peur.`] };
        }
      },
      { texte: 'Cueillir quelques champignons (2 élixirs de courage)', resoudre(j) { j.ajouterStock('elixir_courage', 2); return { lignes: ['🧉 Vous en tirez deux élixirs de courage.'] }; } },
      { texte: 'Contourner le cercle', resoudre: () => ({ lignes: ['Mieux vaut ne pas déranger les fées.'] }) }
    ]
  },
  {
    id: 'bonneteau', icone: '🥤',
    titre: 'Le gnome tricheur',
    texte: 'Un gnome fait glisser trois gobelets sur un tonneau. « Trouvez la bille, doublez votre mise ! Facile, facile ! »',
    choix: [
      {
        texte: 'Miser 30 or',
        condition: j => j.or >= 30,
        resoudre(j) {
          if (alea() < 0.4) return { lignes: ['Gagné ! « Grmbl… » ', j.gagnerOrFixe(30)] };
          j.gagnerOrFixe(-30);
          return { lignes: ['Perdu ! Le gnome empoche vos 30 pièces avec un sourire.'] };
        }
      },
      {
        texte: 'Démasquer la triche (SAG DD 14)',
        condition: j => !!j.meilleur('SAG'),
        resoudre(j) {
          const h = j.meilleur('SAG'), t = j.test(h, 'SAG', 14, true);
          if (t.reussite) return { lignes: [t.texte, 'Pris la main dans le sac ! Le gnome s\'enfuit en abandonnant son butin.', j.gagnerOrFixe(40), j.donnerObjet('commun')] };
          const perte = Math.min(j.or, 20); j.gagnerOrFixe(-perte);
          return { lignes: [t.texte, `Pendant la dispute, il vous fait les poches : −${perte} or.`] };
        }
      },
      { texte: 'Passer votre chemin', resoudre: () => ({ lignes: ['« Radins ! »'] }) }
    ]
  },
  {
    id: 'miroir', icone: '🪞',
    titre: 'Le miroir des âmes',
    texte: 'Un grand miroir au cadre d\'argent. Votre reflet ne vous ressemble pas tout à fait… il porte d\'autres objets.',
    choix: [
      {
        texte: 'Échanger avec son reflet (un objet devient un autre de même rareté)',
        condition: j => j.objetsPortes().length > 0,
        resoudre(j) { return { lignes: ['Le reflet tend la main à travers la glace…', ...j.transformerObjet()] }; }
      },
      {
        texte: 'Briser le miroir (80 or, mais un objet maudit)', risque: true,
        resoudre(j) { return { lignes: ['Des éclats d\'argent jonchent le sol, et des pièces avec eux.', j.gagnerOrFixe(80), j.donnerObjet('maudit')] }; }
      },
      { texte: 'Détourner le regard', resoudre: () => ({ lignes: ['Votre reflet vous fixe longtemps après votre départ.'] }) }
    ]
  },
  {
    id: 'foyer', icone: '🔥',
    titre: 'Les esprits du foyer',
    texte: 'Des petites flammes dansent dans un âtre ancien. Elles réclament une offrande en crépitant joyeusement.',
    choix: [
      {
        texte: 'Offrir un objet au hasard',
        condition: j => j.objetsPortes().length > 0,
        resoudre(j) {
          const x = j.retirerObjetAleatoire();
          const r = OBJETS[x.cle].rarete, lignes = [`${x.pj.nom} jette ${j.nomObjet(x.cle)} dans les flammes…`];
          if (r === 'maudit') lignes.push('Les esprits dévorent la malédiction avec délice et vous récompensent !', j.donnerObjet('rare', x.pj));
          else if (r === 'legendaire') { j.equipe.forEach(p => { j.pvMax(p, 8); p.pv = p.pvMax; }); lignes.push('Un brasier d\'extase ! Toute l\'équipe : +8 PV maximum et soins complets.'); }
          else if (r === 'rare') { j.equipe.forEach(p => j.pvMax(p, 4)); lignes.push('Les flammes grandissent : toute l\'équipe gagne +4 PV maximum.'); }
          else { j.equipe.forEach(p => j.soigner(p, Math.ceil(p.pvMax / 2))); lignes.push('Une douce chaleur : toute l\'équipe récupère la moitié de ses PV.'); }
          return { lignes };
        }
      },
      { texte: 'Se réchauffer un instant (−15 Peur)', resoudre(j) { j.equipe.forEach(p => j.peur(p, -15)); return { lignes: ['Le crépitement apaise les cœurs.'] }; } }
    ]
  },
  {
    id: 'colporteur', icone: '🎒',
    titre: 'Le colporteur des ombres',
    texte: 'Un homme encapuchonné ouvre son manteau : des dizaines de babioles y pendent. « Tout a un prix… pas toujours en or. »',
    choix: [
      {
        texte: '📦 Boîte mystère (50 or) : un objet de n\'importe quelle rareté',
        condition: j => j.or >= 50,
        resoudre(j) {
          j.gagnerOrFixe(-50);
          const r = Des.pondere([{ r: 'commun', poids: 35 }, { r: 'rare', poids: 35 }, { r: 'legendaire', poids: 12 }, { r: 'maudit', poids: 18 }]).r;
          return { lignes: ['Vous ouvrez la boîte…', j.donnerObjet(r)] };
        }
      },
      {
        texte: '❤️ Payer de sa vie : un héros perd 6 PV maximum, objet légendaire', risque: true,
        resoudre(j) { const h = j.heros(); j.pvMax(h, -6); return { lignes: [`${h.nom} sent une part de lui s'en aller (−6 PV maximum).`, j.donnerObjet('legendaire', h)] }; }
      },
      {
        texte: '🪙 Revendre un objet maudit (45 or)',
        condition: j => j.objetsPortes(o => o.rarete === 'maudit').length > 0,
        resoudre(j) { const x = j.retirerObjetAleatoire(o => o.rarete === 'maudit'); return { lignes: [`Il rachète ${j.nomObjet(x.cle)} avec gourmandise.`, j.gagnerOrFixe(45)] }; }
      },
      { texte: 'Refuser', resoudre: () => ({ lignes: ['Il disparaît dans un pan d\'ombre.'] }) }
    ]
  },
  {
    id: 'duel', icone: '🤺',
    titre: 'Le chevalier déchu',
    texte: 'Un chevalier à l\'armure rouillée vous barre le passage. « Un duel d\'honneur ! Le vainqueur prend l\'arme du vaincu. »',
    choix: [
      {
        texte: 'Le héros le plus fort accepte (FOR DD 15)',
        condition: j => !!j.meilleur('FOR'),
        resoudre(j) {
          const h = j.meilleur('FOR'), t = j.test(h, 'FOR', 15, true);
          if (t.reussite) return { lignes: [t.texte, '« Bien combattu… » Il vous tend son arme en s\'inclinant.', j.donnerObjet(['rare', 'legendaire'], h)] };
          const d = Des.lancer('2d8'); j.blesser(h, d.total);
          return { lignes: [t.texte, `${h.nom} est terrassé : ${d.texte} dégâts. Le chevalier s'éloigne sans un mot.`] };
        }
      },
      {
        texte: 'Attaquer à quatre (combat, sans honneur : +15 Peur)', risque: true,
        resoudre(j) { j.debout().forEach(p => j.peur(p, 15)); return { lignes: ['« Lâches ! » Il appelle ses compagnons d\'armes.'], combat: j.rencontreElite() }; }
      },
      { texte: 'Refuser le duel', resoudre: () => ({ lignes: ['Il crache par terre et vous laisse passer.'] }) }
    ]
  },
  {
    id: 'armurerie', icone: '🛡️',
    titre: 'L\'armurerie abandonnée',
    texte: 'Des râteliers d\'armes rouillées couvrent les murs. Au fond, derrière une herse à moitié levée, quelque chose brille.',
    choix: [
      { texte: 'Prendre ce qui est à portée (un objet commun)', resoudre(j) { return { lignes: [j.donnerObjet('commun')] }; } },
      {
        texte: 'Se glisser sous la herse (DEX DD 13) : un objet rare',
        condition: j => !!j.meilleur('DEX'),
        resoudre(j) {
          const h = j.meilleur('DEX'), t = j.test(h, 'DEX', 13, true);
          if (t.reussite) return { lignes: [t.texte, j.donnerObjet('rare')] };
          const d = Des.lancer('2d6'); j.blesser(h, d.total);
          return { lignes: [t.texte, `La herse retombe ! ${h.nom} subit ${d.texte} dégâts, mais attrape quand même quelque chose.`, j.donnerObjet('commun')] };
        }
      }
    ]
  }
];

// ---------------------------------------------------------------------
// Événements propres à une campagne (`campagne` : n'apparaissent que là,
// et dans le Chaos). Ils sortent plus souvent que les événements communs.
// ---------------------------------------------------------------------
const meilleurSur = (j, carac) => j.meilleur(carac) || j.heros();
EVENEMENTS.push(
  {
    id: 'reliquaire', campagne: 'crypte', titre: 'Le reliquaire de Morvagne',
    texte: 'Une châsse d\'os gravés de runes. Une magie froide s\'en échappe encore.',
    choix: [
      { texte: 'Le briser à coups de masse', resoudre(j) { j.debout().forEach(p => j.peur(p, -15)); return { lignes: ['Les os éclatent dans un dernier gémissement. L\'air se réchauffe : −15 Peur pour toute l\'équipe.', j.donnerObjet('commun')] }; } },
      { texte: 'L\'étudier (INT DD 13)', resoudre(j) {
        const h = meilleurSur(j, 'INT'), t = j.test(h, 'INT', 13, true);
        if (t.reussite) return { lignes: [t.texte, 'Vous percez le secret de la châsse.', j.donnerObjet('rare', h)] };
        j.debout().forEach(p => j.peur(p, 20));
        return { lignes: [t.texte, 'Des visions de morts vous assaillent : +20 Peur pour toute l\'équipe.'] };
      } },
      { texte: 'Ne pas y toucher', resoudre: () => ({ lignes: ['Vous refermez la crypte derrière vous.'] }) }
    ]
  },
  {
    id: 'gobelin_enchaine', campagne: 'horde', titre: 'Le gobelin enchaîné',
    texte: '« Moi Snik ! Moi connaître cachette du chef ! Libérer Snik ! » piaille un gobelin enchaîné au mur.',
    choix: [
      { texte: 'Le libérer et le suivre', risque: true, resoudre(j) {
        if (alea() < 0.35) return { lignes: ['Snik détale en hurlant… droit vers ses copains. C\'était un piège !'], combat: { avant: ['gobelin', 'gobelin', 'loup'], arriere: ['gobelin'] } };
        return { lignes: ['Snik tient parole et vous mène à la réserve du chef.', j.gagnerOrFixe(60), j.donnerObjet('commun')] };
      } },
      { texte: 'L\'intimider pour qu\'il parle (CHA DD 12)', resoudre(j) {
        const h = meilleurSur(j, 'CHA'), t = j.test(h, 'CHA', 12, false);
        if (t.reussite) { j.ajouterStock('potion', 1); return { lignes: [t.texte, 'Snik crache le morceau : une cachette de potions et de pièces.', j.gagnerOrFixe(35), '🧴 +1 potion.'] }; }
        return { lignes: [t.texte, 'Snik vous mord le doigt et se tait.'] };
      } },
      { texte: 'Le laisser là', resoudre: () => ({ lignes: ['« Méchants ! » crie Snik dans votre dos.'] }) }
    ]
  },
  {
    id: 'rituel_eclipse', campagne: 'eclipse', titre: 'Le rituel interrompu',
    texte: 'Trois cultistes psalmodient autour d\'un cercle qui s\'assombrit. Ils ne vous ont pas encore vus.',
    choix: [
      { texte: 'Les attaquer par surprise', risque: true, resoudre: () => ({ lignes: ['Vous fondez sur eux avant la fin de l\'incantation !'], combat: { avant: ['cultiste', 'cultiste'], arriere: ['pretre_eclipse'] } }) },
      { texte: 'Écouter la prière (SAG DD 13)', resoudre(j) {
        const h = meilleurSur(j, 'SAG'), t = j.test(h, 'SAG', 13, true);
        if (t.reussite) { j.debout().forEach(p => j.peur(p, -20)); return { lignes: [t.texte, 'Vous retenez la contre-prière qui brise leur emprise : −20 Peur.'] }; }
        j.debout().forEach(p => j.peur(p, 20));
        return { lignes: [t.texte, 'La psalmodie vous envahit l\'esprit : +20 Peur.'] };
      } },
      { texte: 'Faire un détour', resoudre: () => ({ lignes: ['Vous contournez la salle en silence.'] }) }
    ]
  },
  {
    id: 'chaudron', campagne: 'marais', titre: 'Le chaudron de la guenaude',
    texte: 'Une cabane sur pilotis. Un chaudron bouillonne d\'une soupe verdâtre qui sent… étonnamment bon.',
    choix: [
      { texte: 'Goûter la soupe', risque: true, resoudre(j) {
        const r = Des.d20(), h = j.heros(), lignes = [`🎲 ${r.texte}`];
        if (r.nat <= 6) { j.blesserPct(0.15); lignes.push('Beurk ! C\'était du poison : tout le monde perd 15 % de ses PV.'); }
        else if (r.nat <= 14) { j.equipe.forEach(p => j.soigner(p, 10)); lignes.push('Une soupe revigorante : +10 PV pour toute l\'équipe.'); }
        else { j.pvMax(h, 5); lignes.push(`${h.nom} se sent plus robuste : +5 PV maximum.`); }
        return { lignes };
      } },
      { texte: 'Voler les ingrédients', risque: true, resoudre(j) {
        j.ajouterStock('potion', 2);
        if (alea() < 0.4) return { lignes: ['🧴 +2 potions… mais les crapauds de la guenaude montent la garde !'], combat: { avant: ['crapaud', 'crapaud'], arriere: ['feu_follet'] } };
        return { lignes: ['🧴 Vous filez avec deux fioles avant que quiconque ne revienne.'] };
      } },
      { texte: 'Partir', resoudre: () => ({ lignes: ['Le chaudron gargouille dans votre dos.'] }) }
    ]
  },
  {
    id: 'epave', campagne: 'cote', titre: 'L\'épave échouée',
    texte: 'Un navire marchand éventré sur les rochers. La cale est à moitié inondée.',
    choix: [
      { texte: 'Fouiller la cale', risque: true, resoudre(j) {
        const r = alea();
        if (r < 0.3) return { lignes: ['Une silhouette massive émerge de l\'eau trouble : un merrow !'], combat: { avant: ['merrow'], arriere: ['sahuagin'] } };
        if (r < 0.65) return { lignes: ['Un coffre de solde intact !', j.gagnerOrFixe(70)] };
        return { lignes: ['Une malle d\'officier, bien scellée.', j.donnerObjet('rare')] };
      } },
      { texte: 'Sauver le marin coincé sous le mât (FOR DD 12)', resoudre(j) {
        const h = meilleurSur(j, 'FOR'), t = j.test(h, 'FOR', 12, true);
        if (t.reussite) { j.ajouterStock('potion_sup', 1); return { lignes: [t.texte, 'Le marin, reconnaissant, vous confie sa réserve.', '🍷 +1 potion supérieure.', j.gagnerOrFixe(30)] }; }
        j.blesser(h, 6);
        return { lignes: [t.texte, `Le mât glisse et écrase la main de ${h.nom} (−6 PV). Le marin vous remercie quand même.`] };
      } },
      { texte: 'Passer', resoudre: () => ({ lignes: ['Les mouettes se disputent l\'épave.'] }) }
    ]
  },
  {
    id: 'chant_rochers', campagne: 'cote', titre: 'Le chant des rochers',
    texte: 'Une mélodie envoûtante monte des récifs. Vos jambes avancent toutes seules vers l\'eau…',
    choix: [
      { texte: 'Résister (SAG DD 13)', resoudre(j) {
        const h = meilleurSur(j, 'SAG'), t = j.test(h, 'SAG', 13, true);
        if (t.reussite) return { lignes: [t.texte, `${h.nom} secoue ses compagnons : vous trouvez le nid des harpies, vide… et plein de trésors.`, j.gagnerOrFixe(50), j.donnerObjet('commun')] };
        j.blesserPct(0.12);
        return { lignes: [t.texte, 'Vous vous réveillez trempés, griffés de toutes parts : −12 % PV.'] };
      } },
      { texte: 'Se boucher les oreilles et charger', risque: true, resoudre: () => ({ lignes: ['Vous fondez sur les chanteuses !'], combat: { avant: [], arriere: ['harpie', 'harpie', 'harpie'] } }) }
    ]
  },
  {
    id: 'coffre_suspect', campagne: 'souterrains', titre: 'Le coffre trop beau',
    texte: 'Un coffre doré, impeccable, au milieu d\'une salle crasseuse. Un filet de bave coule de la serrure… ou est-ce de l\'eau ?',
    choix: [
      { texte: 'L\'ouvrir', risque: true, resoudre(j) {
        if (alea() < 0.5) return { lignes: ['Le couvercle se hérisse de crocs : une mimique !'], combat: { avant: ['mimique'], arriere: [] } };
        return { lignes: ['Ce n\'était qu\'un coffre. Un vrai !'], recompense: 'objets' };
      } },
      { texte: 'Le frapper d\'abord (FOR DD 12)', resoudre(j) {
        const h = meilleurSur(j, 'FOR'), t = j.test(h, 'FOR', 12, true);
        if (alea() < 0.5) return { lignes: [t.texte, t.reussite ? 'Le coffre hurle ! Votre coup l\'a sonné avant qu\'il n\'attaque.' : 'Le coffre hurle et se jette sur vous !'], combat: { avant: ['mimique'], arriere: [] } };
        return { lignes: [t.texte, 'Le coffre éclate en morceaux. Il en reste quelques pièces.', j.gagnerOrFixe(40)] };
      } },
      { texte: 'Le laisser tranquille', resoudre: () => ({ lignes: ['Vous croyez entendre un soupir déçu.'] }) }
    ]
  },
  {
    id: 'gelee_doree', campagne: 'souterrains', titre: 'La gelée pleine d\'or',
    texte: 'Une gelée immobile scintille : des dizaines de pièces flottent dans sa masse translucide.',
    choix: [
      { texte: 'Y plonger la main (CON DD 13)', risque: true, resoudre(j) {
        const h = meilleurSur(j, 'CON'), t = j.test(h, 'CON', 13, true);
        if (t.reussite) return { lignes: [t.texte, 'Vous ressortez une poignée d\'or, la peau à peine rougie.', j.gagnerOrFixe(70)] };
        const d = Des.lancer('2d6'); j.blesser(h, d.total);
        return { lignes: [t.texte, `L'acide ronge le bras de ${h.nom} : ${d.texte} dégâts.`, j.gagnerOrFixe(25)] };
      } },
      { texte: 'La brûler avec un sort (1 emplacement)', condition: j => !!j.lanceur(), resoudre(j) {
        const h = j.lanceur(); h.emplacements[1].restant--;
        return { lignes: [`${h.nom} incendie la gelée, qui se dissout en grésillant.`, j.gagnerOrFixe(70)] };
      } },
      { texte: 'Ne pas y toucher', resoudre: () => ({ lignes: ['La gelée tremble doucement quand vous passez.'] }) }
    ]
  },
  {
    id: 'bal_spectral', campagne: 'chateau', titre: 'Le bal des spectres',
    texte: 'Dans la grande salle, des couples fantomatiques valsent. Une dame pâle vous tend la main.',
    choix: [
      { texte: 'Accepter la danse (CHA DD 14)', resoudre(j) {
        const h = meilleurSur(j, 'CHA'), t = j.test(h, 'CHA', 14, false);
        if (t.reussite) { j.debout().forEach(p => j.peur(p, -10)); return { lignes: [t.texte, 'La dame sourit et glisse un présent dans votre main.', j.donnerObjet('rare', h), '−10 Peur pour l\'équipe.'] }; }
        j.pvMax(h, -3);
        return { lignes: [t.texte, `Sa main glacée aspire la chaleur de ${h.nom} : −3 PV maximum.`] };
      } },
      { texte: 'Boire le vin du buffet', resoudre(j) { j.equipe.forEach(p => { j.soigner(p, Des.lancer('1d6').total); j.peur(p, 15); }); return { lignes: ['Un vin capiteux qui revigore… et met mal à l\'aise : 1d6 PV et +15 Peur pour chacun.'] }; } },
      { texte: 'Fuir la salle', resoudre: () => ({ lignes: ['La musique s\'arrête net derrière vous.'] }) }
    ]
  },
  {
    id: 'portrait_comte', campagne: 'chateau', titre: 'Le portrait du comte',
    texte: 'Un immense portrait du comte Vladislav Morn. Ses yeux peints suivent chacun de vos gestes.',
    choix: [
      { texte: 'Lacérer la toile', risque: true, resoudre: () => ({ lignes: ['Le cadre explose : ses gardiens jaillissent de derrière le tableau !'], combat: { avant: ['rejeton_vampire'], arriere: ['chauves_souris'] } }) },
      { texte: 'Prier devant (clerc ou paladin)', condition: j => j.debout().some(p => ['clerc', 'paladin'].includes(p.classe)), resoudre(j) {
        j.ajouterStock('eau_benite', 2);
        return { lignes: ['Votre prière fait suinter la toile. Derrière, une niche cache des fioles consacrées : 💧 +2 eau bénite.'] };
      } },
      { texte: 'Détourner le regard', resoudre(j) { j.debout().forEach(p => j.peur(p, 5)); return { lignes: ['Vous sentez son regard dans votre dos (+5 Peur).'] }; } }
    ]
  },
  {
    id: 'tas_or', campagne: 'dragon', titre: 'Le tas d\'or du dragon',
    texte: 'Une montagne de pièces, de coupes et de joyaux. Quelque part, une respiration lente et chaude.',
    choix: [
      { texte: 'Prendre une poignée, discrètement', resoudre: j => ({ lignes: ['Vous empochez quelques pièces sans un bruit.', j.gagnerOrFixe(45)] }) },
      { texte: 'Remplir les sacs', risque: true, resoudre: j => ({ lignes: [j.gagnerOrFixe(120), 'Les pièces dégringolent… un grondement répond !'], combat: { avant: ['dragonnet'], arriere: ['kobold', 'kobold'] } }) },
      { texte: 'Partir', resoudre: () => ({ lignes: ['La respiration continue, paisible.'] }) }
    ]
  },
  {
    id: 'cocon_vivant', campagne: 'toiles', titre: 'Le cocon qui remue',
    texte: 'Un cocon de soie pend du plafond. Une voix étouffée appelle à l\'aide.',
    choix: [
      { texte: 'Le découper (DEX DD 12)', resoudre(j) {
        const h = meilleurSur(j, 'DEX'), t = j.test(h, 'DEX', 12, true);
        if (t.reussite) return { lignes: [t.texte, 'Un aventurier en sort, à bout de forces, et vous donne son équipement.', j.donnerObjet('rare')] };
        return { lignes: [t.texte, 'Les fils vibrent… et alertent les araignées !'], combat: { avant: ['araignee', 'araignee'], arriere: [] } };
      } },
      { texte: 'Le brûler', resoudre(j) { j.debout().forEach(p => j.peur(p, 10)); return { lignes: ['Le cri s\'éteint dans les flammes (+10 Peur). Dans les cendres, une bourse.', j.gagnerOrFixe(35)] }; } },
      { texte: 'L\'ignorer', resoudre: () => ({ lignes: ['La voix s\'affaiblit derrière vous.'] }) }
    ]
  },
  {
    id: 'aventurier_gele', campagne: 'givre', titre: 'L\'aventurier pris dans la glace',
    texte: 'Un aventurier figé dans un bloc de glace, l\'épée levée. Il cligne des yeux.',
    choix: [
      { texte: 'Le dégeler avec un sort (1 emplacement)', condition: j => !!j.lanceur(), resoudre(j) {
        const h = j.lanceur(); h.emplacements[1].restant--; j.ajouterStock('potion', 1);
        return { lignes: ['La glace fond. L\'aventurier, grelottant, vous offre son épée et une potion.', j.donnerObjet('rare'), '🧴 +1 potion.'] };
      } },
      { texte: 'Briser la glace (FOR DD 14)', resoudre(j) {
        const h = meilleurSur(j, 'FOR'), t = j.test(h, 'FOR', 14, true);
        if (t.reussite) return { lignes: [t.texte, 'La glace cède. L\'aventurier, libre, vous remercie d\'un présent.', j.donnerObjet('commun')] };
        j.blesser(h, 5);
        return { lignes: [t.texte, `Des éclats de glace entaillent ${h.nom} (−5 PV). Le bloc ne bouge pas.`] };
      } },
      { texte: 'Continuer', resoudre: () => ({ lignes: ['Ses yeux vous suivent longtemps.'] }) }
    ]
  },
  {
    id: 'deserteur', campagne: 'legion', titre: 'Le déserteur',
    texte: 'Un soldat de la Légion de Fer, blessé, se cache derrière des caisses. « Pitié… je ne veux plus me battre. »',
    choix: [
      { texte: 'Le soigner (1 potion)', condition: j => j.potions > 0, resoudre(j) {
        j.potions--;
        return { lignes: ['Reconnaissant, il vous donne les plans du camp et son équipement.', j.gagnerOrFixe(50), j.donnerObjet('commun')] };
      } },
      { texte: 'Le livrer à ses officiers contre une prime', resoudre(j) { j.debout().forEach(p => j.peur(p, 10)); return { lignes: ['La prime est généreuse, la conscience moins légère (+10 Peur).', j.gagnerOrFixe(70)] }; } },
      { texte: 'Le laisser filer', resoudre: () => ({ lignes: ['Il disparaît dans l\'ombre.'] }) }
    ]
  },
  {
    id: 'sarcophage', campagne: 'tombeau', titre: 'Le sarcophage scellé',
    texte: 'Un sarcophage peint d\'or et de lapis. Des hiéroglyphes avertissent : « Que le voleur soit maudit ».',
    choix: [
      { texte: 'Briser les scellés', risque: true, resoudre(j) {
        const r = Des.d20(), lignes = [`🎲 ${r.texte}`];
        if (r.nat <= 6) return { lignes: [...lignes, 'La momie qu\'il contenait se redresse !'], combat: { avant: ['momie', 'momie'], arriere: [] } };
        if (r.nat <= 15) return { lignes: [...lignes, 'Des bijoux funéraires !', j.donnerObjet('rare')] };
        return { lignes: [...lignes, 'Le trésor d\'un prince oublié !', j.donnerObjet('legendaire')] };
      } },
      { texte: 'Déchiffrer les hiéroglyphes (INT DD 14)', resoudre(j) {
        const h = meilleurSur(j, 'INT'), t = j.test(h, 'INT', 14, true);
        if (t.reussite) { j.equipe.forEach(p => j.pvMax(p, 3)); return { lignes: [t.texte, 'Une bénédiction des anciens rois : +3 PV maximum pour toute l\'équipe.'] }; }
        j.debout().forEach(p => j.peur(p, 15));
        return { lignes: [t.texte, 'La malédiction vous frappe : +15 Peur.'] };
      } },
      { texte: 'Respecter le mort', resoudre: () => ({ lignes: ['Vous inclinez la tête et passez.'] }) }
    ]
  },
  {
    id: 'voix_abime', campagne: 'abime', titre: 'La voix de l\'Abîme',
    texte: 'Une voix douce, venue de partout à la fois : « Je peux te rendre invincible. Il suffit d\'écouter. »',
    choix: [
      { texte: 'Écouter', risque: true, resoudre(j) { j.equipe.forEach(p => j.peur(p, 30)); return { lignes: ['Un savoir interdit vous traverse (+30 Peur pour tous)…', j.donnerObjet('legendaire')] }; } },
      { texte: 'Refuser et prier', resoudre(j) { j.debout().forEach(p => j.peur(p, -20)); return { lignes: ['La voix se tait, vexée. Vous vous sentez plus forts : −20 Peur.'] }; } }
    ]
  }
);
