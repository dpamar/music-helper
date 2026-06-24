# Plan: Ajouter un toggle d'optimisation des altérations

> Pour agentic workers: implement this plan task-by-task with red-green-refactor discipline. One task, one commit. Never batch.

## Contexte

Actuellement, le mode d'optimisation des altérations (`optimizeKeySignature`) est toujours actif dans le renderer. L'utilisateur n'a pas de contrôle sur cette fonctionnalité. Ce plan ajoute un toggle dans l'interface pour activer/désactiver ce mode d'optimisation.

## Objectif

Ajouter une case à cocher (checkbox) dans la modale "Options avancées" permettant de :
1. Activer/désactiver le mode d'optimisation
2. Mettre à jour la valeur dans le renderer via `setOptimizationMode()`
3. Appeler `optimizeKeySignature()` avant le rendu si le mode est activé

## Décomposition des tâches

### Tâche 1 : Ajouter l'élément HTML du toggle

**Objectif** : Ajouter une case à cocher dans la modale "Options avancées" (`#transpose-modal`)

**Localisation** : `index.html` lignes 88-118 (modale de transposition)

**Implémentation** :
```html
<!-- Dans index.html, après la div.transpose-controls (ligne 107), ajouter : -->
<div class="optimize-controls">
    <label class="checkbox-label">
        <input
            type="checkbox"
            id="optimize-checkbox"
            checked
        />
        <span>Optimiser l'affichage des altérations</span>
    </label>
    <div class="optimize-hint">
        Trouve automatiquement la meilleure armure pour minimiser les altérations accidentelles
    </div>
</div>
```

**Commit** : `feat(ui): add optimization toggle checkbox in advanced options modal`

---

### Tâche 2 : Ajouter les styles CSS pour le toggle

**Objectif** : Styliser la nouvelle section d'optimisation pour qu'elle s'intègre visuellement avec les contrôles de transposition

**Localisation** : `styles.css` (ajouter après les styles de `.transpose-hint`)

**Implémentation** :
```css
/* Optimize controls styling */
.optimize-controls {
    margin-top: 2rem;
    padding-top: 1.5rem;
    border-top: 1px solid rgba(102, 126, 234, 0.2);
}

.checkbox-label {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    cursor: pointer;
    font-size: 1rem;
    color: #333;
    user-select: none;
}

.checkbox-label input[type="checkbox"] {
    width: 20px;
    height: 20px;
    cursor: pointer;
    accent-color: #667eea;
}

.checkbox-label span {
    flex: 1;
}

.optimize-hint {
    margin-top: 0.5rem;
    margin-left: 2rem;
    font-size: 0.85rem;
    color: #666;
    font-style: italic;
}
```

**Commit** : `style(ui): add CSS for optimization toggle section`

---

### Tâche 3 : Initialiser l'état d'optimisation dans le renderer

**Objectif** : S'assurer que le renderer a un mode d'optimisation par défaut (activé)

**Localisation** : `renderer.js` ligne 37-40 (objet `drawingInfo`)

**Modification** :
```javascript
// Dans renderer.js, dans le constructor, modifier drawingInfo :
this.drawingInfo = {
    optimizationMode: true,  // Activé par défaut (change de false à true)
    fakeMode: false,
    alterationCount: 0
};
```

**Commit** : `feat(renderer): set optimization mode enabled by default`

---

### Tâche 4 : Récupérer l'état du toggle dans app.js

**Objectif** : Lire l'état de la checkbox et transmettre cette valeur au renderer lors de la génération

**Localisation** : `app.js` fonction `handleApplyTranspose()` (autour de la ligne 180)

**Contexte actuel** :
```javascript
function handleApplyTranspose() {
    const semitones = parseInt(inputSemitones.value, 10) || 0;
    closeTransposeModal();
    handleRender(semitones);
}
```

