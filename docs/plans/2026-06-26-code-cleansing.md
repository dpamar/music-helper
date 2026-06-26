# Plan de nettoyage complet du code

> Pour les agents exécuteurs : implémenter ce plan tâche par tâche avec
> la discipline red-green-refactor. Une tâche, un commit. Ne jamais grouper.

**Date** : 2026-06-26  
**Objectif** : Nettoyer le code existant, supprimer les fichiers obsolètes, consolider les tests, et améliorer la maintenabilité.

## Phase 1 : Analyse et inventaire

### Tâche 1.1 : Identifier les fichiers de test obsolètes ou redondants

**Contexte** : Le projet contient deux répertoires de tests (`test/` et `tests/`) ainsi que des fichiers de test à la racine (`test-gm-names.js`, `test-midi-export.js`, `test-midi.html`).

**Action** :
1. Lister tous les fichiers de test et leur contenu
2. Identifier les doublons ou fichiers obsolètes
3. Créer un inventaire dans `docs/test-inventory.md` avec :
   - Nom du fichier
   - Objectif du test
   - Statut (actif / obsolète / redondant)
   - Recommandation (garder / supprimer / fusionner)

**Commit** : `docs: create test files inventory for cleanup`

### Tâche 1.2 : Auditer les fichiers de documentation

**Contexte** : Le projet contient `CLAUDE.md`, `README.md`, `review-audit.md`, et des plans dans `docs/plans/`.

**Action** :
1. Lire chaque fichier de documentation
2. Identifier les contenus obsolètes ou redondants
3. Créer un inventaire dans `docs/doc-inventory.md` avec :
   - Nom du fichier
   - Contenu principal
   - État (à jour / obsolète / à fusionner)
   - Recommandation

**Commit** : `docs: create documentation inventory for cleanup`

## Phase 2 : Suppression des fichiers obsolètes

### Tâche 2.1 : Supprimer les fichiers de test obsolètes à la racine

**Contexte** : Les fichiers `test-gm-names.js`, `test-midi-export.js`, et `test-midi.html` à la racine semblent être des tests ad-hoc qui pourraient être obsolètes.

**Action** :
1. Vérifier si ces fichiers sont référencés dans `index.html` ou d'autres fichiers
2. Si non référencés et obsolètes, les supprimer :
   ```bash
   git rm test-gm-names.js test-midi-export.js test-midi.html
   ```
3. Si certains tests sont encore utiles, les déplacer vers `test/` ou `tests/`

**Commit** : `chore: remove obsolete root-level test files`

### Tâche 2.2 : Consolider les répertoires de tests

**Contexte** : Avoir deux répertoires de tests (`test/` et `tests/`) crée de la confusion.

**Action** :
1. Décider d'une structure unique (recommandation : garder `test/` pour les tests unitaires, supprimer `tests/` si redondant)
2. Si `tests/` contient des tests utiles, les déplacer vers `test/`
3. Supprimer le répertoire `tests/` s'il est vide ou redondant :
   ```bash
   git rm -r tests/
   ```
4. Mettre à jour les chemins dans `index.html` si nécessaire

**Commit** : `refactor: consolidate test directories into test/`

### Tâche 2.3 : Supprimer les fichiers de documentation obsolètes

**Contexte** : Le fichier `review-audit.md` semble être un document temporaire d'audit.

**Action** :
1. Vérifier si `review-audit.md` contient des informations importantes
2. Si les informations sont déjà intégrées dans `CLAUDE.md` ou `README.md`, supprimer le fichier :
   ```bash
   git rm review-audit.md
   ```
3. Sinon, intégrer les informations pertinentes dans la documentation principale

**Commit** : `docs: remove obsolete review-audit.md`

## Phase 3 : Nettoyage du code JavaScript

### Tâche 3.1 : Supprimer les commentaires inutiles dans app.js

**Contexte** : Le fichier `app.js` contient des commentaires en français qui documentent le code, mais certains peuvent être redondants ou évidents.

**Action** :
1. Parcourir `app.js` ligne par ligne
2. Supprimer les commentaires qui décrivent ce que fait le code de manière évidente (ex: `// Ajout du titre` avant `result += scoreData.title + "\n";`)
3. Garder uniquement les commentaires qui expliquent le "pourquoi" (logique métier complexe, workarounds)
4. Exemple de nettoyage :

