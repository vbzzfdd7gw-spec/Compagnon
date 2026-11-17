// =====================================================================
// Figurines 3D « low-poly » construites à partir de formes simples.
//
// Un seul canvas WebGL est placé derrière les cartes de la scène de combat.
// À chaque image, chaque figurine est dessinée dans la zone de sa carte
// (technique « plusieurs vues, un seul canvas »). Les animations CSS de la
// carte (élan, respiration) déplacent donc aussi la figurine.
//
// Ajouter une figurine : une fonction dans FIGURINES qui renvoie un
// THREE.Group, pieds en y = 0, tourné vers +z (la caméra), environ 1,8 de haut.
// Sans WebGL, le jeu garde les emojis.
// =====================================================================

const Modeles3D = {
  actif: false,
  renderer: null,
  scene: null,
  camera: null,
  cache: new Map(),     // clé (id du combattant + modèle) → THREE.Group
  flashs: {},           // id → { t0, couleur }
  enCours: false,

  init() {
    try {
      if (!window.THREE) return false;
      const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
      r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      r.setClearColor(0x000000, 0);
      r.autoClear = false;
      r.outputEncoding = THREE.sRGBEncoding;
      r.domElement.className = 'canvas3d';
      this.renderer = r;
      this.scene = new THREE.Scene();
      this.scene.add(new THREE.HemisphereLight(0xfff0dc, 0x3a2a20, 1.05));
      const soleil = new THREE.DirectionalLight(0xffd9a8, 1.25);
      soleil.position.set(2.5, 4, 3.5);
      this.scene.add(soleil);
      const contre = new THREE.DirectionalLight(0x9fb4ff, 0.45);
      contre.position.set(-3, 2, -2);
      this.scene.add(contre);
      this.camera = new THREE.PerspectiveCamera(26, 1, 0.1, 50);
      this.camera.position.set(0, 1.45, 4.5);
      this.camera.lookAt(0, 0.88, 0);
      this.actif = true;
      document.body.classList.add('mode3d');
      return true;
    } catch (e) {
      this.actif = false;
      return false;
    }
  },

  // Place le canvas dans la scène de combat et lance la boucle d'affichage
  attacher(sceneEl) {
    if (!this.actif || !sceneEl) return;
    sceneEl.prepend(this.renderer.domElement);
    if (!this.enCours) {
      this.enCours = true;
      requestAnimationFrame(t => this.boucle(t));
    }
  },

  flash(id, couleur) { this.flashs[id] = { t0: performance.now(), couleur }; },

  obtenir(cle, modele) {
    let g = this.cache.get(cle);
    if (!g) {
      const fab = FIGURINES[modele] || FIGURINES.inconnu;
      g = new THREE.Group();
      const corps = fab();
      g.add(corps);
      g.add(ombre3d(modele === 'ogre' || modele === 'morvagne' ? 0.6 : modele === 'loup' ? 0.55 : 0.45));
      g.userData.corps = corps;
      g.userData.mats = [];
      g.traverse(o => { if (o.material) g.userData.mats.push(o.material); });
      g.userData.phase = Math.random() * 6;
      this.scene.add(g);
      this.cache.set(cle, g);
    }
    return g;
  },

  boucle(t) {
    const canvas = this.renderer.domElement;
    if (!canvas.isConnected) {          // on a quitté le combat : on libère tout
      this.enCours = false;
      for (const g of this.cache.values()) { this.scene.remove(g); g.traverse(o => { o.geometry && o.geometry.dispose(); o.material && o.material.dispose(); }); }
      this.cache.clear();
      return;
    }
    requestAnimationFrame(tt => this.boucle(tt));
    const r = this.renderer;
    const zone = canvas.getBoundingClientRect();
    if (!zone.width || !zone.height) return;
    const taille = r.getSize(new THREE.Vector2());
    if (Math.abs(taille.x - zone.width) > 0.5 || Math.abs(taille.y - zone.height) > 0.5) r.setSize(zone.width, zone.height, false);

    r.setScissorTest(false);
    r.clear();
    r.setScissorTest(true);
    const s = t / 1000;
    const vus = new Set();
    for (const g of this.cache.values()) g.visible = false;

    for (const el of canvas.parentElement.querySelectorAll('.combattant')) {
      const fig = el.querySelector('.figure'), spr = el.querySelector('.sprite');
      if (!fig || !spr) continue;
      const tombe = el.classList.contains('a-terre');
      const modele = tombe ? 'tombe' : el.dataset.modele;
      const cle = el.dataset.id + ':' + modele;
      vus.add(cle);

      // Opacité : carte (mort, à terre) × bande (hors de portée)
      const bande = el.closest('.rangee-scene');
      const opacite = parseFloat(getComputedStyle(el).opacity) * (bande ? parseFloat(getComputedStyle(bande).opacity) : 1);
      if (opacite < 0.03) continue;

      const cr = el.getBoundingClientRect(), fr = fig.getBoundingClientRect(), sr = spr.getBoundingClientRect();
      const boss = el.classList.contains('boss');
      const w = cr.width - 2;
      const h = fr.height * (boss ? 1.75 : 1.6);
      const dx = (sr.left + sr.width / 2) - (fr.left + fr.width / 2);
      const dy = (sr.top + sr.height / 2) - (fr.top + fr.height / 2);
      const x = cr.left + cr.width / 2 - w / 2 + dx - zone.left;
      const bas = fr.bottom + 4 + dy;
      const y = zone.bottom - bas;
      if (x + w < 0 || y + h < 0 || x > zone.width || y > zone.height) continue;

      const g = this.obtenir(cle, modele);
      g.visible = true;
      const corps = g.userData.corps;
      const ph = g.userData.phase;
      const pj = el.classList.contains('pj');
      const actif = el.classList.contains('actif');
      const panique = el.classList.contains('panique');
      // Orientation : les héros tournent le dos à moitié (ils font face aux ennemis)
      let base = pj ? Math.PI * 0.8 : 0.15;
      if (modele === 'loup') base = pj ? base : 0.85;
      if (tombe) base = pj ? 0.3 : 0;
      corps.rotation.y = base + (tombe ? 0 : Math.sin(s * 0.9 + ph) * 0.12 + (actif ? Math.sin(s * 3) * 0.12 : 0));
      corps.position.y = tombe ? 0 : Math.abs(Math.sin(s * (actif ? 4 : 1.8) + ph)) * (actif ? 0.08 : 0.025) + (modele === 'morvagne' ? 0.12 + Math.sin(s * 1.5) * 0.06 : 0);
      corps.position.x = panique ? Math.sin(s * 40) * 0.02 : 0;

      // Flash (dégâts en rouge, soin en vert, sort en bleu)
      const f = this.flashs[el.dataset.id];
      let intensite = 0, couleur = 0x000000;
      if (f) {
        const age = (performance.now() - f.t0) / 1000;
        if (age < 0.45) { intensite = 1 - age / 0.45; couleur = f.couleur; } else delete this.flashs[el.dataset.id];
      }
      for (const m of g.userData.mats) {
        if (m.userData.ombre) { m.opacity = 0.35 * opacite; continue; }
        if (m.emissive) {
          if (!m.userData.emissiveBase) m.userData.emissiveBase = m.emissive.clone();
          m.emissive.copy(m.userData.emissiveBase);
          if (intensite > 0) m.emissive.lerp(new THREE.Color(couleur), intensite * 0.85);
        }
        const transp = opacite < 0.99;
        if (m.transparent !== transp) { m.transparent = transp; m.needsUpdate = true; }
        m.opacity = opacite;
        m.depthWrite = !transp;
      }

      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      r.setViewport(x, y, w, h);
      r.setScissor(x, y, w, h);
      r.render(this.scene, this.camera);
      g.visible = false;
    }
    // Oublie les figurines qui ne sont plus affichées
    for (const [cle, g] of this.cache) {
      if (!vus.has(cle)) {
        this.scene.remove(g);
        g.traverse(o => { o.geometry && o.geometry.dispose(); o.material && o.material.dispose(); });
        this.cache.delete(cle);
      }
    }
  }
};

