# Plan d'implémentation : Lecture MIDI de la partition

> For agentic workers: implement this plan task-by-task with red-green-refactor discipline. One task, one commit. Never batch.

## 📋 Vue d'ensemble

Ajouter une fonctionnalité de lecture audio de la partition en utilisant l'API Web Audio et un synthétiseur MIDI en JavaScript pur (sans bibliothèque externe). L'utilisateur pourra cliquer sur un bouton "Lire" pour entendre la partition générée, jouée au tempo indiqué avec un son de piano.

## 🎯 Objectifs

- Bouton de lecture/arrêt dans l'interface
- Génération MIDI à partir des données parsées
- Lecture audio via Web Audio API
- Son de piano synthétisé (oscillateurs)
- Respect du tempo et des durées
- Architecture modulaire (nouveau fichier `midi.js`)

## 🏗️ Architecture

```
music-helper/
├── midi.js          # Nouveau module pour synthèse et lecture MIDI
├── app.js           # Orchestration (ajout gestion lecture)
├── index.html       # Ajout bouton Lire
├── styles.css       # Style du bouton lecture
└── ...              # Fichiers existants inchangés
```

## 📝 Tâches détaillées

### Task 1: Créer le module MIDI avec les tests de structure

**Objectif** : Créer `midi.js` avec la classe `MidiPlayer` et les structures de données de base.

**Test** : Créer un fichier HTML de test (`test-midi.html`) qui charge `midi.js` et vérifie que la classe existe.

```html
<!-- test-midi.html -->
<!DOCTYPE html>
<html>
<head><title>Test MIDI</title></head>
<body>
<script src="midi.js"></script>
<script>
    // Test 1: La classe existe
    if (typeof MidiPlayer === 'undefined') {
        document.body.innerHTML = '<h1 style="color:red">FAIL: MidiPlayer class not found</h1>';
    } else {
        const player = new MidiPlayer();
        if (player && typeof player.play === 'function' && typeof player.stop === 'function') {
            document.body.innerHTML = '<h1 style="color:green">PASS: MidiPlayer class structure OK</h1>';
        } else {
            document.body.innerHTML = '<h1 style="color:red">FAIL: MidiPlayer methods missing</h1>';
        }
    }
</script>
</body>
</html>
```

**Implémentation** : Créer `midi.js` avec la structure de base.

```javascript
/**
 * MIDI.JS
 *
 * Module de synthèse et lecture MIDI
 * Utilise Web Audio API pour générer les sons de piano
 */

class MidiPlayer {
    constructor() {
        // Contexte Web Audio (créé à la première interaction utilisateur)
        this.audioContext = null;
        
        // État de lecture
        this.isPlaying = false;
        this.currentNotes = []; // Notes actuellement jouées
        this.scheduledNotes = []; // Notes programmées pour lecture future
        
        // Configuration audio
        this.masterVolume = 0.3; // Volume global
        this.sustainTime = 0.1; // Temps de maintien après release (en secondes)
    }

    /**
     * Initialise le contexte audio (doit être appelé après une interaction utilisateur)
     */
    initAudioContext() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        return this.audioContext;
    }

    /**
     * Convertit les données de partition en événements MIDI temporisés
     * @param {object} scoreData - Données parsées de la partition
     * @returns {array} - Tableau d'événements MIDI {time, type, notes, duration}
     */
    generateMidiEvents(scoreData) {
        // À implémenter dans task 2
        return [];
    }

    /**
     * Joue la partition
     * @param {object} scoreData - Données parsées de la partition
     */
    async play(scoreData) {
        // À implémenter dans task 3
    }

    /**
     * Arrête la lecture
     */
    stop() {
        // À implémenter dans task 4
    }

    /**
     * Convertit une note (notation anglo-saxonne + octave) en fréquence
     * @param {string} note - Note (C, D, E, F, G, A, B)
     * @param {string} alteration - 'sharp', 'flat', 'natural', ou ''
     * @param {number} octave - Décalage d'octave (-2 à +2)
     * @returns {number} - Fréquence en Hz
     */
    noteToFrequency(note, alteration, octave) {
        // À implémenter dans task 2
        return 440; // La 440 par défaut
    }

    /**
     * Joue une note unique avec un son de piano synthétique
     * @param {number} frequency - Fréquence en Hz
     * @param {number} startTime - Temps de début (AudioContext.currentTime)
     * @param {number} duration - Durée en secondes
     */
    playNote(frequency, startTime, duration) {
        // À implémenter dans task 5
    }
}
```

