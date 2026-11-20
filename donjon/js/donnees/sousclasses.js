// =====================================================================
// Sous-classes : chaque classe en a 2 ou 3. La première est disponible
// d'office ; les autres se débloquent en terminant une campagne.
//
// Champs d'une sous-classe :
//   id, nom, icone, desc   : affichage (desc = résumé d'une ligne)
//   details                : liste des capacités (texte)
//   deblocage              : identifiant de la campagne à terminer (absent = libre)
//   traits                 : capacités passives lues par combat.js (voir plus bas)
//   pv, ca                 : bonus de PV max et de CA
//   remplace               : { actionDeBase: nouvelleAction }
//   ajoute                 : actions ajoutées au départ
//   ressources             : ressources propres (récupérées au repos long)
//   reposCourt             : ressources aussi récupérées au repos court
//   niv5                   : { traits, action, sort, texte } gagnés au niveau 5
//
// Traits ajoutés par les sous-classes (combat.js) :
//   critAmeliore (n)  : zone de critique élargie de n     survivant (n) : PV par tour sous la moitié
//   riposte           : contre-attaque quand un ennemi le rate au corps à corps
//   disciple          : soins de sort + niveau du sort  guerisseurBeni : se soigne en soignant
//   colereTempete     : foudroie qui le frappe au corps à corps (2× par combat)
//   assassin          : avantage contre qui n'a pas encore joué, critique au 1er round
//   empoisonneur      : l'attaque sournoise empoisonne      mainsLestes : le sac est une action bonus
//   evocation (n)     : +n aux sorts à emplacement         tourPuissant : tours de magie : moitié si raté
//   moisson (n)       : tue avec un sort → n × niveau PV    egide (n) : bouclier de PV au début du combat
//   frenesie          : attaque en plus pendant la rage     rageInconsciente : pas de Peur en rage
//   espritOurs        : en rage, attire les coups           aspectOurs : +2 CA en rage
//   espritLoup        : en rage, alliés avec avantage au corps à corps (ligne Avant)
//   chefMeute         : en rage, ses coups renversent       auraCourage : Peur gagnée par l'équipe ÷2
//   vengeur           : un allié tombe → état Vengeance     colosse (dés) : +dés contre une cible blessée
//   traqueur          : attaque en plus au 1er round        compagnon (dés) : un loup mord après chaque action
//   motsCinglants     : −1d6 à la 1re attaque ennemie du round (2× par combat)
//   inspirationCombat : l'inspiration ajoute aussi 1d6 aux dégâts
//   recuperation (n)  : niveaux d'emplacements récupérés au repos court
//   tenebreux         : tue → PV temporaires (3 + niveau)
//   espritEveille     : ses dégâts psychiques ajoutent 15 Peur aux monstres
//   penseesEnvahissantes : un monstre terrifié subit 3d6 psychique
// =====================================================================

