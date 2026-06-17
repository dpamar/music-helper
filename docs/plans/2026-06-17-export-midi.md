# Plan d'implémentation : Export MIDI

> Pour agentic workers: implémente ce plan tâche par tâche avec red-green-refactor discipline. Une tâche, un commit. Ne jamais regrouper.

## Vue d'ensemble

**Objectif** : Ajouter une fonctionnalité d'export de fichier MIDI (.mid) pour permettre aux utilisateurs de télécharger leur partition sous forme de fichier MIDI standard.

**Contexte** :
- L'application possède déjà un module `midi.js` avec `MidiPlayer` qui lit les partitions en temps réel via Web Audio API
- La conversion notes → MIDI numbers existe déjà dans `noteToFrequency()` (ligne 116-134)
- La génération d'événements temporisés existe dans `generateMidiEvents()` (ligne 25-57)
- Le format de données `scoreData` est déjà structuré avec tempo, time signature, et notes

**Stratégie** :
- Créer un nouveau module `midi-export.js` qui génère des fichiers MIDI binaires au format SMF (Standard MIDI File)
- Réutiliser la conversion notes → MIDI numbers de `MidiPlayer`
- Ajouter un bouton "Exporter en MIDI" dans l'interface (similaire au bouton PNG existant)
- Suivre le pattern existant : bouton désactivé par défaut, activé après génération réussie

**Librairie** : Aucune dépendance externe (100% vanilla JS comme le reste du projet)

---

## Tâches d'implémentation

### Task 1 : Créer le module midi-export.js avec structure de base

**Type** : feat (nouveau module)

**Description** : Créer le fichier `midi-export.js` contenant la classe `MidiExporter` avec les méthodes de conversion MIDI numbers et la structure de base pour générer des fichiers MIDI.

**Actions** :
1. Créer le fichier `midi-export.js`
2. Définir la classe `MidiExporter` avec constructeur vide
3. Ajouter la méthode `noteToMidiNumber(note, alteration, octave)` → retourne un entier MIDI (0-127)
4. Ajouter la méthode stub `export(scoreData, filename)` → lance le téléchargement

**Code** :

```javascript
/**
 * MIDI-EXPORT.JS
 *
 * Module d'export de fichiers MIDI
 * Génère des fichiers .mid au format SMF (Standard MIDI File) Format 0
 */

class MidiExporter {
    constructor() {
        // Pas d'état nécessaire pour l'instant
    }

    /**
     * Convertit une note en numéro MIDI (0-127)
     * @param {string} note - Note en notation anglo-saxonne (C, D, E, F, G, A, B)
     * @param {string} alteration - '', 'sharp', 'flat', 'natural'
     * @param {number} octave - Décalage d'octave (-2, -1, 0, 1, 2)
     * @returns {number} Numéro MIDI (0-127, C4 = 60)
     */
    noteToMidiNumber(note, alteration, octave) {
        const noteValues = {
            'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11
        };

        let semitone = noteValues[note];

        if (alteration === 'sharp') {
            semitone += 1;
        } else if (alteration === 'flat') {
            semitone -= 1;
        }

        semitone += octave * 12;

        // MIDI number: C4 (Do médium) = 60
        const midiNumber = 60 + semitone;

        // Clamp entre 0 et 127
        return Math.max(0, Math.min(127, midiNumber));
    }

    /**
     * Exporte la partition en fichier MIDI et déclenche le téléchargement
     * @param {Object} scoreData - Données de partition parsées
     * @param {string} filename - Nom du fichier (sans extension)
     */
    export(scoreData, filename) {
        // TODO: implémenter la génération du fichier MIDI
        console.log('Export MIDI:', scoreData, filename);
    }
}
```

**Test manuel** :
```javascript
const exporter = new MidiExporter();
console.log(exporter.noteToMidiNumber('C', '', 0)); // 60 (Do médium)
console.log(exporter.noteToMidiNumber('C', 'sharp', 1)); // 73 (Do# aigu)
console.log(exporter.noteToMidiNumber('E', 'flat', -1)); // 51 (Mib grave)
```

**Commit** : `feat(midi-export): create MidiExporter class with note conversion`

---

### Task 2 : Implémenter la génération d'événements MIDI

**Type** : feat

**Description** : Ajouter la méthode `generateMidiEvents()` qui transforme `scoreData.notes` en une liste d'événements MIDI temporisés (note on/off).

