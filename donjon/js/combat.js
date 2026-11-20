// =====================================================================
// Moteur de combat au tour par tour (règles inspirées de D&D 5e).
// Indépendant de l'affichage : l'interface lit l'état et appelle
// `jouer(acteur, action, cible)` pour les PJ. Les monstres jouent seuls.
// =====================================================================

// États : `finDebut` = retiré au début du tour de la créature qui le porte
// (effets « jusqu'à votre prochain tour »), sinon décompté à la fin de son tour.
const ETATS = {
  etourdi: { nom: 'Étourdi', icone: '💫', desc: 'Perd son prochain tour.' },
  endormi: { nom: 'Endormi', icone: '💤', desc: 'Perd ses tours ; les attaques contre lui ont avantage. Se réveille s\'il subit des dégâts.' },
  renverse: { nom: 'À terre (renversé)', icone: '🤕', desc: 'Les attaques contre lui ont avantage. Se relève au début de son tour.', finDebut: true },
  empoisonne: { nom: 'Empoisonné', icone: '🤢', desc: 'Désavantage aux jets d\'attaque.' },
  entrave: { nom: 'Gelé', icone: '🧊', desc: 'Désavantage à sa prochaine attaque.' },
  benit: { nom: 'Béni', icone: '✨', desc: '+1d4 aux jets d\'attaque et de sauvegarde.' },
  defi: { nom: 'Défi', icone: '📣', desc: '+2 CA, attire les attaques.', finDebut: true },
  esquive: { nom: 'Esquive', icone: '🌪️', desc: 'Les attaques contre lui ont désavantage.', finDebut: true },
  bouclier: { nom: 'Bouclier', icone: '🔰', desc: '+5 CA.', finDebut: true },
  cache: { nom: 'Caché', icone: '🌑', desc: 'Prochaine attaque avec avantage.', permanent: true },
  rage: { nom: 'Rage', icone: '😡', desc: '+2 aux dégâts d\'arme, moitié des dégâts tranchants, perforants et contondants.' },
  temeraire: { nom: 'Téméraire', icone: '🎯', desc: 'Les attaques contre lui ont avantage.', finDebut: true },
  inspire: { nom: 'Inspiré', icone: '🎵', desc: '+1d6 à la prochaine attaque ou sauvegarde.', permanent: true },
  ecorce: { nom: 'Peau d\'écorce', icone: '🌳', desc: '+3 CA.' },
  marque: { nom: 'Marqué', icone: '🎯', desc: 'Le chasseur qui l\'a marqué inflige +1d6 dégâts.', permanent: true },
  agathys: { nom: 'Armure d\'Agathys', icone: '❄️', desc: '+2 CA ; un ennemi qui le frappe au corps à corps subit 5 dégâts de froid.' },
  maudit: { nom: 'Marqué par le culte', icone: '🩸', desc: '+5 Peur au début de chacun de ses tours.' },
  heroique: { nom: 'Héroïque', icone: '🌟', desc: 'Vertu née de la peur : +2 au toucher et aux dégâts jusqu\'à la fin du combat.', permanent: true },
  fervent: { nom: 'Ferveur fanatique', icone: '🔥', desc: '+1d4 aux attaques et sauvegardes (bénédiction impie).' },
  voile: { nom: 'Voile d\'ombre', icone: '🌫️', desc: 'La prochaine attaque qui le toucherait rate.', permanent: true },
  affaibli: { nom: 'Affaibli', icone: '🦴', desc: 'Inflige moitié dégâts avec ses armes.' },
  armeSacree: { nom: 'Arme sacrée', icone: '🌟', desc: '+2 au toucher avec les armes.' },
  inimitie: { nom: 'Vœu d\'inimitié', icone: '🔥', desc: 'Le paladin qui l\'a juré a l\'avantage contre lui.' },
  ours: { nom: 'Forme d\'ours', icone: '🐻', desc: 'Druide changé en ours tant qu\'il lui reste des PV temporaires.', permanent: true },
  vengeance: { nom: 'Vengeance', icone: '⚔️', desc: '+2 au toucher et aux dégâts jusqu\'à la fin du combat.', permanent: true },
  ebranle: { nom: 'Ébranlé', icone: '😟', desc: 'Peur du monstre ≥ 50 : −2 au toucher et aux sauvegardes.', permanent: true }
};

const PEUR = {
  critiqueSubi: 20,      // un ennemi réussit un critique sur ce PJ
  critiqueAllie: 5,      // un ennemi réussit un critique sur un allié
  allieATerre: 15,       // un allié tombe à 0 PV
  critiqueInflige: -5,   // un PJ réussit un critique (toute l'équipe)
  ennemiTue: -5,         // le PJ tue un ennemi
  grosCoup: 8,           // un coup qui retire au moins 30 % des PV max
  combatLong: 4,         // à chaque round à partir du 5e (toute l'équipe)
  seuilAnxieux: 50,      // −1 au toucher et aux sauvegardes
  seuilCrise: 100,       // crise : trouble (ou, rarement, vertu)
  chanceVertu: 0.25,
  victoire: -10          // fin de combat victorieuse
};

// ---------------------------------------------------------------------
// Dédale du Chaos : mutations des monstres et pouvoirs des boss
// ---------------------------------------------------------------------
const MUTATIONS_CHAOS = {
  robuste: { nom: 'Robuste', icone: '💪', desc: '+40 % de PV.' },
  blinde: { nom: 'Blindé', icone: '🛡️', desc: '+2 CA.' },
  enrage: { nom: 'Enragé', icone: '😤', desc: '+2 au toucher et aux dégâts, +1 au DD.' },
  vampire: { nom: 'Vampirique', icone: '🩸', desc: 'Récupère la moitié des dégâts qu\'il inflige.' },
  epineux: { nom: 'Épineux', icone: '🌵', desc: 'Qui le frappe au corps à corps subit 1d6 perforant.' },
  regenerant: { nom: 'Régénérant', icone: '💚', desc: 'Récupère 3 PV au début de son tour.' },
  terrifiant: { nom: 'Terrifiant', icone: '👁️', desc: 'Chaque blessure qu\'il inflige ajoute 8 Peur.' },
  rapide: { nom: 'Rapide', icone: '⚡', desc: 'Agit deux fois par tour, mais −40 % de PV.' }
};
const POUVOIRS_BOSS = {
  renaissance: { nom: 'Renaissance', icone: '🔥', desc: 'La première fois qu\'il tombe, il se relève avec 40 % de ses PV.' },
  invocateur: { nom: 'Invocateur', icone: '💀', desc: 'Tous les 3 rounds, appelle un monstre en renfort (4 ennemis au plus).' },
  terreur: { nom: 'Aura de terreur', icone: '😱', desc: 'À chacun de ses tours, toute l\'équipe gagne 6 Peur.' },
  fleau: { nom: 'Fléau', icone: '☠️', desc: 'À chacun de ses tours, un héros au hasard subit 2d6 nécrotique.' },
  carapace: { nom: 'Carapace', icone: '🐚', desc: 'Moitié des dégâts tant qu\'un autre ennemi est debout.' },
  furie: { nom: 'Furie', icone: '😡', desc: 'Sous la moitié de ses PV, agit une fois de plus par tour.' }
};
const RENFORTS_CHAOS = ['squelette', 'zombie', 'gobelin', 'loup', 'cultiste', 'kobold', 'gnoll', 'spectre'];

// Peur des monstres (Pacte du Grand Ancien) : Ébranlé à 50, Terrifié à 100
const PEUR_MONSTRES = { seuilEbranle: 50, malus: 2, recuperation: 5 };

// Crises de Peur (à 100) : désavantage + un trouble ; disparaissent quand la Peur repasse sous 50
const CRISES = {
  terreur: { nom: 'Terreur', icone: '😱', desc: 'Désavantage ; une chance sur deux de rester paralysé à son tour.' },
  rage_aveugle: { nom: 'Rage aveugle', icone: '🤬', desc: 'Désavantage ; une chance sur deux de frapper un ennemi au hasard au lieu d\'agir.' },
  desespoir: { nom: 'Désespoir', icone: '😭', desc: 'Désavantage ; ses lamentations ajoutent 6 Peur aux alliés à chacun de ses tours.' },
  egoisme: { nom: 'Égoïsme', icone: '🙄', desc: 'Désavantage ; refuse l\'aide : les soins des autres héros sont divisés par deux.' }
};
// Renvoie 'heroique' (vertu : la Peur retombe à 40) ou la clé d'une crise (posée sur pj.crise)
function tirerCrise(pj) {
  if (Math.random() < PEUR.chanceVertu) { pj.peur = 40; return 'heroique'; }
  pj.crise = Des.hasard(Object.keys(CRISES));
  return pj.crise;
}

class Combat {
  // rencontre : { avant: [ids], arriere: [ids] }
  constructor(equipe, rencontre, jeu, force) {
    this.jeu = jeu;
    // Puissance des monstres selon l'étage : { pv, toucher, degats, dd, ca }
    this.force = Object.assign({ pv: 1, toucher: 0, degats: 0, dd: 0, ca: 0 }, force || {});
    if (typeof RENFORT_GLOBAL !== 'undefined') for (const k in RENFORT_GLOBAL) this.force[k] = (this.force[k] || 0) + RENFORT_GLOBAL[k];
    this.pjs = equipe;                 // chaque combattant a une `ligne` : 'avant' ou 'arriere'
    this.ennemis = [];
    this.journal = [];
    this.evenements = [];              // événements à animer par l'interface
    this.finAnim = 0;
    this.round = 0;
    this.ordre = [];
    this.indexTour = -1;
    this.actif = null;
    this.fini = false;
    this.resultat = null;
    this.compteur = 0;
    this.sortsTouches = new Set();
    this.niveauSort = 0;
    this.surMaj = () => {};
    this.surFin = () => {};
    this.delaiMonstre = 450;
    this.vitesse = 1;                  // 2 = animations accélérées

    const liste = [...rencontre.avant.map(id => [id, 'avant']), ...rencontre.arriere.map(id => [id, 'arriere'])];
    const noms = {};
    liste.forEach(([id]) => { noms[id] = (noms[id] || 0) + 1; });
    const lettres = {};
    for (const [id, ligne] of liste) {
      let suffixe = '';
      if (noms[id] > 1) { lettres[id] = (lettres[id] || 0) + 1; suffixe = ' ' + 'ABCDEF'[lettres[id] - 1]; }
      const m = this.creerMonstre(id, suffixe);
      m.ligne = ligne;
      this.ennemis.push(m);
    }
  }

