// =====================================================================
// Modèles 3D animés (packs KayKit de Kay Lousberg, licence CC0).
//
// Les fichiers .glb sont emballés en base64 dans modeles/*.js : ils se
// chargent avec une balise <script>, ce qui marche aussi en ouvrant
// index.html directement (file://). Le chargement se fait en arrière-plan ;
// tant qu'un modèle n'est pas prêt, la figurine dessinée en code le remplace.
//
// Tous les personnages partagent le même squelette (41 os) : les animations
// sont stockées une seule fois, dans skeleton_warrior.
// =====================================================================

const Ressources3D = {
  // Ordre de chargement : animations d'abord, puis héros, monstres et décor
  liste: ['skeleton_warrior', 'donjon', 'knight', 'mage', 'rogue_hooded', 'barbarian', 'rogue', 'skeleton_mage',
    'skeleton_blade', 'skeleton_shield_small_a', 'skeleton_staff'],
  charges: 0,
  // Progression du chargement (0 à 1), affichée sur l'écran d'accueil
  progression() { return this.charges / this.liste.length; },
  // demi = 0.5 quand un fichier est téléchargé mais pas encore décodé
  etape(demi = 0) {
    if (window.EC) EC.cible(20 + (this.charges + demi) / this.liste.length * 78);
  },
  majIndicateur() {
    this.etape();
    if (this.pret) EcranChargement.fermer();
    const el = document.getElementById('chargement3d');
    if (!el) return;
    if (this.pret) { el.classList.add('fini'); return; }
    el.querySelector('i').style.width = Math.round(this.progression() * 100) + '%';
  },
  gltf: {},
  enCours: null,
  pret: false,
  quandPret: [],

  charger() {
    if (this.enCours) return this.enCours;
    this.enCours = (async () => {
      for (const nom of this.liste) {
        try {
          await this.script(`modeles/${nom}.js?v=${window.VERSION_JEU || 1}`);
          this.etape(0.5);
          this.gltf[nom] = await this.analyser(window.GLB[nom]);
          delete window.GLB[nom];
        } catch (e) {
          console.warn('Modèle 3D indisponible :', nom, e);
        }
        this.charges++;
        this.majIndicateur();
      }
      this.pret = true;
      this.majIndicateur();
      this.quandPret.forEach(f => f());
    })();
    return this.enCours;
  },

  script(src) {
    return new Promise((ok, ko) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = ok;
      s.onerror = ko;
      document.head.appendChild(s);
    });
  },

  analyser(b64) {
    const bin = atob(b64);
    const u = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    return new Promise((ok, ko) => new THREE.GLTFLoader().parse(u.buffer, '', ok, ko));
  },

  clip(nom) {
    const g = this.gltf.skeleton_warrior;
    return g ? g.animations.find(a => a.name === nom) : null;
  },

  piece(nom) {
    const g = this.gltf.donjon;
    return g ? g.scenes.find(s => s.name === nom) : null;
  }
};

// ---------------------------------------------------------------------
// Personnages : quel modèle, quel équipement, quelles animations
//   glb       : fichier source
//   montrer   : armes / accessoires visibles (les autres sont cachés)
//   cacher    : parties du corps à cacher (chapeau, cape…)
//   teintes   : { nomDuMaillage: couleur } multipliée sur la texture
//   recolorer : nom d'une recoloration de texture (voir RECOLORATIONS)
//   armes     : { droite / gauche : fichier d'arme à mettre en main }
//   echelle   : taille relative
//   anims     : remplace les animations par défaut
// ---------------------------------------------------------------------
const ANIMS_DEFAUT = {
  idle: 'Idle', attaque: '1H_Melee_Attack_Chop', tir: '1H_Ranged_Shoot', sort: 'Spellcast_Shoot',
  soutien: 'Spellcast_Raise', coup: 'Hit_A', esquive: 'Dodge_Backward', bloque: 'Block',
  mort: 'Death_A', poseMort: 'Death_A_Pose', releve: 'Lie_StandUp', victoire: 'Cheer', potion: 'Use_Item', invoque: 'Spellcast_Summon'
};

const ACCESSOIRES = new Set(['1H_Sword_Offhand', 'Badge_Shield', 'Rectangle_Shield', 'Round_Shield', 'Spike_Shield', '1H_Sword', '2H_Sword',
  'Spellbook', 'Spellbook_open', '1H_Wand', '2H_Staff', '1H_Axe_Offhand', 'Barbarian_Round_Shield', '1H_Axe', '2H_Axe', 'Mug',
  'Knife_Offhand', '1H_Crossbow', '2H_Crossbow', 'Knife', 'Throwable']);

