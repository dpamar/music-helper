# Plan d'implémentation : Export PNG de la partition

> For agentic workers: implement this plan task-by-task with red-green-refactor discipline. One task, one commit. Never batch.

**Date**: 2026-06-16  
**Feature**: Ajout d'un bouton d'export PNG pour sauvegarder la partition générée  
**Branch**: `feat/png-export`

## Vue d'ensemble

Cette fonctionnalité permet aux utilisateurs d'exporter leur partition rendue sous forme d'image PNG téléchargeable. L'export capture le contenu du canvas HTML5 et le convertit en fichier PNG via l'API native du navigateur.

**Approche technique** :
- Utilisation de `canvas.toDataURL('image/png')` pour obtenir les données de l'image
- Création d'un lien `<a>` avec `download` attribute pour déclencher le téléchargement
- Génération automatique du nom de fichier basé sur le titre de la partition
- Ajout d'un bouton "Exporter en PNG" dans la section de rendu

**Contraintes** :
- 100% client-side (pas de backend)
- Compatibilité avec tous les navigateurs modernes (Chrome, Firefox, Safari, Edge)
- Gestion des erreurs si aucune partition n'est générée
- Design cohérent avec l'interface existante

---

## Tâche 1 : Écrire le test pour le bouton d'export PNG dans le DOM

**Objectif** : Vérifier que le bouton d'export est présent et correctement positionné dans l'interface.

**Fichier** : Créer un nouveau fichier de test manuel (ou ajouter une vérification)

**Étapes** :
1. Ouvrir `index.html` dans un navigateur
2. Générer une partition (utiliser le bouton "Exemple")
3. Vérifier visuellement que le bouton "Exporter en PNG" apparaît sous la partition
4. Le bouton doit être désactivé si aucune partition n'est générée

**Critère de succès** : Le bouton existe dans le DOM avec l'ID `btn-export-png` et la classe CSS appropriée.

**Test manuel** :
```javascript
// Dans la console du navigateur :
const btn = document.getElementById('btn-export-png');
console.assert(btn !== null, 'Le bouton d\'export PNG doit exister');
console.assert(btn.textContent.includes('PNG'), 'Le texte du bouton doit mentionner PNG');
```

**Commit** : `test(ui): add manual verification for PNG export button`

---

## Tâche 2 : Ajouter le bouton d'export PNG dans index.html

**Objectif** : Ajouter le bouton d'export dans l'interface utilisateur.

**Fichier** : `index.html`

**Modifications** :

Dans la section `.render-section`, après le `<div id="render-output">`, ajouter :

```html
<!-- Zone de rendu -->
<section class="render-section">
    <h2>Partition générée</h2>
    <div id="render-output" class="render-output">
        <p class="placeholder">Cliquez sur "Générer la partition" pour voir le rendu graphique</p>
    </div>
    <div class="export-actions" style="margin-top: 20px; text-align: center;">
        <button id="btn-export-png" class="btn-secondary" disabled>
            💾 Exporter en PNG
        </button>
    </div>
</section>
```

**Points d'attention** :
- Le bouton est désactivé par défaut (`disabled`) car aucune partition n'est générée au chargement
- Utilise la classe `btn-secondary` existante pour la cohérence visuelle
- Icône 💾 pour indiquer la sauvegarde
- Classe `export-actions` pour permettre d'ajouter d'autres exports (PDF) plus tard

**Vérification** : Ouvrir `index.html` → le bouton apparaît grisé sous la zone de rendu.

**Commit** : `feat(ui): add PNG export button to render section`

---

## Tâche 3 : Écrire le test pour la fonction d'export PNG

**Objectif** : Définir le comportement attendu de la fonction `handleExportPNG()`.

**Fichier** : Créer un test manuel ou une vérification dans la console

**Comportement attendu** :
1. Si aucun canvas n'existe → afficher une erreur "Veuillez d'abord générer une partition"
2. Si un canvas existe → déclencher le téléchargement d'un fichier PNG
3. Le nom du fichier doit être `{titre-partition}.png` (avec espaces remplacés par des tirets)
4. Si aucun titre → utiliser `partition.png` par défaut

