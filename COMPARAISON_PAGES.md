# Comparaison : `app/page.js` vs `app/cr_version_1/page.js`

## 1. Affichage

| Fonctionnalité | `app/page.js` (Original) | `app/cr_version_1/page.js` (V1 TipTap) |
|---|---|---|
| **Formulaire** | `<Formulaire>` (textarea simple pour "Divers") | `<FormulaireV1>` (éditeur TipTap riche pour "Divers") |
| **Persistance** | Aucune (état perdu au rechargement) | `useCrFormStorage` — persistance localStorage (Offline-First) |
| **Sous-titre header** | "Compte-Rendu de Réunion Statutaire" | "Compte-Rendu de Réunion Statutaire — V1 TipTap" |
| **Bouton retour** | Commenté ( Link href="/parametre") | Actif ( Link href="/" — flèche retour) |
| **Navigation** | Aucune | Lien retour vers `/` en haut à gauche |
| **Chargement initial** | Pas d'état de chargement | Affiche `<ProcessingLoader>` tant que localStorage n'est pas prêt |

### Détails du formulaire

| Champ | `page.js` | `cr_version_1/page.js` |
|---|---|---|
| Tous les champs texte | `<TextareaField>` (textarea HTML) | `<TextareaField>` (textarea HTML) |
| Champ "Divers" | `<TextareaField>` (textarea brut) | `<DiversEditor>` (TipTap riche : gras, italique, listes, tableaux, couleurs, import DOCX/PDF/TXT, drag & drop) |

---

## 2. Aperçu JPG

| Fonctionnalité | `app/page.js` (Original) | `app/cr_version_1/page.js` (V1 TipTap) |
|---|---|---|
| **Fonction d'aperçu** | `apercuJpg()` — inline dans la page | `apercuJpg()` — delegue à `generatePreviewImagesFromFormData()` (exportUtils.js) |
| **Génération des pages** | `buildDynamicPreviewPages()` — inline | Délégué à `exportUtils.js` → `buildDynamicPreviewPages()` |
| **Rendu HTML** | `renderToStaticMarkup()` — inline | `renderToStaticMarkup()` — dans `exportUtils.js` |
| **Conversion JPG** | `renderHtmlToJpg()` — inline avec `html2canvas` | `renderHtmlToJpg()` — dans `exportUtils.js` avec `html2canvas` |
| **Détection overflow** | `isPreviewPageOverflowing()` — inline | `isPreviewPageOverflowing()` — dans `exportUtils.js` |
| **Zone de capture** | Aucune (génération hors-DOM via `createPreviewContainer`) | `<div id="rapport-capture">` caché + `createPreviewContainer` pour l'aperçu |
| **Anti-coupure** | Non implémenté | Implémenté dans `exportUtils.js` (`applyAntiCutStyles`, `applyAntiCutStylesOnClone`) |

---

## 3. Export JPG

| Fonctionnalité | `app/page.js` (Original) | `app/cr_version_1/page.js` (V1 TipTap) |
|---|---|---|
| **Nom du fichier** | `{date}_{clubName}_{clubType}_{HH-MM-SS}` (timestamp) | `Rapport_Lions_{clubName}_{clubType}` (sans timestamp) |
| **Fonction d'export** | `exportJpg()` — inline | `exportJpg()` — delegue à `exportMultiPageJpg()` (exportUtils.js) |
| **Génération images** | `generatePreviewImages()` — même fonction que l'aperçu | `exportMultiPageJpg()` — fonction dédiée avec anti-coupure |
| **Anti-coupure** | Non | Oui — pousse les éléments qui traversent la frontière de page (`break-before: page`) |
| **Multi-pages** | Oui (découpe par `PAGE_HEIGHT`) | Oui (découpe par `PAGE_HEIGHT` + logique anti-coupure) |
| **Zone de capture** | Aucune (génération hors-DOM) | Utilise `<div id="rapport-capture">` (élément DOM réel) |
| **Sauvegarde zoom** | Non | Oui (`captureZone.style.zoom = '1'` avant capture, restauration après) |
| **Fonts prêtes** | `await document.fonts.ready` | `await document.fonts.ready` |

---

## 4. Téléchargement

| Fonctionnalité | `app/page.js` (Original) | `app/cr_version_1/page.js` (V1 TipTap) |
|---|---|---|
| **Fonction download** | `downloadSingleJpg()` — inline | `downloadSingleJpg()` — importée depuis `exportUtils.js` |
| **Conversion blob** | `base64ToBlob()` — importée | `base64ToBlob()` — importée (même helper) |
| **Modal** | `<JpgDownloadModal>` — même composant | `<JpgDownloadModal>` — même composant |

---

## 5. Architecture du code

| Aspect | `app/page.js` (Original) | `app/cr_version_1/page.js` (V1 TipTap) |
|---|---|---|
| **Taille du fichier** | ~369 lignes | ~308 lignes |
| **Logique export** | Tout inline dans la page | Extraite dans `exportUtils.js` (~325 lignes) |
| **Préview rendering** | Inline (`components/preview.js`) | Externe (`PreviewV1.js`) |
| **Persistance** | Non | `useCrFormStorage.js` (localStorage) |
| **Composants réutilisables** | `Formulaire`, `ProcessingLoader`, `JpgDownloadModal` | `FormulaireV1`, `DiversEditor`, `ProcessingLoader`, `JpgDownloadModal` |

### Fichiers associés — V1 TipTap

```
app/cr_version_1/
├── page.js              # Page principale
├── FormulaireV1.js      # Formulaire avec TipTap
├── DiversEditor.js      # Éditeur riche TipTap
├── PreviewV1.js         # Rendu des blocs du rapport
├── exportUtils.js       # Export JPG multi-pages
├── useCrFormStorage.js  # Persistance localStorage
└── components/
    ├── editor/
    │   └── EditorToolbar.js  # Barre d'outils TipTap
    └── ...
```

---

## 6. Résumé des avantages de chaque version

### `app/page.js` (Original)
- Code monolithique, tout dans un seul fichier
- Plus simple à comprendre d'un coup
- Pas de dépendance TipTap
- Léger (pas de bibliothèque d'édition riche)

### `app/cr_version_1/page.js` (V1 TipTap)
- **Éditeur riche** pour le champ "Divers" (formatage, tableaux, images, import de fichiers)
- **Persistance localStorage** (le formulaire survive aux rechargements)
- **Export structuré** dans un fichier dédié (`exportUtils.js`)
- **Anti-coupure** intelligent (ne coupe pas les tableaux/paragraphes en plein milieu)
- **Zone de capture** DOM (`#rapport-capture`) pour un export plus fiable
- **Sauvegarde du zoom** pour des captures à la bonne échelle
- Code mieux organisé et modulaire
