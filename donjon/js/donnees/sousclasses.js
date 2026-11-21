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
//   reposCourtUn           : ressources dont le repos court ne rend qu'une charge
//   niv4, niv6             : idem aux niveaux 4 et 6 (niv6 : NIV6_SOUS_CLASSES) ; leurs ressources remplacent celles de base
//   reduction (n)     : −n à chaque coup subi (trait)
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
//   halo (dés)        : qui le frappe au corps à corps subit ces dégâts nécrotiques
//   compagnonNom / compagnonIcone / compagnonType : apparence du compagnon (loup par défaut)
//   audace            : sournoise en duel (ligne Avant contre ligne Avant)
//   presage (n)       : n fois par combat, un allié relance une sauvegarde ratée
// =====================================================================

const SOUS_CLASSES = {
  guerrier: [
    { id: 'champion', nom: 'Champion', icone: '🏆', desc: 'Critiques fréquents, endurant.',
      details: ['Critique amélioré : critique sur 19-20 (18-20 avec une Lame acérée).', 'Niv. 5 — Survivant : récupère 3 PV au début de son tour s\'il a moins de la moitié de ses PV.'],
      traits: { critAmeliore: 1 }, niv5: { traits: { survivant: 3 }, texte: 'Survivant (3 PV par tour sous la moitié des PV)' } },
    { id: 'maitre_guerre', nom: 'Maître de guerre', icone: '♟️', desc: 'Manœuvres tactiques avec des dés de supériorité.', deblocage: 'crypte',
      details: ['Croc-en-jambe remplace Coup de bouclier : +1d8 dégâts et renverse (4 dés de supériorité, récupérés au repos court).', 'Niv. 5 — Riposte : quand un ennemi le rate au corps à corps, il contre-attaque (une fois par round).'],
      remplace: { coup_bouclier: 'croc_en_jambe' }, ressources: { superiorite: 4 }, reposCourt: ['superiorite'],
      niv5: { traits: { riposte: true }, texte: 'Riposte (contre-attaque quand on le rate)' } },
    { id: 'samourai', nom: 'Samouraï', icone: '🎌', desc: 'Esprit combatif : frappe avec avantage et encaisse.', deblocage: 'givre',
      details: ['Esprit combatif (action bonus, 3 fois par repos long) : avantage à sa prochaine attaque et 5 PV temporaires (+ niveau).', 'Niv. 5 — Esprit indomptable : 4 utilisations et +3 initiative.'],
      ajoute: ['esprit_combatif'], ressources: { combatif: 3 },
      niv5: { ressources: { combatif: 4 }, traits: { init: 3 }, texte: 'Esprit indomptable (4 utilisations, +3 initiative)' } },
    { id: 'chevalier_occulte', nom: 'Chevalier occulte', icone: '🔥', desc: 'Guerrier mage : sa lame enflammée frappe deux ennemis.', deblocage: 'toiles',
      details: ['Magie de guerre : Lame aux flammes vertes (trois fois par combat), frappe la cible puis un ennemi voisin, 1d8+3 + 1d8 feu chacun.', 'Niv. 5 — Frappe occulte : +1d6 force à ses attaques d\'arme.'],
      ajoute: ['lame_flammes'], niv5: { traits: { armeElem: { des: '1d6', type: 'force' } }, texte: 'Frappe occulte (+1d6 force)' } }
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
      niv5: { traits: { armeElem: { des: '1d6', type: 'radiant' } }, texte: 'Frappe divine (+1d6 radiant aux armes)' } },
    { id: 'lumiere', nom: 'Domaine de la Lumière', icone: '☀️', desc: 'Brûle les ténèbres dans un éclat radiant.', deblocage: 'chateau',
      details: ['Radiance de l\'aube (une fois par combat) : tous les ennemis, sauvegarde de CON, 2d10+3 radiant (moitié si réussite).', 'Niv. 5 — Incantation puissante : +3 aux dégâts de ses sorts radiants.'],
      ajoute: ['radiance_aube'], niv5: { traits: { affinite: { type: 'radiant', bonus: 3 } }, texte: 'Incantation puissante (radiant +3)' } },
    { id: 'ruse', nom: 'Domaine de la Ruse', icone: '🃏', desc: 'Un double illusoire détourne les coups.', deblocage: 'souterrains',
      details: ['Invocation de double : la première attaque qui le toucherait à chaque combat rate ; apprend Se cacher.', 'Niv. 5 — Frappe divine : +1d8 poison à ses attaques d\'arme.'],
      ajoute: ['se_cacher'], traits: { voile: true }, niv5: { traits: { armeElem: { des: '1d8', type: 'poison' } }, texte: 'Frappe divine (+1d8 poison)' } }
  ],
  roublard: [
    { id: 'voleur', nom: 'Voleur', icone: '💰', desc: 'Utilise le sac sans perdre son tour.',
      details: ['Mains lestes : utiliser un objet du sac (potion, bombe…) est une action bonus : il rejoue aussitôt.', 'Niv. 5 — Pillard : +25 % d\'or gagné et +3 à l\'initiative.'],
      traits: { mainsLestes: true }, niv5: { traits: { orMult: 0.25, init: 3 }, texte: 'Pillard (+25 % d\'or, +3 initiative)' } },
    { id: 'assassin', nom: 'Assassin', icone: '🗡️', desc: 'Frappe mortelle avant que l\'ennemi ne bouge.', deblocage: 'crypte',
      details: ['Assassinat : avantage contre les ennemis qui n\'ont pas encore joué ; au 1er round, ses attaques qui les touchent sont des critiques.', 'Niv. 5 — Empoisonneur : l\'attaque sournoise empoisonne la cible (sauvegarde de CON).'],
      traits: { assassin: true, init: 2 }, niv5: { traits: { empoisonneur: true }, texte: 'Empoisonneur (la sournoise empoisonne)' } },
    { id: 'bretteur', nom: 'Bretteur', icone: '🤺', desc: 'Duelliste audacieux, sournois même sans allié.', deblocage: 'cote',
      details: ['Audace : en ligne Avant, son attaque sournoise marche contre la ligne Avant ennemie même sans allié au contact ; +3 initiative et +1 CA (jeu de jambes).', 'Niv. 5 — Panache : contre-attaque quand un ennemi le rate au corps à corps.'],
      ca: 1, traits: { audace: true, init: 3 }, niv5: { traits: { riposte: true }, texte: 'Panache (riposte)' } },
    { id: 'eclaireur', nom: 'Éclaireur', icone: '🧭', desc: 'Frappe deux fois avant que l\'ennemi ne réagisse.', deblocage: 'horde',
      details: ['Escarmoucheur : +5 initiative et une attaque en plus au premier round.', 'Niv. 5 — Survivant : −2 à chaque coup subi.'],
      traits: { init: 5, traqueur: true }, niv5: { traits: { reduction: 2 }, texte: 'Survivant (−2 à chaque coup subi)' } }
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
      traits: { egide: 3 }, niv5: { traits: { egide: 6 }, texte: 'Égide renforcée' } },
    { id: 'divination', nom: 'École de Divination', icone: '🔮', desc: 'Ses présages sauvent l\'équipe des sorts et poisons.', deblocage: 'tombeau',
      details: ['Présage : deux fois par combat, un allié qui rate une sauvegarde la relance aussitôt.', 'Niv. 5 — Présage majeur : trois fois par combat.'],
      traits: { presage: 2 }, niv5: { traits: { presage: 3 }, texte: 'Présage majeur (3 par combat)' } },
    { id: 'enchantement', nom: 'École d\'Enchantement', icone: '👁️', desc: 'Son regard plonge l\'ennemi dans la torpeur.', deblocage: 'cote',
      details: ['Regard hypnotique (deux fois par combat) : une cible, sauvegarde de SAG ou charmée 2 tours.', 'Niv. 5 — Charme instinctif : la première attaque qui le toucherait à chaque combat rate.'],
      ajoute: ['regard_hypnotique'], niv5: { traits: { voile: true }, texte: 'Charme instinctif (voile)' } }
  ],
  barbare: [
    { id: 'berserker', nom: 'Voie du Berserker', icone: '🩸', desc: 'Frénésie : frappe plus souvent en rage.',
      details: ['Frénésie : en rage, ses attaques d\'arme frappent une fois de plus. Contrecoup : +5 Peur à chacun de ses tours en rage.', 'Niv. 5 — Rage inconsciente : il ne gagne plus de Peur tant qu\'il est en rage.'],
      traits: { frenesie: true }, niv5: { traits: { rageInconsciente: true }, texte: 'Rage inconsciente (aucune Peur en rage)' } },
    { id: 'ours', nom: 'Totem de l\'Ours', icone: '🐻', desc: 'Encaisse et attire les coups.', deblocage: 'horde',
      details: ['+4 PV max.', 'Esprit de l\'ours : en rage, résistance à tous les dégâts sauf psychiques, et les ennemis le prennent pour cible en priorité.', 'Niv. 5 — Aspect de l\'ours : +2 CA en rage.'],
      pv: 4, traits: { espritOurs: true }, niv5: { traits: { aspectOurs: true }, texte: 'Aspect de l\'ours (+2 CA en rage)' } },
    { id: 'loup', nom: 'Totem du Loup', icone: '🐺', desc: 'Chef de meute : l\'équipe frappe mieux.', deblocage: 'legion',
      details: ['Esprit du loup : en rage, ses alliés ont l\'avantage au corps à corps contre les ennemis de la ligne Avant.', 'Niv. 5 — Chef de meute : en rage, ses coups d\'arme renversent la cible (sauvegarde de FOR).'],
      traits: { espritLoup: true }, niv5: { traits: { chefMeute: true }, texte: 'Chef de meute (ses coups renversent)' } },
    { id: 'zelote', nom: 'Voie du Zélote', icone: '😇', desc: 'Fureur divine : même la mort ne l\'arrête pas.', deblocage: 'tombeau',
      details: ['Fureur divine : +1d6 radiant à ses attaques d\'arme.', 'Niv. 5 — Zèle : −2 à chaque coup subi.'],
      traits: { armeElem: { des: '1d6', type: 'radiant' } }, niv5: { traits: { reduction: 2 }, texte: 'Zèle (−2 à chaque coup subi)' } }
  ],
  paladin: [
    { id: 'devotion', nom: 'Serment de Dévotion', icone: '🕊️', desc: 'Arme sacrée et aura de courage.',
      details: ['Arme sacrée (en plus de Bénédiction) : action bonus, +2 au toucher avec les armes pendant 3 tours (une fois par combat).', 'Niv. 5 — Aura de courage : tant qu\'il est debout, la Peur gagnée par l\'équipe est divisée par deux.'],
      ajoute: ['arme_sacree'], niv5: { traits: { auraCourage: true }, texte: 'Aura de courage (Peur de l\'équipe ÷2)' } },
    { id: 'vengeance', nom: 'Serment de Vengeance', icone: '🔥', desc: 'Traque un ennemi et venge ses alliés.', deblocage: 'horde',
      details: ['Vœu d\'inimitié (en plus de Bénédiction) : action bonus, avantage à ses attaques contre un ennemi pendant 3 tours (une fois par combat).', 'Niv. 5 — Vengeur : quand un allié tombe, il gagne +2 au toucher et aux dégâts jusqu\'à la fin du combat.'],
      ajoute: ['voeu_inimitie'], niv5: { traits: { vengeur: true }, texte: 'Vengeur (+2 toucher et dégâts quand un allié tombe)' } },
    { id: 'anciens', nom: 'Serment des Anciens', icone: '🌿', desc: 'Gardien de la lumière et de la nature.', deblocage: 'marais',
      details: ['Colère de la nature : apprend Enchevêtrement.', 'Niv. 5 — Aura de garde : résistance aux dégâts nécrotiques, psychiques et radiants.'],
      ajoute: ['enchevetrement'], niv5: { traits: { resist: ['nécrotique', 'psychique', 'radiant'] }, texte: 'Aura de garde (résistance nécrotique, psychique, radiant)' } },
    { id: 'conquete', nom: 'Serment de Conquête', icone: '👑', desc: 'Écrase la volonté de ses ennemis par la terreur.', deblocage: 'legion',
      details: ['Présence conquérante (une fois par combat) : tous les ennemis, sauvegarde de SAG ou étourdis 1 tour, +30 Peur aux monstres.', 'Niv. 5 — Aura de conquête : un monstre qu\'il terrifie subit 3d6 psychique.'],
      ajoute: ['presence_conquerante'], niv5: { traits: { penseesEnvahissantes: true }, texte: 'Aura de conquête (3d6 aux monstres terrifiés)' } }
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
      traits: { compagnon: '1d4' }, niv5: { traits: { compagnon: '1d6+1' }, texte: 'Loup plus féroce (1d6+1)' } },
    { id: 'feerique', nom: 'Vagabond féerique', icone: '🍃', desc: 'Ses coups troublent l\'esprit, sa présence charme.', deblocage: 'eclipse',
      details: ['Coups redoutables : +1d4 psychique à ses attaques d\'arme.', 'Niv. 5 — Présence séduisante : apprend Présence féerique (charme tous les ennemis 1 tour).'],
      traits: { armeElem: { des: '1d4', type: 'psychique' } }, niv5: { action: 'presence_feerique', texte: 'Présence séduisante (Présence féerique)' } }
  ],
  barde: [
    { id: 'savoir', nom: 'Collège du Savoir', icone: '📚', desc: 'Contre les attaques et apprend plus de sorts.',
      details: ['Mots cinglants : deux fois par combat, la première attaque ennemie d\'un round contre l\'équipe subit −1d6 au toucher.', 'Niv. 5 — Secrets magiques : apprend Boule de feu.'],
      traits: { motsCinglants: true }, niv5: { sort: 'boule_feu', texte: 'Secrets magiques : Boule de feu' } },
    { id: 'vaillance', nom: 'Collège de la Vaillance', icone: '🛡️', desc: 'Barde guerrier qui galvanise l\'équipe.', deblocage: 'horde',
      details: ['+2 CA (armure intermédiaire et bouclier).', 'Inspiration de combat : un allié inspiré ajoute aussi 1d6 aux dégâts de son attaque.', 'Niv. 5 — Attaque supplémentaire.'],
      ca: 2, traits: { inspirationCombat: true }, niv5: { traits: { attaqueSupp: true }, texte: 'Attaque supplémentaire' } },
    { id: 'glamour', nom: 'Collège du Glamour', icone: '💫', desc: 'Une aura féerique protège et rassure l\'équipe.', deblocage: 'toiles',
      details: ['Manteau d\'inspiration (une fois par combat) : chaque allié gagne 5 PV temporaires (+ niveau) et perd 10 Peur.', 'Niv. 5 — Manteau de majesté : apprend Effroi.'],
      ajoute: ['manteau_inspiration'], niv5: { action: 'effroi', texte: 'Manteau de majesté (Effroi)' } },
    { id: 'murmures', nom: 'Collège des Murmures', icone: '🗣️', desc: 'Ses lames chuchotent des terreurs psychiques.', deblocage: 'abime',
      details: ['Lames psychiques : +1d6 psychique à ses attaques d\'arme.', 'Niv. 5 — Lames affûtées : +2d6 psychique.'],
      traits: { armeElem: { des: '1d6', type: 'psychique' } }, niv5: { traits: { armeElem: { des: '2d6', type: 'psychique' } }, texte: 'Lames affûtées (+2d6 psychique)' } }
  ],
  druide: [
    { id: 'terre', nom: 'Cercle de la Terre', icone: '⛰️', desc: 'Récupère ses sorts au repos court.',
      details: ['Récupération naturelle : au repos court, récupère des emplacements de sorts pour un total de 2 niveaux.', 'Niv. 5 — 3 niveaux d\'emplacements.'],
      traits: { recuperation: 2 }, niv5: { traits: { recuperation: 3 }, texte: 'Récupération naturelle (3 niveaux)' } },
    { id: 'lune', nom: 'Cercle de la Lune', icone: '🐻', desc: 'Se change en ours pour tenir le front.', deblocage: 'eclipse',
      details: ['Forme d\'ours remplace Enchevêtrement : action bonus, passe en ligne Avant avec 12 PV temporaires. 2 charges : le repos court en rend une, le repos long toutes.', 'Griffes d\'ours (en forme d\'ours) : 1d10+2 au corps à corps.', 'Niv. 4 — 3 charges, ours de 16 PV temporaires.', 'Niv. 5 — 4 charges, ours de 20 PV temporaires et deux coups de griffes.'],
      remplace: { enchevetrement: 'forme_ours' }, ajoute: ['griffes_ours'], ressources: { forme: 2 }, reposCourtUn: ['forme'],
      traits: { formeOurs: 12 },
      niv4: { ressources: { forme: 3 }, traits: { formeOurs: 16 }, texte: 'Forme d\'ours : 3 charges, 16 PV temporaires' },
      niv5: { ressources: { forme: 4 }, traits: { formeOurs: 20, griffes2: true }, texte: 'Ours redoutable : 4 charges, 20 PV temporaires, 2 coups de griffes' } },
    { id: 'reves', nom: 'Cercle des Rêves', icone: '🌸', desc: 'Soigne en action bonus grâce à la cour d\'été.', deblocage: 'abime',
      details: ['Baume de la cour d\'été (action bonus, 2 charges par repos long) : un allié récupère 1d6+3 PV.', 'Niv. 5 — 3 charges et +2 à tous ses soins.'],
      ajoute: ['baume_ete'], ressources: { baume: 2 },
      niv5: { ressources: { baume: 3 }, bonusSoin: 2, texte: 'Baume renforcé (3 charges, +2 aux soins)' } },
    { id: 'spores', nom: 'Cercle des Spores', icone: '🍄', desc: 'Un halo de spores ronge qui l\'approche.', deblocage: 'marais',
      details: ['Halo de spores : un ennemi qui le frappe au corps à corps subit 1d6 nécrotique.', 'Niv. 5 — Corps symbiotique : commence chaque combat avec des PV temporaires (4 + 2 × niveau).'],
      traits: { halo: '1d6' }, niv5: { traits: { egide: 4 }, texte: 'Corps symbiotique (PV temporaires au début du combat)' } }
  ],
  moine: [
    { id: 'main_ouverte', nom: 'Voie de la Main ouverte', icone: '✋', desc: 'Ses rafales renversent l\'ennemi.',
      details: ['Déluge renversant remplace Déluge de coups : chaque coup peut renverser (sauvegarde de DEX).', 'Niv. 5 — Plénitude physique : se soigne de 2d6+8 PV, une fois par repos long.'],
      remplace: { deluge: 'deluge_ouvert' }, ressources: { plenitude: 1 },
      niv5: { action: 'plenitude', texte: 'Plénitude physique' } },
    { id: 'ombre', nom: 'Voie de l\'Ombre', icone: '🌑', desc: 'Se cache et frappe depuis les ténèbres.', deblocage: 'eclipse',
      details: ['Pas de l\'ombre remplace Défense patiente : action bonus, devient caché (avantage à sa prochaine attaque), une fois par combat.', 'Niv. 5 — Voile d\'ombre : la première attaque qui le toucherait à chaque combat rate.'],
      remplace: { defense_patiente: 'pas_ombre' }, niv5: { traits: { voile: true }, texte: 'Voile d\'ombre' } },
    { id: 'elements', nom: 'Voie des Quatre Éléments', icone: '🌊', desc: 'Plie les éléments pour frapper toute une ligne.', deblocage: 'givre',
      details: ['Poing des quatre tonnerres (deux fois par combat) : 2d6 tonnerre sur toute la ligne Avant ennemie, qui recule.', 'Niv. 5 — Poings de l\'hiver : +1d6 froid à ses attaques d\'arme.'],
      ajoute: ['frappe_elements'], niv5: { traits: { armeElem: { des: '1d6', type: 'froid' } }, texte: 'Poings de l\'hiver (+1d6 froid)' } },
    { id: 'misericorde', nom: 'Voie de la Miséricorde', icone: '🤲', desc: 'Soigne d\'une main, tue de l\'autre.', deblocage: 'chateau',
      details: ['Main de guérison (action bonus, trois fois par combat) : un allié récupère 1d6+3 PV.', 'Niv. 5 — Main du trépas : +1d6 nécrotique à ses attaques d\'arme.'],
      ajoute: ['main_guerison'], niv5: { traits: { armeElem: { des: '1d6', type: 'nécrotique' } }, texte: 'Main du trépas (+1d6 nécrotique)' } }
  ],
  ensorceleur: [
    { id: 'draconique', nom: 'Lignée draconique', icone: '🐲', desc: 'Écailles protectrices, sorts de feu dévastateurs.',
      details: ['Résilience draconique : +3 PV maximum et +2 CA (écailles).', 'Niv. 5 — Affinité élémentaire : +3 aux dégâts de ses sorts de feu, et résistance au feu.'],
      pv: 3, ca: 2, niv5: { traits: { affinite: { type: 'feu', bonus: 3 }, resist: ['feu'] }, texte: 'Affinité élémentaire (feu +3, résistance)' } },
    { id: 'sauvage', nom: 'Magie sauvage', icone: '🎲', desc: 'Un sort sur trois déclenche un effet imprévisible.', deblocage: 'cote',
      details: ['Montée de magie sauvage : après un sort à emplacement, 1 chance sur 3 d\'un effet au hasard (soin, explosion sur les ennemis, emplacement récupéré, bouclier… ou une boule de feu qui touche aussi l\'équipe !).', 'Source de magie remplace Sort intensifié.', 'Niv. 5 — Contrôle du chaos : 1 chance sur 2, et les effets néfastes sont relancés une fois.'],
      remplace: { sort_intensifie: 'source_magie' }, traits: { magieSauvage: 0.34 }, niv5: { traits: { magieSauvage: 0.5, controleChaos: true }, texte: 'Contrôle du chaos' } },
    { id: 'tempete', nom: 'Sorcellerie des tempêtes', icone: '⛈️', desc: 'La foudre punit qui l\'approche.', deblocage: 'givre',
      details: ['Fureur de la tempête : foudroie deux fois par combat qui le frappe au corps à corps ; résistance à la foudre ; +2 aux dégâts de ses sorts de foudre.', 'Niv. 5 — Cœur de la tempête : +4 aux dégâts de ses sorts de foudre, résistance au tonnerre.'],
      ajoute: ['poigne_electrique'], traits: { colereTempete: 2, resist: ['foudre'], affinite: { type: 'foudre', bonus: 2 } },
      niv5: { traits: { affinite: { type: 'foudre', bonus: 4 }, resist: ['tonnerre'] }, texte: 'Cœur de la tempête (foudre +4)' } },
    { id: 'ame_divine', nom: 'Âme divine', icone: '😇', desc: 'Magie céleste : soigne et détourne le destin.', deblocage: 'tombeau',
      details: ['Magie divine : apprend Soins. Faveur des dieux : une fois par combat, un allié qui rate une sauvegarde la relance.', 'Niv. 5 — Guérison surnaturelle : +3 à tous ses soins.'],
      ajoute: ['soins'], traits: { presage: 1 }, niv5: { bonusSoin: 3, texte: 'Guérison surnaturelle (+3 aux soins)' } }
  ],
  artificier: [
    { id: 'artilleur', nom: 'Artilleur', icone: '💣', desc: 'Un canon occulte combat à ses côtés.',
      details: ['Canon occulte (action bonus, une fois par combat) : un canon tire tout seul après chacune de ses actions (1d6 force).', 'Niv. 5 — Canon renforcé : 1d10 force.'],
      ajoute: ['canon_occulte'], traits: { canon: '1d6' }, niv5: { traits: { canon: '1d10' }, texte: 'Canon renforcé (1d10)' } },
    { id: 'armurier', nom: 'Armurier', icone: '🦾', desc: 'Armure arcanique et gantelets tonnerre.', deblocage: 'souterrains',
      details: ['Armure arcanique : +1 CA et +4 PV maximum.', 'Gantelet tonnerre remplace l\'Arbalète : 1d8+3 tonnerre, la cible a désavantage à sa prochaine attaque.', 'Niv. 5 — Attaque supplémentaire.'],
      remplace: { arbalete_artificier: 'gantelet_tonnerre' }, ca: 1, pv: 4, niv5: { traits: { attaqueSupp: true }, texte: 'Attaque supplémentaire' } },
    { id: 'alchimiste', nom: 'Alchimiste', icone: '⚗️', desc: 'Élixirs qui soignent et renforcent.', deblocage: 'marais',
      details: ['Élixir expérimental remplace Infusion : 2d4+4 PV et un effet au hasard (béni, esquive, −20 Peur ou PV temporaires), une fois par combat.', 'Niv. 5 — Savant alchimiste : ses soins rendent 3 PV de plus.'],
      remplace: { infusion_arme: 'elixir' }, niv5: { traits: {}, bonusSoin: 3, texte: 'Savant alchimiste (+3 aux soins)' } },
    { id: 'forgeron', nom: 'Forgeron de bataille', icone: '🤖', desc: 'Un défenseur d\'acier se bat à ses côtés.', deblocage: 'dragon',
      details: ['Défenseur d\'acier : après chacune de ses actions, son automate frappe un ennemi de la ligne Avant (1d8+2 force).', 'Niv. 5 — Défenseur renforcé : 2d6+2.'],
      traits: { compagnon: '1d8+2', compagnonNom: 'Défenseur d\'acier', compagnonIcone: '🤖', compagnonType: 'force' },
      niv5: { traits: { compagnon: '2d6+2' }, texte: 'Défenseur renforcé (2d6+2)' } }
  ],
  occultiste: [
    { id: 'fielon', nom: 'Pacte du Fiélon', icone: '😈', desc: 'Se protège en tuant.',
      details: ['Bénédiction du ténébreux : chaque ennemi qu\'il tue lui donne 3 + niveau PV temporaires.', 'Niv. 5 — Résistance infernale : résistance au feu.'],
      traits: { tenebreux: true }, niv5: { traits: { resist: ['feu'] }, texte: 'Résistance au feu' } },
    { id: 'grand_ancien', nom: 'Pacte du Grand Ancien', icone: '🐙', desc: 'Fait monter la Peur des monstres.', deblocage: 'eclipse',
      details: ['Les monstres ont une jauge de Peur face à lui : 😟 Ébranlé à 50 (−2 au toucher et aux sauvegardes), 😱 Terrifié à 100 (un monstre ordinaire s\'enfuit ; un élite ou un boss perd son tour et retombe à 50). Morts-vivants et boss n\'en subissent que la moitié ; chaque monstre reprend 5 de courage par tour.', 'Esprit éveillé : ses dégâts psychiques ajoutent 15 Peur à la cible.', 'Chuchotements remplace Maléfice (tour de magie psychique) ; Murmures déments remplace Bras d\'Hadar (triangle de 3 ennemis, +20 Peur).', 'Niv. 5 — Pensées envahissantes : un monstre terrifié subit 3d6 psychique.'],
      remplace: { malefice: 'chuchotements', bras_hadar: 'murmures_dements' }, traits: { espritEveille: 15 },
      niv5: { traits: { penseesEnvahissantes: true }, texte: 'Pensées envahissantes (3d6 aux monstres terrifiés)' } },
    { id: 'archifee', nom: 'Pacte de l\'Archifée', icone: '🧚', desc: 'Charme les ennemis et s\'évapore dans la brume.', deblocage: 'marais',
      details: ['Présence féerique (une fois par combat) : tous les ennemis, sauvegarde de SAG ou charmés 1 tour.', 'Niv. 5 — Échappée brumeuse : la première attaque qui le toucherait à chaque combat rate.'],
      ajoute: ['presence_feerique'], niv5: { traits: { voile: true }, texte: 'Échappée brumeuse (voile)' } },
    { id: 'lame_maudite', nom: 'Pacte de la Lame maudite', icone: '🗡️', desc: 'Combattant au corps à corps armé d\'une lame de pacte.', deblocage: 'legion',
      details: ['Guerrier hexblade : apprend Lame du pacte (attaque au Charisme, 1d10+3), +1 CA, critique sur 19-20.', 'Niv. 5 — Lame assoiffée : deux coups avec les armes.'],
      ajoute: ['lame_pacte'], ca: 1, traits: { critAmeliore: 1 }, niv5: { traits: { attaqueSupp: true }, texte: 'Lame assoiffée (2 coups)' } }
  ]
};