**Test manuel** :
```javascript
// Dans la console, après avoir généré une partition :
const canvas = document.getElementById('score-canvas');
console.assert(canvas !== null, 'Le canvas doit exister après génération');

// Simuler l'export
const dataURL = canvas.toDataURL('image/png');
console.assert(dataURL.startsWith('data:image/png'), 'Le dataURL doit être un PNG valide');
```

**Critère de succès** : La fonction peut extraire les données du canvas et générer un lien de téléchargement.

**Commit** : `test(export): add manual verification for PNG export functionality`

---

## Tâche 4 : Implémenter la fonction handleExportPNG() dans app.js

**Objectif** : Créer la logique d'export PNG.

**Fichier** : `app.js`

**Code à ajouter** (après la fonction `handleClear()`) :

```javascript
/**
 * Gère le clic sur "Exporter en PNG"
 * Convertit le canvas en image PNG et déclenche le téléchargement
 */
function handleExportPNG() {
    const canvas = document.getElementById('score-canvas');
    const errorDiv = document.getElementById('error-message');

    // Vérifie qu'un canvas existe (partition générée)
    if (!canvas) {
        errorDiv.textContent = '❌ Veuillez d\'abord générer une partition';
        errorDiv.style.display = 'block';
        errorDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        return;
    }

    try {
        // Cache les erreurs précédentes
        errorDiv.style.display = 'none';

        // Convertit le canvas en data URL (format PNG)
        const dataURL = canvas.toDataURL('image/png');

        // Récupère le titre de la partition pour le nom du fichier
        const scoreTitle = document.querySelector('.score-title');
        let filename = 'partition.png';
        
        if (scoreTitle && scoreTitle.textContent.trim()) {
            // Nettoie le titre : supprime les caractères spéciaux, remplace espaces par tirets
            const cleanTitle = scoreTitle.textContent.trim()
                .toLowerCase()
                .normalize('NFD').replace(/[̀-ͯ]/g, '') // Supprime accents
                .replace(/[^a-z0-9\s-]/g, '') // Garde lettres, chiffres, espaces, tirets
                .replace(/\s+/g, '-') // Remplace espaces par tirets
                .replace(/-+/g, '-'); // Supprime tirets multiples
            
            filename = `${cleanTitle}.png`;
        }

        // Crée un lien de téléchargement temporaire
        const link = document.createElement('a');
        link.download = filename;
        link.href = dataURL;

        // Déclenche le téléchargement
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        console.log('✅ Partition exportée:', filename);

    } catch (error) {
        console.error('❌ Erreur lors de l\'export:', error.message);
        errorDiv.textContent = '❌ Erreur lors de l\'export: ' + error.message;
        errorDiv.style.display = 'block';
        errorDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}
```

**Points d'attention** :
- Normalisation du titre pour le nom de fichier (suppression des accents, caractères spéciaux)
- Gestion d'erreur complète avec `try/catch`
- Nettoyage du lien temporaire après le téléchargement
- Utilise les éléments DOM existants (`error-message`)

**Vérification** : Ouvrir la console → aucun appel à la fonction ne doit échouer.

**Commit** : `feat(export): implement PNG export functionality in app.js`

---

## Tâche 5 : Connecter le bouton d'export aux événements

**Objectif** : Attacher l'événement click au bouton d'export et gérer son état (activé/désactivé).

**Fichier** : `app.js`

**Modifications** :

1. Dans la fonction `init()`, récupérer le bouton et attacher l'événement :

```javascript
function init() {
    // Crée les instances
    parser = new Parser();
    renderer = new Renderer();

    // Récupère les éléments DOM
    const btnRender = document.getElementById('btn-render');
    const btnExample = document.getElementById('btn-example');
    const btnClear = document.getElementById('btn-clear');
    const btnExportPNG = document.getElementById('btn-export-png');
    const textarea = document.getElementById('partition-input');
    const errorDiv = document.getElementById('error-message');

    // Attache les événements
    btnRender.addEventListener('click', handleRender);
    btnExample.addEventListener('click', handleExample);
    btnClear.addEventListener('click', handleClear);
    btnExportPNG.addEventListener('click', handleExportPNG);

    // Permet de générer avec Ctrl+Enter dans le textarea
    textarea.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            handleRender();
        }
    });

    console.log('✅ Application initialisée');
}
```

