// =====================================================================
// État de la partie et enchaînement des écrans.
// =====================================================================

const CLE_SAUVEGARDE = 'donjon-roguelike-v1';

const Jeu = {
  ecran: 'titre',
  equipe: [],
  carte: null,
  potions: 2,
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
  nouvellePartie() {
    this.equipe = ORDRE_CLASSES.map(creerPJ);
    this.carte = Carte.generer();
    this.potions = 2;
    this.reposLongUtilise = false;
    this.stats = { combats: 0, ennemis: 0, salles: 0 };
    this.allerCarte();
  },

  allerCarte() {
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
        equipe: this.equipe, carte: this.carte, potions: this.potions,
        reposLongUtilise: this.reposLongUtilise, stats: this.stats
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
      this.allerCarte();
      return true;
    } catch (e) { return false; }
  },

  effacerSauvegarde() {
    try { localStorage.removeItem(CLE_SAUVEGARDE); } catch (e) { /* rien */ }
  },

  // ------------------------------------------------ utilitaires PJ
  pj(classe) { return this.equipe.find(p => p.classe === classe); },
  debout() { return this.equipe.filter(p => p.pv > 0); },

  soigner(pj, n) { pj.pv = Math.min(pj.pvMax, Math.max(0, pj.pv) + n); },
  blesser(pj, n) { pj.pv = Math.max(0, pj.pv - n); },
  peur(pj, n) {
    if (n > 0 && pj.traits.peurReduite) n = Math.ceil(n / 2);
    pj.peur = Math.max(0, Math.min(100, pj.peur + n));
  },

  // Test de caractéristique hors combat
  test(pj, carac, dd, maitrise) {
    const mode = pj.peur >= 100 ? -1 : 0;
    const r = Des.d20(mode);
    const bonus = modCarac(pj.caracs[carac]) + (maitrise ? pj.maitrise : 0) + (pj.traits.bonusTest || 0);
    const total = r.nat + bonus;
    const reussite = total >= dd;
    return { reussite, texte: `🎲 ${pj.nom}, test de ${carac} : ${r.texte} ${signe(bonus)} = <b>${total}</b> contre DD ${dd} → ${reussite ? '<b>réussite</b>' : '<b>échec</b>'}` };
  },

  deplacerPJ(index, sens) {
    const j = index + sens;
    if (j < 0 || j >= this.equipe.length) return;
    [this.equipe[index], this.equipe[j]] = [this.equipe[j], this.equipe[index]];
    this.sauvegarder();
  },

  // -------------------------------------------------------- carte
  choisirNoeud(id) {
    if (!Carte.accessibles(this.carte).includes(id)) return;
    const n = Carte.noeud(this.carte, id);
    this.carte.position = id;
    n.visite = true;
    this.noeudActuel = n;
    this.stats.salles++;
    switch (n.type) {
      case 'combat': return this.lancerCombat(Des.hasard(RENCONTRES[Carte.niveau(n)]), 'combat');
      case 'elite': return this.lancerCombat(Des.hasard(RENCONTRES.elite), 'elite');
      case 'boss': return this.lancerCombat(Des.hasard(RENCONTRES.boss), 'boss');
      case 'repos': this.repos = { mode: null }; this.ecran = 'repos'; return Ui.rendu();
      case 'tresor': return this.ouvrirTresor();
      case 'evenement':
        this.evenement = { def: Des.hasard(EVENEMENTS), resultat: null };
        this.ecran = 'evenement';
        return Ui.rendu();
    }
  },

  // ------------------------------------------------------- combat
  lancerCombat(ids, type) {
    this.combat = new Combat(this.equipe, ids, this);
    this.combat.type = type;
    this.combat.surMaj = () => Ui.majCombat();
    this.combat.surFin = r => this.finCombat(r);
    this.ecran = 'combat';
    Ui.selection = null;
    Ui.rendu();
    this.combat.demarrer();
  },

  finCombat(resultat) {
    const type = this.combat.type;
    if (resultat === 'defaite') {
      this.finale = 'defaite';
      this.ecran = 'fin';
      this.effacerSauvegarde();
      return Ui.rendu();
    }
    this.stats.combats++;
    if (type === 'boss') {
      this.finale = 'victoire';
      this.ecran = 'fin';
      this.effacerSauvegarde();
      return Ui.rendu();
    }
    let bonus = '';
    if (type === 'elite') { this.potions++; bonus = 'Vous trouvez aussi une potion de soins.'; }
    else if (Math.random() < 0.3) { this.potions++; bonus = 'Vous trouvez une potion de soins sur un cadavre.'; }
    this.proposerRecompenses(Recompenses.generer(this.equipe, { elite: type === 'elite' }),
      type === 'elite' ? 'Butin de l\'élite' : 'Récompense', bonus);
  },

  // --------------------------------------------------- récompenses
  proposerRecompenses(offres, titre, sousTitre = '') {
    this.offres = offres;
    this.titreOffres = titre;
    this.sousTitreOffres = sousTitre;
    this.ecran = 'recompense';
    Ui.rendu();
  },

  // oublier : identifiant de l'action à remplacer si le PJ en a déjà MAX_ACTIONS
  choisirRecompense(index, oublier = null) {
    const offre = this.offres[index];
    const pj = this.equipe.find(p => p.id === offre.pj);
    if (offre.categorie === 'action') {
      if (pj.actions.length >= MAX_ACTIONS) {
        if (!oublier) return Ui.choisirActionAOublier(index, pj, offre);
        pj.actions.splice(pj.actions.indexOf(oublier), 1);
      }
      pj.actions.push(offre.cle);
    } else {
      Recompenses.appliquer(offre, pj);
    }
    this.allerCarte();
  },

  ouvrirTresor() {
    this.potions++;
    this.proposerRecompenses(Recompenses.generer(this.equipe, { objetsSeulement: true }), 'Trésor', 'Le coffre contient aussi une potion de soins. Choisissez un objet magique :');
  },

  // ---------------------------------------------------------- repos
  reposCourt() {
    const lignes = [];
    for (const pj of this.equipe) {
      if (pj.pv <= 0) { pj.pv = 1; lignes.push(`${pj.nom} reprend connaissance (1 PV).`); }
      this.peur(pj, -10);
    }
    lignes.push('Toute l\'équipe perd 10 Peur. Dépensez des dés de vie pour récupérer des PV.');
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
    for (const pj of this.equipe) {
      pj.pv = pj.pvMax;
      pj.peur = 0;
      pj.desVie.restant = pj.desVie.max;
      for (const n in pj.emplacements) pj.emplacements[n].restant = pj.emplacements[n].max;
    }
    this.repos = { mode: 'long', lignes: ['L\'équipe dort d\'un sommeil profond. PV, emplacements de sorts et dés de vie restaurés, Peur à 0.'] };
    Ui.rendu();
  },

  // ------------------------------------------------------ événement
  choisirEvenement(i) {
    const ch = this.evenement.def.choix[i];
    if (ch.condition && !ch.condition(this)) return;
    this.evenement.resultat = ch.resoudre(this);
    Ui.rendu();
  },

  finEvenement() {
    const r = this.evenement.resultat;
    if (this.equipe.every(p => p.pv <= 0)) {
      this.finale = 'defaite'; this.ecran = 'fin'; this.effacerSauvegarde(); return Ui.rendu();
    }
    if (r && r.recompense === 'objets') return this.proposerRecompenses(Recompenses.generer(this.equipe, { objetsSeulement: true }), 'Trouvaille');
    if (r && r.recompense === 'normal') return this.proposerRecompenses(Recompenses.generer(this.equipe), 'Trouvaille');
    this.allerCarte();
  }
};
