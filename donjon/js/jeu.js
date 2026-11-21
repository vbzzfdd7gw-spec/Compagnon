// =====================================================================
// État de la partie et enchaînement des écrans.
// =====================================================================

const CLE_SAUVEGARDE = 'donjon-roguelike-v1';

// ---------------------------------------------------------------------
// Défi du jour : campagne, équipe et modificateur tirés d'après la date ;
// le hasard de la partie suit la même graine pour tout le monde.
// ---------------------------------------------------------------------
const DefiDuJour = {
  cle: 'donjon-defi',
  MODIFS: [
    { id: 'mutants', icone: '🧬', nom: 'Monstres mutants', desc: '30 % des monstres mutent, comme en Héroïque.' },
    { id: 'peur', icone: '😱', nom: 'Nuit d\'effroi', desc: 'La Peur monte 30 % plus vite.' },
    { id: 'pauvres', icone: '🪙', nom: 'Bourse vide', desc: 'Départ sans or, et l\'or gagné est réduit de 40 %.' },
    { id: 'robustes', icone: '💪', nom: 'Héros endurcis', desc: '+8 PV maximum pour chaque héros, mais aucune potion au départ.' },
    { id: 'benis', icone: '✨', nom: 'Bénédiction', desc: 'Toute l\'équipe commence chaque combat bénie.' },
    { id: 'boss', icone: '👑', nom: 'Boss enragés', desc: 'Chaque boss reçoit un pouvoir du chaos.' }
  ],
  aujourdhui() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; },
  graine(date) { let h = 2166136261; for (const ch of 'cryptes-' + date) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; },
  // Configuration du jour, tirée avec un générateur à part (indépendant de la partie)
  config(date = this.aujourdhui()) {
    let e = this.graine(date);
    const r = () => { e = (e + 0x6D2B79F5) >>> 0; let t = Math.imul(e ^ (e >>> 15), e | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const pioche = l => l[Math.floor(r() * l.length)];
    const camps = CAMPAGNES.filter(c => !c.aleatoire && c.difficulte <= 6);
    const campagne = pioche(camps).id;
    const fronts = TOUTES_CLASSES.filter(k => CLASSES[k].ligne === 'avant');
    const classes = [pioche(fronts)];
    classes.push(pioche(SOIGNEURS.filter(k => !classes.includes(k))));
    while (classes.length < 4) { const k = pioche(TOUTES_CLASSES); if (!classes.includes(k)) classes.push(k); }
    const sousClasses = {};
    for (const k of classes) sousClasses[k] = pioche(SOUS_CLASSES[k]).id;
    return { date, campagne, classes, sousClasses, modif: pioche(this.MODIFS).id };
  },
  modif(id) { return this.MODIFS.find(m => m.id === id); },
  scores() { try { return JSON.parse(localStorage.getItem(this.cle) || '{}'); } catch (e) { return {}; } },
  record(date = this.aujourdhui()) { return (this.scores()[date] || {}).record || 0; },
  noter(date, score) {
    const s = this.scores(), j = s[date] = s[date] || { record: 0, essais: 0 };
    j.essais++;
    const nouveau = score > j.record;
    if (nouveau) j.record = score;
    try { localStorage.setItem(this.cle, JSON.stringify(s)); } catch (e) { /* rien */ }
    return nouveau;
  }
};

const Jeu = {
  ecran: 'titre',
  equipe: [],
  carte: null,
  potions: 2,
  or: 0,
  sac: {},          // consommables autres que la potion : { cle: quantité }
  marchand: null,
  etage: 0,
  campagne: 'crypte',
  peurMult: 1,
  debloquee: null,
  reposLongUtilise: false,
  combat: null,
  offres: null,
  titreOffres: '',
  evenement: null,
  repos: null,
  noeudActuel: null,
  stats: null,
  finale: null,

  // --------------------------------------------------------- partie
  nouvellePartie(idCampagne = 'crypte', classes = ORDRE_CLASSES, sousClasses = null, diff = 'normal') {
    const c = Progression.campagne(idCampagne);
    this.campagne = c.id;
    this.defi = null;
    this.scoreDefi = null;
    Hasard.libre();
    this.difficulte = c.aleatoire ? 'normal' : diff;
    this.peurMult = (c.regles.peurMult || 1) + difficulte(this.difficulte).peur;
    this.debloquee = null;
    this.equipe = classes.map(k => creerPJ(k, (sousClasses || {})[k]));
    // Mode Chaos : étages tirés au hasard, carte double, héros niveau 4
    this.etagesAleatoires = c.aleatoire ? genererEtagesAleatoires() : null;
    if (c.aleatoire) this.equipe.forEach(pj => { monterNiveau(pj); resoudreChoixSorts(pj); this.restaurerRessources(pj); pj.pv = pj.pvMax; });
    this.xp = c.aleatoire ? SEUILS_XP[4] : 0;
    this.niveauxEnAttente = [];
    // Au moins un héros en ligne Avant et un en ligne Arrière
    if (!this.equipe.some(p => p.ligne === 'avant')) this.equipe[0].ligne = 'avant';
    if (!this.equipe.some(p => p.ligne === 'arriere')) this.equipe[this.equipe.length - 1].ligne = 'arriere';
    this.carte = c.aleatoire ? Carte.genererDouble() : Carte.generer();
    this.potions = c.regles.potions ?? 2;
    this.or = c.regles.or ?? 30;
    this.sac = {};
    this.etage = 0;
    this.evenementsVus = [];
    Progression.noterRecord(c.id, 1);
    this.reposLongUtilise = false;
    this.stats = { combats: 0, ennemis: 0, salles: 0 };
    this.allerCarte();
  },

  allerCarte() {
    if (this.niveauxEnAttente && this.niveauxEnAttente.length) { this.suiteNiveau = 'carte'; this.ecran = 'niveau'; return Ui.rendu(); }
    this.combat = null;
    this.offres = null;
    this.evenement = null;
    this.repos = null;
    this.ecran = 'carte';
    this.sauvegarder();
    Ui.rendu();
  },

  sauvegarder() {
    try {
      localStorage.setItem(CLE_SAUVEGARDE, JSON.stringify({
        equipe: this.equipe, carte: this.carte, etagesAleatoires: this.etagesAleatoires, difficulte: this.difficulte, defi: this.defi, hasard: Hasard.etat, potions: this.potions, or: this.or, sac: this.sac, evenementsVus: this.evenementsVus, etage: this.etage, campagne: this.campagne,
        reposLongUtilise: this.reposLongUtilise, stats: this.stats, xp: this.xp
      }));
    } catch (e) { /* stockage indisponible : on continue sans sauvegarde */ }
  },

  sauvegardeExiste() {
    try { return !!localStorage.getItem(CLE_SAUVEGARDE); } catch (e) { return false; }
  },

  charger() {
    try {
      const d = JSON.parse(localStorage.getItem(CLE_SAUVEGARDE));
      Object.assign(this, d);
      this.etage = this.etage || 0;
      this.campagne = this.campagne || 'crypte';
      this.etagesAleatoires = d.etagesAleatoires || null;
      this.or = this.or || 0;
      this.sac = this.sac || {};
      this.evenementsVus = this.evenementsVus || [];
      this.difficulte = this.difficulte || 'normal';
      this.niveauxEnAttente = [];
      if (this.xp === undefined) this.xp = SEUILS_XP[this.equipe[0].niveau || 3] || 0;
      this.defi = d.defi || null;
      if (this.defi && d.hasard !== null && d.hasard !== undefined) Hasard.graine(d.hasard); else Hasard.libre();
      this.peurMult = (Progression.campagne(this.campagne).regles.peurMult || 1) + difficulte(this.difficulte).peur;
      this.equipe.forEach(p => {
        p.niveau = p.niveau || 3;
        p.actions = p.actions.filter(id => ACTIONS[id]);           // actions retirées du jeu
        p.grimoire = (p.grimoire || []).filter(id => ACTIONS[id]);
        resoudreChoixSorts(p);
        if (!p.ressources) this.restaurerRessources(p);
      });
      // Sauvegardes d'avant les lignes : les deux premiers devant
      this.equipe.forEach((p, i) => { if (!p.ligne) p.ligne = i < 2 ? 'avant' : 'arriere'; });
      this.allerCarte();
      return true;
    } catch (e) { return false; }
  },

  effacerSauvegarde() {
    try { localStorage.removeItem(CLE_SAUVEGARDE); } catch (e) { /* rien */ }
  },

  // ------------------------------------------------ utilitaires PJ
  pj(classe) { return this.equipe.find(p => p.classe === classe); },
  // Héros debout le plus doué dans une caractéristique (événements)
  meilleur(carac) {
    return this.debout().sort((a, b) => b.caracs[carac] - a.caracs[carac])[0] || null;
  },
  lanceur() { return this.debout().find(p => p.emplacements[1] && p.emplacements[1].restant > 0) || null; },

  // ------------------------------------------- composition d'équipe
  choisirCampagne(id, diff) {
    this.campagneChoisie = id;
    this.difficulteChoisie = diff || (this.diffParCampagne || {})[id] || 'normal';
    if (!Progression.difficulteOuverte(Progression.campagne(id), this.difficulteChoisie)) this.difficulteChoisie = 'normal';
    this.composition = Reglages.equipe && Reglages.equipe.length === 4 && Reglages.equipe.every(c => CLASSES[c]) ? Reglages.equipe.slice() : ORDRE_CLASSES.slice();
    this.ecran = 'composition';
    Ui.rendu();
  },
  basculerClasse(c) {
    const i = this.composition.indexOf(c);
    if (i >= 0) this.composition.splice(i, 1);
    else if (this.composition.length < 4) this.composition.push(c);
    Ui.rendu();
  },
  equipeAleatoire() {
    // Toujours au moins un héros de front et un soigneur
    const fronts = TOUTES_CLASSES.filter(c => CLASSES[c].ligne === 'avant');
    const choix = [Des.hasard(fronts)];
    const soins = SOIGNEURS.filter(c => !choix.includes(c));
    choix.push(Des.hasard(soins));
    for (const c of Des.melanger(TOUTES_CLASSES)) if (choix.length < 4 && !choix.includes(c)) choix.push(c);
    this.composition = choix;
    const sc = { ...(Reglages.sousClasses || {}) };
    for (const k of choix) sc[k] = Des.hasard(SOUS_CLASSES[k].filter(sousClasseDebloquee)).id;
    Reglages.sousClasses = sc;
    Ui.rendu();
  },
  partir() {
    if (this.composition.length !== 4) return;
    Reglages.equipe = this.composition.slice();
    Reglages.sauver();
    const sc = {};
    for (const k of this.composition) sc[k] = this.sousClasseChoisie(k);
    this.nouvellePartie(this.campagneChoisie, this.composition, sc, this.difficulteChoisie || 'normal');
  },
  // Sous-classe retenue pour une classe (la première si le choix est verrouillé)
  sousClasseChoisie(k) {
    const id = (Reglages.sousClasses || {})[k];
    const sc = SOUS_CLASSES[k].find(s => s.id === id);
    return sc && sousClasseDebloquee(sc) ? sc.id : SOUS_CLASSES[k][0].id;
  },
  choisirSousClasse(k, id) {
    const sc = SOUS_CLASSES[k].find(s => s.id === id);
    if (!sc || !sousClasseDebloquee(sc)) return;
    Reglages.sousClasses = { ...(Reglages.sousClasses || {}), [k]: id };
    Reglages.sauver();
    if (!this.composition.includes(k) && this.composition.length < 4) this.composition.push(k);
    Ui.rendu();
  },
  debout() { return this.equipe.filter(p => p.pv > 0); },

  // ------------------------------------------------- défi du jour
  lancerDefi() {
    const c = DefiDuJour.config();
    this.nouvellePartie(c.campagne, c.classes, c.sousClasses, c.modif === 'mutants' ? 'heroique' : 'normal');
    this.defi = { date: c.date, modif: c.modif };
    Hasard.graine(DefiDuJour.graine(c.date) ^ 0x9e3779b9);
    this.carte = Carte.generer();     // carte tirée avec la graine du jour
    if (c.modif === 'peur') this.peurMult += 0.3;
    if (c.modif === 'pauvres') this.or = 0;
    if (c.modif === 'robustes') { this.equipe.forEach(p => { p.pvMax += 8; p.pv += 8; }); this.potions = 0; }
    if (c.modif === 'benis') this.equipe.forEach(p => { p.traits.benitDebut = true; });
    this.allerCarte();
  },
  // Score : étages, salles, combats, or ; gros bonus et PV restants en cas de victoire
  noterDefi(victoire) {
    if (!this.defi) return;
    const pv = this.equipe.reduce((s, p) => s + Math.max(0, p.pv), 0);
    const score = (this.etage + 1) * 300 + this.stats.salles * 15 + this.stats.combats * 40 + this.or + (victoire ? 1500 + pv * 5 : 0);
    this.scoreDefi = { score, record: DefiDuJour.noter(this.defi.date, score), meilleur: DefiDuJour.record(this.defi.date) };
  },
  listeSousClassesDebloquees() {
    const l = [];
    for (const k of TOUTES_CLASSES) for (const sc of SOUS_CLASSES[k]) if (sousClasseDebloquee(sc)) l.push(k + ':' + sc.id);
    return l;
  },

  soigner(pj, n) { pj.pv = Math.min(pj.pvMax, Math.max(0, pj.pv) + n); },
  blesser(pj, n) { pj.pv = Math.max(0, pj.pv - n); },
  // Peur hors combat (mêmes paliers et crises qu'en combat)
  peur(pj, n) {
    if (n > 0 && this.peurMult) n = Math.round(n * this.peurMult);
    if (n > 0 && pj.traits.peurReduite) n = Math.ceil(n / 2);
    const avant = pj.peur;
    pj.peur = Math.max(pj.traits.peurMin || 0, Math.min(100, pj.peur + n));
    if (avant < PEUR.seuilCrise && pj.peur >= PEUR.seuilCrise && !pj.crise && tirerCrise(pj) === 'heroique')
      this.equipe.forEach(p => { if (p !== pj) p.peur = Math.max(0, p.peur - 15); });
    if (pj.crise && pj.peur < PEUR.seuilAnxieux) pj.crise = null;
  },
  // Restaure les ressources de classe (rage…) : repos long, montée de niveau
  restaurerRessources(pj) { pj.ressources = ressourcesPJ(pj); },

  // Test de caractéristique hors combat
  test(pj, carac, dd, maitrise) {
    const mode = pj.peur >= 100 ? -1 : 0;
    const r = Des.d20(mode);
    const bonus = modCarac(pj.caracs[carac]) + (maitrise ? pj.maitrise : 0) + (pj.traits.bonusTest || 0);
    const total = r.nat + bonus;
    const reussite = total >= dd;
    return { reussite, texte: `🎲 ${pj.nom}, test de ${carac} : ${r.texte} ${signe(bonus)} = <b>${total}</b> contre DD ${dd} → ${reussite ? '<b>réussite</b>' : '<b>échec</b>'}` };
  },

  changerLignePJ(id) {
    const pj = this.equipe.find(p => p.id === id);
    pj.ligne = pj.ligne === 'avant' ? 'arriere' : 'avant';
    this.sauvegarder();
  },

  // -------------------------------------------------------- carte
  choisirNoeud(id) {
    if (!Carte.accessibles(this.carte).includes(id)) return;
    const n = Carte.noeud(this.carte, id);
    this.carte.position = id;
    n.visite = true;
    Son.jouer('pas');
    this.noeudActuel = n;
    this.stats.salles++;
    switch (n.type) {
      case 'combat': return this.lancerCombat(Des.hasard(this.rencontres()[Carte.niveau(n)]), 'combat');
      case 'elite': return this.lancerCombat(Des.hasard(this.rencontres().elite), 'elite');
      case 'boss': return this.lancerCombat(Des.hasard(this.rencontres().boss), 'boss');
      case 'repos': this.repos = { mode: null }; this.ecran = 'repos'; return Ui.rendu();
      case 'tresor': return this.ouvrirTresor();
      case 'marchand': return this.ouvrirMarchand();
      case 'evenement':
        this.evenement = { def: this.tirerEvenement(), resultat: null, historique: [], donnees: {} };
        this.ecran = 'evenement';
        return Ui.rendu();
    }
  },

  campagneCourante() { return Progression.campagne(this.campagne); },
  etages() { return this.etagesAleatoires || this.campagneCourante().etages; },
  etageCourant() { return this.etages()[this.etage]; },
  rencontres() { return this.etageCourant().rencontres; },
  dernierEtage() { return this.etage >= this.etages().length - 1; },

  // Boss d'étage vaincu : niveau supérieur, repos complet, nouvelle carte
  etageSuivant(gain = 0) {
    this.etage++;
    Progression.noterRecord(this.campagne, this.etage + 1);
    // Repos complet entre deux étages
    for (const pj of this.equipe) {
      pj.pv = pj.pvMax;
      pj.desVie.restant = pj.desVie.max;
      for (const n in pj.emplacements) pj.emplacements[n].restant = pj.emplacements[n].max;
      this.restaurerRessources(pj);
      pj.peur = 0;
      pj.crise = null;
    }
    this.reposLongUtilise = false;
    if (!this.carte.double) this.carte = Carte.generer();   // carte double : on continue sur la même
    const e = this.etageCourant();
    this.proposerRecompenses(Recompenses.generer(this.equipe, { boss: true }), `⬇️ ${e.nom}`,
      `<i>${e.intro}</i><br>L'équipe récupère toutes ses forces. 💰 +${gain} or · ⭐ +${GAINS_XP.boss} XP.<br>Choisissez le butin du boss :`);
  },

  // Expérience : toute l'équipe partage la même ; renvoie une ligne de texte
  gagnerXP(n) {
    this.xp = (this.xp || 0) + n;
    const cible = niveauPourXP(this.xp);
    this.niveauxEnAttente = this.niveauxEnAttente || [];
    for (const pj of this.equipe) {
      while ((pj.niveau || 3) < cible) {
        const avant = this.photoHeros(pj), depuis = pj.niveau || 3;
        const gains = monterNiveau(pj);
        if (!gains.length) break;
        const f = this.niveauxEnAttente.find(x => x.pj === pj.id);
        if (f) { f.gains.push(...gains); f.niveau = pj.niveau; f.apres = this.photoHeros(pj); }
        else this.niveauxEnAttente.push({ pj: pj.id, depuis, niveau: pj.niveau, gains, avant, avantGrimoire: [...(pj.grimoire || [])], apres: this.photoHeros(pj) });
      }
    }
    return `⭐ +${n} XP${this.niveauxEnAttente.length ? ' — <b>niveau supérieur !</b>' : ''}`;
  },

  // Progression vers le niveau suivant : { niveau, xp, debut, fin } (fin null au niveau max)
  progresXP() {
    const niv = niveauPourXP(this.xp || 0);
    return { niveau: niv, xp: this.xp || 0, debut: SEUILS_XP[niv] || 0, fin: SEUILS_XP[niv + 1] ?? null };
  },

  // Ce qui change à la montée de niveau (comparé avant / après)
  photoHeros(pj) {
    const empl = {};
    for (const n in pj.emplacements) empl[n] = pj.emplacements[n].max;
    return { pvMax: pj.pvMax, maitrise: pj.maitrise, bonusArme: pj.bonusArme, bonusSort: pj.bonusSort, ddSort: pj.ddSort,
      emplacements: empl, actions: [...pj.actions], ressources: { ...ressourcesPJ(pj) }, desVie: pj.desVie.max };
  },

  // Grimoire : préparer ou ranger une action (hors combat)
  preparerAction(pjId, id) {
    const pj = this.equipe.find(p => p.id === pjId);
    if (!pj || this.combat || !pj.grimoire || !pj.grimoire.includes(id) || pj.actions.length >= maxActions(pj)) return;
    pj.grimoire.splice(pj.grimoire.indexOf(id), 1);
    pj.actions.push(id);
    this.sauvegarder();
  },
  rangerAction(pjId, id) {
    const pj = this.equipe.find(p => p.id === pjId);
    if (!pj || this.combat || !pj.actions.includes(id) || pj.actions.length <= 1) return;
    pj.actions.splice(pj.actions.indexOf(id), 1);
    pj.grimoire = pj.grimoire || [];
    pj.grimoire.push(id);
    this.sauvegarder();
  },
  // Écran de niveau : sort choisi parmi les trois proposés
  choisirSort(pjId, id) {
    const pj = this.equipe.find(p => p.id === pjId);
    if (!pj || !pj.choixSorts || !pj.choixSorts.length || !pj.choixSorts[0].includes(id)) return;
    pj.choixSorts.shift();
    apprendre(pj, id);
  },

  // Écran de niveau validé : on reprend là où on allait (récompense ou carte)
  apresNiveau() {
    if (this.equipe.some(p => p.choixSorts && p.choixSorts.length)) return;   // sorts à choisir d'abord
    this.niveauxEnAttente = [];
    if (this.suiteNiveau === 'recompense') { this.ecran = 'recompense'; return Ui.rendu(); }
    this.allerCarte();
  },

  // ------------------------------------------------------- combat
  lancerCombat(rencontre, type, intro) {
    const chaos = this.campagneCourante().aleatoire;
    if (type === 'elite' && !chaos) rencontre = renforcerElite(rencontre, this.etage);
    const force = rencontre.force || this.etageCourant().force;
    this.combat = new Combat(this.equipe, rencontre, this, chaos ? force : forceEtage(force, this.etage));
    this.combat.type = type;
    this.combat.theme = rencontre.theme || this.etageCourant().theme;
    if (this.campagneCourante().aleatoire) this.combat.appliquerChaos(type, this.dernierEtage());
    else if (difficulte(this.difficulte).chaos) this.combat.appliquerChaos(type, this.dernierEtage(), difficulte(this.difficulte).chaos);
    else if (this.defi && this.defi.modif === 'boss') this.combat.appliquerChaos(type, this.dernierEtage(), { chance: 0, pouvoirs: true, pouvoirsMax: 1 });
    else if (type === 'elite') this.combat.appliquerChaos(type, this.dernierEtage(), ELITE_MUTEE);
    if (type === 'boss' && this.dernierEtage()) {
      this.combat.bossFinal = true;
      const R = this.rencontres();
      this.combat.renfortsPhase = [...new Set([...(R.facile || []), ...(R.moyen || [])].flatMap(r => [...r.avant, ...r.arriere]))];
    }
    this.combat.surMaj = () => Ui.majCombat();
    this.combat.surFin = r => this.finCombat(r);
    this.combat.vitesse = Reglages.vitesse;
    this.ecran = 'combat';
    Ui.selection = null;
    Ui.rendu();
    if (intro) this.combat.log(intro, 'titre mauvais');
    this.combat.demarrer();
  },

  finCombat(resultat) {
    const type = this.combat.type;
    if (resultat === 'defaite') {
      this.finale = 'defaite';
      this.noterDefi(false);
      this.ecran = 'fin';
      this.effacerSauvegarde();
      return Ui.rendu();
    }
    this.stats.combats++;
    const gain = this.gagnerOr(type);
    if (!(type === 'boss' && this.dernierEtage())) this.gagnerXP(GAINS_XP[type] || GAINS_XP.combat);
    if (type === 'boss' && !this.dernierEtage()) { this.potions++; return this.etageSuivant(gain); }
    if (type === 'boss') {
      const scAvant = this.listeSousClassesDebloquees();
      this.debloquee = this.defi ? null : Progression.noterVictoire(this.campagne, this.difficulte);
      this.noterDefi(true);
      this.scDebloquees = this.listeSousClassesDebloquees().filter(x => !scAvant.includes(x));
      this.finale = 'victoire';
      this.ecran = 'fin';
      this.effacerSauvegarde();
      return Ui.rendu();
    }
    let bonus = `💰 +${gain} or · ⭐ +${GAINS_XP[type] || GAINS_XP.combat} XP. `;
    if (this.equipe.some(p => p.traits.sacSansFond) && alea() < 0.5) {
      const x = Recompenses.offreConsommable();
      this.ajouterStock(x.cle, x.quantite);
      bonus += `👝 Le sac sans fond contient ${x.icone} ${x.titre}. `;
    }
    if (type === 'elite') { this.potions++; bonus += 'Vous trouvez aussi une potion de soins.'; }
    else if (alea() < 0.3) { this.potions++; bonus += 'Vous trouvez une potion de soins sur un cadavre.'; }
    const offres = Recompenses.generer(this.equipe, { elite: type === 'elite' });
    if (type === 'elite') bonus += ' Objets magiques garantis !';
    else if (!offres.some(o => o.categorie === 'objet')) bonus += ' Pas d\'objet magique cette fois.';
    this.proposerRecompenses(offres, type === 'elite' ? 'Butin de l\'élite' : 'Récompense', bonus);
  },

  // --------------------------------------------------- récompenses
  proposerRecompenses(offres, titre, sousTitre = '') {
    this.offres = offres;
    this.titreOffres = titre;
    this.sousTitreOffres = sousTitre;
    this.ecran = 'recompense';
    if (this.niveauxEnAttente && this.niveauxEnAttente.length) { this.suiteNiveau = 'recompense'; this.ecran = 'niveau'; }
    Ui.rendu();
  },

  // oublier : identifiant de l'action à remplacer si le PJ en a déjà MAX_ACTIONS
  choisirRecompense(index, oublier = null) {
    const offre = this.offres[index];
    const pj = this.equipe.find(p => p.id === offre.pj);
    if (offre.categorie === 'action') {
      pj.grimoire = pj.grimoire || [];
      if (pj.actions.length >= maxActions(pj)) {
        if (!oublier) return Ui.choisirActionAOublier(index, pj, offre);
        if (oublier === '__grimoire__') { pj.grimoire.push(offre.cle); return this.allerCarte(); }
        pj.actions.splice(pj.actions.indexOf(oublier), 1);
        pj.grimoire.push(oublier);
      }
      pj.actions.push(offre.cle);
    } else {
      Recompenses.appliquer(offre, pj, this);
    }
    this.allerCarte();
  },

  ouvrirTresor() {
    // Souterrains : certains coffres sont des mimiques (combat d'élite, butin d'élite)
    const mimiques = this.campagneCourante().regles.mimiques || 0;
    if (mimiques && alea() < mimiques) return this.lancerCombat({ avant: ['mimique'], arriere: [] }, 'elite', '📦 Le coffre ouvre une gueule pleine de crocs : c\'est une <b>mimique</b> !');
    this.potions++;
    const gain = this.gagnerOr('tresor');
    const extra = Recompenses.offreConsommable();
    this.ajouterStock(extra.cle, extra.quantite);
    this.proposerRecompenses(Recompenses.generer(this.equipe, { objetsSeulement: true }), 'Trésor', `Le coffre contient 💰 ${gain} pièces d'or, une potion de soins et ${extra.icone} ${extra.titre}. Choisissez un objet magique :`);
  },

  // ------------------------------------------------- consommables
  stock(cle) { return cle === 'potion' ? this.potions : (this.sac[cle] || 0); },
  ajouterStock(cle, n = 1) { if (cle === 'potion') this.potions += n; else this.sac[cle] = (this.sac[cle] || 0) + n; },
  retirerStock(cle) { if (cle === 'potion') this.potions = Math.max(0, this.potions - 1); else this.sac[cle] = Math.max(0, (this.sac[cle] || 0) - 1); },

  // Donner un objet d'un héros à un autre (hors combat)
  donnerObjet(deId, aId, cle) {
    const de = this.equipe.find(p => p.id === deId), a = this.equipe.find(p => p.id === aId), o = OBJETS[cle];
    if (!de || !a || !de.objets.includes(cle) || a.objets.includes(cle)) return;
    if (o.classes && !o.classes.includes(a.classe)) return;
    retirerObjet(de, cle);
    equiperObjet(a, cle);
    this.sauvegarder();
  },

  // ----------------------------------------------------------- or
  gagnerOr(type) {
    const [min, max] = GAINS_OR[type] || [0, 0];
    const mult = (1 + this.equipe.reduce((s, p) => s + (p.traits.orMult || 0), 0)) * difficulte(this.difficulte).or * (this.defi && this.defi.modif === 'pauvres' ? 0.6 : 1);
    const g = Math.round((min + Math.floor(alea() * (max - min + 1))) * mult);
    this.or += g;
    return g;
  },

  // ------------------------------------------------------ marchand
  ouvrirMarchand() {
    this.marchand = { stock: Marchand.generer(this.equipe) };
    this.ecran = 'marchand';
    Ui.rendu();
  },

  // oublier : action à remplacer quand le héros connaît déjà MAX_ACTIONS actions
  acheter(index, oublier = null) {
    const art = this.marchand.stock[index];
    if (!art || art.vendu || this.or < art.prix) return;
    if (art.categorie === 'action') {
      const pj = this.equipe.find(p => p.id === art.pj);
      pj.grimoire = pj.grimoire || [];
      if (pj.actions.length >= maxActions(pj)) {
        if (!oublier) return Ui.choisirActionAOublier(index, pj, art, 'marchand');
        if (oublier === '__grimoire__') art.versGrimoire = true;
        else { pj.actions.splice(pj.actions.indexOf(oublier), 1); pj.grimoire.push(oublier); }
      }
    }
    this.or -= art.prix;
    Marchand.appliquer(art, this);
    if (art.stock && --art.stock > 0) art.vendu = false; else art.vendu = true;
    Son.jouer('piece');
    this.sauvegarder();
    Ui.rendu();
  },

  // ---------------------------------------------------------- repos
  reposCourt() {
    const lignes = [];
    for (const pj of this.equipe) {
      if (pj.pv <= 0) { pj.pv = 1; lignes.push(`${pj.nom} reprend connaissance (1 PV).`); }
      this.peur(pj, -15);
      // Magie de pacte, dés de supériorité, récupération naturelle…
      lignes.push(...reposCourtPJ(pj));
    }
    lignes.push('Toute l\'équipe perd 15 Peur. Dépensez des dés de vie pour récupérer des PV (pas d\'emplacements de sorts au repos court).');
    this.repos = { mode: 'court', lignes };
    Ui.rendu();
  },

  depenserDeVie(pjId) {
    const pj = this.equipe.find(p => p.id === pjId);
    if (pj.desVie.restant <= 0 || pj.pv >= pj.pvMax) return;
    pj.desVie.restant--;
    const con = modCarac(pj.caracs.CON);
    const d = Des.lancer(`1d${pj.desVie.face}${con >= 0 ? '+' : ''}${con}`);
    const avant = pj.pv;
    this.soigner(pj, Math.max(1, d.total));
    this.repos.lignes.push(`🎲 ${pj.nom} : ${d.texte} → +${pj.pv - avant} PV`);
    Ui.rendu();
  },

  reposLong() {
    if (this.reposLongUtilise) return;
    this.reposLongUtilise = true;
    const lignes = ['L\'équipe dort quelques heures, l\'arme à la main.'];
    for (const pj of this.equipe) {
      const avant = Math.max(0, pj.pv);
      pj.pv = Math.min(pj.pvMax, avant + Math.ceil(pj.pvMax / 2));
      this.peur(pj, -40);
      pj.desVie.restant = Math.min(pj.desVie.max, pj.desVie.restant + Math.ceil(pj.desVie.max / 2));
      for (const n in pj.emplacements) pj.emplacements[n].restant = pj.emplacements[n].max;
      this.restaurerRessources(pj);
      lignes.push(`${pj.icone} ${pj.nom} : +${pj.pv - avant} PV`);
    }
    lignes.push('Chacun récupère la moitié de ses PV max, tous ses emplacements de sorts, la moitié de ses dés de vie, ses capacités (rage…) et perd 40 Peur.');
    this.repos = { mode: 'long', lignes };
    Ui.rendu();
  },

  // ------------------------------------------------------ événement
  // Tire un événement pas encore vu pendant l'expédition (et disponible)
  tirerEvenement() {
    // Événements de campagne : seulement dans leur campagne (ou dans le Chaos), et plus souvent
    const permis = e => (!e.disponible || e.disponible(this)) && (!e.campagne || e.campagne === this.campagne || this.campagne === 'chaos');
    let poss = EVENEMENTS.filter(e => !this.evenementsVus.includes(e.id) && permis(e));
    if (!poss.length) { this.evenementsVus = []; poss = EVENEMENTS.filter(permis); }
    const propres = poss.filter(e => e.campagne && e.campagne === this.campagne);
    const e = propres.length && alea() < 0.45 ? Des.hasard(propres) : Des.hasard(poss);
    this.evenementsVus.push(e.id);
    return e;
  },
  choixEvenement() {
    const e = this.evenement;
    return (e.resultat && e.resultat.choix) || (!e.resultat ? e.def.choix : null);
  },
  choisirEvenement(i) {
    const liste = this.choixEvenement();
    const ch = liste && liste[i];
    if (!ch || (ch.condition && !ch.condition(this))) return;
    const r = ch.resoudre(this) || { lignes: [] };
    this.evenement.historique.push(...(r.lignes || []));
    this.evenement.resultat = r;
    Son.jouer(r.son || 'clic');
    Ui.rendu();
  },

  finEvenement() {
    const r = this.evenement.resultat;
    if (this.equipe.every(p => p.pv <= 0)) {
      this.finale = 'defaite'; this.ecran = 'fin'; this.effacerSauvegarde(); return Ui.rendu();
    }
    if (r && r.combat) return this.lancerCombat(r.combat, r.typeCombat || 'elite');
    if (r && r.recompense === 'objets') return this.proposerRecompenses(Recompenses.generer(this.equipe, { objetsSeulement: true }), 'Trouvaille');
    if (r && r.recompense === 'normal') return this.proposerRecompenses(Recompenses.generer(this.equipe), 'Trouvaille');
    this.allerCarte();
  },

  // ----------------------------------------- utilitaires d'événements
  etat() { return this.evenement.donnees; },
  heros(filtre = p => p.pv > 0) { return Des.hasard(this.equipe.filter(filtre)) || this.equipe[0]; },
  nomObjet(cle) { const o = OBJETS[cle]; return `${o.icone} <b style="color:${RARETES[o.rarete].couleur}">${o.nom}</b>`; },
  rencontreElite() { return Des.hasard(this.rencontres().elite); },
  rencontreFacile() { return Des.hasard(this.rencontres().facile); },
  gagnerOrFixe(n) { this.or = Math.max(0, this.or + n); return n >= 0 ? `💰 +${n} or.` : `💰 ${n} or.`; },
  pvMax(pj, n) { pj.pvMax = Math.max(1, pj.pvMax + n); pj.pv = Math.min(pj.pvMax, pj.pv + Math.max(0, n)); },
  blesserPct(pct) { this.equipe.forEach(p => { if (p.pv > 0) this.blesser(p, Math.max(1, Math.round(p.pvMax * pct))); }); },
  objetsPortes(filtre = () => true) {
    const l = [];
    for (const p of this.equipe) for (const cle of p.objets) if (filtre(OBJETS[cle], cle)) l.push({ pj: p, cle });
    return l;
  },

  // Donne un objet aléatoire de la (des) rareté(s) voulue(s) ; renvoie une ligne de texte
  donnerObjet(rarete, pj = null) {
    const rar = Array.isArray(rarete) ? rarete : [rarete];
    const heros = pj ? [pj] : this.equipe;
    const poss = [];
    for (const [cle, o] of Object.entries(OBJETS)) {
      if (!rar.includes(o.rarete) || !Recompenses.objetPermis(o)) continue;
      for (const h of heros) if ((!o.classes || o.classes.includes(h.classe)) && !h.objets.includes(cle)) poss.push([cle, h]);
    }
    if (!poss.length) return pj ? this.donnerObjet(rarete) : this.gagnerOrFixe(50) + ' (aucun objet disponible, compensation en or)';
    const [cle, h] = Des.hasard(poss);
    equiperObjet(h, cle);
    Son.jouer('objet');
    return `${h.icone} <b>${h.nom}</b> reçoit ${this.nomObjet(cle)} — ${OBJETS[cle].desc}`;
  },
  // Retire un objet porté ; renvoie { pj, cle } ou null
  retirerObjetAleatoire(filtre = () => true) {
    const l = this.objetsPortes(filtre);
    if (!l.length) return null;
    const x = Des.hasard(l);
    retirerObjet(x.pj, x.cle);
    return x;
  },
  // Remplace un objet par un objet de rareté supérieure (maudit → rare)
  ameliorerObjet() {
    const suivante = { commun: 'rare', rare: 'legendaire', maudit: 'rare' };
    const x = this.retirerObjetAleatoire(o => suivante[o.rarete]);
    if (!x) return null;
    return [`${x.pj.icone} ${x.pj.nom} perd ${this.nomObjet(x.cle)}…`, this.donnerObjet(suivante[OBJETS[x.cle].rarete], x.pj)];
  },
  // Remplace un objet par un autre de même rareté
  transformerObjet(pj = null) {
    const x = this.retirerObjetAleatoire((o, cle) => !pj || pj.objets.includes(cle));
    if (!x) return null;
    return [`${x.pj.icone} ${x.pj.nom} perd ${this.nomObjet(x.cle)}…`, this.donnerObjet(OBJETS[x.cle].rarete, x.pj)];
  }
};
