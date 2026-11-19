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
  voile: { nom: 'Voile d\'ombre', icone: '🌫️', desc: 'La prochaine attaque qui le toucherait rate.', permanent: true }
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
      actions, etats: {}, usages: {}, recharges: {},
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
  malusPeur(c) { return c.camp === 'pj' && !c.crise && c.peur >= PEUR.seuilAnxieux ? -1 : 0; }

  modele(c) { return c.camp === 'ennemi' ? MONSTRES[c.modele] : null; }

  // --------------------------------------------------------- démarrage
  demarrer() {
    this.log('⚔️ <b>Le combat commence !</b>', 'titre');
    for (const pj of this.pjs) {
      pj.etats = {};
      pj.usages = {};
      if (pj.pv <= 0) this.log(`${this.nomHtml(pj)} est toujours à terre (0 PV) : soignez-le pour qu'il se relève.`, 'mauvais');
      if (pj.pv <= 0) continue;
      if (pj.crise) this.log(`${CRISES[pj.crise].icone} ${this.nomHtml(pj)} est toujours en proie à : <b>${CRISES[pj.crise].nom}</b>.`, 'mauvais');
      const t = pj.traits;
      if (t.cacheDebut) pj.etats.cache = 99;
      if (t.voile) pj.etats.voile = 99;
      if (t.phenix) pj.usages.phenixDispo = true;
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
    c.bonusUtilise = false;

    // Effets de début de tour
    for (const e in c.etats) if (ETATS[e] && ETATS[e].finDebut) delete c.etats[e];
    for (const id in c.recharges) if (c.recharges[id] > 0) c.recharges[id]--;
    if (c.traits && c.traits.regen && c.pv < c.pvMax) {
      const avant = c.pv;
      c.pv = Math.min(c.pvMax, c.pv + c.traits.regen);
      this.log(`💍 ${this.nomHtml(c)} récupère ${c.pv - avant} PV (objet).`, 'bon');
    }
    if (c.traits && c.traits.saigne && c.pv > 1) {
      const perte = Math.min(c.traits.saigne, c.pv - 1);
      c.pv -= perte;
      this.log(`🩸 L'anneau de sang prélève ${perte} PV à ${this.nomHtml(c)}.`, 'mauvais');
      this.evt({ t: 'degats', cible: c.id, n: perte, crit: false, pvAvant: c.pv + perte, pvApres: c.pv, pvMax: c.pvMax });
    }

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
    if (action.ressource && !((acteur.ressources || {})[action.ressource] > 0)) return { ok: false, raison: 'Épuisée (repos long)' };
    if (action.pasSiActif && action.etat && acteur.etats[action.etat.nom]) return { ok: false, raison: 'Déjà active' };
    if (action.actionBonus && acteur.bonusUtilise) return { ok: false, raison: 'Action bonus déjà utilisée' };
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
    const d = this.maj();
    if (this.verifierFin()) return;
    // Action bonus (rage, maléfice…) : le héros garde son tour
    if (action.actionBonus && acteur.pv > 0) {
      acteur.bonusUtilise = true;
      this.log(`⚡ Action bonus : ${this.nomHtml(acteur)} peut encore agir.`, 'bon');
      setTimeout(() => { if (this.fini || this.actif !== acteur) return; this.attenteJoueur = true; this.maj(); }, d + this.attente(150));
      return;
    }
    setTimeout(() => this.finTour(acteur), d + this.attente(250));
  }

  executer(a, act, cible) {
    // Coûts
    let coutTxt = '';
    if (act.niveau) {
      const n = this.emplacementDispo(a, act.niveau);
      a.emplacements[n].restant--;
      coutTxt = ` <span class="cout">(emplacement niv. ${n})</span>`;
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

    const cibles = act.zone ? this.ciblesValides(a, act) : (act.cible === 'soi' ? [a] : [cible]);
    const distance = act.cible === 'ennemi' && (act.sort || act.vise.includes('arriere') || act.type === 'sauvegarde' || act.type === 'auto');
    this.evt({ t: 'action', source: a.id, camp: a.camp, nom: act.nom, icone: act.icone || '✦',
      cibles: cibles.map(c => c.id), melee: act.cible === 'ennemi' && !distance, distance,
      typeAct: act.type, typeDeg: act.typeDeg, sort: !!act.sort, special: act.special || null });

    if (act.etatLanceur) this.appliquerEtat(a, act.etatLanceur.nom, act.etatLanceur.duree);
    switch (act.type) {
      case 'attaque':
        for (const c of cibles) {
          // Attaque supplémentaire (Guerrier niv. 5) : deux coups avec les armes
          const nb = act.nbAttaques || ((act.rayons && a.traits && a.traits[act.rayons]) ? 2 : 0) || (act.arme && !act.zone && a.traits && a.traits.attaqueSupp ? 2 : 1);
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
          this.log(`→ Touche automatiquement : ${d.texte} ${act.typeDeg}`, 'jet');
          this.infliger(c, d.total, act.typeDeg, a, false);
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
  }

  // Avantage / désavantage d'une attaque
  modeAttaque(a, act, c) {
    const av = [], dv = [];
    if (a.etats.cache) av.push('caché');
    if (act.avantage) av.push('feinte');
    if (c.etats.renverse) av.push('cible renversée');
    if (c.etats.endormi) av.push('cible endormie');
    if (this.panique(a)) dv.push('paniqué');
    if (a.etats.empoisonne) dv.push('empoisonné');
    if (a.etats.entrave) dv.push('gelé');
    if (c.etats.esquive) dv.push('cible en esquive');
    if (c.etats.temeraire) av.push('cible téméraire');
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
    if (a.etats.cache) delete a.etats.cache;
    if (a.etats.entrave) delete a.etats.entrave;
    const r = Des.d20(mode);
    const bonus = this.bonusToucher(a, act);
    let total = r.nat + bonus;
    let txt = `${r.texte} ${signe(bonus)}`;
    if (a.etats.benit || a.etats.fervent) { const b = Des.d(4); total += b; txt += ` +1d4[${b}]`; }
    const mal = this.malusPeur(a);
    if (mal) { total += mal; txt += ` ${mal} (anxieux)`; }
    if (a.etats.heroique) { total += 2; txt += ' +2 (héroïque)'; }
    if (a.etats.inspire) { const b = Des.d(6); total += b; txt += ` +insp.1d6[${b}]`; delete a.etats.inspire; }
    const ca = c.ca + (c.etats.ecorce ? 3 : 0) + (c.etats.agathys ? 2 : 0) + (c.etats.defi ? 2 : 0) + (c.etats.bouclier ? 5 : 0);
    const critique = r.nat >= ((a.traits && a.traits.critMin) || 20);
    let touche = critique || (r.nat !== 1 && total >= ca);
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
      return false;
    }
    ligne += critique ? '<b class="crit">CRITIQUE !</b>' : 'touché.';
    // Dégâts
    const d = Des.lancer(act.degats, critique);
    let degats = d.total;
    let dTxt = d.texte;
    if (act.arme && a.bonusDegats) { degats += a.bonusDegats; dTxt += ` +${a.bonusDegats} (objet)`; }
    if (act.arme && a.etats.rage) { degats += 2; dTxt += ' +2 (rage)'; }
    if (a.etats.heroique) { degats += 2; dTxt += ' +2 (héroïque)'; }
    if (c.etats.marque && c.marquePar === a.id) { const m = Des.lancer('1d6', critique); degats += m.total; dTxt += ` + marque ${m.texte}`; }
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
    }
    this.log(`${ligne} Dégâts : ${dTxt} → <b>${degats}</b> ${act.typeDeg}`, critique ? 'jet crit' : 'jet');

    if (critique) this.peurCritique(a, c);
    this.infliger(c, degats, act.typeDeg, a, critique);
    this.effetsApresCoup(a, act, c, degats);

    if (act.effetSiTouche && c.pv > 0) this.appliquerEffet(a, act.effetSiTouche, c);
    if (act.recul && c.pv > 0) this.reculer(c, act.recul);
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
    if (mal) { total += mal; txt += ` ${mal} (anxieux)`; }
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
        const total = s.reussite ? Math.floor(d.total / 2) : d.total;
        this.log(`${ligne}. Dégâts : ${d.texte}${s.reussite ? ' ÷2' : ''} → <b>${total}</b> ${act.typeDeg}`, 'jet');
        this.infliger(c, total, act.typeDeg, a, false);
      }
    } else {
      this.log(ligne, 'jet');
    }
    if (!s.reussite && act.effetSiEchec && c.pv > 0) this.appliquerEffet(a, act.effetSiEchec, c, true);
  }

  resoudreSoin(a, act, c) {
    let total = 0;
    if (act.soin && act.soin !== '0') {
      const d = Des.lancer(act.soin);
      total = d.total + (a.bonusSoin && act.sort ? a.bonusSoin : 0);
      if (c.crise === 'egoisme' && a.camp === 'pj' && a !== c) {
        total = Math.floor(total / 2);
        this.log(`→ 🙄 ${this.nomHtml(c)} repousse l'aide : soin réduit de moitié.`, 'mauvais');
      }
      const etaitATerre = c.pv <= 0;
      const avant = Math.max(0, c.pv);
      c.pv = Math.min(c.pvMax, avant + total);
      this.log(`→ ${this.nomHtml(c)} récupère ${d.texte}${a.bonusSoin && act.sort ? ` +${a.bonusSoin}` : ''} → <b>${c.pv - avant}</b> PV${etaitATerre ? ' et <b>se relève</b> !' : ''}`, 'jet bon');
      this.evt({ t: 'soin', cible: c.id, n: c.pv - avant, pvAvant: avant, pvApres: c.pv, pvMax: c.pvMax });
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
    const pvAvant = Math.max(0, c.pv);
    c.pv -= n;
    if (c.camp === 'pj' && c.pv > 0 && n >= c.pvMax * 0.3) {
      this.log(`→ 😨 Le coup ébranle ${this.nomHtml(c)} !`, 'peur');
      this.modifierPeur(c, PEUR.grosCoup, true);
    }
    this.evt({ t: 'degats', cible: c.id, n, crit: critique, pvAvant, pvApres: Math.max(0, c.pv), pvMax: c.pvMax });
    if (c.etats.endormi) { delete c.etats.endormi; this.log(`→ ${this.nomHtml(c)} se réveille !`, 'etat'); }

    if (c.pv <= 0 && m && m.robustesse && type !== 'radiant' && !critique) {
      const dd = 5 + n;
      const s = this.jetSauvegarde(c, 'CON', dd);
      this.log(`→ Robustesse des morts-vivants : ${s.texte}`, 'jet');
      if (s.reussite) { c.pv = 1; this.evt({ t: 'soin', cible: c.id, n: 1, pvAvant: 0, pvApres: 1, pvMax: c.pvMax }); this.log(`→ ${this.nomHtml(c)} refuse de tomber (1 PV) !`, 'mauvais'); return; }
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
        if (source && source.camp === 'pj') this.modifierPeur(source, PEUR.ennemiTue, true);
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
      }
    }
  }

  // discret = ne pas écrire de ligne dans le journal pour les petites variations
  modifierPeur(pj, n, discret = false) {
    if (pj.camp !== 'pj') return;
    if (n > 0 && this.jeu && this.jeu.peurMult) n = Math.round(n * this.jeu.peurMult);
    if (n > 0 && pj.traits.peurReduite) n = Math.ceil(n / 2);
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
    const nb = MONSTRES[m.modele].actionsParTour || 1;
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
