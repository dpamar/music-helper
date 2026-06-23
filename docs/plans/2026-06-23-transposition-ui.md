# Plan d'implémentation - Interface de transposition

> For agentic workers: implement this plan task-by-task with red-green-refactor discipline. One task, one commit. Never batch.

## Contexte

Le code de transposition existe déjà dans `parser.js` (`transposeScore`), mais il est hardcodé à +1 demi-ton dans `app.js` ligne 129. L'objectif est de permettre à l'utilisateur de choisir le nombre de demi-tons de décalage via une interface graphique.

## Architecture cible

- Bouton "Générer la partition" reste le comportement par défaut (pas de transposition)
- Icône/bouton "⚙️ Avancé" à droite du bouton principal ouvre une popup
- Popup contient un sélecteur de demi-tons (-12 à +12)
- Bouton "Appliquer" dans la popup génère avec transposition

## Structure du plan

### Task 1: Ajouter le HTML de la popup de transposition

**Fichier** : `index.html`

**Action** : Insérer après la modale d'instruments (ligne 82), avant les scripts :

```html
<!-- Modale de transposition -->
<div id="transpose-modal" class="modal-overlay" style="display: none;">
    <div class="modal-content transpose-modal">
        <h2>⚙️ Options avancées</h2>
        <div class="transpose-controls">
            <label for="transpose-semitones">Transposition (demi-tons) :</label>
            <div class="transpose-input-group">
                <button id="btn-transpose-minus" class="transpose-adjust-btn">−</button>
                <input 
                    type="number" 
                    id="transpose-semitones" 
                    min="-12" 
                    max="12" 
                    value="0" 
                    step="1"
                />
                <button id="btn-transpose-plus" class="transpose-adjust-btn">+</button>
            </div>
            <div class="transpose-hint">
                De -12 (1 octave bas) à +12 (1 octave haut)
            </div>
        </div>
        <div class="modal-actions">
            <button id="btn-apply-transpose" class="btn-primary">
                ✅ Générer avec transposition
            </button>
            <button id="btn-cancel-transpose" class="btn-secondary">
                Annuler
            </button>
        </div>
    </div>
</div>
```

**Test** : Ouvrir `index.html` dans le navigateur, inspecter le DOM pour vérifier que la modale existe (même si invisible).

---

### Task 2: Ajouter le bouton "Avancé" dans l'interface

**Fichier** : `index.html`

**Action** : Remplacer la section `.actions` (lignes 32-36) par :

```html
<div class="actions">
    <div class="primary-actions">
        <button id="btn-render" class="btn-primary">Générer la partition</button>
        <button id="btn-advanced" class="btn-icon" title="Options avancées">⚙️</button>
    </div>
    <button id="btn-example" class="btn-secondary">Charger un exemple</button>
    <button id="btn-clear" class="btn-secondary">Effacer</button>
</div>
```

**Test** : Recharger la page, vérifier que le bouton ⚙️ apparaît à côté de "Générer".

---

### Task 3: Styler la popup et le bouton avancé

**Fichier** : `styles.css`

**Action** : Ajouter à la fin du fichier (après les styles existants) :

```css
/* ============================================================================
   OPTIONS AVANCÉES - TRANSPOSITION
   ============================================================================ */

/* Groupement du bouton principal + avancé */
.primary-actions {
    display: flex;
    gap: 10px;
    align-items: center;
}

/* Bouton icône avancé */
.btn-icon {
    padding: 12px 16px;
    border: none;
    border-radius: 8px;
    font-size: 1.2rem;
    background: #f0f4ff;
    color: #667eea;
    cursor: pointer;
    transition: all 0.3s;
}

.btn-icon:hover {
    background: #667eea;
    color: white;
    transform: translateY(-2px);
}

/* Modale de transposition (plus compacte) */
.transpose-modal {
    max-width: 400px;
}

.transpose-controls {
    margin: 20px 0;
}

.transpose-controls label {
    display: block;
    margin-bottom: 10px;
    font-weight: 600;
    color: #333;
}

.transpose-input-group {
    display: flex;
    gap: 10px;
    align-items: center;
    justify-content: center;
}

.transpose-adjust-btn {
    width: 40px;
    height: 40px;
    border: 2px solid #667eea;
    background: white;
    color: #667eea;
    border-radius: 50%;
    font-size: 1.5rem;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.3s;
}

.transpose-adjust-btn:hover {
    background: #667eea;
    color: white;
}

#transpose-semitones {
    width: 80px;
    padding: 10px;
    border: 2px solid #ddd;
    border-radius: 8px;
    text-align: center;
    font-size: 1.2rem;
    font-weight: bold;
}

#transpose-semitones:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.transpose-hint {
    margin-top: 10px;
    font-size: 0.85rem;
    color: #666;
    text-align: center;
}
```