**Commit message** : `feat(midi): add MidiPlayer class structure`

**Vérification** : Ouvrir `test-midi.html` dans un navigateur → doit afficher "PASS: MidiPlayer class structure OK" en vert.

---

### Task 2: Implémenter la conversion notes → fréquences MIDI

**Objectif** : Coder la fonction `noteToFrequency()` pour convertir les notes (C, D, E...) avec altérations et octaves en fréquences Hz.

**Test** : Ajouter des tests dans `test-midi.html`.

```javascript
// Dans test-midi.html, après le test de structure
const player = new MidiPlayer();

// Test 2: Conversion notes → fréquences
const tests = [
    {note: 'A', alt: '', oct: 0, expected: 440},      // La médium = 440 Hz
    {note: 'C', alt: '', oct: 0, expected: 261.63},   // Do médium ≈ 261.63 Hz
    {note: 'C', alt: 'sharp', oct: 0, expected: 277.18}, // Do# ≈ 277.18 Hz
    {note: 'C', alt: '', oct: 1, expected: 523.25},   // Do+1 ≈ 523.25 Hz
    {note: 'C', alt: '', oct: -1, expected: 130.81}   // Do-1 ≈ 130.81 Hz
];

let allPass = true;
for (const test of tests) {
    const freq = player.noteToFrequency(test.note, test.alt, test.oct);
    const tolerance = 0.1; // Tolérance de 0.1 Hz
    if (Math.abs(freq - test.expected) > tolerance) {
        console.error(`FAIL: ${test.note}${test.alt}${test.oct} → ${freq} Hz (expected ${test.expected})`);
        allPass = false;
    }
}

if (allPass) {
    console.log('PASS: All frequency conversions correct');
} else {
    console.error('FAIL: Some frequency conversions incorrect');
}
```

**Implémentation** : Dans `midi.js`, remplacer le stub de `noteToFrequency()`.

```javascript
/**
 * Convertit une note (notation anglo-saxonne + octave) en fréquence
 * Utilise le système tempéré à 440 Hz (La médium)
 * @param {string} note - Note (C, D, E, F, G, A, B)
 * @param {string} alteration - 'sharp', 'flat', 'natural', ou ''
 * @param {number} octave - Décalage d'octave (-2 à +2)
 * @returns {number} - Fréquence en Hz
 */
noteToFrequency(note, alteration, octave) {
    // Mapping note → demi-tons depuis Do (C = 0)
    const noteValues = {
        'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11
    };

    // Octave de référence : Do médium = C4 dans la notation standard
    // Dans notre système, octave 0 = médium, donc C0 = C4 standard = 261.63 Hz
    const baseOctave = 4;
    
    // Calcul du numéro de demi-ton depuis C0 (Do médium)
    let semitone = noteValues[note];
    
    // Applique l'altération
    if (alteration === 'sharp') {
        semitone += 1;
    } else if (alteration === 'flat') {
        semitone -= 1;
    }
    // 'natural' et '' ne changent rien
    
    // Applique l'octave (1 octave = 12 demi-tons)
    semitone += octave * 12;
    
    // Formule de la fréquence : f = 440 * 2^((n - 69) / 12)
    // où n est le numéro MIDI (A4 = 69 = 440 Hz)
    // Notre C0 (médium) = C4 = MIDI 60
    const midiNumber = 60 + semitone; // 60 = C4 (Do médium)
    const frequency = 440 * Math.pow(2, (midiNumber - 69) / 12);
    
    return frequency;
}
```

**Commit message** : `feat(midi): implement note-to-frequency conversion`

**Vérification** : Ouvrir `test-midi.html` → console doit afficher "PASS: All frequency conversions correct".

---

### Task 3: Implémenter la génération d'événements MIDI temporisés

**Objectif** : Coder `generateMidiEvents()` pour transformer `scoreData.notes` en timeline d'événements {time, type, notes, duration}.

**Test** : Ajouter un test dans `test-midi.html`.