// Niveau 6 : seconde capacité de chaque sous-classe (mêmes champs que niv5,
// plus pv, ca et ressources)
const NIV6_SOUS_CLASSES = {
  'guerrier/chevalier_occulte': { traits: { egide: 5 }, texte: 'Égide de guerre (PV temporaires au début du combat)' },
  'barbare/zelote': { traits: { phenix: true }, texte: 'Rage au-delà de la mort (la première fois qu\'il tombe à chaque combat, il se relève avec 10 PV)' },
  'paladin/conquete': { traits: { reduction: 2 }, texte: 'Esprit implacable (−2 à chaque coup subi)' },
  'moine/misericorde': { bonusSoin: 2, texte: 'Mains bénies (+2 aux soins)' },
  'artificier/forgeron': { traits: { compagnon: '2d8+2' }, texte: 'Défenseur perfectionné (2d8+2)' },
  'clerc/ruse': { traits: { cacheDebut: true }, texte: 'Linceul d\'ombre (commence chaque combat caché)' },
  'druide/spores': { traits: { halo: '2d6' }, texte: 'Halo nécrotique (2d6)' },
  'barde/murmures': { traits: { espritEveille: 15 }, texte: 'Mots de terreur (ses dégâts psychiques ajoutent 15 Peur)' },
  'roublard/eclaireur': { traits: { critAmeliore: 1 }, texte: 'Maître de l\'embuscade (critique sur 19-20)' },
  'rodeur/feerique': { traits: { armeElem: { des: '1d6', type: 'psychique' } }, texte: 'Coups enchanteurs (+1d6 psychique)' },
  'magicien/enchantement': { traits: { reduction: 2 }, texte: 'Esprit scindé (−2 à chaque coup subi)' },
  'ensorceleur/ame_divine': { ca: 1, traits: { presage: 2 }, texte: 'Ailes empyréennes (+1 CA, 2 faveurs par combat)' },
  'occultiste/lame_maudite': { traits: { reduction: 2 }, texte: 'Armure des maléfices (−2 à chaque coup subi)' },
  'guerrier/samourai': { traits: { critAmeliore: 1 }, texte: 'Frappe rapide (critique sur 19-20)' },
  'roublard/bretteur': { traits: { reduction: 2 }, texte: 'Élégance (−2 à chaque coup subi)' },
  'paladin/anciens': { traits: { survivant: 5 }, texte: 'Sentinelle immortelle (5 PV par tour sous la moitié des PV)' },
  'barde/glamour': { traits: { reduction: 2 }, texte: 'Beauté inébranlable (−2 à chaque coup subi)' },
  'druide/reves': { ressources: { baume: 4 }, texte: 'Havre des rêves (4 charges de baume)' },
  'moine/elements': { traits: { resist: ['feu', 'froid'] }, texte: 'Corps élémentaire (résistance au feu et au froid)' },
  'ensorceleur/tempete': { traits: { colereTempete: 4, affinite: { type: 'foudre', bonus: 6 } }, texte: 'Œil du cyclone (4 colères, foudre +6)' },
  'occultiste/archifee': { traits: { reduction: 3 }, texte: 'Défenses séduisantes (−3 à chaque coup subi)' },
  'clerc/lumiere': { traits: { affinite: { type: 'radiant', bonus: 5 } }, texte: 'Embrasement (radiant +5)' },
  'magicien/divination': { traits: { presage: 4, init: 3 }, texte: 'Troisième œil (4 présages, +3 initiative)' },
  'guerrier/champion': { traits: { critAmeliore: 2 }, texte: 'Critique supérieur (critique sur 18-20)' },
  'guerrier/maitre_guerre': { ressources: { superiorite: 6 }, texte: 'Supériorité accrue (6 dés de supériorité)' },
  'clerc/vie': { bonusSoin: 2, texte: 'Soins bénis (+2 à tous ses soins)' },
  'clerc/tempete': { traits: { colereTempete: 5, resist: ['foudre', 'tonnerre'] }, texte: 'Enfant de la tempête (5 colères, résistance foudre et tonnerre)' },
  'clerc/guerre': { traits: { attaqueSupp: true }, texte: 'Prêtre de guerre (2 coups avec les armes)' },
  'roublard/voleur': { traits: { reduction: 3 }, texte: 'Esquive instinctive (−3 à chaque coup subi)' },
  'roublard/assassin': { traits: { critAmeliore: 1 }, texte: 'Frappe mortelle (critique sur 19-20)' },
  'magicien/evocation': { traits: { evocation: 4 }, texte: 'Sorts surpuissants (+4 aux sorts à emplacement)' },
  'magicien/necromancie': { traits: { moisson: 4, resist: ['nécrotique'] }, texte: 'Maître des morts (moisson ×4, résistance nécrotique)' },
  'magicien/abjuration': { traits: { egide: 10 }, texte: 'Égide supérieure (10 PV temporaires)' },
  'barbare/berserker': { traits: { riposte: true }, texte: 'Représailles (contre-attaque quand on le rate)' },
  'barbare/ours': { pv: 8, traits: { reduction: 2 }, texte: 'Puissance de l\'ours (+8 PV max, −2 à chaque coup subi)' },
  'barbare/loup': { traits: { traqueur: true, init: 3 }, texte: 'Chasseur de meute (attaque en plus au 1er round, +3 initiative)' },
  'paladin/devotion': { traits: { reduction: 2, resist: ['psychique'] }, texte: 'Aura de dévotion (−2 à chaque coup subi, résistance psychique)' },
  'paladin/vengeance': { traits: { riposte: true }, texte: 'Ange vengeur (contre-attaque quand on le rate)' },
  'rodeur/chasseur': { traits: { reduction: 3 }, texte: 'Tactique défensive (−3 à chaque coup subi)' },
  'rodeur/traqueur': { traits: { colosse: '1d8' }, texte: 'Rafale du traqueur (+1d8 contre les cibles blessées)' },
  'rodeur/betes': { traits: { compagnon: '2d6' }, texte: 'Loup alpha (morsure 2d6)' },
  'barde/savoir': { sort: 'eclair', texte: 'Secrets magiques : Éclair' },
  'barde/vaillance': { ca: 1, traits: { reduction: 2 }, texte: 'Vaillance (+1 CA, −2 à chaque coup subi)' },
  'druide/terre': { traits: { recuperation: 4, resist: ['poison'] }, texte: 'Récupération naturelle (4 niveaux) et résistance au poison' },
  'druide/lune': { traits: { formeOurs: 26 }, texte: 'Ours primordial (26 PV temporaires)' },
  'moine/main_ouverte': { ressources: { plenitude: 2 }, texte: 'Intégrité du corps (2 Plénitudes)' },
  'moine/ombre': { traits: { cacheDebut: true }, texte: 'Foulée d\'ombre (commence chaque combat caché)' },
  'ensorceleur/draconique': { traits: { affinite: { type: 'feu', bonus: 5 } }, texte: 'Souffle du dragon (feu +5)' },
  'ensorceleur/sauvage': { traits: { magieSauvage: 0.65 }, texte: 'Déferlante (2 sorts sur 3 déclenchent la magie sauvage)' },
  'artificier/artilleur': { traits: { canon: '2d8' }, texte: 'Canon explosif (2d8)' },
  'artificier/armurier': { ca: 1, pv: 4, texte: 'Armure perfectionnée (+1 CA, +4 PV max)' },
  'artificier/alchimiste': { bonusSoin: 2, texte: 'Réactifs restaurateurs (+2 aux soins)' },
  'occultiste/fielon': { traits: { reduction: 3 }, texte: 'Résilience fiélonne (−3 à chaque coup subi)' },
  'occultiste/grand_ancien': { traits: { espritEveille: 25 }, texte: 'Bouclier entropique (ses dégâts psychiques ajoutent 25 Peur)' }
};
for (const [k, g] of Object.entries(NIV6_SOUS_CLASSES)) {
  const [c, id] = k.split('/'), sc = SOUS_CLASSES[c].find(x => x.id === id);
  sc.niv6 = g;
  sc.details.push(`Niv. 6 — ${g.texte}.`);
}

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
  const g = sc && sc['niv' + niv], gains = [];
  if (!g) return [];
  ajouterTraits(pj, g.traits);
  if (g.bonusSoin) pj.bonusSoin += g.bonusSoin;
  if (g.pv) { pj.pvMax += g.pv; if (pj.pv > 0) pj.pv += g.pv; }
  if (g.ca) pj.ca += g.ca;
  for (const id of [g.action, g.sort].filter(Boolean)) {
    const t = apprendre(pj, id);
    if (t && t.includes('grimoire')) gains.push(t);
  }
  gains.unshift(`${sc.icone} ${g.texte}`);
  return gains;
}