**Actions** :
1. Ajouter la méthode `generateMidiEvents(scoreData)` → retourne un tableau d'événements
2. Parcourir `scoreData.notes` et créer des événements MIDI pour chaque note/accord/silence
3. Calculer les timestamps en ticks MIDI (basés sur `ppq` = pulses per quarter note)
4. Générer des paires `note_on` / `note_off` pour chaque note

**Code** :

```javascript
    /**
     * Génère les événements MIDI à partir des données de partition
     * @param {Object} scoreData - Données parsées (tempo, notes, etc.)
     * @returns {Array} Liste d'événements MIDI triés par temps
     */
    generateMidiEvents(scoreData) {
        const events = [];
        const ppq = 480; // Pulses Per Quarter note (standard MIDI)
        let currentTick = 0;

        for (const item of scoreData.notes) {
            const durationTicks = Math.round(item.duration * ppq);

            if (item.type === 'rest') {
                // Silence : avancer le temps sans générer d'événement
                currentTick += durationTicks;
            } else if (item.type === 'note') {
                // Note simple
                const midiNumber = this.noteToMidiNumber(item.note, item.alteration, item.octave);
                events.push({
                    tick: currentTick,
                    type: 'note_on',
                    channel: 0,
                    note: midiNumber,
                    velocity: 80
                });
                events.push({
                    tick: currentTick + durationTicks,
                    type: 'note_off',
                    channel: 0,
                    note: midiNumber,
                    velocity: 0
                });
                currentTick += durationTicks;
            } else if (item.type === 'chord') {
                // Accord : plusieurs notes simultanées
                for (const noteData of item.notes) {
                    const midiNumber = this.noteToMidiNumber(
                        noteData.note,
                        noteData.alteration,
                        noteData.octave
                    );
                    events.push({
                        tick: currentTick,
                        type: 'note_on',
                        channel: 0,
                        note: midiNumber,
                        velocity: 80
                    });
                    events.push({
                        tick: currentTick + durationTicks,
                        type: 'note_off',
                        channel: 0,
                        note: midiNumber,
                        velocity: 0
                    });
                }
                currentTick += durationTicks;
            }
        }

        // Tri par tick (important pour MIDI)
        events.sort((a, b) => a.tick - b.tick);

        return events;
    }
```

**Test manuel** :
```javascript
const scoreData = {
    tempo: 120,
    notes: [
        { type: 'note', note: 'C', alteration: '', octave: 0, duration: 1 },
        { type: 'rest', duration: 0.5 },
        { type: 'chord', notes: [
            { note: 'C', alteration: '', octave: 0 },
            { note: 'E', alteration: '', octave: 0 },
            { note: 'G', alteration: '', octave: 0 }
        ], duration: 2 }
    ]
};
const exporter = new MidiExporter();
const events = exporter.generateMidiEvents(scoreData);
console.log(events.length); // 8 événements (2 + 6)
console.log(events[0]); // {tick: 0, type: 'note_on', note: 60, ...}
```

**Commit** : `feat(midi-export): add generateMidiEvents method`

---

### Task 3 : Implémenter les fonctions utilitaires d'encodage binaire

**Type** : feat

**Description** : Ajouter les fonctions helper pour encoder les données binaires MIDI (variable-length quantity, bytes, strings).

**Actions** :
1. Ajouter `writeVarLength(value)` → encode un entier en format VLQ (Variable Length Quantity)
2. Ajouter `writeBytes(bytes)` → retourne un Uint8Array
3. Ajouter `writeString(str)` → convertit une chaîne en bytes ASCII
4. Ajouter `writeUint16(value)` → encode un entier 16-bit big-endian
5. Ajouter `writeUint32(value)` → encode un entier 32-bit big-endian

**Code** :