// ---------------------------------------------------------------------
// Petites briques de modélisation
// ---------------------------------------------------------------------
function mat(couleur, o = {}) {
  return new THREE.MeshStandardMaterial({
    color: couleur, flatShading: true, roughness: o.rugosite ?? 0.75, metalness: o.metal ?? 0.05,
    emissive: o.lueur ?? 0x000000, emissiveIntensity: o.lueur ? 1 : 1
  });
}
function placer(mesh, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, rz);
  return mesh;
}
const Forme = {
  boite: (w, h, d, m, _seg, ...p) => placer(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m), ...p),
  cyl: (rh, rb, h, m, seg, ...p) => placer(new THREE.Mesh(new THREE.CylinderGeometry(rh, rb, h, seg || 7), m), ...p),
  boule: (r, m, ...p) => placer(new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), m), ...p),
  cone: (r, h, m, seg, ...p) => placer(new THREE.Mesh(new THREE.ConeGeometry(r, h, seg || 6), m), ...p),
  tore: (r, t, arc, m, ...p) => placer(new THREE.Mesh(new THREE.TorusGeometry(r, t, 5, 10, arc), m), ...p)
};
function groupe(...enfants) { const g = new THREE.Group(); enfants.forEach(e => g.add(e)); return g; }
function ombre3d(r) {
  const m = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false });
  m.userData.ombre = true;
  return placer(new THREE.Mesh(new THREE.CircleGeometry(r, 16), m), 0, 0.005, 0, -Math.PI / 2);
}
// Deux yeux
function yeux(m, y, z, ecart = 0.07, r = 0.03) {
  return groupe(Forme.boule(r, m, -ecart, y, z), Forme.boule(r, m, ecart, y, z));
}

