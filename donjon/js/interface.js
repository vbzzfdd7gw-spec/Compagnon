// =====================================================================
// Interface : rendu des écrans et gestion des clics.
// =====================================================================

const $ = sel => document.querySelector(sel);
const echapper = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

ACTIONS.sac_retour = {
  nom: 'Fermer le sac', icone: '↩️', type: 'special', special: 'sac', commune: true,
  depuis: ['avant', 'arriere'], cible: 'soi', vise: [], desc: 'Revenir aux actions.'
};

// Étiquette colorée de rareté
function etiquetteRarete(r) {
  return r ? `<span class="rarete" style="color:${RARETES[r].couleur};border-color:${RARETES[r].couleur}">${RARETES[r].nom}</span>` : '';
}

const Ui = {
  modeSac: false,
  selection: null,   // identifiant de l'action choisie pendant le combat
  finAnim: 0,        // fin des animations en cours (horodatage)
  affichage: null,   // PV/Peur affichés pendant les animations
  raison: null,      // message quand on touche une action indisponible

  rendu() {
    const app = $('#app');
    const ecrans = {
      titre: () => this.ecranTitre(),
      carte: () => this.ecranCarte(),
      combat: () => this.ecranCombat(),
      recompense: () => this.ecranRecompense(),
      repos: () => this.ecranRepos(),
      evenement: () => this.ecranEvenement(),
      fin: () => this.ecranFin(),
      campagnes: () => this.ecranCampagnes(),
      marchand: () => this.ecranMarchand(),
      composition: () => this.ecranComposition()
    };
    app.innerHTML = ecrans[Jeu.ecran]();
    Son.ambiance(Jeu.ecran === 'combat' ? (Jeu.combat && Jeu.combat.type === 'boss' ? 'boss' : 'combat') : Jeu.ecran === 'fin' ? null : 'carte');
    app.dataset.ecran = Jeu.ecran;
    if (Jeu.ecran === 'carte') this.defilerCarte();
    if (Jeu.ecran === 'titre') Modeles3D.attacher($('#scene'), { vitrine: true });
    if (Jeu.ecran === 'combat') this.apresRenduCombat();
  },

  // Boutons : sons, musique, (vitesse en combat)
  boutonsAudio(vitesse = false) {
    return `<button class="btn-icone ${Reglages.sons ? '' : 'off'}" data-clic="sons" title="Couper / remettre les sons">${Reglages.sons ? '🔊' : '🔇'}</button>`
      + `<button class="btn-icone ${Reglages.musique ? '' : 'off'}" data-clic="musique" title="Couper / remettre la musique">🎵</button>`
      + (vitesse ? `<button class="btn-icone ${Reglages.vitesse > 1 ? 'actif' : ''}" data-clic="vitesse" title="Vitesse des animations">⏩${Reglages.vitesse > 1 ? '×2' : ''}</button>` : '');
  },
  majBoutonsAudio() {
    document.querySelectorAll('[data-clic="sons"]').forEach(b => { b.textContent = Reglages.sons ? '🔊' : '🔇'; b.classList.toggle('off', !Reglages.sons); });
    document.querySelectorAll('[data-clic="musique"]').forEach(b => b.classList.toggle('off', !Reglages.musique));
    document.querySelectorAll('[data-clic="vitesse"]').forEach(b => { b.textContent = '⏩' + (Reglages.vitesse > 1 ? '×2' : ''); b.classList.toggle('actif', Reglages.vitesse > 1); });
  },

  // ----------------------------------------------------------- titre
  ecranTitre() {
    const equipe = (Reglages.equipe && Reglages.equipe.every(c => CLASSES[c])) ? Reglages.equipe : ORDRE_CLASSES;
    const sauve = Jeu.sauvegardeExiste();
    return `<div class="accueil">
      <div class="logo-zone">
        <div class="logo-titre">Cryptes <span class="esperluette">&amp;</span> Dés</div>
        <div class="logo-sous">Roguelike · D&amp;D 5e</div>
      </div>
      <div class="scene vitrine" id="scene">

        <div class="rangee-scene pj avant vitrine-rang">${equipe.map(k => `<div class="combattant pj" data-id="v-${k}" data-modele="${k}">
          <div class="figure"><span class="sprite">${CLASSES[k].icone}</span></div>
          <div class="nom">${CLASSES[k].nom}</div></div>`).join('')}</div>
      </div>
      <div class="accueil-bas">
        ${sauve ? '<button class="plaque principale" data-clic="continuer">▶ Continuer l\'expédition</button>' : ''}
        <button class="plaque ${sauve ? '' : 'principale'}" data-clic="nouvelle">⚔️ Nouvelle expédition</button>
        <div class="accueil-outils">
          <button class="btn-icone" data-clic="regles" title="Règles">📖</button>
          ${this.boutonsAudio()}
        </div>
        <div class="progression">${CAMPAGNES.map(c => {
          const ok = Progression.debloquee(c), v = Progression.victoires(c);
          return `<span class="prog ${ok ? '' : 'verrou'} ${v ? 'faite' : ''}" title="${c.nom}">${ok ? c.icone : '🔒'}<small>${v ? '✅' : c.difficulte + '★'}</small></span>`;
        }).join('')}</div>
      </div>
    </div>`;
  },

  regles() {
    this.modal(`<h2>Règles</h2>
      <h3>Lignes</h3>
      <p>Chaque camp a deux lignes : <b>Avant</b> et <b>Arrière</b>. Sur la scène, les deux lignes Avant se font face au milieu.</p>
      <p>• <b>Corps à corps</b> (⚔) : seulement depuis la ligne Avant, et ne touche que la ligne Avant ennemie.<br>
      • <b>Distance et sorts</b> (🏹) : depuis n'importe où, touchent n'importe qui.<br>
      • Si toute la ligne Avant d'un camp est vaincue ou à terre, sa ligne Arrière devient attaquable au corps à corps.</p>
      <p>Chaque bouton indique d'où l'action s'utilise et ce qu'elle vise, par exemple <span class="pips-demo">${this.pipsAction(ACTIONS.epee_longue)}</span>. L'action « Changer de ligne » fait passer de l'Avant à l'Arrière (ou l'inverse) en combat ; hors combat, utilisez l'écran Équipe.</p>
      <h3>Combat</h3>
      <p>Initiative : d20 + DEX. Attaque : d20 + bonus contre la CA. 20 naturel = critique (dés de dégâts doublés), 1 naturel = échec.
      Sorts à sauvegarde : la cible lance d20 + bonus contre le DD du lanceur. Le Clerc et le Magicien ont des emplacements de sorts limités (récupérés au repos long).</p>
      <h3>Peur</h3>
      <p>Chaque héros a une jauge de Peur (0 à 100). Elle monte avec les critiques ennemis (+20), un allié à terre (+15), un gros coup (+8), les cultistes et les monstres terrifiants, et quand un combat s'éternise (+4 par round à partir du 5e). Elle baisse avec les victoires, les ennemis tués, les feux de camp et certains sorts.</p>
      <p>• <b>😟 Anxieux (50+)</b> : −1 au toucher et aux sauvegardes.<br>
      • <b>Crise (100)</b> : le héros craque. Désavantage, plus un trouble : 😱 <b>Terreur</b> (reste parfois paralysé), 🤬 <b>Rage aveugle</b> (frappe parfois au hasard), 😭 <b>Désespoir</b> (effraie ses alliés), 🙄 <b>Égoïsme</b> (soins reçus divisés par deux). La crise dure jusqu'à ce que sa Peur repasse sous 50.<br>
      • Une fois sur quatre, il se révèle au contraire 🌟 <b>héroïque</b> : Peur ramenée à 40, +2 au toucher et aux dégâts, et l'équipe reprend courage.</p>
      <h3>À terre</h3>
      <p>À 0 PV, un personnage est à terre. Il le reste au combat suivant tant qu'il n'est pas soigné (sort, potion, repos). Si toute l'équipe est à terre, l'expédition échoue.</p>
      <h3>Carte</h3>
      <p>⚔️ Combat · 💀 Élite · 🔥 Repos (court : dés de vie ; long : tout restaurer, une seule fois) · 💰 Trésor · ❓ Événement · 👑 Boss.
      Après chaque combat, choisissez 1 récompense parmi 3.</p>
      <p class="petit">Astuce : touchez un personnage ou un monstre pour voir sa fiche.</p>`);
  },

  // ------------------------------------------------------ campagnes
  ecranCampagnes() {
    return `<div class="ecran-centre">
      <h2>Choisissez une campagne</h2>
      <p class="discret">Terminez une campagne pour débloquer la suivante.</p>
      <div class="campagnes">${CAMPAGNES.map(c => {
        const ok = Progression.debloquee(c);
        const avant = c.apres ? Progression.campagne(c.apres) : null;
        const v = Progression.victoires(c), rec = Progression.record(c);
        return `<button class="campagne ${ok ? '' : 'verrou'}" ${ok ? `data-campagne="${c.id}"` : 'disabled'}>
          <span class="camp-icone">${ok ? c.icone : '🔒'}</span>
          <span class="camp-corps">
            <b>${c.nom}</b> <span class="etoiles">${'★'.repeat(c.difficulte)}</span>
            <span class="camp-resume">${ok ? c.resume : `Terminez <b>${avant.nom}</b> pour débloquer cette campagne.`}</span>
            ${ok ? `<span class="camp-infos">${c.etages.length} étages${c.regleTexte ? ' · ' + c.regleTexte : ''}${v ? ` · ✅ terminée ${v}×` : rec ? ` · record : étage ${rec}/${c.etages.length}` : ''}</span>` : ''}
          </span>
        </button>`;
      }).join('')}</div>
      <button class="btn" data-clic="titre">Retour</button>
    </div>`;
  },

  // ------------------------------------------- composition d'équipe
  ecranComposition() {
    const choix = Jeu.composition, c = Progression.campagne(Jeu.campagneChoisie);
    const conseils = [];
    if (choix.length === 4) {
      if (!choix.some(k => CLASSES[k].ligne === 'avant')) conseils.push('⚠️ Personne pour tenir la ligne Avant : vos héros fragiles seront exposés au corps à corps.');
      if (!choix.some(k => SOIGNEURS.includes(k))) conseils.push('⚠️ Aucun soigneur : seuls les potions et les feux de camp vous soigneront.');
      if (choix.filter(k => CLASSES[k].ligne === 'avant').length >= 4) conseils.push('⚠️ Que des combattants de front : aucun soutien à distance.');
      if (!conseils.length) conseils.push('✅ Équipe équilibrée : un front solide et de quoi soigner.');
    } else conseils.push(`Choisissez encore ${4 - choix.length} héros.`);
    return `<div class="ecran-centre">
      <h2>Composez votre équipe</h2>
      <p class="discret">${c.icone} ${c.nom} — touchez 4 héros. ℹ️ pour le détail des capacités.</p>
      <div class="emplacements-equipe">${[0, 1, 2, 3].map(i => {
        const k = choix[i];
        return k ? `<span class="place pleine" data-classe="${k}">${CLASSES[k].icone}<small>${CLASSES[k].nom}</small></span>` : '<span class="place">?</span>';
      }).join('')}</div>
      <div class="conseils">${conseils.map(t => `<div>${t}</div>`).join('')}</div>
      <div class="grille-classes">${TOUTES_CLASSES.map(k => {
        const cl = CLASSES[k], pris = choix.includes(k);
        return `<div class="carte-classe ${pris ? 'prise' : ''} ${!pris && choix.length >= 4 ? 'pleine' : ''}" data-classe="${k}" style="--c:${cl.couleur}">
          ${pris ? `<span class="ordre-choix">${choix.indexOf(k) + 1}</span>` : ''}
          <button class="info-classe" data-info-classe="${k}" title="Détails">ℹ️</button>
          <span class="cl-icone">${cl.icone}</span>
          <b>${cl.nom}</b>
          <span class="cl-role">${cl.role}</span>
          <span class="cl-stats">❤️ ${cl.pv} · 🛡 ${cl.ca} · ${cl.ligne === 'avant' ? 'Avant' : 'Arrière'}</span>
        </div>`;
      }).join('')}</div>
      <div class="boutons-compo">
        <button class="btn" data-clic="campagnes">← Campagnes</button>
        <button class="btn" data-clic="aleatoire">🎲 Aléatoire</button>
        <button class="btn principal" data-clic="partir" ${choix.length === 4 ? '' : 'disabled'}>Partir ▶</button>
      </div>
    </div>`;
  },

  ficheClasse(k) {
    const cl = CLASSES[k];
    const emp = Object.entries(cl.emplacements).map(([n, v]) => `${v}× niv.${n}`).join(', ');
    this.modal(`<h2>${cl.icone} ${cl.nom}</h2>
      <p><b>${cl.role}</b> — ${cl.desc}</p>
      <div class="fiche-stats"><span>❤️ ${cl.pv} PV</span><span>🛡 CA ${cl.ca}</span><span>⚔️ Att +${cl.bonusArme}</span>${cl.ddSort ? `<span>✨ DD ${cl.ddSort}</span>` : ''}<span>🎲 d${cl.deVie}</span>${emp ? `<span>Sorts : ${emp}</span>` : ''}</div>
      <h3>Actions de départ</h3>
      <div class="fiche-actions">${cl.actions.map(id => this.ligneAction(ACTIONS[id])).join('')}</div>
      <h3>À débloquer</h3>
      <div class="fiche-actions">${cl.poolActions.map(id => this.ligneAction(ACTIONS[id])).join('')}</div>`);
  },

  // ----------------------------------------------------------- carte
  ecranCarte() {
    return `<div class="ecran-carte">
      <header class="barre">
        <div class="titre-carte"><b>${Jeu.etageCourant().nom}</b> <span class="discret">· étage ${Jeu.etage + 1}/${Jeu.etages().length} · niv. ${Jeu.equipe[0].niveau || 3}</span></div>
        <div class="boutons-barre">
          ${this.boutonsAudio()}
          <button class="btn petit" data-clic="equipe">👥 Équipe</button>
          <button class="btn petit" data-clic="regles">?</button>
          <button class="btn petit discret" data-clic="abandonner" title="Abandonner">✕</button>
        </div>
      </header>
      <div class="carte-conteneur">${Carte.svg(Jeu.carte)}</div>
      <div class="legende">${Object.values(TYPES_NOEUDS).map(t => `<span>${t.icone} ${t.nom}</span>`).join('')}</div>
      ${this.resumeEquipe()}
    </div>`;
  },

  // Centre la carte sur les salles accessibles (la carte défile dans son cadre)
  defilerCarte() {
    const c = $('.carte-conteneur'), cibles = [...document.querySelectorAll('.noeud.accessible, .noeud.actuel')];
    if (!c || !cibles.length) return;
    const rc = c.getBoundingClientRect();
    const ys = cibles.map(n => { const r = n.getBoundingClientRect(); return r.top + r.height / 2; });
    const milieu = ys.reduce((a, b) => a + b, 0) / ys.length;
    c.scrollTop += milieu - rc.top - rc.height * 0.55;
  },

  resumeEquipe() {
    return `<div class="resume-equipe">
      ${Jeu.equipe.map((p, i) => `<div class="mini-pj ${p.pv <= 0 ? 'a-terre' : ''}" data-info="${p.id}">
        <div class="mini-tete"><span class="ligne-badge ${p.ligne}">${p.ligne === 'avant' ? 'Avant' : 'Arr.'}</span><span class="mini-ic">${p.pv <= 0 ? '🪦' : p.icone}</span>${this.iconePeur(p)}</div>
        ${this.barre(p.pv, p.pvMax, 'pv', `${p.pv}/${p.pvMax}`)}
        ${this.barre(p.peur, 100, 'peur', '')}
        ${this.emplacementsHtml(p, true)}
      </div>`).join('')}
      <div class="potions">💰 ${Jeu.or} or · 🧴 ${Jeu.potions} potion${Jeu.potions > 1 ? 's' : ''}${this.texteSac()} · 🛏 Repos long ${Jeu.reposLongUtilise ? 'utilisé' : 'disponible'} · touchez un héros pour sa fiche</div>
    </div>`;
  },

  texteSac() {
    const t = Object.entries(Jeu.sac || {}).filter(([, n]) => n > 0).map(([k, n]) => `${CONSOMMABLES[k].icone}×${n}`).join(' ');
    return t ? ' · ' + t : '';
  },

  // Icône de l'état de Peur d'un héros (anxieux ou crise)
  iconePeur(c, peur = c.peur) {
    if (c.camp !== 'pj') return '';
    if (c.crise) return `<span title="${CRISES[c.crise].nom}">${CRISES[c.crise].icone}</span>`;
    return peur >= PEUR.seuilAnxieux ? '<span title="Anxieux : −1 au toucher et aux sauvegardes">😟</span>' : '';
  },

  barre(val, max, classe, texte) {
    const pct = Math.max(0, Math.min(100, (val / max) * 100));
    return `<div class="barre-jauge ${classe}${classe === 'peur' && val >= 100 ? ' max' : ''}"><span style="width:${pct}%"></span><em>${texte}</em></div>`;
  },

  emplacementsHtml(p, court = false) {
    const niv = Object.keys(p.emplacements);
    if (!niv.length) return court ? '<div class="emplacements vide"></div>' : '';
    return `<${court ? 'span' : 'div'} class="emplacements${court ? ' court' : ''}">${niv.map(n => `<span title="Emplacements de niveau ${n}">${court ? '' : 'niv.'}${n}:${'●'.repeat(p.emplacements[n].restant)}${'○'.repeat(p.emplacements[n].max - p.emplacements[n].restant)}</span>`).join(' ')}</${court ? 'span' : 'div'}>`;
  },

  // ---------------------------------------------------- fiche équipe
  fenetreEquipe() {
    this.modal(`<h2>Équipe</h2>
      <div class="sac-equipe">🎒 Sac : 🧴×${Jeu.potions}${this.texteSac().replace(' · ', ' ')} · 💰 ${Jeu.or} or</div>
      <p class="petit">Touchez la ligne d'un héros pour le placer à l'Avant (corps à corps, protège l'arrière) ou à l'Arrière (à l'abri du corps à corps).</p>
      ${Jeu.equipe.map(p => `<div class="fiche">
        <div class="fiche-tete">
          <b>${p.icone} ${p.nom}</b> <span class="discret">niv. ${p.niveau || 3}</span>
          <span class="fleches">
            <button class="btn mini ${p.ligne === 'avant' ? 'principal' : ''}" data-clic="ligne" data-pj="${p.id}" ${p.ligne === 'avant' ? 'disabled' : ''}>Avant</button>
            <button class="btn mini ${p.ligne === 'arriere' ? 'principal' : ''}" data-clic="ligne" data-pj="${p.id}" ${p.ligne === 'arriere' ? 'disabled' : ''}>Arrière</button>
          </span>
        </div>
        ${this.ficheDetails(p, true)}
      </div>`).join('')}`);
  },

  ligneObjet(p, cle, avecDon) {
    const o = OBJETS[cle];
    const receveurs = avecDon ? Jeu.equipe.filter(x => x !== p && !x.objets.includes(cle) && (!o.classes || o.classes.includes(x.classe))) : [];
    return `<div class="ligne-objet" style="border-left-color:${RARETES[o.rarete].couleur}">${o.icone} <b style="color:${RARETES[o.rarete].couleur}">${o.nom}</b> — ${o.desc}
      ${receveurs.length ? `<div class="donner">Donner à : ${receveurs.map(x => `<button class="btn mini" data-clic="donner" data-de="${p.id}" data-a="${x.id}" data-objet="${cle}">${x.icone}</button>`).join(' ')}</div>` : ''}</div>`;
  },

  ficheDetails(p, avecDon = false) {
    const crise = p.crise ? `<div class="etats-detail">${CRISES[p.crise].icone} <b>${CRISES[p.crise].nom}</b> — ${CRISES[p.crise].desc}</div>` : '';
    return crise + this.ficheDetails2(p, avecDon);
  },
  ficheDetails2(p, avecDon = false) {
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
      ${p.objets.length ? `<div class="fiche-objets">${p.objets.map(o => this.ligneObjet(p, o, avecDon)).join('')}</div>` : '<div class="petit">Aucun objet.</div>'}`;
  },

  ligneAction(a) {
    return `<div class="ligne-action"><b>${a.icone} ${a.nom}</b> <span class="pips-demo">${this.pipsAction(a)}</span><div class="petit">${a.desc}</div></div>`;
  },

  // Portée d'une action : « d'où » ▸ « quoi »
  nomLignes(l) { return l.length > 1 ? 'Partout' : (l[0] === 'avant' ? 'Avant' : 'Arrière'); },

  pipsAction(a, court = false) {
    const de = `<span class="p-de">${this.nomLignes(a.depuis)}</span>`;
    let vise;
    if (a.cible === 'soi') vise = '<span class="p-vise soi">soi</span>';
    else if (a.cible === 'allie') vise = `<span class="p-vise allie">${a.zone ? 'alliés' : 'allié'}</span>`;
    else if (a.vise.length > 1) vise = `<span class="p-vise loin">🏹 ${a.zone ? 'tous' : 'tous'}</span>`;
    else vise = `<span class="p-vise cac">⚔ ${a.vise[0] === 'avant' ? 'Avant' : 'Arrière'}</span>`;
    if (a.zone && a.cible === 'ennemi' && !court) vise += '<span class="p-zone">zone</span>';
    return `${de}<span class="p-fl">▸</span>${vise}`;
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
      <div class="ordre-ligne"><div class="ordre" id="ordre"></div>${this.boutonsAudio(true)}<button class="btn-journal" data-clic="journal" title="Journal des dés">📜</button></div>
      <div class="scene" id="scene">
        <div class="torche g">🔥</div><div class="torche d">🔥</div>
        <div class="rangee-scene ennemi arriere" id="en-arriere" data-etiquette="Arrière"></div>
        <div class="rangee-scene ennemi avant" id="en-avant" data-etiquette="Avant"></div>
        <div class="milieu" id="milieu"></div>
        <div class="rangee-scene pj avant" id="pj-avant" data-etiquette="Avant"></div>
        <div class="rangee-scene pj arriere" id="pj-arriere" data-etiquette="Arrière"></div>
        <div class="calque" id="calque"></div>
      </div>
      <div class="bandeau" id="bandeau" data-clic="journal"></div>
      <div class="panneau" id="panneau"></div>
    </div>`;
  },

  apresRenduCombat() {
    this.majCombat();
    Modeles3D.theme(Jeu.etageCourant().theme);
    Modeles3D.attacher($('#scene'));
  },

  majCombat() {
    const cb = Jeu.combat;
    if (!cb || Jeu.ecran !== 'combat' || !$('#scene')) return 0;
    // Pendant une animation, on reporte le rafraîchissement
    if (Date.now() < this.finAnim) {
      clearTimeout(this.tMaj);
      this.tMaj = setTimeout(() => this.majCombat(), this.finAnim - Date.now() + 20);
      return 0;
    }
    if (this.selection && (!cb.attenteJoueur || !cb.disponibilite(cb.actif, ACTIONS[this.selection]).ok)) this.selection = null;
    if (!cb.attenteJoueur) this.modeSac = false;

    const evs = cb.evenements.splice(0);
    // Valeurs affichées avant animation : PV et Peur « d'avant »
    const pvAff = {}, peurAff = {}, vivants = new Set();
    for (const e of evs) {
      if ((e.t === 'degats' || e.t === 'soin') && !(e.cible in pvAff)) pvAff[e.cible] = e.pvAvant;
      if (e.t === 'peur' && !(e.cible in peurAff)) peurAff[e.cible] = e.avant;
      if (e.t === 'mort') vivants.add(e.cible);
    }
    this.affichage = { pvAff, peurAff, vivants };

    $('#ordre').innerHTML = this.ordreHtml(cb);
    const act = this.selection ? ACTIONS[this.selection] : null;
    const atteintes = act && act.cible === 'ennemi' ? cb.lignesAtteignables(cb.ennemis, act.vise) : null;
    for (const [camp, liste] of [['en', cb.ennemis], ['pj', cb.pjs]]) {
      for (const l of ['avant', 'arriere']) {
        const el = $(`#${camp}-${l}`);
        el.innerHTML = liste.filter(c => c.ligne === l).map(c => this.carteCombattant(c, cb)).join('');
        el.classList.toggle('hors-portee', !!(atteintes && camp === 'en' && !atteintes.includes(l)));
        el.classList.toggle('a-portee', !!(atteintes && camp === 'en' && atteintes.includes(l)));
      }
    }
    $('#panneau').innerHTML = this.panneauHtml(cb);
    this.majBandeau(cb);
    if (cb.fini && cb.resultat === 'victoire' && this.victoireJouee !== cb) {
      this.victoireJouee = cb;
      Son.jouer('victoire');
      setTimeout(() => Modeles3D.victoire && Modeles3D.actif && Modeles3D.victoire(cb.pjs.filter(p => p.pv > 0).map(p => p.id)), 400);
    }
    if (!evs.length) { this.affichage = null; return 0; }
    return this.jouerAnimations(evs);
  },

  majBandeau(cb) {
    const actions = cb.journal.filter(l => l.classe.includes('action') || l.classe.includes('titre'));
    const derniere = actions[actions.length - 1];
    $('#bandeau').innerHTML = `<span class="bandeau-texte">${derniere ? derniere.html : ''}</span><span class="bandeau-plus">📜 Détail des dés</span>`;
  },

  ordreHtml(cb) {
    const restants = cb.ordre.slice(Math.max(0, cb.indexTour)).filter(c => c.pv > 0 && (c.camp === 'pj' || cb.ennemis.includes(c)));
    return `<span class="round">R${cb.round}</span>` + restants.map((c, i) =>
      `<span class="puce ${c.camp} ${i === 0 && cb.actif === c ? 'actif' : ''}" title="${echapper(c.nom)}">${c.icone}</span>`).join('');
  },

  carteCombattant(c, cb) {
    const aff = this.affichage || { pvAff: {}, peurAff: {}, vivants: new Set() };
    const pv = c.id in aff.pvAff ? aff.pvAff[c.id] : Math.max(0, c.pv);
    const peur = c.id in aff.peurAff ? aff.peurAff[c.id] : c.peur;
    const mort = c.pv <= 0 && !aff.vivants.has(c.id) && !(aff.pvAff[c.id] > 0);
    const act = this.selection ? ACTIONS[this.selection] : null;
    const valides = act ? cb.ciblesValides(cb.actif, act) : [];
    const ciblable = act && act.cible !== 'soi' && !act.zone && valides.includes(c);
    const tri = act && act.triangle && this.cibleTri ? valides.find(x => x.id === this.cibleTri) : null;
    const enZone = act && ((act.zone && valides.includes(c)) || (act.cible === 'soi' && c === cb.actif) || (tri && cb.cibleTriangle(cb.actif, act, tri).includes(c)));
    const classes = ['combattant', c.camp];
    if (cb.actif === c) classes.push('actif');
    if (ciblable) classes.push('ciblable');
    if (enZone) classes.push('en-zone');
    if (mort) classes.push(c.camp === 'pj' ? 'a-terre' : 'mort');
    if (c.boss) classes.push('boss');
    if (c.camp === 'pj' && c.crise) classes.push('panique');
    const etats = this.iconePeur(c, peur) + Object.keys(c.etats).map(e => `<span title="${ETATS[e].nom}">${ETATS[e].icone}</span>`).join('');
    const ca = c.ca + (c.etats.defi ? 2 : 0) + (c.etats.bouclier ? 5 : 0) + (c.etats.ecorce ? 3 : 0);
    return `<div class="${classes.join(' ')}" data-id="${c.id}" data-modele="${c.camp === 'pj' ? c.classe : c.modele}">
      <span class="ca-badge">🛡${ca}</span>
      <div class="etats">${etats}</div>
      <div class="figure"><span class="sprite">${mort && c.camp === 'pj' ? '🪦' : c.icone}</span><span class="ombre"></span></div>
      <div class="nom">${echapper(c.nom)}</div>
      ${this.barre(pv, c.pvMax, 'pv', `${pv}/${c.pvMax}`)}
      ${c.camp === 'pj' ? this.barre(peur, 100, 'peur', '') : ''}
    </div>`;
  },

  // ------------------------------------------------------ animations
  DUREES: { action: 420, jet: 900, degats: 420, soin: 420, texte: 260, mort: 380, peur: 120, deplacement: 300 },

  jouerAnimations(evs) {
    let t = 0;
    for (const e of evs) {
      setTimeout(() => this.animer(e), t);
      t += (this.DUREES[e.t] || 200) / Reglages.vitesse;
    }
    t += 150;
    this.finAnim = Date.now() + t;
    setTimeout(() => { this.affichage = null; }, t);
    return t;
  },

  elem(id) { return document.querySelector(`.combattant[data-id="${id}"]`); },

  animer(e) {
    const el = e.cible !== undefined ? this.elem(e.cible) : null;
    switch (e.t) {
      case 'action': {
        const src = this.elem(e.source);
        const ann = document.createElement('div');
        ann.className = 'annonce ' + e.camp;
        ann.innerHTML = `<span>${e.icone}</span> ${echapper(e.nom)}`;
        $('#milieu').replaceChildren(ann);
        Son.jouer(e.special === 'potion' ? 'potion' : (e.typeAct === 'soin' || e.typeAct === 'soutien') ? 'benediction'
          : e.melee ? 'epee' : e.sort ? 'sort' : 'arc', e.typeDeg);
        if (Modeles3D.actif) {
          // Animation du personnage, regard vers la cible, projectile ou colonne de lumière
          const type = e.special === 'potion' ? 'potion' : e.special === 'invoquer' ? 'invoque'
            : e.melee ? 'attaque' : (e.typeAct === 'soin' || e.typeAct === 'soutien' || e.special) ? 'soutien' : e.sort ? 'sort' : 'tir';
          Modeles3D.anim(e.source, type);
          if (e.cibles[0] && e.cibles[0] !== e.source) Modeles3D.regarder(e.source, e.cibles[0]);
          if (e.sort) Modeles3D.flash(e.source, 0x5070ff);
          if (e.distance) {
            if (e.typeAct === 'sauvegarde' || e.special) setTimeout(() => e.cibles.forEach(id => Modeles3D.colonne(id, e.typeDeg)), 260);
            else setTimeout(() => e.cibles.forEach(id => Modeles3D.projectile(e.source, id, e.typeDeg)), 220);
          }
        }
        if (src) {
          src.classList.remove('elan', 'incante');
          void src.offsetWidth;
          src.classList.add(e.melee ? 'elan' : 'incante');
        }
        if (e.distance && src && !Modeles3D.actif) for (const id of e.cibles) this.projectile(src, this.elem(id), e.icone);
        break;
      }
      case 'jet': this.afficherDe(e); Son.jouer('de'); break;
      case 'degats':
        if (!el) break;
        this.majBarre(el, 'pv', e.pvApres, e.pvMax, `${e.pvApres}/${e.pvMax}`);
        el.classList.remove('touche'); void el.offsetWidth; el.classList.add('touche');
        Modeles3D.flash(e.cible, 0xff2a1a);
        Modeles3D.effet(e.cible, e.crit ? 'crit' : 'coup');
        Modeles3D.anim(e.cible, 'coup');
        Son.jouer(e.crit ? 'metal' : 'coup');
        if (e.crit) Modeles3D.secousse(0.35);
        this.flotter(el, '−' + e.n, e.crit ? 'crit' : 'degats');
        if (e.crit) { const s = $('#scene'); s.classList.remove('tremble'); void s.offsetWidth; s.classList.add('tremble'); }
        break;
      case 'soin':
        if (!el) break;
        this.majBarre(el, 'pv', e.pvApres, e.pvMax, `${e.pvApres}/${e.pvMax}`);
        el.classList.remove('a-terre', 'soigne'); void el.offsetWidth; el.classList.add('soigne');
        Modeles3D.flash(e.cible, 0x40ff70);
        Modeles3D.colonne(e.cible, 'soin');
        Son.jouer('soin');
        el.querySelector('.sprite').textContent = Jeu.equipe.find(p => p.id === e.cible)?.icone || el.querySelector('.sprite').textContent;
        this.flotter(el, '+' + e.n, 'soin');
        break;
      case 'texte':
        if (el) this.flotter(el, e.texte, e.classe);
        if (e.texte === 'Raté') { Modeles3D.anim(e.cible, 'esquive'); Son.jouer('rate'); }
        if (e.texte === 'Résiste') Modeles3D.anim(e.cible, 'bloque');
        break;
      case 'peur':
        if (!el) break;
        this.majBarre(el, 'peur', e.apres, 100, '');
        if (Math.abs(e.n) >= 10) this.flotter(el, (e.n > 0 ? '😨+' : '😌') + e.n, 'peur');
        if (e.n >= 10) Son.jouer(e.apres >= 100 && e.avant < 100 ? 'panique' : 'peur');
        if (e.apres >= 100) el.classList.add('panique'); else el.classList.remove('panique');
        break;
      case 'deplacement': {
        if (!el) break;
        const camp = el.classList.contains('pj') ? 'pj' : 'en';
        $(`#${camp}-${e.ligne}`).appendChild(el);
        el.classList.remove('arrive'); void el.offsetWidth; el.classList.add('arrive');
        break;
      }
      case 'mort':
        Son.jouer(e.pj ? 'chute' : 'mort');
        if (!el) break;
        el.classList.add(e.pj ? 'a-terre' : 'mort');
        if (e.pj) el.querySelector('.sprite').textContent = '🪦';
        break;
    }
  },

  majBarre(el, classe, val, max, texte) {
    const b = el.querySelector('.barre-jauge.' + classe);
    if (!b) return;
    b.querySelector('span').style.width = Math.max(0, Math.min(100, val / max * 100)) + '%';
    b.querySelector('em').textContent = texte;
    b.classList.toggle('max', classe === 'peur' && val >= 100);
  },

  flotter(el, texte, classe) {
    const s = document.createElement('span');
    s.className = 'flottant ' + classe;
    s.textContent = texte;
    el.appendChild(s);
    setTimeout(() => s.remove(), 1300);
  },

  projectile(src, dst, icone) {
    if (!src || !dst) return;
    const scene = $('#scene').getBoundingClientRect();
    const a = src.querySelector('.figure').getBoundingClientRect(), b = dst.querySelector('.figure').getBoundingClientRect();
    const p = document.createElement('div');
    p.className = 'projectile';
    p.textContent = icone;
    p.style.left = (a.left + a.width / 2 - scene.left) + 'px';
    p.style.top = (a.top + a.height / 2 - scene.top) + 'px';
    $('#calque').appendChild(p);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      p.style.left = (b.left + b.width / 2 - scene.left) + 'px';
      p.style.top = (b.top + b.height / 2 - scene.top) + 'px';
    }));
    setTimeout(() => p.remove(), 520);
  },

  // Gros d20 au centre de la scène
  afficherDe(e) {
    const m = $('#milieu');
    const libRes = { crit: 'CRITIQUE !', touche: 'Touché', rate: 'Raté', reussite: 'Réussi', echec: 'Échec' }[e.res];
    const bon = e.sauvegarde ? null : (e.res !== 'rate');
    const classeRes = e.res === 'crit' ? 'crit' : (e.res === 'rate' || e.res === 'reussite' && !e.sauvegarde) ? 'non' : (e.res === 'echec' || e.res === 'reussite') ? e.res : 'oui';
    const bonus = e.total - e.nat;
    m.innerHTML = `<div class="de-jet ${classeRes}${e.nat === 20 ? ' nat20' : ''}${e.nat === 1 ? ' nat1' : ''}">
      <svg viewBox="0 0 100 100" class="d20"><polygon points="50,3 93,27 93,73 50,97 7,73 7,27"/><polygon class="face" points="50,22 76,66 24,66"/>
        <text x="50" y="${e.nat >= 10 ? 58 : 58}" class="num">?</text></svg>
      <div class="de-info"><div class="de-lib">${echapper(e.libelle)}${e.mode ? (e.mode > 0 ? ' <span class="av">avantage</span>' : ' <span class="dv">désavantage</span>') : ''}</div>
      <div class="de-calc"><b class="tot">…</b> ${bonus ? `<span class="petit">(${e.nat}${signe(bonus)})</span>` : ''} vs ${e.contre}</div>
      <div class="de-res">${libRes}</div></div></div>`;
    const num = m.querySelector('.num'), tot = m.querySelector('.tot'), box = m.querySelector('.de-jet');
    let n = 0;
    const roule = setInterval(() => { num.textContent = 1 + Math.floor(Math.random() * 20); if (++n > 6) { clearInterval(roule); num.textContent = e.nat; tot.textContent = e.total; box.classList.add('pose'); } }, 45);
  },

  panneauHtml(cb) {
    if (cb.fini) {
      if (cb.resultat === 'defaite' && this.defaiteJouee !== cb) { this.defaiteJouee = cb; Son.jouer('defaite'); }
      return `<div class="attente">${cb.resultat === 'victoire' ? '🏆 Victoire !' : '💀 Défaite…'}</div>`;
    }
    const a = cb.actif;
    if (!a || !cb.attenteJoueur) {
      // Pendant le tour ennemi : aperçu des actions du prochain héros
      const suivant = cb.prochainPJ();
      const entete = `<div class="aide">${a ? `${a.icone} <b>${echapper(a.nom)}</b> agit…` : '…'}${suivant ? ` <span class="discret">· ensuite : ${suivant.icone} ${suivant.nom}</span>` : ''}</div>`;
      if (!suivant) return entete;
      const apercu = [...suivant.actions, ...ACTIONS_COMMUNES].map(id => {
        const act = ACTIONS[id];
        return `<div class="btn-action apercu ${act.commune ? 'commune' : ''}"><span class="ic">${act.icone}</span><span class="nm">${act.nom}</span><span class="pips-ligne">${this.pipsAction(act, true)}</span></div>`;
      }).join('');
      return `${entete}<div class="actions">${apercu}</div>`;
    }

    const ids = this.modeSac
      ? [...Object.keys(ACTIONS_SAC).filter(k => Jeu.stock(ACTIONS_SAC[k].consommable) > 0), 'sac_retour']
      : [...a.actions, ...ACTIONS_COMMUNES];
    const boutons = ids.map(id => {
      const act = ACTIONS[id];
      const d = cb.disponibilite(a, act);
      const cout = act.niveau ? `niv${act.niveau}` : act.parCombat ? '1×' : act.consommable ? `×${Jeu.stock(act.consommable)}` : act.ressource ? `×${(a.ressources || {})[act.ressource] || 0}` : '';
      return `<button class="btn-action ${act.commune ? 'commune' : ''} ${this.selection === id ? 'sel' : ''} ${d.ok ? '' : 'indispo'}" data-action="${id}">
        ${cout ? `<span class="cout-coin">${cout}</span>` : ''}
        <span class="ic">${act.icone}</span>
        <span class="nm">${act.nom}</span>
        <span class="pips-ligne">${this.pipsAction(act, true)}</span>
      </button>`;
    }).join('');

    let aide = `<b>${a.icone} ${a.nom}</b> · ligne ${cb.nomLigne(a.ligne)}${a.crise ? ` · <span class="mauvais">${CRISES[a.crise].icone} ${CRISES[a.crise].nom}</span>` : a.peur >= PEUR.seuilAnxieux ? ' · <span class="peur-txt">😟 anxieux</span>' : ''} ${Object.keys(a.emplacements).length ? this.emplacementsHtml(a, true) : ''}<br><span class="discret">Choisissez une action.</span>`;
    if (this.raison) { aide = `<span class="mauvais">⛔ ${this.raison.nom} : ${this.raison.texte}</span><br><span class="discret">${this.raison.desc}</span>`; this.raison = null; }
    if (this.selection) {
      const act = ACTIONS[this.selection];
      const zone = act.cible === 'soi' || act.zone || (act.triangle && this.cibleTri);
      const indice = act.triangle ? '👆 Touchez le centre du triangle' : '👆 Touchez une cible';
      aide = `<div class="aide-sel"><div><b>${act.icone} ${act.nom}</b> <span class="discret">${act.desc}</span></div>
        ${zone ? `<button class="btn principal petit" data-clic="confirmer">Lancer ▶</button>` : `<span class="indice">${indice}</span>`}</div>`;
    }
    return `<div class="aide">${aide}</div><div class="actions">${boutons}</div>`;
  },

  choisirAction(id) {
    const cb = Jeu.combat;
    if (!cb.attenteJoueur || Date.now() < this.finAnim) return;
    if ((id === 'sac' || id === 'sac_retour') && (id === 'sac_retour' || cb.disponibilite(cb.actif, ACTIONS.sac).ok)) {
      this.modeSac = id === 'sac';
      this.selection = null;
      return this.majCombat();
    }
    const act = ACTIONS[id];
    const d = cb.disponibilite(cb.actif, act);
    if (!d.ok) { this.selection = null; this.raison = { nom: act.nom, texte: d.raison, desc: act.desc }; return this.majCombat(); }
    this.selection = this.selection === id ? null : id;
    this.cibleTri = null;
    this.majCombat();
  },

  cliquerCombattant(id) {
    const cb = Jeu.combat;
    if (this.selection && cb.attenteJoueur) {
      const act = ACTIONS[this.selection];
      const cibles = cb.ciblesValides(cb.actif, act);
      const c = cibles.find(x => x.id === id);
      // Triangle : 1er toucher = aperçu de la zone, 2e toucher (ou « Lancer ») = lancement
      if (c && act.triangle && this.cibleTri !== c.id) { this.cibleTri = c.id; return this.majCombat(); }
      if (c && act.cible !== 'soi' && !act.zone) {
        this.selection = null;
        this.cibleTri = null;
        this.modeSac = false;
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
    const tri = act.triangle && this.cibleTri ? cb.ciblesValides(cb.actif, act).find(x => x.id === this.cibleTri) : null;
    this.selection = null;
    this.cibleTri = null;
    this.modeSac = false;
    if (act.triangle && !tri) return;
    cb.jouer(cb.actif, act, tri);
  },

  journal() {
    const cb = Jeu.combat;
    if (!cb) return;
    this.modal(`<h2>📜 Journal du combat</h2><div class="journal">${cb.journal.map(l => `<div class="l ${l.classe}">${l.html}</div>`).join('')}</div>`);
    const j = document.querySelector('.modal-boite');
    j.scrollTop = j.scrollHeight;
  },

  // ------------------------------------------------------ récompense
  ecranRecompense() {
    const libelles = { objet: 'Objet magique', action: 'Nouvelle action', amelioration: 'Amélioration', consommable: 'Consommable' };
    return `<div class="ecran-centre">
      <h2>${Jeu.titreOffres}</h2>
      ${Jeu.sousTitreOffres ? `<div class="sous-titre-offres">${Jeu.sousTitreOffres}</div>` : '<p>Choisissez une récompense.</p>'}
      <div class="offres">${Jeu.offres.map((o, i) => {
        const pj = Jeu.equipe.find(p => p.id === o.pj);
        return `<button class="offre ${o.categorie} ${o.rarete ? 'r-' + o.rarete : ''}" data-offre="${i}">
          <span class="cat">${libelles[o.categorie]} ${etiquetteRarete(o.rarete)}</span>
          <span class="gros">${o.icone}</span>
          <b>${o.titre}</b>
          ${pj ? `<span class="pour">pour ${pj.icone} ${pj.nom}</span>` : '<span class="pour">🎒 pour le sac</span>'}
          <span class="desc">${o.desc}</span>
          ${o.categorie === 'action' ? `<span class="pips-demo">${this.pipsAction(ACTIONS[o.cle])}</span>` : ''}
        </button>`;
      }).join('')}</div>
      <button class="btn discret" data-clic="passer">Ne rien prendre</button>
      ${this.resumeEquipe()}
    </div>`;
  },

  choisirActionAOublier(index, pj, offre, source = 'recompense') {
    this.modal(`<h2>${pj.icone} ${pj.nom} connaît déjà ${MAX_ACTIONS} actions</h2>
      <p>Pour apprendre <b>${offre.titre}</b>, choisissez l'action à oublier :</p>
      <div class="liste-oubli">${pj.actions.map(id => `<button class="btn bloc" data-oublier="${id}" data-offre-index="${index}" data-source="${source}">${this.ligneAction(ACTIONS[id])}</button>`).join('')}</div>
      <button class="btn" data-clic="fermer">Annuler</button>`);
  },

  // -------------------------------------------------------- marchand
  ecranMarchand() {
    const libelles = { objet: 'Objet magique', action: 'Nouvelle action', amelioration: 'Amélioration', consommable: 'Consommable', soin: 'Service', encens: 'Service' };
    return `<div class="ecran-centre">
      <h2>🛒 Le marchand</h2>
      <p class="recit">Un colporteur borgne a étalé ses marchandises sur une couverture. « Tout se paie, l'ami. »</p>
      <div class="bourse">💰 <b>${Jeu.or}</b> pièces d'or</div>
      <div class="etal">${Jeu.marchand.stock.map((a, i) => {
        const pj = a.pj ? Jeu.equipe.find(p => p.id === a.pj) : null;
        const trop = Jeu.or < a.prix;
        return `<div class="article ${a.vendu ? 'vendu' : ''} ${a.rarete ? 'r-' + a.rarete : ''}">
          <span class="gros">${a.icone}</span>
          <span class="art-corps"><span class="cat">${libelles[a.categorie]} ${etiquetteRarete(a.rarete)}${a.stock ? ` · ${a.stock} en stock` : ''}</span>
            <b>${a.titre}</b>${pj ? ` <span class="pour">pour ${pj.icone} ${pj.nom}</span>` : ''}
            <span class="desc">${a.desc}</span></span>
          <button class="btn ${trop || a.vendu ? '' : 'principal'} petit prix" data-achat="${i}" ${trop || a.vendu ? 'disabled' : ''}>${a.vendu ? 'Vendu' : `${a.prix} 💰`}</button>
        </div>`;
      }).join('')}</div>
      <button class="btn" data-clic="carte">Reprendre la route</button>
      ${this.resumeEquipe()}
    </div>`;
  },

  // ----------------------------------------------------------- repos
  ecranRepos() {
    const r = Jeu.repos;
    let contenu;
    if (!r.mode) {
      contenu = `<p>Un feu de camp crépite dans une alcôve sûre.</p>
        <div class="pile-boutons">
          <button class="btn principal" data-clic="repos-court">Repos court<br><span class="petit">Les héros à terre se relèvent (1 PV), −15 Peur, puis dépensez des dés de vie (pas de sorts)</span></button>
          <button class="btn" data-clic="repos-long" ${Jeu.reposLongUtilise ? 'disabled' : ''}>Repos long${Jeu.reposLongUtilise ? ' (déjà utilisé)' : ''}<br><span class="petit">+50 % des PV max, tous les emplacements de sorts, la moitié des dés de vie, rage, −40 Peur. Un seul par étage.</span></button>
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
    const e = Jeu.evenement, d = e.def, choix = Jeu.choixEvenement();
    const histo = e.historique.length ? `<div class="lignes">${e.historique.map(l => `<div>${l}</div>`).join('')}</div>` : '';
    const texte = c => typeof c.texte === 'function' ? c.texte(Jeu) : c.texte;
    let bas;
    if (choix) {
      bas = `<div class="pile-boutons">${choix.map((c, i) => {
        const ok = !c.condition || c.condition(Jeu);
        return `<button class="btn ${c.risque ? 'risque' : ''}" data-choix="${i}" ${ok ? '' : 'disabled'}>${texte(c)}</button>`;
      }).join('')}</div>`;
    } else {
      const r = e.resultat;
      bas = `<button class="btn principal" data-clic="fin-evenement">${r && r.combat ? '⚔️ Combattre !' : 'Continuer'}</button>`;
    }
    return `<div class="ecran-centre"><h2>${d.icone || '❓'} ${d.titre}</h2><p class="recit">${d.texte}</p>${histo}${bas}${this.resumeEquipe()}</div>`;
  },

  // ------------------------------------------------------------- fin
  ecranFin() {
    const v = Jeu.finale === 'victoire';
    return `<div class="ecran-centre fin ${v ? 'victoire' : 'defaite'}">
      <div class="logo">${v ? '👑' : '🪦'}</div>
      <h1>${v ? 'Victoire !' : 'L\'expédition a échoué'}</h1>
      <p>${v ? Jeu.campagneCourante().fin : 'Les ténèbres ont englouti votre équipe.'}</p>
      ${v && Jeu.debloquee ? `<div class="deblocage">🔓 Nouvelle campagne débloquée : <b>${Jeu.debloquee.icone} ${Jeu.debloquee.nom}</b></div>` : ''}
      <p>${Jeu.campagneCourante().icone} ${Jeu.campagneCourante().nom} — étage atteint : ${Jeu.etage + 1}/${Jeu.etages().length} (${Jeu.etageCourant().nom}) · Salles explorées : ${Jeu.stats.salles} · Combats gagnés : ${Jeu.stats.combats}</p>
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
    // Le titre apparaît en fondu une fois sa police chargée (1,2 s au plus)
    const polices = () => document.body.classList.add('polices');
    if (document.fonts && document.fonts.ready) { document.fonts.ready.then(polices); setTimeout(polices, 1200); } else polices();
    document.addEventListener('pointerdown', () => Son.debloquer(), { passive: true });
    document.addEventListener('click', e => {
      Son.debloquer();
      const t = e.target.closest('[data-clic],[data-action],[data-id],[data-noeud],[data-offre],[data-oublier],[data-de-vie],[data-choix],[data-info],[data-campagne],[data-achat],[data-classe],[data-info-classe]');
      if (!t || t.disabled) return;
      const d = t.dataset;
      if (d.clic) return this.clic(d.clic, t);
      if (d.action) return this.choisirAction(d.action);
      if (d.id && Jeu.ecran === 'combat') return this.cliquerCombattant(d.id);
      if (d.noeud !== undefined) return Jeu.choisirNoeud(parseInt(d.noeud, 10));
      if (d.offre !== undefined) { Son.jouer('objet'); return Jeu.choisirRecompense(parseInt(d.offre, 10)); }
      if (d.oublier) {
        this.fermerModal();
        return d.source === 'marchand' ? Jeu.acheter(parseInt(d.offreIndex, 10), d.oublier) : Jeu.choisirRecompense(parseInt(d.offreIndex, 10), d.oublier);
      }
      if (d.achat !== undefined) return Jeu.acheter(parseInt(d.achat, 10));
      if (d.deVie) return Jeu.depenserDeVie(d.deVie);
      if (d.choix !== undefined) return Jeu.choisirEvenement(parseInt(d.choix, 10));
      if (d.info) return this.infoCombattant(d.info);
      if (d.campagne) return Jeu.choisirCampagne(d.campagne);
      if (d.classe) return Jeu.basculerClasse(d.classe);
      if (d.infoClasse) return this.ficheClasse(d.infoClasse);
    });
    Modeles3D.init();
    EcranChargement.suivre();
    document.addEventListener('keydown', e => { if (e.key === 'Escape') { this.fermerModal(); if (this.selection) { this.selection = null; this.majCombat(); } } });
    this.rendu();
  },

  clic(nom, t) {
    switch (nom) {
      case 'nouvelle':
        if (Jeu.ecran === 'titre' && Jeu.sauvegardeExiste() && !confirm('Commencer une nouvelle expédition ? La partie en cours sera perdue.')) return;
        Jeu.ecran = 'campagnes';
        return this.rendu();
      case 'continuer': return Jeu.charger();
      case 'regles': return this.regles();
      case 'equipe': return this.fenetreEquipe();
      case 'ligne': Jeu.changerLignePJ(t.dataset.pj); this.fenetreEquipe(); return this.rendu();
      case 'donner': Jeu.donnerObjet(t.dataset.de, t.dataset.a, t.dataset.objet); Son.jouer('objet'); this.rendu(); return this.fenetreEquipe();
      case 'abandonner':
        if (confirm('Abandonner l\'expédition ?')) { Jeu.effacerSauvegarde(); Jeu.ecran = 'titre'; this.rendu(); }
        return;
      case 'fermer': return this.fermerModal();
      case 'confirmer': return this.confirmer();
      case 'journal': return this.journal();
      case 'sons': Son.basculer('sons'); return this.majBoutonsAudio();
      case 'musique': Son.basculer('musique'); return this.majBoutonsAudio();
      case 'vitesse':
        Reglages.vitesse = Reglages.vitesse > 1 ? 1 : 2;
        Reglages.sauver();
        if (Jeu.combat) Jeu.combat.vitesse = Reglages.vitesse;
        return this.majBoutonsAudio();
      case 'annuler': this.selection = null; return this.majCombat();
      case 'passer': return Jeu.allerCarte();
      case 'repos-court': Son.jouer('feu'); return Jeu.reposCourt();
      case 'repos-long': Son.jouer('feu'); return Jeu.reposLong();
      case 'carte': return Jeu.allerCarte();
      case 'fin-evenement': return Jeu.finEvenement();
      case 'titre': Jeu.ecran = 'titre'; return this.rendu();
      case 'aleatoire': return Jeu.equipeAleatoire();
      case 'partir': return Jeu.partir();
      case 'campagnes': Jeu.ecran = 'campagnes'; return this.rendu();
    }
  }
};

document.addEventListener('DOMContentLoaded', () => Ui.initialiser());