2. Créer une fonction helper pour activer/désactiver le bouton :

```javascript
/**
 * Active ou désactive le bouton d'export PNG
 * @param {boolean} enabled - true pour activer, false pour désactiver
 */
function setExportButtonState(enabled) {
    const btnExportPNG = document.getElementById('btn-export-png');
    if (btnExportPNG) {
        btnExportPNG.disabled = !enabled;
    }
}
```

3. Appeler `setExportButtonState(true)` dans `handleRender()` après un rendu réussi :

```javascript
function handleRender() {
    const textarea = document.getElementById('partition-input');
    const errorDiv = document.getElementById('error-message');
    const outputDiv = document.getElementById('render-output');

    // Cache les erreurs précédentes
    errorDiv.style.display = 'none';

    try {
        // Parse le texte saisi
        const text = textarea.value.trim();

        if (!text) {
            throw new Error('Veuillez saisir une partition');
        }

        const scoreData = parser.parse(text);
        console.log('✅ Partition parsée:', scoreData);

        // Rend la partition
        renderer.render(scoreData, outputDiv);
        console.log('✅ Partition rendue');

        // Active le bouton d'export
        setExportButtonState(true);

    } catch (error) {
        // Affiche l'erreur
        console.error('❌ Erreur:', error.message);
        errorDiv.textContent = '❌ ' + error.message;
        errorDiv.style.display = 'block';

        // Désactive le bouton d'export en cas d'erreur
        setExportButtonState(false);

        // Scroll vers l'erreur
        errorDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}
```

4. Appeler `setExportButtonState(false)` dans `handleClear()` :

```javascript
function handleClear() {
    const textarea = document.getElementById('partition-input');
    const outputDiv = document.getElementById('render-output');
    const errorDiv = document.getElementById('error-message');

    // Demande confirmation
    if (textarea.value.trim() && !confirm('Voulez-vous vraiment effacer la partition ?')) {
        return;
    }

    // Efface tout
    textarea.value = '';
    errorDiv.style.display = 'none';
    outputDiv.innerHTML = '<p class="placeholder">Cliquez sur "Générer la partition" pour voir le rendu graphique</p>';

    // Désactive le bouton d'export
    setExportButtonState(false);

    // Focus sur le textarea
    textarea.focus();
}
```

**Vérification** :
- Bouton désactivé au chargement ✓
- Bouton activé après génération réussie ✓
- Bouton désactivé après "Effacer" ✓
- Bouton désactivé si erreur de parsing ✓

**Commit** : `feat(export): wire PNG export button to events and state management`

---

## Tâche 6 : Tester l'export PNG manuellement

**Objectif** : Vérifier que l'export fonctionne correctement dans différents scénarios.

**Tests manuels** :

1. **Scénario nominal** :
   - Charger un exemple
   - Générer la partition
   - Cliquer sur "Exporter en PNG"
   - Vérifier que le fichier `au-clair-de-la-lune.png` est téléchargé
   - Ouvrir le fichier → l'image doit afficher la partition complète

2. **Scénario avec titre contenant accents et caractères spéciaux** :
   - Saisir : `Là-haut sur la montagne ! ♫`
   - Générer et exporter
   - Vérifier que le nom est nettoyé : `la-haut-sur-la-montagne.png`

3. **Scénario sans partition** :
   - Effacer tout
   - Cliquer sur "Exporter en PNG" (désactivé → pas de réaction)

4. **Scénario avec partition multi-lignes** :
   - Saisir une longue partition qui génère plusieurs portées
   - Exporter
   - Vérifier que toutes les portées sont capturées dans l'image

**Critères de succès** :
- Tous les scénarios fonctionnent comme attendu
- Aucune erreur dans la console
- L'image PNG est bien formée et complète
- Le nom de fichier est propre et lisible

