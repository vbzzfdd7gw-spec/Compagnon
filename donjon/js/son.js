// =====================================================================
// Sons et musique synthétisés (Web Audio) : aucun fichier audio.
//   Son.jouer('epee')         → bruitage
//   Son.ambiance('combat')    → musique : 'carte', 'combat', 'boss', null
//   Reglages.sons / .musique  → activés ou coupés (mémorisés)
// Sur iPhone, l'audio ne démarre qu'après un premier toucher : Son.debloquer()
// est appelé à chaque clic.
// =====================================================================

const Reglages = {
  sons: true, musique: true, vitesse: 1, equipe: null, sousClasses: {},
  charger() {
    try { Object.assign(this, JSON.parse(localStorage.getItem('donjon-reglages') || '{}')); } catch (e) { /* rien */ }
  },
  sauver() {
    try { localStorage.setItem('donjon-reglages', JSON.stringify({ sons: this.sons, musique: this.musique, vitesse: this.vitesse, equipe: this.equipe, sousClasses: this.sousClasses })); } catch (e) { /* rien */ }
  }
};
Reglages.charger();

// Piste muette (0,25 s) jouée en boucle pour débloquer l'audio d'iOS
const SILENCE_WAV = 'data:audio/wav;base64,UklGRvQHAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YdAHAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgA==';