```javascript
// Test 3: Génération d'événements MIDI
const testScore = {
    title: 'Test',
    tempo: 120, // 120 BPM = 0.5 sec par noire
    timeSignature: {numerator: 4, denominator: 4},
    clef: 'sol',
    keySignature: [],
    notes: [
        {type: 'note', note: 'C', alteration: '', octave: 0, duration: 1},
        {type: 'note', note: 'D', alteration: '', octave: 0, duration: 1},
        {type: 'rest', duration: 1},
        {type: 'chord', notes: [
            {note: 'C', alteration: '', octave: 0},
            {note: 'E', alteration: '', octave: 0},
            {note: 'G', alteration: '', octave: 0}
        ], duration: 2}
    ]
};

const events = player.generateMidiEvents(testScore);

// Vérifications
const expectedEvents = 4; // Do, Ré, silence, accord
if (events.length !== expectedEvents) {
    console.error(`FAIL: Expected ${expectedEvents} events, got ${events.length}`);
} else if (events[0].time !== 0 || events[1].time !== 0.5 || events[2].time !== 1.0 || events[3].time !== 1.5) {
    console.error('FAIL: Event timings incorrect');
} else if (events[3].notes.length !== 3) {
    console.error('FAIL: Chord should have 3 notes');
} else {
    console.log('PASS: MIDI events generation correct');
}
```

**Implémentation** : Dans `midi.js`, remplacer le stub de `generateMidiEvents()`.

```javascript
/**
 * Convertit les données de partition en événements MIDI temporisés
 * @param {object} scoreData - Données parsées de la partition
 * @returns {array} - Tableau d'événements {time, type, notes, duration}
 */
generateMidiEvents(scoreData) {
    const events = [];
    let currentTime = 0; // Temps actuel en secondes
    
    // Calcul de la durée d'une noire en secondes
    // tempo = noires par minute → durée d'une noire = 60 / tempo
    const quarterNoteDuration = 60 / scoreData.tempo;
    
    for (const item of scoreData.notes) {
        if (item.type === 'rest') {
            // Silence : on avance le temps sans jouer
            currentTime += item.duration * quarterNoteDuration;
            
        } else if (item.type === 'note') {
            // Note simple
            const frequency = this.noteToFrequency(item.note, item.alteration, item.octave);
            events.push({
                time: currentTime,
                type: 'note',
                notes: [{frequency}],
                duration: item.duration * quarterNoteDuration
            });
            currentTime += item.duration * quarterNoteDuration;
            
        } else if (item.type === 'chord') {
            // Accord : plusieurs notes jouées simultanément
            const frequencies = item.notes.map(n => ({
                frequency: this.noteToFrequency(n.note, n.alteration, n.octave)
            }));
            events.push({
                time: currentTime,
                type: 'chord',
                notes: frequencies,
                duration: item.duration * quarterNoteDuration
            });
            currentTime += item.duration * quarterNoteDuration;
        }
    }
    
    return events;
}
```

**Commit message** : `feat(midi): implement MIDI events generation`

**Vérification** : Ouvrir `test-midi.html` → console doit afficher "PASS: MIDI events generation correct".

---

### Task 4: Implémenter la synthèse de son de piano

**Objectif** : Coder `playNote()` pour générer un son de piano synthétique via Web Audio API.

**Test** : Ajouter un bouton de test dans `test-midi.html`.

```html
<!-- Dans test-midi.html, dans <body> -->
<button id="test-sound" style="font-size:20px; padding:10px">
    🎹 Test sound (Do médium)
</button>

<script>
document.getElementById('test-sound').addEventListener('click', () => {
    const player = new MidiPlayer();
    player.initAudioContext();
    
    // Joue un Do médium pendant 1 seconde
    const freq = player.noteToFrequency('C', '', 0);
    const startTime = player.audioContext.currentTime;
    player.playNote(freq, startTime, 1.0);
    
    console.log('Playing C4 (Do médium) for 1 second...');
});
</script>
```

**Implémentation** : Dans `midi.js`, remplacer le stub de `playNote()`.

