// =====================================================================
// Scène 3D « cartoon » : diorama de donjon + personnages animés.
//
// Un canvas WebGL occupe toute la scène de combat, derrière les cartes HTML
// (noms, PV, états). Chaque carte reste la référence : le point au pied de sa
// figure est projeté sur le sol 3D et le personnage y est placé. Les
// animations CSS des cartes (élan, respiration) déplacent donc la figurine.
//
// Personnages et décor : modèles KayKit (voir ressources3d.js). En attendant
// leur chargement, ou sans eux, des figurines dessinées en code (FIGURINES)
// les remplacent. Sans WebGL, le jeu garde les emojis.
// =====================================================================

const Modeles3D = {
  actif: false,
  renderer: null, scene: null, camera: null,
  cache: new Map(),        // clé → THREE.Group (figurine)
  parId: {},               // id du combattant → groupe affiché
  flashs: {},
  enCours: false,
  taille: { w: 0, h: 0 },
  decor: null,
  decorKK: null,
  particules: null,
  projectiles: [],
  secousseForce: 0,

  init() {
    try {
      if (!window.THREE) return false;
      const r = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
      r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      r.setClearColor(0x0e0a08, 1);
      r.outputEncoding = THREE.sRGBEncoding;
      r.shadowMap.enabled = true;
      r.shadowMap.type = THREE.PCFSoftShadowMap;
      r.domElement.className = 'canvas3d';
      this.renderer = r;
      this.couleurTmp = new THREE.Color();
      this.horloge = performance.now();

      const sc = new THREE.Scene();
      sc.fog = new THREE.Fog(0x0e0a08, 15, 30);
      this.scene = sc;
      sc.add(new THREE.HemisphereLight(0xffe2c0, 0x2a1a12, 0.38));
      const cle = new THREE.DirectionalLight(0xfff0dd, 0.62);
      cle.position.set(2.5, 9, 5);
      cle.castShadow = true;
      cle.shadow.mapSize.set(1024, 1024);
      cle.shadow.camera.left = -9; cle.shadow.camera.right = 9;
      cle.shadow.camera.top = 9; cle.shadow.camera.bottom = -9;
      cle.shadow.camera.near = 1; cle.shadow.camera.far = 25;
      cle.shadow.bias = -0.0015;
      sc.add(cle);
      sc.add(cle.target);
      const contre = new THREE.DirectionalLight(0x8fa8ff, 0.35);
      contre.position.set(-4, 5, -6);
      sc.add(contre);

      this.camera = new THREE.PerspectiveCamera(34, 1, 0.1, 60);
      this.posCamera = new THREE.Vector3(0, 8.2, 9.6);
      this.camera.position.copy(this.posCamera);
      this.camera.lookAt(0, 0, -0.3);
      this.camera.updateMatrixWorld();

      this.ray = new THREE.Raycaster();
      this.sol = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      this.decor = construireDecor(sc);
      this.particules = new Particules(sc);
      this.actif = true;
      document.body.classList.add('mode3d');
      // Modèles animés en arrière-plan
      if (THREE.GLTFLoader && THREE.SkeletonUtils) {
        Ressources3D.quandPret.push(() => { this.taille = { w: 0, h: 0 }; });
        Ressources3D.charger();
      }
      return true;
    } catch (e) {
      console.warn('3D indisponible', e);
      this.actif = false;
      return false;
    }
  },

  attacher(sceneEl) {
    if (!this.actif || !sceneEl) return;
    sceneEl.prepend(this.renderer.domElement);
    this.taille = { w: 0, h: 0 };
    if (!this.enCours) {
      this.enCours = true;
      this.dernier = performance.now();
      requestAnimationFrame(t => this.boucle(t));
    }
  },

  flash(id, couleur) { if (this.actif) this.flashs[id] = { t0: performance.now(), couleur }; },

  secousse(f) { this.secousseForce = Math.max(this.secousseForce, f); },

  // Joue une animation sur un combattant : attaque, tir, sort, soutien, coup, esquive, bloque, potion, invoque, victoire
  anim(id, type) {
    const g = this.parId[id];
    if (!g || !g.userData.mixer) return;
    jouerAnim(g.userData, type, true);
  },

  // Tourne un combattant vers un autre pendant son action
  regarder(id, cibleId) {
    const g = this.parId[id], c = this.parId[cibleId];
    if (!g || !c || g === c) return;
    g.userData.regard = { yaw: Math.atan2(c.position.x - g.position.x, c.position.z - g.position.z), jusqu: performance.now() + 1500 };
  },

  // Projectile magique ou flèche entre deux combattants
  projectile(sourceId, cibleId, style) {
    const a = this.parId[sourceId], b = this.parId[cibleId];
    if (!a || !b || !this.actif) return;
    const couleur = COULEURS_DEGATS[style] || [1, 1, 1];
    const fleche = style === 'perforant' || style === 'tranchant' || style === 'contondant';
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: texturePoint(), color: new THREE.Color(...couleur), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    const t = fleche ? 0.18 : 0.55 * a.scale.y;
    sp.scale.set(t, t, 1);
    this.scene.add(sp);
    const depart = a.position.clone(); depart.y += 0.95 * a.scale.y;
    const arrivee = b.position.clone(); arrivee.y += 0.85 * b.scale.y;
    this.projectiles.push({ sp, depart, arrivee, t0: performance.now(), duree: fleche ? 280 : 380, couleur, fleche });
  },

  // Colonne de lumière (soin, sort à jet de sauvegarde)
  colonne(id, style) {
    const g = this.parId[id];
    if (!g || !this.actif) return;
    const couleur = COULEURS_DEGATS[style] || [0.5, 1, 0.6];
    for (let i = 0; i < 26; i++) {
      const p = g.position.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.7 * g.scale.y, 2.4 * g.scale.y + Math.random() * 0.6, (Math.random() - 0.5) * 0.7 * g.scale.y));
      this.particules.emettre(p, new THREE.Vector3(0, -3.5 * g.scale.y, 0), couleur, 0.55, 0, 0.16);
    }
    this.effet(id, style === 'soin' ? 'soin' : 'sort', couleur);
  },

  // Effets de particules sur un combattant : 'coup', 'crit', 'soin', 'sort'
  effet(id, type, couleurForcee) {
    if (!this.actif) return;
    const g = this.parId[id];
    if (!g) return;
    const p = g.position.clone();
    p.y += 0.9 * g.scale.y;
    const n = { coup: 14, crit: 34, soin: 18, sort: 14 }[type] || 10;
    const couleur = couleurForcee || { coup: [1, 0.45, 0.2], crit: [1, 0.85, 0.3], soin: [0.4, 1, 0.5], sort: [0.5, 0.65, 1] }[type];
    for (let i = 0; i < n; i++) {
      const v = type === 'soin'
        ? new THREE.Vector3((Math.random() - 0.5) * 0.8, 1.2 + Math.random() * 1.2, (Math.random() - 0.5) * 0.8)
        : new THREE.Vector3((Math.random() - 0.5) * 4, Math.random() * 3.2, (Math.random() - 0.5) * 4);
      const depart = p.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.6, (Math.random() - 0.5) * 0.4));
      this.particules.emettre(depart, v.multiplyScalar(g.scale.y), couleur, type === 'crit' ? 0.9 : 0.6, type === 'soin' ? -0.6 : 6, type === 'crit' ? 0.22 : 0.15);
    }
  },

  victoire(ids) { ids.forEach(id => this.anim(id, 'victoire')); },

  // Ambiance de l'étage : brouillard, teinte du sol, couleur des lumières
  theme(nom) {
    if (!this.actif) return;
    const t = THEMES_3D[nom] || THEMES_3D.crypte;
    this.themeCourant = t;
    this.scene.fog.color.setHex(t.brouillard);
    this.renderer.setClearColor(t.brouillard, 1);
    this.scene.children.forEach(o => { if (o.isHemisphereLight) { o.color.setHex(t.ciel); o.intensity = t.ambiance; } });
    this.decor.braseros.forEach(b => b.userData.lum.color.setHex(t.flamme));
    this.taille = { w: 0, h: 0 };   // reconstruit le décor
  },

  // Point du sol sous un pixel du canvas
  pointSol(px, py) {
    const ndc = new THREE.Vector2(px / this.taille.w * 2 - 1, -(py / this.taille.h * 2 - 1));
    this.ray.setFromCamera(ndc, this.camera);
    const out = new THREE.Vector3();
    return this.ray.ray.intersectPlane(this.sol, out) ? out : null;
  },

  obtenir(cle, modele) {
    let g = this.cache.get(cle);
    if (g) return g;
    g = new THREE.Group();
    const glb = construireGLB(modele);
    let corps;
    if (glb) {
      corps = new THREE.Group();
      corps.add(glb.objet);
    } else {
      corps = (FIGURINES[modele] || FIGURINES.inconnu)();
      ajouterContours(corps);
      corps.traverse(o => { if (o.isMesh && !o.userData.contour) o.castShadow = true; });
    }
    g.add(corps);
    const anneau = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.62, 32), new THREE.MeshBasicMaterial({ color: 0xffd98a, transparent: true, opacity: 0.9, depthWrite: false }));
    anneau.rotation.x = -Math.PI / 2;
    anneau.position.y = 0.03;
    anneau.visible = false;
    anneau.material.userData.anneau = true;
    g.add(anneau);
    g.userData = { corps, anneau, mats: [], phase: Math.random() * 6, chute: 0, modele, etat: 'debout', yaw: null };
    if (glb) {
      Object.assign(g.userData, { mixer: glb.mixer, anims: glb.anims });
      glb.mixer.addEventListener('finished', e => finAnim(g.userData, e.action));
      jouerBase(g.userData, true);
    }
    g.traverse(o => { if (o.material) g.userData.mats.push(o.material); });
    this.scene.add(g);
    this.cache.set(cle, g);
    return g;
  },

  liberer(g) {
    this.scene.remove(g);
    const glb = !!g.userData.mixer;
    if (glb) g.userData.mixer.stopAllAction();
    g.traverse(o => {
      if (o.material) o.material.dispose();
      if (o.geometry && !glb && !o.userData.contour) o.geometry.dispose();
    });
  },

  redimensionner(w, h) {
    this.taille = { w, h };
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.camera.position.copy(this.posCamera);
    this.camera.updateMatrixWorld();
    const pt = (x, y) => this.pointSol(x * w, y * h) || new THREE.Vector3();
    placerDecor(this.decor, { g: pt(0.06, 0.5), d: pt(0.94, 0.5), hg: pt(0.02, 0.06), hd: pt(0.98, 0.06), bg: pt(0.02, 0.97), bd: pt(0.98, 0.97), c: pt(0.5, 0.5) });
    // Décor KayKit : reconstruit d'après le cadrage
    if (Ressources3D.gltf.donjon) {
      if (this.decorKK) { this.scene.remove(this.decorKK.groupe); }
      const zMur = pt(0.5, 0.03).z - 0.2;
      const bords = z => this.largeurA(z);
      this.decorKK = construireDecorKK(this.scene, zMur, bords, this.themeCourant || THEMES_3D.crypte);
      this.decor.piliers.forEach(p => { p.visible = false; });
      this.decor.front.visible = false;
      this.decor.solProc.visible = false;
    }
  },

  // Demi-largeur visible du sol à la profondeur z
  largeurA(z) {
    let ybas = 0, yhaut = this.taille.h;
    for (let i = 0; i < 20; i++) {          // recherche de la ligne d'écran qui touche ce z
      const ym = (ybas + yhaut) / 2;
      const p = this.pointSol(this.taille.w / 2, ym);
      if (!p || p.z < z) ybas = ym; else yhaut = ym;
    }
    const p = this.pointSol(0, (ybas + yhaut) / 2);
    return p ? Math.abs(p.x) : 3;
  },

  boucle(t) {
    const canvas = this.renderer.domElement;
    if (!canvas.isConnected) {
      this.enCours = false;
      for (const g of this.cache.values()) this.liberer(g);
      this.cache.clear();
      this.parId = {};
      return;
    }
    requestAnimationFrame(tt => this.boucle(tt));
    const dt = Math.min(0.05, (t - this.dernier) / 1000);
    this.dernier = t;
    const zone = canvas.getBoundingClientRect();
    if (!zone.width || !zone.height) return;
    if (Math.abs(this.taille.w - zone.width) > 0.5 || Math.abs(this.taille.h - zone.height) > 0.5) this.redimensionner(zone.width, zone.height);

    const s = t / 1000;
    const vus = new Set();
    this.parId = {};
    const tanFov = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    const glbPret = !!Ressources3D.gltf.skeleton_warrior;

    for (const el of canvas.parentElement.querySelectorAll('.combattant')) {
      const fig = el.querySelector('.figure'), spr = el.querySelector('.sprite');
      if (!fig || !spr) continue;
      const aTerre = el.classList.contains('a-terre'), mort = el.classList.contains('mort');
      let modele = el.dataset.modele;
      const anime = glbPret && PERSOS3D[modele] && Ressources3D.gltf[PERSOS3D[modele].glb];
      if (!anime && aTerre) modele = 'tombe';
      const cle = el.dataset.id + ':' + modele + (anime ? ':a' : '');
      vus.add(cle);
      const g = this.obtenir(cle, modele);
      this.parId[el.dataset.id] = g;
      const u = g.userData;

      // Position : pied de la figure (avec le décalage des animations CSS)
      const fr = fig.getBoundingClientRect(), sr = spr.getBoundingClientRect();
      const dx = (sr.left + sr.width / 2) - (fr.left + fr.width / 2);
      const dy = (sr.top + sr.height / 2) - (fr.top + fr.height / 2);
      const p = this.pointSol(fr.left + fr.width / 2 + dx - zone.left, fr.bottom + dy - zone.top - 2);
      if (!p) { g.visible = false; continue; }
      g.position.copy(p);
      const boss = el.classList.contains('boss');
      const hPx = fr.height * (boss ? 1.6 : 1.75);
      const mondeParPx = 2 * this.camera.position.distanceTo(p) * tanFov / this.taille.h;
      g.scale.setScalar(hPx * mondeParPx / 1.75 * (anime ? 1.05 : 0.95));
      u.derniere = { pos: g.position.clone(), echelle: g.scale.x };

      const pj = el.classList.contains('pj');
      const actif = el.classList.contains('actif');
      const c = u.corps;

      // Orientation : héros de trois quarts vers les ennemis, ennemis vers les héros
      let base = pj ? 2.15 : 0.2;
      if (u.modele === 'loup') base = pj ? base : 0.8;
      if (!anime && aTerre) base = 0;
      if (u.regard && performance.now() < u.regard.jusqu) base = u.regard.yaw;
      if (u.yaw === null) u.yaw = base;
      let diff = ((base - u.yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      u.yaw += diff * Math.min(1, dt * 8);
      c.rotation.y = u.yaw;

      if (anime) {
        // États : à terre / mort / debout
        if ((aTerre || mort) && u.etat === 'debout') { u.etat = mort ? 'mort' : 'aterre'; u.tMort = performance.now(); jouerAnim(u, 'mort', false); }
        if (!aTerre && !mort && u.etat === 'aterre') { u.etat = 'debout'; jouerAnim(u, 'releve', true); }
        u.mixer.update(dt * Reglages.vitesse);
        c.position.y = u.modele === 'morvagne' && u.etat === 'debout' ? 0.15 + Math.sin(s * 1.6) * 0.06 : 0;
      } else {
        const tombe = modele === 'tombe';
        const rebond = tombe ? 0 : (actif ? Math.abs(Math.sin(s * 5)) * 0.12 : Math.abs(Math.sin(s * 2 + u.phase)) * 0.025);
        c.position.y = rebond + (u.modele === 'morvagne' ? 0.18 + Math.sin(s * 1.6) * 0.07 : 0);
        const ecrase = tombe ? 0 : Math.sin(s * (actif ? 10 : 4) + u.phase) * (actif ? 0.04 : 0.02);
        c.scale.set(1 - ecrase * 0.5, 1 + ecrase, 1 - ecrase * 0.5);
        if (mort) u.chute = Math.min(1, u.chute + dt * 3);
        c.rotation.x = -u.chute * Math.PI / 2;
      }
      c.position.x = el.classList.contains('panique') ? Math.sin(s * 45) * 0.03 : 0;

      // Anneau au sol
      const an = u.anneau;
      const ciblable = el.classList.contains('ciblable'), enZone = el.classList.contains('en-zone');
      an.visible = (actif || ciblable || enZone) && !mort;
      an.material.color.setHex(ciblable ? 0xff6a4a : enZone ? 0xffb04a : 0xffd98a);
      an.scale.setScalar(ciblable ? 1 + Math.sin(s * 6) * 0.08 : 1);

      // Opacité : bande hors de portée ; mort = fondu après l'animation de chute
      const bande = el.closest('.rangee-scene');
      let opacite = bande ? parseFloat(getComputedStyle(bande).opacity) : 1;
      if (anime) {
        if (u.etat === 'mort') opacite *= fonduMort(u);
      } else opacite *= parseFloat(getComputedStyle(el).opacity);
      this.appliquerMateriaux(g, el.dataset.id, opacite);
    }
    // Les morts qui ont quitté l'écran finissent leur chute puis s'effacent
    for (const [cle, g] of this.cache) {
      if (vus.has(cle)) continue;
      const u = g.userData;
      if (u.etat === 'mort' && u.mixer && fonduMort(u) > 0.01) {
        g.position.copy(u.derniere.pos);
        u.mixer.update(dt);
        this.appliquerMateriaux(g, null, fonduMort(u));
        continue;
      }
      this.liberer(g);
      this.cache.delete(cle);
    }

    this.majProjectiles();
    animerDecor(this.decor, s, this.particules);
    animerDecorKK(this.decorKK, s, this.particules);
    this.particules.maj(dt);

    // Secousse de caméra (critiques)
    if (this.secousseForce > 0.001) {
      const f = this.secousseForce;
      this.camera.position.set(this.posCamera.x + (Math.random() - 0.5) * f, this.posCamera.y + (Math.random() - 0.5) * f, this.posCamera.z + (Math.random() - 0.5) * f * 0.5);
      this.secousseForce *= Math.pow(0.02, dt);
    } else this.camera.position.copy(this.posCamera);
    this.renderer.render(this.scene, this.camera);
  },

  appliquerMateriaux(g, id, opacite) {
    const u = g.userData;
    const f = id && this.flashs[id];
    let intensite = 0, couleur = 0;
    if (f) {
      const age = (performance.now() - f.t0) / 1000;
      if (age < 0.45) { intensite = 1 - age / 0.45; couleur = f.couleur; } else delete this.flashs[id];
    }
    for (const m of u.mats) {
      if (m.userData.anneau) { m.opacity = 0.85 * opacite; continue; }
      if (m.emissive) {
        if (!m.userData.emissiveBase) m.userData.emissiveBase = m.emissive.clone();
        m.emissive.copy(m.userData.emissiveBase);
        if (intensite > 0) m.emissive.lerp(this.couleurTmp.setHex(couleur), intensite * 0.8);
      }
      const transp = opacite < 0.99;
      if (m.transparent !== transp) { m.transparent = transp; m.needsUpdate = true; }
      m.opacity = opacite;
    }
    g.visible = opacite > 0.02;
  },

  majProjectiles() {
    const now = performance.now();
    this.projectiles = this.projectiles.filter(pr => {
      const k = Math.min(1, (now - pr.t0) / pr.duree);
      const pos = pr.depart.clone().lerp(pr.arrivee, k);
      pos.y += Math.sin(k * Math.PI) * (pr.fleche ? 0.35 : 0.25);
      pr.sp.position.copy(pos);
      if (!pr.fleche || Math.random() < 0.5) this.particules.emettre(pos, new THREE.Vector3((Math.random() - 0.5) * 0.4, (Math.random() - 0.2) * 0.4, (Math.random() - 0.5) * 0.4), pr.couleur, pr.fleche ? 0.15 : 0.35, 0, pr.fleche ? 0.05 : 0.14);
      if (k >= 1) {
        this.scene.remove(pr.sp);
        pr.sp.material.dispose();
        if (!pr.fleche) for (let i = 0; i < 16; i++) this.particules.emettre(pr.arrivee, new THREE.Vector3((Math.random() - 0.5) * 3, Math.random() * 2.5, (Math.random() - 0.5) * 3), pr.couleur, 0.5, 5, 0.16);
        return false;
      }
      return true;
    });
  }
};

const THEMES_3D = {
  crypte: { brouillard: 0x0e0a08, ciel: 0xffe2c0, ambiance: 0.38, sol: 0x8f8072, flamme: 0xff9a40 },
  grotte: { brouillard: 0x08100e, ciel: 0xb8e0d0, ambiance: 0.33, sol: 0x6f7a62, flamme: 0x9aff7a },
  sanctuaire: { brouillard: 0x12060c, ciel: 0xffb0c8, ambiance: 0.36, sol: 0x8a6a72, flamme: 0xd070ff }
};

const COULEURS_DEGATS = {
  feu: [1, 0.5, 0.12], froid: [0.55, 0.9, 1], force: [0.85, 0.45, 1], radiant: [1, 0.88, 0.45], 'nécrotique': [0.45, 1, 0.5],
  psychique: [0.95, 0.4, 1], tonnerre: [0.6, 0.75, 1], poison: [0.6, 1, 0.3], perforant: [1, 0.95, 0.8], tranchant: [1, 0.95, 0.8], contondant: [1, 0.95, 0.8], soin: [0.45, 1, 0.55]
};

// --- Animations des personnages KayKit ---
function jouerAnim(u, type, retourAuto) {
  const clip = Ressources3D.clip(u.anims[type]);
  if (!clip || !u.mixer) return;
  const a = u.mixer.clipAction(clip);
  a.reset();
  a.setLoop(THREE.LoopOnce, 1);
  a.clampWhenFinished = true;
  a.timeScale = type === 'mort' || type === 'releve' ? 1 : 1.25;
  a.enabled = true;
  if (u.action && u.action !== a) a.crossFadeFrom(u.action, 0.12, false);
  a.play();
  u.action = a;
  u.retourAuto = retourAuto;
}
function jouerBase(u, immediat) {
  const nom = u.etat === 'debout' ? u.anims.idle : u.anims.poseMort;
  const clip = Ressources3D.clip(nom) || Ressources3D.clip('Idle');
  if (!clip) return;
  const a = u.mixer.clipAction(clip);
  a.reset();
  a.setLoop(u.etat === 'debout' ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
  a.clampWhenFinished = true;
  a.timeScale = 1;
  a.enabled = true;
  if (!immediat && u.action && u.action !== a) a.crossFadeFrom(u.action, 0.2, false);
  if (u.etat === 'debout') a.time = Math.random() * clip.duration;
  a.play();
  u.action = a;
  u.retourAuto = false;
}
function finAnim(u, action) {
  if (action !== u.action) return;
  if (u.retourAuto || u.etat !== 'debout') { if (u.retourAuto) jouerBase(u, false); }
}
function fonduMort(u) {
  const age = (performance.now() - (u.tMort || 0)) / 1000;
  return age < 1.6 ? 1 : Math.max(0, 1 - (age - 1.6) / 0.6);
}

// ---------------------------------------------------------------------
// Matériaux cartoon : ombrage en 3 aplats + contour noir
// ---------------------------------------------------------------------
let DEGRADE_TOON = null;
function degradeToon() {
  if (!DEGRADE_TOON) {
    const d = new Uint8Array([70, 70, 70, 255, 150, 150, 150, 255, 225, 225, 225, 255]);
    DEGRADE_TOON = new THREE.DataTexture(d, 3, 1, THREE.RGBAFormat);
    DEGRADE_TOON.magFilter = THREE.NearestFilter;
    DEGRADE_TOON.minFilter = THREE.NearestFilter;
    DEGRADE_TOON.needsUpdate = true;
  }
  return DEGRADE_TOON;
}
function mat(couleur, o = {}) {
  return new THREE.MeshToonMaterial({ color: couleur, gradientMap: degradeToon(), emissive: o.lueur ?? 0x000000 });
}
function compilerContour(sh) {
  sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', 'vec3 transformed = position + normalize(normal) * 0.028;');
}
function ajouterContours(racine) {
  const meshes = [];
  racine.traverse(o => { if (o.isMesh && !o.userData.sansContour && !o.userData.contour) meshes.push(o); });
  for (const m of meshes) {
    const cm = new THREE.MeshBasicMaterial({ color: 0x140c08, side: THREE.BackSide });
    cm.onBeforeCompile = compilerContour;
    const c = new THREE.Mesh(m.geometry, cm);
    c.userData.contour = true;
    m.add(c);
  }
}

// ---------------------------------------------------------------------
// Briques de modélisation
// ---------------------------------------------------------------------
function P(mesh, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx, sy, sz) {
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, rz);
  if (sx !== undefined) mesh.scale.set(sx, sy ?? sx, sz ?? sx);
  return mesh;
}
const F = {
  boite: (w, h, d, m, ...p) => P(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m), ...p),
  cyl: (rh, rb, h, m, ...p) => P(new THREE.Mesh(new THREE.CylinderGeometry(rh, rb, h, 16), m), ...p),
  boule: (r, m, ...p) => P(new THREE.Mesh(new THREE.SphereGeometry(r, 18, 14), m), ...p),
  calotte: (r, m, ...p) => P(new THREE.Mesh(new THREE.SphereGeometry(r, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), m), ...p),
  cone: (r, h, m, ...p) => P(new THREE.Mesh(new THREE.ConeGeometry(r, h, 14), m), ...p),
  capsule: (r, l, m, ...p) => P(new THREE.Mesh(new THREE.CapsuleGeometry(r, l, 4, 10), m), ...p),
  tore: (r, t, m, arc = Math.PI * 2, ...p) => P(new THREE.Mesh(new THREE.TorusGeometry(r, t, 8, 24, arc), m), ...p)
};
function G(...e) { const g = new THREE.Group(); e.flat().forEach(x => g.add(x)); return g; }
function sansContour(m) { m.userData.sansContour = true; return m; }