  creerMonstre(id, suffixe = '') {
    const d = MONSTRES[id], f = this.force || { pv: 1, toucher: 0, degats: 0, dd: 0, ca: 0 };
    const pv = Math.round(d.pv * f.pv);
    const actions = d.actions.map(a => {
      const b = { ...a };
      if (typeof a.jet === 'number') b.jet = a.jet + f.toucher;
      if (typeof a.dd === 'number') b.dd = a.dd + f.dd;
      if (a.degats && f.degats) b.degats = a.degats + '+' + f.degats;
      return b;
    });
    return {
      id: 'm' + (++this.compteur), modele: id, camp: 'ennemi',
      nom: d.nom + suffixe, icone: d.icone,
      pv, pvMax: pv, ca: d.ca + f.ca, caracs: d.caracs,
      actions, etats: {}, usages: {}, recharges: {}, traits: { ...(d.traits || {}) },
      boss: !!d.boss, elite: !!d.elite
    };
  }

  // ------------------------------------------------------------ outils
  log(html, classe = '') { this.journal.push({ html, classe }); }
  // L'interface renvoie la durée (ms) des animations lancées
  maj() {
    const d = this.surMaj() || 0;
    if (d) this.finAnim = Date.now() + d;
    return d;
  }
  resteAnim() { return Math.max(0, this.finAnim - Date.now()); }
  attente(ms) { return ms / (this.vitesse || 1); }
  evt(e) { this.evenements.push(e); }
  // Retire les ennemis morts (gardés le temps de l'animation)
  nettoyer() {
    for (let i = this.ennemis.length - 1; i >= 0; i--) if (this.ennemis[i].pv <= 0) this.ennemis.splice(i, 1);
  }
  camp(c) { return c.camp === 'pj' ? this.pjs : this.ennemis; }
  adversaires(c) { return c.camp === 'pj' ? this.ennemis : this.pjs; }
  ligne(c) { return c.ligne; }
  nomLigne(l) { return l === 'avant' ? 'Avant' : 'Arrière'; }
  // Lignes réellement atteignables dans un groupe : si personne n'est debout
  // en ligne Avant, la ligne Arrière est exposée au corps à corps.
  lignesAtteignables(groupe, vise) {
    if (vise.includes('avant') && !vise.includes('arriere') && !groupe.some(c => c.ligne === 'avant' && c.pv > 0)) return ['avant', 'arriere'];
    return vise;
  }
  deplacer(c, ligne) {
    if (c.ligne === ligne) return;
    c.ligne = ligne;
    this.evt({ t: 'deplacement', cible: c.id, ligne });
  }
  debout(c) { return c.pv > 0; }
  nomHtml(c) { return `<b class="${c.camp === 'pj' ? 'n-pj' : 'n-en'}">${c.nom}</b>`; }
  panique(c) { return c.camp === 'pj' && !!c.crise; }
  malusPeur(c) {
    if (c.camp !== 'pj') return c.etats.ebranle ? -PEUR_MONSTRES.malus : 0;
    return !c.crise && c.peur >= PEUR.seuilAnxieux ? -1 : 0;
  }

  modele(c) { return c.camp === 'ennemi' ? MONSTRES[c.modele] : null; }

  // --------------------------------------------------------- démarrage
  demarrer() {
    this.log('⚔️ <b>Le combat commence !</b>', 'titre');
    for (const pj of this.pjs) {
      pj.etats = {};
      pj.usages = {};
      pj.motsRound = pj.riposteRound = 0;
      pj.egide = 0;
      if (pj.pv <= 0) this.log(`${this.nomHtml(pj)} est toujours à terre (0 PV) : soignez-le pour qu'il se relève.`, 'mauvais');
      if (pj.pv <= 0) continue;
      if (pj.crise) this.log(`${CRISES[pj.crise].icone} ${this.nomHtml(pj)} est toujours en proie à : <b>${CRISES[pj.crise].nom}</b>.`, 'mauvais');
      const t = pj.traits;
      if (t.cacheDebut) pj.etats.cache = 99;
      if (t.voile) pj.etats.voile = 99;
      if (t.phenix) pj.usages.phenixDispo = true;
      pj.egide = t.egide ? 2 * (pj.niveau || 3) + t.egide : 0;
      if (pj.egide) this.log(`💠 ${this.nomHtml(pj)} lève son égide arcanique (${pj.egide} PV).`, 'bon');
      if (t.manaDebut && pj.emplacements[1] && pj.emplacements[1].restant < pj.emplacements[1].max) {
        pj.emplacements[1].restant++;
        this.log(`🔮 ${this.nomHtml(pj)} récupère un emplacement de sort (pierre de mana).`, 'bon');
      }
      if (t.peurDebut) { this.log(`🪓 Une malédiction murmure à ${this.nomHtml(pj)}…`, 'mauvais'); this.modifierPeur(pj, t.peurDebut); }
    }
    // Encensoir / relique : toute l'équipe bénie 2 tours
    if (this.pjs.some(p => p.pv > 0 && p.traits.benitDebut)) {
      this.log('🪔 Un parfum sacré se répand : l\'équipe est bénie.', 'bon');
      for (const p of this.pjs) if (p.pv > 0) p.etats.benit = 3;
    }
    // Pacte du Grand Ancien : les monstres ont une jauge de Peur
    this.peurMonstres = this.pjs.some(p => p.pv > 0 && p.traits.espritEveille);
    for (const e of this.ennemis) e.peur = 0;
    // Initiative
    const tous = [...this.pjs, ...this.ennemis];
    const lignes = [];
    for (const c of tous) {
      const mod = modCarac(c.caracs.DEX) + ((c.traits && c.traits.init) || 0);
      const r = Des.d20();
      c.initiative = r.nat + mod + Math.random() * 0.1; // départage
      lignes.push(`${c.nom} ${r.texte}${signe(mod)} = <b>${r.nat + mod}</b>`);
    }
    this.log('🎲 Initiative : ' + lignes.join(' · '), 'jet');
    this.ordre = tous.sort((a, b) => b.initiative - a.initiative);
    this.nouveauRound();
  }

  nouveauRound() {
    this.round++;
    this.indexTour = -1;
    this.log(`— Round ${this.round} —`, 'round');
    if (this.round >= 5) {
      this.log('😰 Le combat s\'éternise : l\'angoisse monte dans l\'équipe.', 'peur');
      for (const p of this.pjs) if (p.pv > 0) this.modifierPeur(p, PEUR.combatLong, true);
    }
    this.prochainTour();
  }

  prochainTour() {
    if (this.fini) return;
    this.nettoyer();
    this.indexTour++;
    if (this.indexTour >= this.ordre.length) return this.nouveauRound();
    const c = this.ordre[this.indexTour];
    if (c.camp === 'ennemi' && !this.ennemis.includes(c)) return this.prochainTour();
    if (c.pv <= 0) return this.prochainTour();
    this.actif = c;
    this.attenteJoueur = false;
    c.sournoiseUtilisee = false;
    c.colosseUtilise = false;
    c.bonusUtilise = false;
    c.aJoue = true;

    // Effets de début de tour
    for (const e in c.etats) if (ETATS[e] && ETATS[e].finDebut) delete c.etats[e];
    for (const id in c.recharges) if (c.recharges[id] > 0) c.recharges[id]--;
    if (c.traits && c.traits.regen && c.pv < c.pvMax) {
      const avant = c.pv;
      c.pv = Math.min(c.pvMax, c.pv + c.traits.regen);
      this.log(c.camp === 'pj' ? `💍 ${this.nomHtml(c)} récupère ${c.pv - avant} PV (objet).` : `💚 ${this.nomHtml(c)} se régénère : +${c.pv - avant} PV.`, c.camp === 'pj' ? 'bon' : 'mauvais');
      this.evt({ t: 'soin', cible: c.id, n: c.pv - avant, pvAvant: avant, pvApres: c.pv, pvMax: c.pvMax });
    }
    if (c.traits && c.traits.saigne && c.pv > 1) {
      const perte = Math.min(c.traits.saigne, c.pv - 1);
      c.pv -= perte;
      this.log(`🩸 L'anneau de sang prélève ${perte} PV à ${this.nomHtml(c)}.`, 'mauvais');
      this.evt({ t: 'degats', cible: c.id, n: perte, crit: false, pvAvant: c.pv + perte, pvApres: c.pv, pvMax: c.pvMax });
    }

    if (c.traits && c.traits.survivant && c.pv > 0 && c.pv < c.pvMax / 2) {
      const avant = c.pv;
      c.pv = Math.min(c.pvMax, c.pv + c.traits.survivant);
      this.log(`🏆 ${this.nomHtml(c)} serre les dents : +${c.pv - avant} PV (survivant).`, 'bon');
      this.evt({ t: 'soin', cible: c.id, n: c.pv - avant, pvAvant: avant, pvApres: c.pv, pvMax: c.pvMax });
    }
    if (c.camp === 'pj' && c.traits.frenesie && c.etats.rage) {
      this.log(`🩸 La frénésie épuise ${this.nomHtml(c)}.`, 'peur');
      this.modifierPeur(c, 5, true);
    }
    // Un monstre effrayé reprend peu à peu courage
    if (c.camp === 'ennemi' && c.peur > 0) {
      c.peur = Math.max(0, c.peur - PEUR_MONSTRES.recuperation);
      this.evt({ t: 'peur', cible: c.id, n: -PEUR_MONSTRES.recuperation, avant: c.peur + PEUR_MONSTRES.recuperation, apres: c.peur });
      if (c.etats.ebranle && c.peur < PEUR_MONSTRES.seuilEbranle) delete c.etats.ebranle;
    }
    if (c.camp === 'ennemi' && c.chaos && c.pv > 0) this.pouvoirsDebutTour(c);
    if (c.camp === 'pj' && c.etats.maudit) {
      this.log(`🩸 La marque du culte ronge l'esprit de ${this.nomHtml(c)}.`, 'peur');
      this.modifierPeur(c, 5);
    }
    if (c.camp === 'pj' && c.crise && this.tourDeCrise(c)) return;

    if (c.etats.etourdi || c.etats.endormi) {
      this.log(`${ETATS[c.etats.etourdi ? 'etourdi' : 'endormi'].icone} ${this.nomHtml(c)} ${c.etats.etourdi ? 'est étourdi' : 'dort'} et perd son tour.`);
      this.evt({ t: 'texte', cible: c.id, texte: ETATS[c.etats.etourdi ? 'etourdi' : 'endormi'].icone, classe: 'etat' });
      const d = this.maj();
      return setTimeout(() => this.finTour(c), d + this.attente(500));
    }

    if (c.camp === 'pj') {
      this.attenteJoueur = true;
      this.maj(); // attente du joueur
    } else {
      this.maj();
      setTimeout(() => this.tourMonstre(c), this.attente(this.delaiMonstre));
    }
  }

