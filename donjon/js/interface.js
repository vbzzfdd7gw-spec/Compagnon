// =====================================================================
// Interface : rendu des écrans et gestion des clics.
// =====================================================================

const $ = sel => document.querySelector(sel);
const echapper = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const Ui = {
  selection: null,   // identifiant de l'action choisie pendant le combat

  rendu() {
    const app = $('#app');
    const ecrans = {
      titre: () => this.ecranTitre(),
      carte: () => this.ecranCarte(),
      combat: () => this.ecranCombat(),
      recompense: () => this.ecranRecompense(),
      repos: () => this.ecranRepos(),
      evenement: () => this.ecranEvenement(),
      fin: () => this.ecranFin()
    };
    app.innerHTML = ecrans[Jeu.ecran]();
    app.dataset.ecran = Jeu.ecran;
    if (Jeu.ecran === 'carte') this.defilerCarte();
    if (Jeu.ecran === 'combat') this.apresRenduCombat();
  },

  // ----------------------------------------------------------- titre
  ecranTitre() {
    return `<div class="titre-ecran">
      <div class="logo">🕯️</div>
      <h1>Cryptes &amp; Dés</h1>
      <p class="sous-titre">Un roguelike au tour par tour, règles D&amp;D 5e</p>
      <div class="pile-boutons">
        ${Jeu.sauvegardeExiste() ? '<button class="btn principal" data-clic="continuer">Continuer l\'expédition</button>' : ''}
        <button class="btn ${Jeu.sauvegardeExiste() ? '' : 'principal'}" data-clic="nouvelle">Nouvelle expédition</button>
        <button class="btn" data-clic="regles">Règles</button>
      </div>
      <div class="equipe-titre">${ORDRE_CLASSES.map(c => `<span title="${CLASSES[c].nom}">${CLASSES[c].icone}</span>`).join('')}</div>
    </div>`;
  },

  regles() {
    this.modal(`<h2>Règles</h2>
      <h3>Rangs</h3>
      <p>Votre équipe est alignée en 4 rangs (1 = devant). Chaque action indique depuis quels rangs elle s'utilise et quels rangs elle vise :
      <span class="pips-demo">${this.pips([1, 2], 'lanceur')} ▸ ${this.pips([1, 2], 'cible')}</span> = utilisable depuis les rangs 1-2, vise les rangs ennemis 1-2.
      Quand un ennemi meurt, ceux de derrière avancent.</p>
      <h3>Combat</h3>
      <p>Initiative : d20 + DEX. Attaque : d20 + bonus contre la CA. 20 naturel = critique (dés de dégâts doublés), 1 naturel = échec.
      Sorts à sauvegarde : la cible lance d20 + bonus contre le DD du lanceur. Le Clerc et le Magicien ont des emplacements de sorts limités (récupérés au repos long).</p>
      <h3>Peur</h3>
      <p>Chaque personnage a une jauge de Peur (0 à 100). Elle monte quand un ennemi réussit un critique (+20 pour la cible, +5 pour les autres) et quand un allié tombe à terre (+15).
      Elle baisse avec les victoires, les critiques et les ennemis tués. À 100, le personnage est <b>paniqué</b> : désavantage aux attaques et aux sauvegardes.</p>
      <h3>À terre</h3>
      <p>À 0 PV, un personnage est à terre. Il le reste au combat suivant tant qu'il n'est pas soigné (sort, potion, repos). Si toute l'équipe est à terre, l'expédition échoue.</p>
      <h3>Carte</h3>
      <p>⚔️ Combat · 💀 Élite · 🔥 Repos (court : dés de vie ; long : tout restaurer, une seule fois) · 💰 Trésor · ❓ Événement · 👑 Boss.
      Après chaque combat, choisissez 1 récompense parmi 3.</p>
      <p class="petit">Astuce : touchez un personnage ou un monstre pour voir sa fiche.</p>`);
  },

  // ----------------------------------------------------------- carte
  ecranCarte() {
    return `<div class="ecran-carte">
      <header class="barre">
        <div><b>Étage 1</b> · Les Cryptes</div>
        <div class="boutons-barre">
          <button class="btn petit" data-clic="equipe">Équipe</button>
          <button class="btn petit" data-clic="regles">?</button>
          <button class="btn petit discret" data-clic="abandonner">Abandonner</button>
        </div>
      </header>
      <p class="consigne">Choisissez votre prochaine salle (cercles lumineux).</p>
      <div class="carte-conteneur">${Carte.svg(Jeu.carte)}</div>
      <div class="legende">${Object.values(TYPES_NOEUDS).map(t => `<span>${t.icone} ${t.nom}</span>`).join('')}</div>
      ${this.resumeEquipe()}
    </div>`;
  },

  defilerCarte() {
    const cible = $('.noeud.accessible');
    if (cible) cible.scrollIntoView({ block: 'center' });
  },

  resumeEquipe() {
    return `<div class="resume-equipe">
      ${Jeu.equipe.map((p, i) => `<div class="mini-pj ${p.pv <= 0 ? 'a-terre' : ''}" data-info="${p.id}">
        <div class="mini-tete"><span class="rang-badge">R${i + 1}</span> ${p.icone} ${p.nom}</div>
        ${this.barre(p.pv, p.pvMax, 'pv', `${p.pv}/${p.pvMax}`)}
        ${this.barre(p.peur, 100, 'peur', `Peur ${p.peur}`)}
        ${this.emplacementsHtml(p)}
      </div>`).join('')}
      <div class="potions">🧴 ${Jeu.potions} potion${Jeu.potions > 1 ? 's' : ''} · Repos long : ${Jeu.reposLongUtilise ? 'utilisé' : 'disponible'}</div>
    </div>`;
  },

  barre(val, max, classe, texte) {
    const pct = Math.max(0, Math.min(100, (val / max) * 100));
    return `<div class="barre-jauge ${classe}${classe === 'peur' && val >= 100 ? ' max' : ''}"><span style="width:${pct}%"></span><em>${texte}</em></div>`;
  },

  emplacementsHtml(p) {
    const niv = Object.keys(p.emplacements);
    if (!niv.length) return '';
    return `<div class="emplacements">${niv.map(n => `<span>niv.${n} ${'●'.repeat(p.emplacements[n].restant)}${'○'.repeat(p.emplacements[n].max - p.emplacements[n].restant)}</span>`).join(' ')}</div>`;
  },

  // ---------------------------------------------------- fiche équipe
  fenetreEquipe() {
    this.modal(`<h2>Équipe</h2>
      <p class="petit">Utilisez ▲▼ pour réorganiser les rangs avant le prochain combat.</p>
      ${Jeu.equipe.map((p, i) => `<div class="fiche">
        <div class="fiche-tete">
          <span class="rang-badge">R${i + 1}</span> <b>${p.icone} ${p.nom}</b>
          <span class="fleches">
            <button class="btn mini" data-clic="monter" data-index="${i}" ${i === 0 ? 'disabled' : ''}>▲</button>
            <button class="btn mini" data-clic="descendre" data-index="${i}" ${i === 3 ? 'disabled' : ''}>▼</button>
          </span>
        </div>
        ${this.ficheDetails(p)}
      </div>`).join('')}`);
  },

  ficheDetails(p) {
    const car = Object.entries(p.caracs).map(([k, v]) => `${k} ${v} (${signe(modCarac(v))})`).join(' · ');
    const sauv = Object.keys(p.caracs).map(k => `${k} ${signe(modCarac(p.caracs[k]) + (p.sauvegardes.includes(k) ? p.maitrise : 0) + p.bonusSauv)}`).join(' · ');
    return `<div class="fiche-stats">
        <span>❤️ ${p.pv}/${p.pvMax} PV</span><span>🛡 CA ${p.ca}</span><span>⚔️ Att ${signe(p.bonusArme)}${p.bonusDegats ? ` (dég. +${p.bonusDegats})` : ''}</span>
        ${p.ddSort ? `<span>✨ Sort ${signe(p.bonusSort)} · DD ${p.ddSort}</span>` : ''}
        <span>🎲 Dés de vie ${p.desVie.restant}/${p.desVie.max} (d${p.desVie.face})</span><span>😨 Peur ${p.peur}/100</span>
      </div>
      ${this.emplacementsHtml(p)}
      <div class="petit">${car}</div>
      <div class="petit">Sauvegardes : ${sauv}</div>
      ${CLASSES[p.classe].sournoise ? `<div class="petit">${CLASSES[p.classe].desc}</div>` : ''}
      <div class="fiche-actions">${p.actions.map(id => this.ligneAction(ACTIONS[id])).join('')}</div>
      ${p.objets.length ? `<div class="fiche-objets">${p.objets.map(o => `<div>${OBJETS[o].icone} <b>${OBJETS[o].nom}</b> — ${OBJETS[o].desc}</div>`).join('')}</div>` : ''}`;
  },

  ligneAction(a) {
    return `<div class="ligne-action"><b>${a.icone} ${a.nom}</b> <span class="pips-demo">${this.pipsAction(a)}</span><div class="petit">${a.desc}</div></div>`;
  },

  // Points de rang façon « ○○●● ▸ ●●○○ »
  pips(rangs, sens) {
    const ordre = sens === 'lanceur' ? [4, 3, 2, 1] : [1, 2, 3, 4];
    return `<span class="pips ${sens}">${ordre.map(r => `<i class="${rangs.includes(r) ? 'on' : ''}" title="Rang ${r}"></i>`).join('')}</span>`;
  },

  pipsAction(a) {
    let cible = '';
    if (a.cible === 'soi') cible = '<span class="tag-cible">soi</span>';
    else if (a.cible === 'allie') cible = `<span class="tag-cible allie">${a.adjacent ? 'adjacent' : 'allié' + (a.zone ? 's' : '')}</span>`;
    else cible = this.pips(a.rangsCibles, 'cible') + (a.zone ? '<span class="tag-cible">zone</span>' : '');
    return `${this.pips(a.rangsLanceur, 'lanceur')} ▸ ${cible}`;
  },

  infoCombattant(id) {
    const tous = [...Jeu.equipe, ...(Jeu.combat ? Jeu.combat.ennemis : [])];
    const c = tous.find(x => x.id === id);
    if (!c) return;
    if (c.camp === 'pj') return this.modal(`<h2>${c.icone} ${c.nom}</h2>${this.etatsDetail(c)}${this.ficheDetails(c)}`);
    const m = MONSTRES[c.modele];
    const extras = [];
    if (m.vuln) extras.push('Vulnérable : ' + m.vuln.join(', '));
    if (m.resist) extras.push('Résistant : ' + m.resist.join(', '));
    if (m.immun) extras.push('Immunisé : ' + m.immun.join(', '));
    if (m.mortVivant) extras.push('Mort-vivant');
    if (m.robustesse) extras.push('Robustesse des morts-vivants : à 0 PV, sauvegarde de CON (DD 5 + dégâts) pour rester à 1 PV, sauf dégâts radiants ou critique');
    if (m.actionsParTour) extras.push(`Agit ${m.actionsParTour} fois par tour`);
    this.modal(`<h2>${c.icone} ${c.nom}</h2>
      <div class="fiche-stats"><span>❤️ ${c.pv}/${c.pvMax} PV</span><span>🛡 CA ${c.ca}</span></div>
      <div class="petit">${Object.entries(c.caracs).map(([k, v]) => `${k} ${v} (${signe(modCarac(v))})`).join(' · ')}</div>
      ${extras.map(e => `<div class="petit">• ${e}</div>`).join('')}
      ${this.etatsDetail(c)}
      <div class="fiche-actions">${m.actions.map(a => `<div class="ligne-action"><b>${a.nom}</b> <span class="pips-demo">${this.pipsAction(a)}</span>
        <div class="petit">${a.type === 'attaque' ? `+${a.jet} au toucher, ${a.degats} ${a.typeDeg}` : a.type === 'sauvegarde' ? `Sauvegarde de ${a.carac} DD ${a.dd}, ${a.degats} ${a.typeDeg}${a.effetSiEchec && a.effetSiEchec.peur ? `, +${a.effetSiEchec.peur} Peur si échec` : ''}` : 'Spécial'}</div></div>`).join('')}</div>`);
  },

  etatsDetail(c) {
    const e = Object.keys(c.etats || {});
    if (!e.length) return '';
    return `<div class="etats-detail">${e.map(k => `<div>${ETATS[k].icone} <b>${ETATS[k].nom}</b> — ${ETATS[k].desc}</div>`).join('')}</div>`;
  },

  // ---------------------------------------------------------- combat
  ecranCombat() {
    return `<div class="ecran-combat">
      <div class="ordre" id="ordre"></div>
      <div class="champ" id="champ"></div>
      <div class="panneau" id="panneau"></div>
      <div class="journal" id="journal"></div>
    </div>`;
  },

  apresRenduCombat() { this.majCombat(); },

  majCombat() {
    const cb = Jeu.combat;
    if (!cb || Jeu.ecran !== 'combat') return;
    // Si l'action sélectionnée n'est plus valable, on l'annule
    if (this.selection && (!cb.attenteJoueur || !cb.disponibilite(cb.actif, ACTIONS[this.selection]).ok)) this.selection = null;

    $('#ordre').innerHTML = this.ordreHtml(cb);
    $('#champ').innerHTML = `
      <div class="camp camp-pj">${cb.pjs.map((p, i) => this.carteCombattant(p, i + 1, cb)).join('')}</div>
      <div class="vs">⚔</div>
      <div class="camp camp-en">${cb.ennemis.map((e, i) => this.carteCombattant(e, i + 1, cb)).join('')}</div>`;
    $('#panneau').innerHTML = this.panneauHtml(cb);
    const j = $('#journal');
    j.innerHTML = cb.journal.slice(-120).map(l => `<div class="l ${l.classe}">${l.html}</div>`).join('');
    j.scrollTop = j.scrollHeight;

    // Nombres flottants
    for (const f of cb.flottants) {
      const el = document.querySelector(`.combattant[data-id="${f.id}"]`);
      if (!el) continue;
      const s = document.createElement('span');
      s.className = 'flottant ' + f.type;
      s.textContent = f.texte;
      el.appendChild(s);
      if (f.type === 'degats' || f.type === 'crit') el.classList.add('touche');
    }
    cb.flottants = [];
  },

  ordreHtml(cb) {
    const restants = cb.ordre.slice(cb.indexTour).filter(c => c.pv > 0 && (c.camp === 'pj' || cb.ennemis.includes(c)));
    return `<span class="round">Round ${cb.round}</span>` + restants.map((c, i) =>
      `<span class="puce ${c.camp} ${i === 0 && cb.actif === c ? 'actif' : ''}">${c.icone} ${echapper(c.nom)}</span>`).join('');
  },

  carteCombattant(c, rang, cb) {
    const act = this.selection ? ACTIONS[this.selection] : null;
    const ciblable = act && act.cible !== 'soi' && !act.zone && cb.ciblesValides(cb.actif, act).includes(c);
    const enZone = act && act.zone && cb.ciblesValides(cb.actif, act).includes(c);
    const classes = ['combattant', c.camp];
    if (cb.actif === c) classes.push('actif');
    if (ciblable) classes.push('ciblable');
    if (enZone || (act && act.cible === 'soi' && c === cb.actif)) classes.push('en-zone');
    if (c.pv <= 0) classes.push('a-terre');
    if (c.boss) classes.push('boss');
    if (c.camp === 'pj' && c.peur >= 100) classes.push('panique');
    const etats = Object.keys(c.etats).map(e => `<span title="${ETATS[e].nom}">${ETATS[e].icone}</span>`).join('');
    return `<div class="${classes.join(' ')}" data-id="${c.id}">
      <div class="rang-badge">R${rang}</div>
      <div class="portrait">${c.pv <= 0 ? '🪦' : c.icone}</div>
      <div class="nom">${echapper(c.nom)}</div>
      ${this.barre(Math.max(0, c.pv), c.pvMax, 'pv', `${Math.max(0, c.pv)}/${c.pvMax}`)}
      ${c.camp === 'pj' ? this.barre(c.peur, 100, 'peur', `Peur ${c.peur}`) : ''}
      <div class="ca">CA ${c.ca}${c.etats.defi ? '+2' : ''}${c.etats.bouclier ? '+5' : ''}</div>
      <div class="etats">${etats}</div>
    </div>`;
  },

  panneauHtml(cb) {
    if (cb.fini) return `<div class="attente">${cb.resultat === 'victoire' ? '🏆 Victoire !' : '💀 Défaite…'}</div>`;
    const a = cb.actif;
    if (!a || !cb.attenteJoueur) return `<div class="attente">${a ? `Tour de <b>${echapper(a.nom)}</b>…` : '…'}</div>`;

    const ids = [...a.actions, ...ACTIONS_COMMUNES];
    const boutons = ids.map(id => {
      const act = ACTIONS[id];
      const d = cb.disponibilite(a, act);
      const cout = act.niveau ? `<span class="cout">niv.${act.niveau}</span>` : act.parCombat ? `<span class="cout">1/combat</span>` : act.special === 'potion' ? `<span class="cout">×${Jeu.potions}</span>` : '';
      return `<button class="btn-action ${act.commune ? 'commune' : ''} ${this.selection === id ? 'sel' : ''}" data-action="${id}" ${d.ok ? '' : 'disabled'}>
        <span class="ic">${act.icone}</span>
        <span class="nm">${act.nom}${cout}</span>
        <span class="pips-ligne">${this.pipsAction(act)}</span>
        ${d.ok ? '' : `<span class="raison">${d.raison}</span>`}
      </button>`;
    }).join('');

    let aide = `<b>${a.icone} ${a.nom}</b> (rang ${cb.rang(a)}) — choisissez une action.`;
    if (a.peur >= 100) aide += ' <span class="mauvais">😱 Paniqué : désavantage.</span>';
    if (this.selection) {
      const act = ACTIONS[this.selection];
      aide = `<b>${act.icone} ${act.nom}</b> : ${act.desc}<br>`;
      if (act.cible === 'soi' || act.zone) aide += `<button class="btn principal petit" data-clic="confirmer">Lancer</button> <button class="btn petit" data-clic="annuler">Annuler</button>`;
      else aide += `<span class="indice">👆 Touchez une cible en surbrillance.</span> <button class="btn petit" data-clic="annuler">Annuler</button>`;
    }
    return `<div class="aide">${aide}</div>${this.emplacementsHtml(a)}<div class="actions">${boutons}</div>`;
  },

  choisirAction(id) {
    const cb = Jeu.combat;
    if (!cb.attenteJoueur) return;
    if (!cb.disponibilite(cb.actif, ACTIONS[id]).ok) return;
    this.selection = this.selection === id ? null : id;
    this.majCombat();
  },

  cliquerCombattant(id) {
    const cb = Jeu.combat;
    if (this.selection && cb.attenteJoueur) {
      const act = ACTIONS[this.selection];
      const cibles = cb.ciblesValides(cb.actif, act);
      const c = cibles.find(x => x.id === id);
      if (c && act.cible !== 'soi' && !act.zone) {
        this.selection = null;
        return cb.jouer(cb.actif, act, c);
      }
      if ((act.zone || act.cible === 'soi') && cibles.some(x => x.id === id)) return this.confirmer();
    }
    this.infoCombattant(id);
  },

  confirmer() {
    const cb = Jeu.combat;
    if (!this.selection) return;
    const act = ACTIONS[this.selection];
    this.selection = null;
    cb.jouer(cb.actif, act, null);
  },

  // ------------------------------------------------------ récompense
  ecranRecompense() {
    const libelles = { objet: 'Objet magique', action: 'Nouvelle action', amelioration: 'Amélioration' };
    return `<div class="ecran-centre">
      <h2>${Jeu.titreOffres}</h2>
      ${Jeu.sousTitreOffres ? `<p>${Jeu.sousTitreOffres}</p>` : '<p>Choisissez une récompense.</p>'}
      <div class="offres">${Jeu.offres.map((o, i) => {
        const pj = Jeu.equipe.find(p => p.id === o.pj);
        return `<button class="offre ${o.categorie}" data-offre="${i}">
          <span class="cat">${libelles[o.categorie]}</span>
          <span class="gros">${o.icone}</span>
          <b>${o.titre}</b>
          <span class="pour">pour ${pj.icone} ${pj.nom}</span>
          <span class="desc">${o.desc}</span>
          ${o.categorie === 'action' ? `<span class="pips-demo">${this.pipsAction(ACTIONS[o.cle])}</span>` : ''}
        </button>`;
      }).join('')}</div>
      <button class="btn discret" data-clic="passer">Ne rien prendre</button>
      ${this.resumeEquipe()}
    </div>`;
  },

  choisirActionAOublier(index, pj, offre) {
    this.modal(`<h2>${pj.icone} ${pj.nom} connaît déjà ${MAX_ACTIONS} actions</h2>
      <p>Pour apprendre <b>${offre.titre}</b>, choisissez l'action à oublier :</p>
      <div class="liste-oubli">${pj.actions.map(id => `<button class="btn bloc" data-oublier="${id}" data-offre-index="${index}">${this.ligneAction(ACTIONS[id])}</button>`).join('')}</div>
      <button class="btn" data-clic="fermer">Annuler</button>`);
  },

  // ----------------------------------------------------------- repos
  ecranRepos() {
    const r = Jeu.repos;
    let contenu;
    if (!r.mode) {
      contenu = `<p>Un feu de camp crépite dans une alcôve sûre.</p>
        <div class="pile-boutons">
          <button class="btn principal" data-clic="repos-court">Repos court<br><span class="petit">Les PJ à terre se relèvent (1 PV), −10 Peur, puis dépensez des dés de vie</span></button>
          <button class="btn" data-clic="repos-long" ${Jeu.reposLongUtilise ? 'disabled' : ''}>Repos long${Jeu.reposLongUtilise ? ' (déjà utilisé)' : ''}<br><span class="petit">Tout restaurer : PV, sorts, dés de vie, Peur à 0. Une seule fois par expédition.</span></button>
        </div>`;
    } else {
      contenu = `<div class="lignes">${r.lignes.map(l => `<div>${l}</div>`).join('')}</div>
        ${r.mode === 'court' ? `<div class="des-vie">${Jeu.equipe.map(p => `<button class="btn" data-de-vie="${p.id}" ${p.desVie.restant <= 0 || p.pv >= p.pvMax ? 'disabled' : ''}>
          ${p.icone} ${p.nom} ${p.pv}/${p.pvMax}<br><span class="petit">Dé de vie d${p.desVie.face}${signe(modCarac(p.caracs.CON))} (${p.desVie.restant} restant${p.desVie.restant > 1 ? 's' : ''})</span></button>`).join('')}</div>` : ''}
        <button class="btn principal" data-clic="carte">Reprendre la route</button>`;
    }
    return `<div class="ecran-centre"><h2>🔥 Repos</h2>${contenu}${this.resumeEquipe()}</div>`;
  },

  // ------------------------------------------------------ événement
  ecranEvenement() {
    const e = Jeu.evenement;
    const d = e.def;
    let bas;
    if (!e.resultat) {
      bas = `<div class="pile-boutons">${d.choix.map((c, i) => {
        const ok = !c.condition || c.condition(Jeu);
        return `<button class="btn" data-choix="${i}" ${ok ? '' : 'disabled'}>${c.texte}</button>`;
      }).join('')}</div>`;
    } else {
      bas = `<div class="lignes">${e.resultat.lignes.map(l => `<div>${l}</div>`).join('')}</div>
        <button class="btn principal" data-clic="fin-evenement">Continuer</button>`;
    }
    return `<div class="ecran-centre"><h2>❓ ${d.titre}</h2><p class="recit">${d.texte}</p>${bas}${this.resumeEquipe()}</div>`;
  },

  // ------------------------------------------------------------- fin
  ecranFin() {
    const v = Jeu.finale === 'victoire';
    return `<div class="ecran-centre fin ${v ? 'victoire' : 'defaite'}">
      <div class="logo">${v ? '👑' : '🪦'}</div>
      <h1>${v ? 'Victoire !' : 'L\'expédition a échoué'}</h1>
      <p>${v ? 'Morvagne la Nécromancienne n\'est plus. Les cryptes retrouvent le silence.' : 'Les ténèbres des cryptes ont englouti votre équipe.'}</p>
      <p>Salles explorées : ${Jeu.stats.salles} · Combats gagnés : ${Jeu.stats.combats}</p>
      <button class="btn principal" data-clic="nouvelle">Nouvelle expédition</button>
      <button class="btn" data-clic="titre">Écran titre</button>
    </div>`;
  },

  // ----------------------------------------------------------- modal
  modal(html) {
    const m = $('#modal');
    m.innerHTML = `<div class="modal-fond" data-clic="fermer"></div><div class="modal-boite"><button class="fermer" data-clic="fermer">✕</button>${html}</div>`;
    m.classList.add('ouvert');
  },
  fermerModal() {
    const m = $('#modal');
    m.classList.remove('ouvert');
    m.innerHTML = '';
  },

  // -------------------------------------------------------- clics
  initialiser() {
    document.addEventListener('click', e => {
      const t = e.target.closest('[data-clic],[data-action],[data-id],[data-noeud],[data-offre],[data-oublier],[data-de-vie],[data-choix],[data-info]');
      if (!t || t.disabled) return;
      const d = t.dataset;
      if (d.clic) return this.clic(d.clic, t);
      if (d.action) return this.choisirAction(d.action);
      if (d.id && Jeu.ecran === 'combat') return this.cliquerCombattant(d.id);
      if (d.noeud !== undefined) return Jeu.choisirNoeud(parseInt(d.noeud, 10));
      if (d.offre !== undefined) return Jeu.choisirRecompense(parseInt(d.offre, 10));
      if (d.oublier) { this.fermerModal(); return Jeu.choisirRecompense(parseInt(d.offreIndex, 10), d.oublier); }
      if (d.deVie) return Jeu.depenserDeVie(d.deVie);
      if (d.choix !== undefined) return Jeu.choisirEvenement(parseInt(d.choix, 10));
      if (d.info) return this.infoCombattant(d.info);
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') { this.fermerModal(); if (this.selection) { this.selection = null; this.majCombat(); } } });
    this.rendu();
  },

  clic(nom, t) {
    switch (nom) {
      case 'nouvelle':
        if (Jeu.ecran === 'titre' && Jeu.sauvegardeExiste() && !confirm('Commencer une nouvelle expédition ? La partie en cours sera perdue.')) return;
        return Jeu.nouvellePartie();
      case 'continuer': return Jeu.charger();
      case 'regles': return this.regles();
      case 'equipe': return this.fenetreEquipe();
      case 'monter': Jeu.deplacerPJ(+t.dataset.index, -1); this.fenetreEquipe(); return this.rendu();
      case 'descendre': Jeu.deplacerPJ(+t.dataset.index, 1); this.fenetreEquipe(); return this.rendu();
      case 'abandonner':
        if (confirm('Abandonner l\'expédition ?')) { Jeu.effacerSauvegarde(); Jeu.ecran = 'titre'; this.rendu(); }
        return;
      case 'fermer': return this.fermerModal();
      case 'confirmer': return this.confirmer();
      case 'annuler': this.selection = null; return this.majCombat();
      case 'passer': return Jeu.allerCarte();
      case 'repos-court': return Jeu.reposCourt();
      case 'repos-long': return Jeu.reposLong();
      case 'carte': return Jeu.allerCarte();
      case 'fin-evenement': return Jeu.finEvenement();
      case 'titre': Jeu.ecran = 'titre'; return this.rendu();
    }
  }
};

document.addEventListener('DOMContentLoaded', () => Ui.initialiser());
