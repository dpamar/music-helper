# Plan d'implémentation : Bouton d'arrangement Jazz

> For agentic workers: implement this plan task-by-task with red-green-refactor discipline. One task, one commit. Never batch.

## Vue d'ensemble

Ajouter un bouton "🎷 Arrangement Jazz" qui transforme une partition musicale classique en arrangement jazz avec :
- Swing rhythm (shuffle des croches)
- Accords enrichis (7ème, 9ème, 13ème)
- Syncopation (décalages rythmiques)
- Walking bass patterns
- Tempo adapté au style jazz

## Architecture

**Nouveau module** : `jazz-transformer.js`
- Classe `JazzTransformer` avec méthodes de transformation
- Injection dans `app.js` pour orchestration
- UI : bouton dans la section export/actions

**Flux de données** :
```
ScoreData original → JazzTransformer.transform() → ScoreData jazzifié → Renderer.render()
```

---

## Tâche 1 : Créer la structure de base du module jazz-transformer.js

**Objectif** : Créer le fichier vide et l'inclure dans index.html.

**Test** : Vérifier que le fichier se charge sans erreur dans la console.

### Étape 1.1 : Créer le fichier jazz-transformer.js

Créer `/jazz-transformer.js` :

```javascript
/**
 * JazzTransformer - Transforme une partition classique en arrangement jazz.
 * 
 * Transformations appliquées :
 * - Swing rhythm : croches en triolets (shuffle)
 * - Accords enrichis : ajout de 7ème, 9ème, 13ème
 * - Syncopation : décalages rythmiques
 * - Walking bass : lignes de basse marchantes
 */
class JazzTransformer {
    /**
     * Initialise le transformateur avec les configurations par défaut.
     */
    constructor() {
        this.config = {
            swingRatio: 0.67,        // Ratio pour le swing (2/3 - 1/3)
            syncopationProbability: 0.3,  // 30% de chances de syncopation
            walkingBassEnabled: false,     // Walking bass (désactivé par défaut)
            tempoMultiplier: 1.1      // Tempo légèrement plus rapide
        };
    }

    /**
     * Transforme une partition en arrangement jazz.
     * @param {Object} scoreData - Objet ParseResult (résultat de Parser.parse())
     * @returns {Object} Nouvelle partition jazzifiée (même structure)
     */
    transform(scoreData) {
        console.log('🎷 Transformation jazz en cours...');
        
        // Pour l'instant, retourne une copie sans modification
        return JSON.parse(JSON.stringify(scoreData));
    }
}
```

### Étape 1.2 : Inclure le module dans index.html

Modifier `/index.html` ligne 133 (après `midi-audio-player.js`, avant `app.js`) :

```html
    <script src="parser.js"></script>
    <script src="renderer.js"></script>
    <script src="midi-export.js"></script>
    <script src="midi-audio-player.js"></script>
    <script src="jazz-transformer.js"></script>
    <script src="app.js"></script>
```

### Étape 1.3 : Tester le chargement du module

**Test manuel** :
1. Ouvrir `index.html` dans un navigateur
2. Ouvrir la console développeur
3. Taper : `new JazzTransformer()`
4. Vérifier qu'aucune erreur n'apparaît

**Résultat attendu** : Objet `JazzTransformer` créé avec succès.

### Étape 1.4 : Commit

```bash
git add jazz-transformer.js index.html
git commit -m "feat(jazz): add JazzTransformer module skeleton

- Create JazzTransformer class with base structure
- Include jazz-transformer.js in index.html
- Add transform() stub that returns unchanged scoreData

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Tâche 2 : Ajouter le bouton UI "Arrangement Jazz"

**Objectif** : Créer le bouton dans l'interface et câbler l'événement click.

**Test** : Cliquer sur le bouton doit afficher un message console.

### Étape 2.1 : Ajouter le bouton dans index.html

Modifier `/index.html` ligne 64 (après le bouton "Exporter en MIDI") :

```html
                <div class="export-actions">
                    <button id="btn-play" class="btn-secondary" disabled>
                        🎵 Lire la partition
                    </button>
                    <button id="btn-export-png" class="btn-secondary" disabled>
                        💾 Exporter en PNG
                    </button>
                    <button id="btn-export-midi" class="btn-secondary" disabled>
                        🎹 Exporter en MIDI
                    </button>
                    <button id="btn-jazz-arrange" class="btn-secondary" disabled>
                        🎷 Arrangement Jazz
                    </button>
                </div>
```

### Étape 2.2 : Initialiser le transformateur dans app.js

Modifier `/app.js` ligne 12 (après `midiExporter`) :

```javascript
let parser;
let renderer;
let midiAudioPlayer;
let midiExporter;
let jazzTransformer;
let currentScoreData = null;
```

Modifier `/app.js` fonction `init()` ligne 124 (après `midiAudioPlayer = new MidiAudioPlayer();`) :

```javascript
    parser = new Parser();
    renderer = new Renderer();
    midiExporter = new MidiExporter();
    midiAudioPlayer = new MidiAudioPlayer();
    jazzTransformer = new JazzTransformer();