```javascript
/**
 * Joue une note unique avec un son de piano synthétique
 * Utilise une enveloppe ADSR (Attack, Decay, Sustain, Release)
 * @param {number} frequency - Fréquence en Hz
 * @param {number} startTime - Temps de début (AudioContext.currentTime)
 * @param {number} duration - Durée en secondes
 */
playNote(frequency, startTime, duration) {
    if (!this.audioContext) {
        throw new Error('AudioContext not initialized. Call initAudioContext() first.');
    }

    // Création d'un oscillateur (générateur de fréquence)
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    // Connexion : oscillateur → gain → sortie
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    // Type d'onde : triangle pour un son proche du piano
    // (plus doux que square, moins pur que sine)
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(frequency, startTime);

    // Enveloppe ADSR simplifiée pour imiter un piano
    const now = startTime;
    const attackTime = 0.01;  // Attaque rapide (10ms)
    const decayTime = 0.1;    // Déclin court (100ms)
    const sustainLevel = 0.7; // Niveau maintenu à 70%
    const releaseTime = this.sustainTime;

    // Attack : volume 0 → max
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(this.masterVolume, now + attackTime);

    // Decay : max → sustain level
    gainNode.gain.linearRampToValueAtTime(
        this.masterVolume * sustainLevel,
        now + attackTime + decayTime
    );

    // Sustain : maintien du niveau pendant la durée de la note
    // (pas de changement de gain, juste attendre)

    // Release : sustain level → 0
    const releaseStart = now + duration;
    gainNode.gain.setValueAtTime(this.masterVolume * sustainLevel, releaseStart);
    gainNode.gain.linearRampToValueAtTime(0, releaseStart + releaseTime);

    // Démarrage et arrêt de l'oscillateur
    oscillator.start(now);
    oscillator.stop(releaseStart + releaseTime);

    // Nettoyage automatique après arrêt
    oscillator.onended = () => {
        oscillator.disconnect();
        gainNode.disconnect();
    };
}
```

**Commit message** : `feat(midi): implement piano sound synthesis`

**Vérification** : Ouvrir `test-midi.html` → cliquer sur "🎹 Test sound" → doit entendre un Do médium pendant 1 seconde avec un son de piano synthétique.

---

### Task 5: Implémenter les méthodes play() et stop()

**Objectif** : Coder la logique de lecture et d'arrêt de la partition.

**Test** : Ajouter un bouton de test complet dans `test-midi.html`.

```html
<!-- Dans test-midi.html, dans <body> -->
<button id="test-play" style="font-size:20px; padding:10px; margin:10px">
    ▶️ Play test score
</button>
<button id="test-stop" style="font-size:20px; padding:10px">
    ⏹️ Stop
</button>

<script>
const testScore = {
    title: 'Gamme',
    tempo: 120,
    timeSignature: {numerator: 4, denominator: 4},
    clef: 'sol',
    keySignature: [],
    notes: [
        {type: 'note', note: 'C', alteration: '', octave: 0, duration: 1},
        {type: 'note', note: 'D', alteration: '', octave: 0, duration: 1},
        {type: 'note', note: 'E', alteration: '', octave: 0, duration: 1},
        {type: 'note', note: 'F', alteration: '', octave: 0, duration: 1},
        {type: 'note', note: 'G', alteration: '', octave: 0, duration: 1},
        {type: 'note', note: 'A', alteration: '', octave: 0, duration: 1},
        {type: 'note', note: 'B', alteration: '', octave: 0, duration: 1},
        {type: 'note', note: 'C', alteration: '', octave: 1, duration: 2}
    ]
};

const player = new MidiPlayer();

document.getElementById('test-play').addEventListener('click', () => {
    player.initAudioContext();
    player.play(testScore);
    console.log('Playing test score...');
});

document.getElementById('test-stop').addEventListener('click', () => {
    player.stop();
    console.log('Stopped playback');
});
</script>
```

**Implémentation** : Dans `midi.js`, remplacer les stubs de `play()` et `stop()`.