const SOUS_CLASSES = {
  guerrier: [
    { id: 'champion', nom: 'Champion', icone: '🏆', desc: 'Critiques fréquents, endurant.',
      details: ['Critique amélioré : critique sur 19-20 (18-20 avec une Lame acérée).', 'Niv. 5 — Survivant : récupère 3 PV au début de son tour s\'il a moins de la moitié de ses PV.'],
      traits: { critAmeliore: 1 }, niv5: { traits: { survivant: 3 }, texte: 'Survivant (3 PV par tour sous la moitié des PV)' } },
    { id: 'maitre_guerre', nom: 'Maître de guerre', icone: '♟️', desc: 'Manœuvres tactiques avec des dés de supériorité.', deblocage: 'crypte',
      details: ['Croc-en-jambe remplace Coup de bouclier : +1d8 dégâts et renverse (4 dés de supériorité, récupérés au repos court).', 'Niv. 5 — Riposte : quand un ennemi le rate au corps à corps, il contre-attaque (une fois par round).'],
      remplace: { coup_bouclier: 'croc_en_jambe' }, ressources: { superiorite: 4 }, reposCourt: ['superiorite'],
      niv5: { traits: { riposte: true }, texte: 'Riposte (contre-attaque quand on le rate)' } }
  ],
  clerc: [
    { id: 'vie', nom: 'Domaine de la Vie', icone: '💗', desc: 'Le meilleur soigneur du jeu.',
      details: ['Disciple de la vie : ses sorts de soin rendent autant de PV en plus que le niveau du sort.', 'Niv. 5 — Guérisseur béni : quand il soigne un allié avec un sort, il récupère aussi 2 + niveau du sort PV.'],
      traits: { disciple: true }, niv5: { traits: { guerisseurBeni: true }, texte: 'Guérisseur béni (se soigne en soignant)' } },
    { id: 'tempete', nom: 'Domaine de la Tempête', icone: '⛈️', desc: 'Foudre et tonnerre, punit le corps à corps.', deblocage: 'crypte',
      details: ['Vague tonnante remplace la Masse d\'armes.', 'Colère de la tempête : un ennemi qui le frappe au corps à corps subit 2d8 foudre (sauvegarde de DEX pour moitié), trois fois par combat.', 'Niv. 5 — apprend Appel de la foudre.'],
      remplace: { masse: 'vague_tonnante' }, traits: { colereTempete: 3 },
      niv5: { sort: 'appel_foudre', texte: 'Appel de la foudre' } },
    { id: 'guerre', nom: 'Domaine de la Guerre', icone: '⚔️', desc: 'Prêtre combattant de première ligne.', deblocage: 'dragon',
      details: ['Prêtre de guerre remplace la Masse d\'armes : deux coups de masse d\'un coup, une fois par combat (sinon, Flamme sacrée).', 'Niv. 5 — Frappe divine : ses attaques d\'arme infligent +1d6 radiant.'],
      remplace: { masse: 'pretre_guerre' },
      niv5: { traits: { armeElem: { des: '1d6', type: 'radiant' } }, texte: 'Frappe divine (+1d6 radiant aux armes)' } }
  ],
  roublard: [
    { id: 'voleur', nom: 'Voleur', icone: '💰', desc: 'Utilise le sac sans perdre son tour.',
      details: ['Mains lestes : utiliser un objet du sac (potion, bombe…) est une action bonus : il rejoue aussitôt.', 'Niv. 5 — Pillard : +25 % d\'or gagné et +3 à l\'initiative.'],
      traits: { mainsLestes: true }, niv5: { traits: { orMult: 0.25, init: 3 }, texte: 'Pillard (+25 % d\'or, +3 initiative)' } },
    { id: 'assassin', nom: 'Assassin', icone: '🗡️', desc: 'Frappe mortelle avant que l\'ennemi ne bouge.', deblocage: 'crypte',
      details: ['Assassinat : avantage contre les ennemis qui n\'ont pas encore joué ; au 1er round, ses attaques qui les touchent sont des critiques.', 'Niv. 5 — Empoisonneur : l\'attaque sournoise empoisonne la cible (sauvegarde de CON).'],
      traits: { assassin: true, init: 2 }, niv5: { traits: { empoisonneur: true }, texte: 'Empoisonneur (la sournoise empoisonne)' } }
  ],
  magicien: [
    { id: 'evocation', nom: 'École d\'Évocation', icone: '💥', desc: 'Des sorts de dégâts plus puissants.',
      details: ['Évocation puissante : +2 aux dégâts de ses sorts à emplacement (une fois par cible).', 'Niv. 5 — Tour de magie puissant : ses tours de magie d\'attaque ratés infligent quand même la moitié des dégâts.'],
      traits: { evocation: 2 }, niv5: { traits: { tourPuissant: true }, texte: 'Tour de magie puissant (moitié des dégâts si raté)' } },
    { id: 'necromancie', nom: 'École de Nécromancie', icone: '💀', desc: 'Affaiblit l\'ennemi et se nourrit de ses morts.', deblocage: 'crypte',
      details: ['Rayon affaiblissant remplace Projectile magique : la cible inflige moitié dégâts avec ses armes.', 'Moisson macabre : tuer un ennemi avec un sort à emplacement rend 2 × niveau du sort PV.', 'Niv. 5 — Moisson ×3.'],
      remplace: { projectile_magique: 'rayon_affaiblissant' }, traits: { moisson: 2 },
      niv5: { traits: { moisson: 3 }, texte: 'Moisson macabre ×3' } },
    { id: 'abjuration', nom: 'École d\'Abjuration', icone: '💠', desc: 'Un bouclier magique qui se recharge.', deblocage: 'toiles',
      details: ['Égide arcanique : commence chaque combat avec un bouclier de 2 × niveau + 3 PV (absorbe les dégâts). Chaque sort à emplacement la recharge de 2 × niveau du sort.', 'Niv. 5 — l\'égide passe à 2 × niveau + 6.'],
      traits: { egide: 3 }, niv5: { traits: { egide: 6 }, texte: 'Égide renforcée' } }
  ],
  barbare: [
    { id: 'berserker', nom: 'Voie du Berserker', icone: '🩸', desc: 'Frénésie : frappe plus souvent en rage.',
      details: ['Frénésie : en rage, ses attaques d\'arme frappent une fois de plus. Contrecoup : +5 Peur à chacun de ses tours en rage.', 'Niv. 5 — Rage inconsciente : il ne gagne plus de Peur tant qu\'il est en rage.'],
      traits: { frenesie: true }, niv5: { traits: { rageInconsciente: true }, texte: 'Rage inconsciente (aucune Peur en rage)' } },
    { id: 'ours', nom: 'Totem de l\'Ours', icone: '🐻', desc: 'Encaisse et attire les coups.', deblocage: 'horde',
      details: ['+4 PV max.', 'Esprit de l\'ours : en rage, les ennemis le prennent pour cible en priorité.', 'Niv. 5 — Aspect de l\'ours : +2 CA en rage.'],
      pv: 4, traits: { espritOurs: true }, niv5: { traits: { aspectOurs: true }, texte: 'Aspect de l\'ours (+2 CA en rage)' } },
    { id: 'loup', nom: 'Totem du Loup', icone: '🐺', desc: 'Chef de meute : l\'équipe frappe mieux.', deblocage: 'legion',
      details: ['Esprit du loup : en rage, ses alliés ont l\'avantage au corps à corps contre les ennemis de la ligne Avant.', 'Niv. 5 — Chef de meute : en rage, ses coups d\'arme renversent la cible (sauvegarde de FOR).'],
      traits: { espritLoup: true }, niv5: { traits: { chefMeute: true }, texte: 'Chef de meute (ses coups renversent)' } }
  ],
  paladin: [
    { id: 'devotion', nom: 'Serment de Dévotion', icone: '🕊️', desc: 'Arme sacrée et aura de courage.',
      details: ['Arme sacrée remplace Bénédiction : action bonus, +2 au toucher avec les armes pendant 3 tours (une fois par combat).', 'Niv. 5 — Aura de courage : tant qu\'il est debout, la Peur gagnée par l\'équipe est divisée par deux.'],
      remplace: { benediction: 'arme_sacree' }, niv5: { traits: { auraCourage: true }, texte: 'Aura de courage (Peur de l\'équipe ÷2)' } },
    { id: 'vengeance', nom: 'Serment de Vengeance', icone: '🔥', desc: 'Traque un ennemi et venge ses alliés.', deblocage: 'horde',
      details: ['Vœu d\'inimitié remplace Bénédiction : action bonus, avantage à ses attaques contre un ennemi pendant 3 tours (une fois par combat).', 'Niv. 5 — Vengeur : quand un allié tombe, il gagne +2 au toucher et aux dégâts jusqu\'à la fin du combat.'],
      remplace: { benediction: 'voeu_inimitie' }, niv5: { traits: { vengeur: true }, texte: 'Vengeur (+2 toucher et dégâts quand un allié tombe)' } }
  ],
  rodeur: [
    { id: 'chasseur', nom: 'Chasseur', icone: '🎯', desc: 'Achève les cibles blessées.',
      details: ['Tueur de colosses : une fois par tour, +1d6 dégâts contre un ennemi déjà blessé.', 'Niv. 5 — Tueur de colosses passe à 1d10.'],
      traits: { colosse: '1d6' }, niv5: { traits: { colosse: '1d10' }, texte: 'Tueur de colosses 1d10' } },
    { id: 'traqueur', nom: 'Traqueur des ténèbres', icone: '🌘', desc: 'Frappe le premier et le plus fort.', deblocage: 'horde',
      details: ['Embusqué : +3 à l\'initiative ; au 1er round, ses attaques d\'arme frappent une fois de plus.', 'Niv. 5 — Invisible dans le noir : commence chaque combat caché.'],
      traits: { traqueur: true, init: 3 }, niv5: { traits: { cacheDebut: true }, texte: 'Commence chaque combat caché' } },
    { id: 'betes', nom: 'Maître des bêtes', icone: '🐺', desc: 'Un loup combat à ses côtés.', deblocage: 'dragon',
      details: ['Compagnon loup : après chacune de ses actions, son loup mord l\'ennemi le plus faible de la ligne Avant (+4 au toucher, 1d4).', 'Niv. 5 — le loup mord pour 1d6+1.'],
      traits: { compagnon: '1d4' }, niv5: { traits: { compagnon: '1d6+1' }, texte: 'Loup plus féroce (1d6+1)' } }
  ],
  barde: [
    { id: 'savoir', nom: 'Collège du Savoir', icone: '📚', desc: 'Contre les attaques et apprend plus de sorts.',
      details: ['Mots cinglants : deux fois par combat, la première attaque ennemie d\'un round contre l\'équipe subit −1d6 au toucher.', 'Niv. 5 — Secrets magiques : apprend Boule de feu.'],
      traits: { motsCinglants: true }, niv5: { sort: 'boule_feu', texte: 'Secrets magiques : Boule de feu' } },
    { id: 'vaillance', nom: 'Collège de la Vaillance', icone: '🛡️', desc: 'Barde guerrier qui galvanise l\'équipe.', deblocage: 'horde',
      details: ['+2 CA (armure intermédiaire et bouclier).', 'Inspiration de combat : un allié inspiré ajoute aussi 1d6 aux dégâts de son attaque.', 'Niv. 5 — Attaque supplémentaire.'],
      ca: 2, traits: { inspirationCombat: true }, niv5: { traits: { attaqueSupp: true }, texte: 'Attaque supplémentaire' } }
  ],
  druide: [
    { id: 'terre', nom: 'Cercle de la Terre', icone: '⛰️', desc: 'Récupère ses sorts au repos court.',
      details: ['Récupération naturelle : au repos court, récupère des emplacements de sorts pour un total de 2 niveaux.', 'Niv. 5 — 3 niveaux d\'emplacements.'],
      traits: { recuperation: 2 }, niv5: { traits: { recuperation: 3 }, texte: 'Récupération naturelle (3 niveaux)' } },
    { id: 'lune', nom: 'Cercle de la Lune', icone: '🐻', desc: 'Se change en ours pour tenir le front.', deblocage: 'eclipse',
      details: ['Forme d\'ours remplace Enchevêtrement : action bonus, passe en ligne Avant avec 12 PV temporaires (une fois, récupérée au repos court).', 'Griffes d\'ours (en forme d\'ours) : 1d10+2 au corps à corps.', 'Niv. 5 — 20 PV temporaires et deux coups de griffes.'],
      remplace: { enchevetrement: 'forme_ours' }, ajoute: ['griffes_ours'], ressources: { forme: 1 }, reposCourt: ['forme'],
      traits: { formeOurs: 12 }, niv5: { traits: { formeOurs: 20, griffes2: true }, texte: 'Ours redoutable (20 PV temp., 2 coups de griffes)' } }
  ],
  moine: [
    { id: 'main_ouverte', nom: 'Voie de la Main ouverte', icone: '✋', desc: 'Ses rafales renversent l\'ennemi.',
      details: ['Déluge renversant remplace Déluge de coups : chaque coup peut renverser (sauvegarde de DEX).', 'Niv. 5 — Plénitude physique : se soigne de 2d6+8 PV, une fois par repos long.'],
      remplace: { deluge: 'deluge_ouvert' }, ressources: { plenitude: 1 },
      niv5: { action: 'plenitude', texte: 'Plénitude physique' } },
    { id: 'ombre', nom: 'Voie de l\'Ombre', icone: '🌑', desc: 'Se cache et frappe depuis les ténèbres.', deblocage: 'eclipse',
      details: ['Pas de l\'ombre remplace Défense patiente : action bonus, devient caché (avantage à sa prochaine attaque), une fois par combat.', 'Niv. 5 — Voile d\'ombre : la première attaque qui le toucherait à chaque combat rate.'],
      remplace: { defense_patiente: 'pas_ombre' }, niv5: { traits: { voile: true }, texte: 'Voile d\'ombre' } }
  ],
  occultiste: [
    { id: 'fielon', nom: 'Pacte du Fiélon', icone: '😈', desc: 'Se protège en tuant.',
      details: ['Bénédiction du ténébreux : chaque ennemi qu\'il tue lui donne 3 + niveau PV temporaires.', 'Niv. 5 — Résistance infernale : résistance au feu.'],
      traits: { tenebreux: true }, niv5: { traits: { resist: ['feu'] }, texte: 'Résistance au feu' } },
    { id: 'grand_ancien', nom: 'Pacte du Grand Ancien', icone: '🐙', desc: 'Fait monter la Peur des monstres.', deblocage: 'eclipse',
      details: ['Les monstres ont une jauge de Peur face à lui : 😟 Ébranlé à 50 (−2 au toucher et aux sauvegardes), 😱 Terrifié à 100 (un monstre ordinaire s\'enfuit ; un élite ou un boss perd son tour et retombe à 50). Morts-vivants et boss n\'en subissent que la moitié ; chaque monstre reprend 5 de courage par tour.', 'Esprit éveillé : ses dégâts psychiques ajoutent 15 Peur à la cible.', 'Chuchotements remplace Maléfice (tour de magie psychique) ; Murmures déments remplace Bras d\'Hadar (triangle de 3 ennemis, +20 Peur).', 'Niv. 5 — Pensées envahissantes : un monstre terrifié subit 3d6 psychique.'],
      remplace: { malefice: 'chuchotements', bras_hadar: 'murmures_dements' }, traits: { espritEveille: 15 },
      niv5: { traits: { penseesEnvahissantes: true }, texte: 'Pensées envahissantes (3d6 aux monstres terrifiés)' } }
  ]
};