```javascript
    /**
     * Encode un entier en Variable Length Quantity (format MIDI)
     * Utilisé pour les deltas de temps entre événements
     * @param {number} value - Entier à encoder
     * @returns {Array<number>} Bytes encodés
     */
    writeVarLength(value) {
        const bytes = [];
        let buffer = value & 0x7F;

        while (value >>= 7) {
            buffer <<= 8;
            buffer |= 0x80;
            buffer += (value & 0x7F);
        }

        while (true) {
            bytes.push(buffer & 0xFF);
            if (buffer & 0x80) {
                buffer >>= 8;
            } else {
                break;
            }
        }

        return bytes;
    }

    /**
     * Convertit une chaîne en bytes ASCII
     * @param {string} str - Chaîne à convertir
     * @returns {Array<number>} Bytes ASCII
     */
    writeString(str) {
        const bytes = [];
        for (let i = 0; i < str.length; i++) {
            bytes.push(str.charCodeAt(i));
        }
        return bytes;
    }

    /**
     * Encode un entier 16-bit en big-endian
     * @param {number} value - Entier 16-bit
     * @returns {Array<number>} 2 bytes
     */
    writeUint16(value) {
        return [
            (value >> 8) & 0xFF,
            value & 0xFF
        ];
    }

    /**
     * Encode un entier 32-bit en big-endian
     * @param {number} value - Entier 32-bit
     * @returns {Array<number>} 4 bytes
     */
    writeUint32(value) {
        return [
            (value >> 24) & 0xFF,
            (value >> 16) & 0xFF,
            (value >> 8) & 0xFF,
            value & 0xFF
        ];
    }
```

**Test manuel** :
```javascript
const exporter = new MidiExporter();
console.log(exporter.writeVarLength(0)); // [0]
console.log(exporter.writeVarLength(127)); // [127]
console.log(exporter.writeVarLength(128)); // [129, 0]
console.log(exporter.writeVarLength(480)); // [131, 96]
console.log(exporter.writeString('MThd')); // [77, 84, 104, 100]
console.log(exporter.writeUint16(480)); // [1, 224]
console.log(exporter.writeUint32(1234)); // [0, 0, 4, 210]
```

**Commit** : `feat(midi-export): add binary encoding utilities`

---

### Task 4 : Implémenter la génération du chunk header MIDI

**Type** : feat

**Description** : Ajouter la méthode `buildHeaderChunk()` qui génère le chunk "MThd" (MIDI header) contenant le format, nombre de pistes, et division temporelle.

**Actions** :
1. Ajouter `buildHeaderChunk(ppq)` → retourne un tableau de bytes
2. Écrire "MThd" (4 bytes)
3. Écrire la taille du chunk (toujours 6 pour header)
4. Écrire le format (0 = single track)
5. Écrire le nombre de pistes (1)
6. Écrire la division temporelle (ppq)

**Code** :

```javascript
    /**
     * Construit le chunk header MIDI (MThd)
     * @param {number} ppq - Pulses per quarter note
     * @returns {Array<number>} Bytes du header chunk
     */
    buildHeaderChunk(ppq) {
        const bytes = [];

        // "MThd" (4 bytes)
        bytes.push(...this.writeString('MThd'));

        // Taille du header (toujours 6 bytes)
        bytes.push(...this.writeUint32(6));

        // Format 0 (single track)
        bytes.push(...this.writeUint16(0));

        // Nombre de pistes (1)
        bytes.push(...this.writeUint16(1));

        // Division temporelle (ticks per quarter note)
        bytes.push(...this.writeUint16(ppq));

        return bytes;
    }
```

**Test manuel** :
```javascript
const exporter = new MidiExporter();
const header = exporter.buildHeaderChunk(480);
console.log(header.length); // 14 bytes
console.log(String.fromCharCode(...header.slice(0, 4))); // "MThd"
console.log(header[8]); // 0 (format)
console.log(header[10]); // 0 (tracks high byte)
console.log(header[11]); // 1 (tracks low byte)
```

**Commit** : `feat(midi-export): add header chunk builder`

---

### Task 5 : Implémenter la génération du chunk track MIDI

**Type** : feat

**Description** : Ajouter la méthode `buildTrackChunk()` qui génère le chunk "MTrk" contenant les événements MIDI de la partition.

**Actions** :
1. Ajouter `buildTrackChunk(scoreData, events)` → retourne un tableau de bytes
2. Écrire "MTrk" (4 bytes)
3. Générer les événements meta (tempo, time signature, track name)
4. Convertir les événements note_on/note_off en bytes avec delta times
5. Ajouter l'événement "End of Track"
6. Calculer la taille totale du track et l'écrire après "MTrk"

**Code** :