**Modification** :
```javascript
function handleApplyTranspose() {
    const semitones = parseInt(inputSemitones.value, 10) || 0;
    const optimizeCheckbox = document.getElementById('optimize-checkbox');
    const optimizationEnabled = optimizeCheckbox.checked;
    
    // Mettre à jour le mode d'optimisation dans le renderer
    renderer.setOptimizationMode(optimizationEnabled);
    
    closeTransposeModal();
    handleRender(semitones);
}
```

**Commit** : `feat(app): read optimization toggle state and update renderer`

---

### Tâche 5 : Appliquer l'optimisation conditionnellement dans handleRender

**Objectif** : Appeler `optimizeKeySignature()` uniquement si le mode d'optimisation est activé

**Localisation** : `app.js` fonction `handleRender(transposeSemitones)` (autour de la ligne 140-150)

**Contexte actuel** :
```javascript
function handleRender(transposeSemitones = 0) {
    const textarea = document.getElementById('partition-input');
    const renderOutput = document.getElementById('render-output');
    const errorDiv = document.getElementById('error-message');
    
    try {
        errorDiv.style.display = 'none';
        let scoreData = parser.parse(textarea.value);
        
        // Transposition si nécessaire
        if (transposeSemitones !== 0) {
            scoreData = parser.transpose(scoreData, transposeSemitones);
        }
        
        // Optimisation (actuellement toujours appelée)
        scoreData = renderer.optimizeKeySignature(scoreData);
        
        currentScoreData = scoreData;
        renderer.render(scoreData, renderOutput);
        setExportButtonState(true);
        setPlayButtonState(true);
    } catch (error) {
        // ...
    }
}
```

**Modification** :
```javascript
function handleRender(transposeSemitones = 0) {
    const textarea = document.getElementById('partition-input');
    const renderOutput = document.getElementById('render-output');
    const errorDiv = document.getElementById('error-message');
    
    try {
        errorDiv.style.display = 'none';
        let scoreData = parser.parse(textarea.value);
        
        // Transposition si nécessaire
        if (transposeSemitones !== 0) {
            scoreData = parser.transpose(scoreData, transposeSemitones);
        }
        
        // Optimisation conditionnelle
        if (renderer.drawingInfo.optimizationMode) {
            scoreData = renderer.optimizeKeySignature(scoreData);
        }
        
        currentScoreData = scoreData;
        renderer.render(scoreData, renderOutput);
        setExportButtonState(true);
        setPlayButtonState(true);
    } catch (error) {
        errorDiv.style.display = 'block';
        errorDiv.textContent = `❌ Erreur : ${error.message}`;
        errorDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        setExportButtonState(false);
        setPlayButtonState(false);
    }
}
```

**Commit** : `feat(app): apply optimization conditionally based on toggle state`

---

### Tâche 6 : Gérer le cas du bouton "Générer la partition" (sans modale)

**Objectif** : Synchroniser l'état d'optimisation même quand l'utilisateur clique directement sur "Générer la partition" (sans passer par la modale)

**Localisation** : `app.js` ligne 61 (`btnRender.addEventListener`)

**Contexte actuel** :
```javascript
btnRender.addEventListener('click', handleRender);
```

**Problème** : Lorsque l'utilisateur clique directement sur "Générer la partition" (sans ouvrir la modale), l'état du toggle n'est pas lu.

**Solution** : Créer une fonction wrapper qui lit toujours l'état du toggle :

```javascript
// Dans app.js, remplacer la ligne 61 par :
btnRender.addEventListener('click', () => {
    const optimizeCheckbox = document.getElementById('optimize-checkbox');
    const optimizationEnabled = optimizeCheckbox.checked;
    renderer.setOptimizationMode(optimizationEnabled);
    handleRender(0); // transposeSemitones = 0 par défaut
});
```

**Commit** : `fix(app): sync optimization state on direct render button click`

---

### Tâche 7 : Tester manuellement les scénarios

**Objectif** : Vérifier que le toggle fonctionne correctement dans tous les cas d'utilisation

**Scénarios de test** :