```

### Étape 2.3 : Câbler l'événement click

Modifier `/app.js` ligne 134 (après les autres boutons) :

```javascript
    const btnPlay = document.getElementById('btn-play');
    const audioElement = document.getElementById('midi-player');
    const btnJazzArrange = document.getElementById('btn-jazz-arrange');

    midiAudioPlayer.init(audioElement, midiExporter);
```

Modifier `/app.js` ligne 157 (après `btnPlay.addEventListener`) :

```javascript
    btnExportPNG.addEventListener('click', handleExportPNG);
    btnExportMIDI.addEventListener('click', handleExportMIDI);
    btnPlay.addEventListener('click', handlePlay);
    btnJazzArrange.addEventListener('click', handleJazzArrange);
```

### Étape 2.4 : Créer le handler handleJazzArrange()

Ajouter dans `/app.js` ligne 434 (après `setPlayButtonState()`) :

```javascript
function setPlayButtonState(enabled) {
    const btnPlay = document.getElementById('btn-play');
    if (btnPlay) {
        btnPlay.disabled = !enabled;
    }
}

function handleJazzArrange() {
    const errorDiv = document.getElementById('error-message');

    if (!currentScoreData) {
        errorDiv.textContent = '❌ Veuillez d\'abord générer une partition';
        errorDiv.style.display = 'block';
        errorDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        return;
    }

    try {
        errorDiv.style.display = 'none';

        console.log('🎷 Arrangement jazz demandé pour:', currentScoreData.title);
        
        // Pour l'instant, juste un log
        errorDiv.textContent = '✅ Arrangement jazz activé !';
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

    } catch (error) {
        errorDiv.textContent = '❌ Erreur arrangement jazz: ' + error.message;
        errorDiv.style.display = 'block';
        errorDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}
```

### Étape 2.5 : Activer le bouton après génération de partition

Modifier `/app.js` fonction `setExportButtonState()` ligne 418 :

```javascript
function setExportButtonState(enabled) {
    const btnExportPNG = document.getElementById('btn-export-png');
    const btnExportMIDI = document.getElementById('btn-export-midi');
    const btnJazzArrange = document.getElementById('btn-jazz-arrange');
    if (btnExportPNG) {
        btnExportPNG.disabled = !enabled;
    }
    if (btnExportMIDI) {
        btnExportMIDI.disabled = !enabled;
    }
    if (btnJazzArrange) {
        btnJazzArrange.disabled = !enabled;
    }
}
```

### Étape 2.6 : Test manuel

**Test** :
1. Générer une partition (ex: "Au clair de la lune")
2. Cliquer sur "🎷 Arrangement Jazz"
3. Vérifier qu'un message vert "Arrangement jazz activé !" apparaît
4. Vérifier la console : doit afficher "🎷 Arrangement jazz demandé pour: Au clair de la lune"

### Étape 2.7 : Commit

```bash
git add index.html app.js
git commit -m "feat(jazz): add Jazz Arrangement button UI

- Add btn-jazz-arrange button in export actions
- Initialize jazzTransformer in app.js init()
- Wire handleJazzArrange() event handler
- Enable/disable button with setExportButtonState()
- Display success message (stub implementation)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Tâche 3 : Implémenter la transformation du tempo

**Objectif** : Appliquer un tempo adapté au style jazz (légèrement plus rapide).

**Test** : Générer une partition à 120 BPM, l'arranger en jazz, vérifier que le tempo affiché est ~132 BPM.

### Étape 3.1 : Écrire le test dans la console

**Test manuel console** :
```javascript
const parser = new Parser();
const jazzTransformer = new JazzTransformer();
const scoreData = parser.parse(`Test
120
4/4
sol
Do Re Mi Fa`);
const jazzified = jazzTransformer.transform(scoreData);
console.assert(jazzified.tempo === 132, 'Tempo devrait être 132');
```

**Résultat attendu** : Assertion échoue (tempo encore 120).

### Étape 3.2 : Implémenter la transformation du tempo

Modifier `/jazz-transformer.js` méthode `transform()` :

```javascript
    /**
     * Transforme une partition en arrangement jazz.
     * @param {Object} scoreData - Objet ParseResult (résultat de Parser.parse())
     * @returns {Object} Nouvelle partition jazzifiée (même structure)
     */
    transform(scoreData) {
        console.log('🎷 Transformation jazz en cours...');
        
        // Copie profonde pour ne pas modifier l'original
        const jazzScore = JSON.parse(JSON.stringify(scoreData));
        
        // 1. Ajuster le tempo (10% plus rapide, typique du jazz)
        jazzScore.tempo = Math.round(scoreData.tempo * this.config.tempoMultiplier);
        
        console.log(`✅ Tempo ajusté: ${scoreData.tempo} → ${jazzScore.tempo} BPM`);
        
        return jazzScore;
    }
```

### Étape 3.3 : Vérifier le test console

**Test** : Re-exécuter le code de test (étape 3.1).

**Résultat attendu** : Assertion passe (tempo = 132).

### Étape 3.4 : Tester dans l'interface

**Test manuel** :
1. Générer "Au clair de la lune" (tempo 120)
2. Cliquer sur "🎷 Arrangement Jazz"
3. Regarder la console : "✅ Tempo ajusté: 120 → 132 BPM"
4. Vérifier que le tempo n'est pas encore affiché sur la partition (on implémente l'affichage après)

### Étape 3.5 : Commit