  finTour(c) {
    if (this.fini) return;
    for (const e of Object.keys(c.etats)) {
      if (ETATS[e] && (ETATS[e].finDebut || ETATS[e].permanent)) continue;
      c.etats[e]--;
      if (c.etats[e] <= 0) delete c.etats[e];
    }
    this.actif = null;
    if (this.verifierFin()) return;
    this.prochainTour();
  }

  verifierFin() {
    if (this.ennemis.every(e => e.pv <= 0)) {
      this.fini = true;
      this.resultat = 'victoire';
      this.log('🏆 <b>Victoire !</b> La Peur de l\'équipe diminue.', 'titre bon');
      for (const pj of this.pjs) {
        if (pj.pv > 0) this.modifierPeur(pj, PEUR.victoire, true);
        pj.etats = {};
      }
      this.maj();
      setTimeout(() => this.surFin('victoire'), this.resteAnim() + this.attente(900));
      return true;
    }
    if (this.pjs.every(p => p.pv <= 0)) {
      this.fini = true;
      this.resultat = 'defaite';
      this.log('💀 <b>Toute l\'équipe est à terre…</b>', 'titre mauvais');
      this.maj();
      setTimeout(() => this.surFin('defaite'), this.resteAnim() + this.attente(1200));
      return true;
    }
    return false;
  }

  // Prochain héros debout dans l'ordre d'initiative (pour l'aperçu)
  prochainPJ() {
    const n = this.ordre.length;
    for (let k = 1; k <= n; k++) {
      const c = this.ordre[(this.indexTour + k) % n];
      if (c && c.camp === 'pj' && c.pv > 0) return c;
    }
    return null;
  }

  // ------------------------------------------------- disponibilité
  // Renvoie { ok, raison }
  disponibilite(acteur, action) {
    if (!action.depuis.includes(acteur.ligne)) return { ok: false, raison: `Seulement depuis la ligne ${this.nomLigne(action.depuis[0])}` };
    if (action.niveau && !this.emplacementDispo(acteur, action.niveau)) return { ok: false, raison: 'Plus d\'emplacement' };
    if (action.parCombat && (acteur.usages[action.nom] || 0) >= action.parCombat) return { ok: false, raison: 'Déjà utilisée' };
    if (action.ressource && !((acteur.ressources || {})[action.ressource] > 0)) return { ok: false, raison: 'Épuisée (repos)' };
    if (action.requiertEtat && !acteur.etats[action.requiertEtat]) return { ok: false, raison: `Seulement en ${ETATS[action.requiertEtat].nom.toLowerCase()}` };
    if (action.pasSiActif && action.etat && acteur.etats[action.etat.nom]) return { ok: false, raison: 'Déjà active' };
    if (this.estActionBonus(acteur, action) && acteur.bonusUtilise) return { ok: false, raison: 'Action bonus déjà utilisée' };
    if (action.recharge && acteur.recharges && acteur.recharges[action.nom] > 0) return { ok: false, raison: 'En recharge' };
    if (action.consommable && this.jeu.stock(action.consommable) <= 0) return { ok: false, raison: 'Épuisé' };
    if (action.special === 'sac') return Object.keys(ACTIONS_SAC).some(k => this.jeu.stock(ACTIONS_SAC[k].consommable) > 0) ? { ok: true } : { ok: false, raison: 'Sac vide' };
    if (action.special === 'invoquer' && this.ennemis.filter(e => e.pv > 0).length >= 4) return { ok: false, raison: 'Pas de place' };
    if (action.cible !== 'soi' && this.ciblesValides(acteur, action).length === 0) return { ok: false, raison: 'Aucune cible' };
    return { ok: true };
  }

  emplacementDispo(c, niveau) {
    if (!c.emplacements) return null;
    for (let n = niveau; n <= 9; n++) if (c.emplacements[n] && c.emplacements[n].restant > 0) return n;
    return null;
  }

  // Zone en triangle : la cible + ses voisins les plus proches (même ligne, puis l'autre ligne)
  cibleTriangle(acteur, action, cible) {
    const valides = this.ciblesValides(acteur, action);
    const groupe = this.adversaires(acteur);
    const rang = c => groupe.filter(x => x.ligne === c.ligne).indexOf(c);
    const autres = valides.filter(c => c !== cible).sort((x, y) => {
      const dx = (x.ligne === cible.ligne ? 0 : 1.5) + Math.abs(rang(x) - rang(cible));
      const dy = (y.ligne === cible.ligne ? 0 : 1.5) + Math.abs(rang(y) - rang(cible));
      return dx - dy;
    });
    return [cible, ...autres.slice(0, action.triangle - 1)];
  }
  ciblesValides(acteur, action) {
    if (action.cible === 'soi') return [acteur];
    const groupe = action.cible === 'ennemi' ? this.adversaires(acteur) : this.camp(acteur);
    const lignes = action.cible === 'ennemi' ? this.lignesAtteignables(groupe, action.vise) : action.vise;
    return groupe.filter(c => {
      if (!lignes.includes(c.ligne)) return false;
      if (action.cible === 'ennemi') return c.pv > 0;
      // alliés
      if (action.vivantsSeulement && c.pv <= 0) return false;
      if (c.pv <= 0 && !(action.type === 'soin' || action.inclureATerre)) return false;
      return true;
    });
  }

  // ----------------------------------------------------- exécution
  jouer(acteur, action, cible) {
    if (this.fini || this.actif !== acteur || !this.attenteJoueur) return;
    this.attenteJoueur = false;
    this.executer(acteur, action, cible);
    const bonus = this.estActionBonus(acteur, action);
    if (!bonus) this.attaqueCompagnon(acteur);
    const d = this.maj();
    if (this.verifierFin()) return;
    // Action bonus (rage, maléfice…) : le héros garde son tour
    if (bonus && acteur.pv > 0) {
      acteur.bonusUtilise = true;
      this.log(`⚡ Action bonus : ${this.nomHtml(acteur)} peut encore agir.`, 'bon');
      setTimeout(() => { if (this.fini || this.actif !== acteur) return; this.attenteJoueur = true; this.maj(); }, d + this.attente(150));
      return;
    }
    setTimeout(() => this.finTour(acteur), d + this.attente(250));
  }

  // Action bonus : par nature, ou objet du sac pour un Voleur (mains lestes)
  estActionBonus(a, act) { return !!(act.actionBonus || (act.consommable && a.traits && a.traits.mainsLestes)); }

  // Maître des bêtes : le loup mord un ennemi de la ligne Avant
  attaqueCompagnon(a) {
    if (!a.traits || !a.traits.compagnon || a.pv <= 0) return;
    const morsure = { nom: 'Morsure du loup', icone: '🐺', type: 'attaque', compagnon: true, jet: 4, degats: a.traits.compagnon, typeDeg: 'perforant', cible: 'ennemi', vise: ['avant'], depuis: ['avant', 'arriere'] };
    const cibles = this.ciblesValides(a, morsure);
    if (!cibles.length) return;
    const c = cibles.sort((x, y) => x.pv - y.pv)[0];
    this.log(`🐺 Le loup de ${this.nomHtml(a)} bondit sur ${this.nomHtml(c)} !`, 'action');
    this.evt({ t: 'action', source: a.id, camp: a.camp, nom: 'Loup', icone: '🐺', cibles: [c.id], melee: false, distance: true, typeAct: 'attaque', typeDeg: 'perforant' });
    this.resoudreAttaque(a, morsure, c, 0);
  }

