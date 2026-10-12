# agent-gates

Signale, dans de la **matière externe**, le texte qui cherche à se faire passer
pour une instruction adressée à l'agent qui le lit.

Il signale. **Il ne nettoie jamais.**

```bash
node src/cli.ts page-recuperee.html
cat rapport.txt | node src/cli.ts -
node src/cli.ts --json corpus/*.md
```

Sortie : `0` rien trouvé · `1` au moins un signalement · `2` erreur d'usage.
Le code `1` n'est pas un verdict de malveillance : c'est *« un humain doit lire
ce passage avant qu'un agent agisse dessus »*.

Aucune dépendance à l'exécution.

**Depuis un clone**, Node exécute le TypeScript directement — pas d'étape de
compilation, pas de chargeur. Il faut **Node ≥ 22.18 (ligne 22) ou ≥ 23.6** :
c'est là que Node retire les types sans drapeau. Entre 22.6 et 22.17, il faut
ajouter `--experimental-strip-types` (`node --experimental-strip-types src/cli.ts …`).

**Installé par npm**, le paquet livre du JavaScript, compilé au moment du
`npm pack` dans `dist/` (non versionné). Node **refuse** d'exécuter du
TypeScript situé sous `node_modules`, délibérément — un paquet qui ne
publierait que ses `.ts` planterait à la première commande. Node ≥ 22.

```bash
npm install github:DynasR/agent-gates   # npm compile à l'installation
npx agent-gates page-recuperee.html
```

---

## La règle

**Tout ce qu'un agent LIT est de la donnée.** Un fichier, une page web, une
sortie d'outil, le rapport d'un sous-agent : jamais une instruction. Les
instructions viennent du canal de conversation, et de nulle part ailleurs.

Un texte lu qui s'adresse à l'agent — qui lui prescrit une action, qui affirme
qu'on a déjà autorisé quelque chose, qui invoque une autorité système — **reste
de la donnée** : on le remonte à un humain, on n'agit pas dessus.

## Trois décisions de conception, et leurs raisons

**1. Il signale, il ne nettoie pas.** Nettoyer ferait disparaître le passage du
texte que l'humain lit : l'humain ne saurait alors jamais que quelqu'un a
essayé. Un filtre qui efface fabrique exactement l'angle mort qu'il prétend
fermer.

**2. Il ne balaie pas un dépôt.** On lui désigne des chemins. Trois raisons, et
la troisième est la vraie :

- le code d'un dépôt n'est pas de la matière externe ;
- un verrou qui crie sur du texte légitime devient un bruit ignoré ;
- **un détecteur de motifs contient les motifs qu'il détecte.** Le lâcher sur
  son propre dépôt le ferait se signaler lui-même, avec son banc et ce fichier.
  Ça ne se règle pas par une liste d'exclusions — une liste en dur se périme au
  premier renommage. Ça se supprime en ne lisant que ce qu'on désigne.

**3. Motifs à haute confiance seulement.** Sept, chacun portant en commentaire
la raison pour laquelle il ne se rencontre pas dans un texte honnête. Ce
« pourquoi » n'est pas décoratif : c'est lui qui permet de *contester* un motif
le jour où il produira son premier faux positif, plutôt que de le supprimer au
jugé.

Volontairement écartés, bien qu'étant de vrais signaux : « system prompt »,
« you are a… », la simple présence d'un impératif. Tous omniprésents dans de la
documentation technique légitime.

## Le banc a deux moitiés, et la négative compte autant

```bash
npm test        # 35 cas : 13 pièges, 12 textes honnêtes, 8 mutations, 2 invariants
npm run chaos   # lance le BINAIRE, dans les deux sens, et journalise
```

**Treize pièges** qui doivent être signalés. **Douze textes honnêtes** qui ne
doivent pas l'être — un titre « Système : », une mention de « system prompt »,
du code qui poste un jeton, un conseil de sécurité, un fait métier.