// Grands yeux de dessin animé : blanc, pupille, reflet
function yeuxMignons(y, z, ecart = 0.12, r = 0.075, pupille = 0x1a1210) {
  const un = () => G(
    F.boule(r, mat(0xffffff), 0, 0, 0, 0, 0, 0, 0.85, 1.1, 0.6),
    sansContour(F.boule(r * 0.6, mat(pupille), 0, -r * 0.05, r * 0.38, 0, 0, 0, 1, 1.15, 0.6)),
    sansContour(F.boule(r * 0.28, new THREE.MeshBasicMaterial({ color: 0xffffff }), r * 0.2, r * 0.25, r * 0.6))
  );
  const g1 = un(); g1.position.set(-ecart, y, z);
  const g2 = un(); g2.position.set(ecart, y, z);
  return G(g1, g2);
}
// Yeux qui brillent (monstres)
function yeuxLueur(y, z, ecart, r, couleur, lueur) {
  return G(sansContour(F.boule(r, mat(couleur, { lueur }), -ecart, y, z, 0, 0, 0, 1, 0.75, 0.6)), sansContour(F.boule(r, mat(couleur, { lueur }), ecart, y, z, 0, 0, 0, 1, 0.75, 0.6)));
}
// Sourcils (expression : positif = colère)
function sourcils(y, z, ecart, couleur, colere = 0.35) {
  return G(F.boite(0.13, 0.035, 0.03, mat(couleur), -ecart, y, z, 0, 0, -colere), F.boite(0.13, 0.035, 0.03, mat(couleur), ecart, y, z, 0, 0, colere));
}