  executer(a, act, cible) {
    // Coûts
    let coutTxt = '';
    if (act.niveau) {
      const n = this.emplacementDispo(a, act.niveau);
      a.emplacements[n].restant--;
      coutTxt = ` <span class="cout">(emplacement niv. ${n})</span>`;
      this.niveauSort = n;
      if (a.traits && a.traits.egide) {
        const max = 2 * (a.niveau || 3) + a.traits.egide, avant = a.egide || 0;
        a.egide = Math.min(max, avant + 2 * n);
        if (a.egide > avant) this.log(`💠 L'égide de ${this.nomHtml(a)} se recharge (${a.egide} PV).`, 'bon');
      }
    }
    if (act.parCombat) a.usages[act.nom] = (a.usages[act.nom] || 0) + 1;
    if (act.ressource && a.ressources) a.ressources[act.ressource]--;
    if (act.consommable) this.jeu.retirerStock(act.consommable);
    if (act.niveau && a.traits && a.traits.sangSort && a.pv > 1) {
      const perte = Math.min(a.traits.sangSort, a.pv - 1);
      a.pv -= perte;
      this.log(`📕 Le grimoire interdit draine ${perte} PV à ${this.nomHtml(a)}.`, 'mauvais');
      this.evt({ t: 'degats', cible: a.id, n: perte, crit: false, pvAvant: a.pv + perte, pvApres: a.pv, pvMax: a.pvMax });
    }
    if (act.recharge) a.recharges[act.nom] = act.recharge;

    if (act.deplacement === 'avant' && a.ligne !== 'avant') {
      this.deplacer(a, 'avant');
      this.log(`${this.nomHtml(a)} s'élance en ligne Avant !`);
    }

    const cibleTxt = (act.zone || act.cible === 'soi' || !cible) ? '' : ` sur ${this.nomHtml(cible)}`;
    this.log(`${act.icone || '▶'} ${this.nomHtml(a)} utilise <i>${act.nom}</i>${cibleTxt}${coutTxt}`, 'action');

    this.sortsTouches = new Set();
    const cibles = act.zone ? this.ciblesValides(a, act) : act.cible === 'soi' ? [a] : act.triangle && cible ? this.cibleTriangle(a, act, cible) : [cible];
    const distance = act.cible === 'ennemi' && (act.sort || act.vise.includes('arriere') || act.type === 'sauvegarde' || act.type === 'auto');
    this.evt({ t: 'action', source: a.id, camp: a.camp, nom: act.nom, icone: act.icone || '✦',
      cibles: cibles.map(c => c.id), melee: act.cible === 'ennemi' && !distance, distance,
      typeAct: act.type, typeDeg: act.typeDeg, sort: !!act.sort, special: act.special || null });

    if (act.etatLanceur) this.appliquerEtat(a, act.etatLanceur.nom, act.etatLanceur.duree);
    switch (act.type) {
      case 'attaque':
        for (const c of cibles) {
          // Attaque supplémentaire (Guerrier niv. 5) : deux coups avec les armes
          const nb = this.nombreAttaques(a, act);
          let cible = c;
          for (let i = 0; i < nb; i++) {
            if (cible.pv <= 0) {
              // La cible est tombée : les coups restants vont sur un autre ennemi à portée
              if (act.zone) break;
              const autres = this.ciblesValides(a, act).filter(x => x.pv > 0);
              if (!autres.length) break;
              cible = autres.sort((x, y) => x.pv - y.pv)[0];
              this.log(`→ ↪️ ${this.nomHtml(a)} enchaîne sur ${this.nomHtml(cible)} !`, 'jet');
              this.evt({ t: 'action', source: a.id, camp: a.camp, nom: act.nom, icone: '↪️', cibles: [cible.id], melee: !act.vise.includes('arriere'), distance: act.vise.includes('arriere'), typeAct: act.type, typeDeg: act.typeDeg, sort: !!act.sort });
            }
            this.resoudreAttaque(a, act, cible, nb > 1 ? i + 1 : 0);
          }
        }
        break;
      case 'sauvegarde':
        for (const c of cibles) if (c.pv > 0) this.resoudreSauvegarde(a, act, c);
        break;
      case 'auto':
        for (const c of cibles) {
          const d = Des.lancer(act.degats);
          const evo = this.bonusEvocation(a, act, c);
          this.log(`→ Touche automatiquement : ${d.texte}${evo ? ` +${evo} (évocation)` : ''} ${act.typeDeg}`, 'jet');
          this.infliger(c, d.total + evo, act.typeDeg, a, false);
          this.effroiDuSort(a, act, c, false);
        }
        break;
      case 'soin':
        for (const c of cibles) this.resoudreSoin(a, act, c);
        break;
      case 'soutien':
        for (const c of cibles) {
          if (act.etat) this.appliquerEtat(c, act.etat.nom, act.etat.duree + (c === a && !ETATS[act.etat.nom].finDebut ? 1 : 0));
          if (act.peur) this.modifierPeur(c, act.peur);
        }
        break;
      case 'special':
        SPECIAUX[act.special](this, a, act, cible, cibles);
        break;
    }
    this.niveauSort = 0;
  }

  // Nombre de coups d'une attaque (attaque supplémentaire, frénésie, embuscade…)
  nombreAttaques(a, act) {
    const t = a.traits || {};
    let nb = act.nbAttaques || ((act.rayons && t[act.rayons]) ? 2 : 0);
    if (nb) return nb;
    nb = 1;
    if (act.arme && !act.zone) {
      if (t.attaqueSupp) nb++;
      if (t.frenesie && a.etats.rage) nb++;
      if (t.traqueur && this.round === 1) nb++;
    }
    return nb;
  }

  // École d'Évocation : +N aux dégâts d'un sort, une fois par cible
  bonusEvocation(a, act, c) {
    if (!act.sort || !act.niveau || !a.traits || !a.traits.evocation || this.sortsTouches.has(c.id)) return 0;
    this.sortsTouches.add(c.id);
    return a.traits.evocation;
  }

  // CA effective (états et capacités compris)
  caTotale(c) {
    return c.ca + (c.etats.ecorce ? 3 : 0) + (c.etats.agathys ? 2 : 0) + (c.etats.defi ? 2 : 0) + (c.etats.bouclier ? 5 : 0)
      + (c.traits && c.traits.aspectOurs && c.etats.rage ? 2 : 0);
  }

  // Avantage / désavantage d'une attaque
  modeAttaque(a, act, c) {
    const av = [], dv = [];
    if (a.etats.cache && !act.compagnon) av.push('caché');
    if (act.avantage) av.push('feinte');
    if (c.etats.renverse) av.push('cible renversée');
    if (c.etats.endormi) av.push('cible endormie');
    if (this.panique(a)) dv.push('paniqué');
    if (a.etats.empoisonne) dv.push('empoisonné');
    if (a.etats.entrave) dv.push('gelé');
    if (c.etats.esquive) dv.push('cible en esquive');
    if (c.etats.temeraire) av.push('cible téméraire');
    if (a.traits && a.traits.assassin && !c.aJoue) av.push('assassinat');
    if (c.etats.inimitie && c.inimitiePar === a.id) av.push('inimitié');
    if (a.camp === 'pj' && act.vise && act.vise.length === 1 && act.vise[0] === 'avant' && c.ligne === 'avant'
      && this.pjs.some(p => p !== a && p.pv > 0 && p.traits.espritLoup && p.etats.rage)) av.push('meute');
    const mode = (av.length && !dv.length) ? 1 : (dv.length && !av.length) ? -1 : 0;
    return { mode, av, dv };
  }

  bonusToucher(a, act) {
    if (typeof act.jet === 'number') return act.jet;
    if (act.jet === 'sort') return a.bonusSort;
    return a.bonusArme;
  }

