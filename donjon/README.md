# Cryptes & Dés

Roguelike au tour par tour : équipe de 4 sur deux lignes (Avant / Arrière), carte à embranchements, règles D&D 5e.

**Lignes** : le corps à corps s'utilise depuis la ligne Avant et ne touche que la ligne Avant ennemie ; la distance et les sorts touchent tout le monde. Si toute une ligne Avant est hors de combat, la ligne Arrière derrière elle devient attaquable au corps à corps.
Ouvrez `index.html` dans un navigateur : aucun serveur ni dépendance.

## Organisation

| Fichier | Rôle |
|---|---|
| `js/des.js` | Lancers de dés (`Des.lancer('2d6+3')`, `Des.d20(avantage)`) et hasard réglable (`Hasard.graine(n)` / `alea()` : toute la logique du jeu tire ses nombres là, ce qui rend le défi quotidien identique pour tous) |
| `js/donnees/actions.js` | Toutes les actions des PJ (format documenté en tête de fichier) |
| `js/donnees/classes.js` | Les 13 classes (dont Ensorceleur à métamagie et Artificier) (stats, rôle, actions de départ et à débloquer) et la montée de niveau (`PROGRESSION`, niveaux 4 à 7), l'expérience (`GAINS_XP`, `SEUILS_XP`) |
| `js/donnees/sousclasses.js` | Les 4 ou 5 sous-classes de chaque classe (54 en tout) (`SOUS_CLASSES`) : capacités, actions remplacées, gains au niveau 5, campagne qui les débloque |
| `js/donnees/monstres.js` | Monstres, boss et listes de rencontres |
| `js/donnees/objets.js` | Objets magiques, améliorations, génération des récompenses |
| `js/donnees/evenements.js` | Événements à choix (cases ❓) ; ceux qui ont un champ `campagne` n'apparaissent que dans cette campagne (et sortent en priorité) |
| `js/donnees/etages.js` | Les 3 étages de la première campagne : rencontres, boss, ambiance, puissance des monstres (`force`) |
| `js/donnees/campagnes.js` | Les campagnes (étages, règles, déblocage) et la progression mémorisée entre les parties |
| `js/son.js` | Sons et musique synthétisés, réglages ; une musique par décor (`STYLES_MUSIQUE` : mode, tempo, timbres, percussions) et des cris par famille de monstres (`FAMILLES_SONORES`) |
| `js/combat.js` | Moteur de combat : initiative, attaques, sauvegardes, états, Peur, IA |
| `js/carte.js` | Génération de la carte (`CONFIG_CARTE` : rangées, chemins, fréquence des salles, minimums) et dessin |
| `js/jeu.js` | État de la partie, enchaînement des écrans, repos, sauvegarde ; écran de montée de niveau (`photoHeros` compare le héros avant / après) |
| `js/modeles3d.js` | Scène 3D cartoon : diorama, figurines chibi (`FIGURINES`), particules |
| `js/decor3d.js` | Décor propre à chaque thème (`DECORS_THEMES`, `ELEMENTS_DECOR`, revêtement du sol `SOLS_THEMES`), particules d'ambiance (`AMBIANCES` : neige, braises, lucioles…) et effets de combat (`Effets3D` : cercle magique, entaille, onde de choc, poussière) |
| `js/ressources3d.js` | Chargement des modèles animés, équipement et couleurs de chaque personnage (`PERSOS3D`), décor KayKit |
| `js/interface.js` | Affichage et clics |
| `lib/three.min.js` | Three.js 0.149 (licence MIT), embarqué pour jouer hors ligne |

## Ajouter du contenu