const PERSOS3D = {
  guerrier: { glb: 'knight', montrer: ['1H_Sword', 'Round_Shield'], anims: { tir: 'Throw', soutien: 'Block' } },
  clerc: { glb: 'mage', montrer: ['Spellbook_open', '1H_Wand'], cacher: ['Mage_Hat'], recolorer: 'pretre',
    anims: { attaque: '1H_Melee_Attack_Chop', sort: 'Spellcast_Shoot', soutien: 'Spellcast_Raise' } },
  roublard: { glb: 'rogue_hooded', montrer: ['Knife', 'Knife_Offhand'], anims: { attaque: 'Dualwield_Melee_Attack_Stab', tir: 'Throw', soutien: 'Block' } },
  magicien: { glb: 'mage', montrer: ['2H_Staff'], anims: { attaque: 'Spellcast_Shoot', idle: '2H_Melee_Idle' } },
  barbare: { glb: 'barbarian', montrer: ['2H_Axe'], anims: { idle: '2H_Melee_Idle', attaque: '2H_Melee_Attack_Chop', tir: 'Throw', soutien: 'Taunt' } },
  paladin: { glb: 'knight', montrer: ['1H_Sword', 'Badge_Shield'], cacher: ['Knight_Helmet'], recolorer: 'paladin', anims: { soutien: 'Spellcast_Raise', sort: 'Spellcast_Shoot' } },
  rodeur: { glb: 'rogue', montrer: ['Knife', '1H_Crossbow'], recolorer: 'rodeur', anims: { attaque: 'Dualwield_Melee_Attack_Stab', tir: '1H_Ranged_Shoot', sort: 'Spellcast_Shoot' } },
  barde: { glb: 'rogue', montrer: ['Knife'], recolorer: 'barde', anims: { attaque: '1H_Melee_Attack_Stab', sort: 'Spellcast_Shoot', soutien: 'Cheer' } },
  druide: { glb: 'mage', montrer: ['2H_Staff'], cacher: ['Mage_Hat'], recolorer: 'druide', anims: { attaque: '1H_Melee_Attack_Chop', idle: '2H_Melee_Idle' } },
  moine: { glb: 'barbarian', montrer: [], cacher: ['Barbarian_Hat', 'Barbarian_Cape'], recolorer: 'moine', anims: { attaque: 'Unarmed_Melee_Attack_Punch_A', tir: 'Unarmed_Melee_Attack_Punch_A', soutien: 'Block' } },
  occultiste: { glb: 'mage', montrer: ['1H_Wand', 'Spellbook_open'], recolorer: 'occulte', anims: { attaque: 'Spellcast_Shoot', sort: 'Spellcast_Shoot', soutien: 'Spellcast_Raise' } },
  gobelin: { glb: 'rogue', montrer: ['Knife'], echelle: 0.78, recolorer: 'gobelin', anims: { attaque: '1H_Melee_Attack_Stab', tir: 'Throw' } },
  zombie: { glb: 'barbarian', montrer: [], cacher: ['Barbarian_Hat', 'Barbarian_Cape'], recolorer: 'zombie', anims: { attaque: 'Unarmed_Melee_Attack_Punch_A' } },
  ogre: { glb: 'barbarian', montrer: ['2H_Axe'], cacher: ['Barbarian_Hat'], echelle: 1.3, recolorer: 'ogre', anims: { idle: '2H_Melee_Idle', attaque: '2H_Melee_Attack_Chop', tir: 'Throw' } },
  cultiste: { glb: 'rogue_hooded', montrer: ['Knife'], recolorer: 'cultiste', anims: { attaque: '1H_Melee_Attack_Stab', sort: 'Spellcast_Shoot' } },
  squelette: { glb: 'skeleton_warrior', armes: { droite: 'skeleton_blade', gauche: 'skeleton_shield_small_a' },
    anims: { idle: 'Idle_Combat', mort: 'Death_C_Skeletons', poseMort: 'Death_C_Pose' } },
  mage_squelette: { glb: 'skeleton_mage', armes: { droite: 'skeleton_staff' },
    anims: { attaque: 'Spellcast_Shoot', sort: 'Spellcast_Shoot', mort: 'Death_C_Skeletons', poseMort: 'Death_C_Pose' } },
  grukk: { glb: 'barbarian', montrer: ['2H_Axe'], cacher: ['Barbarian_Hat'], echelle: 1.45, recolorer: 'grukk',
    anims: { idle: '2H_Melee_Idle', attaque: '2H_Melee_Attack_Chop', tir: 'Throw', sort: 'Taunt', soutien: 'Taunt' } },
  chevalier_squelette: { glb: 'skeleton_warrior', armes: { droite: 'skeleton_blade', gauche: 'skeleton_shield_small_a' }, echelle: 1.3, recolorer: 'spectre',
    anims: { idle: 'Idle_Combat', attaque: '1H_Melee_Attack_Chop', sort: 'Spellcast_Shoot', invoque: 'Spellcast_Summon', soutien: 'Taunt', mort: 'Death_C_Skeletons', poseMort: 'Death_C_Pose' } },
  roi_gobelin: { glb: 'rogue', montrer: ['Knife', '1H_Crossbow'], echelle: 0.95, recolorer: 'roi_gobelin', anims: { attaque: '1H_Melee_Attack_Stab', tir: '1H_Ranged_Shoot', invoque: 'Taunt', soutien: 'Throw' } },
  grukk_tyran: { glb: 'barbarian', montrer: ['2H_Axe'], cacher: ['Barbarian_Hat'], echelle: 1.6, recolorer: 'tyran',
    anims: { idle: '2H_Melee_Idle', attaque: '2H_Melee_Attack_Chop', tir: 'Throw', sort: 'Taunt', soutien: 'Taunt' } },
  pretre_eclipse: { glb: 'rogue_hooded', montrer: ['Knife'], recolorer: 'eclipse', anims: { sort: 'Spellcast_Shoot', soutien: 'Spellcast_Raise' } },
  velkor: { glb: 'mage', montrer: ['2H_Staff'], echelle: 1.25, recolorer: 'eclipse', anims: { attaque: '1H_Melee_Attack_Stab', sort: 'Spellcast_Shoot', invoque: 'Spellcast_Summon', soutien: 'Spellcast_Raise', idle: '2H_Melee_Idle' } },
  kobold: { glb: 'rogue', montrer: ['Knife'], echelle: 0.66, recolorer: 'kobold', anims: { attaque: '1H_Melee_Attack_Stab', tir: 'Throw' } },
  gnoll: { glb: 'barbarian', montrer: ['1H_Axe', 'Barbarian_Round_Shield'], cacher: ['Barbarian_Hat'], echelle: 1.05, recolorer: 'gnoll', anims: { tir: 'Throw', soutien: 'Taunt' } },
  hobgobelin: { glb: 'knight', montrer: ['1H_Sword', 'Rectangle_Shield'], cacher: ['Knight_Helmet'], echelle: 1.05, recolorer: 'hobgobelin', anims: { tir: 'Throw', soutien: 'Cheer' } },
  spectre: { glb: 'skeleton_mage', recolorer: 'spectre', anims: { attaque: 'Spellcast_Shoot', sort: 'Spellcast_Shoot', mort: 'Death_C_Skeletons', poseMort: 'Death_C_Pose' } },
  chef_kobold: { glb: 'mage', montrer: ['1H_Wand', 'Spellbook'], echelle: 0.85, recolorer: 'kobold', anims: { sort: 'Spellcast_Shoot', invoque: 'Spellcast_Summon', soutien: 'Spellcast_Raise' } },
  seigneur_guerre: { glb: 'knight', montrer: ['2H_Sword'], echelle: 1.45, recolorer: 'hobgobelin', anims: { idle: '2H_Melee_Idle', attaque: '2H_Melee_Attack_Chop', tir: 'Throw', soutien: 'Cheer', invoque: 'Cheer' } },
  // Marais
  homme_lezard: { glb: 'barbarian', montrer: ['1H_Axe', 'Barbarian_Round_Shield'], cacher: ['Barbarian_Hat'], recolorer: 'lezard', anims: { tir: 'Throw', soutien: 'Taunt' } },
  chef_lezard: { glb: 'barbarian', montrer: ['2H_Axe'], cacher: ['Barbarian_Hat'], echelle: 1.35, recolorer: 'lezard_chef', anims: { idle: '2H_Melee_Idle', attaque: '2H_Melee_Attack_Chop', invoque: 'Taunt', soutien: 'Taunt' } },
  noye: { glb: 'barbarian', montrer: [], cacher: ['Barbarian_Hat', 'Barbarian_Cape'], recolorer: 'noye', anims: { attaque: 'Unarmed_Melee_Attack_Punch_A' } },
  troll: { glb: 'barbarian', montrer: [], cacher: ['Barbarian_Hat'], echelle: 1.35, recolorer: 'troll', anims: { attaque: 'Unarmed_Melee_Attack_Punch_A', tir: 'Throw' } },
  guenaude: { glb: 'mage', montrer: ['2H_Staff'], echelle: 1.2, recolorer: 'guenaude', anims: { attaque: '1H_Melee_Attack_Chop', sort: 'Spellcast_Shoot', invoque: 'Spellcast_Summon', soutien: 'Spellcast_Raise', idle: '2H_Melee_Idle' } },
  // Givre
  yeti: { glb: 'barbarian', montrer: [], cacher: ['Barbarian_Hat'], echelle: 1.15, recolorer: 'yeti', anims: { attaque: 'Unarmed_Melee_Attack_Punch_A', sort: 'Taunt', soutien: 'Taunt' } },
  pretresse_givre: { glb: 'mage', montrer: ['1H_Wand', 'Spellbook_open'], recolorer: 'givre', anims: { attaque: 'Spellcast_Shoot', soutien: 'Spellcast_Raise' } },
  geant_givre: { glb: 'barbarian', montrer: ['2H_Axe'], cacher: ['Barbarian_Hat'], echelle: 1.6, recolorer: 'geant_givre', anims: { idle: '2H_Melee_Idle', attaque: '2H_Melee_Attack_Chop', tir: 'Throw', invoque: 'Taunt', soutien: 'Taunt' } },
  reine_hiver: { glb: 'mage', montrer: ['2H_Staff'], cacher: ['Mage_Hat'], echelle: 1.25, recolorer: 'reine_hiver', anims: { attaque: 'Spellcast_Shoot', sort: 'Spellcast_Shoot', invoque: 'Spellcast_Summon', soutien: 'Spellcast_Raise', idle: '2H_Melee_Idle' } },
  // Tombeau
  momie: { glb: 'barbarian', montrer: [], cacher: ['Barbarian_Hat', 'Barbarian_Cape'], recolorer: 'momie', anims: { attaque: 'Unarmed_Melee_Attack_Punch_A', sort: 'Taunt' } },
  chacal: { glb: 'barbarian', montrer: ['1H_Axe', 'Barbarian_Round_Shield'], cacher: ['Barbarian_Hat'], echelle: 1.05, recolorer: 'chacal', anims: { tir: 'Throw', sort: 'Taunt' } },
  pretre_momie: { glb: 'skeleton_mage', armes: { droite: 'skeleton_staff' }, echelle: 1.1, recolorer: 'or_desert',
    anims: { attaque: 'Spellcast_Shoot', sort: 'Spellcast_Shoot', soutien: 'Spellcast_Raise', mort: 'Death_C_Skeletons', poseMort: 'Death_C_Pose' } },
  pharaon: { glb: 'barbarian', montrer: [], cacher: ['Barbarian_Hat'], echelle: 1.45, recolorer: 'pharaon', anims: { attaque: 'Unarmed_Melee_Attack_Punch_A', sort: 'Taunt', invoque: 'Taunt', soutien: 'Taunt' } },
  // Château du vampire
  goule: { glb: 'barbarian', montrer: [], cacher: ['Barbarian_Hat', 'Barbarian_Cape'], recolorer: 'goule', anims: { attaque: 'Unarmed_Melee_Attack_Punch_A' } },
  bleme: { glb: 'barbarian', montrer: [], cacher: ['Barbarian_Hat'], echelle: 1.05, recolorer: 'bleme', anims: { attaque: 'Unarmed_Melee_Attack_Punch_A' } },
  necrophage: { glb: 'knight', montrer: ['1H_Sword'], recolorer: 'necrophage', anims: { tir: 'Throw' } },
  rejeton_vampire: { glb: 'rogue', montrer: ['Knife'], recolorer: 'vampire', anims: { attaque: '1H_Melee_Attack_Stab' } },
  vampire: { glb: 'knight', montrer: ['1H_Sword'], cacher: ['Knight_Helmet'], echelle: 1.25, recolorer: 'comte', anims: { sort: 'Spellcast_Shoot', invoque: 'Spellcast_Summon', soutien: 'Taunt' } },
  // Côtes des sahuagins
  sahuagin: { glb: 'barbarian', montrer: ['1H_Axe'], cacher: ['Barbarian_Hat', 'Barbarian_Cape'], echelle: 0.95, recolorer: 'sahuagin', anims: { tir: 'Throw' } },
  baron_sahuagin: { glb: 'barbarian', montrer: ['2H_Axe'], cacher: ['Barbarian_Hat'], echelle: 1.4, recolorer: 'baron_sahuagin', anims: { idle: '2H_Melee_Idle', attaque: '2H_Melee_Attack_Chop', invoque: 'Taunt', soutien: 'Taunt' } },
  merrow: { glb: 'barbarian', montrer: ['1H_Axe'], cacher: ['Barbarian_Hat'], echelle: 1.3, recolorer: 'merrow', anims: { tir: 'Throw' } },
  pretresse_sahuagin: { glb: 'mage', montrer: ['1H_Wand'], cacher: ['Mage_Hat'], recolorer: 'sahuagin', anims: { attaque: 'Spellcast_Shoot', soutien: 'Spellcast_Raise' } },
  harpie: { glb: 'rogue', montrer: [], recolorer: 'harpie', ajouts: [{ os: 'chest', fabrique: 'ailesPlumes' }], anims: { attaque: 'Unarmed_Melee_Attack_Punch_A', sort: 'Cheer' } },
  // Souterrains
  meduse: { glb: 'rogue', montrer: ['Knife', '1H_Crossbow'], echelle: 1.2, recolorer: 'meduse', ajouts: [{ os: 'head', fabrique: 'serpents' }],
    anims: { attaque: '1H_Melee_Attack_Stab', tir: '1H_Ranged_Shoot', soutien: 'Taunt' } },
  morvagne: { glb: 'skeleton_mage', armes: { droite: 'skeleton_staff' }, echelle: 1.12, recolorer: 'necro',
    anims: { attaque: '1H_Melee_Attack_Chop', sort: 'Spellcast_Shoot', invoque: 'Spellcast_Summon', mort: 'Death_C_Skeletons', poseMort: 'Death_C_Pose', soutien: 'Taunt' } }
};