// Ressources du héros (classe + sous-classe), restaurées au repos long
function ressourcesPJ(pj) {
  const sc = pj.sousClasse && sousClasse(pj.classe, pj.sousClasse), c = CLASSES[pj.classe];
  const niv = pj.niveau || 3;
  return { ...(c.ressources || {}), ...(niv >= 5 ? c.ressourcesNiv5 || {} : {}), ...((sc && sc.ressources) || {}),
    ...[4, 5, 6, 7].reduce((r, n) => ({ ...r, ...(sc && niv >= n && sc['niv' + n] && sc['niv' + n].ressources || {}) }), {}) };
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
  if (sc && sc.reposCourtUn) {
    const base = ressourcesPJ(pj);
    for (const r of sc.reposCourtUn) if ((pj.ressources[r] || 0) < base[r]) { pj.ressources[r]++; lignes.push(`${pj.icone} ${pj.nom} récupère une charge (${pj.ressources[r]}/${base[r]}).`); }
  }
  // Magicien : restauration arcanique, une fois par repos long (moitié de son niveau en niveaux de sorts)
  let budget = pj.traits.recuperation || 0, gagne = 0;
  if (pj.ressources && pj.ressources.restauration > 0 && Object.values(pj.emplacements).some(e => e.restant < e.max)) {
    pj.ressources.restauration--;
    budget += Math.ceil((pj.niveau || 3) / 2);
    lignes.push(`${pj.icone} ${pj.nom} étudie son grimoire : restauration arcanique.`);
  }
  // Cercle de la Terre : emplacements pour un total de N niveaux, les plus hauts d'abord
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