1. **Test 1 : Toggle activé par défaut**
   - Ouvrir l'application
   - Charger un exemple
   - Ouvrir "Options avancées"
   - Vérifier que la case "Optimiser l'affichage des altérations" est cochée
   - Cliquer sur "Générer avec transposition"
   - Vérifier que l'optimisation est appliquée (peu d'altérations accidentelles)

2. **Test 2 : Désactivation du toggle**
   - Ouvrir "Options avancées"
   - Décocher "Optimiser l'affichage des altérations"
   - Cliquer sur "Générer avec transposition"
   - Vérifier que l'armure reste celle spécifiée dans le texte (pas d'optimisation)

3. **Test 3 : Activation/désactivation successive**
   - Décocher le toggle → Générer → Observer le résultat
   - Cocher le toggle → Générer → Observer le résultat
   - Vérifier que les deux rendus sont différents

4. **Test 4 : Génération directe (sans modale)**
   - Ouvrir "Options avancées"
   - Cocher/décocher le toggle
   - Fermer la modale (Annuler)
   - Cliquer directement sur "Générer la partition"
   - Vérifier que l'état du toggle est bien appliqué

5. **Test 5 : Persistance entre générations**
   - Définir un état du toggle (coché ou décoché)
   - Générer plusieurs fois de suite
   - Vérifier que l'état reste cohérent

**Commit** : `test: manually verify optimization toggle in all use cases`

---

### Tâche 8 : Mettre à jour CLAUDE.md

**Objectif** : Documenter la nouvelle fonctionnalité dans la documentation du projet

**Localisation** : `CLAUDE.md` section "🎼 Format de notation" ou créer une nouvelle section "⚙️ Options avancées"

**Ajout** :
```markdown
## ⚙️ Options avancées

### Transposition

Accessible via le bouton "⚙️" à côté de "Générer la partition".

- **Plage** : -12 à +12 demi-tons
- **Contrôles** : Boutons +/- ou saisie manuelle
- **Application** : Toutes les notes sont transposées avant le rendu

### Optimisation de l'affichage des altérations

**Case à cocher** : "Optimiser l'affichage des altérations"
- **Activée par défaut** : Oui
- **Fonctionnement** :
  - Teste automatiquement les 15 armures possibles (Do majeur, 7 dièses, 7 bémols)
  - Sélectionne l'armure qui minimise le nombre d'altérations accidentelles
  - Améliore la lisibilité de la partition

**Exemple** :
- Partition avec beaucoup de Fa# → L'optimiseur choisit automatiquement une armure avec Fa# à la clef
- Résultat : Moins de symboles # sur la portée, partition plus claire

**Désactivation** :
- Décocher la case pour conserver l'armure originale spécifiée dans la saisie
- Utile pour respecter une tonalité spécifique voulue par l'utilisateur
```

**Commit** : `docs: document optimization toggle feature in CLAUDE.md`

---

## Résumé des fichiers modifiés

1. **index.html** : Ajout du toggle et de son texte d'aide
2. **styles.css** : Styles pour la section d'optimisation
3. **renderer.js** : Mode d'optimisation activé par défaut
4. **app.js** : Lecture de l'état du toggle et application conditionnelle
5. **CLAUDE.md** : Documentation de la nouvelle fonctionnalité

## Points d'attention

- **État par défaut** : Le toggle doit être coché (optimisation activée) pour correspondre au comportement actuel
- **Synchronisation** : L'état du toggle doit être lu à chaque génération (modale ou bouton direct)
- **Persistance** : L'état du toggle persiste entre les générations (pas de reset automatique)
- **UX** : Le texte d'aide doit expliquer clairement ce que fait l'optimisation

## Test de non-régression

Après implémentation, vérifier que :
1. Le comportement par défaut (toggle coché) est identique à l'ancien comportement
2. Les exemples existants s'affichent correctement avec optimisation activée
3. L'export PNG et MIDI continuent de fonctionner
4. La transposition fonctionne avec et sans optimisation

---

**Date de création** : 2026-06-24
**Complexité estimée** : Moyenne (8 tâches, ~2-3h)
**Dépendances** : Aucune
