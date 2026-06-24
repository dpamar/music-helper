> For agentic workers: implement this plan task-by-task with red-green-refactor discipline. One task, one commit. Never batch.

# Plan: Add Optimization Mode Toggle

**Feature**: Add a checkbox toggle in the UI to enable/disable key signature optimization mode.

**Context**: Currently, the optimization mode is always active (hardcoded). This feature adds a user-facing control to toggle the optimization on/off, with the checkbox checked by default to maintain current behavior.

**Key files**:
- `index.html` - Add the checkbox UI element
- `styles.css` - Style the checkbox control
- `app.js` - Wire up event handlers and manage state
- `renderer.js` - Already has `setOptimizationMode()` and `optimizeKeySignature()` methods

**Decision log**:
- Checkbox will be placed in the advanced options modal (near transposition controls) since it's a technical setting
- Default state: checked (optimization ON) to match current behavior
- The checkbox state controls whether `optimizeKeySignature()` is called before rendering
- Renderer already has the necessary infrastructure (`setOptimizationMode()`, `optimizeKeySignature()`)

---

## Task 1: Add optimization toggle checkbox to HTML

**Goal**: Add the UI element in the advanced options modal.

**Location**: `index.html`, inside the `#transpose-modal` div, after the transposition controls.

**Changes**:
```html
<!-- Add after line 107 (after transpose-hint div) -->
<div class="optimization-controls">
    <label class="checkbox-label">
        <input type="checkbox" id="optimization-mode" checked />
        <span>Activer l'optimisation de l'armure</span>
    </label>
    <div class="optimization-hint">
        Trouve automatiquement la meilleure armure à la clef pour minimiser les altérations accidentelles.
    </div>
</div>
```

**Test**: Open `index.html`, click the "⚙️" button, verify the checkbox appears in the modal.

---

## Task 2: Style the optimization toggle

**Goal**: Add CSS rules to make the checkbox and label visually consistent with the rest of the UI.

**Location**: `styles.css`, at the end of the file or near transpose-related styles.

**Changes**:
```css
/* Optimization mode toggle */
.optimization-controls {
    margin-top: 1.5rem;
    padding-top: 1.5rem;
    border-top: 1px solid rgba(102, 126, 234, 0.2);
}

.checkbox-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
    font-size: 1rem;
    color: #333;
    user-select: none;
}

.checkbox-label input[type="checkbox"] {
    width: 18px;
    height: 18px;
    cursor: pointer;
    accent-color: #667eea;
}

.checkbox-label:hover {
    color: #667eea;
}

.optimization-hint {
    margin-top: 0.5rem;
    font-size: 0.85rem;
    color: #666;
    line-height: 1.4;
    padding-left: 26px;
}
```

**Test**: Refresh the page, open the modal, verify the checkbox is styled correctly and hovers work.

---

## Task 3: Wire up checkbox event handler

**Goal**: Update `app.js` to read the checkbox state and conditionally apply optimization.

**Location**: `app.js`

**Changes**:

1. In `init()`, add event listener reference:
```javascript
// After line 95 (after btnTransposePlus declaration)
const checkboxOptimization = document.getElementById('optimization-mode');
```

2. Update `handleRender()` (lines 145-182) to check the checkbox state:
```javascript
function handleRender() {
    const textarea = document.getElementById('partition-input');
    const errorDiv = document.getElementById('error-message');
    const outputDiv = document.getElementById('render-output');
    const checkboxOptimization = document.getElementById('optimization-mode');

    errorDiv.style.display = 'none';

    try {
        const text = textarea.value.trim();

        if (!text) {
            throw new Error('Veuillez saisir une partition');
        }

        const scoreData = parser.parse(text);
        console.log('✅ Partition parsée:', scoreData);

        currentScoreData = scoreData;

        // Apply optimization only if checkbox is checked
        const optimizationEnabled = checkboxOptimization && checkboxOptimization.checked;
        const dataToRender = optimizationEnabled 
            ? renderer.optimizeKeySignature(scoreData) 
            : scoreData;

        renderer.setOptimizationMode(optimizationEnabled);
        renderer.render(dataToRender, outputDiv);
        renderer.setOptimizationMode(false);
        console.log(`✅ Partition rendue (optimization: ${optimizationEnabled ? 'ON' : 'OFF'})`);

        setExportButtonState(true);
        setPlayButtonState(true);

    } catch (error) {
        console.error('❌ Erreur:', error.message);
        errorDiv.textContent = '❌ ' + error.message;
        errorDiv.style.display = 'block';

        setExportButtonState(false);
        setPlayButtonState(false);

        errorDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}
```