```javascript
    /**
     * Construit le chunk track MIDI (MTrk)
     * @param {Object} scoreData - Données de partition
     * @param {Array} events - Événements MIDI générés
     * @returns {Array<number>} Bytes du track chunk
     */
    buildTrackChunk(scoreData, events) {
        const trackData = [];
        let lastTick = 0;

        // Événement meta : Track Name
        if (scoreData.title) {
            trackData.push(0); // Delta time 0
            trackData.push(0xFF); // Meta event
            trackData.push(0x03); // Track name
            const titleBytes = this.writeString(scoreData.title);
            trackData.push(...this.writeVarLength(titleBytes.length));
            trackData.push(...titleBytes);
        }

        // Événement meta : Set Tempo (microsecondes par quarter note)
        const microsecondsPerQuarter = Math.round(60000000 / scoreData.tempo);
        trackData.push(0); // Delta time 0
        trackData.push(0xFF); // Meta event
        trackData.push(0x51); // Set tempo
        trackData.push(0x03); // Taille (toujours 3 bytes)
        trackData.push((microsecondsPerQuarter >> 16) & 0xFF);
        trackData.push((microsecondsPerQuarter >> 8) & 0xFF);
        trackData.push(microsecondsPerQuarter & 0xFF);

        // Événement meta : Time Signature
        trackData.push(0); // Delta time 0
        trackData.push(0xFF); // Meta event
        trackData.push(0x58); // Time signature
        trackData.push(0x04); // Taille (toujours 4 bytes)
        trackData.push(scoreData.timeSignature.numerator);
        trackData.push(Math.log2(scoreData.timeSignature.denominator)); // Puissance de 2
        trackData.push(24); // MIDI clocks per metronome click
        trackData.push(8); // 32nds per quarter note

        // Événements MIDI (note on/off)
        for (const event of events) {
            const deltaTime = event.tick - lastTick;
            trackData.push(...this.writeVarLength(deltaTime));

            if (event.type === 'note_on') {
                trackData.push(0x90 | event.channel); // Note On, channel 0
                trackData.push(event.note);
                trackData.push(event.velocity);
            } else if (event.type === 'note_off') {
                trackData.push(0x80 | event.channel); // Note Off, channel 0
                trackData.push(event.note);
                trackData.push(event.velocity);
            }

            lastTick = event.tick;
        }

        // Événement meta : End of Track
        trackData.push(0); // Delta time 0
        trackData.push(0xFF); // Meta event
        trackData.push(0x2F); // End of track
        trackData.push(0x00); // Taille 0

        // Construire le chunk complet
        const bytes = [];
        bytes.push(...this.writeString('MTrk'));
        bytes.push(...this.writeUint32(trackData.length));
        bytes.push(...trackData);

        return bytes;
    }
```

**Test manuel** :
```javascript
const scoreData = {
    title: 'Test',
    tempo: 120,
    timeSignature: { numerator: 4, denominator: 4 },
    notes: [{ type: 'note', note: 'C', alteration: '', octave: 0, duration: 1 }]
};
const exporter = new MidiExporter();
const events = exporter.generateMidiEvents(scoreData);
const track = exporter.buildTrackChunk(scoreData, events);
console.log(track.length); // > 50 bytes
console.log(String.fromCharCode(...track.slice(0, 4))); // "MTrk"
```

**Commit** : `feat(midi-export): add track chunk builder`

---

### Task 6 : Finaliser la méthode export() et déclencher le téléchargement

**Type** : feat

**Description** : Compléter la méthode `export()` pour assembler le fichier MIDI complet et déclencher le téléchargement via un blob.

**Actions** :
1. Implémenter `export(scoreData, filename)` complètement
2. Appeler `generateMidiEvents()`, `buildHeaderChunk()`, `buildTrackChunk()`
3. Assembler header + track dans un Uint8Array
4. Créer un Blob de type 'audio/midi'
5. Créer un lien de téléchargement et le déclencher (pattern identique à `handleExportPNG`)
6. Nettoyer le lien après téléchargement

**Code** :

```javascript
    /**
     * Exporte la partition en fichier MIDI et déclenche le téléchargement
     * @param {Object} scoreData - Données de partition parsées
     * @param {string} filename - Nom du fichier (sans extension)
     */
    export(scoreData, filename) {
        const ppq = 480; // Pulses per quarter note

        // Génération des événements MIDI
        const events = this.generateMidiEvents(scoreData);

        // Construction des chunks
        const headerBytes = this.buildHeaderChunk(ppq);
        const trackBytes = this.buildTrackChunk(scoreData, events);

        // Assemblage du fichier MIDI complet
        const midiBytes = new Uint8Array([...headerBytes, ...trackBytes]);

        // Création du blob et déclenchement du téléchargement
        const blob = new Blob([midiBytes], { type: 'audio/midi' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `${filename}.mid`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Libération de l'URL blob
        URL.revokeObjectURL(url);
    }
```