// ---------------------------------------------------------------------
// Recolorations de texture (atlas en dégradés de 1024 px)
// fonction(h, s, l) → [h, s, l] ou null pour garder le pixel
// ---------------------------------------------------------------------
const RECOLORATIONS = {
  // Robe violette du mage → robe blanc crème et or
  pretre: (h, s, l) => ((h > 200 || h < 12) && s > 0.15 && l < 0.85) ? [44, s * 0.4, Math.min(0.94, l * 1.3 + 0.28)] : null,
  // Capuche / cape → rouge sang
  cultiste: (h, s, l) => (s > 0.12 && (h < 20 || h > 60) && !(h > 15 && h < 45 && l > 0.55)) ? [355, Math.min(1, s + 0.35), l * 0.8] : null,
  // Peau → vert, vêtements → brun
  gobelin: (h, s, l) => (h >= 10 && h <= 45 && l > 0.5) ? [95, 0.5, l * 0.75] : (s > 0.15 ? [30, s * 0.6, l * 0.8] : null),
  zombie: (h, s, l) => (h >= 10 && h <= 45 && l > 0.5) ? [100, 0.25, l * 0.72] : (s > 0.1 ? [h, s * 0.3, l * 0.7] : null),
  ogre: (h, s, l) => (h >= 10 && h <= 45 && l > 0.5) ? [28, 0.5, l * 0.78] : null,
  // Héros supplémentaires
  paladin: (h, s, l) => (s < 0.22 && l > 0.3 && l < 0.92) ? [45, 0.6, Math.min(0.9, l * 1.05)] : (h > 190 && h < 260 && s > 0.2 ? [0, 0, Math.min(0.95, l * 1.4)] : null),
  rodeur: (h, s, l) => (h >= 10 && h <= 45 && l > 0.55) ? null : (s > 0.15 ? [100, s * 0.6, l * 0.75] : null),
  barde: (h, s, l) => (h >= 10 && h <= 45 && l > 0.55) ? null : (s > 0.15 ? [330, Math.min(1, s + 0.2), l * 0.95] : null),
  druide: (h, s, l) => (h > 200 && s > 0.15) ? [105, s * 0.7, l * 0.85] : null,
  moine: (h, s, l) => (h >= 10 && h <= 45 && l > 0.5) ? null : (s > 0.12 ? [28, Math.min(1, s + 0.3), l * 1.05] : null),
  // Créatures supplémentaires
  kobold: (h, s, l) => (h >= 10 && h <= 45 && l > 0.5) ? [12, 0.6, l * 0.7] : (s > 0.15 ? [30, s * 0.5, l * 0.6] : null),
  gnoll: (h, s, l) => (h >= 10 && h <= 45 && l > 0.5) ? [38, 0.55, l * 0.72] : (s > 0.15 ? [25, s * 0.6, l * 0.65] : null),
  hobgobelin: (h, s, l) => (h >= 10 && h <= 45 && l > 0.5) ? [22, 0.75, l * 0.75] : (s < 0.22 && l > 0.3 ? [0, 0.15, l * 0.55] : (s > 0.15 ? [355, Math.min(1, s + 0.3), l * 0.7] : null)),
  occulte: (h, s, l) => (h > 200 && s > 0.15) ? [160, Math.min(1, s + 0.1), l * 0.55] : null,
  // Grukk : peau gris-vert de brute
  grukk: (h, s, l) => (h >= 10 && h <= 45 && l > 0.5) ? [80, 0.35, l * 0.7] : (s > 0.15 ? [h, s * 0.7, l * 0.75] : null),
  // Chevalier sans repos : os bleutés, armure sombre
  spectre: (h, s, l) => (s < 0.2 && l > 0.6) ? [200, 0.35, l * 0.9] : (s > 0.15 ? [215, s * 0.6, l * 0.6] : null),
  // Roi gobelin : peau verte, tenue dorée
  roi_gobelin: (h, s, l) => (h >= 10 && h <= 45 && l > 0.5) ? [95, 0.5, l * 0.75] : (s > 0.15 ? [45, Math.min(1, s + 0.3), l * 0.9] : null),
  // Grukk le Tyran : peau sombre, cuir rouge
  tyran: (h, s, l) => (h >= 10 && h <= 45 && l > 0.5) ? [70, 0.3, l * 0.55] : (s > 0.15 ? [0, Math.min(1, s + 0.2), l * 0.6] : null),
  // Culte de l'Éclipse : noir et violet
  eclipse: (h, s, l) => (h >= 10 && h <= 45 && l > 0.55) ? null : (s > 0.12 ? [270, Math.min(1, s + 0.2), l * 0.5] : null),
  // Marais : écailles vertes, chef aux écailles rouges et or, noyés bleuâtres, troll mousse, guenaude
  lezard: (h, s, l) => (h >= 10 && h <= 45 && l > 0.5) ? [140, 0.45, l * 0.62] : (s > 0.15 ? [30, s * 0.5, l * 0.6] : null),
  lezard_chef: (h, s, l) => (h >= 10 && h <= 45 && l > 0.5) ? [8, 0.6, l * 0.6] : (s > 0.15 ? [45, Math.min(1, s + 0.3), l * 0.9] : null),
  noye: (h, s, l) => (h >= 10 && h <= 45 && l > 0.5) ? [190, 0.22, l * 0.66] : (s > 0.1 ? [200, s * 0.3, l * 0.5] : null),
  troll: (h, s, l) => (h >= 10 && h <= 45 && l > 0.5) ? [65, 0.22, l * 0.5] : (s > 0.15 ? [95, s * 0.5, l * 0.38] : null),
  guenaude: (h, s, l) => (h >= 10 && h <= 45 && l > 0.5) ? [85, 0.35, l * 0.6] : ((h > 200 || h < 10) && s > 0.15 ? [100, 0.3, l * 0.35] : null),
  // Givre : yéti blanc, prêtresse cyan, géant à peau bleue, reine argentée
  yeti: (h, s, l) => (h >= 10 && h <= 45 && l > 0.5) ? [205, 0.12, Math.min(0.92, l * 1.2)] : (s > 0.1 ? [205, 0.18, Math.min(0.9, l * 1.35 + 0.1)] : null),
  givre: (h, s, l) => (h > 200 && s > 0.15) ? [195, Math.min(1, s + 0.1), Math.min(0.85, l * 1.2)] : null,
  geant_givre: (h, s, l) => (h >= 10 && h <= 45 && l > 0.5) ? [205, 0.45, l * 0.72] : (s > 0.15 ? [210, s * 0.4, l * 0.6] : null),
  reine_hiver: (h, s, l) => (h >= 10 && h <= 45 && l > 0.5) ? [210, 0.25, Math.min(0.92, l * 1.05)] : ((h > 200 || h < 10) && s > 0.15 ? [200, 0.3, Math.min(0.95, l * 1.5)] : null),
  // Tombeau : bandelettes, chacals noir et or, prêtre doré, pharaon or et lapis
  momie: (h, s, l) => (h >= 10 && h <= 45 && l > 0.5) ? [40, 0.25, Math.min(0.9, l * 1.05)] : (s > 0.08 ? [38, 0.28, Math.min(0.85, l * 1.15)] : null),
  chacal: (h, s, l) => (h >= 10 && h <= 45 && l > 0.5) ? [25, 0.15, l * 0.33] : (s > 0.15 ? [45, 0.75, l * 0.9] : null),
  or_desert: (h, s, l) => (l > 0.45 && (h < 70 || s < 0.25)) ? [42, 0.5, Math.min(0.85, l * 0.92)] : (s > 0.15 ? [215, 0.6, l * 0.5] : null),
  pharaon: (h, s, l) => (h >= 10 && h <= 45 && l > 0.5) ? [40, 0.25, Math.min(0.9, l * 1.05)] : (s > 0.15 ? (h < 60 ? [45, 0.8, l * 0.9] : [215, 0.7, l * 0.55]) : null),
  // Château : goule grise, blême violacé, nécrophage cendreux, vampires pâles en noir et rouge
  goule: (h, s, l) => (h >= 10 && h <= 45 && l > 0.5) ? [90, 0.12, l * 0.6] : (s > 0.1 ? [30, s * 0.25, l * 0.4] : null),
  bleme: (h, s, l) => (h >= 10 && h <= 45 && l > 0.5) ? [270, 0.12, l * 0.55] : (s > 0.1 ? [280, s * 0.3, l * 0.35] : null),
  necrophage: (h, s, l) => (h >= 10 && h <= 45 && l > 0.5) ? [200, 0.08, l * 0.62] : (s < 0.22 && l > 0.3 ? [0, 0.05, l * 0.45] : (s > 0.15 ? [0, s * 0.4, l * 0.35] : null)),
  vampire: (h, s, l) => (h >= 10 && h <= 45 && l > 0.5) ? [220, 0.08, Math.min(0.92, l * 1.08)] : (s > 0.15 ? (l > 0.4 ? [355, Math.min(1, s + 0.3), l * 0.55] : [0, 0, l * 0.4]) : null),
  comte: (h, s, l) => (h >= 10 && h <= 45 && l > 0.5) ? [220, 0.08, Math.min(0.92, l * 1.08)] : (s < 0.22 && l > 0.3 ? [0, 0, l * 0.3] : (s > 0.15 ? [355, Math.min(1, s + 0.35), l * 0.55] : null)),
  // Côtes : écailles vert-bleu, baron requin, merrow vert sombre, harpie plumes brunes
  sahuagin: (h, s, l) => (h >= 10 && h <= 45 && l > 0.5) ? [170, 0.45, l * 0.6] : (s > 0.15 ? [190, s * 0.5, l * 0.5] : null),
  baron_sahuagin: (h, s, l) => (h >= 10 && h <= 45 && l > 0.5) ? [200, 0.3, l * 0.62] : (s > 0.15 ? [45, Math.min(1, s + 0.2), l * 0.8] : null),
  merrow: (h, s, l) => (h >= 10 && h <= 45 && l > 0.5) ? [150, 0.35, l * 0.48] : (s > 0.15 ? [170, s * 0.4, l * 0.4] : null),
  harpie: (h, s, l) => (h >= 10 && h <= 45 && l > 0.55) ? null : (s > 0.15 ? [28, s * 0.6, l * 0.6] : null),
  // Méduse : peau d'écailles vertes, robe pourpre
  meduse: (h, s, l) => (h >= 10 && h <= 45 && l > 0.5) ? [110, 0.35, l * 0.7] : (s > 0.15 ? [300, Math.min(1, s + 0.1), l * 0.6] : null),
  // Nécromancienne : tenue violet profond
  necro: (h, s, l) => (s > 0.2 && h > 150 && h < 270) ? [280, Math.min(1, s + 0.15), l * 0.75] : null
};