  resoudreAttaque(a, act, c, numero) {
    const { mode, av, dv } = this.modeAttaque(a, act, c);
    if (!act.compagnon) {
      if (a.etats.cache) delete a.etats.cache;
      if (a.etats.entrave) delete a.etats.entrave;
    }
    const r = Des.d20(mode);
    const bonus = this.bonusToucher(a, act);
    let total = r.nat + bonus;
    let txt = `${r.texte} ${signe(bonus)}`;
    if (a.etats.benit || a.etats.fervent) { const b = Des.d(4); total += b; txt += ` +1d4[${b}]`; }
    const mal = this.malusPeur(a);
    if (mal) { total += mal; txt += ` ${mal} (${a.camp === 'pj' ? 'anxieux' : 'ébranlé'})`; }
    const bonusHeros = !act.compagnon; // le loup ne profite pas des bonus du rôdeur
    if (a.etats.heroique && bonusHeros) { total += 2; txt += ' +2 (héroïque)'; }
    if (a.etats.vengeance && bonusHeros) { total += 2; txt += ' +2 (vengeance)'; }
    if (a.etats.armeSacree && act.arme) { total += 2; txt += ' +2 (arme sacrée)'; }
    let inspireDegats = false;
    if (a.etats.inspire && bonusHeros) {
      const b = Des.d(6); total += b; txt += ` +insp.1d6[${b}]`; delete a.etats.inspire;
      inspireDegats = this.pjs.some(p => p.pv > 0 && p.traits.inspirationCombat);
    }
    // Collège du Savoir : mots cinglants contre la première attaque ennemie du round
    if (a.camp === 'ennemi' && c.camp === 'pj') {
      const barde = this.pjs.find(p => p.pv > 0 && p.traits.motsCinglants && p.motsRound !== this.round && (p.usages.mots || 0) < 2);
      if (barde) { barde.motsRound = this.round; barde.usages.mots = (barde.usages.mots || 0) + 1; const b = Des.d(6); total -= b; txt += ` −mots cinglants 1d6[${b}]`; }
    }
    const ca = this.caTotale(c);
    const seuilCrit = Math.min((a.traits && a.traits.critMin) || 20, 20) - ((a.traits && a.traits.critAmeliore) || 0);
    let critique = r.nat >= seuilCrit;
    let touche = critique || (r.nat !== 1 && total >= ca);
    // Assassinat : au 1er round, toucher un ennemi qui n'a pas encore joué est un critique
    if (touche && !critique && a.traits && a.traits.assassin && this.round === 1 && !c.aJoue) critique = true;
    // Cape de l'ombre : la première attaque qui toucherait rate
    if (touche && c.etats.voile) {
      delete c.etats.voile;
      this.log(`→ 🌫️ ${this.nomHtml(c)} se dissout dans l'ombre : l'attaque passe à travers !`, 'bon');
      this.evt({ t: 'texte', cible: c.id, texte: 'Raté', classe: 'rate' });
      return false;
    }
    const raisons = [...av.map(x => '+' + x), ...dv.map(x => '−' + x)].join(', ');
    const pre = numero ? `#${numero} ` : '';
    let ligne = `→ ${pre}🎲 ${txt} = <b>${total}</b> contre CA ${ca}${raisons ? ` <span class="cout">(${raisons})</span>` : ''} : `;
    this.evt({ t: 'jet', source: a.id, cible: c.id, nat: r.nat, total, libelle: `${act.nom}${numero ? ' #' + numero : ''}`,
      contre: `CA ${ca}`, res: critique ? 'crit' : touche ? 'touche' : 'rate', mode });
    if (!touche) {
      this.log(ligne + (r.nat === 1 ? '<b>échec critique</b>, raté.' : 'raté.'), 'jet rate');
      this.evt({ t: 'texte', cible: c.id, texte: 'Raté', classe: 'rate' });
      // Tour de magie puissant : moitié des dégâts même raté
      if (act.sort && !act.niveau && a.traits && a.traits.tourPuissant) {
        const d = Des.lancer(act.degats), n = Math.floor((d.total + this.bonusEvocation(a, act, c)) / 2);
        this.log(`→ 💥 Tour de magie puissant : ${d.texte} ÷2 → <b>${n}</b> ${act.typeDeg}`, 'jet');
        this.infliger(c, n, act.typeDeg, a, false);
      }
      // Maître de guerre : riposte quand un ennemi le rate au corps à corps
      if (c.camp === 'pj' && c.traits.riposte && c.pv > 0 && a.pv > 0 && c.riposteRound !== this.round
        && act.vise && act.vise.length === 1 && act.vise[0] === 'avant') {
        c.riposteRound = this.round;
        this.log(`→ ♟️ ${this.nomHtml(c)} riposte !`, 'action');
        this.evt({ t: 'action', source: c.id, camp: c.camp, nom: 'Riposte', icone: '♟️', cibles: [a.id], melee: true, distance: false, typeAct: 'attaque', typeDeg: 'tranchant' });
        this.resoudreAttaque(c, { nom: 'Riposte', arme: true, jet: 'arme', degats: '1d8+3', typeDeg: 'tranchant', vise: ['avant'] }, a, 0);
      }
      return false;
    }
    ligne += critique ? '<b class="crit">CRITIQUE !</b>' : 'touché.';
    // Dégâts
    const d = Des.lancer(act.degats, critique);
    let degats = d.total;
    let dTxt = d.texte;
    if (act.arme && a.bonusDegats) { degats += a.bonusDegats; dTxt += ` +${a.bonusDegats} (objet)`; }
    if (act.arme && a.etats.rage) { degats += 2; dTxt += ' +2 (rage)'; }
    if (a.etats.heroique && bonusHeros) { degats += 2; dTxt += ' +2 (héroïque)'; }
    if (a.etats.vengeance && bonusHeros) { degats += 2; dTxt += ' +2 (vengeance)'; }
    if (inspireDegats) { const b = Des.lancer('1d6', critique); degats += b.total; dTxt += ` + inspiration ${b.texte}`; }
    const evo = this.bonusEvocation(a, act, c);
    if (evo) { degats += evo; dTxt += ` +${evo} (évocation)`; }
    // Tueur de colosses : une fois par tour contre une cible déjà blessée
    if (a.traits && a.traits.colosse && !a.colosseUtilise && c.pv < c.pvMax && (act.arme || act.type === 'attaque')) {
      const k = Des.lancer(a.traits.colosse, critique); degats += k.total; dTxt += ` + colosse ${k.texte}`; a.colosseUtilise = true;
    }
    if (c.etats.marque && c.marquePar === a.id && bonusHeros) { const m = Des.lancer('1d6', critique); degats += m.total; dTxt += ` + marque ${m.texte}`; }
    if (act.arme && a.traits && a.traits.armeElem) {
      const e = Des.lancer(a.traits.armeElem.des, critique);
      degats += e.total;
      dTxt += ` + ${e.texte} ${a.traits.armeElem.type}`;
    }
    // Attaque sournoise
    if (act.sournoise && !a.sournoiseUtilisee && a.classe === 'roublard' && this.sournoisePossible(a, c, mode)) {
      const s = Des.lancer((a.traits && a.traits.sournoise) || CLASSES.roublard.sournoise, critique);
      degats += s.total;
      dTxt += ` + sournoise ${s.texte}`;
      a.sournoiseUtilisee = true;
      if (a.traits.empoisonneur) this.appliquerApres = { etat: 'empoisonne', duree: 2, sauvegarde: { carac: 'CON', dd: 8 + a.maitrise + modCarac(a.caracs.DEX) } };
    }
    if (act.arme && a.etats.affaibli) { degats = Math.floor(degats / 2); dTxt += ' ÷2 (affaibli)'; }
    this.log(`${ligne} Dégâts : ${dTxt} → <b>${degats}</b> ${act.typeDeg}`, critique ? 'jet crit' : 'jet');

    if (critique) this.peurCritique(a, c);
    this.infliger(c, degats, act.typeDeg, a, critique);
    this.effetsApresCoup(a, act, c, degats);

    if (act.effetSiTouche && c.pv > 0) this.appliquerEffet(a, act.effetSiTouche, c);
    if (this.appliquerApres) { const e = this.appliquerApres; this.appliquerApres = null; if (c.pv > 0) this.appliquerEffet(a, e, c); }
    // Totem du loup (niv. 5) : en rage, les coups d'arme au corps à corps renversent
    if (a.traits && a.traits.chefMeute && a.etats.rage && act.arme && c.pv > 0 && !c.etats.renverse && act.vise && act.vise.length === 1)
      this.appliquerEffet(a, { etat: 'renverse', duree: 1, sauvegarde: { carac: 'FOR', dd: 8 + a.maitrise + modCarac(a.caracs.FOR) } }, c);
    if (act.recul && c.pv > 0) this.reculer(c, act.recul);
    this.effroiDuSort(a, act, c, false);
    return true;
  }

  // Effets d'objets après un coup réussi
  effetsApresCoup(a, act, c, degats) {
    const t = a.traits || {}, tc = c.traits || {};
    // Lame vampirique
    if (t.vol && act.arme && a.pv > 0) {
      const gain = Math.min(6, Math.ceil(degats / 2), a.pvMax - a.pv);
      if (gain > 0) { a.pv += gain; this.log(`→ 🩸 ${this.nomHtml(a)} draine ${gain} PV.`, 'bon'); this.evt({ t: 'soin', cible: a.id, n: gain, pvAvant: a.pv - gain, pvApres: a.pv, pvMax: a.pvMax }); }
    }
    // Bâton de foudre : l'éclair rebondit sur un autre ennemi
    if (t.arcEclair && act.sort && act.type === 'attaque') {
      const autres = this.adversaires(a).filter(e => e.pv > 0 && e !== c);
      if (autres.length) {
        const b = Des.hasard(autres), d = Des.lancer(t.arcEclair);
        this.log(`→ ⚡ L'éclair rebondit sur ${this.nomHtml(b)} : ${d.texte} tonnerre.`, 'jet');
        this.infliger(b, d.total, 'tonnerre', a, false);
      }
    }
    // Armure à épines : l'attaquant au corps à corps se blesse
    if (c.etats && c.etats.agathys && act.vise && act.vise.length === 1 && act.vise[0] === 'avant' && a.pv > 0) {
      this.log(`→ ❄️ L'armure d'Agathys de ${this.nomHtml(c)} gèle ${this.nomHtml(a)} : 5 froid.`, 'jet');
      this.infliger(a, 5, 'froid', c, false);
    }
    // Domaine de la Tempête : foudroie l'attaquant au corps à corps
    if (tc.colereTempete && c.pv > 0 && a.pv > 0 && act.vise && act.vise.length === 1 && act.vise[0] === 'avant' && (c.usages.colere || 0) < tc.colereTempete) {
      c.usages.colere = (c.usages.colere || 0) + 1;
      const s = this.jetSauvegarde(a, 'DEX', c.ddSort), d = Des.lancer('2d8'), n = s.reussite ? Math.floor(d.total / 2) : d.total;
      this.log(`→ ⛈️ Colère de la tempête ! ${s.texte}. ${d.texte}${s.reussite ? ' ÷2' : ''} → <b>${n}</b> foudre`, 'jet');
      this.evt({ t: 'action', source: c.id, camp: c.camp, nom: 'Colère de la tempête', icone: '⛈️', cibles: [a.id], melee: false, distance: true, typeAct: 'sauvegarde', typeDeg: 'foudre', sort: true });
      this.infliger(a, n, 'foudre', c, false);
    }
    if (tc.epines && act.vise && act.vise.length === 1 && act.vise[0] === 'avant' && a.pv > 0) {
      const d = Des.lancer(tc.epines);
      this.log(`→ 🌵 Les épines de ${this.nomHtml(c)} blessent ${this.nomHtml(a)} : ${d.texte}.`, 'jet');
      this.infliger(a, d.total, 'perforant', c, false);
    }
  }

  sournoisePossible(a, c, mode) {
    if (mode > 0) return true;
    if (mode < 0) return false;
    if (c.ligne !== 'avant') return false;
    return this.pjs.some(p => p !== a && p.pv > 0 && p.ligne === 'avant');
  }

  peurCritique(a, c) {
    if (a.camp === 'ennemi' && c.camp === 'pj') {
      this.modifierPeur(c, PEUR.critiqueSubi);
      for (const p of this.pjs) if (p !== c && p.pv > 0) this.modifierPeur(p, PEUR.critiqueAllie, true);
    } else if (a.camp === 'pj') {
      for (const p of this.pjs) if (p.pv > 0) this.modifierPeur(p, PEUR.critiqueInflige, true);
    }
  }

  bonusSauvegarde(c, carac) {
    if (c.camp === 'pj') {
      const aura = this.pjs.some(p => p.pv > 0 && p.traits && p.traits.aura) ? 1 : 0;
      return modCarac(c.caracs[carac]) + (c.sauvegardes.includes(carac) ? c.maitrise : 0) + c.bonusSauv + aura;
    }
    const m = this.modele(c);
    if (m.sauvegardesBonus && m.sauvegardesBonus[carac] !== undefined) return m.sauvegardesBonus[carac];
    return modCarac(c.caracs[carac]);
  }

  // Jet de sauvegarde générique : renvoie { reussite, texte }
  jetSauvegarde(c, carac, dd) {
    const mode = this.panique(c) ? -1 : 0;
    const r = Des.d20(mode);
    const bonus = this.bonusSauvegarde(c, carac);
    let total = r.nat + bonus;
    let txt = `${r.texte} ${signe(bonus)}`;
    if (c.etats.benit || c.etats.fervent) { const b = Des.d(4); total += b; txt += ` +1d4[${b}]`; }
    if (c.etats.inspire) { const b = Des.d(6); total += b; txt += ` +insp.1d6[${b}]`; delete c.etats.inspire; }
    const mal = this.malusPeur(c);
    if (mal) { total += mal; txt += ` ${mal} (${c.camp === 'pj' ? 'anxieux' : 'ébranlé'})`; }
    const reussite = total >= dd;
    this.evt({ t: 'jet', source: c.id, cible: c.id, nat: r.nat, total, libelle: `${c.nom} · sauvegarde ${carac}`,
      contre: `DD ${dd}`, res: reussite ? 'reussite' : 'echec', mode, sauvegarde: true });
    return { reussite, texte: `${this.nomHtml(c)} sauvegarde de ${carac} : 🎲 ${txt} = <b>${total}</b> contre DD ${dd}${mode < 0 ? ' <span class="cout">(−paniqué)</span>' : ''} → ${reussite ? 'réussite' : '<b>échec</b>'}` };
  }