// Sous-classe d'un héros (ou d'une classe) : par défaut la première
function sousClasse(classe, id) {
  const liste = SOUS_CLASSES[classe] || [];
  return liste.find(s => s.id === id) || liste[0] || null;
}

// Ajoute des traits : les listes se cumulent, le reste remplace la valeur
function ajouterTraits(pj, t) {
  for (const [k, v] of Object.entries(t || {})) {
    if (Array.isArray(v)) pj.traits[k] = [...(pj.traits[k] || []), ...v];
    else if (k === 'init' || k === 'orMult') pj.traits[k] = (pj.traits[k] || 0) + v;
    else pj.traits[k] = v;
  }
}

// Applique une sous-classe à un héros qui vient d'être créé
function appliquerSousClasse(pj, id) {
  const sc = sousClasse(pj.classe, id);
  if (!sc) return pj;
  pj.sousClasse = sc.id;
  if (sc.pv) { pj.pvMax += sc.pv; pj.pv += sc.pv; }
  if (sc.ca) pj.ca += sc.ca;
  for (const [ancien, nouveau] of Object.entries(sc.remplace || {})) {
    const i = pj.actions.indexOf(ancien);
    if (i >= 0) pj.actions[i] = nouveau; else pj.actions.push(nouveau);
  }
  for (const a of sc.ajoute || []) if (!pj.actions.includes(a)) pj.actions.push(a);
  Object.assign(pj.ressources, sc.ressources || {});
  ajouterTraits(pj, sc.traits);
  return pj;
}