const PEAU = 0xf1c09a;

// ---------------------------------------------------------------------
// Les figurines (style chibi : grosse tête, petit corps)
// ---------------------------------------------------------------------
const FIGURINES = {
  guerrier() {
    const acier = mat(0x7c9cc8), acierS = mat(0x4f6a92), peau = mat(PEAU), rouge = mat(0xd23a2e), or = mat(0xf2b84a), cuir = mat(0x7a4a2a), lame = mat(0xe6eef8);
    return G(
      F.capsule(0.1, 0.22, acierS, -0.11, 0.2, 0), F.capsule(0.1, 0.22, acierS, 0.11, 0.2, 0),
      F.cyl(0.25, 0.28, 0.4, acier, 0, 0.55, 0),
      F.cyl(0.29, 0.29, 0.07, cuir, 0, 0.4, 0),
      F.boite(0.07, 0.07, 0.03, or, 0, 0.4, 0.29),
      F.boule(0.13, acier, -0.29, 0.72, 0, 0, 0, 0, 1, 0.8, 1), F.boule(0.13, acier, 0.29, 0.72, 0, 0, 0, 0, 1, 0.8, 1),
      F.capsule(0.07, 0.18, acier, -0.32, 0.53, 0.04, 0, 0, 0.15), F.capsule(0.07, 0.18, acier, 0.32, 0.53, 0.08, -0.4, 0, -0.15),
      F.boule(0.34, peau, 0, 1.08, 0),
      F.calotte(0.36, acier, 0, 1.12, 0),
      F.cyl(0.37, 0.37, 0.06, acierS, 0, 1.12, 0),
      F.boite(0.05, 0.2, 0.05, acierS, 0, 1.13, 0.35),
      F.cone(0.07, 0.34, rouge, 0, 1.6, -0.08, -0.5, 0, 0),
      yeuxMignons(1.03, 0.29, 0.13, 0.07),
      sourcils(1.14, 0.32, 0.13, 0x5a3820, -0.15),
      // bouclier
      G(F.cyl(0.3, 0.3, 0.06, rouge, 0, 0, 0, Math.PI / 2, 0, 0), F.tore(0.3, 0.03, or, undefined, 0, 0, 0.02), F.cyl(0.09, 0.09, 0.08, or, 0, 0, 0.03, Math.PI / 2, 0, 0)).translateX(-0.44).translateY(0.6).translateZ(0.12),
      // épée
      G(F.boite(0.07, 0.62, 0.03, lame, 0, 0.36, 0), F.boite(0.26, 0.05, 0.07, or, 0, 0.04, 0), F.capsule(0.03, 0.1, cuir, 0, -0.06, 0), F.boule(0.04, or, 0, -0.14, 0))
        .translateX(0.38).translateY(0.62).translateZ(0.2)
    );
  },

  clerc() {
    const robe = mat(0xf4efe2), bleu = mat(0x3e6cc0), or = mat(0xf2b84a), peau = mat(PEAU), cheveux = mat(0x8a5a32), fer = mat(0x9aa2ae), bois = mat(0x7a4a2a);
    return G(
      F.cyl(0.24, 0.4, 0.62, robe, 0, 0.31, 0),
      F.tore(0.4, 0.035, or, undefined, 0, 0.03, 0, Math.PI / 2, 0, 0),
      F.boite(0.14, 0.62, 0.04, bleu, -0.09, 0.4, 0.3, -0.18, 0, 0.05), F.boite(0.14, 0.62, 0.04, bleu, 0.09, 0.4, 0.3, -0.18, 0, -0.05),
      F.boule(0.14, robe, -0.27, 0.66, 0, 0, 0, 0, 1, 0.85, 1), F.boule(0.14, robe, 0.27, 0.66, 0, 0, 0, 0, 1, 0.85, 1),
      F.capsule(0.08, 0.16, robe, -0.31, 0.48, 0.06, -0.3, 0, 0.2), F.capsule(0.08, 0.16, robe, 0.31, 0.48, 0.1, -0.6, 0, -0.2),
      G(F.boite(0.16, 0.05, 0.03, or), F.boite(0.05, 0.22, 0.03, or, 0, -0.03, 0)).translateY(0.62).translateZ(0.27),
      F.boule(0.34, peau, 0, 1.05, 0),
      F.calotte(0.355, cheveux, 0, 1.07, -0.02, -0.25, 0, 0),
      yeuxMignons(1.0, 0.29, 0.13, 0.07, 0x2a4a8a),
      sourcils(1.11, 0.32, 0.13, 0x6a4020, 0.05),
      sansContour(F.tore(0.22, 0.025, mat(0xffe28a, { lueur: 0xc89a20 }), undefined, 0, 1.52, -0.05, Math.PI / 2.4, 0, 0)),
      // masse
      G(F.capsule(0.03, 0.4, bois), F.boule(0.11, fer, 0, 0.3, 0), ...[0, 1, 2, 3, 4, 5].map(i => F.cone(0.035, 0.09, fer, Math.cos(i) * 0.11, 0.3 + (i % 2 ? 0.05 : -0.05), Math.sin(i) * 0.11, 0, 0, Math.PI / 2 * (i % 2 ? 1 : -1))))
        .translateX(0.38).translateY(0.5).translateZ(0.24)
    );
  },

  roublard() {
    const cape = mat(0x2e6b45), capeS = mat(0x1f4a30), peau = mat(PEAU), cuir = mat(0x5a3a24), masque = mat(0x22262c), lame = mat(0xdfe6ee), bois = mat(0x9a6a3a), or = mat(0xf2b84a);
    const dague = x => G(F.boite(0.05, 0.26, 0.02, lame, 0, 0.13, 0), F.boite(0.13, 0.03, 0.04, or), F.capsule(0.025, 0.06, cuir, 0, -0.05, 0)).translateX(x).translateY(0.42).translateZ(0.34).rotateX(-1);
    return G(
      F.capsule(0.09, 0.22, cuir, -0.1, 0.2, 0), F.capsule(0.09, 0.22, cuir, 0.1, 0.2, 0),
      F.cyl(0.22, 0.34, 0.55, cape, 0, 0.5, -0.02),
      F.cyl(0.22, 0.24, 0.32, cuir, 0, 0.55, 0.03),
      F.boite(0.48, 0.05, 0.05, mat(0x8a5a2a), 0, 0.58, 0.18, 0, 0, 0.6),
      F.capsule(0.07, 0.18, cuir, -0.3, 0.52, 0.12, -0.7, 0, 0.2), F.capsule(0.07, 0.18, cuir, 0.3, 0.52, 0.12, -0.7, 0, -0.2),
      F.boule(0.33, peau, 0, 1.03, 0),
      F.boule(0.38, capeS, 0, 1.07, -0.06, 0, 0, 0, 1, 1, 0.95),
      F.cone(0.16, 0.3, capeS, 0, 1.42, -0.2, -0.9, 0, 0),
      F.boite(0.5, 0.12, 0.05, masque, 0, 0.92, 0.3),
      yeuxMignons(1.03, 0.29, 0.12, 0.065, 0x2a6a3a),
      sourcils(1.13, 0.32, 0.12, 0x2a1a10, 0.35),
      dague(-0.34), dague(0.34),
      F.tore(0.38, 0.025, bois, Math.PI, 0, 0.7, -0.3, 0, 0, Math.PI / 2 + 0.3)
    );
  },

  magicien() {
    const robe = mat(0x4a3fb0), robeS = mat(0x302880), peau = mat(PEAU), barbe = mat(0xf2f0ea), bois = mat(0x7a4a2a);
    const etoile = () => mat(0xffe28a, { lueur: 0xc89a20 });
    const chapeau = G(
      F.cyl(0.44, 0.44, 0.05, robeS, 0, 0, 0),
      F.cone(0.3, 0.42, robe, 0, 0.23, 0),
      F.cone(0.15, 0.3, robe, 0.06, 0.52, -0.06, -0.5, 0, -0.3),
      sansContour(F.boule(0.04, etoile(), 0.1, 0.2, 0.25)), sansContour(F.boule(0.03, etoile(), -0.12, 0.12, 0.25))
    );
    chapeau.position.set(0, 1.3, -0.02);
    return G(
      F.cyl(0.22, 0.42, 0.66, robe, 0, 0.33, 0),
      sansContour(F.boule(0.035, etoile(), 0.18, 0.25, 0.32)), sansContour(F.boule(0.03, etoile(), -0.2, 0.4, 0.28)), sansContour(F.boule(0.03, etoile(), 0.05, 0.12, 0.38)),
      F.boule(0.14, robe, -0.26, 0.66, 0, 0, 0, 0, 1, 0.85, 1), F.boule(0.14, robe, 0.26, 0.66, 0, 0, 0, 0, 1, 0.85, 1),
      F.cone(0.11, 0.24, robe, -0.33, 0.5, 0.06, 0, 0, 0.3), F.capsule(0.08, 0.16, robe, 0.33, 0.52, 0.1, -0.5, 0, -0.2),
      F.boule(0.33, peau, 0, 1.02, 0),
      F.cone(0.2, 0.42, barbe, 0, 0.78, 0.17, Math.PI + 0.25, 0, 0),
      F.boule(0.06, mat(0xf0a080), 0, 0.98, 0.32),
      yeuxMignons(1.06, 0.28, 0.12, 0.06, 0x3a2a8a),
      sourcils(1.16, 0.31, 0.12, 0xe8e6e0, -0.2),
      chapeau,
      F.capsule(0.03, 1.25, bois, 0.42, 0.8, 0.14),
      sansContour(F.boule(0.11, mat(0x9ff0ff, { lueur: 0x40c8ff }), 0.42, 1.5, 0.14))
    );
  },

  gobelin() {
    const peau = mat(0x7cbf3a), peauS = mat(0x5a9a2a), tunique = mat(0x8a5a2e), dent = mat(0xfff6dc), lame = mat(0xc8ccd2), cuir = mat(0x4a2e1a);
    const g = G(
      F.capsule(0.08, 0.14, peauS, -0.09, 0.15, 0), F.capsule(0.08, 0.14, peauS, 0.09, 0.15, 0),
      F.cyl(0.2, 0.26, 0.34, tunique, 0, 0.42, 0),
      F.cyl(0.27, 0.27, 0.05, cuir, 0, 0.3, 0),
      F.capsule(0.06, 0.18, peau, -0.27, 0.45, 0.06, 0, 0, 0.3), F.capsule(0.06, 0.16, peau, 0.27, 0.48, 0.12, -0.7, 0, -0.2),
      F.boule(0.36, peau, 0, 0.88, 0, 0, 0, 0, 1.05, 0.92, 1),
      F.cone(0.11, 0.42, peau, -0.42, 0.98, -0.02, 0, 0.2, Math.PI / 2.3), F.cone(0.11, 0.42, peau, 0.42, 0.98, -0.02, 0, -0.2, -Math.PI / 2.3),
      F.cone(0.06, 0.16, peauS, 0, 0.84, 0.36, Math.PI / 2, 0, 0),
      yeuxMignons(0.95, 0.27, 0.14, 0.085, 0xc81a1a),
      sourcils(1.07, 0.3, 0.14, 0x2a4a10, 0.5),
      F.boite(0.22, 0.05, 0.03, mat(0x2a1010), 0, 0.72, 0.32),
      F.cone(0.025, 0.06, dent, -0.06, 0.69, 0.33, Math.PI, 0, 0), F.cone(0.025, 0.06, dent, 0.06, 0.69, 0.33, Math.PI, 0, 0),
      G(F.boite(0.06, 0.36, 0.02, lame, 0.03, 0.2, 0, 0, 0, -0.25), F.boite(0.12, 0.03, 0.04, cuir), F.capsule(0.025, 0.06, cuir, 0, -0.05, 0)).translateX(0.32).translateY(0.42).translateZ(0.3).rotateX(-0.8)
    );
    g.scale.setScalar(0.95);
    return g;
  },

  squelette() {
    const os = mat(0xf2ead2), sombre = mat(0x1a1410), rouille = mat(0x9a6a4a), bois = mat(0x6a4426);
    const cotes = [0, 1, 2].map(i => F.tore(0.16 - i * 0.02, 0.025, os, Math.PI * 1.5, 0, 0.6 - i * 0.08, 0.02, Math.PI / 2, 0, Math.PI * 0.75));
    return G(
      F.capsule(0.04, 0.28, os, -0.1, 0.18, 0), F.capsule(0.04, 0.28, os, 0.1, 0.18, 0),
      F.boule(0.13, os, 0, 0.36, 0, 0, 0, 0, 1.3, 0.5, 0.8),
      F.capsule(0.035, 0.3, os, 0, 0.55, -0.06),
      cotes,
      F.capsule(0.035, 0.22, os, -0.25, 0.52, 0.04, 0, 0, 0.2), F.capsule(0.035, 0.22, os, 0.25, 0.52, 0.1, -0.6, 0, -0.2),
      F.boule(0.33, os, 0, 1.0, 0),
      F.boite(0.3, 0.1, 0.2, os, 0, 0.74, 0.08),
      F.boule(0.09, sombre, -0.12, 1.0, 0.25, 0, 0, 0, 1, 1.1, 0.6), F.boule(0.09, sombre, 0.12, 1.0, 0.25, 0, 0, 0, 1, 1.1, 0.6),
      yeuxLueur(1.0, 0.31, 0.12, 0.035, 0x7dff9a, 0x30e050),
      F.cone(0.04, 0.07, sombre, 0, 0.9, 0.31, Math.PI, 0, 0),
      ...[-0.09, -0.03, 0.03, 0.09].map(x => F.boite(0.04, 0.05, 0.02, os, x, 0.79, 0.19)),
      F.boite(0.06, 0.48, 0.02, rouille, 0.3, 0.6, 0.32, -0.9, 0, 0),
      G(F.cyl(0.2, 0.2, 0.05, bois, 0, 0, 0, Math.PI / 2, 0, 0), F.cyl(0.06, 0.06, 0.07, rouille, 0, 0, 0.02, Math.PI / 2, 0, 0)).translateX(-0.32).translateY(0.5).translateZ(0.1)
    );
  },

  loup() {
    const poil = mat(0x8a8e9a), clair = mat(0xdcd8d0), sombre = mat(0x4a4e58), nez = mat(0x1a1a1a), dent = mat(0xffffff);
    const pattes = [[-0.14, 0.25], [0.14, 0.25], [-0.14, -0.28], [0.14, -0.28]].map(([x, z]) => F.capsule(0.07, 0.2, poil, x, 0.16, z));
    return G(
      pattes,
      F.capsule(0.24, 0.5, poil, 0, 0.48, -0.02, Math.PI / 2, 0, 0),
      F.boule(0.22, clair, 0, 0.5, 0.25),
      F.boule(0.3, poil, 0, 0.82, 0.38),
      F.boule(0.13, clair, 0, 0.72, 0.62, 0, 0, 0, 1, 0.8, 1.3),
      F.boule(0.05, nez, 0, 0.77, 0.79),
      F.cone(0.09, 0.22, poil, -0.16, 1.1, 0.33, 0, 0, 0.25), F.cone(0.09, 0.22, poil, 0.16, 1.1, 0.33, 0, 0, -0.25),
      F.cone(0.05, 0.12, clair, -0.16, 1.08, 0.36, 0, 0, 0.25), F.cone(0.05, 0.12, clair, 0.16, 1.08, 0.36, 0, 0, -0.25),
      yeuxMignons(0.9, 0.62, 0.12, 0.065, 0xc89a10),
      sourcils(0.98, 0.65, 0.12, 0x3a3e48, 0.5),
      F.cone(0.025, 0.06, dent, -0.05, 0.64, 0.7, Math.PI, 0, 0), F.cone(0.025, 0.06, dent, 0.05, 0.64, 0.7, Math.PI, 0, 0),
      F.cone(0.12, 0.45, sombre, 0, 0.62, -0.55, -2.1, 0, 0)
    );
  },

  cultiste() {
    const robe = mat(0xa8242c), robeS = mat(0x6a141a), visage = mat(0x0e0808), corde = mat(0xd8b46a), cire = mat(0xf4ecd8), lame = mat(0xd0d6de);
    return G(
      F.cyl(0.24, 0.42, 0.66, robe, 0, 0.33, 0),
      F.cyl(0.25, 0.25, 0.05, corde, 0, 0.5, 0),
      F.boule(0.14, robe, -0.27, 0.66, 0, 0, 0, 0, 1, 0.85, 1), F.boule(0.14, robe, 0.27, 0.66, 0, 0, 0, 0, 1, 0.85, 1),
      F.capsule(0.08, 0.16, robe, -0.31, 0.5, 0.1, -0.6, 0, 0.2), F.capsule(0.08, 0.16, robe, 0.31, 0.5, 0.1, -0.6, 0, -0.2),
      F.boule(0.32, visage, 0, 1.0, 0.02),
      F.boule(0.39, robeS, 0, 1.06, -0.07, 0, 0, 0, 1, 1.05, 0.95),
      F.cone(0.2, 0.4, robeS, 0, 1.5, -0.12, -0.35, 0, 0),
      yeuxLueur(1.0, 0.3, 0.11, 0.05, 0xffe04a, 0xffa000),
      G(F.boite(0.16, 0.16, 0.03, mat(0x1a1010), 0, 0, 0, 0, 0, Math.PI / 4), sansContour(F.boule(0.035, mat(0xff3030, { lueur: 0xc00000 }), 0, 0, 0.02))).translateY(0.62).translateZ(0.3),
      G(F.cyl(0.05, 0.05, 0.18, cire, 0, 0.06, 0), sansContour(F.cone(0.04, 0.12, mat(0xffd24a, { lueur: 0xff9a20 }), 0, 0.22, 0))).translateX(-0.36).translateY(0.42).translateZ(0.36),
      F.cone(0.04, 0.3, lame, 0.36, 0.5, 0.36, 0.4, 0, 0)
    );
  },

  zombie() {
    const peau = mat(0x9ab87a), peauS = mat(0x6e8c56), chemise = mat(0x8a7456), pantalon = mat(0x4a4e64), point = mat(0x2a1a10);
    return G(
      F.capsule(0.09, 0.22, pantalon, -0.11, 0.2, 0), F.capsule(0.09, 0.22, pantalon, 0.11, 0.2, 0.04),
      F.cyl(0.25, 0.27, 0.42, chemise, 0, 0.56, 0, 0.1, 0, 0.05),
      F.boite(0.16, 0.14, 0.04, peauS, 0.1, 0.5, 0.26),
      F.capsule(0.07, 0.34, peau, -0.27, 0.68, 0.24, -1.45, 0, 0), F.capsule(0.07, 0.3, peau, 0.27, 0.64, 0.22, -1.35, 0, 0),
      F.boule(0.34, peau, 0.02, 1.08, 0.04, 0, 0, 0.15),
      F.boule(0.085, mat(0xfafae0), -0.12, 1.12, 0.32, 0, 0, 0, 1, 1, 0.6), F.boule(0.06, mat(0xfafae0), 0.13, 1.1, 0.32, 0, 0, 0, 1, 1, 0.6),
      sansContour(F.boule(0.025, point, -0.11, 1.12, 0.37)), sansContour(F.boule(0.02, point, 0.14, 1.09, 0.36)),
      F.boite(0.2, 0.03, 0.03, point, 0.02, 0.95, 0.34, 0, 0, 0.1),
      ...[-0.06, 0, 0.06].map(x => sansContour(F.boite(0.012, 0.07, 0.02, point, x + 0.02, 0.95, 0.35))),
      F.calotte(0.2, peauS, -0.1, 1.33, 0.05, 0, 0, 0.4)
    );
  },

  ogre() {
    const peau = mat(0xd09a62), peauS = mat(0xa8784a), pagne = mat(0x6a4626), dent = mat(0xfff6dc), bois = mat(0x6a4226), pointe = mat(0xbfc4cc);
    return G(
      F.capsule(0.13, 0.18, peauS, -0.18, 0.2, 0), F.capsule(0.13, 0.18, peauS, 0.18, 0.2, 0),
      F.cyl(0.36, 0.38, 0.18, pagne, 0, 0.38, 0),
      F.boule(0.46, peau, 0, 0.72, 0.04, 0, 0, 0, 1, 0.95, 0.95),
      F.boule(0.2, peau, -0.42, 0.95, -0.02), F.boule(0.2, peau, 0.42, 0.95, -0.02),
      F.capsule(0.11, 0.3, peau, -0.5, 0.65, 0.06, 0, 0, 0.12), F.capsule(0.11, 0.3, peau, 0.5, 0.72, 0.2, -0.7, 0, -0.12),
      F.boule(0.28, peau, 0, 1.28, 0.06),
      F.boite(0.36, 0.06, 0.05, mat(0x3a2414), 0, 1.38, 0.3),
      yeuxMignons(1.3, 0.3, 0.1, 0.055, 0x6a2010),
      F.boule(0.12, peauS, 0, 1.17, 0.26, 0, 0, 0, 1.3, 0.7, 0.8),
      F.cone(0.035, 0.11, dent, -0.09, 1.22, 0.33), F.cone(0.035, 0.11, dent, 0.09, 1.22, 0.33),
      G(F.capsule(0.13, 0.5, bois, 0, 0.38, 0), F.capsule(0.05, 0.25, bois, 0, -0.05, 0), ...[0, 1.6, 3.2, 4.8].map(a => F.cone(0.04, 0.1, pointe, Math.cos(a) * 0.14, 0.5, Math.sin(a) * 0.14, 0, -a, Math.PI / 2)))
        .translateX(0.55).translateY(0.75).translateZ(0.42).rotateX(-0.9)
    );
  },

  morvagne() {
    const robe = mat(0x5a2a7a), robeS = mat(0x2e1240), os = mat(0xf2ead2), or = mat(0xf2b84a), noir = mat(0x120a14);
    const couronne = [0, 1, 2, 3, 4].map(i => { const a = i / 5 * Math.PI * 2; return F.cone(0.05, 0.16, or, Math.sin(a) * 0.22, 1.52, Math.cos(a) * 0.22); });
    return G(
      F.cyl(0.26, 0.52, 0.9, robe, 0, 0.45, 0),
      F.tore(0.52, 0.04, or, undefined, 0, 0.03, 0, Math.PI / 2, 0, 0),
      F.cyl(0.42, 0.3, 0.16, robeS, 0, 0.9, 0),
      F.cone(0.12, 0.42, robeS, -0.36, 1.08, -0.08, -0.2, 0, 0.35), F.cone(0.12, 0.42, robeS, 0.36, 1.08, -0.08, -0.2, 0, -0.35), F.cone(0.12, 0.42, robeS, 0, 1.1, -0.26, -0.5, 0, 0),
      F.capsule(0.09, 0.22, robe, -0.36, 0.72, 0.14, -0.9, 0, 0.3), F.capsule(0.09, 0.22, robe, 0.36, 0.72, 0.1, -0.3, 0, -0.2),
      F.boule(0.34, os, 0, 1.25, 0),
      F.boule(0.1, noir, -0.13, 1.26, 0.25, 0, 0, 0, 1, 1.1, 0.6), F.boule(0.1, noir, 0.13, 1.26, 0.25, 0, 0, 0, 1, 1.1, 0.6),
      yeuxLueur(1.26, 0.31, 0.13, 0.045, 0x8dff9a, 0x30e050),
      F.boite(0.26, 0.09, 0.16, os, 0, 1.0, 0.1),
      F.cyl(0.24, 0.24, 0.06, or, 0, 1.46, 0),
      couronne,
      sansContour(F.boule(0.035, mat(0xff3050, { lueur: 0xc01030 }), 0, 1.47, 0.24)),
      F.capsule(0.035, 1.5, noir, 0.48, 0.9, 0.12),
      F.tore(0.16, 0.025, or, undefined, 0.48, 1.78, 0.12),
      sansContour(F.boule(0.13, mat(0x8dff9a, { lueur: 0x30e050 }), 0.48, 1.78, 0.12))
    );
  },

  tombe() {
    const pierre = mat(0x9a9aa6), terre = mat(0x5a4230), herbe = mat(0x5a8a3a);
    return G(
      F.boule(0.42, terre, 0, 0, 0.12, 0, 0, 0, 1, 0.3, 1.2),
      F.boite(0.44, 0.48, 0.13, pierre, 0, 0.36, -0.12),
      F.cyl(0.22, 0.22, 0.13, pierre, 0, 0.6, -0.12, Math.PI / 2, 0, 0),
      sansContour(F.boite(0.05, 0.2, 0.02, mat(0x4a4a56), 0, 0.42, -0.05)), sansContour(F.boite(0.14, 0.05, 0.02, mat(0x4a4a56), 0, 0.46, -0.05)),
      F.cone(0.04, 0.12, herbe, -0.2, 0.1, 0.3), F.cone(0.04, 0.1, herbe, 0.22, 0.08, 0.25),
      sansContour(F.boule(0.04, mat(0xff8ab0), 0.18, 0.14, 0.32))
    );
  },

  loup_alpha() {
    const g = FIGURINES.loup();
    g.traverse(o => { if (o.material && o.material.emissive && !o.material.emissive.getHex()) o.material = mat(o.material.color.clone().multiplyScalar(0.55).getHex()); });
    return g;
  },

  inconnu() { return G(F.boule(0.4, mat(0x888888), 0, 0.5, 0)); }
};