**Test** : Ouvrir l'application, vérifier que le bouton ⚙️ est stylé correctement (fond gris clair, hover violet).

---

### Task 4: Implémenter l'ouverture/fermeture de la popup

**Fichier** : `app.js`

**Action** : 

1. Dans `init()`, après la gestion de la modale d'instruments (ligne 105), ajouter :

```javascript
// Gestion de la modale de transposition
const transposeModal = document.getElementById('transpose-modal');
const btnAdvanced = document.getElementById('btn-advanced');
const btnCancelTranspose = document.getElementById('btn-cancel-transpose');
const btnApplyTranspose = document.getElementById('btn-apply-transpose');
const btnTransposeMinus = document.getElementById('btn-transpose-minus');
const btnTransposePlus = document.getElementById('btn-transpose-plus');
const inputSemitones = document.getElementById('transpose-semitones');

btnAdvanced.addEventListener('click', showTransposeModal);
btnCancelTranspose.addEventListener('click', closeTransposeModal);
btnApplyTranspose.addEventListener('click', handleApplyTranspose);

btnTransposeMinus.addEventListener('click', () => {
    const current = parseInt(inputSemitones.value) || 0;
    inputSemitones.value = Math.max(-12, current - 1);
});

btnTransposePlus.addEventListener('click', () => {
    const current = parseInt(inputSemitones.value) || 0;
    inputSemitones.value = Math.min(12, current + 1);
});

transposeModal.addEventListener('click', (e) => {
    if (e.target === transposeModal) {
        closeTransposeModal();
    }
});

// Fermeture avec Escape (amélioration de la gestion existante)
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (transposeModal.style.display === 'flex') {
            closeTransposeModal();
        } else if (instrumentModal.style.display === 'flex') {
            closeInstrumentModal();
        }
    }
});
```

2. Ajouter les fonctions à la fin du fichier (avant la ligne `document.addEventListener('DOMContentLoaded', init);`) :

```javascript
/**
 * Affiche la modale de transposition
 */
function showTransposeModal() {
    const modal = document.getElementById('transpose-modal');
    const input = document.getElementById('transpose-semitones');
    
    // Reset à 0 par défaut
    input.value = '0';
    
    modal.style.display = 'flex';
    input.focus();
}

/**
 * Ferme la modale de transposition
 */
function closeTransposeModal() {
    const modal = document.getElementById('transpose-modal');
    modal.style.display = 'none';
}
```

**Test** : 
- Cliquer sur ⚙️ → modale s'ouvre
- Cliquer sur "Annuler" → modale se ferme
- Cliquer à l'extérieur de la modale → modale se ferme
- Presser Escape → modale se ferme

---

### Task 5: Implémenter la génération avec transposition

**Fichier** : `app.js`

**Action** : 

1. Modifier `handleRender()` pour supprimer la transposition hardcodée (ligne 129) :

```javascript
// Avant :
const scoreData = parser.transposeScore(parser.parse(text), 1);

// Après :
const scoreData = parser.parse(text);
```

2. Ajouter la fonction `handleApplyTranspose()` juste avant `showTransposeModal()` :

```javascript
/**
 * Gère l'application de la transposition et génération
 */
function handleApplyTranspose() {
    const textarea = document.getElementById('partition-input');
    const errorDiv = document.getElementById('error-message');
    const outputDiv = document.getElementById('render-output');
    const inputSemitones = document.getElementById('transpose-semitones');
    
    // Cache les erreurs précédentes
    errorDiv.style.display = 'none';
    
    // Ferme la modale
    closeTransposeModal();
    
    try {
        const text = textarea.value.trim();
        
        if (!text) {
            throw new Error('Veuillez saisir une partition');
        }
        
        // Parse la partition
        const parsedData = parser.parse(text);
        
        // Applique la transposition
        const semitones = parseInt(inputSemitones.value) || 0;
        const scoreData = semitones !== 0 
            ? parser.transposeScore(parsedData, semitones)
            : parsedData;
        
        console.log(`✅ Partition parsée (transposition: ${semitones} demi-tons):`, scoreData);
        
        // Stocke les données pour l'export
        currentScoreData = scoreData;
        
        // Rend la partition
        renderer.render(scoreData, outputDiv);
        console.log('✅ Partition rendue');
        
        // Active les boutons d'export et de lecture
        setExportButtonState(true);
        setPlayButtonState(true);
        
    } catch (error) {
        // Affiche l'erreur
        console.error('❌ Erreur:', error.message);
        errorDiv.textContent = '❌ ' + error.message;
        errorDiv.style.display = 'block';
        
        // Désactive les boutons d'export et de lecture en cas d'erreur
        setExportButtonState(false);
        setPlayButtonState(false);
        
        // Scroll vers l'erreur
        errorDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}
```