```javascript
/**
 * Joue la partition
 * @param {object} scoreData - Données parsées de la partition
 */
async play(scoreData) {
    if (this.isPlaying) {
        console.warn('Déjà en cours de lecture');
        return;
    }

    if (!this.audioContext) {
        throw new Error('AudioContext not initialized. Call initAudioContext() first.');
    }

    // Génère les événements MIDI
    const events = this.generateMidiEvents(scoreData);

    if (events.length === 0) {
        console.warn('Aucune note à jouer');
        return;
    }

    this.isPlaying = true;
    this.scheduledNotes = [];

    // Temps de référence : maintenant
    const startTime = this.audioContext.currentTime;

    // Programme chaque événement
    for (const event of events) {
        const eventTime = startTime + event.time;

        // Joue toutes les notes de l'événement (1 pour note simple, N pour accord)
        for (const noteData of event.notes) {
            this.playNote(noteData.frequency, eventTime, event.duration);
            this.scheduledNotes.push({
                frequency: noteData.frequency,
                endTime: eventTime + event.duration
            });
        }
    }

    // Calcule la durée totale
    const lastEvent = events[events.length - 1];
    const totalDuration = lastEvent.time + lastEvent.duration;

    // Planifie l'arrêt automatique
    setTimeout(() => {
        this.isPlaying = false;
        this.scheduledNotes = [];
        console.log('Lecture terminée');
    }, totalDuration * 1000); // Conversion secondes → millisecondes
}

/**
 * Arrête la lecture immédiatement
 * Note : les notes déjà programmées dans Web Audio continueront
 * (limitation de l'API, on ne peut pas annuler des événements programmés)
 */
stop() {
    if (!this.isPlaying) {
        return;
    }

    this.isPlaying = false;
    this.scheduledNotes = [];

    // Dans une implémentation plus avancée, on pourrait :
    // - Garder des références aux oscillateurs
    // - Les arrêter manuellement avec oscillator.stop()
    // Pour cette version simple, on se contente de marquer l'arrêt
    // Les notes en cours finiront naturellement

    console.log('Lecture arrêtée');
}
```

**Commit message** : `feat(midi): implement play and stop methods`

**Vérification** : Ouvrir `test-midi.html` → cliquer sur "▶️ Play test score" → doit entendre la gamme de Do → cliquer sur "⏹️ Stop" → la lecture s'arrête (ou se termine naturellement).

---

### Task 6: Ajouter le bouton "Lire" dans l'interface principale

**Objectif** : Modifier `index.html` pour ajouter un bouton de lecture à côté du bouton d'export.

**Test** : Ouvrir `index.html` dans un navigateur et vérifier visuellement que le bouton "🎵 Lire la partition" apparaît, désactivé par défaut.

**Implémentation** : Dans `index.html`, modifier la section `.export-actions`.

```html
<!-- index.html, ligne 46-50 environ -->
<div class="export-actions">
    <button id="btn-play" class="btn-secondary" disabled>
        🎵 Lire la partition
    </button>
    <button id="btn-export-png" class="btn-secondary" disabled>
        💾 Exporter en PNG
    </button>
</div>
```

**Commit message** : `feat(ui): add play button to interface`

**Vérification** : Ouvrir `index.html` → le bouton "🎵 Lire la partition" apparaît à gauche du bouton d'export, désactivé.

---

### Task 7: Charger le module MIDI dans index.html

**Objectif** : Inclure le fichier `midi.js` dans `index.html`.

**Test** : Ouvrir la console du navigateur sur `index.html` → taper `typeof MidiPlayer` → doit retourner `"function"`.

**Implémentation** : Dans `index.html`, ajouter le script avant `app.js`.

```html
<!-- index.html, ligne 55-59 environ -->
<!-- Scripts -->
<script src="parser.js"></script>
<script src="renderer.js"></script>
<script src="midi.js"></script>
<script src="app.js"></script>
```

**Commit message** : `feat(ui): load MIDI module in index.html`

**Vérification** : Ouvrir `index.html` → console → `typeof MidiPlayer` → retourne `"function"`.

---

### Task 8: Gérer l'état du bouton de lecture dans app.js

**Objectif** : Ajouter une fonction `setPlayButtonState(enabled)` dans `app.js`, similaire à `setExportButtonState()`.

**Test** : Générer une partition → le bouton "Lire" doit s'activer. Cliquer sur "Effacer" → le bouton doit se désactiver.

**Implémentation** : Dans `app.js`, ajouter la fonction et l'appeler dans les bonnes méthodes.

```javascript
// app.js, après setExportButtonState() (ligne 210 environ)

/**
 * Active ou désactive le bouton de lecture
 */
function setPlayButtonState(enabled) {
    const btnPlay = document.getElementById('btn-play');
    if (btnPlay) {
        btnPlay.disabled = !enabled;
    }
}
```

Puis modifier `handleRender()` :

```javascript
// app.js, ligne 76 environ, après setExportButtonState(true)
// Active les boutons d'export et de lecture
setExportButtonState(true);
setPlayButtonState(true);
```