const Son = {
  ctx: null, maitre: null, busSons: null, busMusique: null, reverb: null,
  humeur: null, minuterie: null, prochainTemps: 0, pas: 0,

  debloquer() {
    // iOS 17+ : jouer même quand l'iPhone est en mode silencieux
    try { if (navigator.audioSession && navigator.audioSession.type !== 'playback') navigator.audioSession.type = 'playback'; } catch (e) { /* rien */ }
    // Toutes versions d'iOS : une piste muette en boucle fait passer la page en « lecture »,
    // ce qui rend l'audio audible même avec le bouton silencieux
    try {
      if (!this.ancre) {
        this.ancre = new Audio(SILENCE_WAV);
        this.ancre.loop = true;
        this.ancre.setAttribute('playsinline', '');
        this.ancre.volume = 0.01;
      }
      if (this.ancre.paused) { const p = this.ancre.play(); if (p && p.catch) p.catch(() => {}); }
    } catch (e) { /* rien */ }
    try {
      // Contexte fermé par le système : on en recrée un
      if (this.ctx && this.ctx.state === 'closed') { clearInterval(this.minuterie); this.ctx = null; this.humeur = null; }
      if (!this.ctx) this.creerContexte();
      if (!this.ctx) return;
      // iOS met l'audio en « interrupted » quand on quitte l'app ou verrouille l'écran : on relance dans tous les cas
      if (this.ctx.state !== 'running') {
        const p = this.ctx.resume();
        if (p && p.catch) p.catch(() => {});
        const src = this.ctx.createBufferSource();   // son vide joué pendant le geste (débloque iOS)
        src.buffer = this.ctx.createBuffer(1, 1, 22050);
        src.connect(this.ctx.destination);
        src.start(0);
      }
      if (this.humeurVoulue !== undefined && this.humeur !== this.humeurVoulue) this.ambiance(this.humeurVoulue);
    } catch (e) { /* audio indisponible */ }
  },

  // Graphe audio : construit entièrement avant d'être utilisé (une erreur ne laisse pas un contexte à moitié prêt)
  creerContexte() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const c = new AC();
    const maitre = c.createGain(); maitre.gain.value = 0.9; maitre.connect(c.destination);
    const busSons = c.createGain(); busSons.connect(maitre);
    const busMusique = c.createGain(); busMusique.gain.value = 0.32; busMusique.connect(maitre);
    let reverb = null;
    try {   // réverbération de crypte (facultative)
      reverb = c.createConvolver();
      const n = Math.floor(c.sampleRate * 2.6), ir = c.createBuffer(2, n, c.sampleRate);
      for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2.6); }
      reverb.buffer = ir;
      const retour = c.createGain(); retour.gain.value = 0.35;
      reverb.connect(retour); retour.connect(maitre);
      busSons.connect(reverb); busMusique.connect(reverb);
    } catch (e) { reverb = null; }
    const bruit = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const d = bruit.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    Object.assign(this, { ctx: c, maitre, busSons, busMusique, reverb, bruit });
    this.majVolumes();
  },

  majVolumes() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.busSons.gain.setTargetAtTime(Reglages.sons ? 1 : 0, t, 0.05);
    this.busMusique.gain.setTargetAtTime(Reglages.musique ? 0.32 : 0, t, 0.3);
  },

  basculer(quoi) {
    Reglages[quoi] = !Reglages[quoi];
    Reglages.sauver();
    this.debloquer();
    this.majVolumes();
    if (quoi === 'sons' && Reglages.sons) setTimeout(() => this.jouer('objet'), 60);   // confirmation audible
  },

  // ------------------------------------------------------- briques
  osc(type, f0, f1, debut, duree, vol, dest, filtre) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, debut);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), debut + duree);
    g.gain.setValueAtTime(0.0001, debut);
    g.gain.exponentialRampToValueAtTime(vol, debut + Math.min(0.02, duree / 4));
    g.gain.exponentialRampToValueAtTime(0.0001, debut + duree);
    let sortie = g;
    if (filtre) { const f = c.createBiquadFilter(); f.type = filtre.type; f.frequency.value = filtre.f; f.Q.value = filtre.q || 1; g.connect(f); sortie = f; }
    o.connect(g); sortie.connect(dest || this.busSons);
    o.start(debut); o.stop(debut + duree + 0.05);
  },
  souffle(debut, duree, vol, type, f0, f1, q = 1, dest) {
    const c = this.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this.bruit; s.loop = true;
    f.type = type; f.Q.value = q;
    f.frequency.setValueAtTime(f0, debut);
    f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), debut + duree);
    g.gain.setValueAtTime(0.0001, debut);
    g.gain.exponentialRampToValueAtTime(vol, debut + Math.min(0.015, duree / 5));
    g.gain.exponentialRampToValueAtTime(0.0001, debut + duree);
    s.connect(f); f.connect(g); g.connect(dest || this.busSons);
    s.start(debut, Math.random() * 0.5); s.stop(debut + duree + 0.05);
  },

  // ------------------------------------------------------- bruitages
  jouer(nom, option) {
    if (!this.ctx || !Reglages.sons) return;
    const t = this.ctx.currentTime + 0.01, r = Math.random;
    switch (nom) {
      case 'clic': this.osc('triangle', 900, 700, t, 0.05, 0.08); break;
      case 'epee':   // sifflement de lame
        this.souffle(t, 0.22, 0.35, 'bandpass', 900, 3500, 2);
        break;
      case 'arc':
        this.osc('triangle', 220, 140, t, 0.12, 0.25);
        this.souffle(t + 0.03, 0.3, 0.18, 'bandpass', 2500, 900, 3);
        break;
      case 'coup':   // impact
        this.souffle(t, 0.16, 0.6, 'lowpass', 1800, 300, 1);
        this.osc('sine', 140, 55, t, 0.18, 0.5);
        break;
      case 'metal':  // coup sur armure / critique
        this.souffle(t, 0.12, 0.5, 'highpass', 3000, 2000, 1);
        [1, 2.76, 5.4].forEach((k, i) => this.osc('sine', 520 * k, 520 * k * 0.98, t, 0.9 - i * 0.2, 0.18 / (i + 1)));
        this.osc('sine', 110, 50, t, 0.3, 0.6);
        break;
      case 'rate': this.souffle(t, 0.25, 0.2, 'bandpass', 600, 2400, 4); break;
      case 'de':     // dés qui roulent
        for (let i = 0; i < 6; i++) this.osc('square', 1800 + r() * 900, 1500, t + i * 0.045 + r() * 0.02, 0.03, 0.05, null, { type: 'highpass', f: 1200 });
        break;
      case 'sort': {
        const f = { feu: 180, froid: 900, force: 520, radiant: 660, 'nécrotique': 140, psychique: 330, tonnerre: 90 }[option] || 440;
        if (option === 'feu') { this.souffle(t, 0.6, 0.45, 'lowpass', 400, 2400, 1); this.osc('sawtooth', f, f * 2, t, 0.45, 0.08, null, { type: 'lowpass', f: 1200 }); }
        else if (option === 'froid') { [0, 0.06, 0.12, 0.18].forEach(d => this.osc('sine', f * (1 + r()), f * 2.5, t + d, 0.35, 0.12)); this.souffle(t, 0.4, 0.15, 'highpass', 4000, 6000, 1); }
        else if (option === 'tonnerre') { this.souffle(t, 0.9, 0.7, 'lowpass', 600, 60, 1); this.osc('sine', 70, 35, t, 0.8, 0.6); }
        else { this.osc('sine', f, f * 2, t, 0.4, 0.22); this.osc('triangle', f * 1.5, f * 3, t + 0.05, 0.35, 0.12); this.souffle(t, 0.4, 0.12, 'bandpass', f * 2, f * 6, 6); }
        break;
      }
      case 'soin': [523, 659, 784, 1047].forEach((f, i) => this.osc('sine', f, f, t + i * 0.08, 0.6, 0.14)); break;
      case 'benediction': [392, 494, 587, 784].forEach((f, i) => { this.osc('triangle', f, f, t + i * 0.05, 0.9, 0.08); }); break;
      case 'mort':
        this.osc('sawtooth', 160, 40, t, 0.7, 0.18, null, { type: 'lowpass', f: 500 });
        this.souffle(t + 0.1, 0.4, 0.4, 'lowpass', 900, 120, 1);
        break;
      case 'chute':  // héros à terre
        this.osc('sine', 300, 80, t, 0.6, 0.3);
        [440, 415, 370].forEach((f, i) => this.osc('triangle', f, f, t + i * 0.18, 0.4, 0.1));
        break;
      case 'peur': [0, 1].forEach(i => this.osc('sawtooth', 110 + i * 7, 104 + i * 7, t, 1.2, 0.06, null, { type: 'lowpass', f: 700 })); break;
      case 'panique': this.osc('sine', 880, 1760, t, 0.6, 0.1); this.osc('sine', 932, 1864, t, 0.6, 0.1); break;
      case 'potion': this.osc('sine', 400, 900, t, 0.25, 0.15); this.osc('sine', 600, 1200, t + 0.12, 0.25, 0.12); break;
      case 'victoire': [523, 659, 784, 1047, 784, 1047].forEach((f, i) => this.osc('triangle', f, f, t + i * 0.12, i === 5 ? 1.2 : 0.3, 0.16)); break;
      case 'defaite': [392, 370, 349, 262].forEach((f, i) => this.osc('triangle', f, f, t + i * 0.35, 0.8, 0.14)); break;
      case 'objet': [784, 988, 1175, 1568].forEach((f, i) => this.osc('sine', f, f, t + i * 0.06, 0.5, 0.1)); break;
      case 'pas': [0, 0.22].forEach(d => this.souffle(t + d, 0.1, 0.25, 'lowpass', 500, 200, 1)); break;
      case 'feu': this.souffle(t, 1.2, 0.2, 'lowpass', 800, 400, 1); break;
      case 'piece': [1568, 2093].forEach((f, i) => { this.osc('square', f, f, t + i * 0.07, 0.25, 0.05, null, { type: 'highpass', f: 900 }); this.osc('sine', f * 2, f * 2, t + i * 0.07, 0.4, 0.04); }); break;
    }
  },

  // ------------------------------------------------------- musique
  // Accords en ré mineur ; combat : pulsation de tambour ; boss : plus grave et plus rapide
  ambiance(humeur) {
    this.humeurVoulue = humeur;
    if (!this.ctx) return;
    if (this.humeur === humeur) return;
    this.humeur = humeur;
    clearInterval(this.minuterie);
    if (!humeur) return;
    this.pas = 0;
    this.prochainTemps = this.ctx.currentTime + 0.1;
    this.minuterie = setInterval(() => { try { this.programmer(); } catch (e) { /* une note ratée ne coupe pas la musique */ } }, 100);
  },

  // Thème musical (campagne / étage) : change la gamme, le tempo et les timbres sans couper la musique
  choisirTheme(nom) { this.theme = STYLES_MUSIQUE[nom] ? nom : 'crypte'; },

  programmer() {
    const c = this.ctx;
    if (!c || !this.humeur) return;
    const st = STYLES_MUSIQUE[this.theme] || STYLES_MUSIQUE.crypte;
    const boss = this.humeur === 'boss', combat = this.humeur !== 'carte';
    const tempo = (boss ? 104 : combat ? 92 : 64) * st.tempo;
    const croche = 60 / tempo / 2;
    const racine = st.racine + (boss ? -2 : 0);
    // Gamme sur deux octaves, accords construits sur les degrés de la progression
    const note = d => racine + st.mode[((d % 7) + 7) % 7] + 12 * Math.floor(d / 7);
    const GAMME = [7, 8, 9, 10, 11, 12, 13, 14, 15].map(note);
    const accordDe = d => [note(d) - 12, note(d), note(d + 2), note(d + 4)];
    const hz = m => 440 * Math.pow(2, (m - 69) / 12);
    const dest = this.busMusique;
    while (this.prochainTemps < c.currentTime + 0.3) {
      const t = this.prochainTemps, p = this.pas;
      const accord = accordDe(st.degres[Math.floor(p / 16) % st.degres.length]);
      if (p % 16 === 0) {
        // Nappe : accord tenu
        accord.forEach((m, i) => this.osc(i === 0 ? st.basse : st.nappe, hz(m + (i === 0 ? 0 : 12)), hz(m + (i === 0 ? 0 : 12)), t, croche * 16, i === 0 ? 0.1 : 0.045, dest, { type: 'lowpass', f: (boss ? 0.75 : 1) * st.filtre }));
      }
      // Arpège (château, toiles…) ou mélodie de cloches
      if (st.arpege && p % 2 === 0) {
        const m = accord[1 + (p / 2) % 3] + 12;
        this.osc(st.melodie, hz(m), hz(m), t, croche * 1.6, 0.045, dest, { type: 'lowpass', f: 2600 });
      } else if (p % (combat ? 4 : 6) === 2 && Math.random() < (combat ? 0.45 : 0.5)) {
        const n = GAMME[Math.floor(Math.random() * GAMME.length)] + (boss ? -12 : 0);
        this.osc(st.melodie, hz(n), hz(n), t, croche * 5, 0.065, dest, st.melodie === 'sine' ? null : { type: 'lowpass', f: 2200 });
        this.osc('sine', hz(n) * 2.01, hz(n) * 2.01, t, croche * 2, 0.02, dest);
      }
      if (combat) this.percussions(st.percu, p, t, boss, dest);
      if (st.ambiance) st.ambiance(this, p, t, croche, dest);
      this.prochainTemps += croche;
      this.pas++;
    }
  },

  // Motifs de percussion selon le thème
  percussions(type, p, t, boss, dest) {
    if (type === 'darbouka') {
      if ([0, 3, 6, 10, 12].includes(p % 16)) this.osc('sine', p % 16 === 0 ? 90 : 180, 70, t, 0.18, 0.4, dest);
      if ([2, 7, 9, 14].includes(p % 16)) this.souffle(t, 0.06, 0.14, 'bandpass', 2200, 1600, 3, dest);
    } else if (type === 'lourd') {
      if (p % 2 === 0) this.osc('sine', boss ? 55 : 65, 35, t, 0.4, p % 4 === 0 ? 0.65 : 0.35, dest);
      if (p % 8 === 4) this.souffle(t, 0.25, 0.2, 'lowpass', 900, 200, 1, dest);
    } else if (type === 'cloches') {
      if (p % 4 === 0) this.osc('sine', boss ? 70 : 85, 40, t, 0.3, 0.35, dest);
      if (p % 8 === 6) [1, 2.76].forEach(k => this.osc('sine', 1400 * k, 1400 * k, t, 0.6, 0.025, dest));
    } else if (type === 'valse') {
      if (p % 6 === 0) this.osc('sine', 75, 40, t, 0.35, 0.45, dest);
      if (p % 6 === 2 || p % 6 === 4) this.souffle(t, 0.07, 0.07, 'bandpass', 1800, 1400, 2, dest);
    } else {
      if (p % 4 === 0) this.osc('sine', boss ? 70 : 85, 40, t, 0.35, boss ? 0.55 : 0.4, dest);
      if (p % 8 === 6 || (boss && p % 16 === 14)) this.souffle(t, 0.12, 0.12, 'bandpass', 1200, 800, 1, dest);
      if (p % 2 === 1 && Math.random() < 0.5) this.souffle(t, 0.04, 0.03, 'highpass', 7000, 6000, 1, dest);
    }
  },

  // ------------------------------------------------------- cris des monstres
  // quoi : 'attaque' ou 'mort'
  monstre(modele, quoi = 'attaque') {
    if (!this.ctx || !Reglages.sons) return;
    const famille = Object.keys(FAMILLES_SONORES).find(f => FAMILLES_SONORES[f].includes(modele)) || 'humanoide';
    const t = this.ctx.currentTime + 0.02, r = Math.random, mort = quoi === 'mort', k = mort ? 0.7 : 1;
    switch (famille) {
      case 'grognement':
        this.osc('sawtooth', 120 * k, 70 * k, t, mort ? 0.9 : 0.45, 0.16, null, { type: 'lowpass', f: 600 });
        this.souffle(t, mort ? 0.8 : 0.4, 0.3, 'lowpass', 700, 200, 2);
        break;
      case 'rugissement':
        this.souffle(t, mort ? 1.6 : 1.0, 0.6, 'lowpass', 1400, 120, 1);
        this.osc('sawtooth', 160 * k, 60, t, mort ? 1.5 : 0.9, 0.18, null, { type: 'lowpass', f: 900 });
        this.osc('sawtooth', 168 * k, 62, t, mort ? 1.5 : 0.9, 0.12, null, { type: 'lowpass', f: 900 });
        break;
      case 'sifflement':
        this.souffle(t, mort ? 1.0 : 0.55, 0.32, 'highpass', 5000, 3000, 1);
        break;
      case 'aigu':
        [0, 0.08, 0.16].forEach(d => this.osc('sawtooth', 1800 * k + r() * 300, 1300 * k, t + d, 0.12, 0.05, null, { type: 'bandpass', f: 2200, q: 3 }));
        break;
      case 'croassement':
        [0, 0.16].forEach(d => this.osc('square', 220, 120, t + d, 0.12, 0.08, null, { type: 'lowpass', f: 900 }));
        break;
      case 'gargouillis':
        for (let i = 0; i < (mort ? 8 : 5); i++) this.osc('sine', 120 + r() * 160, 260 + r() * 200, t + i * 0.07, 0.08, 0.14);
        break;
      case 'gemissement':
        this.osc('triangle', 260 * k, 180 * k, t, mort ? 1.4 : 0.8, 0.1);
        this.osc('triangle', 266 * k, 176 * k, t, mort ? 1.4 : 0.8, 0.08);
        break;
      case 'os':
        for (let i = 0; i < (mort ? 7 : 4); i++) this.osc('square', 900 + r() * 500, 700, t + i * 0.05, 0.03, 0.06, null, { type: 'highpass', f: 600 });
        break;
      case 'rire':
        [0, 0.13, 0.26, 0.39].forEach((d, i) => this.osc('triangle', (mort ? 300 : 440) - i * 30, (mort ? 260 : 400) - i * 30, t + d, 0.1, 0.09, null, { type: 'lowpass', f: 1600 }));
        break;
      case 'insecte':
        for (let i = 0; i < 10; i++) this.osc('square', 2600 + r() * 800, 2400, t + i * 0.025, 0.015, 0.03, null, { type: 'highpass', f: 1800 });
        break;
      case 'cristal':
        [1, 1.5, 2.25].forEach((m, i) => this.osc('sine', 1200 * m * k, 1200 * m * k, t + i * 0.05, 0.5, 0.05));
        break;
      default:
        this.souffle(t, mort ? 0.35 : 0.18, 0.25, 'bandpass', mort ? 500 : 700, mort ? 250 : 450, 3);
    }
  }
};