```javascript
// AVANT
function scoreToText(scoreData) {
    var result = "";
    // Ajout du titre
    result += scoreData.title + "\n";
    // Ajout du tempo
    result += scoreData.tempo + "\n";
    // ...
}

// APRÈS
function scoreToText(scoreData) {
    var result = "";
    result += scoreData.title + "\n";
    result += scoreData.tempo + "\n";
    // ...
}
```

**Commit** : `refactor(app): remove redundant comments`

### Tâche 3.2 : Utiliser des constantes pour les valeurs magiques dans app.js

**Contexte** : Le code contient des valeurs magiques comme `8` (ligne 54) pour la durée totale des mesures.

**Action** :
1. Identifier toutes les valeurs magiques dans `app.js`
2. Créer des constantes nommées en haut du fichier :

```javascript
// Configuration
const MEASURE_DURATION_THRESHOLD = 8; // Saut de ligne tous les 8 temps
const SUCCESS_MESSAGE_DURATION = 5000; // Durée d'affichage des messages de succès (ms)
const TRANSPOSE_MESSAGE_DURATION = 3000; // Durée d'affichage du message de transposition (ms)
```

3. Remplacer les valeurs magiques par les constantes dans tout le fichier

**Commit** : `refactor(app): extract magic numbers to named constants`

### Tâche 3.3 : Supprimer l'usage de eval() dans app.js

**Contexte** : Ligne 52 utilise `eval(note.type + "ToText")(note)` ce qui est dangereux et non maintenable.

**Action** :
1. Remplacer `eval()` par un objet de dispatch :

```javascript
const NOTE_TYPE_CONVERTERS = {
    'note': noteToText,
    'chord': chordToText,
    'rest': restToText
};

// Dans scoreToText()
for (const note of scoreData.notes){
    const converter = NOTE_TYPE_CONVERTERS[note.type];
    if (!converter) {
        throw new Error(`Type de note inconnu : ${note.type}`);
    }
    result += converter(note) + " ";
    // ...
}
```

**Commit** : `fix(app): replace eval() with type dispatch pattern`

### Tâche 3.4 : Utiliser const/let au lieu de var dans app.js

**Contexte** : Le code utilise `var` (lignes 32, 50, 75, 89) alors que `const`/`let` sont recommandés en JavaScript moderne.

**Action** :
1. Remplacer tous les `var` par `const` si la variable n'est jamais réassignée
2. Utiliser `let` si la variable est réassignée
3. Exemples :

```javascript
// AVANT
function scoreToText(scoreData) {
    var result = "";
    // ...
    var totalDuration = 0;
    // ...
}

// APRÈS
function scoreToText(scoreData) {
    let result = "";
    // ...
    let totalDuration = 0;
    // ...
}
```

**Commit** : `refactor(app): replace var with const/let`

### Tâche 3.5 : Factoriser le code de gestion des messages d'erreur/succès

**Contexte** : Le code pour afficher/masquer les messages de succès/erreur est dupliqué dans plusieurs fonctions.

**Action** :
1. Créer des fonctions utilitaires en haut de `app.js` :

```javascript
/**
 * Affiche un message de succès temporaire
 * @param {string} message - Message à afficher
 * @param {number} duration - Durée d'affichage en ms (défaut: 5000)
 */
function showSuccess(message, duration = 5000) {
    const errorDiv = document.getElementById('error-message');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    errorDiv.style.background = '#d4edda';
    errorDiv.style.color = '#155724';
    errorDiv.style.borderColor = '#c3e6cb';
    
    setTimeout(() => resetErrorDiv(errorDiv), duration);
}

/**
 * Réinitialise le style du div d'erreur
 * @param {HTMLElement} errorDiv - Élément à réinitialiser
 */
function resetErrorDiv(errorDiv) {
    errorDiv.style.display = 'none';
    errorDiv.style.background = '';
    errorDiv.style.color = '';
    errorDiv.style.borderColor = '';
}
```

2. Remplacer toutes les occurrences dupliquées par des appels à ces fonctions
3. La fonction `showSuccess()` existe déjà (ligne 907) mais n'est pas utilisée partout, l'utiliser systématiquement