// ---------------------------------------------------------------------
// Les figurines
// ---------------------------------------------------------------------
const PEAU = 0xe0b48c;

const FIGURINES = {
  guerrier() {
    const acier = mat(0x9aa8ba, { metal: 0.55, rugosite: 0.4 }), sombre = mat(0x4a5260, { metal: 0.4 });
    const peau = mat(PEAU), rouge = mat(0xb3302a), or = mat(0xd8a64a, { metal: 0.6, rugosite: 0.35 }), cuir = mat(0x6b4426);
    return groupe(
      Forme.boite(0.17, 0.52, 0.2, sombre, 1, -0.12, 0.26, 0), Forme.boite(0.17, 0.52, 0.2, sombre, 1, 0.12, 0.26, 0),
      Forme.boite(0.56, 0.62, 0.34, acier, 1, 0, 0.82, 0),
      Forme.boite(0.58, 0.08, 0.36, cuir, 1, 0, 0.55, 0),
      Forme.boite(0.62, 0.12, 0.38, acier, 1, 0, 1.12, 0),
      Forme.boite(0.13, 0.5, 0.15, acier, 1, -0.36, 0.84, 0.04), Forme.boite(0.13, 0.5, 0.15, acier, 1, 0.36, 0.84, 0.04),
      Forme.boule(0.17, peau, 0, 1.33, 0.02),
      Forme.cyl(0.19, 0.2, 0.2, acier, 8, 0, 1.42, 0),
      Forme.boite(0.3, 0.05, 0.05, sombre, 1, 0, 1.33, 0.17),
      Forme.cone(0.06, 0.26, rouge, 5, 0, 1.64, -0.02, -0.3, 0, 0),
      // bouclier
      Forme.cyl(0.32, 0.32, 0.06, rouge, 8, -0.46, 0.86, 0.14, Math.PI / 2, 0, 0),
      Forme.cyl(0.08, 0.08, 0.08, or, 6, -0.46, 0.86, 0.18, Math.PI / 2, 0, 0),
      // épée
      Forme.boite(0.06, 0.82, 0.025, acier, 1, 0.42, 1.12, 0.12, 0, 0, -0.12),
      Forme.boite(0.24, 0.05, 0.06, or, 1, 0.38, 0.72, 0.12, 0, 0, -0.12),
      Forme.boite(0.05, 0.14, 0.05, cuir, 1, 0.37, 0.63, 0.12)
    );
  },

  clerc() {
    const robe = mat(0xe8e0cc), or = mat(0xd8a64a, { metal: 0.6, rugosite: 0.35 }), peau = mat(PEAU);
    const bleu = mat(0x3d5c9a), fer = mat(0x8a8f99, { metal: 0.5, rugosite: 0.4 }), bois = mat(0x6b4426);
    return groupe(
      Forme.cyl(0.22, 0.4, 1.05, robe, 8, 0, 0.53, 0),
      Forme.boite(0.18, 0.9, 0.05, bleu, 1, 0, 0.6, 0.27, -0.12, 0, 0),
      Forme.boite(0.6, 0.16, 0.34, robe, 1, 0, 1.06, 0),
      Forme.boite(0.12, 0.05, 0.03, or, 1, 0, 0.92, 0.25), Forme.boite(0.04, 0.16, 0.03, or, 1, 0, 0.93, 0.25),
      Forme.boule(0.17, peau, 0, 1.3, 0.02),
      Forme.cyl(0.14, 0.18, 0.14, bleu, 8, 0, 1.44, 0),
      Forme.cyl(0.07, 0.09, 0.42, robe, 6, -0.32, 0.85, 0.05, 0, 0, 0.25),
      Forme.cyl(0.07, 0.09, 0.42, robe, 6, 0.32, 0.85, 0.05, 0, 0, -0.25),
      // masse
      Forme.cyl(0.03, 0.03, 0.6, bois, 5, 0.42, 0.85, 0.12, 0.3, 0, 0),
      Forme.boule(0.1, fer, 0.42, 1.12, 0.21),
      // halo
      Forme.tore(0.2, 0.015, Math.PI * 2, mat(0xffe08a, { lueur: 0x8a6a10 }), 0, 1.62, -0.05, Math.PI / 2.3, 0, 0)
    );
  },

  roublard() {
    const cape = mat(0x2f4a35), capeS = mat(0x22362a), peau = mat(PEAU), cuir = mat(0x4a3324);
    const acier = mat(0xc9ced6, { metal: 0.6, rugosite: 0.3 }), bois = mat(0x7a5530);
    return groupe(
      Forme.boite(0.15, 0.5, 0.18, cuir, 1, -0.11, 0.25, 0), Forme.boite(0.15, 0.5, 0.18, cuir, 1, 0.11, 0.25, 0),
      Forme.cyl(0.2, 0.34, 0.75, cape, 8, 0, 0.78, -0.02),
      Forme.boite(0.42, 0.5, 0.28, cuir, 1, 0, 0.85, 0.04),
      Forme.boule(0.16, peau, 0, 1.27, 0.03),
      Forme.boite(0.3, 0.07, 0.05, mat(0x1a1a1a), 1, 0, 1.24, 0.15),
      Forme.cone(0.24, 0.46, capeS, 7, 0, 1.4, -0.03),
      Forme.boite(0.11, 0.42, 0.13, cuir, 1, -0.3, 0.86, 0.12, -0.5, 0, 0), Forme.boite(0.11, 0.42, 0.13, cuir, 1, 0.3, 0.86, 0.12, -0.5, 0, 0),
      // dagues
      Forme.boite(0.04, 0.32, 0.02, acier, 1, -0.32, 0.78, 0.38, -1.1, 0, 0),
      Forme.boite(0.04, 0.32, 0.02, acier, 1, 0.32, 0.78, 0.38, -1.1, 0, 0),
      // arc dans le dos
      Forme.tore(0.42, 0.025, Math.PI, bois, 0, 0.95, -0.22, 0, 0, Math.PI / 2)
    );
  },

  magicien() {
    const robe = mat(0x34408f), robeS = mat(0x262f6b), peau = mat(PEAU), barbe = mat(0xe9e6df);
    const bois = mat(0x6b4426), orbe = mat(0x7fe3ff, { lueur: 0x2aa6d8 }), etoile = mat(0xffe08a, { lueur: 0x806010 });
    return groupe(
      Forme.cyl(0.2, 0.42, 1.08, robe, 8, 0, 0.54, 0),
      Forme.boite(0.56, 0.14, 0.32, robeS, 1, 0, 1.06, 0),
      Forme.boule(0.16, peau, 0, 1.27, 0.02),
      Forme.cone(0.13, 0.36, barbe, 6, 0, 1.06, 0.12, Math.PI, 0, 0),
      Forme.cyl(0.36, 0.36, 0.03, robeS, 10, 0, 1.39, 0),
      Forme.cone(0.24, 0.58, robe, 7, 0, 1.68, -0.03, -0.18, 0, 0),
      Forme.boule(0.035, etoile, 0.08, 1.6, 0.15), Forme.boule(0.03, etoile, -0.07, 1.48, 0.17),
      Forme.cyl(0.07, 0.1, 0.42, robe, 6, -0.32, 0.86, 0.04, 0, 0, 0.3),
      Forme.cyl(0.07, 0.1, 0.42, robe, 6, 0.33, 0.86, 0.06, 0, 0, -0.15),
      // bâton
      Forme.cyl(0.03, 0.035, 1.7, bois, 5, 0.44, 0.85, 0.12),
      Forme.boule(0.1, orbe, 0.44, 1.75, 0.12)
    );
  },

  gobelin() {
    const peau = mat(0x6f9a3a), tunique = mat(0x6b4a2a), oeil = mat(0xff4a2a, { lueur: 0xc01800 });
    const acier = mat(0xa8a8a8, { metal: 0.5, rugosite: 0.45 }), cuir = mat(0x3b2a1c);
    const g = groupe(
      Forme.boite(0.13, 0.36, 0.15, peau, 1, -0.09, 0.18, 0), Forme.boite(0.13, 0.36, 0.15, peau, 1, 0.09, 0.18, 0),
      Forme.boite(0.4, 0.46, 0.26, tunique, 1, 0, 0.58, 0),
      Forme.boite(0.42, 0.06, 0.28, cuir, 1, 0, 0.42, 0),
      Forme.boule(0.23, peau, 0, 1.0, 0.03),
      Forme.cone(0.07, 0.3, peau, 4, -0.3, 1.06, 0, 0, 0, Math.PI / 2.4),
      Forme.cone(0.07, 0.3, peau, 4, 0.3, 1.06, 0, 0, 0, -Math.PI / 2.4),
      yeux(oeil, 1.03, 0.2, 0.08, 0.035),
      Forme.cone(0.05, 0.12, peau, 4, 0, 0.96, 0.25, Math.PI / 2, 0, 0),
      Forme.boite(0.1, 0.36, 0.11, peau, 1, -0.26, 0.6, 0.05, 0, 0, 0.2), Forme.boite(0.1, 0.36, 0.11, peau, 1, 0.26, 0.6, 0.08, -0.4, 0, -0.2),
      // cimeterre
      Forme.boite(0.06, 0.48, 0.02, acier, 1, 0.34, 0.75, 0.3, -0.9, 0, -0.25)
    );
    g.scale.setScalar(1.12);
    return g;
  },

  squelette() {
    const os = mat(0xe6dcc0, { rugosite: 0.9 }), noir = mat(0x111111), oeil = mat(0x70ff9a, { lueur: 0x20c050 });
    const rouille = mat(0x8a6a4a, { metal: 0.4 });
    const cotes = [];
    for (let i = 0; i < 4; i++) cotes.push(Forme.tore(0.17 - i * 0.015, 0.02, Math.PI * 1.6, os, 0, 1.08 - i * 0.1, 0.02, Math.PI / 2, 0, Math.PI * 0.7));
    return groupe(
      Forme.cyl(0.03, 0.03, 0.5, os, 5, -0.1, 0.25, 0), Forme.cyl(0.03, 0.03, 0.5, os, 5, 0.1, 0.25, 0),
      Forme.boite(0.3, 0.1, 0.16, os, 1, 0, 0.55, 0),
      Forme.cyl(0.03, 0.03, 0.62, os, 5, 0, 0.88, -0.05),
      ...cotes,
      Forme.boite(0.42, 0.05, 0.08, os, 1, 0, 1.17, 0),
      Forme.cyl(0.025, 0.025, 0.48, os, 5, -0.24, 0.92, 0.02, 0, 0, 0.12), Forme.cyl(0.025, 0.025, 0.48, os, 5, 0.24, 0.92, 0.1, -0.5, 0, -0.12),
      Forme.boule(0.17, os, 0, 1.38, 0.02),
      Forme.boite(0.17, 0.07, 0.12, os, 1, 0, 1.23, 0.06),
      yeux(noir, 1.39, 0.15, 0.065, 0.045), yeux(oeil, 1.39, 0.18, 0.065, 0.018),
      Forme.boite(0.05, 0.55, 0.02, rouille, 1, 0.28, 0.9, 0.36, -1.0, 0, 0)
    );
  },

  loup() {
    const poil = mat(0x7d7f86, { rugosite: 0.95 }), clair = mat(0xb9b6ae), oeil = mat(0xffd23a, { lueur: 0xb08000 }), noir = mat(0x151515);
    const pattes = [[-0.14, 0.28], [0.14, 0.28], [-0.14, -0.3], [0.14, -0.3]].map(([x, z]) => Forme.cyl(0.05, 0.045, 0.44, poil, 5, x, 0.22, z));
    return groupe(
      ...pattes,
      Forme.boite(0.36, 0.34, 0.85, poil, 1, 0, 0.58, 0),
      Forme.boule(0.24, poil, 0, 0.66, 0.32),
      Forme.boite(0.28, 0.26, 0.28, poil, 1, 0, 0.82, 0.58),
      Forme.boite(0.16, 0.13, 0.22, clair, 1, 0, 0.76, 0.78),
      Forme.boule(0.035, noir, 0, 0.8, 0.9),
      Forme.cone(0.06, 0.16, poil, 4, -0.09, 1.02, 0.52), Forme.cone(0.06, 0.16, poil, 4, 0.09, 1.02, 0.52),
      yeux(oeil, 0.88, 0.72, 0.075, 0.03),
      Forme.cone(0.07, 0.48, poil, 5, 0, 0.7, -0.6, -2.0, 0, 0)
    );
  },

  cultiste() {
    const robe = mat(0x7a1f24), robeS = mat(0x521418), visage = mat(0x1a1010), oeil = mat(0xffcf4a, { lueur: 0xd09000 });
    const corde = mat(0xc9a86a), acier = mat(0xb8bcc4, { metal: 0.5, rugosite: 0.35 }), symbole = mat(0x111111);
    return groupe(
      Forme.cyl(0.22, 0.4, 1.05, robe, 8, 0, 0.53, 0),
      Forme.cyl(0.24, 0.24, 0.05, corde, 8, 0, 0.72, 0),
      Forme.boite(0.58, 0.14, 0.32, robe, 1, 0, 1.05, 0),
      Forme.boule(0.16, visage, 0, 1.27, 0.02),
      yeux(oeil, 1.29, 0.15, 0.06, 0.025),
      Forme.cone(0.24, 0.52, robeS, 7, 0, 1.42, -0.04, -0.1, 0, 0),
      Forme.boite(0.14, 0.14, 0.03, symbole, 1, 0, 0.92, 0.26, 0, 0, Math.PI / 4),
      Forme.cyl(0.07, 0.09, 0.42, robe, 6, -0.32, 0.86, 0.06, -0.3, 0, 0.2),
      Forme.cyl(0.07, 0.09, 0.42, robe, 6, 0.32, 0.9, 0.12, -0.8, 0, -0.2),
      Forme.cone(0.04, 0.32, acier, 4, 0.32, 1.08, 0.36, 0.3, 0, 0)
    );
  },

  zombie() {
    const peau = mat(0x86a070, { rugosite: 0.95 }), chemise = mat(0x6b5a44), pantalon = mat(0x3b3f4a), oeil = mat(0xf0f0d0, { lueur: 0x505030 });
    const g = groupe(
      Forme.boite(0.17, 0.52, 0.2, pantalon, 1, -0.12, 0.26, 0), Forme.boite(0.17, 0.52, 0.2, pantalon, 1, 0.12, 0.26, 0.04),
      Forme.boite(0.5, 0.6, 0.3, chemise, 1, 0, 0.82, 0, 0.12, 0, 0.05),
      Forme.boite(0.2, 0.18, 0.04, peau, 1, 0.1, 0.72, 0.16),
      Forme.boule(0.18, peau, 0.03, 1.27, 0.08),
      yeux(oeil, 1.29, 0.24, 0.07, 0.03),
      Forme.boite(0.12, 0.12, 0.55, peau, 1, -0.3, 1.0, 0.32, -0.1, 0, 0),
      Forme.boite(0.12, 0.12, 0.5, peau, 1, 0.3, 0.95, 0.3, 0.1, 0, 0)
    );
    g.rotation.z = 0.06;
    return g;
  },

  ogre() {
    const peau = mat(0xb08a5a, { rugosite: 0.9 }), pagne = mat(0x5a3f26), dent = mat(0xf0ead8), bois = mat(0x5a3a1e), oeil = mat(0xff6030, { lueur: 0x902000 });
    const g = groupe(
      Forme.cyl(0.13, 0.12, 0.5, peau, 6, -0.17, 0.25, 0), Forme.cyl(0.13, 0.12, 0.5, peau, 6, 0.17, 0.25, 0),
      Forme.boite(0.6, 0.22, 0.42, pagne, 1, 0, 0.55, 0),
      Forme.boule(0.42, peau, 0, 0.92, 0.04),
      Forme.boite(0.82, 0.28, 0.4, peau, 1, 0, 1.22, -0.02),
      Forme.boule(0.2, peau, 0, 1.47, 0.08),
      yeux(oeil, 1.5, 0.25, 0.07, 0.03),
      Forme.cone(0.03, 0.1, dent, 4, -0.06, 1.42, 0.25), Forme.cone(0.03, 0.1, dent, 4, 0.06, 1.42, 0.25),
      Forme.cyl(0.1, 0.12, 0.6, peau, 6, -0.5, 0.95, 0.05, 0, 0, 0.15),
      Forme.cyl(0.1, 0.12, 0.55, peau, 6, 0.5, 1.0, 0.15, -0.6, 0, -0.15),
      // massue
      Forme.cyl(0.14, 0.05, 0.8, bois, 6, 0.58, 1.12, 0.48, -0.9, 0, 0)
    );
    g.scale.setScalar(1.05);
    return g;
  },

  morvagne() {
    const robe = mat(0x3d1f4f), robeS = mat(0x26122f), os = mat(0xe6dcc0), or = mat(0xd8a64a, { metal: 0.7, rugosite: 0.3 });
    const oeil = mat(0x6dff7a, { lueur: 0x30d040 }), orbe = mat(0x6dff7a, { lueur: 0x20b030 }), noir = mat(0x0c0c0c);
    const couronne = [];
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      couronne.push(Forme.cone(0.035, 0.12, or, 4, Math.sin(a) * 0.16, 1.64, Math.cos(a) * 0.16));
    }
    const g = groupe(
      Forme.cyl(0.24, 0.5, 1.25, robe, 9, 0, 0.62, 0),
      Forme.cyl(0.38, 0.3, 0.2, robeS, 9, 0, 1.2, 0),
      Forme.cone(0.14, 0.3, robeS, 4, -0.38, 1.32, 0, 0, 0, 0.5), Forme.cone(0.14, 0.3, robeS, 4, 0.38, 1.32, 0, 0, 0, -0.5),
      Forme.boule(0.18, os, 0, 1.47, 0.02),
      yeux(noir, 1.49, 0.15, 0.07, 0.045), yeux(oeil, 1.49, 0.18, 0.07, 0.022),
      Forme.cyl(0.17, 0.17, 0.05, or, 10, 0, 1.6, 0),
      ...couronne,
      Forme.cyl(0.08, 0.1, 0.5, robe, 6, -0.36, 1.0, 0.08, -0.4, 0, 0.3),
      Forme.cyl(0.08, 0.1, 0.5, robe, 6, 0.36, 1.0, 0.08, 0, 0, -0.2),
      Forme.cyl(0.03, 0.035, 1.9, noir, 5, 0.5, 0.95, 0.1),
      Forme.boule(0.13, orbe, 0.5, 1.95, 0.1),
      Forme.tore(0.17, 0.02, Math.PI * 2, or, 0.5, 1.95, 0.1, Math.PI / 2, 0, 0)
    );
    g.scale.setScalar(0.88);
    return g;
  },

  tombe() {
    const pierre = mat(0x7a7a80, { rugosite: 1 }), terre = mat(0x4a3a2a, { rugosite: 1 });
    return groupe(
      Forme.boite(0.5, 0.12, 0.6, terre, 1, 0, 0.06, 0.1),
      Forme.boite(0.42, 0.5, 0.12, pierre, 1, 0, 0.37, -0.12),
      Forme.cyl(0.21, 0.21, 0.12, pierre, 10, 0, 0.62, -0.12, Math.PI / 2, 0, 0),
      Forme.boite(0.04, 0.18, 0.02, mat(0x3a3a40), 1, 0, 0.48, -0.05), Forme.boite(0.12, 0.04, 0.02, mat(0x3a3a40), 1, 0, 0.51, -0.05)
    );
  },

  inconnu() {
    return groupe(Forme.boule(0.35, mat(0x888888), 0, 0.5, 0));
  }
};