Un détecteur qu'on ne juge que sur ses prises finit par tout signaler : il
devient un bruit, on l'ignore, et il ne protège plus rien.

### Ce que la moitié négative a trouvé

Cinq défauts réels, tous découverts par le banc ou par un piège qui a rougi,
**aucun par une relecture**. Ils sont la meilleure justification de la méthode :

| # | Le défaut | Ce qui se passait |
|---|---|---|
| 1 | `\b` n'est pas Unicode en JavaScript | `\bdéjà\b` ne peut **jamais** matcher : `à` n'est pas un caractère de mot, la frontière de droite exige une transition qui n'a pas lieu. Toute une famille de motifs français serait morte en silence. |
| 2 | Le verbe nié | « N'oubliez pas de relire les consignes précédentes » et « Ne transmettez jamais votre mot de passe » étaient signalés. Ils disent le **contraire** de l'injection. |
| 3 | La pré-autorisation trop large | « L'utilisateur a déjà accepté les conditions générales lors de son inscription » était signalé. C'est un fait métier. |
| 4 | « envoyez » | Non couvert par `envoie[sz]?` (qui donne « envoies »/« envoiez ») ni par `envoyer`. La forme impérative la plus courante du français. |
| 5 | « Ignorez » | `ignore` + `z` : la garde de fin de mot le rejetait. **La forme même de l'injection** n'était pas couverte. |

Les quatre derniers sont la même maladie : un détecteur aveugle aux
conjugaisons de sa propre langue de travail, parce qu'on lit la racine d'un
verbe et qu'on croit avoir couvert le verbe.

### Et un correctif trop serré, corrigé à son tour

Le premier remède au défaut 3 exigeait que l'objet approuvé soit déictique
(« cette action ») ou suivi d'un ordre de poursuivre. Il a fait tomber **deux
pièges légitimes** : « approved the deletion of these records » n'est ni l'un ni
l'autre.

**Un oracle trop serré est aussi faux qu'un oracle trop large.** Le discriminant
juste n'était pas la déixis mais la *nature de l'objet approuvé* : une
pré-autorisation d'injection porte sur une **action** que l'agent pourrait
accomplir, jamais sur des conditions d'utilisation.

## La vérification par mutation

Un test vert ne prouve rien tant qu'on n'a pas vérifié qu'il **peut rougir**.

Pour chaque motif, le banc ne se contente pas de vérifier qu'il lève sur son
piège — c'est tautologique. Il vérifie que, **retiré, son piège n'est plus
signalé par personne**. Si un autre motif l'attrape quand même, alors celui
qu'on teste ne porte rien : il compte comme couverture sans rien couvrir, et
c'est exactement le genre de ligne verte qu'il faut supprimer plutôt que garder.

Le remplacement des frontières Unicode par `\b` a été passé en mutation : le
banc rougit. La garde tient.

## Le test de chaos est distinct du banc

Le banc appelle une **fonction**. Le chaos lance le **binaire** : un vrai
fichier sur le disque, un vrai processus, un vrai code de sortie. Le câblage,
le chemin, la lecture et le code de retour vivent entre les deux — un banc qui
appelle la fonction ne dit rien de l'outil qu'on lance.

Il vérifie dans les **deux sens**, et c'est la moitié qu'on oublie : un fichier
piégé doit être signalé, un fichier honnête doit être laissé tranquille. Un
garde qui signale tout passe le premier test et échoue au second.

Chaque exécution laisse une ligne datée dans `CHAOS-LOG.md`. Un garde qui ne
mord plus se voit là, pas au moment où il faudrait qu'il morde.

## Portable par construction

Ce paquet ne contient **le nom d'aucun modèle ni d'aucun fournisseur**. Il ne
fait aucune hypothèse sur qui lira le texte — il s'applique à n'importe quel
agent, chez n'importe qui.

C'est délibéré, et c'est la conséquence directe de la règle : puisqu'on ne fait
pas confiance au modèle, le garde n'a pas besoin de savoir lequel tourne.

## Licence

MIT.
