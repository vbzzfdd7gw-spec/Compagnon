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
| `js/combat.js` | Moteur de combat : initiative, attaques, sauvegardes, états, Peur, IA |
| `js/carte.js` | Génération et dessin de la carte |
| `js/jeu.js` | État de la partie, enchaînement des écrans, repos, sauvegarde |
| `js/modeles3d.js` | Scène 3D cartoon : diorama, figurines chibi (`FIGURINES`), particules |
| `js/interface.js` | Affichage et clics |
| `lib/three.min.js` | Three.js 0.149 (licence MIT), embarqué pour jouer hors ligne |

## Ajouter du contenu

- **Un monstre** : une entrée dans `MONSTRES`, puis son identifiant dans une rencontre de `RENCONTRES` (`{ avant: [...], arriere: [...] }`).
- **Une action** : une entrée dans `ACTIONS`, puis son identifiant dans `actions` ou `poolActions` d'une classe.
- **Un objet** : une entrée dans `OBJETS` avec une fonction `appliquer(pj)`.
- **Un événement** : un objet dans `EVENEMENTS` avec des `choix` qui ont une fonction `resoudre(jeu)`.
- **Un effet spécial** : un type `'special'` et une fonction du même nom dans `SPECIAUX` (`combat.js`).
- **Une figurine 3D** : une fonction dans `FIGURINES` (`modeles3d.js`) portant l'identifiant du monstre ou de la classe ; sans figurine, une boule grise s'affiche. Sans WebGL, le jeu affiche les emojis.
- **Un état** (étourdi, béni…) : une entrée dans `ETATS` (`combat.js`).

Les valeurs de Peur sont regroupées dans la constante `PEUR` (`combat.js`).
