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
  déroulantes.
- **Envoyer les emails** : envoie le courriel de confirmation à chaque personne
  dont le statut est `à envoyer`, puis passe le statut à `envoyé`.
- **Tester les emails** : envoie à l'utilisateur courant un jeu de courriels
  couvrant toutes les combinaisons de conditions du modèle.

## Feuilles attendues dans le classeur

Les noms de feuilles et l'ordre des colonnes sont fixés par le code.
La première ligne de chaque feuille est une ligne d'en-tête.

| Feuille | Colonnes | Remarques |
|---|---|---|
| `personnes` | A nom, B prénom, **C « prénom nom »**, D email, E statut d'envoi | C est calculée. E vaut `à envoyer`, `envoyé` ou `réception confirmée`. |
| `plages` | A date, B fonction, C début, D fin, E nombre de personnes, **F libellé** | F est calculée : `date \| fonction \| début-fin`. |
| `engagements` | A personne, B plage | A référence `personnes!C`, B référence `plages!F`. |
| `contreparties` | A personne, B contrepartie, C remarque | A référence `personnes!C`. |
| `fonctions` | A nom, B type | B vaut `artiste` ou `bénévole`. |
| `dates` | A date | Liste des dates autorisées pour `plages!A`. |
| `planning` | **A plage, B personnes** | Feuille entièrement calculée. `?` marque une place vacante. |
| `modèle courriel` | A type, B condition, C texte | Modèle du courriel, une ligne par bloc. |

Dans `modèle courriel`, la colonne A vaut `sujet`, `titre`, `sous-titre`,
`paragraphe`, `élément de liste` ou `aucun`. La colonne B contient une
condition d'inclusion (vide = toujours inclus) parmi : `a au moins un code`,
`est artiste`, `est bénévole`, `est artiste et a au moins un code`,
`est bénévole et a au moins un code`. La colonne C accepte du texte enrichi
(gras, italique, liens…) et les marqueurs `%PRENOM%`, `%NOM%`, `%EMAIL%`,
`%LISTE_ENGAGEMENTS%`, `%LISTE_CONTREPARTIES%`.

## Structure du dépôt

```
src/
  index.ts                           point d'entrée : menu, déclencheurs, validations
  updatePersonnes.ts                 calcule personnes!C
  updatePlages.ts                    calcule plages!F
  updatePlanning.ts                  calcule la feuille planning
  sendEmails.ts                      collecte des destinataires et envoi
  ConfirmationEmailTemplateParams.ts marqueurs et conditions du modèle
  EmailTemplateList.ts               détection des feuilles « modèle »
  SelectEmailTemplate.html           boîte de choix du modèle
  emailReportTemplate.html           rapport d'envoi
  sheets-tools/                      sous-module git (outils réutilisables)
test/
  fakeSpreadsheet.ts                 faux classeur en mémoire pour les tests
  *.test.ts                          tests unitaires (vitest)
.github/workflows/ci.yml             typecheck + tests + build sur GitHub Actions
appsscript.json                      manifeste Apps Script (scopes, fuseau)
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

Les fichiers HTML sont poussés sous le nom `dist/SelectEmailTemplate` et
`dist/emailReportTemplate` ; le code les charge avec ces noms exacts via
`HtmlService.createTemplateFromFile`.

Les déclencheurs installables appartiennent à l'utilisateur qui clique sur
**Autoriser le script**. Ils appellent `updateModels`, qui est aussi
exécutable à la main depuis l'éditeur Apps Script.

## Licence

MIT, voir `LICENSE`.