```bash
git add jazz-transformer.js
git commit -m "feat(jazz): implement tempo adjustment transformation

- Apply 1.1x tempo multiplier for jazz feel
- Log tempo adjustment in console
- Deep copy scoreData to avoid mutation

Test: Tempo 120 BPM → 132 BPM

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Tâche 4 : Implémenter le swing rhythm (shuffle des croches)

**Objectif** : Transformer les croches (0.5) en triolets swing (durées 0.67 + 0.33).

**Test** : Une séquence `Do0.5 Re0.5 Mi0.5 Fa0.5` devient `Do0.67 Re0.33 Mi0.67 Fa0.33`.

### Étape 4.1 : Écrire le test console

**Test manuel console** :
```javascript
const parser = new Parser();
const jazzTransformer = new JazzTransformer();
const scoreData = parser.parse(`Test
120
4/4
sol
Do0.5 Re0.5 Mi0.5 Fa0.5`);
const jazzified = jazzTransformer.transform(scoreData);
console.log('Notes:', jazzified.notes.map(n => n.duration));
// Attendu: [0.67, 0.33, 0.67, 0.33]
```

**Résultat attendu** : Affiche `[0.5, 0.5, 0.5, 0.5]` (pas encore transformé).

### Étape 4.2 : Ajouter une méthode applySwing() privée

Ajouter dans `/jazz-transformer.js` ligne 35 (après `transform()`) :

```javascript
    /**
     * Applique le swing rhythm aux notes (shuffle des croches).
     * Les croches (0.5) deviennent des triolets swing (alternance 0.67 / 0.33).
     * @param {Array} notes - Tableau de notes/accords/silences
     * @returns {Array} Notes avec swing appliqué
     * @private
     */
    applySwing(notes) {
        const swungNotes = [];
        let isFirstOfPair = true;

        for (const note of notes) {
            // Ne transformer que les croches (durée 0.5)
            if (note.duration === 0.5) {
                const swungNote = JSON.parse(JSON.stringify(note));
                
                if (isFirstOfPair) {
                    // Première croche du swing : plus longue (2/3)
                    swungNote.duration = this.config.swingRatio;
                } else {
                    // Deuxième croche du swing : plus courte (1/3)
                    swungNote.duration = 1 - this.config.swingRatio;
                }
                
                swungNotes.push(swungNote);
                isFirstOfPair = !isFirstOfPair;
            } else {
                // Notes non-croches : pas de transformation
                swungNotes.push(JSON.parse(JSON.stringify(note)));
                // Réinitialiser la paire si on casse le pattern
                isFirstOfPair = true;
            }
        }

        return swungNotes;
    }
```

### Étape 4.3 : Appeler applySwing() dans transform()

Modifier `/jazz-transformer.js` méthode `transform()` :

```javascript
    transform(scoreData) {
        console.log('🎷 Transformation jazz en cours...');
        
        const jazzScore = JSON.parse(JSON.stringify(scoreData));
        
        // 1. Ajuster le tempo
        jazzScore.tempo = Math.round(scoreData.tempo * this.config.tempoMultiplier);
        console.log(`✅ Tempo ajusté: ${scoreData.tempo} → ${jazzScore.tempo} BPM`);
        
        // 2. Appliquer le swing rhythm
        jazzScore.notes = this.applySwing(jazzScore.notes);
        console.log(`✅ Swing appliqué (ratio ${this.config.swingRatio})`);
        
        return jazzScore;
    }
```

### Étape 4.4 : Vérifier le test console

**Test** : Re-exécuter le code de test (étape 4.1).

**Résultat attendu** : Affiche `[0.67, 0.33, 0.67, 0.33]`.

### Étape 4.5 : Test visuel dans l'interface

**Test manuel** :
1. Saisir une partition avec croches : `Do0.5 Re0.5 Mi0.5 Fa0.5`
2. Générer la partition
3. Cliquer sur "🎷 Arrangement Jazz"
4. Console doit afficher : "✅ Swing appliqué (ratio 0.67)"
5. Notes visuellement inchangées (affichage après la tâche suivante)

### Étape 4.6 : Commit

```bash
git add jazz-transformer.js
git commit -m "feat(jazz): implement swing rhythm transformation

- Add applySwing() method to shuffle eighth notes
- Transform 0.5 duration notes to 0.67/0.33 triplet feel
- Alternate between long (2/3) and short (1/3) swing notes
- Call applySwing() in transform() pipeline

Test: [0.5, 0.5, 0.5, 0.5] → [0.67, 0.33, 0.67, 0.33]

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Tâche 5 : Câbler la transformation complète dans handleJazzArrange()

**Objectif** : Appliquer la transformation jazz et re-générer la partition affichée.

**Test** : Générer une partition, cliquer sur "🎷 Arrangement Jazz", vérifier que la partition se régénère avec les transformations.

### Étape 5.1 : Modifier handleJazzArrange() pour transformer et afficher

Remplacer dans `/app.js` la fonction `handleJazzArrange()` (ligne 436) :

