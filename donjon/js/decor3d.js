// =====================================================================
// Décors propres à chaque thème, ambiances (particules) et effets de combat.
// Tout est dessiné avec les mêmes briques et matériaux que les figurines
// (modeles3d.js : F, G, mat, lin…), pour rester dans le style KayKit.
//
//   DECORS_THEMES[theme](d) : place les éléments du thème. d fournit
//     cote(f, marge)  → points sur les bords gauche/droit à la profondeur f (0 = fond, 1 = devant)
//     fond(x)         → point le long du mur du fond
//     sol(f, x)       → point au sol (x en fraction de la largeur, -1..1)
//     ajouter(objet, point, rotationY, echelle)
//     alea()          → aléatoire reproductible (même décor à chaque redimensionnement)
//   AMBIANCES[theme](emettre, zone) : particules d'ambiance, appelées à chaque image
// =====================================================================

// ---------------------------------------------------------------- éléments
const ELEMENTS_DECOR = {
  stalagmites(c1 = 0x6a6258, c2 = 0x857c70) {
    const a = mat(c1), b = mat(c2);
    return G(F.cone(0.22, 0.9, a, 0, 0.45, 0), F.cone(0.15, 0.6, b, 0.25, 0.3, 0.1), F.cone(0.12, 0.45, a, -0.2, 0.22, 0.12), F.boule(0.25, b, 0, 0.05, 0, 0, 0, 0, 1.3, 0.35, 1.2));
  },
  champignons(couleur = 0x60e0c0, lueur = 0x208060) {
    const pied = mat(0xe8dcc0), chapeau = mat(couleur, { lueur });
    const g = G();
    for (const [x, z, e] of [[0, 0, 1.2], [0.2, 0.1, 0.8], [-0.15, 0.15, 0.7], [0.08, -0.18, 0.9]]) {
      const c = G(F.cyl(0.04, 0.05, 0.22, pied, 0, 0.11, 0), F.calotte(0.14, chapeau, 0, 0.2, 0, 0, 0, 0, 1, 0.7, 1));
      c.position.set(x, 0, z); c.scale.setScalar(e); g.add(c);
    }
    return g;
  },
  cristaux(couleur = 0x60ffb0, lueur = 0x20a060) {
    const m = mat(couleur, { lueur, rugosite: 0.25 });
    const pic = (h, x, z, rx, rz) => P(new THREE.Mesh(new THREE.ConeGeometry(0.1, h, 5), m), x, h / 2, z, rx, 0, rz);
    return G(pic(0.8, 0, 0, 0, 0), pic(0.55, 0.15, 0.08, 0.2, -0.35), pic(0.45, -0.14, 0.05, -0.1, 0.4), pic(0.35, 0.05, -0.15, -0.35, 0.1));
  },
  roseaux() {
    const tige = mat(0x5a7a3a), epi = mat(0x6a4a2a);
    const g = G();
    for (let i = 0; i < 7; i++) {
      const a = i / 7 * Math.PI * 2, r = 0.12 + (i % 3) * 0.06, h = 0.7 + (i % 4) * 0.15;
      const t = G(F.cyl(0.015, 0.02, h, tige, 0, h / 2, 0), F.capsule(0.035, 0.12, epi, 0, h + 0.02, 0));
      t.position.set(Math.cos(a) * r, 0, Math.sin(a) * r); t.rotation.set((i % 2 ? 0.12 : -0.1), 0, (i % 3 - 1) * 0.12);
      g.add(t);
    }
    for (let i = 0; i < 4; i++) g.add(F.cone(0.03, 0.5, tige, Math.cos(i * 1.7) * 0.2, 0.25, Math.sin(i * 1.7) * 0.2, 0.3, i, 0.25));
    return g;
  },
  flaque(couleur = 0x3a5a6a, rx = 0.9, rz = 0.5) {
    const m = new THREE.MeshStandardMaterial({ color: lin(couleur), roughness: 0.08, metalness: 0.2, transparent: true, opacity: 0.82, polygonOffset: true, polygonOffsetFactor: -2 });
    const f = sansContour(new THREE.Mesh(new THREE.CircleGeometry(1, 28), m));
    f.rotation.x = -Math.PI / 2; f.scale.set(rx, rz, 1); f.position.y = 0.03; f.receiveShadow = true;
    return G(f);
  },
  nenuphars() {
    const feuille = mat(0x4a8a3a), fleur = mat(0xf0a0c0);
    const g = ELEMENTS_DECOR.flaque(0x2a4a3a, 1.0, 0.6);
    for (const [x, z, r] of [[-0.35, 0.1, 0.16], [0.3, -0.12, 0.13], [0.05, 0.25, 0.11]]) g.add(F.cyl(r, r, 0.02, feuille, x, 0.05, z));
    g.add(F.cone(0.06, 0.08, fleur, -0.35, 0.1, 0.1));
    return g;
  },
  congere() {
    const neige = mat(0xf2f8ff, { rugosite: 0.9 });
    return G(F.boule(0.45, neige, 0, 0, 0, 0, 0, 0, 1.4, 0.4, 1), F.boule(0.3, neige, 0.35, 0.02, 0.15, 0, 0, 0, 1.2, 0.45, 1), F.boule(0.25, neige, -0.35, 0.0, -0.1, 0, 0, 0, 1.2, 0.4, 1));
  },
  pinsGeles() {
    const tronc = mat(0x5a4030), aiguilles = mat(0x2e5a4a), neige = mat(0xf2f8ff);
    const g = G(F.cyl(0.06, 0.08, 0.4, tronc, 0, 0.2, 0));
    [0, 1, 2].forEach(i => { g.add(F.cone(0.42 - i * 0.1, 0.5, aiguilles, 0, 0.55 + i * 0.32, 0)); g.add(F.cone(0.3 - i * 0.08, 0.22, neige, 0, 0.72 + i * 0.32, 0)); });
    return g;
  },
  jarres() {
    const terre = mat(0xb8743a), motif = mat(0x2a4a6a), sombre = mat(0x6a3a1a);
    const jarre = (x, z, e, ry) => { const j = G(F.boule(0.22, terre, 0, 0.24, 0, 0, 0, 0, 1, 1.15, 1), F.cyl(0.1, 0.14, 0.12, terre, 0, 0.5, 0), F.cyl(0.13, 0.13, 0.04, sombre, 0, 0.57, 0), F.tore(0.2, 0.018, motif, undefined, 0, 0.3, 0, Math.PI / 2, 0, 0)); j.position.set(x, 0, z); j.scale.setScalar(e); j.rotation.y = ry; return j; };
    return G(jarre(0, 0, 1, 0), jarre(0.35, 0.12, 0.75, 1), F.boule(0.16, terre, -0.3, 0.08, 0.15, 1.3, 0, 0.4, 1, 1.1, 1));
  },
  obelisque() {
    const pierre = mat(0xd8b878), sombre = mat(0x9a7a4a), or = mat(0xf2c04a);
    return G(F.boite(0.5, 0.15, 0.5, sombre, 0, 0.075, 0), F.cyl(0.13, 0.2, 1.6, pierre, 0, 0.95, 0, 0, Math.PI / 4, 0), P(new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.3, 4), or), 0, 1.9, 0, 0, Math.PI / 4, 0),
      F.boite(0.16, 0.04, 0.02, sombre, 0, 1.2, 0.14), F.boite(0.04, 0.16, 0.02, sombre, 0, 1.0, 0.15));
  },
  dune() {
    const sable = mat(0xd8b070, { rugosite: 0.95 });
    return G(F.boule(0.6, sable, 0, -0.05, 0, 0, 0, 0, 1.6, 0.35, 1), F.boule(0.35, sable, 0.55, -0.03, 0.2, 0, 0, 0, 1.4, 0.4, 1));
  },
  candelabre() {
    const fer = mat(0x2a2224, { rugosite: 0.4 }), cire = mat(0xf2ead8);
    const g = G(F.cyl(0.18, 0.22, 0.06, fer, 0, 0.03, 0), F.cyl(0.03, 0.04, 1.3, fer, 0, 0.68, 0), F.tore(0.22, 0.025, fer, Math.PI, 0, 1.3, 0, 0, 0, Math.PI));
    for (const x of [-0.22, 0, 0.22]) {
      g.add(F.cyl(0.035, 0.035, 0.18, cire, x, x ? 1.38 : 1.48, 0));
      g.add(sansContour(F.cone(0.03, 0.09, mat(0xffc860, { lueur: 0xff8a20 }), x, x ? 1.52 : 1.62, 0)));
    }
    g.userData.flamme = new THREE.Vector3(0, 1.6, 0);
    return g;
  },
  cercueil() {
    const bois = mat(0x3a2018), clair = mat(0x5a3020), fer = mat(0x9a8a6a);
    const forme = new THREE.Shape();
    forme.moveTo(-0.18, -0.5); forme.lineTo(0.18, -0.5); forme.lineTo(0.28, 0.25); forme.lineTo(0.2, 0.5); forme.lineTo(-0.2, 0.5); forme.lineTo(-0.28, 0.25); forme.closePath();
    const geo = new THREE.ExtrudeGeometry(forme, { depth: 0.25, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 1 });
    const caisse = new THREE.Mesh(geo, bois); caisse.rotation.x = -Math.PI / 2;
    const couvercle = new THREE.Mesh(geo, clair); couvercle.rotation.set(-Math.PI / 2, 0, 0.15); couvercle.position.set(0.12, 0.27, 0.05); couvercle.scale.set(1, 1, 0.25);
    return G(caisse, couvercle, F.boite(0.04, 0.02, 0.3, fer, 0.12, 0.34, -0.12), F.boite(0.18, 0.02, 0.04, fer, 0.12, 0.34, -0.18));
  },
  tapis(longueur = 6, couleur = 0x8a1a2a) {
    const m = new THREE.MeshStandardMaterial({ color: lin(couleur), roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -2 });
    const bord = new THREE.MeshStandardMaterial({ color: lin(0xd8a840), roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -3 });
    const t = sansContour(new THREE.Mesh(new THREE.PlaneGeometry(1.1, longueur), m)); t.rotation.x = -Math.PI / 2; t.position.y = 0.025; t.receiveShadow = true;
    const g = G(t);
    for (const x of [-0.5, 0.5]) { const b = sansContour(new THREE.Mesh(new THREE.PlaneGeometry(0.06, longueur), bord)); b.rotation.x = -Math.PI / 2; b.position.set(x, 0.027, 0); g.add(b); }
    return g;
  },
  toile(rayon = 1) {
    const pts = [], n = 8;
    for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 0.5; pts.push(0, 0, 0, Math.cos(a) * rayon, Math.sin(a) * rayon, 0); }
    for (let k = 1; k <= 5; k++) {
      const r = k / 5.5 * rayon;
      for (let i = 0; i < n - 1; i++) {
        const a = i / n * Math.PI * 0.5, b = (i + 1) / n * Math.PI * 0.5;
        pts.push(Math.cos(a) * r, Math.sin(a) * r, 0, Math.cos(b) * r * 0.97, Math.sin(b) * r * 0.97, 0);
      }
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    return G(new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: lin(0xe8e8f0), transparent: true, opacity: 0.55 })));
  },
  cocon() {
    const soie = mat(0xe8e4ec, { rugosite: 0.8 }), fil = mat(0xc8c0d0);
    return G(F.boule(0.2, soie, 0, 0.35, 0, 0, 0, 0.2, 1, 1.8, 1), [0, 1, 2, 3].map(i => F.tore(0.2, 0.012, fil, undefined, 0, 0.12 + i * 0.13, 0, Math.PI / 2 + 0.2, 0, i * 0.3)),
      F.cyl(0.006, 0.006, 0.6, fil, 0, 0.95, 0));
  },
  lave() {
    const roche = mat(0x2a2020, { rugosite: 0.9 }), feu = mat(0xff7a20, { lueur: 0xff4a00 });
    const g = G();
    for (let i = 0; i < 4; i++) {
      const f = sansContour(F.boite(0.9 - i * 0.12, 0.02, 0.08, feu, i * 0.25 - 0.4, 0.02, i * 0.18 - 0.2, 0, i * 0.7, 0));
      g.add(f);
    }
    g.add(F.boule(0.22, roche, 0.5, 0.1, 0.2, 0, 0, 0, 1.2, 0.7, 1), F.boule(0.16, roche, -0.55, 0.07, -0.2, 0, 0, 0, 1, 0.7, 1.2));
    return g;
  },
  rocher(c = 0x5a5650) {
    const m = mat(c, { rugosite: 0.9 });
    return G(P(new THREE.Mesh(new THREE.DodecahedronGeometry(0.35, 0), m), 0, 0.2, 0, 0.3, 0.5, 0.1, 1.2, 0.8, 1), P(new THREE.Mesh(new THREE.DodecahedronGeometry(0.2, 0), m), 0.35, 0.1, 0.15, 0.6, 0, 0.3));
  },
  corail() {
    const g = G();
    const branche = (c, x, z, s) => { const m = mat(c); const b = G(F.capsule(0.05, 0.4, m, 0, 0.25, 0), F.capsule(0.04, 0.25, m, 0.1, 0.45, 0, 0, 0, -0.6), F.capsule(0.04, 0.22, m, -0.09, 0.4, 0.03, 0, 0, 0.7)); b.position.set(x, 0, z); b.scale.setScalar(s); return b; };
    g.add(branche(0xff6a7a, 0, 0, 1), branche(0xffa040, 0.25, 0.1, 0.8), branche(0xb060e0, -0.2, 0.12, 0.7));
    g.add(F.boule(0.12, mat(0xf0e0c0), 0.1, 0.05, 0.3, 0, 0, 0, 1, 0.6, 1));
    return g;
  },
  ancre() {
    const fer = mat(0x4a4a50, { rugosite: 0.5 }), rouille = mat(0x8a4a2a);
    const g = G(F.cyl(0.04, 0.04, 1.0, fer, 0, 0.5, 0), F.tore(0.1, 0.03, fer, undefined, 0, 1.05, 0), F.boite(0.5, 0.05, 0.05, fer, 0, 0.85, 0),
      F.tore(0.35, 0.04, rouille, Math.PI, 0, 0.35, 0, 0, 0, Math.PI), F.cone(0.07, 0.15, rouille, -0.35, 0.36, 0, 0, 0, 0.6), F.cone(0.07, 0.15, rouille, 0.35, 0.36, 0, 0, 0, -0.6));
    g.rotation.z = 0.5; g.position.y = 0.1;
    return G(g);
  },
  coquillages() {
    return G(F.calotte(0.1, mat(0xf2d0b0), 0, 0, 0, 0, 0, 0, 1, 0.6, 1.2), F.cone(0.06, 0.18, mat(0xe8a080), 0.2, 0.05, 0.1, Math.PI / 2, 0, 1), F.calotte(0.08, mat(0xf8e8d8), -0.18, 0, 0.12, 0, 0, 0, 1.2, 0.5, 1));
  },
  autel() {
    const pierre = mat(0x6a5a62), drap = mat(0x6a1a3a), or = mat(0xf2c04a);
    return G(F.boite(1.0, 0.5, 0.5, pierre, 0, 0.25, 0), F.boite(1.05, 0.06, 0.55, pierre, 0, 0.53, 0), F.boite(0.3, 0.52, 0.56, drap, 0, 0.27, 0.01),
      F.cyl(0.06, 0.08, 0.12, or, -0.35, 0.62, 0), F.cyl(0.06, 0.08, 0.12, or, 0.35, 0.62, 0), F.boule(0.08, or, 0, 0.63, 0));
  },
  tombe() { return FIGURINES.tombe(); },
  ossements() {
    const os = mat(0xe8dcc0);
    return G(F.boule(0.12, os, 0, 0.1, 0), F.boule(0.03, mat(0x1a1410), -0.04, 0.12, 0.1), F.boule(0.03, mat(0x1a1410), 0.04, 0.12, 0.1),
      F.capsule(0.025, 0.3, os, 0.25, 0.04, 0.1, Math.PI / 2, 0.8, 0), F.capsule(0.025, 0.25, os, -0.2, 0.04, 0.15, Math.PI / 2, -0.4, 0));
  },
  grille() {
    const fer = mat(0x3a3e3a, { rugosite: 0.4 }), vase = mat(0x7ac83a, { lueur: 0x2a6a10, rugosite: 0.15 });
    const g = G(F.boite(0.9, 0.04, 0.6, mat(0x2a2a28), 0, 0.02, 0));
    for (let i = -3; i <= 3; i++) g.add(F.boite(0.04, 0.05, 0.6, fer, i * 0.12, 0.05, 0));
    g.add(sansContour(F.boite(0.8, 0.01, 0.5, vase, 0, 0.025, 0)));
    return g;
  },
  tonneauVase() {
    const bois = mat(0x6a4a2a), cercle = mat(0x3a3a3a), vase = mat(0x8ad840, { lueur: 0x2a7a10, rugosite: 0.15 });
    const t = G(F.cyl(0.22, 0.22, 0.5, bois, 0, 0.22, 0), F.tore(0.225, 0.02, cercle, undefined, 0, 0.1, 0, Math.PI / 2, 0, 0), F.tore(0.225, 0.02, cercle, undefined, 0, 0.36, 0, Math.PI / 2, 0, 0));
    t.rotation.z = Math.PI / 2; t.position.y = 0.0;
    return G(t, sansContour(F.boule(0.4, vase, 0.45, 0.0, 0.1, 0, 0, 0, 1.3, 0.08, 0.9)));
  }
};