  resoudreSauvegarde(a, act, c) {
    const dd = act.dd === 'sort' ? a.ddSort : act.dd;
    const s = this.jetSauvegarde(c, act.carac, dd);
    let ligne = '→ ' + s.texte;
    if (act.degats) {
      if (s.reussite && !act.moitie) {
        this.log(ligne + '. Aucun dégât.', 'jet rate');
        this.evt({ t: 'texte', cible: c.id, texte: 'Résiste', classe: 'rate' });
      } else {
        const d = Des.lancer(act.degats);
        const evo = this.bonusEvocation(a, act, c);
        const total = s.reussite ? Math.floor((d.total + evo) / 2) : d.total + evo;
        this.log(`${ligne}. Dégâts : ${d.texte}${evo ? ` +${evo} (évocation)` : ''}${s.reussite ? ' ÷2' : ''} → <b>${total}</b> ${act.typeDeg}`, 'jet');
        this.infliger(c, total, act.typeDeg, a, false);
      }
    } else {
      this.log(ligne, 'jet');
    }
    if (!s.reussite && act.effetSiEchec && c.pv > 0) this.appliquerEffet(a, act.effetSiEchec, c, true);
    if (!(s.reussite && act.degats && !act.moitie)) this.effroiDuSort(a, act, c, s.reussite);
  }

  // Peur infligée aux monstres : sort à effroi, ou dégâts psychiques d'un Grand Ancien
  effroiDuSort(a, act, c, reussite) {
    if (c.camp !== 'ennemi' || c.pv <= 0 || a.camp !== 'pj') return;
    let n = act.effroi || 0;
    if (a.traits.espritEveille && act.typeDeg === 'psychique') n += a.traits.espritEveille;
    if (reussite) n = Math.floor(n / 2);
    if (n > 0) this.effrayer(c, n, a);
  }

  // Dédale du Chaos : mutations des monstres (combat : 35 % de chance,
  // élite et boss : toujours) et pouvoirs des boss (1, ou 2 pour le boss final)
  appliquerChaos(type, final) {
    const chance = type === 'combat' ? 0.35 : 1;
    for (const m of this.ennemis) {
      m.chaos = { mutations: [], pouvoirs: [] };
      if (m.boss) {
        m.chaos.pouvoirs = Des.melanger(Object.keys(POUVOIRS_BOSS)).slice(0, final ? 2 : 1);
      } else if (Math.random() < chance) {
        const n = 1;
        m.chaos.mutations = Des.melanger(Object.keys(MUTATIONS_CHAOS)).slice(0, n);
      }
      const k = m.chaos.mutations;
      if (k.includes('robuste')) m.pvMax = m.pv = Math.round(m.pvMax * 1.4);
      if (k.includes('rapide')) m.pvMax = m.pv = Math.max(1, Math.round(m.pvMax * 0.6));
      if (k.includes('blinde')) m.ca += 2;
      if (k.includes('enrage')) m.actions = m.actions.map(a => ({ ...a,
        jet: typeof a.jet === 'number' ? a.jet + 2 : a.jet, dd: typeof a.dd === 'number' ? a.dd + 1 : a.dd, degats: a.degats ? a.degats + '+2' : a.degats }));
      m.traits = m.traits || {};
      if (k.includes('epineux')) m.traits.epines = '1d6';
      if (k.includes('regenerant')) m.traits.regen = 3;
      const icones = [...k.map(x => MUTATIONS_CHAOS[x].icone), ...m.chaos.pouvoirs.map(x => POUVOIRS_BOSS[x].icone)].join('');
      if (icones) m.nom += ' ' + icones;
      if (m.chaos.pouvoirs.length) this.log(`⚠️ <b>Pouvoirs du chaos</b> de ${this.nomHtml(m)} : ${m.chaos.pouvoirs.map(x => `${POUVOIRS_BOSS[x].icone} ${POUVOIRS_BOSS[x].nom}`).join(', ')}. Touchez-le pour les détails.`, 'titre mauvais');
    }
    this.chaos = true;
  }

  pouvoirsDebutTour(c) {
    const pv = c.chaos.pouvoirs;
    if (pv.includes('terreur')) {
      this.log(`😱 L'aura de ${this.nomHtml(c)} glace l'équipe.`, 'peur');
      for (const p of this.pjs) if (p.pv > 0) this.modifierPeur(p, 6, true);
    }
    if (pv.includes('fleau')) {
      const vise = Des.hasard(this.pjs.filter(p => p.pv > 0));
      if (vise) {
        const d = Des.lancer('2d6');
        this.log(`☠️ Le fléau de ${this.nomHtml(c)} frappe ${this.nomHtml(vise)} : ${d.texte} nécrotique.`, 'mauvais');
        this.evt({ t: 'action', source: c.id, camp: c.camp, nom: 'Fléau', icone: '☠️', cibles: [vise.id], melee: false, distance: true, typeAct: 'auto', typeDeg: 'nécrotique', sort: true });
        this.infliger(vise, d.total, 'nécrotique', c, false);
      }
    }
    if (pv.includes('invocateur') && this.round % 3 === 0 && this.ennemis.filter(e => e.pv > 0).length < 4) {
      const r = this.creerMonstre(Des.hasard(RENFORTS_CHAOS), ' du chaos');
      r.initiative = 0;
      r.ligne = 'avant';
      r.chaos = { mutations: [], pouvoirs: [] };
      this.ennemis.unshift(r);
      this.ordre.push(r);
      this.log(`💀 ${this.nomHtml(c)} ouvre une faille : un ${this.nomHtml(r)} surgit en ligne Avant !`, 'mauvais');
      for (const p of this.pjs) if (p.pv > 0) this.modifierPeur(p, 4, true);
    }
  }

  // Ajoute de la Peur à un monstre : Ébranlé à 50, Terrifié à 100
  effrayer(c, n, source) {
    if (c.camp !== 'ennemi' || c.pv <= 0) return;
    const m = this.modele(c);
    if (m.mortVivant || c.boss) n = Math.ceil(n / 2);
    const avant = c.peur || 0;
    c.peur = Math.min(100, avant + n);
    if (c.peur === avant) return;
    this.evt({ t: 'peur', cible: c.id, n: c.peur - avant, avant, apres: c.peur });
    this.log(`→ 😨 ${this.nomHtml(c)} Peur +${c.peur - avant} (${c.peur}/100)${m.mortVivant || c.boss ? ' <span class="cout">(moitié : ' + (c.boss ? 'boss' : 'mort-vivant') + ')</span>' : ''}`, 'peur');
    if (c.peur >= PEUR_MONSTRES.seuilEbranle && !c.etats.ebranle) {
      c.etats.ebranle = 99;
      this.evt({ t: 'texte', cible: c.id, texte: '😟 Ébranlé', classe: 'peur' });
      this.log(`→ 😟 ${this.nomHtml(c)} est <b>ébranlé</b> : −${PEUR_MONSTRES.malus} au toucher et aux sauvegardes.`, 'etat');
    }
    if (c.peur >= 100) this.terrifier(c, source);
  }

  terrifier(c, source) {
    if (source && source.traits && source.traits.penseesEnvahissantes) {
      const d = Des.lancer('3d6');
      this.log(`→ 🐙 Pensées envahissantes : ${d.texte} psychique.`, 'jet');
      this.infliger(c, d.total, 'psychique', source, false);
      if (c.pv <= 0) return;
    }
    if (!c.boss && !c.elite) {
      this.log(`😱 ${this.nomHtml(c)} est <b>terrifié</b> et s'enfuit en hurlant !`, 'titre bon');
      this.evt({ t: 'texte', cible: c.id, texte: '😱 Fuite !', classe: 'crit' });
      c.pv = 0;
      c.enFuite = true;
      this.evt({ t: 'mort', cible: c.id });
      if (source && source.camp === 'pj') this.modifierPeur(source, PEUR.ennemiTue, true);
      return;
    }
    this.log(`😱 ${this.nomHtml(c)} est <b>terrifié</b> et perd son prochain tour !`, 'titre bon');
    this.evt({ t: 'texte', cible: c.id, texte: '😱 Terrifié', classe: 'peur' });
    c.etats.etourdi = 1;
    c.peur = PEUR_MONSTRES.seuilEbranle;
  }

  resoudreSoin(a, act, c) {
    let total = 0;
    if (act.soin && act.soin !== '0') {
      const d = Des.lancer(act.soin);
      total = d.total + (a.bonusSoin && act.sort ? a.bonusSoin : 0);
      const niv = act.niveau ? (this.niveauSort || act.niveau) : 0;
      const disciple = a.traits && a.traits.disciple && niv ? niv : 0;
      total += disciple;
      if (c.crise === 'egoisme' && a.camp === 'pj' && a !== c) {
        total = Math.floor(total / 2);
        this.log(`→ 🙄 ${this.nomHtml(c)} repousse l'aide : soin réduit de moitié.`, 'mauvais');
      }
      const etaitATerre = c.pv <= 0;
      const avant = Math.max(0, c.pv);
      c.pv = Math.min(c.pvMax, avant + total);
      this.log(`→ ${this.nomHtml(c)} récupère ${d.texte}${a.bonusSoin && act.sort ? ` +${a.bonusSoin}` : ''}${disciple ? ` +${disciple} (disciple de la vie)` : ''} → <b>${c.pv - avant}</b> PV${etaitATerre ? ' et <b>se relève</b> !' : ''}`, 'jet bon');
      this.evt({ t: 'soin', cible: c.id, n: c.pv - avant, pvAvant: avant, pvApres: c.pv, pvMax: c.pvMax });
      // Guérisseur béni : le clerc se soigne aussi (une fois par sort)
      if (a.traits && a.traits.guerisseurBeni && niv && c !== a && a.pv > 0 && a.pv < a.pvMax && this.beniSort !== this.sortsTouches) {
        this.beniSort = this.sortsTouches;
        const av = a.pv; a.pv = Math.min(a.pvMax, a.pv + 2 + niv);
        this.log(`→ 💗 ${this.nomHtml(a)} est béni à son tour : +${a.pv - av} PV.`, 'bon');
        this.evt({ t: 'soin', cible: a.id, n: a.pv - av, pvAvant: av, pvApres: a.pv, pvMax: a.pvMax });
      }
    }
    if (act.peur && c.pv > 0) this.modifierPeur(c, act.peur);
  }