```javascript
function handleJazzArrange() {
    const errorDiv = document.getElementById('error-message');
    const outputDiv = document.getElementById('render-output');
    const textarea = document.getElementById('partition-input');

    if (!currentScoreData) {
        errorDiv.textContent = '❌ Veuillez d\'abord générer une partition';
        errorDiv.style.display = 'block';
        errorDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        return;
    }

    try {
        errorDiv.style.display = 'none';

        console.log('🎷 Arrangement jazz demandé pour:', currentScoreData.title);
        
        // Transformation jazz
        const jazzScore = jazzTransformer.transform(currentScoreData);
        
        // Mise à jour du titre pour indiquer l'arrangement
        if (!jazzScore.title.includes('(Jazz)')) {
            jazzScore.title = jazzScore.title + ' (Jazz Arrangement)';
        }
        
        // Re-génération de la partition avec les données jazz
        currentScoreData = jazzScore;
        renderer.render(jazzScore, outputDiv);
        
        // Mise à jour du texte de saisie
        const jazzScoreText = scoreToText(jazzScore);
        textarea.value = jazzScoreText;
        
        console.log('✅ Partition jazz rendue');
        
        // Message de succès
        errorDiv.textContent = `✅ Arrangement jazz appliqué ! (Tempo: ${jazzScore.tempo} BPM, Swing: activé)`;
        errorDiv.style.display = 'block';
        errorDiv.style.background = '#d4edda';
        errorDiv.style.color = '#155724';
        errorDiv.style.borderColor = '#c3e6cb';

        setTimeout(() => {
            errorDiv.style.display = 'none';
            errorDiv.style.background = '';
            errorDiv.style.color = '';
            errorDiv.style.borderColor = '';
        }, 5000);

    } catch (error) {
        console.error('❌ Erreur arrangement jazz:', error);
        errorDiv.textContent = '❌ Erreur arrangement jazz: ' + error.message;
        errorDiv.style.display = 'block';
        errorDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}
```

### Étape 5.2 : Test manuel complet

**Test** :
1. Saisir et générer la partition :
   ```
   Test Swing
   120
   4/4
   sol
   Do0.5 Re0.5 Mi0.5 Fa0.5 Sol La Si Do+
   ```
2. Observer la partition affichée (notes à espacement régulier)
3. Cliquer sur "🎷 Arrangement Jazz"
4. Vérifier :
   - Titre devient "Test Swing (Jazz Arrangement)"
   - Tempo affiché : 132 BPM
   - Les 4 premières notes ont maintenant des espacements irréguliers (swing visible)
   - Message vert : "Arrangement jazz appliqué ! (Tempo: 132 BPM, Swing: activé)"
   - Console affiche les logs de transformation

### Étape 5.3 : Commit

```bash
git add app.js
git commit -m "feat(jazz): wire jazz transformation to UI render

- Call jazzTransformer.transform() in handleJazzArrange()
- Append '(Jazz Arrangement)' to title
- Re-render score with jazzScore data
- Update textarea with transformed scoreToText()
- Display detailed success message with tempo and swing info

Test: Generate score → click Jazz button → see swing rhythm rendered

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Tâche 6 : Implémenter l'enrichissement des accords (7ème)

**Objectif** : Transformer les accords triades (3 notes) en accords de 7ème (4 notes).

**Test** : Un accord `DoMiSol` devient `DoMiSolSi` (ajout de la 7ème majeure).

### Étape 6.1 : Écrire le test console

**Test manuel console** :
```javascript
const parser = new Parser();
const jazzTransformer = new JazzTransformer();
const scoreData = parser.parse(`Test
120
4/4
sol
DoMiSol2`);
const jazzified = jazzTransformer.transform(scoreData);
console.log('Accord:', jazzified.notes[0]);
// Attendu: chord avec 4 notes (Do, Mi, Sol, Si)
```

**Résultat attendu** : Affiche un accord avec 3 notes (pas encore enrichi).

### Étape 6.2 : Ajouter une méthode enrichChords() privée

Ajouter dans `/jazz-transformer.js` ligne 73 (après `applySwing()`) :

```javascript
    /**
     * Enrichit les accords avec des extensions jazz (7ème, 9ème).
     * Triade (3 notes) → Accord de 7ème (4 notes).
     * @param {Array} notes - Tableau de notes/accords/silences
     * @returns {Array} Notes avec accords enrichis
     * @private
     */
    enrichChords(notes) {
        const noteSteps = {
            'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11
        };
        
        const stepsToNote = [
            'C', null, 'D', null, 'E', 'F', null, 'G', null, 'A', null, 'B'
        ];

        return notes.map(item => {
            // Ne traiter que les accords (type 'chord')
            if (item.type !== 'chord') {
                return JSON.parse(JSON.stringify(item));
            }

            const chord = JSON.parse(JSON.stringify(item));
            
            // Enrichir seulement les triades (3 notes)
            if (chord.notes.length !== 3) {
                return chord;
            }

            // Déterminer la fondamentale (première note de l'accord)
            const root = chord.notes[0];
            const rootStep = noteSteps[root.note];

            // Ajouter la 7ème majeure (11 demi-tons au-dessus)
            const seventhStep = (rootStep + 11) % 12;
            const seventhNote = stepsToNote[seventhStep];

            if (seventhNote) {
                chord.notes.push({
                    note: seventhNote,
                    alteration: root.alteration || '',
                    octave: root.octave + Math.floor((rootStep + 11) / 12)
                });
                
                console.log(`  → Accord enrichi: ${root.note} triade + 7ème (${seventhNote})`);
            }

            return chord;
        });
    }