- **Une campagne** : une entrée dans `CAMPAGNES` avec ses `etages` et `apres` (campagne à terminer pour la débloquer).
- **Le Dédale du Chaos** reste toujours la dernière campagne (replacé en fin de liste, difficulté = la plus haute + 1). Il se met à jour tout seul : rencontres, boss et renforts d'invocation viennent de toutes les autres campagnes, donc une nouvelle campagne ou un nouveau monstre y apparaît sans rien modifier. Après un ajout, revérifier son taux de victoire (8 à 10 %) avec le simulateur et ajuster `PV_CHAOS`.
- **Détails du Chaos** (`aleatoire: true`, débloqué quand toutes les campagnes sont terminées) : `genererEtagesAleatoires()` (`campagnes.js`) mélange les rencontres de tous les étages de toutes les campagnes (chacune garde son décor ; `forceChaos` ramène sa puissance à sa place sur la carte), tire deux boss différents parmi tous les boss, et `Carte.genererDouble()` empile deux cartes en une. Les monstres y reçoivent des mutations (`MUTATIONS_CHAOS`) et les boss des pouvoirs (`POUVOIRS_BOSS`), dans `combat.js` (`appliquerChaos`).
- **Les monstres suivent le bestiaire D&D 5e** (SRD) : leurs capacités particulières (paralysie des goules, régénération du troll et du vampire bloquée par le feu ou le radiant, division du pouding, engloutissement du cube, pétrification de la méduse, têtes de l'hydre…) sont des `traits` ou des effets décrits en tête de `monstres.js`.
- **Un monstre** : une entrée dans `MONSTRES`, puis son identifiant dans une rencontre de `RENCONTRES` (`{ avant: [...], arriere: [...] }`).
- **Une classe** : une entrée dans `CLASSES` (avec `role`), son identifiant dans `TOUTES_CLASSES`, ses gains dans `PROGRESSION`, son apparence dans `PERSOS3D` (`ressources3d.js`).
- **Une sous-classe** : une entrée dans `SOUS_CLASSES` (`sousclasses.js`), avec `deblocage` (campagne à terminer), ses `traits` (liste en tête du fichier, lus par `combat.js`), `remplace` et `niv5`.
- **Une action** : une entrée dans `ACTIONS`, puis son identifiant dans `actions` ou `poolActions` d'une classe.
- **Un objet de campagne** : ajouter `campagne: 'id'` ; il n'est proposé (25 % des récompenses d'élite, de boss et de trésor) que dans cette campagne.
- **Un objet** : une entrée dans `OBJETS` avec sa `rarete` et ses effets dans `mods` (bonus chiffrés et `traits` lus par le moteur de combat ; liste en tête de `objets.js`). Les objets peuvent ainsi être donnés d'un héros à l'autre.
- **Un consommable** : une entrée dans `CONSOMMABLES` (`objets.js`) et l'action correspondante dans `ACTIONS_SAC` (`actions.js`).
- **Le marchand et l'or** : `Marchand` et `GAINS_OR` dans `objets.js`.
- **Un événement** : un objet dans `EVENEMENTS` avec des `choix` qui ont une fonction `resoudre(jeu)`. `resoudre` peut renvoyer une suite de `choix` (événement en plusieurs étapes) ou un `combat`. Les utilitaires (donner, retirer, améliorer ou transformer un objet, or, PV max…) sont listés en tête de `evenements.js`.
- **Un effet spécial** : un type `'special'` et une fonction du même nom dans `SPECIAUX` (`combat.js`).
- **Une figurine 3D** : une fonction dans `FIGURINES` (`modeles3d.js`) portant l'identifiant du monstre ou de la classe ; sans figurine, une boule grise s'affiche. Sans WebGL, le jeu affiche les emojis.
- **Un état** (étourdi, béni…) : une entrée dans `ETATS` (`combat.js`).

Les valeurs de Peur (paliers, crises, vertu) sont regroupées dans `PEUR` et `CRISES` (`combat.js`). La chance d'objet après un combat ordinaire est `CHANCE_OBJET_COMBAT` (`objets.js`).
La montée de niveau est dans `PROGRESSION` (`classes.js`).

## Expérience et niveaux

