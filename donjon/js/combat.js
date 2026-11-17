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
  cache: { nom: 'Caché', icone: '🌑', desc: 'Prochaine attaque avec avantage.', permanent: true }
};

const PEUR = {
  critiqueSubi: 20,      // un ennemi réussit un critique sur ce PJ
  critiqueAllie: 5,      // un ennemi réussit un critique sur un allié
  allieATerre: 15,       // un allié tombe à 0 PV
  critiqueInflige: -5,   // un PJ réussit un critique (toute l'équipe)
  ennemiTue: -5,         // le PJ tue un ennemi
  victoire: -10          // fin de combat victorieuse
};

class Combat {
  // rencontre : { avant: [ids], arriere: [ids] }
  constructor(equipe, rencontre, jeu) {
    this.jeu = jeu;
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
    const d = MONSTRES[id];
    return {
      id: 'm' + (++this.compteur), modele: id, camp: 'ennemi',
      nom: d.nom + suffixe, icone: d.icone,
      pv: d.pv, pvMax: d.pv, ca: d.ca, caracs: d.caracs,
      actions: d.actions, etats: {}, usages: {}, recharges: {},
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
  panique(c) { return c.camp === 'pj' && c.peur >= 100; }

  modele(c) { return c.camp === 'ennemi' ? MONSTRES[c.modele] : null; }

  // --------------------------------------------------------- démarrage
  demarrer() {
    this.log('⚔️ <b>Le combat commence !</b>', 'titre');
    for (const pj of this.pjs) {
      pj.etats = {};
      pj.usages = {};
      if (pj.pv <= 0) this.log(`${this.nomHtml(pj)} est toujours à terre (0 PV) : soignez-le pour qu'il se relève.`, 'mauvais');
      if (pj.traits.cacheDebut && pj.pv > 0) pj.etats.cache = 99;
    }
    // Initiative
    const tous = [...this.pjs, ...this.ennemis];
    const lignes = [];
    for (const c of tous) {
      const mod = modCarac(c.caracs.DEX);
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

    // Effets de début de tour
    for (const e in c.etats) if (ETATS[e] && ETATS[e].finDebut) delete c.etats[e];
    for (const id in c.recharges) if (c.recharges[id] > 0) c.recharges[id]--;
    if (c.traits && c.traits.regen && c.pv < c.pvMax) {
      const avant = c.pv;
      c.pv = Math.min(c.pvMax, c.pv + c.traits.regen);
      this.log(`💍 ${this.nomHtml(c)} récupère ${c.pv - avant} PV (anneau).`, 'bon');
    }

    if (c.etats.etourdi || c.etats.endormi) {
      this.log(`${ETATS[c.etats.etourdi ? 'etourdi' : 'endormi'].icone} ${this.nomHtml(c)} ${c.etats.etourdi ? 'est étourdi' : 'dort'} et perd son tour.`);
      this.evt({ t: 'texte', cible: c.id, texte: ETATS[c.etats.etourdi ? 'etourdi' : 'endormi'].icone, classe: 'etat' });
      const d = this.maj();
      return setTimeout(() => this.finTour(c), d + 500);
    }

    if (c.camp === 'pj') {
      this.attenteJoueur = true;
      this.maj(); // attente du joueur
    } else {
      this.maj();
      setTimeout(() => this.tourMonstre(c), this.delaiMonstre);
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
      setTimeout(() => this.surFin('victoire'), this.resteAnim() + 900);
      return true;
    }
    if (this.pjs.every(p => p.pv <= 0)) {
      this.fini = true;
      this.resultat = 'defaite';
      this.log('💀 <b>Toute l\'équipe est à terre…</b>', 'titre mauvais');
      this.maj();
      setTimeout(() => this.surFin('defaite'), this.resteAnim() + 1200);
      return true;
    }
    return false;
  }

  // ------------------------------------------------- disponibilité
  // Renvoie { ok, raison }
  disponibilite(acteur, action) {
    if (!action.depuis.includes(acteur.ligne)) return { ok: false, raison: `Seulement depuis la ligne ${this.nomLigne(action.depuis[0])}` };
    if (action.niveau && !this.emplacementDispo(acteur, action.niveau)) return { ok: false, raison: 'Plus d\'emplacement' };
    if (action.parCombat && (acteur.usages[action.nom] || 0) >= action.parCombat) return { ok: false, raison: 'Déjà utilisée' };
    if (action.recharge && acteur.recharges && acteur.recharges[action.nom] > 0) return { ok: false, raison: 'En recharge' };
    if (action.special === 'potion' && this.jeu.potions <= 0) return { ok: false, raison: 'Aucune potion' };
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
    setTimeout(() => this.finTour(acteur), d + 250);
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

    switch (act.type) {
      case 'attaque':
        for (const c of cibles) {
          for (let i = 0; i < (act.nbAttaques || 1); i++) {
            if (c.pv <= 0) break;
            this.resoudreAttaque(a, act, c, act.nbAttaques > 1 ? i + 1 : 0);
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
    if (a.etats.benit) { const b = Des.d(4); total += b; txt += ` +1d4[${b}]`; }
    const ca = c.ca + (c.etats.defi ? 2 : 0) + (c.etats.bouclier ? 5 : 0);
    const critique = r.nat === 20;
    const touche = critique || (r.nat !== 1 && total >= ca);
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
    // Attaque sournoise
    if (act.sournoise && !a.sournoiseUtilisee && a.classe === 'roublard' && this.sournoisePossible(a, c, mode)) {
      const s = Des.lancer(CLASSES.roublard.sournoise, critique);
      degats += s.total;
      dTxt += ` + sournoise ${s.texte}`;
      a.sournoiseUtilisee = true;
    }
    this.log(`${ligne} Dégâts : ${dTxt} → <b>${degats}</b> ${act.typeDeg}`, critique ? 'jet crit' : 'jet');

    if (critique) this.peurCritique(a, c);
    this.infliger(c, degats, act.typeDeg, a, critique);

    if (act.effetSiTouche && c.pv > 0) this.appliquerEffet(a, act.effetSiTouche, c);
    if (act.recul && c.pv > 0) this.reculer(c, act.recul);
    return true;
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
      return modCarac(c.caracs[carac]) + (c.sauvegardes.includes(carac) ? c.maitrise : 0) + c.bonusSauv;
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
    if (c.etats.benit) { const b = Des.d(4); total += b; txt += ` +1d4[${b}]`; }
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
    }
    if (n <= 0) { this.evt({ t: 'texte', cible: c.id, texte: 'Immunisé', classe: 'rate' }); return; }
    const pvAvant = Math.max(0, c.pv);
    c.pv -= n;
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
        if (source && source.camp === 'pj') this.modifierPeur(source, PEUR.ennemiTue, true);
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
    if (n > 0 && pj.traits.peurReduite) n = Math.ceil(n / 2);
    const avant = pj.peur;
    pj.peur = Math.max(0, Math.min(100, pj.peur + n));
    const diff = pj.peur - avant;
    if (diff === 0) return;
    this.evt({ t: 'peur', cible: pj.id, n: diff, avant, apres: pj.peur });
    if (!discret) this.log(`${diff > 0 ? '😨' : '😌'} ${this.nomHtml(pj)} Peur ${diff > 0 ? '+' : ''}${diff} (${pj.peur}/100)`, diff > 0 ? 'peur' : 'bon');
    if (avant < 100 && pj.peur >= 100) this.log(`😱 ${this.nomHtml(pj)} est <b>PANIQUÉ</b> : désavantage aux attaques et sauvegardes !`, 'mauvais');
    if (avant >= 100 && pj.peur < 100) this.log(`${this.nomHtml(pj)} reprend ses esprits.`, 'bon');
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
      if (i < nb) setTimeout(agir, d + 400);
      else setTimeout(() => this.finTour(m), d + 250);
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
    cb.jeu.potions--;
    cb.resoudreSoin({}, { soin: '2d4+2' }, cible);
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