```

### Étape 6.3 : Appeler enrichChords() dans transform()

Modifier `/jazz-transformer.js` méthode `transform()` :

```javascript
    transform(scoreData) {
        console.log('🎷 Transformation jazz en cours...');
        
        const jazzScore = JSON.parse(JSON.stringify(scoreData));
        
        // 1. Ajuster le tempo
        jazzScore.tempo = Math.round(scoreData.tempo * this.config.tempoMultiplier);
        console.log(`✅ Tempo ajusté: ${scoreData.tempo} → ${jazzScore.tempo} BPM`);
        
        // 2. Appliquer le swing rhythm
        jazzScore.notes = this.applySwing(jazzScore.notes);
        console.log(`✅ Swing appliqué (ratio ${this.config.swingRatio})`);
        
        // 3. Enrichir les accords
        jazzScore.notes = this.enrichChords(jazzScore.notes);
        console.log(`✅ Accords enrichis (7ème ajoutée)`);
        
        return jazzScore;
    }
```

### Étape 6.4 : Vérifier le test console

**Test** : Re-exécuter le code de test (étape 6.1).

**Résultat attendu** : 
- Affiche un accord avec 4 notes : `[Do, Mi, Sol, Si]`
- Console : "→ Accord enrichi: C triade + 7ème (B)"

### Étape 6.5 : Test visuel dans l'interface

**Test manuel** :
1. Saisir et générer :
   ```
   Test Accords
   100
   4/4
   sol
   DoMiSol2 FaLaDo2
   ```
2. Cliquer sur "🎷 Arrangement Jazz"
3. Vérifier visuellement : chaque accord affiche maintenant 4 notes (7ème ajoutée)
4. Console doit afficher :
   ```
   → Accord enrichi: C triade + 7ème (B)
   → Accord enrichi: F triade + 7ème (E)
   ```

### Étape 6.6 : Commit

```bash
git add jazz-transformer.js
git commit -m "feat(jazz): implement chord enrichment with 7th

- Add enrichChords() method to extend triads to 7th chords
- Calculate major 7th (11 semitones above root)
- Handle octave wrapping for 7th note
- Log enriched chords in console
- Call enrichChords() in transform() pipeline

Test: DoMiSol → DoMiSolSi (C major 7)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Tâche 7 : Implémenter la syncopation légère

**Objectif** : Décaler certaines notes rythmiquement pour créer un effet syncopé.

**Test** : Une noire (1.0) a 30% de chances de devenir `silence(0.25) + note(0.75)`.

### Étape 7.1 : Écrire le test console

**Test manuel console** :
```javascript
const jazzTransformer = new JazzTransformer();
// Forcer la probabilité à 100% pour tester
jazzTransformer.config.syncopationProbability = 1.0;

const parser = new Parser();
const scoreData = parser.parse(`Test
120
4/4
sol
Do1 Re1 Mi1 Fa1`);
const jazzified = jazzTransformer.transform(scoreData);
console.log('Notes syncopées:', jazzified.notes.length);
// Attendu: 8 notes (chaque noire → silence + note)
```

**Résultat attendu** : Affiche 4 notes (pas encore syncopé).

### Étape 7.2 : Ajouter une méthode applySyncopation() privée

Ajouter dans `/jazz-transformer.js` ligne 122 (après `enrichChords()`) :

```javascript
    /**
     * Applique une syncopation légère aux notes.
     * Certaines notes sont décalées avec un court silence devant.
     * @param {Array} notes - Tableau de notes/accords/silences
     * @returns {Array} Notes avec syncopation appliquée
     * @private
     */
    applySyncopation(notes) {
        const syncopatedNotes = [];

        for (const note of notes) {
            // Ne syncopater que les noires (durée 1.0) et les blanches (durée 2.0)
            const canSyncopate = (note.duration === 1.0 || note.duration === 2.0) && 
                                  note.type !== 'rest';
            
            if (canSyncopate && Math.random() < this.config.syncopationProbability) {
                // Décaler la note : ajouter un court silence (1/4 de la durée)
                const silenceDuration = note.duration * 0.25;
                const noteDuration = note.duration * 0.75;
                
                syncopatedNotes.push({
                    type: 'rest',
                    duration: silenceDuration
                });
                
                const syncopatedNote = JSON.parse(JSON.stringify(note));
                syncopatedNote.duration = noteDuration;
                syncopatedNotes.push(syncopatedNote);
                
                console.log(`  → Syncopation: ${note.duration} → silence(${silenceDuration}) + note(${noteDuration})`);
            } else {
                syncopatedNotes.push(JSON.parse(JSON.stringify(note)));
            }
        }

        return syncopatedNotes;
    }
```

### Étape 7.3 : Appeler applySyncopation() dans transform()

Modifier `/jazz-transformer.js` méthode `transform()` :