// ---------------------------------------------------------------------
// Décor : sol dallé, braseros, piliers, os et pierres
// ---------------------------------------------------------------------
function textureDalles() {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const x = c.getContext('2d');
  x.fillStyle = '#1e1712';
  x.fillRect(0, 0, 512, 512);
  const n = 4, t = 512 / n;
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const decal = (j % 2) * t / 2;
    const v = 70 + Math.random() * 30;
    x.fillStyle = `rgb(${v + 22},${v + 10},${v - 4})`;
    const px = (i * t + decal) % 512, py = j * t;
    for (const ox of [0, -512]) {
      x.beginPath();
      if (x.roundRect) x.roundRect(px + ox + 5, py + 5, t - 10, t - 10, 14); else x.rect(px + ox + 5, py + 5, t - 10, t - 10);
      x.fill();
    }
    x.strokeStyle = 'rgba(30,20,14,.45)';
    x.lineWidth = 2;
    if (Math.random() < 0.4) {
      x.beginPath();
      x.moveTo(px + 20 + Math.random() * 40, py + 20 + Math.random() * 40);
      x.lineTo(px + 50 + Math.random() * 60, py + 50 + Math.random() * 60);
      x.stroke();
    }
    x.fillStyle = 'rgba(255,230,190,.06)';
    x.fillRect(px + 10, py + 10, t - 20, 10);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(5, 5);
  tex.encoding = THREE.sRGBEncoding;
  tex.anisotropy = 4;
  return tex;
}