3. Update `handleApplyTranspose()` (lines 460-521) similarly:
```javascript
function handleApplyTranspose() {
    const textarea = document.getElementById('partition-input');
    const errorDiv = document.getElementById('error-message');
    const outputDiv = document.getElementById('render-output');
    const inputSemitones = document.getElementById('transpose-semitones');
    const checkboxOptimization = document.getElementById('optimization-mode');

    errorDiv.style.display = 'none';

    closeTransposeModal();

    try {
        const text = textarea.value.trim();

        if (!text) {
            throw new Error('Veuillez saisir une partition');
        }

        const parsedData = parser.parse(text);

        const semitones = parseInt(inputSemitones.value) || 0;
        const scoreData = semitones !== 0
            ? parser.transposeScore(parsedData, semitones)
            : parsedData;

        console.log(`✅ Partition parsée (transposition: ${semitones} demi-tons):`, scoreData);

        currentScoreData = scoreData;

        // Apply optimization only if checkbox is checked
        const optimizationEnabled = checkboxOptimization && checkboxOptimization.checked;
        const dataToRender = optimizationEnabled 
            ? renderer.optimizeKeySignature(scoreData) 
            : scoreData;

        renderer.setOptimizationMode(optimizationEnabled);
        renderer.render(dataToRender, outputDiv);
        renderer.setOptimizationMode(false);
        console.log(`✅ Partition rendue (optimization: ${optimizationEnabled ? 'ON' : 'OFF'})`);

        setExportButtonState(true);
        setPlayButtonState(true);

        if (semitones !== 0) {
            errorDiv.textContent = `✅ Partition générée avec transposition de ${semitones > 0 ? '+' : ''}${semitones} demi-ton(s)`;
            errorDiv.style.display = 'block';
            errorDiv.style.background = '#d4edda';
            errorDiv.style.color = '#155724';
            errorDiv.style.borderColor = '#c3e6cb';

            setTimeout(() => {
                errorDiv.style.display = 'none';
                errorDiv.style.background = '';
                errorDiv.style.color = '';
                errorDiv.style.borderColor = '';
            }, 3000);
        }

    } catch (error) {
        console.error('❌ Erreur:', error.message);
        errorDiv.textContent = '❌ ' + error.message;
        errorDiv.style.display = 'block';

        setExportButtonState(false);
        setPlayButtonState(false);

        errorDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}
```

**Test**:
1. Generate a partition with optimization checkbox checked → should optimize (current behavior)
2. Uncheck optimization checkbox, regenerate → should NOT optimize (shows original key signature)
3. Open advanced modal, change transposition with optimization checked → should optimize
4. Open advanced modal, change transposition with optimization unchecked → should NOT optimize

---

## Task 4: Update CLAUDE.md documentation

**Goal**: Document the new optimization toggle feature.

**Location**: `CLAUDE.md`, in the appropriate sections.

**Changes**:

1. Add a new section after "🔧 Comment ajouter une fonctionnalité":

```markdown
## ⚙️ Mode d'optimisation de l'armure

L'application dispose d'un mode d'optimisation qui trouve automatiquement la meilleure armure à la clef pour minimiser les altérations accidentelles sur la partition.

### Fonctionnement

1. **Activation** : Checkbox dans la modale "Options avancées" (bouton ⚙️)
2. **État par défaut** : Activé (coché)
3. **Algorithme** : Teste les 15 armures possibles (0 à 7 dièses, 0 à 7 bémols), choisit celle qui minimise les altérations dans les mesures
4. **Impact** : 
   - Activé : `optimizeKeySignature()` est appelé avant le rendu
   - Désactivé : L'armure saisie par l'utilisateur est conservée telle quelle

### Cas d'usage

- **Optimisation ON** (recommandé) : Pour les partitions sans armure définie ou pour trouver automatiquement la tonalité optimale
- **Optimisation OFF** : Pour conserver l'armure exacte spécifiée par l'utilisateur (respect strict de la saisie)

### Architecture

- **Méthode** : `Renderer.optimizeKeySignature(scoreData)` → retourne un nouveau `scoreData` avec l'armure optimisée
- **État** : `Renderer.setOptimizationMode(boolean)` → contrôle le mode pendant le rendu
- **UI** : Checkbox `#optimization-mode` dans `#transpose-modal`
```

2. Update the "🐛 Bugs connus / Limitations" section to reflect that optimization is now optional:

Change:
```markdown
- ⚠️ Barres de mesure : calculées sur 4 temps fixes (ne s'adapte pas au chiffrage)
```

To:
```markdown
- ⚠️ Barres de mesure : calculées sur 4 temps fixes (ne s'adapte pas au chiffrage)
- ℹ️ L'optimisation de l'armure est activée par défaut mais peut être désactivée dans les options avancées
```

**Test**: Read the updated documentation to verify it's clear and accurate.

---

## Task 5: Manual end-to-end testing

**Goal**: Verify the feature works correctly in all scenarios.

**Test cases**:

1. **Default behavior (optimization ON)**:
   - Open the app fresh
   - Enter a partition with notes like "Do# Re# Mi# Fa# Sol# La# Si#"
   - Generate → should optimize to a simpler key signature (e.g., Re♭ majeur with 5 flats instead of 7 sharps)

2. **Optimization OFF**:
   - Uncheck "Activer l'optimisation de l'armure"
   - Regenerate the same partition → should show original key signature as entered

3. **With transposition (optimization ON)**:
   - Check optimization checkbox
   - Apply +2 semitone transposition
   - Should optimize the transposed result

4. **With transposition (optimization OFF)**:
   - Uncheck optimization checkbox
   - Apply +2 semitone transposition
   - Should NOT optimize, keep original transposed key signature

5. **State persistence**:
   - Check/uncheck the checkbox
   - Close the modal without applying
   - Reopen the modal → checkbox state should be preserved

6. **Edge case - missing checkbox element**:
   - Verify the code handles `checkboxOptimization` being null gracefully (e.g., if the element is removed from HTML)

**Success criteria**:
- All test cases pass
- No console errors
- Checkbox state correctly controls optimization behavior
- UI is responsive and intuitive

---

## Summary

**Files modified**:
- `index.html` - Added checkbox UI
- `styles.css` - Styled checkbox and hint text
- `app.js` - Wired up checkbox state to optimization logic
- `CLAUDE.md` - Documented the feature

**Behavior**:
- Checkbox is in the advanced options modal (⚙️ button)
- Default state: checked (optimization ON)
- When checked: calls `optimizeKeySignature()` before rendering
- When unchecked: renders with original key signature
- Works with both direct render and transposition

**Testing**:
- Unit-level: Visual inspection of UI elements
- Integration: Verify checkbox state controls optimization in both `handleRender()` and `handleApplyTranspose()`
- End-to-end: Manual testing with various partition inputs and transpositions