- Les héros commencent au niveau 3 et montent jusqu'au niveau 7 (`NIVEAU_MAX`). L'équipe partage son XP : combat 10, élite 30, boss d'étage 50 (`GAINS_XP`), plus certains événements (`jeu.gagnerXP(n)`). Seuils : `SEUILS_XP` (70 / 200 / 320 / 420). Une barre d'XP s'affiche sur la carte, et l'écran de niveau apparaît dès qu'un seuil est franchi.
- Niveau 6 : seconde capacité de chaque sous-classe (`NIV6_SOUS_CLASSES`, `sousclasses.js`) et un emplacement de niveau 3. Niveau 7 : sorts de niveau 4 (Tempête de grêle, Flétrissement, Bannissement, Confusion) et capacités martiales (Indomptable, Critique brutal, Évasion, sournoise 4d6).
- Le repos complet a toujours lieu entre deux étages ; une montée de niveau en cours d'étage n'ajoute que les PV, emplacements et charges gagnés.
- Les élites reçoivent toujours une mutation du Chaos et, dès l'étage 2, un monstre en plus (`renforcerElite`, `campagnes.js`). Les monstres de l'étage 3 sont renforcés (`RENFORT_ETAGE`). Ni l'un ni l'autre ne s'applique au Chaos, réglé par `PV_CHAOS`.

## Difficultés et défi quotidien

- **Difficultés** (`DIFFICULTES` dans `campagnes.js`) : Normal, Héroïque (débloquée en gagnant en Normal), Cauchemar (débloquée en gagnant en Héroïque). Elles réutilisent les mutations du Chaos (`appliquerChaos(type, final, reglage)`) avec une chance réglable, plus de Peur et plus d'or. `DIFF=heroique node outils-simulation.js 400 crypte` les simule.
- **Défi quotidien** (`DefiDuJour` dans `jeu.js`) : la date donne une graine qui choisit campagne, équipe, sous-classes et un modificateur, puis fixe le hasard de toute la partie. Le score (étage, salles, combats, or, victoire) et le record sont gardés dans le navigateur.

## Concentration