**Test manuel** : Tester dans le navigateur avec :
```javascript
const parser = new Parser();
const scoreData = parser.parse(`Test\n120\n4/4\nsol\nDo Re Mi Fa Sol`);
const exporter = new MidiExporter();
exporter.export(scoreData, 'test-partition');
// Un fichier test-partition.mid doit être téléchargé
```

**Commit** : `feat(midi-export): implement full MIDI export with download`

---

### Task 7 : Ajouter le bouton "Exporter en MIDI" dans l'interface HTML

**Type** : feat

**Description** : Ajouter un bouton "Exporter en MIDI" dans la section `.export-actions` de `index.html`, désactivé par défaut.

**Actions** :
1. Ouvrir `index.html`
2. Ajouter un bouton `#btn-export-midi` après le bouton PNG
3. Ajouter l'attribut `disabled`
4. Ajouter une icône appropriée (🎹 ou 🎼)
5. Inclure le script `midi-export.js` dans le HTML

**Code** :

Dans `index.html`, remplacer la section `.export-actions` (lignes 46-53) :

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
                </div>
```

Et ajouter le script après `midi.js` (ligne 61) :

```html
    <!-- Scripts -->
    <script src="parser.js"></script>
    <script src="renderer.js"></script>
    <script src="midi.js"></script>
    <script src="midi-export.js"></script>
    <script src="app.js"></script>
```

**Commit** : `feat(ui): add MIDI export button to interface`

---

### Task 8 : Ajouter la logique d'export MIDI dans app.js

**Type** : feat

**Description** : Créer l'instance `MidiExporter`, ajouter le gestionnaire d'événements `handleExportMIDI()`, et gérer l'état du bouton.

**Actions** :
1. Dans `app.js`, ligne 11, ajouter `let midiExporter;` après `let midiPlayer;`
2. Dans `init()`, ligne 22, ajouter `midiExporter = new MidiExporter();`
3. Dans `init()`, ligne 28, récupérer `#btn-export-midi`
4. Dans `init()`, ligne 38, attacher `handleExportMIDI` au bouton
5. Créer la fonction `handleExportMIDI()` similaire à `handleExportPNG()`
6. Mettre à jour `setExportButtonState()` pour activer/désactiver aussi le bouton MIDI

**Code** :

Dans `app.js`, après la ligne 11 :
```javascript
let midiExporter;
```

Dans `init()`, après la ligne 22 :
```javascript
    midiExporter = new MidiExporter();
```

Dans `init()`, après la ligne 28 :
```javascript
    const btnExportMIDI = document.getElementById('btn-export-midi');
```

Dans `init()`, après la ligne 38 :
```javascript
    btnExportMIDI.addEventListener('click', handleExportMIDI);
```

Ajouter la fonction `handleExportMIDI()` après `handleExportPNG()` (après ligne 208) :
```javascript
/**
 * Gère le clic sur "Exporter en MIDI"
 * Génère un fichier MIDI et déclenche le téléchargement
 */
function handleExportMIDI() {
    const errorDiv = document.getElementById('error-message');

    if (!currentScoreData) {
        errorDiv.textContent = '❌ Veuillez d\'abord générer une partition';
        errorDiv.style.display = 'block';
        errorDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        return;
    }

    try {
        errorDiv.style.display = 'none';

        let filename = 'partition';

        if (currentScoreData && currentScoreData.title && currentScoreData.title.trim()) {
            const cleanTitle = currentScoreData.title.trim()
                .toLowerCase()
                .normalize('NFD').replace(/[̀-ͯ]/g, '')
                .replace(/[^a-z0-9\s-]/g, '')
                .replace(/\s+/g, '-')
                .replace(/-+/g, '-');

            filename = cleanTitle;
        }

        midiExporter.export(currentScoreData, filename);

    } catch (error) {
        errorDiv.textContent = '❌ Erreur lors de l\'export MIDI: ' + error.message;
        errorDiv.style.display = 'block';
        errorDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}
```