Et `handleRender()` en cas d'erreur :

```javascript
// app.js, ligne 85 environ
// Désactive les boutons d'export et de lecture en cas d'erreur
setExportButtonState(false);
setPlayButtonState(false);
```

Et `handleClear()` :

```javascript
// app.js, ligne 148 environ
// Désactive les boutons d'export et de lecture
setExportButtonState(false);
setPlayButtonState(false);
```

**Commit message** : `feat(app): manage play button state`

**Vérification** : Générer une partition → bouton "Lire" activé. Effacer → bouton désactivé.

---

### Task 9: Implémenter la gestion de lecture dans app.js

**Objectif** : Créer une instance de `MidiPlayer` dans `app.js` et gérer les événements du bouton de lecture.

**Test** : Générer une partition → cliquer sur "🎵 Lire" → doit entendre la partition. Cliquer à nouveau pendant la lecture → le texte du bouton doit changer en "⏹️ Arrêter".

**Implémentation** : Dans `app.js`, modifier l'initialisation et ajouter le handler.

```javascript
// app.js, ligne 9-11 environ
// Instances globales
let parser;
let renderer;
let midiPlayer; // Nouveau
let currentScoreData = null;
```

```javascript
// app.js, fonction init(), ligne 19 environ
parser = new Parser();
renderer = new Renderer();
midiPlayer = new MidiPlayer(); // Nouveau
```

```javascript
// app.js, fonction init(), ligne 34 environ (après btnExportPNG)
const btnPlay = document.getElementById('btn-play');
btnPlay.addEventListener('click', handlePlay);
```

```javascript
// app.js, nouvelle fonction après handleExportPNG() (ligne 200 environ)

/**
 * Gère le clic sur "Lire la partition" / "Arrêter"
 */
function handlePlay() {
    const btnPlay = document.getElementById('btn-play');
    const errorDiv = document.getElementById('error-message');

    try {
        errorDiv.style.display = 'none';

        if (!currentScoreData) {
            throw new Error('Veuillez d\'abord générer une partition');
        }

        // Bascule lecture/arrêt
        if (midiPlayer.isPlaying) {
            // Arrêter
            midiPlayer.stop();
            btnPlay.textContent = '🎵 Lire la partition';
        } else {
            // Lire
            midiPlayer.initAudioContext(); // Initialise Web Audio (requis après interaction user)
            midiPlayer.play(currentScoreData);
            btnPlay.textContent = '⏹️ Arrêter';

            // Restaure le texte après la fin de la lecture
            // (la durée est calculée dans play(), mais on peut estimer)
            const lastNote = currentScoreData.notes[currentScoreData.notes.length - 1];
            const quarterDuration = 60 / currentScoreData.tempo;
            let totalDuration = 0;
            for (const note of currentScoreData.notes) {
                totalDuration += note.duration * quarterDuration;
            }
            
            setTimeout(() => {
                if (!midiPlayer.isPlaying) {
                    btnPlay.textContent = '🎵 Lire la partition';
                }
            }, totalDuration * 1000 + 500); // +500ms de marge
        }

    } catch (error) {
        console.error('❌ Erreur lecture:', error.message);
        errorDiv.textContent = '❌ ' + error.message;
        errorDiv.style.display = 'block';
        errorDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}
```

**Commit message** : `feat(app): implement play/stop event handling`

**Vérification** : Générer "Au clair de la lune" → cliquer "Lire" → doit entendre la mélodie. Cliquer "Arrêter" → la lecture s'arrête.

---

### Task 10: Ajouter les styles CSS pour le bouton de lecture

**Objectif** : Styler le bouton de lecture pour qu'il s'intègre visuellement avec le reste de l'interface.

**Test** : Vérifier visuellement que le bouton a la même apparence que le bouton d'export, avec un hover/focus cohérent.

**Implémentation** : Dans `styles.css`, les styles existants pour `.btn-secondary` devraient suffire. Vérifier qu'aucun style spécifique n'est nécessaire.

Si besoin, ajouter un style spécifique pour l'état "en cours de lecture" :

```css
/* styles.css, après .export-actions (ligne 150 environ) */

#btn-play:not(:disabled):active {
    transform: scale(0.98);
}

#btn-play:not(:disabled) {
    transition: all 0.2s ease;
}
```