let TEX_POINT = null;
function texturePoint() {
  if (TEX_POINT) return TEX_POINT;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const x = c.getContext('2d');
  const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.35, 'rgba(255,255,255,.7)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = gr;
  x.fillRect(0, 0, 64, 64);
  TEX_POINT = new THREE.CanvasTexture(c);
  return TEX_POINT;
}

function brasero() {
  const fer = mat(0x3a3236), braise = mat(0xff6a20, { lueur: 0xff4a00 });
  const flammes = G(
    sansContour(F.cone(0.2, 0.55, new THREE.MeshBasicMaterial({ color: 0xff7a1a, transparent: true, opacity: 0.9 }), 0, 0.3, 0)),
    sansContour(F.cone(0.12, 0.4, new THREE.MeshBasicMaterial({ color: 0xffe25a, transparent: true, opacity: 0.95 }), 0, 0.24, 0.02))
  );
  flammes.position.y = 0.72;
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: texturePoint(), color: 0xff9a3a, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
  halo.scale.set(1.8, 1.8, 1);
  halo.position.y = 0.3;
  flammes.add(halo);
  const g = G(
    F.cyl(0.05, 0.08, 0.6, fer, 0, 0.3, 0),
    F.cyl(0.24, 0.3, 0.06, fer, 0, 0.02, 0),
    F.cyl(0.34, 0.2, 0.22, fer, 0, 0.66, 0),
    sansContour(F.cyl(0.3, 0.3, 0.04, braise, 0, 0.76, 0)),
    flammes
  );
  ajouterContours(g);
  g.traverse(o => { if (o.isMesh && !o.userData.contour && !o.userData.sansContour) o.castShadow = true; });
  const lum = new THREE.PointLight(0xff8a3a, 1.6, 7, 1.6);
  lum.position.y = 1.2;
  g.add(lum);
  g.userData = { flammes, lum };
  return g;
}