**Commit** : `test(export): verify PNG export in multiple scenarios`

---

## Tâche 7 : Ajouter des styles CSS pour le bouton d'export

**Objectif** : S'assurer que le bouton d'export est visuellement cohérent et réactif.

**Fichier** : `styles.css`

**Code à ajouter** (à la fin du fichier) :

```css
/* Export actions */
.export-actions {
    margin-top: 20px;
    text-align: center;
}

.export-actions button {
    min-width: 180px;
}

.export-actions button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.export-actions button:disabled:hover {
    transform: none;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}
```

**Explications** :
- `.export-actions` : conteneur centré pour les boutons d'export
- `min-width` : assure une largeur minimale pour le bouton
- `:disabled` : réduit l'opacité et change le curseur quand désactivé
- `:disabled:hover` : annule l'effet hover quand désactivé (pas de transformation)

**Vérification** :
- Le bouton désactivé apparaît grisé et le curseur change en "not-allowed"
- Le bouton activé a l'effet hover normal (transformation subtile)

**Commit** : `style(export): add CSS styles for PNG export button states`

---

## Tâche 8 : Mettre à jour CLAUDE.md avec la documentation de l'export PNG

**Objectif** : Documenter la nouvelle fonctionnalité pour les futurs développeurs.

**Fichier** : `CLAUDE.md`

**Modifications** :

1. Dans la section **"## 🎯 Vue d'ensemble"**, ajouter :

```markdown
- Exporter (PNG disponible, PDF en développement)
```

2. Dans la section **"## 🏗️ Modules principaux"**, sous **"### `app.js` - Orchestration"**, ajouter :

```markdown
**Fonctions principales :**
- `init()` → Initialisation au chargement de la page
- `handleRender()` → Génère la partition (parse + render)
- `handleExample()` → Charge un exemple prédéfini
- `handleClear()` → Efface tout
- `handleExportPNG()` → Exporte la partition en PNG
- `setExportButtonState(enabled)` → Active/désactive le bouton d'export
```

3. Ajouter une nouvelle section **"### Export PNG"** après la section **"## 🎨 Design (styles.css)"** :

```markdown
## 📥 Export PNG

L'application permet d'exporter la partition générée sous forme d'image PNG.

### Fonctionnement

1. **Génération de l'image** : 
   - Utilise `canvas.toDataURL('image/png')` pour convertir le canvas en data URL
   - Format PNG pour garantir la qualité et la transparence

2. **Nom du fichier** :
   - Basé sur le titre de la partition (extrait de `.score-title`)
   - Nettoyage automatique : accents supprimés, espaces → tirets, caractères spéciaux filtrés
   - Exemple : `"Au clair de la lune"` → `au-clair-de-la-lune.png`
   - Par défaut : `partition.png` si pas de titre

3. **Téléchargement** :
   - Création d'un lien `<a>` temporaire avec attribut `download`
   - Click programmatique pour déclencher le téléchargement
   - Nettoyage du lien après téléchargement

### État du bouton

- **Désactivé** (`disabled`) :
  - Au chargement de la page
  - Après "Effacer"
  - En cas d'erreur de génération
- **Activé** :
  - Après une génération réussie de la partition

### Gestion des erreurs

Si l'utilisateur tente d'exporter sans partition générée (ne devrait pas arriver car le bouton est désactivé) :
```javascript
errorDiv.textContent = '❌ Veuillez d\'abord générer une partition';
```

### Comment ajouter un format d'export supplémentaire

Pour ajouter l'export PDF :

1. **Backend requis** : PDF nécessite une bibliothèque comme [jsPDF](https://github.com/parallax/jsPDF)
2. **Inclure la lib** : Ajouter `<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>` dans `index.html`
3. **Créer `handleExportPDF()`** dans `app.js` :
   ```javascript
   function handleExportPDF() {
       const canvas = document.getElementById('score-canvas');
       const imgData = canvas.toDataURL('image/png');
       
       const { jsPDF } = window.jspdf;
       const pdf = new jsPDF('landscape');
       pdf.addImage(imgData, 'PNG', 10, 10, 277, 190);
       pdf.save('partition.pdf');
   }
   ```
4. **Ajouter le bouton** dans `index.html` (à côté du bouton PNG)
5. **Attacher l'événement** dans `init()`

```