  // Effet secondaire : {etat, duree, sauvegarde?} ou {peur} ou {recul}
  appliquerEffet(a, effet, c, dejaSauve = false) {
    if (effet.sauvegarde && !dejaSauve) {
      const s = this.jetSauvegarde(c, effet.sauvegarde.carac, effet.sauvegarde.dd === 'sort' ? a.ddSort : effet.sauvegarde.dd);
      this.log('→ ' + s.texte, s.reussite ? 'jet rate' : 'jet');
      if (s.reussite) return;
    }
    if (effet.etat) this.appliquerEtat(c, effet.etat, effet.duree);
    if (effet.peur && c.camp === 'pj') this.modifierPeur(c, effet.peur);
    if (effet.recul) this.reculer(c, effet.recul);
  }

  appliquerEtat(c, nom, duree) {
    const m = this.modele(c);
    if (m && m.immunEtats && m.immunEtats.includes(nom)) {
      this.log(`→ ${this.nomHtml(c)} est immunisé (${ETATS[nom].nom}).`, 'jet rate');
      return;
    }
    c.etats[nom] = Math.max(c.etats[nom] || 0, duree);
    this.evt({ t: 'texte', cible: c.id, texte: ETATS[nom].icone + ' ' + ETATS[nom].nom, classe: 'etat' });
    this.log(`→ ${this.nomHtml(c)} : ${ETATS[nom].icone} ${ETATS[nom].nom}.`, 'etat');
  }

  reculer(c) {
    if (c.ligne === 'arriere') return;
    this.deplacer(c, 'arriere');
    this.log(`→ ${this.nomHtml(c)} est repoussé en ligne Arrière.`, 'etat');
  }

  infliger(c, n, type, source, critique) {
    const m = this.modele(c);
    let note = '';
    if (m) {
      if (m.immun && m.immun.includes(type)) { n = 0; note = ' (immunisé)'; }
      else if (m.resist && m.resist.includes(type)) { n = Math.floor(n / 2); note = ' (résistance ÷2)'; }
      else if (m.vuln && m.vuln.includes(type)) { n = n * 2; note = ' (vulnérable ×2)'; }
      if (note) this.log(`→ ${this.nomHtml(c)}${note} : ${n} dégâts.`, 'jet');
    } else if (c.etats && c.etats.rage) {
      n = Math.floor(n / 2);
      this.log(`→ 😡 ${this.nomHtml(c)} encaisse grâce à sa rage (÷2) : ${n} dégâts.`, 'jet');
    } else if (c.traits && c.traits.resist && c.traits.resist.includes(type)) {
      n = Math.floor(n / 2);
      this.log(`→ ${this.nomHtml(c)} résiste (${type}, ÷2) : ${n} dégâts.`, 'jet');
    }
    if (n <= 0) { this.evt({ t: 'texte', cible: c.id, texte: 'Immunisé', classe: 'rate' }); return; }
    // Chaos : carapace du boss tant qu'il a des alliés debout
    if (c.chaos && c.chaos.pouvoirs.includes('carapace') && this.ennemis.some(e => e !== c && e.pv > 0)) {
      n = Math.floor(n / 2);
      this.log(`→ 🐚 La carapace de ${this.nomHtml(c)} absorbe la moitié : ${n} dégâts.`, 'jet');
      if (n <= 0) return;
    }
    // PV temporaires (égide, forme d'ours, ténébreux) : absorbent d'abord
    if (c.egide > 0) {
      const abs = Math.min(c.egide, n);
      c.egide -= abs; n -= abs;
      this.log(`→ 💠 ${this.nomHtml(c)} absorbe ${abs} dégâts (${c.egide} PV temporaires restants).`, 'jet');
      this.evt({ t: 'texte', cible: c.id, texte: `💠 −${abs}`, classe: 'etat' });
      if (c.egide <= 0 && c.etats.ours) { delete c.etats.ours; this.log(`→ 🐻 ${this.nomHtml(c)} reprend sa forme de druide.`, 'etat'); this.evt({ t: 'texte', cible: c.id, texte: '🐻 Fin de la forme', classe: 'etat' }); }
      if (n <= 0) return;
    }
    const pvAvant = Math.max(0, c.pv);
    c.pv -= n;
    if (c.camp === 'pj' && c.pv > 0 && n >= c.pvMax * 0.3) {
      this.log(`→ 😨 Le coup ébranle ${this.nomHtml(c)} !`, 'peur');
      this.modifierPeur(c, PEUR.grosCoup, true);
    }
    this.evt({ t: 'degats', cible: c.id, n, crit: critique, pvAvant, pvApres: Math.max(0, c.pv), pvMax: c.pvMax });
    const mut = source && source.chaos ? source.chaos.mutations : [];
    if (mut.includes('vampire') && source.pv > 0 && source.pv < source.pvMax) {
      const av = source.pv; source.pv = Math.min(source.pvMax, source.pv + Math.ceil(n / 2));
      this.log(`→ 🩸 ${this.nomHtml(source)} se nourrit : +${source.pv - av} PV.`, 'mauvais');
      this.evt({ t: 'soin', cible: source.id, n: source.pv - av, pvAvant: av, pvApres: source.pv, pvMax: source.pvMax });
    }
    if (mut.includes('terrifiant') && c.camp === 'pj' && c.pv > 0) this.modifierPeur(c, 8, true);
    if (c.etats.endormi) { delete c.etats.endormi; this.log(`→ ${this.nomHtml(c)} se réveille !`, 'etat'); }

    if (c.pv <= 0 && m && m.robustesse && type !== 'radiant' && !critique) {
      const dd = 5 + n;
      const s = this.jetSauvegarde(c, 'CON', dd);
      this.log(`→ Robustesse des morts-vivants : ${s.texte}`, 'jet');
      if (s.reussite) { c.pv = 1; this.evt({ t: 'soin', cible: c.id, n: 1, pvAvant: 0, pvApres: 1, pvMax: c.pvMax }); this.log(`→ ${this.nomHtml(c)} refuse de tomber (1 PV) !`, 'mauvais'); return; }
    }

    if (c.pv <= 0 && c.chaos && c.chaos.pouvoirs.includes('renaissance') && !c.chaos.relevé) {
      c.chaos.relevé = true;
      c.pv = Math.ceil(c.pvMax * 0.4);
      this.log(`🔥 ${this.nomHtml(c)} s'effondre… puis se relève dans un torrent de flammes chaotiques (${c.pv} PV) !`, 'titre mauvais');
      this.evt({ t: 'texte', cible: c.id, texte: '🔥 Renaissance !', classe: 'crit' });
      this.evt({ t: 'soin', cible: c.id, n: c.pv, pvAvant: 0, pvApres: c.pv, pvMax: c.pvMax });
      for (const p of this.pjs) if (p.pv > 0) this.modifierPeur(p, 10, true);
      return;
    }
    if (c.pv <= 0) {
      c.pv = 0;
      if (c.camp === 'ennemi') {
        this.evt({ t: 'mort', cible: c.id });
        this.log(`☠ ${this.nomHtml(c)} est vaincu !`, 'bon');
        if (m && m.criMort) {
          this.log(`💀 ${this.nomHtml(c)} lance une malédiction dans son dernier souffle !`, 'peur');
          for (const p of this.pjs) if (p.pv > 0) this.modifierPeur(p, m.criMort, true);
        }
        if (source && source.camp === 'pj') {
          this.modifierPeur(source, PEUR.ennemiTue, true);
          const ts = source.traits || {};
          // Nécromancie : moisson macabre (sort à emplacement)
          if (ts.moisson && this.niveauSort && source.pv > 0) {
            const av = source.pv; source.pv = Math.min(source.pvMax, source.pv + ts.moisson * this.niveauSort);
            if (source.pv > av) { this.log(`→ 💀 ${this.nomHtml(source)} moissonne l'âme : +${source.pv - av} PV.`, 'bon'); this.evt({ t: 'soin', cible: source.id, n: source.pv - av, pvAvant: av, pvApres: source.pv, pvMax: source.pvMax }); }
          }
          // Fiélon : bénédiction du ténébreux
          if (ts.tenebreux && source.pv > 0) {
            const v = 3 + (source.niveau || 3);
            if ((source.egide || 0) < v) { source.egide = v; this.log(`→ 😈 ${this.nomHtml(source)} reçoit la bénédiction du ténébreux : ${v} PV temporaires.`, 'bon'); }
          }
        }
      } else if (c.usages && c.usages.phenixDispo) {
        // Amulette du phénix
        c.usages.phenixDispo = false;
        c.pv = Math.min(10, c.pvMax);
        this.log(`🐦‍🔥 ${this.nomHtml(c)} renaît de ses cendres avec ${c.pv} PV !`, 'bon');
        this.evt({ t: 'soin', cible: c.id, n: c.pv, pvAvant: 0, pvApres: c.pv, pvMax: c.pvMax });
      } else {
        c.etats = {};
        this.evt({ t: 'mort', cible: c.id, pj: true });
        this.log(`⚠️ ${this.nomHtml(c)} tombe <b>à terre</b> !`, 'mauvais');
        for (const p of this.pjs) if (p !== c && p.pv > 0) this.modifierPeur(p, PEUR.allieATerre);
        for (const p of this.pjs) if (p !== c && p.pv > 0 && p.traits.vengeur && !p.etats.vengeance) {
          this.log(`🔥 ${this.nomHtml(p)} jure de venger ${this.nomHtml(c)} !`, 'titre bon');
          this.appliquerEtat(p, 'vengeance', 99);
        }
      }
    }
  }