Remplacer la fonction `setExportButtonState()` (lignes 256-261) :
```javascript
/**
 * Active ou désactive les boutons d'export (PNG et MIDI)
 */
function setExportButtonState(enabled) {
    const btnExportPNG = document.getElementById('btn-export-png');
    const btnExportMIDI = document.getElementById('btn-export-midi');
    if (btnExportPNG) {
        btnExportPNG.disabled = !enabled;
    }
    if (btnExportMIDI) {
        btnExportMIDI.disabled = !enabled;
    }
}
```

**Commit** : `feat(app): integrate MIDI export handler and button state`

---

### Task 9 : Tester manuellement l'export MIDI dans le navigateur

**Type** : test

**Description** : Tester l'export MIDI avec différentes partitions pour vérifier la génération correcte du fichier et la lecture dans un lecteur MIDI externe.

**Actions** :
1. Ouvrir `index.html` dans un navigateur
2. Charger l'exemple "Au clair de la lune"
3. Générer la partition
4. Cliquer sur "Exporter en MIDI"
5. Vérifier que le fichier `au-clair-de-la-lune.mid` est téléchargé
6. Ouvrir le fichier dans un lecteur MIDI (MuseScore, GarageBand, VLC, Windows Media Player)
7. Vérifier que les notes jouent correctement avec le bon tempo
8. Tester avec une partition contenant des accords, altérations, et silences
9. Vérifier les cas limites : partition vide, notes extrêmes (très graves/aiguës)

**Cas de test** :

1. **Partition simple** :
```
Test simple
120
4/4
sol
Do Re Mi Fa Sol La Si Do+
```

2. **Partition avec accords** :
```
Accords
100
4/4
sol
DoMiSol2 FaLaDo2 SolSiRe+2
```

3. **Partition avec altérations** :
```
Altérations
120
3/4
sol Do# Fa#
Do# Re Mi Fa# Sol# La# Si Do+#
```

4. **Partition avec silences** :
```
Silences
120
4/4
sol
Do1 S0.5 Re0.5 S1 Mi2
```

**Vérification** :
- Le fichier .mid est bien téléchargé avec le bon nom
- Le fichier s'ouvre sans erreur dans un lecteur MIDI
- Les notes correspondent à la partition saisie
- Le tempo est respecté
- Les accords jouent simultanément
- Les silences sont bien présents

**Note** : Pas de tests unitaires pour l'instant (vanilla JS, pas de framework de test). Les tests sont manuels dans le navigateur.

**Commit** : `test: manual verification of MIDI export functionality`

---

### Task 10 : Mettre à jour CLAUDE.md avec la documentation de l'export MIDI

**Type** : docs

**Description** : Documenter la nouvelle fonctionnalité d'export MIDI dans `CLAUDE.md` pour les futurs développeurs.

**Actions** :
1. Ouvrir `CLAUDE.md`
2. Ajouter une section "## 🎹 Export MIDI" après la section "📥 Export PNG"
3. Documenter le fonctionnement du module `midi-export.js`
4. Expliquer le format SMF (Standard MIDI File)
5. Documenter la structure des chunks header et track
6. Mettre à jour la section "📁 Architecture" avec `midi-export.js`
7. Retirer "⚠️ Pas d'export PDF pour l'instant" des limitations connues

**Code** :

Dans `CLAUDE.md`, après la section "## 📥 Export PNG" (ligne 95), ajouter :