4. Dans la section **"## 🐛 Bugs connus / Limitations"**, mettre à jour :

```markdown
- ✅ ~~Pas d'export PNG~~ → Implémenté
- ⚠️ Pas d'export PDF pour l'instant (nécessite une bibliothèque externe)
```

**Vérification** : La documentation est claire, complète et inclut des exemples.

**Commit** : `docs(export): document PNG export feature in CLAUDE.md`

---

## Tâche 9 : Tester l'export sur différents navigateurs

**Objectif** : Vérifier la compatibilité cross-browser.

**Navigateurs à tester** :
- Chrome/Chromium (dernière version)
- Firefox (dernière version)
- Safari (macOS/iOS)
- Edge (dernière version)

**Points de vérification** :
1. Le bouton apparaît correctement
2. L'export déclenche le téléchargement
3. Le fichier PNG est bien formé (pas corrompu)
4. Le nom de fichier est propre (pas de caractères bizarres)
5. Aucune erreur dans la console

**Problèmes potentiels et solutions** :

- **Safari** : Peut bloquer les téléchargements automatiques
  - Solution : L'utilisateur doit autoriser le téléchargement dans les paramètres
  
- **Fichiers volumineux** : Pour des partitions très longues, le PNG peut être lourd
  - Solution : Acceptée (limitation de l'approche client-side)

**Critères de succès** : L'export fonctionne sur les 4 navigateurs principaux sans erreur.

**Commit** : `test(export): verify cross-browser compatibility for PNG export`

---

## Tâche 10 : Commit final et mise à jour du README

**Objectif** : Finaliser la fonctionnalité et documenter pour les utilisateurs.

**Fichier** : `README.md`

**Modifications** :

Si le README existe, ajouter une section **"Fonctionnalités"** :

```markdown
## Fonctionnalités

- ✏️ Saisie intuitive en notation française (Do, Ré, Mi...)
- 🎼 Rendu graphique automatique sur portée musicale
- 📊 Support des altérations (dièse, bémol, bécarre)
- 🎵 Gestion des durées (ronde, blanche, noire, croche, double-croche, notes pointées)
- 🎹 Accords (plusieurs notes simultanées)
- 🔄 Clef de sol et clef de fa
- 💾 **Export PNG** : Téléchargez votre partition en image haute qualité
- 📱 Interface responsive (desktop, tablet, mobile)
```

Et dans la section **"Utilisation"** :

```markdown
## Utilisation

1. Ouvrez `index.html` dans votre navigateur
2. Saisissez votre partition dans le champ de texte (ou cliquez sur "Charger un exemple")
3. Cliquez sur "Générer la partition"
4. **Nouveau** : Cliquez sur "💾 Exporter en PNG" pour télécharger votre partition
```

**Vérification** : Le README est à jour et reflète les nouvelles capacités.

**Commit** : `docs(readme): add PNG export feature to documentation`

---

## Résumé de la branche

**Branche** : `feat/png-export`  
**Fichiers modifiés** :
- `index.html` : Ajout du bouton d'export
- `app.js` : Implémentation de `handleExportPNG()` et `setExportButtonState()`
- `styles.css` : Styles pour le bouton d'export
- `CLAUDE.md` : Documentation technique
- `README.md` : Documentation utilisateur

**Commits** : 10 commits (un par tâche)

**Tests** :
- Tests manuels dans la console du navigateur
- Vérification multi-scénarios (avec/sans partition, titres spéciaux)
- Tests cross-browser (Chrome, Firefox, Safari, Edge)

**Prêt à merger** : Oui, après revue de code.

---

## Prochaines étapes (hors scope)

- Export PDF (nécessite bibliothèque externe jsPDF)
- Export MIDI (nécessite parsing musical avancé)
- Partage direct sur réseaux sociaux
- Réglage de la qualité d'export (résolution)
- Recadrage automatique du canvas avant export (pour éviter l'espace vide)