  // discret = ne pas écrire de ligne dans le journal pour les petites variations
  modifierPeur(pj, n, discret = false) {
    if (pj.camp !== 'pj') return;
    if (n > 0 && this.jeu && this.jeu.peurMult) n = Math.round(n * this.jeu.peurMult);
    if (n > 0 && pj.traits.peurReduite) n = Math.ceil(n / 2);
    if (n > 0 && this.pjs.some(p => p.pv > 0 && p.traits.auraCourage)) n = Math.ceil(n / 2);
    if (n > 0 && pj.traits.rageInconsciente && pj.etats.rage) n = 0;
    const avant = pj.peur;
    pj.peur = Math.max((pj.traits && pj.traits.peurMin) || 0, Math.min(100, pj.peur + n));
    const diff = pj.peur - avant;
    if (diff === 0) return;
    this.evt({ t: 'peur', cible: pj.id, n: diff, avant, apres: pj.peur });
    if (!discret) this.log(`${diff > 0 ? '😨' : '😌'} ${this.nomHtml(pj)} Peur ${diff > 0 ? '+' : ''}${diff} (${pj.peur}/100)`, diff > 0 ? 'peur' : 'bon');
    if (avant < PEUR.seuilAnxieux && pj.peur >= PEUR.seuilAnxieux && pj.peur < PEUR.seuilCrise) this.log(`😟 ${this.nomHtml(pj)} devient <b>anxieux</b> : −1 au toucher et aux sauvegardes.`, 'peur');
    if (avant < PEUR.seuilCrise && pj.peur >= PEUR.seuilCrise && !pj.crise) this.declencherCrise(pj);
    if (pj.crise && pj.peur < PEUR.seuilAnxieux) {
      this.log(`😮‍💨 ${this.nomHtml(pj)} surmonte sa crise (${CRISES[pj.crise].nom}).`, 'bon');
      pj.crise = null;
    }
  }

  // À 100 de Peur : un trouble au hasard, ou parfois une vertu héroïque
  declencherCrise(pj) {
    const r = tirerCrise(pj);
    if (r === 'heroique') {
      this.log(`🌟 Face à la terreur, ${this.nomHtml(pj)} se révèle <b>HÉROÏQUE</b> ! Peur 40, +2 au toucher et aux dégâts, l'équipe reprend courage.`, 'titre bon');
      this.appliquerEtat(pj, 'heroique', 99);
      this.evt({ t: 'texte', cible: pj.id, texte: '🌟 HÉROÏQUE', classe: 'crit' });
      for (const p of this.pjs) if (p !== pj && p.pv > 0) this.modifierPeur(p, -15, true);
      return;
    }
    const k = CRISES[r];
    this.log(`${k.icone} ${this.nomHtml(pj)} craque : <b>${k.nom.toUpperCase()}</b> ! ${k.desc}`, 'titre mauvais');
    this.evt({ t: 'texte', cible: pj.id, texte: `${k.icone} ${k.nom}`, classe: 'peur' });
  }

  // Effets de la crise au début du tour ; renvoie true si le tour est consommé
  tourDeCrise(c) {
    const fin = d => { setTimeout(() => this.finTour(c), d + this.attente(600)); return true; };
    if (c.crise === 'desespoir') {
      this.log(`😭 Les lamentations de ${this.nomHtml(c)} glacent ses compagnons.`, 'peur');
      for (const p of this.pjs) if (p !== c && p.pv > 0) this.modifierPeur(p, 6, true);
    }
    if (c.crise === 'terreur' && Math.random() < 0.5) {
      this.log(`😱 ${this.nomHtml(c)} tremble de tous ses membres et ne peut pas agir.`, 'mauvais');
      this.evt({ t: 'texte', cible: c.id, texte: '😱 Paralysé', classe: 'peur' });
      return fin(this.maj());
    }
    if (c.crise === 'rage_aveugle' && Math.random() < 0.5) {
      const options = c.actions.map(id => ACTIONS[id]).filter(a => a && a.cible === 'ennemi' && !a.niveau && this.disponibilite(c, a).ok);
      if (options.length) {
        const act = Des.hasard(options), cibles = this.ciblesValides(c, act);
        this.log(`🤬 ${this.nomHtml(c)} perd le contrôle et frappe au hasard !`, 'mauvais');
        this.executer(c, act, act.zone ? null : Des.hasard(cibles));
        const d = this.maj();
        if (this.verifierFin()) return true;
        return fin(d);
      }
    }
    return false;
  }


  // ------------------------------------------------------ IA monstre
  tourMonstre(m) {
    if (this.fini || m.pv <= 0) return;
    const ch = m.chaos || {};
    const nb = (MONSTRES[m.modele].actionsParTour || 1) + (ch.mutations && ch.mutations.includes('rapide') ? 1 : 0)
      + (ch.pouvoirs && ch.pouvoirs.includes('furie') && m.pv < m.pvMax / 2 ? 1 : 0);
    let i = 0;
    const agir = () => {
      if (this.fini || m.pv <= 0 || !this.ennemis.includes(m)) return this.finTour(m);
      this.nettoyer();
      const options = m.actions.filter(act => this.disponibilite(m, act).ok);
      if (!options.length) {
        if (m.ligne === 'arriere') {
          this.deplacer(m, 'avant');
          this.log(`${this.nomHtml(m)} avance en ligne Avant.`);
        } else {
          this.log(`${this.nomHtml(m)} hésite.`);
        }
      } else {
        const act = Des.pondere(options.map(o => ({ ...o, poids: o.poids || 1, _ref: o })))._ref;
        const cible = act.zone || act.cible === 'soi' ? null : this.choisirCible(m, act);
        this.executer(m, act, cible);
      }
      const d = this.maj();
      if (this.verifierFin()) return;
      i++;
      if (i < nb) setTimeout(agir, d + this.attente(400));
      else setTimeout(() => this.finTour(m), d + this.attente(250));
    };
    agir();
  }

  choisirCible(m, act) {
    const cibles = this.ciblesValides(m, act);
    const provocateur = cibles.find(c => c.etats.defi);
    if (provocateur && Math.random() < 0.8) return provocateur;
    const ours = cibles.find(c => c.traits && c.traits.espritOurs && c.etats.rage);
    if (ours && Math.random() < 0.6) return ours;
    // Préférence légère pour les cibles blessées
    return Des.pondere(cibles.map(c => ({ c, poids: 1 + (1 - c.pv / c.pvMax) * 2 }))).c;
  }
}

// =====================================================================
// Actions spéciales : fonction(combat, acteur, action, cible, cibles)
// =====================================================================
const SPECIAUX = {
  changer_ligne(cb, a) {
    const l = a.ligne === 'avant' ? 'arriere' : 'avant';
    cb.deplacer(a, l);
    cb.log(`→ ${cb.nomHtml(a)} passe en ligne ${cb.nomLigne(l)}.`);
  },

  potion(cb, a, act, cible) {
    cb.resoudreSoin({}, act, cible);
  },
  sac() { /* ouvert par l'interface, jamais exécuté */ },

  marque(cb, a, act, cible) {
    for (const e of cb.ennemis) if (e.marquePar === a.id) { delete e.etats.marque; e.marquePar = null; }
    cible.marquePar = a.id;
    cb.appliquerEtat(cible, 'marque', 99);
  },

  inimitie(cb, a, act, cible) {
    for (const e of cb.ennemis) if (e.inimitiePar === a.id) { delete e.etats.inimitie; e.inimitiePar = null; }
    cible.inimitiePar = a.id;
    cb.appliquerEtat(cible, 'inimitie', 3);
  },

  forme_ours(cb, a) {
    const pv = a.traits.formeOurs || 12;
    a.egide = Math.max(a.egide || 0, pv);
    a.etats.ours = 99;
    if (a.ligne !== 'avant') cb.deplacer(a, 'avant');
    cb.log(`→ 🐻 ${cb.nomHtml(a)} se change en ours (${pv} PV temporaires) et charge en ligne Avant !`, 'bon');
    cb.evt({ t: 'texte', cible: a.id, texte: '🐻 Forme d\'ours', classe: 'etat' });
  },

  sommeil(cb, a, act, cibles) {
    const d = Des.lancer('5d8');
    let budget = d.total;
    cb.log(`→ 🎲 Réserve de sommeil : ${d.texte}`, 'jet');
    const candidats = cb.ennemis.filter(e => e.pv > 0 && !e.etats.endormi).sort((x, y) => x.pv - y.pv);
    let n = 0;
    for (const e of candidats) {
      if (MONSTRES[e.modele].mortVivant) { cb.log(`→ ${cb.nomHtml(e)} ne dort jamais (mort-vivant).`, 'jet rate'); continue; }
      if (e.pv > budget) break;
      budget -= e.pv;
      cb.appliquerEtat(e, 'endormi', 2);
      n++;
    }
    if (!n) cb.log('→ Personne ne s\'endort.', 'jet rate');
  },

  renvoi(cb, a, act) {
    const morts = cb.ennemis.filter(e => MONSTRES[e.modele].mortVivant);
    if (!morts.length) { cb.log('→ Aucun mort-vivant ici.', 'jet rate'); return; }
    for (const e of morts) {
      const s = cb.jetSauvegarde(e, 'SAG', a.ddSort);
      cb.log('→ ' + s.texte, s.reussite ? 'jet rate' : 'jet');
      if (!s.reussite) cb.appliquerEtat(e, 'etourdi', 2);
    }
  },

  // Soigne tous les alliés du lanceur (monstres)
  soinAllies(cb, a, act) {
    for (const e of cb.camp(a)) if (e.pv > 0) cb.resoudreSoin({}, { soin: act.soin }, e);
  },

  // Cultiste : se blesse et galvanise ses alliés
  ferveur(cb, a, act) {
    const perte = Math.min(4, a.pv - 1);
    if (perte > 0) { a.pv -= perte; cb.evt({ t: 'degats', cible: a.id, n: perte, crit: false, pvAvant: a.pv + perte, pvApres: a.pv, pvMax: a.pvMax }); }
    cb.log(`→ 🔥 ${cb.nomHtml(a)} s'entaille la paume : ses alliés entrent en ferveur fanatique !`, 'mauvais');
    for (const e of cb.camp(a)) if (e.pv > 0) cb.appliquerEtat(e, 'fervent', 3);
  },

  invoquer(cb, a, act) {
    const m = cb.creerMonstre(act.invocation, ' relevé');
    m.initiative = 0;
    m.ligne = 'avant';
    cb.ennemis.unshift(m);
    cb.ordre.push(m);
    cb.log(`→ Un ${cb.nomHtml(m)} surgit du sol en ligne Avant !`, 'mauvais');
    for (const p of cb.pjs) if (p.pv > 0) cb.modifierPeur(p, 5, true);
  }
};
