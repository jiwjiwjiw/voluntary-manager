# voluntary-manager

Script Google Apps Script, lié à un classeur Google Sheets, qui automatise la
gestion des bénévoles et artistes d'un spectacle : composition des libellés,
planning des plages, listes déroulantes et envoi des courriels de confirmation.

## Fonctionnement

Le script est écrit en TypeScript, empaqueté par webpack en un seul fichier
`dist/bundle.js`, puis poussé dans le projet Apps Script avec
[clasp](https://github.com/google/clasp).

Dans le classeur, un menu **Actions** propose :

- **Autoriser le script** : installe les déclencheurs (ouverture, édition,
  changement) qui recalculent les colonnes dérivées, le planning et les listes
  déroulantes, puis fait un premier calcul complet.
- **Recalculer** : refait le calcul complet à la main.
- **Vérifier le classeur** : liste, feuille et ligne à l'appui, ce qui
  fausserait l'envoi ou le planning : feuilles manquantes, noms incomplets,
  homonymes, adresses manquantes ou invalides, fonctions inconnues, plages en
  double ou sans nombre de places, dates absentes de `dates`, heures
  incohérentes, plages sur-remplies, engagements ou contreparties vers une
  personne ou une plage inexistante, engagements en double, personnes sans
  engagement.
- **Envoyer les emails** : ouvre un dialogue qui annonce le nombre de
  courriels à envoyer (statuts `à envoyer` et `à renvoyer`), les personnes qui ne recevront
  rien et le quota journalier restant, puis demande le modèle à utiliser.
  Après confirmation, chaque courriel envoyé passe le statut à `envoyé`. Si le
  quota est inférieur au nombre de courriels, les premiers (ordre de la
  feuille) partent et les autres gardent leur statut pour le lendemain.
  Un seul envoi à la fois ; une adresse refusée n'interrompt pas les autres.
  Le rapport d'envoi liste les échecs, les personnes sans adresse, les
  homonymes (même prénom et nom, impossibles à distinguer), les noms
  incomplets et les personnes sans engagement ; tous gardent leur statut.
  Le sujet accepte `%PRENOM%`, `%NOM%` et `%EMAIL%`.
- **Aperçu d'un courriel** : affiche, sans rien envoyer, le courriel qu'une
  personne du classeur recevrait, ou l'un des six cas de test couvrant toutes
  les combinaisons de conditions du modèle.
- **Tester les emails** : envoie réellement à l'utilisateur courant le cas de
  test le plus complet (artiste et bénévole avec contreparties et texte perso), pour vérifier
  l'envoi et le rendu dans un vrai client de messagerie.

## Feuilles attendues dans le classeur

Les noms de feuilles et l'ordre des colonnes sont fixés par le code.
La première ligne de chaque feuille est une ligne d'en-tête.

| Feuille | Colonnes | Remarques |
|---|---|---|
| `personnes` | A nom, B prénom, **C « prénom nom »**, D email, E statut d'envoi, F texte perso mail | C est calculée. E vaut `à envoyer`, `envoyé`, `réception confirmée` ou `à renvoyer`. F, facultatif, est un texte propre à la personne, inséré par `%PERSO%` dans son prochain courriel puis effacé ; le script crée la colonne si son en-tête est vide. |
| `plages` | A date, B fonction, C début, D fin, E nombre de personnes, **F libellé** | F est calculée : `date \| fonction \| début-fin`. |
| `engagements` | A personne, B plage | A référence `personnes!C`, B référence `plages!F`. |
| `contreparties` | A personne, B contrepartie, C remarque | A référence `personnes!C`. |
| `fonctions` | A nom, B type | B vaut `artiste` ou `bénévole`. |
| `dates` | A date | Liste des dates autorisées pour `plages!A`. |
| `planning` | **A plage, B personnes** | Feuille entièrement calculée, triée par date (chronologiquement, que la date soit une vraie date ou un texte `jj.mm.aaaa`) puis heure de début. `?` marque une place vacante. |
| `planning personnes` | **A personne, B nombre de plages, C plages** | Feuille entièrement calculée, créée au besoin : les plages de chaque personne dans l'ordre chronologique. |
| `synthèse` | **A date ou fonction, B places, C pourvues, D vacantes, E taux** | Feuille entièrement calculée, créée au besoin : remplissage par date (ordre chronologique) puis par fonction (ordre alphabétique), avec un total par tableau. |
| `modèle courriel` | A type, B condition, C texte | Modèle du courriel, une ligne par bloc. |
| `config` (facultative) | A clé, B valeur | Réglages de l'expéditeur, voir ci-dessous. |

Une personne est « artiste » (resp. « bénévole ») dès qu'une de ses plages a
une fonction de ce type dans `fonctions`.

La feuille `config`, si elle existe, accepte trois clés (casse indifférente) :
`nom de l'expéditeur` (nom affiché, l'adresse reste celle de l'utilisateur qui
envoie), `adresse de réponse` (où arrivent les réponses) et `copie cachée`
(une adresse mise en copie cachée de chaque courriel, par exemple pour garder
une trace, car les courriels envoyés par le script n'apparaissent pas dans le
dossier « Envoyés » de Gmail).

À chaque envoi, le script mémorise (dans les propriétés du document, hors des
feuilles) ce que chaque personne a reçu : ses engagements et contreparties.
Si l'un d'eux change ensuite, y compris par un changement
d'horaire de plage, ou si un texte perso est écrit pour elle, le statut de la
personne passe de `envoyé` ou `réception confirmée` à `à renvoyer`, et
**Envoyer les emails** l'inclut dans le prochain envoi. Le texte perso ne
sert qu'une fois : il est effacé de la feuille dès que le courriel qui le
contient est parti (il reste en cas d'échec ou de report pour quota). Le
réécrire, même à l'identique, demande donc un nouvel envoi ; l'effacer ne
change pas le statut.

Les libellés calculés (`personnes!C`, `plages!F`) servent de clés dans
`engagements` et `contreparties`. Quand un nom ou une plage est modifié, le
script reporte le nouveau libellé dans ces références. Il s'abstient quand
c'est ambigu (deux lignes portaient le même ancien libellé, ou le nouveau
libellé existait déjà sur une autre ligne) ; **Vérifier le classeur** signale
alors les références orphelines.

Dans `modèle courriel`, la colonne A vaut `sujet`, `titre`, `sous-titre`,
`paragraphe`, `élément de liste` ou `aucun`. La colonne B contient une
condition d'inclusion (vide = toujours inclus) parmi : `a au moins un code`,
`est artiste`, `est bénévole`, `est artiste et a au moins un code`,
`est bénévole et a au moins un code`, `a un texte perso`. La colonne C
accepte du texte enrichi (gras, italique, liens…) et les marqueurs `%PRENOM%`,
`%NOM%`, `%EMAIL%`, `%LISTE_ENGAGEMENTS%`, `%LISTE_CONTREPARTIES%` et
`%PERSO%` (le texte perso, vide s'il n'y en a pas : la condition
`a un texte perso` évite alors un paragraphe vide).

## Structure du dépôt

```
src/
  index.ts                           point d'entrée : menu, déclencheurs
  updateModels.ts                    recalcul des données dérivées et validations
  updateStatuts.ts                   passe « à renvoyer » les confirmations obsolètes
  empreintes.ts                      mémoire de ce que chaque personne a reçu
  statuts.ts                         valeurs du statut d'envoi
  config.ts                          lecture de la feuille config
  updatePersonnes.ts                 calcule personnes!C
  updatePlages.ts                    calcule plages!F
  propagateRename.ts                 reporte un libellé modifié dans les références
  updatePlanning.ts                  calcule la feuille planning
  planningPersonnes.ts               calcule la feuille planning personnes
  synthese.ts                        calcule la feuille synthèse (remplissage)
  computedSheet.ts                   écriture d'une feuille entièrement calculée
  sendEmails.ts                      collecte des destinataires et envoi
  checkWorkbook.ts                   vérification de cohérence du classeur
  checkReportTemplate.html           rapport de vérification
  ConfirmationEmailTemplateParams.ts marqueurs et conditions du modèle
  EmailTemplateList.ts               détection des feuilles « modèle »
  SelectEmailTemplate.html           dialogue de confirmation d'envoi
  PreviewEmail.html                  aperçu d'un courriel
  emailReportTemplate.html           rapport d'envoi
  sheets-tools/                      sous-module git (outils réutilisables)
test/
  fakeSpreadsheet.ts                 faux classeur en mémoire pour les tests
  *.test.ts                          tests unitaires (vitest)
.github/workflows/ci.yml             typecheck + tests + build sur GitHub Actions
appsscript.json                      manifeste Apps Script (scopes, fuseau)
scripts/init-workspace.js            crée le fichier workspace VS Code au `yarn install`
voluntary-manager.code-workspace.example  modèle du fichier workspace VS Code
webpack.config.js                    bundle + copie des HTML vers dist/
tsconfig.json                        compilation du bundle (src/ seulement)
tsconfig.test.json                   vérification des types de src/ et test/
.clasp.json                          identifiant du projet Apps Script
.claspignore                         seuls dist/ et appsscript.json sont poussés
```

`src/sheets-tools` est un **sous-module git** pointant sur
[jiwjiwjiw/sheets-tools](https://github.com/jiwjiwjiw/sheets-tools). Il
fournit `EmailTemplate` (texte enrichi → HTML), `Validation` et
`ValidationHandler` (listes déroulantes) et quelques helpers.

## Mise en route

Prérequis : Node ≥ 20.9 (voir `.nvmrc`), Yarn classic via corepack.

```sh
git clone --recurse-submodules https://github.com/jiwjiwjiw/voluntary-manager.git
cd voluntary-manager
corepack enable
yarn install
yarn build          # produit dist/
npx clasp login     # une seule fois
yarn push           # pousse dist/ et appsscript.json dans le projet Apps Script
```

`yarn install` crée aussi `voluntary-manager.code-workspace` à partir de
`voluntary-manager.code-workspace.example` s'il n'existe pas encore. Le
fichier créé est ignoré par git : chacun peut le personnaliser sans rien
commiter. Les changements destinés à tous se font dans le `.example`.

Si le dépôt a été cloné sans `--recurse-submodules`, exécuter
`git submodule update --init` avant `yarn build`, sinon la compilation échoue
sur les imports de `./sheets-tools/...`.

Scripts disponibles :

| Script | Rôle |
|---|---|
| `yarn build` / `yarn build:watch` | compile avec webpack |
| `yarn push` / `yarn push:watch` | pousse avec clasp |
| `yarn test` / `yarn test:watch` | lance les tests unitaires avec vitest |
| `yarn typecheck` | vérifie les types de `src/` et `test/` sans rien émettre |
| `yarn b`, `bw`, `p`, `pw` | alias historiques des scripts build et push |

## Tests

Les calculs (libellés, planning, données de courriel, conditions du modèle)
sont des fonctions pures, testées directement. Le code qui lit et écrit les
feuilles est testé contre `test/fakeSpreadsheet.ts`, un faux classeur en
mémoire qui reproduit les comportements de l'API Sheets dont dépend le code :
plages ouvertes (`A2:F`) incluant les lignes vides, `getLastRow()` égal à la
dernière ligne remplie, `setValues()` refusant un tableau de mauvaise taille.

L'envoi effectif (`MailApp`, boîtes de dialogue) n'est pas couvert ; il se
vérifie dans le classeur avec **Tester les emails**. GitHub Actions exécute
`yarn typecheck`, `yarn test` et `yarn build` à chaque push.

## Déploiement et triggers

Les fichiers HTML de `src/` sont poussés sous `dist/<nom>` ; le code les
charge avec ces noms exacts via `HtmlService.createTemplateFromFile`.

Les déclencheurs installables appartiennent à l'utilisateur qui clique sur
**Autoriser le script**. Le script ne voit que ses propres déclencheurs :
une seule personne doit autoriser le script, sinon chaque édition déclenche
autant de recalculs que de personnes l'ayant fait.

Les déclencheurs appellent `updateModels`. À l'ouverture et sur **Recalculer**,
tout est recalculé. À chaque édition, seul ce qui dépend de la feuille modifiée
l'est : `personnes` → colonne C et statuts, `plages` → colonne F, planning (avec
`planning personnes` et `synthèse`) et statuts, `engagements` → planning et
statuts, `contreparties` → statuts, `dates` → liste déroulante de `plages!A` ;
les autres feuilles ne déclenchent rien. Les listes déroulantes de textes
référencent directement leurs plages et se mettent à jour seules ; celle des
dates est une liste de valeurs affichées, car Sheets refuse la date choisie
dans un menu qui référence des cellules de type date.
Un seul recalcul tourne à la fois (verrou sur le document).

## Licence

MIT, voir `LICENSE`.