// Gains de sous-classe au niveau 5 ; renvoie la liste des textes
function niveauSousClasse(pj, niv) {
  const sc = pj.sousClasse && sousClasse(pj.classe, pj.sousClasse);
  if (!sc || niv !== 5 || !sc.niv5) return [];
  const g = sc.niv5, gains = [];
  ajouterTraits(pj, g.traits);
  for (const id of [g.action, g.sort].filter(Boolean)) {
    if (pj.actions.includes(id)) continue;
    if (pj.actions.length < MAX_ACTIONS) pj.actions.push(id);
    else gains.push(`${ACTIONS[id].nom} peut maintenant être appris en récompense`);
  }
  gains.unshift(`${sc.icone} ${g.texte}`);
  return gains;
}

// Ressources du héros (classe + sous-classe), restaurées au repos long
function ressourcesPJ(pj) {
  const sc = pj.sousClasse && sousClasse(pj.classe, pj.sousClasse);
  return { ...(CLASSES[pj.classe].ressources || {}), ...((sc && sc.ressources) || {}) };
}

// Effets du repos court propres à la classe et à la sous-classe ; renvoie des lignes de texte
function reposCourtPJ(pj) {
  const lignes = [];
  if (CLASSES[pj.classe].pacte) {
    for (const n in pj.emplacements) pj.emplacements[n].restant = pj.emplacements[n].max;
    lignes.push(`${pj.icone} ${pj.nom} renouvelle son pacte : emplacements de sorts récupérés.`);
  }
  const sc = pj.sousClasse && sousClasse(pj.classe, pj.sousClasse);
  if (sc && sc.reposCourt) {
    const base = ressourcesPJ(pj);
    for (const r of sc.reposCourt) pj.ressources[r] = base[r];
    lignes.push(`${pj.icone} ${pj.nom} récupère ses capacités de ${sc.nom}.`);
  }
  // Cercle de la Terre : emplacements pour un total de N niveaux, les plus hauts d'abord
  let budget = pj.traits.recuperation || 0, gagne = 0;
  for (let n = 9; n >= 1 && budget > 0; n--) {
    const e = pj.emplacements[n];
    while (e && n <= budget && e.restant < e.max) { e.restant++; budget -= n; gagne++; }
  }
  if (gagne) lignes.push(`${pj.icone} ${pj.nom} puise dans la terre : ${gagne} emplacement${gagne > 1 ? 's' : ''} de sort récupéré${gagne > 1 ? 's' : ''}.`);
  return lignes;
}

// Sous-classe débloquée ?
function sousClasseDebloquee(sc) {
  return !sc.deblocage || Progression.toutDebloque() || Progression.victoires(Progression.campagne(sc.deblocage)) > 0;
}