**Test** : 
1. Saisir une partition (ex: "Do Re Mi")
2. Cliquer sur "Générer" → pas de transposition (normal)
3. Cliquer sur ⚙️, mettre +2, cliquer "Générer avec transposition"
4. Vérifier que les notes sont bien montées de 2 demi-tons (Do → Re)

---

### Task 6: Validation des limites du champ de saisie

**Fichier** : `app.js`

**Action** : Ajouter un event listener dans `init()`, juste après les boutons +/− de transposition :

```javascript
// Validation en temps réel des limites
inputSemitones.addEventListener('input', () => {
    let value = parseInt(inputSemitones.value);
    
    if (isNaN(value)) {
        inputSemitones.value = '0';
        return;
    }
    
    if (value < -12) {
        inputSemitones.value = '-12';
    } else if (value > 12) {
        inputSemitones.value = '12';
    }
});
```

**Test** : 
- Taper manuellement "-20" → automatiquement ramené à "-12"
- Taper "15" → automatiquement ramené à "12"
- Taper "abc" → reset à "0"

---

### Task 7: Ajouter un message de confirmation visuel

**Fichier** : `app.js`

**Action** : Dans `handleApplyTranspose()`, après `renderer.render(scoreData, outputDiv);`, ajouter :

```javascript
// Affiche un message de confirmation si transposition appliquée
if (semitones !== 0) {
    errorDiv.textContent = `✅ Partition générée avec transposition de ${semitones > 0 ? '+' : ''}${semitones} demi-ton(s)`;
    errorDiv.style.display = 'block';
    errorDiv.style.background = '#d4edda';
    errorDiv.style.color = '#155724';
    errorDiv.style.borderColor = '#c3e6cb';
    
    // Masque le message après 3 secondes
    setTimeout(() => {
        errorDiv.style.display = 'none';
        errorDiv.style.background = '';
        errorDiv.style.color = '';
        errorDiv.style.borderColor = '';
    }, 3000);
}
```

**Test** : 
- Générer avec transposition +3 → message vert "✅ Partition générée avec transposition de +3 demi-ton(s)" apparaît 3 secondes
- Générer avec transposition -2 → message vert "✅ Partition générée avec transposition de -2 demi-ton(s)" apparaît 3 secondes

---

### Task 8: Test d'intégration complet

**Procédure de test** :

1. **Test du workflow normal (sans transposition)** :
   - Saisir "Do Re Mi Fa Sol"
   - Cliquer "Générer la partition"
   - Vérifier que Do est à la position attendue (ligne supplémentaire sous la portée en clef de sol)

2. **Test de transposition positive** :
   - Même partition
   - Cliquer ⚙️
   - Mettre +2
   - Cliquer "Générer avec transposition"
   - Vérifier que la première note est Re (position 0 au lieu de -1)

3. **Test de transposition négative** :
   - Même partition
   - Cliquer ⚙️
   - Mettre -3
   - Cliquer "Générer avec transposition"
   - Vérifier que la première note est La-- (position -4)

4. **Test des boutons +/−** :
   - Ouvrir la modale
   - Cliquer 5 fois sur + → valeur = 5
   - Cliquer 7 fois sur − → valeur = -2

5. **Test des limites** :
   - Taper manuellement 20 → ramené à 12
   - Taper -50 → ramené à -12

6. **Test de fermeture** :
   - Escape ferme la modale
   - Clic extérieur ferme la modale
   - Annuler ferme la modale

7. **Test des exports** :
   - Générer avec transposition +5
   - Exporter en PNG → vérifier que les notes affichées sont bien transposées
   - Exporter en MIDI → ouvrir dans un lecteur MIDI, vérifier que la hauteur est bien +5 demi-tons

**Critères de succès** : Tous les tests passent sans erreur console, interface réactive, transposition audible et visible.

---

## Notes techniques

- **Pas de régression** : le bouton "Générer la partition" doit continuer à fonctionner normalement (sans transposition)
- **Code réutilisable** : `parser.transposeScore()` est déjà implémenté, on l'appelle conditionnellement
- **UX cohérente** : la modale de transposition suit le même pattern que la modale d'instruments (overlay + focus)
- **Validation robuste** : les limites -12/+12 sont appliquées à la fois via HTML `min`/`max` et via JS

## Limitations connues

- La transposition n'est pas persistée entre les générations (choix délibéré : chaque génération avec transposition nécessite un clic explicite sur ⚙️)
- Pas de prévisualisation en temps réel (ajout possible futur : mettre à jour la partition dynamiquement en changeant le curseur)
- Le titre de la partition n'indique pas qu'elle a été transposée (ajout possible : suffixe dans le titre genre "Ma partition (+3)")