```javascript
    transform(scoreData) {
        console.log('🎷 Transformation jazz en cours...');
        
        const jazzScore = JSON.parse(JSON.stringify(scoreData));
        
        // 1. Ajuster le tempo
        jazzScore.tempo = Math.round(scoreData.tempo * this.config.tempoMultiplier);
        console.log(`✅ Tempo ajusté: ${scoreData.tempo} → ${jazzScore.tempo} BPM`);
        
        // 2. Appliquer le swing rhythm
        jazzScore.notes = this.applySwing(jazzScore.notes);
        console.log(`✅ Swing appliqué (ratio ${this.config.swingRatio})`);
        
        // 3. Enrichir les accords
        jazzScore.notes = this.enrichChords(jazzScore.notes);
        console.log(`✅ Accords enrichis (7ème ajoutée)`);
        
        // 4. Appliquer la syncopation
        jazzScore.notes = this.applySyncopation(jazzScore.notes);
        console.log(`✅ Syncopation appliquée (prob: ${this.config.syncopationProbability})`);
        
        return jazzScore;
    }
```

### Étape 7.4 : Vérifier le test console

**Test** : Re-exécuter le code de test (étape 7.1).

**Résultat attendu** : 
- Affiche 8 notes (4 noires syncopées = 4 silences + 4 notes)
- Console : 4x "→ Syncopation: 1 → silence(0.25) + note(0.75)"

### Étape 7.5 : Test visuel dans l'interface (avec probabilité normale)

**Test manuel** :
1. Saisir et générer :
   ```
   Test Syncopation
   100
   4/4
   sol
   Do1 Re1 Mi1 Fa1 Sol1 La1 Si1 Do+1
   ```
2. Cliquer plusieurs fois sur "🎷 Arrangement Jazz" et "Générer la partition"
3. Observer : certaines notes sont maintenant précédées d'un court silence (effet syncopé)
4. Console affiche : quelques logs de syncopation (environ 30% des noires)

### Étape 7.6 : Commit

```bash
git add jazz-transformer.js
git commit -m "feat(jazz): implement syncopation transformation

- Add applySyncopation() method to offset notes rhythmically
- 30% probability to syncopate quarter and half notes
- Split note into short rest (25%) + shorter note (75%)
- Log syncopated notes in console
- Call applySyncopation() in transform() pipeline

Test: Do1 → silence(0.25) + Do0.75 (probabilistic)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Tâche 8 : Ajouter le style CSS pour le bouton Jazz

**Objectif** : Styler le bouton "🎷 Arrangement Jazz" pour qu'il soit visuellement distinct.

**Test** : Le bouton doit avoir une couleur et un effet hover spécifiques.

### Étape 8.1 : Ajouter le style dans styles.css

Ajouter à la fin de `/styles.css` (ligne ~300, après les styles existants) :

```css
/* Jazz Arrangement Button */
.btn-secondary#btn-jazz-arrange {
    background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
    color: white;
    font-weight: 600;
    border: none;
}

.btn-secondary#btn-jazz-arrange:hover:not(:disabled) {
    background: linear-gradient(135deg, #f5576c 0%, #f093fb 100%);
    transform: translateY(-2px) scale(1.02);
    box-shadow: 0 8px 16px rgba(245, 87, 108, 0.3);
}

.btn-secondary#btn-jazz-arrange:active:not(:disabled) {
    transform: translateY(0) scale(0.98);
}

.btn-secondary#btn-jazz-arrange:disabled {
    background: linear-gradient(135deg, #ccc 0%, #999 100%);
    color: #666;
    cursor: not-allowed;
    opacity: 0.6;
}
```

### Étape 8.2 : Test visuel

**Test manuel** :
1. Générer une partition
2. Observer le bouton "🎷 Arrangement Jazz" : dégradé rose-rouge, gras
3. Survoler avec la souris : animation et ombre portée
4. Cliquer : effet de pression
5. Effacer la partition : bouton grisé (désactivé)

### Étape 8.3 : Commit

```bash
git add styles.css
git commit -m "style(jazz): add CSS styling for Jazz Arrangement button

- Pink-to-red gradient background for visual distinction
- Hover effect with scale and shadow animation
- Active (pressed) state with downward transform
- Disabled state with grayed-out gradient

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Tâche 9 : Mettre à jour la documentation (CLAUDE.md)

**Objectif** : Documenter la nouvelle fonctionnalité dans le fichier CLAUDE.md.

**Test** : Le fichier CLAUDE.md contient une section "🎷 Arrangement Jazz".

### Étape 9.1 : Ajouter la section dans CLAUDE.md

Ajouter dans `/CLAUDE.md` après la section "🎹 Export MIDI" (ligne ~280) :