// ---------------------------------------------------------------- thèmes
const DECORS_THEMES = {
  crypte(d) {
    d.cote(0.15).forEach((p, i) => d.ajouter(ELEMENTS_DECOR.tombe(), p, i ? -0.3 : 0.3, 0.55));
    d.cote(0.8).forEach((p, i) => d.ajouter(ELEMENTS_DECOR.ossements(), p, d.alea() * 6, 1.2));
    d.ajouter(ELEMENTS_DECOR.toile(1.3), d.coin('g'), 0, 1); d.ajouter(ELEMENTS_DECOR.toile(1.1), d.coin('d'), Math.PI / 2, 1);
  },
  grotte(d) {
    d.cote(0.2).forEach(p => d.ajouter(ELEMENTS_DECOR.stalagmites(), p, d.alea() * 6, 1.1));
    d.cote(0.75).forEach(p => d.ajouter(ELEMENTS_DECOR.champignons(), p, d.alea() * 6, 1.3));
    d.ajouter(ELEMENTS_DECOR.flaque(0x2a3a3a, 0.8, 0.4), d.sol(0.62, -0.55));
  },
  sanctuaire(d) {
    d.ajouter(ELEMENTS_DECOR.tapis(9, 0x5a1030), d.sol(0.5, 0));
    d.ajouter(ELEMENTS_DECOR.autel(), d.fond(0), 0, 1.1);
    d.cote(0.25).forEach(p => d.ajouter(ELEMENTS_DECOR.candelabre(), p, 0, 1));
  },
  volcan(d) {
    d.ajouter(ELEMENTS_DECOR.lave(), d.sol(0.3, -0.6), 0.4, 1.3); d.ajouter(ELEMENTS_DECOR.lave(), d.sol(0.7, 0.6), 2.2, 1.2);
    d.cote(0.2).forEach(p => d.ajouter(ELEMENTS_DECOR.rocher(0x3a2a26), p, d.alea() * 6, 1.4));
    d.cote(0.8).forEach(p => d.ajouter(ELEMENTS_DECOR.stalagmites(0x3a2a26, 0x5a3a2a), p, d.alea() * 6, 0.9));
  },
  toiles(d) {
    d.ajouter(ELEMENTS_DECOR.toile(1.8), d.coin('g'), 0, 1); d.ajouter(ELEMENTS_DECOR.toile(1.6), d.coin('d'), Math.PI / 2, 1);
    d.cote(0.2).forEach(p => d.ajouter(ELEMENTS_DECOR.cocon(), p, d.alea() * 6, 1.4));
    d.cote(0.75).forEach(p => d.ajouter(ELEMENTS_DECOR.ossements(), p, d.alea() * 6, 1.1));
  },
  abime(d) {
    d.cote(0.2).forEach(p => d.ajouter(ELEMENTS_DECOR.cristaux(), p, d.alea() * 6, 1.4));
    d.cote(0.75).forEach(p => d.ajouter(ELEMENTS_DECOR.ossements(), p, d.alea() * 6, 1.3));
    d.ajouter(ELEMENTS_DECOR.cristaux(0x40ffa0, 0x10a050), d.fond(0.5), 0, 1.1);
  },
  marais(d) {
    d.cote(0.15).forEach(p => d.ajouter(ELEMENTS_DECOR.roseaux(), p, d.alea() * 6, 1.3));
    d.cote(0.7).forEach(p => d.ajouter(ELEMENTS_DECOR.roseaux(), p, d.alea() * 6, 1.1));
    d.ajouter(ELEMENTS_DECOR.nenuphars(), d.sol(0.45, -0.75), 0.3, 1.1);
    d.ajouter(ELEMENTS_DECOR.flaque(0x2a4030, 0.9, 0.45), d.sol(0.62, 0.7));
    d.cote(0.88).forEach(p => d.ajouter(ELEMENTS_DECOR.champignons(0xc8ff60, 0x5a8a10), p, d.alea() * 6, 1));
  },
  givre(d) {
    d.cote(0.15).forEach(p => d.ajouter(ELEMENTS_DECOR.pinsGeles(), p, d.alea() * 6, 1.2));
    d.cote(0.7).forEach(p => d.ajouter(ELEMENTS_DECOR.congere(), p, d.alea() * 6, 1.2));
    d.cote(0.88).forEach(p => d.ajouter(ELEMENTS_DECOR.cristaux(0xb8ecff, 0x2a6a9a), p, d.alea() * 6, 1.1));
    d.ajouter(ELEMENTS_DECOR.flaque(0xc8e8ff, 1.0, 0.5), d.sol(0.55, -0.7));
  },
  desert(d) {
    d.ajouter(ELEMENTS_DECOR.obelisque(), d.fond(-0.55), 0, 1); d.ajouter(ELEMENTS_DECOR.obelisque(), d.fond(0.55), 0, 1);
    d.cote(0.2).forEach(p => d.ajouter(ELEMENTS_DECOR.jarres(), p, d.alea() * 6, 1.2));
    d.cote(0.75).forEach(p => d.ajouter(ELEMENTS_DECOR.dune(), p, d.alea() * 6, 1.3));
    d.ajouter(ELEMENTS_DECOR.dune(), d.sol(0.5, 0.75), 0.5, 1);
  },
  chateau(d) {
    d.ajouter(ELEMENTS_DECOR.tapis(9, 0x7a1020), d.sol(0.5, 0));
    d.cote(0.2).forEach(p => d.ajouter(ELEMENTS_DECOR.candelabre(), p, 0, 1));
    d.cote(0.75).forEach((p, i) => d.ajouter(ELEMENTS_DECOR.cercueil(), p, i ? -0.4 : 0.4, 1.1));
    d.ajouter(ELEMENTS_DECOR.toile(1.0), d.coin('g'), 0, 1);
  },
  suintant(d) {
    d.ajouter(ELEMENTS_DECOR.grille(), d.sol(0.35, -0.7), 0.2, 1.3); d.ajouter(ELEMENTS_DECOR.grille(), d.sol(0.7, 0.7), -0.3, 1.2);
    d.cote(0.2).forEach(p => d.ajouter(ELEMENTS_DECOR.tonneauVase(), p, d.alea() * 6, 1.2));
    d.cote(0.85).forEach(p => d.ajouter(ELEMENTS_DECOR.champignons(0xa8ff40, 0x4a8a10), p, d.alea() * 6, 1));
  },
  cote(d) {
    d.ajouter(ELEMENTS_DECOR.flaque(0x2a6a8a, 1.1, 0.55), d.sol(0.4, -0.65));
    d.ajouter(ELEMENTS_DECOR.flaque(0x2a6a8a, 0.8, 0.4), d.sol(0.72, 0.7));
    d.cote(0.2).forEach(p => d.ajouter(ELEMENTS_DECOR.corail(), p, d.alea() * 6, 1.3));
    d.cote(0.75).forEach((p, i) => d.ajouter(i ? ELEMENTS_DECOR.rocher(0x6a706a) : ELEMENTS_DECOR.ancre(), p, d.alea() * 6, 1.2));
    d.cote(0.9).forEach(p => d.ajouter(ELEMENTS_DECOR.coquillages(), p, d.alea() * 6, 1.3));
  }
};