function pilier() {
  const pierre = mat(0x6a5e58), pierreS = mat(0x4a403c);
  const g = G(
    F.boite(0.8, 0.25, 0.8, pierreS, 0, 0.12, 0),
    F.cyl(0.3, 0.32, 3, pierre, 0, 1.6, 0),
    F.boite(0.75, 0.2, 0.75, pierreS, 0, 3.1, 0)
  );
  ajouterContours(g);
  g.traverse(o => { if (o.isMesh && !o.userData.contour) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}

function construireDecor(sc) {
  const sol = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshStandardMaterial({ map: textureDalles(), roughness: 0.92, metalness: 0 }));
  sol.rotation.x = -Math.PI / 2;
  sol.receiveShadow = true;
  sc.add(sol);
  // (référencé pour être caché quand les dalles KayKit sont chargées)
  // Ligne de front : rangée de petits cailloux
  const front = new THREE.Group();
  const caillou = mat(0x5a4e46);
  for (let i = -6; i <= 6; i++) front.add(F.boule(0.08 + Math.random() * 0.06, caillou, i * 0.55 + (Math.random() - 0.5) * 0.2, 0.03, (Math.random() - 0.5) * 0.15, 0, 0, 0, 1, 0.5, 1));
  sc.add(front);
  const d = { braseros: [brasero(), brasero()], piliers: [pilier(), pilier(), pilier(), pilier()], front, os: [], solProc: sol };
  d.braseros.forEach(b => sc.add(b));
  d.piliers.forEach(p => sc.add(p));
  const os = mat(0xe8e0c8);
  for (let i = 0; i < 4; i++) {
    const o = G(F.capsule(0.03, 0.25, os, 0, 0, 0, 0, 0, Math.PI / 2), F.boule(0.045, os, -0.15, 0, 0), F.boule(0.045, os, 0.15, 0, 0));
    o.rotation.y = Math.random() * 3;
    sc.add(o);
    d.os.push(o);
  }
  return d;
}

function placerDecor(d, p) {
  d.braseros[0].position.set(p.g.x + 0.2, 0, p.g.z);
  d.braseros[1].position.set(p.d.x - 0.2, 0, p.d.z);
  d.piliers[0].position.set(p.hg.x - 0.2, 0, p.hg.z - 0.6);
  d.piliers[1].position.set(p.hd.x + 0.2, 0, p.hd.z - 0.6);
  d.piliers[2].position.set(p.bg.x - 0.5, 0, p.bg.z + 0.4);
  d.piliers[3].position.set(p.bd.x + 0.5, 0, p.bd.z + 0.4);
  d.front.position.set(p.c.x, 0, p.c.z);
  const pos = [[p.g, 0.3, -1.2], [p.d, -0.4, 1.0], [p.hg, 0.8, 0.9], [p.bd, -0.9, -0.9]];
  d.os.forEach((o, i) => o.position.set(pos[i][0].x + pos[i][1], 0.04, pos[i][0].z + pos[i][2]));
}

function animerDecor(d, s, particules) {
  d.braseros.forEach((b, i) => {
    const f = b.userData.flammes;
    const v = Math.sin(s * 9 + i * 2) * 0.08 + Math.sin(s * 23 + i) * 0.05;
    f.scale.set(1 - v * 0.5, 1 + v * 1.5, 1 - v * 0.5);
    f.rotation.y = s * 2;
    b.userData.lum.intensity = 1.5 + v * 2.2;
    if (Math.random() < 0.35) {
      const p = b.position.clone();
      p.y += 0.85;
      p.x += (Math.random() - 0.5) * 0.25;
      p.z += (Math.random() - 0.5) * 0.25;
      particules.emettre(p, new THREE.Vector3((Math.random() - 0.5) * 0.3, 0.8 + Math.random() * 0.8, (Math.random() - 0.5) * 0.3), [1, 0.55 + Math.random() * 0.3, 0.15], 1.4, -0.2, 0.07);
    }
  });
}

// ---------------------------------------------------------------------
// Particules (braises, étincelles, soins)
// ---------------------------------------------------------------------
class Particules {
  constructor(sc, n = 400) {
    this.n = n;
    this.pos = new Float32Array(n * 3);
    this.col = new Float32Array(n * 3);
    this.taille = new Float32Array(n);
    this.vit = new Float32Array(n * 3);
    this.vie = new Float32Array(n);
    this.vieMax = new Float32Array(n);
    this.gravite = new Float32Array(n);
    this.base = new Float32Array(n);
    this.i = 0;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    geo.setAttribute('taille', new THREE.BufferAttribute(this.taille, 1));
    const m = new THREE.ShaderMaterial({
      uniforms: { carte: { value: texturePoint() } },
      vertexShader: 'attribute float taille; varying vec3 vC; void main(){ vC = color; vec4 mv = modelViewMatrix * vec4(position,1.0); gl_PointSize = taille * 600.0 / -mv.z; gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'uniform sampler2D carte; varying vec3 vC; void main(){ vec4 t = texture2D(carte, gl_PointCoord); gl_FragColor = vec4(vC, 1.0) * t; }',
      vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
    });
    this.points = new THREE.Points(geo, m);
    this.points.frustumCulled = false;
    sc.add(this.points);
  }
  emettre(p, v, couleur, vie, gravite, taille) {
    const i = this.i;
    this.i = (this.i + 1) % this.n;
    this.pos.set([p.x, p.y, p.z], i * 3);
    this.vit.set([v.x, v.y, v.z], i * 3);
    this.col.set(couleur, i * 3);
    this.vie[i] = this.vieMax[i] = vie;
    this.gravite[i] = gravite;
    this.base[i] = taille;
  }
  maj(dt) {
    for (let i = 0; i < this.n; i++) {
      if (this.vie[i] <= 0) { this.taille[i] = 0; continue; }
      this.vie[i] -= dt;
      const k = i * 3;
      this.vit[k + 1] -= this.gravite[i] * dt;
      this.pos[k] += this.vit[k] * dt;
      this.pos[k + 1] += this.vit[k + 1] * dt;
      this.pos[k + 2] += this.vit[k + 2] * dt;
      this.taille[i] = this.base[i] * Math.max(0, this.vie[i] / this.vieMax[i]);
    }
    const a = this.points.geometry.attributes;
    a.position.needsUpdate = true;
    a.taille.needsUpdate = true;
    a.color.needsUpdate = true;
  }
}