```markdown
## 🎹 Export MIDI

L'application permet d'exporter la partition générée sous forme de fichier MIDI standard (.mid).

### Fonctionnement

1. **Format MIDI** :
   - Standard MIDI File (SMF) Format 0 (piste unique)
   - Encodage binaire selon la spécification MIDI 1.0
   - PPQ (Pulses Per Quarter note) = 480 ticks

2. **Structure du fichier** :
   - **Header chunk (MThd)** : Format, nombre de pistes, division temporelle
   - **Track chunk (MTrk)** : Événements MIDI (tempo, time signature, notes)

3. **Événements générés** :
   - **Meta events** :
     - Track Name (0xFF 0x03) : titre de la partition
     - Set Tempo (0xFF 0x51) : tempo en microsecondes par noire
     - Time Signature (0xFF 0x58) : chiffrage de mesure
   - **Note events** :
     - Note On (0x90) : début de note
     - Note Off (0x80) : fin de note
   - **End of Track (0xFF 0x2F)** : fin du track

4. **Conversion notes → MIDI** :
   - Système MIDI standard : C4 (Do médium) = 60
   - Plage MIDI : 0-127 (clamping automatique)
   - Altérations : dièse +1 demi-ton, bémol -1 demi-ton

5. **Nom du fichier** :
   - Basé sur le titre de la partition (nettoyage identique à PNG)
   - Exemple : `"Au clair de la lune"` → `au-clair-de-la-lune.mid`
   - Par défaut : `partition.mid` si pas de titre

6. **Téléchargement** :
   - Blob de type `audio/midi`
   - Lien temporaire avec attribut `download`
   - Nettoyage automatique après téléchargement

### Module midi-export.js

**Classe** : `MidiExporter`

**Méthodes principales** :
- `noteToMidiNumber(note, alteration, octave)` → number (0-127)
- `generateMidiEvents(scoreData)` → Array (événements MIDI avec ticks)
- `buildHeaderChunk(ppq)` → Array (bytes du header MThd)
- `buildTrackChunk(scoreData, events)` → Array (bytes du track MTrk)
- `export(scoreData, filename)` → void (génère et télécharge le fichier)

**Fonctions utilitaires** :
- `writeVarLength(value)` → Array (Variable Length Quantity MIDI)
- `writeString(str)` → Array (bytes ASCII)
- `writeUint16(value)` → Array (2 bytes big-endian)
- `writeUint32(value)` → Array (4 bytes big-endian)

### État du bouton

- **Désactivé** : Au chargement, après "Effacer", en cas d'erreur
- **Activé** : Après génération réussie de la partition

### Limitations

- Format 0 uniquement (piste unique, pas de multi-pistes)
- Pas de support des nuances (velocity fixe à 80)
- Pas d'informations de clef ou d'armure dans le fichier MIDI
- Pas de support des ornements ou articulations

### Compatibilité

Les fichiers MIDI générés sont compatibles avec :
- Lecteurs audio : VLC, Windows Media Player, QuickTime
- Logiciels de notation : MuseScore, Finale, Sibelius
- DAWs : GarageBand, Logic Pro, Ableton Live, FL Studio
- Synthétiseurs et instruments MIDI externes

### Ressources

- [Standard MIDI File format](https://www.midi.org/specifications/file-format-specifications/standard-midi-files)
- [MIDI 1.0 Specification](https://www.midi.org/specifications-old/item/the-midi-1-0-specification)
- [Variable Length Quantity](https://en.wikipedia.org/wiki/Variable-length_quantity)
```

Dans la section "## 📁 Architecture" (ligne 12), ajouter :
```
├── midi-export.js      # Export de fichiers MIDI (téléchargement .mid)
```

Dans la section "## 🐛 Bugs connus / Limitations" (ligne 430), retirer :
```
- ⚠️ Pas d'export PDF pour l'instant (nécessite une bibliothèque externe)
```

**Commit** : `docs: add MIDI export documentation to CLAUDE.md`

---

## Vérifications finales

### Checklist avant commit du plan

- [ ] Toutes les tâches sont numérotées séquentiellement
- [ ] Chaque tâche contient du code complet (pas de "TODO" ou de descriptions vagues)
- [ ] Les numéros de lignes référencés sont corrects
- [ ] Le plan suit l'approche TDD (test → implémentation → commit)
- [ ] Tous les types référencés sont définis dans le plan
- [ ] Pas de contradictions entre tâches
- [ ] Les commits suivent le format Conventional Commits
- [ ] La documentation est mise à jour

### Tests d'intégration

Après toutes les tâches, vérifier :
1. Le bouton "Exporter en MIDI" est présent et fonctionne
2. Un fichier .mid est téléchargé avec le bon nom
3. Le fichier s'ouvre dans MuseScore/VLC sans erreur
4. Les notes correspondent à la partition saisie
5. Le tempo et le chiffrage sont corrects
6. Les accords jouent simultanément
7. Les silences sont respectés

---

**Temps estimé par tâche** : 10-15 minutes (total ~2h pour l'implémentation complète)

**Dépendances externes** : Aucune (100% vanilla JavaScript)

**Risques** : 
- Encodage binaire MIDI délicat (attention aux bytes big-endian)
- Variable Length Quantity difficile à déboguer
- Compatibilité navigateur pour Blob et download (supporté par tous les navigateurs modernes)