// Revêtement du sol par thème : taches douces (sable, neige, mousse…) sur le dallage
const SOLS_THEMES = {
  crypte: [0x9a8a70, 0.22], grotte: [0x4a6a3a, 0.35], toiles: [0x9a90a8, 0.28], abime: [0x2a5a40, 0.35], volcan: [0x1a1414, 0.45],
  marais: [0x3a4a22, 0.5], givre: [0xf2f8ff, 0.62], desert: [0xd8b070, 0.6], suintant: [0x5a8a2a, 0.3], cote: [0xc8b890, 0.45], sanctuaire: [0x4a2030, 0.2], chateau: [0x2a1018, 0.25]
};
function textureTaches(graine) {
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const x = c.getContext('2d');
  let g = graine || 1;
  const a = () => (g = (g * 9301 + 49297) % 233280) / 233280;
  for (let i = 0; i < 70; i++) {
    const px = a() * 512, py = a() * 512, r = 30 + a() * 90;
    const grad = x.createRadialGradient(px, py, 0, px, py, r);
    grad.addColorStop(0, 'rgba(255,255,255,' + (0.5 + a() * 0.5) + ')'); grad.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = grad; x.beginPath(); x.arc(px, py, r, 0, Math.PI * 2); x.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
function solTheme(nom, centre) {
  const s = SOLS_THEMES[nom];
  if (!s) return null;
  const tex = textureTaches(nom.length * 977);
  tex.repeat.set(3, 3);
  const m = new THREE.MeshStandardMaterial({ color: lin(s[0]), map: tex, transparent: true, opacity: s[1], roughness: 0.95, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 });
  const p = sansContour(new THREE.Mesh(new THREE.PlaneGeometry(22, 22), m));
  p.rotation.x = -Math.PI / 2; p.position.set(centre.x, 0.02, centre.z); p.receiveShadow = true;
  return p;
}

// Construit les éléments du thème. pt(fx, fy) → point au sol sous un pixel (fractions de l'écran)
function construireDecorTheme(scene, nom, pt) {
  const groupe = new THREE.Group();
  const flammes = [];
  let graine = 0;
  for (const ch of nom || '') graine = (graine * 31 + ch.charCodeAt(0)) % 233280;
  const alea = () => (graine = (graine * 9301 + 49297) % 233280) / 233280;
  // fy : 0 = haut de l'écran (fond), 1 = bas (devant)
  const fy = f => 0.12 + f * 0.78;
  const d = {
    alea,
    cote: (f, marge = 0.05) => [pt(marge, fy(f)), pt(1 - marge, fy(f))],
    fond: x => pt(0.5 + x * 0.42, 0.1),
    coin: c => { const p = pt(c === 'g' ? 0.0 : 1.0, 0.04); p.y = 0.1; return p; },
    sol: (f, x) => pt(0.5 + x * 0.42, fy(f)),
    ajouter(objet, p, ry = 0, e = 1) {
      if (!p) return;
      ajouterContours(objet);
      objet.traverse(o => { if (o.isMesh && !o.userData.contour) { o.castShadow = true; o.receiveShadow = true; } });
      objet.position.set(p.x, p.y || 0, p.z);
      objet.rotation.y = ry;
      objet.scale.multiplyScalar(e);
      if (objet.userData.flamme) flammes.push(objet);
      groupe.add(objet);
    }
  };
  const sol = solTheme(nom, pt(0.5, 0.5));
  if (sol) groupe.add(sol);
  const f = DECORS_THEMES[nom];
  if (f) f(d);
  // Toiles d'araignée dans les coins : dressées contre le mur
  groupe.children.forEach(o => { if (o.children[0] && o.children[0].isLineSegments) { o.rotation.x = 0; o.position.y = 0.2; } });
  scene.add(groupe);
  return { groupe, flammes };
}

function animerDecorTheme(d, s, particules) {
  if (!d) return;
  for (const c of d.flammes) {
    if (Math.random() < 0.25) {
      const p = c.localToWorld(c.userData.flamme.clone());
      particules.emettre(p, new THREE.Vector3((Math.random() - 0.5) * 0.15, 0.5 + Math.random() * 0.4, 0), [1, 0.6, 0.25], 0.8, -0.1, 0.04);
    }
  }
}

// ---------------------------------------------------------------- ambiances
// zone : { x: demi-largeur, z0: fond, z1: devant }
const AMBIANCES = {
  givre(e, z, dt) { for (let i = 0; i < 2; i++) if (Math.random() < 0.9) e(new THREE.Vector3((Math.random() * 2 - 1) * z.x, 5, z.z0 + Math.random() * (z.z1 - z.z0)), new THREE.Vector3(0.3 + Math.random() * 0.2, -0.9 - Math.random() * 0.4, 0), [0.85, 0.9, 1], 6, 0, 0.05 + Math.random() * 0.03); },
  volcan(e, z) { if (Math.random() < 0.6) e(new THREE.Vector3((Math.random() * 2 - 1) * z.x, 0.1, z.z0 + Math.random() * (z.z1 - z.z0)), new THREE.Vector3((Math.random() - 0.5) * 0.3, 0.6 + Math.random() * 0.8, 0), [1, 0.45, 0.12], 3, -0.05, 0.05); },
  marais(e, z) { if (Math.random() < 0.18) e(new THREE.Vector3((Math.random() * 2 - 1) * z.x, 0.4 + Math.random() * 1.5, z.z0 + Math.random() * (z.z1 - z.z0)), new THREE.Vector3((Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.2, (Math.random() - 0.5) * 0.3), [0.75, 1, 0.3], 3.5, 0, 0.07); },
  desert(e, z) { if (Math.random() < 0.6) e(new THREE.Vector3(-z.x - 0.5, 0.2 + Math.random() * 2, z.z0 + Math.random() * (z.z1 - z.z0)), new THREE.Vector3(1.5 + Math.random(), (Math.random() - 0.3) * 0.2, 0), [0.6, 0.48, 0.3], 5, 0, 0.035); },
  chateau(e, z) { if (Math.random() < 0.25) e(new THREE.Vector3((Math.random() * 2 - 1) * z.x, 0.1 + Math.random() * 0.4, z.z0 + Math.random() * (z.z1 - z.z0)), new THREE.Vector3(0.15, 0.05, 0), [0.45, 0.2, 0.32], 4, 0, 0.18); },
  suintant(e, z) { if (Math.random() < 0.25) e(new THREE.Vector3((Math.random() * 2 - 1) * z.x, 4, z.z0 + Math.random() * (z.z1 - z.z0) * 0.5), new THREE.Vector3(0, -2, 0), [0.5, 1, 0.25], 2, 2, 0.04); },
  cote(e, z) { if (Math.random() < 0.35) e(new THREE.Vector3((Math.random() * 2 - 1) * z.x, 0.05, z.z0 + Math.random() * (z.z1 - z.z0)), new THREE.Vector3((Math.random() - 0.5) * 0.1, 0.5 + Math.random() * 0.5, 0), [0.6, 0.9, 1], 2.5, -0.05, 0.045); },
  abime(e, z) { if (Math.random() < 0.3) e(new THREE.Vector3((Math.random() * 2 - 1) * z.x, 0.1, z.z0 + Math.random() * (z.z1 - z.z0)), new THREE.Vector3((Math.random() - 0.5) * 0.2, 0.3 + Math.random() * 0.4, 0), [0.3, 1, 0.6], 4, 0, 0.05); },
  toiles(e, z) { if (Math.random() < 0.2) e(new THREE.Vector3((Math.random() * 2 - 1) * z.x, 0.5 + Math.random() * 2, z.z0 + Math.random() * (z.z1 - z.z0)), new THREE.Vector3((Math.random() - 0.5) * 0.1, -0.05, 0), [0.6, 0.55, 0.8], 5, 0, 0.03); },
  grotte(e, z) { if (Math.random() < 0.08) e(new THREE.Vector3((Math.random() * 2 - 1) * z.x, 4, z.z0 + Math.random() * (z.z1 - z.z0)), new THREE.Vector3(0, -3, 0), [0.5, 0.75, 1], 1.4, 3, 0.035); },
  crypte(e, z) { if (Math.random() < 0.15) e(new THREE.Vector3((Math.random() * 2 - 1) * z.x, 0.5 + Math.random() * 2, z.z0 + Math.random() * (z.z1 - z.z0)), new THREE.Vector3((Math.random() - 0.5) * 0.08, 0.04, 0), [0.6, 0.5, 0.35], 5, 0, 0.03); },
  sanctuaire(e, z) { if (Math.random() < 0.2) e(new THREE.Vector3((Math.random() * 2 - 1) * z.x, 0.1, z.z0 + Math.random() * (z.z1 - z.z0)), new THREE.Vector3(0, 0.4 + Math.random() * 0.4, 0), [0.8, 0.4, 1], 3, 0, 0.04); }
};

// ---------------------------------------------------------------- effets de combat
// Texture de cercle magique (runes), dessinée une fois
let TEXTURE_CERCLE = null;
function textureCercle() {
  if (TEXTURE_CERCLE) return TEXTURE_CERCLE;
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const x = c.getContext('2d');
  x.translate(128, 128); x.strokeStyle = '#fff'; x.fillStyle = '#fff';
  x.lineWidth = 6; x.beginPath(); x.arc(0, 0, 118, 0, Math.PI * 2); x.stroke();
  x.lineWidth = 3; x.beginPath(); x.arc(0, 0, 96, 0, Math.PI * 2); x.stroke();
  x.beginPath(); x.arc(0, 0, 52, 0, Math.PI * 2); x.stroke();
  // Étoile à six branches
  x.lineWidth = 3; x.beginPath();
  for (let i = 0; i <= 6; i++) { const a = i / 6 * Math.PI * 2 * 2 - Math.PI / 2; const p = [Math.cos(a) * 96, Math.sin(a) * 96]; i ? x.lineTo(...p) : x.moveTo(...p); }
  x.stroke();
  // Runes entre les deux cercles extérieurs
  x.font = 'bold 18px serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  const runes = 'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊ';
  for (let i = 0; i < 16; i++) { x.save(); x.rotate(i / 16 * Math.PI * 2); x.fillText(runes[i], 0, -107); x.restore(); }
  TEXTURE_CERCLE = new THREE.CanvasTexture(c);
  return TEXTURE_CERCLE;
}

const Effets3D = {
  liste: [],
  // Disque au sol sous un combattant : cercle magique (sort), anneau (soin, onde de choc)
  sol(scene, g, couleur, opts = {}) {
    const m = new THREE.MeshBasicMaterial({ map: opts.anneau ? null : textureCercle(), color: new THREE.Color(...couleur).multiplyScalar(1.8), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    const geo = opts.anneau ? new THREE.RingGeometry(0.78, 1, 48) : new THREE.PlaneGeometry(2, 2);
    const mesh = new THREE.Mesh(geo, m);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.copy(g.position); mesh.position.y = 0.05;
    scene.add(mesh);
    this.liste.push({ mesh, t0: performance.now(), duree: opts.duree || 900, type: opts.anneau ? 'anneau' : 'cercle', taille: (opts.taille || 0.8) * g.scale.y, rotation: opts.rotation ?? 1.5 });
  },
  // Entaille : arc lumineux face à la caméra sur la cible d'un coup au corps à corps
  entaille(scene, g, camera, couleur = [1, 0.95, 0.85]) {
    const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(...couleur).multiplyScalar(2), transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, depthTest: false });
    const mesh = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.07, 6, 24, Math.PI * 0.75), m);
    mesh.position.copy(g.position); mesh.position.y += 0.85 * g.scale.y;
    mesh.quaternion.copy(camera.quaternion);
    mesh.rotateZ(Math.random() * Math.PI * 2);
    mesh.scale.setScalar(g.scale.y);
    scene.add(mesh);
    this.liste.push({ mesh, t0: performance.now(), duree: 320, type: 'entaille', taille: g.scale.y });
  },
  // Bouffée de poussière (mort d'un monstre) : sprites opaques qui gonflent et s'effacent
  poussiere(scene, g) {
    for (let i = 0; i < 9; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: texturePoint(), color: 0x8a7a6a, transparent: true, opacity: 0.55, depthWrite: false }));
      const a = i / 9 * Math.PI * 2;
      sp.position.set(g.position.x + Math.cos(a) * 0.3, 0.2 + Math.random() * 0.3, g.position.z + Math.sin(a) * 0.2);
      sp.scale.setScalar(0.4);
      scene.add(sp);
      this.liste.push({ mesh: sp, t0: performance.now(), duree: 900 + Math.random() * 300, type: 'poussiere', v: new THREE.Vector3(Math.cos(a) * 0.6, 0.3 + Math.random() * 0.3, Math.sin(a) * 0.4) });
    }
  },
  maj(scene, dt) {
    const now = performance.now();
    this.liste = this.liste.filter(e => {
      const k = (now - e.t0) / e.duree;
      if (k >= 1) { scene.remove(e.mesh); e.mesh.material.dispose(); if (e.mesh.geometry) e.mesh.geometry.dispose(); return false; }
      const m = e.mesh;
      if (e.type === 'cercle') {
        m.scale.setScalar(e.taille * (0.6 + Math.min(1, k * 3) * 0.4));
        m.rotation.z += dt * e.rotation;
        m.material.opacity = Math.min(1, k * 5) * (1 - Math.max(0, (k - 0.6) / 0.4)) * 0.9;
      } else if (e.type === 'anneau') {
        m.scale.setScalar(e.taille * (0.3 + k * 1.6));
        m.material.opacity = (1 - k) * 0.9;
      } else if (e.type === 'entaille') {
        m.scale.setScalar(e.taille * (0.7 + k * 0.6));
        m.material.opacity = 1 - k;
      } else if (e.type === 'poussiere') {
        m.position.addScaledVector(e.v, dt);
        m.scale.setScalar(0.4 + k * 0.9);
        m.material.opacity = 0.55 * (1 - k);
      }
      return true;
    });
  }
};