// Familles de cris (le reste : grognement humanoïde bref)
const FAMILLES_SONORES = {
  grognement: ['loup', 'loup_alpha', 'loup_givre', 'loup_sanguinaire', 'ogre', 'troll', 'yeti', 'gnoll', 'grukk', 'grukk_tyran', 'geant_givre', 'merrow', 'crabe_geant'],
  rugissement: ['dragonnet', 'ignaroth', 'dracoliche', 'hydre', 'baron_sahuagin'],
  sifflement: ['araignee', 'reine_araignee', 'meduse', 'homme_lezard', 'chef_lezard', 'sahuagin', 'pretresse_sahuagin'],
  aigu: ['harpie', 'chauves_souris', 'gargouille'],
  croassement: ['crapaud'],
  gargouillis: ['gelee_ocre', 'pouding_noir', 'cube_gelatineux', 'noye', 'mimique'],
  gemissement: ['spectre', 'ombre', 'zombie', 'goule', 'bleme', 'momie', 'necrophage', 'rejeton_vampire', 'pharaon'],
  os: ['squelette', 'mage_squelette', 'chevalier_squelette', 'morvagne', 'pretre_momie'],
  rire: ['cultiste', 'pretre_eclipse', 'velkor', 'guenaude', 'vampire', 'reine_hiver', 'chef_kobold'],
  insecte: ['oxydeur', 'scarabees'],
  cristal: ['esprit_glace', 'feu_follet']
};