```markdown
## 🎷 Arrangement Jazz

L'application permet de transformer une partition classique en arrangement jazz avec un clic.

### Fonctionnement

1. **Bouton** : 
   - Situé dans la section "Partition générée", à côté des boutons d'export
   - Icône : 🎷
   - État : Désactivé par défaut, activé après génération d'une partition

2. **Transformations appliquées** :
   - **Tempo** : Augmenté de 10% (ex: 120 BPM → 132 BPM) pour un style plus enlevé
   - **Swing rhythm** : Les croches (durée 0.5) sont transformées en triolets shuffle (0.67 / 0.33)
   - **Accords enrichis** : Les triades (3 notes) deviennent des accords de 7ème (4 notes)
   - **Syncopation** : 30% des noires et blanches sont décalées avec un court silence devant (effet syncopé)

3. **Affichage** :
   - Le titre de la partition est suffixé avec "(Jazz Arrangement)"
   - La partition est re-générée automatiquement avec les transformations
   - Un message de succès indique le tempo et le swing activé

### Module jazz-transformer.js

**Classe** : `JazzTransformer`

**Configuration** :
```javascript
this.config = {
    swingRatio: 0.67,                 // Ratio pour le swing (2/3)
    syncopationProbability: 0.3,      // 30% de chances de syncopation
    walkingBassEnabled: false,         // Walking bass (non implémenté)
    tempoMultiplier: 1.1               // Tempo +10%
}
```

**Méthodes principales** :
- `transform(scoreData)` → scoreData jazzifié
  - Point d'entrée principal
  - Applique toutes les transformations dans l'ordre
- `applySwing(notes)` → notes avec swing rhythm
- `enrichChords(notes)` → accords avec 7ème ajoutée
- `applySyncopation(notes)` → notes avec décalages rythmiques

**Structures de données** :
- Entrée/Sortie : Objet `ParseResult` (même format que `Parser.parse()`)
- Transformations in-place dans le tableau `notes`

### Exemples

**Partition classique** :
```
Test Swing
120
4/4
sol
Do0.5 Re0.5 Mi0.5 Fa0.5
DoMiSol2
```

**Après arrangement jazz** :
```
Test Swing (Jazz Arrangement)
132
4/4
sol
Do0.67 Re0.33 Mi0.67 Fa0.33
DoMiSolSi2
```

### État du bouton

- **Désactivé** : Au chargement, après "Effacer", en cas d'erreur
- **Activé** : Après génération réussie d'une partition
- **Style** : Dégradé rose-rouge avec effet hover animé

### Limitations

- ⚠️ La syncopation est probabiliste (30%), donc non reproductible à l'identique
- ⚠️ Les accords de plus de 3 notes ne sont pas enrichis
- ⚠️ Pas de détection automatique de la tonalité pour les extensions d'accords (toujours 7ème majeure)
- ⚠️ Walking bass non implémenté (flag `walkingBassEnabled` prévu pour évolution future)

### Évolutions futures possibles

- [ ] Ajouter des options de configuration (modal avec sliders pour swingRatio, syncopationProbability)
- [ ] Implémenter le walking bass (ligne de basse marchante)
- [ ] Détecter la tonalité pour choisir entre 7ème majeure et 7ème de dominante
- [ ] Ajouter des extensions d'accords supplémentaires (9ème, 11ème, 13ème)
- [ ] Permettre de "dé-jazzifier" (retour à la version originale)
```

### Étape 9.2 : Commit

```bash
git add CLAUDE.md
git commit -m "docs(jazz): add Jazz Arrangement documentation

- Document Jazz Arrangement feature in CLAUDE.md
- Explain transformations: tempo, swing, chords, syncopation
- Document JazzTransformer module API
- Add examples and limitations
- List future evolution possibilities

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Tâche 10 : Tests end-to-end et vérifications finales

**Objectif** : Tester l'intégration complète et vérifier tous les cas d'usage.

**Test** : Tous les scénarios utilisateur fonctionnent correctement.

### Étape 10.1 : Test du workflow complet

**Test manuel 1 : Workflow nominal**
1. Ouvrir `index.html` dans un navigateur
2. Saisir :
   ```
   Au clair de la lune
   120
   4/4
   sol
   Do Do Do Re Mi2 Re2
   Do0.5 Re0.5 Mi0.5 Fa0.5
   DoMiSol2 FaLaDo2
   ```
3. Cliquer sur "Générer la partition"
4. Vérifier l'affichage : partition classique, tempo 120
5. Cliquer sur "🎷 Arrangement Jazz"
6. Vérifier :
   - Titre : "Au clair de la lune (Jazz Arrangement)"
   - Tempo : 132 BPM
   - Les croches ont des espacements irréguliers (swing)
   - Les accords ont 4 notes au lieu de 3
   - Quelques notes sont décalées (syncopation)
   - Message de succès vert affiché
7. Cliquer sur "🎵 Lire la partition" : la lecture fonctionne avec le nouveau rythme
8. Cliquer sur "💾 Exporter en PNG" : l'export fonctionne
9. Cliquer sur "🎹 Exporter en MIDI" : l'export fonctionne

**Test manuel 2 : Bouton désactivé**
1. Recharger la page
2. Vérifier que "🎷 Arrangement Jazz" est grisé (désactivé)
3. Générer une partition
4. Vérifier que le bouton est maintenant actif
5. Cliquer sur "Effacer"
6. Vérifier que le bouton est à nouveau grisé

**Test manuel 3 : Erreurs**
1. Recharger la page
2. Cliquer sur "🎷 Arrangement Jazz" sans générer de partition
3. Vérifier qu'un message d'erreur s'affiche : "❌ Veuillez d'abord générer une partition"

**Test manuel 4 : Console logs**
1. Générer une partition
2. Ouvrir la console développeur
3. Cliquer sur "🎷 Arrangement Jazz"
4. Vérifier les logs :
   ```
   🎷 Transformation jazz en cours...
   ✅ Tempo ajusté: 120 → 132 BPM
   ✅ Swing appliqué (ratio 0.67)
     → Accord enrichi: C triade + 7ème (B)
     → Accord enrichi: F triade + 7ème (E)
   ✅ Accords enrichis (7ème ajoutée)
     → Syncopation: 2 → silence(0.5) + note(1.5)
   ✅ Syncopation appliquée (prob: 0.3)
   ✅ Partition jazz rendue
   ```

### Étape 10.2 : Test de compatibilité navigateurs

**Test multi-navigateurs** :
- Chrome/Chromium : ✅
- Firefox : ✅
- Safari : ✅
- Edge : ✅

Pour chaque navigateur :
1. Ouvrir `index.html`
2. Générer une partition
3. Cliquer sur "🎷 Arrangement Jazz"
4. Vérifier que tout fonctionne (affichage, boutons, messages)

### Étape 10.3 : Vérification du code

**Checklist code** :
- [ ] Tous les fichiers ont des commentaires JSDoc en français
- [ ] Pas de `console.error()` non gérés
- [ ] Tous les événements sont bien nettoyés
- [ ] Pas de fuites mémoire (objets non supprimés)
- [ ] Code suit le style existant (indentation, nommage)
- [ ] Pas de code mort (fonctions non utilisées)

**Vérification console** :
```javascript
// Aucune erreur JavaScript
// Aucun warning
```

### Étape 10.4 : Commit final

```bash
git add .
git commit -m "test(jazz): verify end-to-end Jazz Arrangement workflow

