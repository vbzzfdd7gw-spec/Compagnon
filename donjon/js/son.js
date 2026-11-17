// =====================================================================
// Sons et musique synthétisés (Web Audio) : aucun fichier audio.
//   Son.jouer('epee')         → bruitage
//   Son.ambiance('combat')    → musique : 'carte', 'combat', 'boss', null
//   Reglages.sons / .musique  → activés ou coupés (mémorisés)
// Sur iPhone, l'audio ne démarre qu'après un premier toucher : Son.debloquer()
// est appelé à chaque clic.
// =====================================================================

const Reglages = {
  sons: true, musique: true, vitesse: 1,
  charger() {
    try { Object.assign(this, JSON.parse(localStorage.getItem('donjon-reglages') || '{}')); } catch (e) { /* rien */ }
  },
  sauver() {
    try { localStorage.setItem('donjon-reglages', JSON.stringify({ sons: this.sons, musique: this.musique, vitesse: this.vitesse })); } catch (e) { /* rien */ }
  }
};
Reglages.charger();

const Son = {
  ctx: null, maitre: null, busSons: null, busMusique: null, reverb: null,
  humeur: null, minuterie: null, prochainTemps: 0, pas: 0,

  debloquer() {
    try {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        const c = this.ctx;
        this.maitre = c.createGain(); this.maitre.gain.value = 0.9; this.maitre.connect(c.destination);
        // Réverbération de crypte (réponse impulsionnelle générée)
        this.reverb = c.createConvolver();
        const n = c.sampleRate * 2.6, ir = c.createBuffer(2, n, c.sampleRate);
        for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2.6); }
        this.reverb.buffer = ir;
        const retour = c.createGain(); retour.gain.value = 0.35;
        this.reverb.connect(retour); retour.connect(this.maitre);
        this.busSons = c.createGain(); this.busSons.connect(this.maitre); this.busSons.connect(this.reverb);
        this.busMusique = c.createGain(); this.busMusique.gain.value = 0.32; this.busMusique.connect(this.maitre); this.busMusique.connect(this.reverb);
        this.bruit = c.createBuffer(1, c.sampleRate, c.sampleRate);
        const d = this.bruit.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        this.majVolumes();
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
      if (this.humeurVoulue !== undefined && this.humeur !== this.humeurVoulue) this.ambiance(this.humeurVoulue);
    } catch (e) { /* audio indisponible */ }
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
    this.minuterie = setInterval(() => this.programmer(), 100);
  },

  programmer() {
    const c = this.ctx;
    if (!c || !this.humeur) return;
    const boss = this.humeur === 'boss', combat = this.humeur !== 'carte';
    const tempo = boss ? 104 : combat ? 92 : 64;
    const croche = 60 / tempo / 2;
    const ACCORDS = boss
      ? [[38, 45, 50, 53], [36, 43, 48, 51], [34, 41, 46, 49], [37, 44, 49, 52]]
      : [[38, 45, 50, 53], [34, 41, 46, 50], [36, 43, 48, 52], [33, 40, 45, 49]];
    const GAMME = [62, 64, 65, 67, 69, 70, 72, 74, 77];
    const hz = m => 440 * Math.pow(2, (m - 69) / 12);
    const dest = this.busMusique;
    while (this.prochainTemps < c.currentTime + 0.3) {
      const t = this.prochainTemps, p = this.pas;
      const accord = ACCORDS[Math.floor(p / 16) % ACCORDS.length];
      if (p % 16 === 0) {
        // Nappe : accord tenu
        accord.forEach((m, i) => this.osc(i === 0 ? 'sawtooth' : 'triangle', hz(m + (i === 0 ? 0 : 12)), hz(m + (i === 0 ? 0 : 12)), t, croche * 16, i === 0 ? 0.11 : 0.05, dest, { type: 'lowpass', f: boss ? 500 : 700 }));
      }
      // Mélodie de cloches, rare
      if (p % (combat ? 4 : 6) === 2 && Math.random() < (combat ? 0.45 : 0.5)) {
        const n = GAMME[Math.floor(Math.random() * GAMME.length)] + (boss ? -12 : 0);
        this.osc('sine', hz(n), hz(n), t, croche * 5, 0.07, dest);
        this.osc('sine', hz(n) * 2.01, hz(n) * 2.01, t, croche * 2, 0.02, dest);
      }
      if (combat) {
        // Tambour grave et caisse feutrée
        if (p % 4 === 0) this.osc('sine', boss ? 70 : 85, 40, t, 0.35, boss ? 0.55 : 0.4, dest);
        if (p % 8 === 6 || (boss && p % 16 === 14)) this.souffle(t, 0.12, 0.12, 'bandpass', 1200, 800, 1, dest);
        if (p % 2 === 1 && Math.random() < 0.5) this.souffle(t, 0.04, 0.03, 'highpass', 7000, 6000, 1, dest);
      }
      this.prochainTemps += croche;
      this.pas++;
    }
  }
};
