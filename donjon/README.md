# Cryptes & Dés

Roguelike au tour par tour : équipe de 4 sur deux lignes (Avant / Arrière), carte à embranchements, règles D&D 5e.

**Lignes** : le corps à corps s'utilise depuis la ligne Avant et ne touche que la ligne Avant ennemie ; la distance et les sorts touchent tout le monde. Si toute une ligne Avant est hors de combat, la ligne Arrière derrière elle devient attaquable au corps à corps.
Ouvrez `index.html` dans un navigateur : aucun serveur ni dépendance.

## Organisation

| Fichier | Rôle |
|---|---|
| `js/des.js` | Lancers de dés (`Des.lancer('2d6+3')`, `Des.d20(avantage)`) |
| `js/donnees/actions.js` | Toutes les actions des PJ (format documenté en tête de fichier) |
| `js/donnees/classes.js` | Les 4 classes : stats, actions de départ, actions à débloquer |
| `js/donnees/monstres.js` | Monstres, boss et listes de rencontres |
| `js/donnees/objets.js` | Objets magiques, améliorations, génération des récompenses |
| `js/donnees/evenements.js` | Événements à choix (cases ❓) |
| `js/donnees/etages.js` | Les 3 étages de la première campagne : rencontres, boss, ambiance, puissance des monstres (`force`) |
| `js/donnees/campagnes.js` | Les campagnes (étages, règles, déblocage) et la progression mémorisée entre les parties |
| `js/son.js` | Sons et musique synthétisés, réglages (son, musique, vitesse) |
| `js/combat.js` | Moteur de combat : initiative, attaques, sauvegardes, états, Peur, IA |
| `js/carte.js` | Génération et dessin de la carte |
| `js/jeu.js` | État de la partie, enchaînement des écrans, repos, sauvegarde |
| `js/modeles3d.js` | Scène 3D cartoon : diorama, figurines chibi (`FIGURINES`), particules |
| `js/ressources3d.js` | Chargement des modèles animés, équipement et couleurs de chaque personnage (`PERSOS3D`), décor KayKit |
| `js/interface.js` | Affichage et clics |
| `lib/three.min.js` | Three.js 0.149 (licence MIT), embarqué pour jouer hors ligne |

## Ajouter du contenu

- **Une campagne** : une entrée dans `CAMPAGNES` avec ses `etages` et `apres` (campagne à terminer pour la débloquer).
- **Un monstre** : une entrée dans `MONSTRES`, puis son identifiant dans une rencontre de `RENCONTRES` (`{ avant: [...], arriere: [...] }`).
- **Une action** : une entrée dans `ACTIONS`, puis son identifiant dans `actions` ou `poolActions` d'une classe.
- **Un objet** : une entrée dans `OBJETS` avec une fonction `appliquer(pj)`.
- **Un événement** : un objet dans `EVENEMENTS` avec des `choix` qui ont une fonction `resoudre(jeu)`.
- **Un effet spécial** : un type `'special'` et une fonction du même nom dans `SPECIAUX` (`combat.js`).
- **Une figurine 3D** : une fonction dans `FIGURINES` (`modeles3d.js`) portant l'identifiant du monstre ou de la classe ; sans figurine, une boule grise s'affiche. Sans WebGL, le jeu affiche les emojis.
- **Un état** (étourdi, béni…) : une entrée dans `ETATS` (`combat.js`).

Les valeurs de Peur sont regroupées dans la constante `PEUR` (`combat.js`).
La montée de niveau est dans `PROGRESSION` (`classes.js`).

## Équilibrage

`node outils-simulation.js 400 crypte` (ou `horde`, `eclipse`) joue 400 expéditions complètes sans affichage (stratégie simple : soigner
les blessés, frapper l'ennemi le plus fragile) et affiche le taux de victoire et les PV perdus par combat.
Réglage actuel : environ 50 % de victoires pour la Crypte, 36 % pour la Horde, 24 % pour l'Éclipse.

## Crédits graphiques

Personnages, animations et décor : packs **KayKit** de Kay Lousberg (Adventurers, Skeletons, Dungeon Remastered),
licence CC0 — https://kaylousberg.com. Les fichiers `modeles/*.js` sont ces modèles allégés (animations triées,
géométrie compressée) puis emballés en base64 pour fonctionner aussi en ouvrant `index.html` directement.
Le script `modeles/construire.mjs` (gltf-transform) les régénère.

Moteur 3D : three.js r149 (licence MIT), avec GLTFLoader et SkeletonUtils convertis en scripts classiques.