Comme dans D&D, certains sorts (`concentration: true` dans `actions.js` : Bénédiction, Marque du chasseur, Maléfice, Rayon de lune, Appel de la foudre, Esprits gardiens, Faim d'Hadar, Motif hypnotique, Confusion, Bannissement…) demandent de la concentration (`combat.js`, partie « concentration ») :
- un seul à la fois par héros : en lancer un autre met fin au premier ;
- à chaque dégât subi, sauvegarde de CON (DD 10 ou la moitié des dégâts) ; à 0 PV, le sort cesse ; ses états sont alors retirés ;
- `concPermanent` : ses états durent tant que la concentration tient ; `persistant` (Esprits gardiens, Faim d'Hadar) : le sort refrappe au début de chaque tour du lanceur ; `relanceGratuite` (Appel de la foudre, Rayon de lune) : relancé sans emplacement tant qu'elle tient ;
- trait `mageGuerre` (Anneau du mage de guerre) : avantage aux sauvegardes de concentration.

## Grimoire, choix des sorts et boss finaux

- **Actions préparées** : 5 (6 pour les lanceurs de sorts, `maxActions`). Une action apprise en trop va dans le **grimoire** (`pj.grimoire`, `apprendre()` dans `classes.js`) ; rien n'est oublié. Hors combat, la fenêtre 👥 Équipe permet de préparer ou ranger ses actions (`Jeu.preparerAction`, `Jeu.rangerAction`).
- **Choix de sort à la montée de niveau** : les lanceurs choisissent un sort parmi trois (`optionsSorts` : le sort de `PROGRESSION` + des sorts de la `poolActions` de la classe utilisables à leur niveau). Les choix en attente sont dans `pj.choixSorts` ; `resoudreChoixSorts` les règle seul (Chaos, simulateur).
- **Sorts D&D supplémentaires** (`actions.js`) : Bouclier, Rayon empoisonné, Lueurs féeriques, Blessure, Bouclier de la foi, Châtiment tonitruant, Grêle d'épines, Mot de guérison de groupe, Fracassement, Immobilisation de personne, Invisibilité, Image miroir, Croissance d'épines, Lenteur, Tempête de neige, Terreur ; nouveaux états Illuminé, Ralenti, Bouclier de la foi.
- **Seconde phase des boss finaux** (`PHASE2`, `PHASES_BOSS`, `Combat.secondePhase`) : à la moitié de ses PV, le boss du dernier étage se libère de ses entraves, frappe plus fort (+1 dégât) et appelle un renfort de son étage ; chaque boss a sa réplique. `SANS_PHASE=1` la retire du simulateur.

## Lancer un sort à un niveau supérieur

En combat, quand un sort est sélectionné et que le héros a des emplacements plus hauts, des pastilles « Emplacement : niv. 1 / niv. 2… » permettent de choisir (`Ui.choixNiveauSort`, `Combat.jouer(…, niveau)`). Le bonus vient de l'action : `parNiveau` (dés de dégâts ou de soin par niveau en plus, ex. `'1d6'`, `'1d4+1'`), `parNiveauRayons` (Rayon ardent), `parNiveauReserve` (Sommeil) ; `Combat.surcharger(act, k)` fabrique l'action renforcée. Un sort lancé faute d'emplacement plus bas en profite aussi, et un sort de concentration garde son niveau (Appel de la foudre relancé au même niveau).

## Équilibrage

`node outils-simulation.js 400 crypte` (ou `horde`, `eclipse`) joue 400 expéditions avec l'équipe de base ;
`node outils-simulation.js 1500 crypte classes` joue avec des équipes aléatoires (au moins un héros de front et un soigneur) et affiche le taux de victoire de chaque classe. Il joue 400 expéditions complètes sans affichage (stratégie simple : soigner
les blessés, frapper l'ennemi le plus fragile) et affiche le taux de victoire, le niveau moyen de l'équipe à chaque boss et les PV perdus par combat (`XP=1` affiche aussi l'XP au boss ; `SANS_ELITE=1` retire le renfort des élites).
`node outils-simulation.js 2000 crypte sousclasses` fait de même avec des sous-classes au hasard et affiche le taux de chaque sous-classe ;
`SC_SEUL=clerc:vie node outils-simulation.js 800 crypte classes` donne la sous-classe à une seule classe (comparaison avec `SANS_SC=1`).
Réglage actuel (sous-classes au hasard, avec la seconde phase des boss) : Crypte 50 %, Dragon 20 %, Château 10 %, Dédale du Chaos 8 à 10 % (`PV_CHAOS` dans `campagnes.js`).

## Mode test

Ouvrez le jeu avec `?test` à la fin de l'adresse (ou touchez 5 fois le titre) : toutes les campagnes et sous-classes sont débloquées. `?test=0` (ou le bouton sur l'écran titre) le désactive.
`RENFORT_GLOBAL` (`etages.js`) ajuste la puissance de tous les monstres d'un coup.

## Crédits graphiques

Personnages, animations et décor : packs **KayKit** de Kay Lousberg (Adventurers, Skeletons, Dungeon Remastered),
licence CC0 — https://kaylousberg.com. Les fichiers `modeles/*.js` sont ces modèles allégés (animations triées,
géométrie compressée) puis emballés en base64 pour fonctionner aussi en ouvrant `index.html` directement.
Le script `modeles/construire.mjs` (gltf-transform) les régénère.

Moteur 3D : three.js r149 (licence MIT), avec GLTFLoader et SkeletonUtils convertis en scripts classiques.

## Publier une nouvelle version

Augmenter le numéro `?v=` dans `index.html` (et `VERSION_JEU` dans le même fichier) ainsi que `V` dans `sw.js` :
les navigateurs rechargent alors tous les fichiers d'un coup, sans mélanger ancienne et nouvelle version.