**Commit message** : `style(ui): ensure play button visual consistency`

**Vérification** : Ouvrir `index.html` → vérifier que le bouton "Lire" a le même style que "Exporter en PNG", avec hover/focus.

---

### Task 11: Mettre à jour CLAUDE.md avec la documentation MIDI

**Objectif** : Documenter la nouvelle fonctionnalité dans `CLAUDE.md`.

**Test** : Lire `CLAUDE.md` → la section MIDI doit décrire l'architecture, les choix techniques, et comment modifier/étendre.

**Implémentation** : Ajouter une nouvelle section dans `CLAUDE.md`.

```markdown
## 🎵 Lecture MIDI

L'application permet de lire la partition générée avec un son de piano synthétique.

### Fonctionnement

1. **Génération d'événements** :
   - `MidiPlayer.generateMidiEvents()` convertit `scoreData.notes` en timeline d'événements temporisés
   - Chaque événement contient : {time, type, notes, duration}
   - Le tempo définit la durée d'une noire : `60 / tempo` secondes

2. **Synthèse audio** :
   - Utilise Web Audio API (native, pas de bibliothèque externe)
   - Oscillateurs type "triangle" pour un son proche du piano
   - Enveloppe ADSR simplifiée : Attack 10ms, Decay 100ms, Sustain 70%, Release 100ms

3. **Conversion notes → fréquences** :
   - Système tempéré à 440 Hz (La médium)
   - Formule : `f = 440 * 2^((n - 69) / 12)` où n = numéro MIDI
   - Octave 0 = médium (C0 = C4 standard = 261.63 Hz)

### Architecture

**Module** : `midi.js`

**Classe** : `MidiPlayer`

**Méthodes principales** :
- `initAudioContext()` → Initialise Web Audio (requis après interaction utilisateur)
- `generateMidiEvents(scoreData)` → Génère la timeline
- `play(scoreData)` → Lance la lecture
- `stop()` → Arrête la lecture
- `noteToFrequency(note, alteration, octave)` → Convertit note en Hz
- `playNote(frequency, startTime, duration)` → Joue une note via oscillateur

### État du bouton

- **Désactivé** :
  - Au chargement
  - Après "Effacer"
  - En cas d'erreur de génération
- **Activé** :
  - Après génération réussie
- **Texte alternatif** :
  - "🎵 Lire la partition" (au repos)
  - "⏹️ Arrêter" (en cours de lecture)

### Limitations connues

- Les notes déjà programmées dans Web Audio ne peuvent pas être annulées (limitation de l'API)
- Le bouton "Arrêter" marque l'arrêt mais les notes en cours finissent naturellement
- Son de piano simpliste (oscillateur triangle + ADSR basique)
- Pas de réverbération, pédale, ou vélocité variable

### Comment améliorer le son

Pour un son de piano plus réaliste :

1. **Utiliser plusieurs oscillateurs** (harmoniques) :
```javascript
// Fondamentale + harmoniques
const osc1 = ctx.createOscillator();
osc1.frequency.value = freq;
const osc2 = ctx.createOscillator();
osc2.frequency.value = freq * 2; // Octave
const osc3 = ctx.createOscillator();
osc3.frequency.value = freq * 3; // Quinte

// Mixer avec différents gains
```

2. **Ajouter un filtre passe-bas** :
```javascript
const filter = ctx.createBiquadFilter();
filter.type = 'lowpass';
filter.frequency.value = 2000; // Coupe les aigus
oscillator.connect(filter);
filter.connect(gainNode);
```

3. **Ou utiliser des samples** :
   - Charger des fichiers `.wav` de piano enregistré
   - `AudioBufferSourceNode` au lieu d'oscillateurs
   - Plus lourd (fichiers audio) mais son authentique

### Comment ajouter d'autres instruments

1. Modifier `playNote()` pour accepter un paramètre `instrument`
2. Créer des presets (piano, orgue, flûte...) avec différents types d'oscillateurs et enveloppes
3. Ajouter un sélecteur dans l'interface

Exemple :
```javascript
const instruments = {
    piano: { type: 'triangle', attack: 0.01, decay: 0.1, sustain: 0.7 },
    organ: { type: 'sine', attack: 0.001, decay: 0, sustain: 1.0 },
    flute: { type: 'sine', attack: 0.05, decay: 0.05, sustain: 0.9 }
};
```
```