const cacheTextures = new Map();
function recolorerTexture(tex, nom) {
  const cle = tex.uuid + nom;
  if (cacheTextures.has(cle)) return cacheTextures.get(cle);
  const img = tex.image;
  const c = document.createElement('canvas');
  c.width = img.width; c.height = img.height;
  const x = c.getContext('2d');
  x.drawImage(img, 0, 0);
  const d = x.getImageData(0, 0, c.width, c.height);
  const p = d.data, f = RECOLORATIONS[nom];
  for (let i = 0; i < p.length; i += 4) {
    const r = p[i] / 255, g = p[i + 1] / 255, b = p[i + 2] / 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
    let h = 0, s = 0;
    if (mx !== mn) {
      const dd = mx - mn;
      s = l > 0.5 ? dd / (2 - mx - mn) : dd / (mx + mn);
      h = mx === r ? (g - b) / dd + (g < b ? 6 : 0) : mx === g ? (b - r) / dd + 2 : (r - g) / dd + 4;
      h *= 60;
    }
    const res = f(h, s, l);
    if (!res) continue;
    const [nh, ns, nl] = res;
    const q = nl < 0.5 ? nl * (1 + ns) : nl + ns - nl * ns, pp = 2 * nl - q;
    const conv = t => { t = (t + 1) % 1; return t < 1 / 6 ? pp + (q - pp) * 6 * t : t < 0.5 ? q : t < 2 / 3 ? pp + (q - pp) * (2 / 3 - t) * 6 : pp; };
    const hh = nh / 360;
    p[i] = conv(hh + 1 / 3) * 255; p[i + 1] = conv(hh) * 255; p[i + 2] = conv(hh - 1 / 3) * 255;
  }
  x.putImageData(d, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.flipY = tex.flipY;
  t.encoding = tex.encoding;
  t.wrapS = tex.wrapS; t.wrapT = tex.wrapT;
  t.magFilter = tex.magFilter; t.minFilter = tex.minFilter;
  cacheTextures.set(cle, t);
  return t;
}

// Contour noir sur les modèles (y compris les maillages animés)
function contourGLB(racine, epaisseur = 0.022) {
  const liste = [];
  racine.traverse(o => { if (o.isMesh && !o.userData.contour) liste.push(o); });
  for (const m of liste) {
    const cm = new THREE.MeshBasicMaterial({ color: 0x140c08, side: THREE.BackSide });
    cm.onBeforeCompile = sh => {
      sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', `vec3 transformed = position + normalize(normal) * ${epaisseur.toFixed(4)};`);
    };
    let c;
    if (m.isSkinnedMesh) { c = new THREE.SkinnedMesh(m.geometry, cm); c.bind(m.skeleton, m.bindMatrix); }
    else c = new THREE.Mesh(m.geometry, cm);
    c.userData.contour = true;
    c.frustumCulled = false;
    m.add(c);
  }
}

// Construit un personnage animé ; renvoie { objet, mixer, anims } ou null
function construireGLB(modele) {
  const cfg = PERSOS3D[modele];
  if (!cfg) return null;
  const src = Ressources3D.gltf[cfg.glb];
  if (!src || !Ressources3D.gltf.skeleton_warrior) return null;
  const objet = THREE.SkeletonUtils.clone(src.scene);
  const montrer = new Set(cfg.montrer || []), cacher = new Set(cfg.cacher || []);
  objet.traverse(o => {
    if (ACCESSOIRES.has(o.name)) o.visible = montrer.has(o.name);
    if (cacher.has(o.name)) o.visible = false;
    if (o.isMesh) {
      o.castShadow = true;
      o.frustumCulled = false;
      o.material = o.material.clone();
      if (cfg.recolorer && o.material.map) o.material.map = recolorerTexture(o.material.map, cfg.recolorer);
      if (cfg.teintes && cfg.teintes[o.name]) o.material.color.setHex(cfg.teintes[o.name]);
    }
  });
  // Accessoires dessinés accrochés à un os (serpents de la méduse, ailes de la harpie)
  for (const aj of cfg.ajouts || []) {
    const os = objet.getObjectByName(aj.os);
    if (!os || !AJOUTS_3D[aj.fabrique]) continue;
    const g = AJOUTS_3D[aj.fabrique]();
    ajouterContours(g);
    g.traverse(o => { if (o.isMesh) o.castShadow = true; });
    os.add(g);
  }
  for (const [main, fichier] of Object.entries(cfg.armes || {})) {
    const os = objet.getObjectByName(main === 'droite' ? 'handslot.r' : 'handslot.l');
    const arme = Ressources3D.gltf[fichier];
    if (os && arme) {
      const a = arme.scene.clone();
      a.traverse(o => { if (o.isMesh) { o.castShadow = true; o.material = o.material.clone(); } });
      os.add(a);
    }
  }
  contourGLB(objet);
  objet.scale.setScalar(1.75 / 2.3 * (cfg.echelle || 1));
  const mixer = new THREE.AnimationMixer(objet);
  return { objet, mixer, anims: { ...ANIMS_DEFAUT, ...(cfg.anims || {}) } };
}

// ---------------------------------------------------------------------
// Décor KayKit : dalles, mur du fond, torches, bannières, accessoires
// ---------------------------------------------------------------------
const ECHELLE_DECOR = 0.5;

function instancierPiece(nom, matrices, ombre = true) {
  const sc = Ressources3D.piece(nom);
  if (!sc) return [];
  sc.updateMatrixWorld(true);
  const res = [];
  sc.traverse(o => {
    if (!o.isMesh) return;
    const im = new THREE.InstancedMesh(o.geometry, o.material, matrices.length);
    const m = new THREE.Matrix4();
    matrices.forEach((mat, i) => { m.multiplyMatrices(mat, o.matrixWorld); im.setMatrixAt(i, m); });
    im.receiveShadow = true;
    im.castShadow = ombre;
    res.push(im);
  });
  return res;
}

function piece(nom, x, z, ry = 0, ech = ECHELLE_DECOR) {
  const sc = Ressources3D.piece(nom);
  if (!sc) return new THREE.Group();
  const g = sc.clone();
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  g.position.set(x, 0, z);
  g.rotation.y = ry;
  g.scale.setScalar(ech);
  return g;
}

// Construit le décor ; zMur = position du mur du fond, bords = fonction(zMonde) → demi-largeur visible
function construireDecorKK(scene, zMur, bords, theme, rangsMur = 1) {
  const groupe = new THREE.Group();
  const S = ECHELLE_DECOR, T = 4 * S;
  // Sol : dalles de 2 × 2
  const m4 = (x, z, ry) => new THREE.Matrix4().compose(new THREE.Vector3(x, 0, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)), new THREE.Vector3(S, S, S));
  const normales = [], rocs = [];
  let graine = 7;
  const alea = () => (graine = (graine * 9301 + 49297) % 233280) / 233280;
  for (let ix = -6; ix <= 6; ix++) for (let iz = 0; iz < 14; iz++) {
    const x = ix * T, z = zMur + T / 2 + iz * T;
    const r = alea(), ry = Math.floor(alea() * 4) * Math.PI / 2;
    (r < 0.05 ? rocs : normales).push(m4(x, z, ry));
  }
  const dalles = [...instancierPiece('floor_tile_large', normales, false), ...instancierPiece('floor_tile_large_rocks', rocs, false)]
  dalles.forEach(o => { o.material = o.material.clone(); o.material.color.setHex(theme.sol); groupe.add(o); });

  // Mur du fond
  const types = ['wall', 'wall_arched', 'wall', 'wall_cracked', 'wall', 'wall_arched', 'wall_broken'];
  for (let k = 0; k < rangsMur; k++) {
    for (let i = -5; i <= 5; i++) {
      const m = piece(k ? 'wall' : types[(i + 7) % types.length], i * T, zMur - k * 0.05);
      m.position.y = k * T;
      groupe.add(m);
    }
  }
  // Piliers, torches et bannières sur le mur
  const torches = [];
  for (const x of [-T * 1.5, T * 1.5]) {
    groupe.add(piece('pillar', x, zMur + 0.1));
  }
  for (const x of [-T * 2.5, T * 0.5 - T, T * 2.5]) {
    const t = piece('torch_mounted', x, zMur + 0.26);
    t.position.y = 1.35;
    groupe.add(t);
    torches.push(t);
  }
  groupe.add(piece('banner_shield_red', -T * 0.5 + T, zMur + 0.02));
  groupe.add(piece('banner_patternA_red', -T * 3.5, zMur + 0.02));
  groupe.add(piece('banner_patternA_red', T * 3.5, zMur + 0.02));

  // Accessoires au fond, dans les coins (hors des colonnes de personnages)
  const bordFond = bords(zMur + 1.2);
  if (!theme.exterieur) {
    groupe.add(piece('barrel_large', -bordFond + 0.5, zMur + 0.9, 0, 0.35));
    groupe.add(piece('barrel_small_stack', -bordFond + 1.3, zMur + 0.7, 0.6, 0.35));
    groupe.add(piece('crates_stacked', bordFond - 0.5, zMur + 0.9, -0.3, 0.35));
    groupe.add(piece('chest_gold', bordFond - 1.35, zMur + 0.6, -0.2, 0.35));
    groupe.add(piece('candle_triple', -bordFond + 2.0, zMur + 0.5, 0, 0.35));
  } else {
    groupe.add(piece('rubble_large', -bordFond + 0.7, zMur + 0.8, 0.4, 0.4));
    groupe.add(piece('rubble_half', bordFond - 0.7, zMur + 0.8, -0.6, 0.4));
  }
  // Lumière et flamme des torches murales
  const flammes = [];
  for (const t of torches) {
    const lum = new THREE.PointLight(theme.flamme, 1.4, 6, 1.7);
    lum.position.set(t.position.x, 2.0, zMur + 0.7);
    groupe.add(lum);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: texturePoint(), color: theme.flamme, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }));
    sp.scale.set(0.9, 1.2, 1);
    sp.position.set(t.position.x, 1.85, zMur + 0.52);
    groupe.add(sp);
    flammes.push({ lum, sp, phase: Math.random() * 6 });
  }
  scene.add(groupe);
  return { groupe, flammes };
}

function animerDecorKK(d, s, particules) {
  if (!d) return;
  for (const f of d.flammes) {
    const v = Math.sin(s * 11 + f.phase) * 0.1 + Math.sin(s * 27 + f.phase) * 0.06;
    f.lum.intensity = 1.3 + v * 2.5;
    f.sp.scale.set(0.85 + v, 1.15 + v * 1.5, 1);
    if (Math.random() < 0.18) {
      const p = f.sp.position.clone();
      particules.emettre(p, new THREE.Vector3((Math.random() - 0.5) * 0.2, 0.6 + Math.random() * 0.5, 0.1), [1, 0.6, 0.2], 1.0, -0.1, 0.05);
    }
  }
}

// ---------------------------------------------------------------------
// Écran de chargement plein écran (défini dans index.html)
// ---------------------------------------------------------------------
const EcranChargement = {
  ferme: false,
  fermer() {
    if (this.ferme) return;
    this.ferme = true;
    if (window.EC) EC.fermer();
  },
  // Les scripts sont là : on attend les modèles 3D (au plus 25 s)
  suivre() {
    if (window.EC) EC.cible(20);
    if (!Modeles3D.actif || Ressources3D.pret) return this.fermer();
    setTimeout(() => this.fermer(), 25000);
  }
};