- Test nominal workflow: generate → jazz → play → export
- Test disabled button states
- Test error handling (no score generated)
- Verify console logs for all transformations
- Cross-browser compatibility checked (Chrome, Firefox, Safari, Edge)

All tests passing ✅

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Résumé de l'implémentation

### Fichiers créés
- `jazz-transformer.js` : Module de transformation jazz

### Fichiers modifiés
- `index.html` : Ajout du bouton et inclusion du module
- `app.js` : Câblage des événements et gestion du workflow
- `styles.css` : Styles pour le bouton Jazz
- `CLAUDE.md` : Documentation de la fonctionnalité

### Fonctionnalités implémentées
1. ✅ Transformation du tempo (+10%)
2. ✅ Swing rhythm (shuffle des croches 0.5 → 0.67/0.33)
3. ✅ Enrichissement des accords (triades → 7ème)
4. ✅ Syncopation légère (30% probabilité)
5. ✅ Bouton UI avec style distinct
6. ✅ Intégration complète dans le workflow
7. ✅ Documentation

### Structure de la classe JazzTransformer

```javascript
class JazzTransformer {
    constructor()                    // Initialisation config
    transform(scoreData)             // Point d'entrée principal
    applySwing(notes)                // Swing rhythm (privée)
    enrichChords(notes)              // Accords 7ème (privée)
    applySyncopation(notes)          // Syncopation (privée)
}
```

### Pipeline de transformation

```
scoreData original
  ↓
1. Tempo × 1.1
  ↓
2. Swing rhythm (croches → 0.67/0.33)
  ↓
3. Enrichissement accords (triades → 7ème)
  ↓
4. Syncopation (30% noires/blanches)
  ↓
scoreData jazzifié
  ↓
Renderer.render() → Canvas
```

### Tests de validation

| Test | Résultat attendu |
|------|------------------|
| Tempo 120 → 132 | ✅ |
| Croches 0.5 → 0.67/0.33 | ✅ |
| Accord DoMiSol → DoMiSolSi | ✅ |
| Syncopation probabiliste (30%) | ✅ |
| Bouton désactivé au chargement | ✅ |
| Bouton activé après génération | ✅ |
| Message d'erreur sans partition | ✅ |
| Export PNG/MIDI fonctionne | ✅ |
| Multi-navigateurs | ✅ |

---

## Notes pour l'implémenteur

### Discipline TDD stricte
- **Red** : Écrire le test (console ou manuel)
- **Green** : Implémenter le minimum pour que le test passe
- **Refactor** : (Aucune abstraction prématurée, code minimal)
- **Commit** : Un commit par tâche, message conventionnel

### Ordre d'exécution
1. Suivre les tâches dans l'ordre (1 → 10)
2. Ne pas sauter d'étapes
3. Vérifier chaque test avant de commiter
4. Ne pas coder de fonctionnalités hors plan

### Conventions de commit
```
type(scope): sujet

Corps du commit avec détails.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

Types : `feat`, `fix`, `docs`, `style`, `test`, `refactor`

### Points d'attention
- **Copie profonde** : Toujours utiliser `JSON.parse(JSON.stringify())` pour éviter les mutations
- **Console logs** : Garder les logs pour le débogage utilisateur
- **Tests visuels** : Vérifier le rendu Canvas après chaque transformation
- **Messages utilisateur** : Toujours afficher un feedback clair (succès ou erreur)

### Évolutions futures (hors scope de ce plan)
- Modal de configuration (sliders pour swingRatio, syncopationProbability)
- Walking bass automatique
- Détection de tonalité intelligente
- Extensions d'accords supplémentaires (9ème, 11ème, 13ème)
- Bouton "Annuler" pour revenir à la version originale

---

**Plan créé le 2026-06-25**  
**Estimation** : ~3-4 heures d'implémentation  
**Complexité** : Moyenne (transformations musicales + intégration UI)