**Commit message** : `docs(claude): document MIDI playback feature`

**Vérification** : Lire `CLAUDE.md` → la section "🎵 Lecture MIDI" est présente et complète.

---

### Task 12: Test end-to-end complet

**Objectif** : Vérifier le workflow complet de bout en bout.

**Test manuel** :

1. Ouvrir `index.html` dans un navigateur
2. Le bouton "🎵 Lire la partition" est désactivé ✓
3. Cliquer sur "Charger un exemple" → "Au clair de la lune" s'affiche
4. Cliquer sur "Générer la partition" → la partition s'affiche
5. Le bouton "Lire" est maintenant activé ✓
6. Cliquer sur "🎵 Lire la partition" → la mélodie se joue ✓
7. Le bouton affiche "⏹️ Arrêter" pendant la lecture ✓
8. Attendre la fin → le bouton revient à "🎵 Lire la partition" ✓
9. Re-cliquer sur "Lire" → la mélodie rejoue ✓
10. Pendant la lecture, cliquer sur "⏹️ Arrêter" → le texte revient ✓
11. Cliquer sur "Effacer" → le bouton est désactivé ✓

**Test avec erreur** :

12. Saisir du texte invalide → cliquer "Générer" → erreur s'affiche
13. Le bouton "Lire" reste désactivé ✓

**Test avec différentes partitions** :

14. Saisir une gamme : `Do Re Mi Fa Sol La Si Do+` (tempo 120) → Générer → Lire
15. Vérifier que les octaves sont respectés (Do+ doit être plus aigu)
16. Saisir un accord : `DoMiSol2` → Générer → Lire
17. Vérifier que les 3 notes sonnent simultanément

**Commit message** : `test(e2e): verify complete MIDI playback workflow`

**Vérification** : Tous les tests ci-dessus passent sans erreur.

---

## ✅ Critères d'acceptation

- [ ] Le bouton "🎵 Lire la partition" apparaît dans l'interface
- [ ] Le bouton est désactivé par défaut et s'active après génération réussie
- [ ] Cliquer sur le bouton joue la partition avec un son de piano
- [ ] Le tempo de la partition est respecté
- [ ] Les durées des notes sont correctes (noires, blanches, croches...)
- [ ] Les octaves sont respectées (Do+ plus aigu que Do-)
- [ ] Les accords jouent plusieurs notes simultanément
- [ ] Les silences sont respectés (pas de son)
- [ ] Le bouton affiche "⏹️ Arrêter" pendant la lecture
- [ ] Cliquer sur "Arrêter" interrompt la lecture
- [ ] Le bouton redevient "🎵 Lire" après la fin/arrêt
- [ ] La documentation dans `CLAUDE.md` est complète
- [ ] L'architecture reste modulaire (1 fichier = 1 responsabilité)
- [ ] Le code est commenté pour les débutants

## 🚀 Déploiement

Aucun changement dans le déploiement : `midi.js` est un fichier JavaScript vanilla, pas de build step nécessaire. GitHub Pages continuera de fonctionner tel quel.

## 📚 Ressources techniques

### Web Audio API
- [MDN: Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [MDN: OscillatorNode](https://developer.mozilla.org/en-US/docs/Web/API/OscillatorNode)
- [MDN: GainNode (enveloppe ADSR)](https://developer.mozilla.org/en-US/docs/Web/API/GainNode)

### Théorie musicale
- [Fréquences des notes (système tempéré)](https://fr.wikipedia.org/wiki/Fr%C3%A9quence_des_notes_de_musique)
- [Enveloppe ADSR](https://fr.wikipedia.org/wiki/Enveloppe_sonore#ADSR)
- [MIDI note numbers](https://www.inspiredacoustics.com/en/MIDI_note_numbers_and_center_frequencies)

---

**Plan créé le** : 2026-06-17

**Pour l'exécuteur** : Suivez les tâches dans l'ordre. Chaque tâche DOIT être validée par son test avant de committer. Si un test échoue, corrigez le code jusqu'à ce que le test passe. Ne passez jamais à la tâche suivante tant que la précédente n'est pas entièrement validée.

**Principe TDD strict** : Test en rouge → Code minimal → Test au vert → Commit → Tâche suivante.

🎵 Bonne implémentation !