**Commit** : `refactor(app): deduplicate error/success message handling`

### Tâche 3.6 : Simplifier la gestion des modales

**Contexte** : Le code contient beaucoup de duplication pour ouvrir/fermer les modales.

**Action** :
1. Créer des fonctions génériques pour gérer les modales :

```javascript
/**
 * Ouvre une modale par son ID
 * @param {string} modalId - ID de la modale
 */
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
    }
}

/**
 * Ferme une modale par son ID
 * @param {string} modalId - ID de la modale
 */
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}
```

2. Remplacer les appels directs par `openModal('instrument-modal')`, etc.
3. Simplifier le gestionnaire d'événement Escape (ligne 270-282) en utilisant une liste de modales

**Commit** : `refactor(app): extract modal management helpers`

## Phase 4 : Nettoyage des autres modules

### Tâche 4.1 : Auditer et nettoyer parser.js

**Action** :
1. Lire `parser.js` intégralement
2. Identifier :
   - Commentaires redondants ou évidents
   - Valeurs magiques à extraire
   - Code mort ou unused
   - Fonctions à simplifier
3. Créer un ticket de nettoyage détaillé dans `docs/cleanup-parser.md`
4. Appliquer les corrections (dans un commit séparé)

**Commit** : `docs: create cleanup plan for parser.js`

### Tâche 4.2 : Auditer et nettoyer renderer.js

**Action** :
1. Lire `renderer.js` intégralement
2. Identifier les mêmes catégories que pour parser.js
3. Créer un ticket détaillé dans `docs/cleanup-renderer.md`
4. Appliquer les corrections

**Commit** : `docs: create cleanup plan for renderer.js`

### Tâche 4.3 : Auditer et nettoyer midi-export.js

**Action** :
1. Lire `midi-export.js` intégralement
2. Vérifier la cohérence des commentaires JSDoc
3. Identifier les améliorations possibles
4. Créer un ticket dans `docs/cleanup-midi-export.md`
5. Appliquer les corrections

**Commit** : `docs: create cleanup plan for midi-export.js`

### Tâche 4.4 : Auditer et nettoyer midi-import.js

**Action** :
1. Lire `midi-import.js` intégralement
2. Vérifier la cohérence avec midi-export.js
3. Créer un ticket dans `docs/cleanup-midi-import.md`
4. Appliquer les corrections

**Commit** : `docs: create cleanup plan for midi-import.js`

### Tâche 4.5 : Auditer et nettoyer midi-audio-player.js

**Action** :
1. Lire `midi-audio-player.js` intégralement
2. Créer un ticket dans `docs/cleanup-midi-audio-player.md`
3. Appliquer les corrections

**Commit** : `docs: create cleanup plan for midi-audio-player.js`

### Tâche 4.6 : Auditer et nettoyer jazz-transformer.js

**Action** :
1. Lire `jazz-transformer.js` intégralement
2. Créer un ticket dans `docs/cleanup-jazz-transformer.md`
3. Appliquer les corrections

**Commit** : `docs: create cleanup plan for jazz-transformer.js`

## Phase 5 : Nettoyage HTML et CSS

### Tâche 5.1 : Optimiser index.html

**Action** :
1. Vérifier que tous les éléments DOM référencés dans le JS existent
2. Supprimer les éléments inutilisés
3. Vérifier l'accessibilité (attributs alt, aria-label, etc.)
4. Vérifier la sémantique HTML5

**Commit** : `refactor(html): optimize index.html structure`

### Tâche 5.2 : Nettoyer styles.css

**Action** :
1. Identifier les classes CSS inutilisées (pas référencées dans index.html)
2. Regrouper les règles CSS similaires
3. Supprimer les redondances
4. Vérifier la cohérence des espacements et couleurs

**Commit** : `refactor(css): remove unused styles and improve consistency`

## Phase 6 : Configuration et outillage

### Tâche 6.1 : Créer un .gitignore

**Action** :
1. Créer `.gitignore` à la racine avec :