// Styles musicaux par thème. mode : intervalles de la gamme ; degres : progression d'accords ;
// racine : note MIDI de base ; tempo : multiplicateur ; basse / nappe / melodie : timbres ;
// percu : motif de percussions ; arpege : arpèges plutôt que cloches ; ambiance : bruitages de fond
const MODES = {
  mineur: [0, 2, 3, 5, 7, 8, 10], dorien: [0, 2, 3, 5, 7, 9, 10], phrygien: [0, 1, 3, 5, 7, 8, 10], harmonique: [0, 2, 3, 5, 7, 8, 11],
  hijaz: [0, 1, 4, 5, 7, 8, 10], lydien: [0, 2, 4, 6, 7, 9, 11], mixolydien: [0, 2, 4, 5, 7, 9, 10], tons: [0, 2, 4, 6, 8, 10, 11]
};
const STYLES_MUSIQUE = {
  crypte: { mode: MODES.mineur, degres: [0, 5, 6, 3], racine: 50, tempo: 1, basse: 'sawtooth', nappe: 'triangle', melodie: 'sine', filtre: 700, percu: 'tambour' },
  grotte: { mode: MODES.dorien, degres: [0, 3, 0, 6], racine: 48, tempo: 0.9, basse: 'sawtooth', nappe: 'triangle', melodie: 'sine', filtre: 600, percu: 'tambour',
    ambiance(s, p, t) { if (Math.random() < 0.05) s.osc('sine', 1500 + Math.random() * 900, 900, t, 0.12, 0.05, s.busMusique); } },
  sanctuaire: { mode: MODES.harmonique, degres: [0, 5, 3, 4], racine: 50, tempo: 0.85, basse: 'square', nappe: 'square', melodie: 'triangle', filtre: 500, percu: 'cloches' },
  volcan: { mode: MODES.phrygien, degres: [0, 1, 0, 6], racine: 45, tempo: 1.1, basse: 'sawtooth', nappe: 'sawtooth', melodie: 'triangle', filtre: 450, percu: 'lourd',
    ambiance(s, p, t) { if (p % 32 === 0) s.souffle(t, 3, 0.08, 'lowpass', 200, 80, 1, s.busMusique); } },
  toiles: { mode: MODES.harmonique, degres: [0, 1, 0, 4], racine: 47, tempo: 0.95, basse: 'sawtooth', nappe: 'triangle', melodie: 'triangle', filtre: 600, percu: 'tambour', arpege: true },
  abime: { mode: MODES.tons, degres: [0, 2, 4, 1], racine: 46, tempo: 0.75, basse: 'sawtooth', nappe: 'sine', melodie: 'sine', filtre: 500, percu: 'lourd' },
  marais: { mode: MODES.dorien, degres: [0, 6, 3, 0], racine: 45, tempo: 0.85, basse: 'sawtooth', nappe: 'triangle', melodie: 'triangle', filtre: 550, percu: 'tambour',
    ambiance(s, p, t) { if (Math.random() < 0.025) [0, 0.15].forEach(d => s.osc('square', 210, 120, t + d, 0.1, 0.03, s.busMusique, { type: 'lowpass', f: 800 })); } },
  givre: { mode: MODES.lydien, degres: [0, 1, 5, 4], racine: 55, tempo: 0.8, basse: 'triangle', nappe: 'sine', melodie: 'sine', filtre: 1400, percu: 'cloches',
    ambiance(s, p, t) { if (p % 24 === 0) s.souffle(t, 4, 0.05, 'bandpass', 600, 1400, 2, s.busMusique); } },
  desert: { mode: MODES.hijaz, degres: [0, 1, 0, 6], racine: 50, tempo: 1.05, basse: 'sawtooth', nappe: 'triangle', melodie: 'triangle', filtre: 900, percu: 'darbouka' },
  chateau: { mode: MODES.harmonique, degres: [0, 3, 4, 0], racine: 50, tempo: 0.9, basse: 'square', nappe: 'square', melodie: 'square', filtre: 650, percu: 'valse', arpege: true },
  suintant: { mode: MODES.mineur, degres: [0, 5, 0, 4], racine: 47, tempo: 0.95, basse: 'sawtooth', nappe: 'triangle', melodie: 'sine', filtre: 600, percu: 'tambour',
    ambiance(s, p, t) { if (Math.random() < 0.06) s.osc('sine', 200 + Math.random() * 200, 500 + Math.random() * 300, t, 0.07, 0.04, s.busMusique); } },
  cote: { mode: MODES.mixolydien, degres: [0, 6, 3, 4], racine: 52, tempo: 0.9, basse: 'triangle', nappe: 'triangle', melodie: 'triangle', filtre: 1100, percu: 'tambour',
    ambiance(s, p, t) { if (p % 16 === 0) s.souffle(t, 2.4, 0.09, 'lowpass', 300, 1200, 1, s.busMusique); } }
};