```gitignore
# Fichiers système
.DS_Store
Thumbs.db

# Éditeurs
.vscode/
.idea/
*.swp
*.swo
*~

# Fichiers temporaires
*.log
*.tmp

# Node modules (si ajout futur)
node_modules/

# Build artifacts
dist/
build/
```

**Commit** : `chore: add .gitignore file`

### Tâche 6.2 : Créer une configuration ESLint (optionnel)

**Action** :
1. Si le projet souhaite adopter ESLint, créer `.eslintrc.json` :

```json
{
  "env": {
    "browser": true,
    "es2021": true
  },
  "extends": "eslint:recommended",
  "parserOptions": {
    "ecmaVersion": 12,
    "sourceType": "module"
  },
  "rules": {
    "no-eval": "error",
    "no-var": "warn",
    "prefer-const": "warn",
    "no-unused-vars": "warn"
  }
}
```

**Commit** : `chore: add ESLint configuration`

## Phase 7 : Documentation finale

### Tâche 7.1 : Mettre à jour CLAUDE.md

**Action** :
1. Supprimer les sections obsolètes
2. Ajouter les nouvelles conventions de code
3. Documenter la structure finale après nettoyage
4. Ajouter une section "Maintenance du code"

**Commit** : `docs: update CLAUDE.md after code cleanup`

### Tâche 7.2 : Mettre à jour README.md

**Action** :
1. Vérifier que README.md reflète l'état actuel du projet
2. Ajouter des instructions de développement si manquantes
3. Mettre à jour les sections sur les tests

**Commit** : `docs: update README.md with current project state`

### Tâche 7.3 : Créer CHANGELOG.md

**Action** :
1. Créer `CHANGELOG.md` à la racine
2. Documenter toutes les modifications du nettoyage
3. Utiliser le format [Keep a Changelog](https://keepachangelog.com/)

**Commit** : `docs: add CHANGELOG.md for code cleanup`

## Phase 8 : Tests et validation

### Tâche 8.1 : Tester l'application après nettoyage

**Action** :
1. Ouvrir `index.html` dans un navigateur
2. Tester toutes les fonctionnalités principales :
   - Génération d'une partition
   - Export PNG
   - Export MIDI
   - Import MIDI
   - Lecture audio
   - Arrangement Jazz
   - Transposition
   - Options avancées
3. Vérifier qu'aucune régression n'a été introduite

**Validation** : Aucun commit, mais noter les problèmes éventuels

### Tâche 8.2 : Corriger les bugs éventuels

**Action** :
1. Si des bugs sont trouvés lors des tests, les corriger un par un
2. Chaque correction = un commit séparé

**Commit** : `fix: [description du bug]` (un commit par bug)

## Phase 9 : Finalisation

### Tâche 9.1 : Créer un commit récapitulatif

**Action** :
1. Créer un commit de merge/synthèse si nécessaire
2. Tagger la version nettoyée : `git tag v1.0.0-clean`

**Commit** : `chore: finalize code cleanup v1.0.0-clean`

### Tâche 9.2 : Créer un rapport de nettoyage

**Action** :
1. Créer `docs/cleanup-report.md` avec :
   - Nombre de fichiers supprimés
   - Nombre de lignes de code réduites
   - Améliorations principales
   - Prochaines étapes recommandées

**Commit** : `docs: add cleanup summary report`

---

## Résumé des livrables

- [ ] Fichiers de test obsolètes supprimés
- [ ] Répertoires de tests consolidés
- [ ] Fichiers de documentation obsolètes supprimés
- [ ] Code JavaScript nettoyé (pas de `eval`, `var`, valeurs magiques)
- [ ] Commentaires redondants supprimés
- [ ] Code dupliqué factorisé
- [ ] HTML et CSS optimisés
- [ ] `.gitignore` créé
- [ ] Documentation mise à jour
- [ ] Application testée et fonctionnelle
- [ ] Rapport de nettoyage créé

## Notes pour l'exécuteur

- **Discipline TDD** : Même pour le nettoyage, si une modification change le comportement, écrire un test d'abord
- **Un commit par tâche** : Ne jamais grouper plusieurs tâches dans un commit
- **Tests continus** : Tester l'application après chaque phase pour détecter les régressions rapidement
- **Validation utilisateur** : Si une suppression de fichier est douteuse, demander confirmation avant de procéder
