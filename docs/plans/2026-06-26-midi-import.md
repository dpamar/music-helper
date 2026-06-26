# Plan d'implémentation : Import de fichier MIDI

> For agentic workers: implement this plan task-by-task with red-green-refactor discipline. One task, one commit. Never batch.

**Date:** 2026-06-26  
**Feature:** Import de fichier MIDI avec sélection de piste  
**Contraintes:** Client-side uniquement, vanilla JS, ignorer les features MIDI inconnues, extraire uniquement notes et tempo

---

## Vue d'ensemble

Cette fonctionnalité permet d'importer un fichier MIDI (.mid) et de le convertir en notation française pour l'afficher dans l'éditeur. Si le fichier contient plusieurs pistes, l'utilisateur choisit laquelle afficher. Les features MIDI non supportées (contrôleurs, pitch bend, meta-events autres que tempo) sont ignorées silencieusement.

### Flux utilisateur

1. L'utilisateur clique sur "📂 Importer MIDI"
2. Sélection d'un fichier .mid via `<input type="file">`
3. Si multi-pistes : affichage d'une modale de sélection avec aperçu (nombre de notes, plage octave, durée)
4. Parsing MIDI → scoreData → notation française
5. Remplissage automatique de la textarea
6. Génération automatique de la partition

### Structures de données

**ParsedMidiFile:**
```javascript
{
    format: 0 | 1 | 2,              // SMF format
    ppq: number,                     // Pulses per quarter note
    tracks: Array<MidiTrack>
}
```

**MidiTrack:**
```javascript
{
    trackIndex: number,
    trackName: string | null,        // Meta event 0x03
    notes: Array<MidiNote>,          // Seulement Note On/Off
    tempo: number | null,            // Première valeur de tempo trouvée (μs/quarter)
    noteCount: number,               // Pour l'aperçu
    minNote: number,                 // MIDI number min
    maxNote: number,                 // MIDI number max
    durationTicks: number            // Durée totale en ticks
}
```

**MidiNote:**
```javascript
{
    tick: number,                    // Position absolue en ticks
    midiNumber: number,              // 0-127
    duration: number,                // En ticks
    velocity: number                 // 0-127 (ignoré pour l'instant)
}
```

---

## Architecture des fichiers

**Nouveau module:** `midi-import.js`
- Classe `MidiImporter`
- Responsabilité : Parsing binaire MIDI → structures de données
- Méthodes publiques :
  - `parseMidiFile(arrayBuffer)` → `ParsedMidiFile`
  - `trackToScoreData(track, ppq, defaultTempo)` → `scoreData`

**Modifications:** `app.js`
- Ajouter bouton "📂 Importer MIDI"
- Ajouter `<input type="file" id="midi-file-input" accept=".mid,.midi" style="display:none">`
- Ajouter modale de sélection de piste `#track-selection-modal`
- Handler `handleImportMidi()`
- Handler `handleTrackSelection(selectedTrackIndex)`

**Modifications:** `index.html`
- Ajouter bouton import dans la section `.actions`
- Ajouter input file caché
- Ajouter structure HTML modale sélection piste

**Modifications:** `styles.css`
- Styles pour `.track-selection-modal`
- Styles pour `.track-preview-card`

---

## Tasks détaillées

### Task 1: Créer le module midi-import.js avec parsing header

**Objectif:** Parser le header chunk MIDI (MThd) pour extraire format, numTracks, ppq.

**Test (à écrire en premier):**
```javascript
// tests/test-midi-import.html
describe('MidiImporter - Header parsing', () => {
    it('devrait parser un header MIDI Format 0', () => {
        const importer = new MidiImporter();
        // Header bytes: MThd + length(6) + format(0) + numTracks(1) + ppq(480)
        const bytes = new Uint8Array([
            0x4D, 0x54, 0x68, 0x64,  // "MThd"
            0x00, 0x00, 0x00, 0x06,  // length = 6
            0x00, 0x00,              // format = 0
            0x00, 0x01,              // numTracks = 1
            0x01, 0xE0               // ppq = 480
        ]);
        
        const result = importer.parseHeader(bytes.buffer, 0);
        
        expect(result.format).to.equal(0);
        expect(result.numTracks).to.equal(1);
        expect(result.ppq).to.equal(480);
        expect(result.nextOffset).to.equal(14);
    });
});
```

**Implémentation:**
```javascript
/**
 * MidiImporter - Parse les fichiers MIDI Standard (Format 0 et Format 1).
 * Ignore les features MIDI non supportées (contrôleurs, pitch bend, etc.).
 * Extrait uniquement : notes (Note On/Off) et tempo (Set Tempo meta-event).
 */
class MidiImporter {
    constructor() {
    }

    /**
     * Parse le header chunk MIDI (MThd).
     * @param {ArrayBuffer} buffer - Buffer du fichier MIDI
     * @param {number} offset - Position de départ (0 normalement)
     * @returns {{format: number, numTracks: number, ppq: number, nextOffset: number}}
     * @throws {Error} Si le header est invalide
     * @private
     */
    parseHeader(buffer, offset) {
        const view = new DataView(buffer);
        
        // Vérifier signature "MThd"
        const signature = String.fromCharCode(
            view.getUint8(offset),
            view.getUint8(offset + 1),
            view.getUint8(offset + 2),
            view.getUint8(offset + 3)
        );
        
        if (signature !== 'MThd') {
            throw new Error('Signature MIDI invalide (MThd attendu)');
        }
        
        // Lire la longueur du header (doit être 6)
        const headerLength = view.getUint32(offset + 4);
        if (headerLength !== 6) {
            throw new Error(`Longueur de header invalide: ${headerLength} (6 attendu)`);
        }
        
        // Lire format, numTracks, ppq
        const format = view.getUint16(offset + 8);
        const numTracks = view.getUint16(offset + 10);
        const ppq = view.getUint16(offset + 12);
        
        // Vérifier format supporté (0 ou 1)
        if (format !== 0 && format !== 1) {
            throw new Error(`Format MIDI ${format} non supporté (seulement Format 0 et 1)`);
        }
        
        return {
            format,
            numTracks,
            ppq,
            nextOffset: offset + 14  // 4 (signature) + 4 (length) + 6 (data)
        };
    }
}
```

**Commit:** `feat(midi-import): add MIDI header parsing`

---

### Task 2: Ajouter parsing de Variable Length Quantity (VLQ)

**Objectif:** Parser les delta-times MIDI (format VLQ).

**Test:**
```javascript
describe('MidiImporter - VLQ parsing', () => {
    it('devrait parser un VLQ sur 1 byte (0-127)', () => {
        const importer = new MidiImporter();
        const bytes = new Uint8Array([0x40]);  // 64 en décimal
        
        const result = importer.readVarLength(bytes.buffer, 0);
        
        expect(result.value).to.equal(64);
        expect(result.bytesRead).to.equal(1);
    });
    
    it('devrait parser un VLQ sur 2 bytes', () => {
        const importer = new MidiImporter();
        const bytes = new Uint8Array([0x81, 0x00]);  // 128 en décimal
        
        const result = importer.readVarLength(bytes.buffer, 0);
        
        expect(result.value).to.equal(128);
        expect(result.bytesRead).to.equal(2);
    });
    
    it('devrait parser un VLQ sur 4 bytes (max)', () => {
        const importer = new MidiImporter();
        const bytes = new Uint8Array([0xFF, 0xFF, 0xFF, 0x7F]);  // 0x0FFFFFFF
        
        const result = importer.readVarLength(bytes.buffer, 0);
        
        expect(result.value).to.equal(0x0FFFFFFF);
        expect(result.bytesRead).to.equal(4);
    });
});
```

**Implémentation:**
```javascript
/**
 * Lit une Variable Length Quantity (VLQ) MIDI.
 * Format : chaque byte a un bit de continuation (MSB). Les 7 bits bas sont la valeur.
 * Exemple : 0x81 0x00 = (0000001)(0000000) = 128
 * @param {ArrayBuffer} buffer - Buffer MIDI
 * @param {number} offset - Position de départ
 * @returns {{value: number, bytesRead: number}}
 * @private
 */
readVarLength(buffer, offset) {
    const view = new DataView(buffer);
    let value = 0;
    let bytesRead = 0;
    let currentByte;
    
    do {
        if (bytesRead >= 4) {
            throw new Error('VLQ invalide (plus de 4 bytes)');
        }
        
        currentByte = view.getUint8(offset + bytesRead);
        value = (value << 7) | (currentByte & 0x7F);
        bytesRead++;
    } while (currentByte & 0x80);  // Continue si bit MSB = 1
    
    return { value, bytesRead };
}
```

**Commit:** `feat(midi-import): add Variable Length Quantity parsing`

---

### Task 3: Ajouter parsing d'un track chunk (structure uniquement)

**Objectif:** Parser la structure MTrk (signature, length, events en boucle).

**Test:**
```javascript
describe('MidiImporter - Track structure', () => {
    it('devrait parser un track vide (seulement End of Track)', () => {
        const importer = new MidiImporter();
        // MTrk + length(4) + delta(0) + FF 2F 00 (End of Track)
        const bytes = new Uint8Array([
            0x4D, 0x54, 0x72, 0x6B,  // "MTrk"
            0x00, 0x00, 0x00, 0x04,  // length = 4
            0x00,                    // delta = 0
            0xFF, 0x2F, 0x00         // End of Track
        ]);
        
        const track = importer.parseTrack(bytes.buffer, 0, 480);
        
        expect(track.trackIndex).to.equal(0);
        expect(track.notes).to.be.an('array').that.is.empty;
        expect(track.noteCount).to.equal(0);
    });
});
```

**Implémentation:**
```javascript
/**
 * Parse un track chunk MIDI (MTrk).
 * @param {ArrayBuffer} buffer - Buffer MIDI
 * @param {number} offset - Position du track
 * @param {number} ppq - Pulses per quarter note (du header)
 * @param {number} trackIndex - Index de la piste (pour l'aperçu)
 * @returns {MidiTrack}
 * @throws {Error} Si le track est invalide
 * @private
 */
parseTrack(buffer, offset, ppq, trackIndex = 0) {
    const view = new DataView(buffer);
    
    // Vérifier signature "MTrk"
    const signature = String.fromCharCode(
        view.getUint8(offset),
        view.getUint8(offset + 1),
        view.getUint8(offset + 2),
        view.getUint8(offset + 3)
    );
    
    if (signature !== 'MTrk') {
        throw new Error(`Signature track invalide: ${signature} (MTrk attendu)`);
    }
    
    // Lire la longueur du track
    const trackLength = view.getUint32(offset + 4);
    const trackEnd = offset + 8 + trackLength;
    
    // Initialiser le track
    const track = {
        trackIndex,
        trackName: null,
        notes: [],
        tempo: null,
        noteCount: 0,
        minNote: 127,
        maxNote: 0,
        durationTicks: 0
    };
    
    let currentOffset = offset + 8;
    let currentTick = 0;
    let runningStatus = 0;
    
    // Parser les événements en boucle
    while (currentOffset < trackEnd) {
        // Lire delta-time
        const delta = this.readVarLength(buffer, currentOffset);
        currentOffset += delta.bytesRead;
        currentTick += delta.value;
        
        // Lire status byte (ou réutiliser running status)
        let statusByte = view.getUint8(currentOffset);
        
        if (statusByte < 0x80) {
            // Running status : réutiliser le status précédent
            if (runningStatus === 0) {
                throw new Error('Running status sans status précédent');
            }
            statusByte = runningStatus;
        } else {
            currentOffset++;
            if (statusByte < 0xF0) {
                runningStatus = statusByte;
            }
        }
        
        // Parser l'événement (déléguer à parseEvent)
        const eventResult = this.parseEvent(
            buffer,
            currentOffset,
            statusByte,
            currentTick,
            track
        );
        
        currentOffset = eventResult.nextOffset;
        
        // Arrêter si End of Track
        if (eventResult.isEndOfTrack) {
            break;
        }
    }
    
    track.durationTicks = currentTick;
    track.noteCount = track.notes.length;
    
    return track;
}
```

**Commit:** `feat(midi-import): add MIDI track structure parsing`

---

### Task 4: Ajouter parsing des événements Note On/Off

**Objectif:** Extraire les notes MIDI (événements 0x90 Note On et 0x80 Note Off).

**Test:**
```javascript
describe('MidiImporter - Note events', () => {
    it('devrait parser une Note On et Note Off', () => {
        const importer = new MidiImporter();
        // Track avec : Note On (C4, velocity 80) + delta(480) + Note Off (C4)
        const bytes = new Uint8Array([
            0x4D, 0x54, 0x72, 0x6B,  // "MTrk"
            0x00, 0x00, 0x00, 0x0C,  // length = 12
            0x00,                    // delta = 0
            0x90, 0x3C, 0x50,        // Note On, channel 0, note 60 (C4), velocity 80
            0x83, 0x60,              // delta = 480 (VLQ : 0x83 0x60)
            0x80, 0x3C, 0x00,        // Note Off, channel 0, note 60
            0x00,                    // delta = 0
            0xFF, 0x2F, 0x00         // End of Track
        ]);
        
        const track = importer.parseTrack(bytes.buffer, 0, 480);
        
        expect(track.notes).to.have.lengthOf(1);
        expect(track.notes[0].tick).to.equal(0);
        expect(track.notes[0].midiNumber).to.equal(60);
        expect(track.notes[0].duration).to.equal(480);
        expect(track.notes[0].velocity).to.equal(80);
    });
});
```

**Implémentation:**
```javascript
/**
 * Parse un événement MIDI individuel.
 * Retourne la position suivante et signale si End of Track.
 * Met à jour le track avec les données pertinentes (notes, tempo, track name).
 * @param {ArrayBuffer} buffer - Buffer MIDI
 * @param {number} offset - Position de l'événement (après status byte)
 * @param {number} statusByte - Status byte de l'événement
 * @param {number} currentTick - Tick absolu actuel
 * @param {MidiTrack} track - Track à mettre à jour
 * @returns {{nextOffset: number, isEndOfTrack: boolean}}
 * @private
 */
parseEvent(buffer, offset, statusByte, currentTick, track) {
    const view = new DataView(buffer);
    const eventType = statusByte & 0xF0;
    const channel = statusByte & 0x0F;
    
    // Note Off (0x80)
    if (eventType === 0x80) {
        const note = view.getUint8(offset);
        const velocity = view.getUint8(offset + 1);
        
        // Trouver le Note On correspondant et calculer la durée
        this.closeNoteOn(track.notes, note, currentTick);
        
        return { nextOffset: offset + 2, isEndOfTrack: false };
    }
    
    // Note On (0x90)
    if (eventType === 0x90) {
        const note = view.getUint8(offset);
        const velocity = view.getUint8(offset + 1);
        
        // Note On avec velocity 0 = Note Off
        if (velocity === 0) {
            this.closeNoteOn(track.notes, note, currentTick);
        } else {
            // Ajouter une note "ouverte" (durée sera calculée au Note Off)
            track.notes.push({
                tick: currentTick,
                midiNumber: note,
                duration: -1,  // Temporaire : sera mis à jour au Note Off
                velocity
            });
            
            // Mettre à jour min/max pour l'aperçu
            track.minNote = Math.min(track.minNote, note);
            track.maxNote = Math.max(track.maxNote, note);
        }
        
        return { nextOffset: offset + 2, isEndOfTrack: false };
    }
    
    // Polyphonic Key Pressure (0xA0) - ignorer
    if (eventType === 0xA0) {
        return { nextOffset: offset + 2, isEndOfTrack: false };
    }
    
    // Control Change (0xB0) - ignorer
    if (eventType === 0xB0) {
        return { nextOffset: offset + 2, isEndOfTrack: false };
    }
    
    // Program Change (0xC0) - ignorer
    if (eventType === 0xC0) {
        return { nextOffset: offset + 1, isEndOfTrack: false };
    }
    
    // Channel Pressure (0xD0) - ignorer
    if (eventType === 0xD0) {
        return { nextOffset: offset + 1, isEndOfTrack: false };
    }
    
    // Pitch Bend (0xE0) - ignorer
    if (eventType === 0xE0) {
        return { nextOffset: offset + 2, isEndOfTrack: false };
    }
    
    // Meta Event (0xFF)
    if (statusByte === 0xFF) {
        return this.parseMetaEvent(buffer, offset, track);
    }
    
    // SysEx (0xF0 ou 0xF7) - ignorer
    if (statusByte === 0xF0 || statusByte === 0xF7) {
        const length = this.readVarLength(buffer, offset);
        return { nextOffset: offset + length.bytesRead + length.value, isEndOfTrack: false };
    }
    
    throw new Error(`Événement MIDI inconnu: 0x${statusByte.toString(16)}`);
}

/**
 * Ferme un Note On en calculant sa durée.
 * @param {Array<MidiNote>} notes - Liste des notes du track
 * @param {number} midiNumber - Numéro MIDI de la note à fermer
 * @param {number} currentTick - Tick du Note Off
 * @private
 */
closeNoteOn(notes, midiNumber, currentTick) {
    // Chercher la dernière note "ouverte" avec ce numéro MIDI
    for (let i = notes.length - 1; i >= 0; i--) {
        const note = notes[i];
        if (note.midiNumber === midiNumber && note.duration === -1) {
            note.duration = currentTick - note.tick;
            return;
        }
    }
    
    // Note Off sans Note On correspondant : ignorer silencieusement
}
```

**Commit:** `feat(midi-import): add Note On/Off event parsing`

---

### Task 5: Ajouter parsing des meta-events (tempo et track name)

**Objectif:** Extraire le tempo (0xFF 0x51) et le nom de piste (0xFF 0x03).

**Test:**
```javascript
describe('MidiImporter - Meta events', () => {
    it('devrait extraire le tempo (Set Tempo)', () => {
        const importer = new MidiImporter();
        // Track avec : Set Tempo (120 BPM) + End of Track
        const microsecondsPerQuarter = Math.round(60000000 / 120);  // 500000
        const bytes = new Uint8Array([
            0x4D, 0x54, 0x72, 0x6B,  // "MTrk"
            0x00, 0x00, 0x00, 0x0A,  // length = 10
            0x00,                    // delta = 0
            0xFF, 0x51, 0x03,        // Set Tempo, length = 3
            0x07, 0xA1, 0x20,        // 500000 microseconds/quarter
            0x00,                    // delta = 0
            0xFF, 0x2F, 0x00         // End of Track
        ]);
        
        const track = importer.parseTrack(bytes.buffer, 0, 480);
        
        expect(track.tempo).to.equal(500000);
    });
    
    it('devrait extraire le nom de piste (Track Name)', () => {
        const importer = new MidiImporter();
        // Track avec : Track Name ("Piano") + End of Track
        const bytes = new Uint8Array([
            0x4D, 0x54, 0x72, 0x6B,  // "MTrk"
            0x00, 0x00, 0x00, 0x0C,  // length = 12
            0x00,                    // delta = 0
            0xFF, 0x03, 0x05,        // Track Name, length = 5
            0x50, 0x69, 0x61, 0x6E, 0x6F,  // "Piano"
            0x00,                    // delta = 0
            0xFF, 0x2F, 0x00         // End of Track
        ]);
        
        const track = importer.parseTrack(bytes.buffer, 0, 480);
        
        expect(track.trackName).to.equal('Piano');
    });
});
```

**Implémentation:**
```javascript
/**
 * Parse un meta-event MIDI (0xFF).
 * @param {ArrayBuffer} buffer - Buffer MIDI
 * @param {number} offset - Position après 0xFF
 * @param {MidiTrack} track - Track à mettre à jour
 * @returns {{nextOffset: number, isEndOfTrack: boolean}}
 * @private
 */
parseMetaEvent(buffer, offset, track) {
    const view = new DataView(buffer);
    const metaType = view.getUint8(offset);
    const length = this.readVarLength(buffer, offset + 1);
    const dataOffset = offset + 1 + length.bytesRead;
    
    // Set Tempo (0x51)
    if (metaType === 0x51) {
        if (length.value === 3) {
            const microsecondsPerQuarter = 
                (view.getUint8(dataOffset) << 16) |
                (view.getUint8(dataOffset + 1) << 8) |
                view.getUint8(dataOffset + 2);
            
            // Garder seulement le premier tempo trouvé
            if (track.tempo === null) {
                track.tempo = microsecondsPerQuarter;
            }
        }
    }
    
    // Track Name (0x03)
    if (metaType === 0x03) {
        let name = '';
        for (let i = 0; i < length.value; i++) {
            name += String.fromCharCode(view.getUint8(dataOffset + i));
        }
        track.trackName = name;
    }
    
    // End of Track (0x2F)
    if (metaType === 0x2F) {
        return { nextOffset: dataOffset + length.value, isEndOfTrack: true };
    }
    
    // Autres meta-events : ignorer
    return { nextOffset: dataOffset + length.value, isEndOfTrack: false };
}
```

**Commit:** `feat(midi-import): add meta-event parsing (tempo, track name)`

---

### Task 6: Ajouter méthode publique parseMidiFile

**Objectif:** Point d'entrée principal pour parser un fichier MIDI complet.

**Test:**
```javascript
describe('MidiImporter - Full file parsing', () => {
    it('devrait parser un fichier MIDI Format 0 avec une note', () => {
        const importer = new MidiImporter();
        
        // Construire un fichier MIDI complet
        const headerBytes = [
            0x4D, 0x54, 0x68, 0x64,  // "MThd"
            0x00, 0x00, 0x00, 0x06,  // length = 6
            0x00, 0x00,              // format = 0
            0x00, 0x01,              // numTracks = 1
            0x01, 0xE0               // ppq = 480
        ];
        
        const trackBytes = [
            0x4D, 0x54, 0x72, 0x6B,  // "MTrk"
            0x00, 0x00, 0x00, 0x0C,  // length = 12
            0x00,                    // delta = 0
            0x90, 0x3C, 0x50,        // Note On C4
            0x83, 0x60,              // delta = 480
            0x80, 0x3C, 0x00,        // Note Off C4
            0x00,                    // delta = 0
            0xFF, 0x2F, 0x00         // End of Track
        ];
        
        const fullBytes = new Uint8Array([...headerBytes, ...trackBytes]);
        
        const result = importer.parseMidiFile(fullBytes.buffer);
        
        expect(result.format).to.equal(0);
        expect(result.ppq).to.equal(480);
        expect(result.tracks).to.have.lengthOf(1);
        expect(result.tracks[0].notes).to.have.lengthOf(1);
        expect(result.tracks[0].notes[0].midiNumber).to.equal(60);
    });
});
```

**Implémentation:**
```javascript
/**
 * Parse un fichier MIDI complet.
 * @param {ArrayBuffer} buffer - Contenu du fichier .mid
 * @returns {ParsedMidiFile}
 * @throws {Error} Si le fichier est invalide
 */
parseMidiFile(buffer) {
    const header = this.parseHeader(buffer, 0);
    
    const tracks = [];
    let currentOffset = header.nextOffset;
    
    for (let i = 0; i < header.numTracks; i++) {
        const track = this.parseTrack(buffer, currentOffset, header.ppq, i);
        tracks.push(track);
        
        // Calculer l'offset du prochain track
        const view = new DataView(buffer);
        const trackLength = view.getUint32(currentOffset + 4);
        currentOffset += 8 + trackLength;
    }
    
    return {
        format: header.format,
        ppq: header.ppq,
        tracks
    };
}
```

**Commit:** `feat(midi-import): add full MIDI file parsing entry point`

---

### Task 7: Ajouter conversion MidiTrack → scoreData

**Objectif:** Convertir un MidiTrack en scoreData compatible avec le Parser/Renderer.

**Test:**
```javascript
describe('MidiImporter - Track to ScoreData', () => {
    it('devrait convertir un track en scoreData avec notes', () => {
        const importer = new MidiImporter();
        
        const track = {
            trackIndex: 0,
            trackName: 'Piano',
            notes: [
                { tick: 0, midiNumber: 60, duration: 480, velocity: 80 },     // C4, noire
                { tick: 480, midiNumber: 62, duration: 480, velocity: 80 },   // D4, noire
                { tick: 960, midiNumber: 64, duration: 960, velocity: 80 }    // E4, blanche
            ],
            tempo: 500000,  // 120 BPM
            noteCount: 3,
            minNote: 60,
            maxNote: 64,
            durationTicks: 1920
        };
        
        const scoreData = importer.trackToScoreData(track, 480, 120);
        
        expect(scoreData.title).to.equal('Piano');
        expect(scoreData.tempo).to.equal(120);
        expect(scoreData.timeSignature).to.deep.equal({ numerator: 4, denominator: 4 });
        expect(scoreData.clef).to.equal('sol');
        expect(scoreData.keySignature).to.be.an('array').that.is.empty;
        expect(scoreData.notes).to.have.lengthOf(3);
        
        // Vérifier première note : C4 → Do, octave 0, durée 1 (noire)
        expect(scoreData.notes[0].type).to.equal('note');
        expect(scoreData.notes[0].note).to.equal('C');
        expect(scoreData.notes[0].octave).to.equal(0);
        expect(scoreData.notes[0].duration).to.equal(1);
        expect(scoreData.notes[0].alteration).to.equal('');
    });
    
    it('devrait ajouter des silences pour combler les gaps', () => {
        const importer = new MidiImporter();
        
        const track = {
            trackIndex: 0,
            trackName: null,
            notes: [
                { tick: 0, midiNumber: 60, duration: 480, velocity: 80 },     // C4 à tick 0
                { tick: 960, midiNumber: 62, duration: 480, velocity: 80 }    // D4 à tick 960 (gap de 480 ticks)
            ],
            tempo: null,
            noteCount: 2,
            minNote: 60,
            maxNote: 62,
            durationTicks: 1440
        };
        
        const scoreData = importer.trackToScoreData(track, 480, 120);
        
        expect(scoreData.notes).to.have.lengthOf(3);
        expect(scoreData.notes[0].type).to.equal('note');  // C4
        expect(scoreData.notes[1].type).to.equal('rest');  // Silence de 480 ticks = 1 noire
        expect(scoreData.notes[1].duration).to.equal(1);
        expect(scoreData.notes[2].type).to.equal('note');  // D4
    });
});
```

**Implémentation:**
```javascript
/**
 * Convertit un MidiTrack en scoreData compatible avec l'éditeur.
 * @param {MidiTrack} track - Track MIDI à convertir
 * @param {number} ppq - Pulses per quarter note
 * @param {number} defaultTempo - Tempo par défaut si non spécifié dans le track (BPM)
 * @returns {Object} scoreData compatible avec Parser/Renderer
 */
trackToScoreData(track, ppq, defaultTempo = 120) {
    // Calculer le tempo en BPM
    let tempoBpm = defaultTempo;
    if (track.tempo !== null) {
        tempoBpm = Math.round(60000000 / track.tempo);
    }
    
    // Titre : nom de piste ou "Partition importée"
    const title = track.trackName || 'Partition importée';
    
    // Trier les notes par tick
    const sortedNotes = [...track.notes].sort((a, b) => a.tick - b.tick);
    
    // Convertir les notes MIDI en notes/silences
    const notes = [];
    let currentTick = 0;
    
    for (const midiNote of sortedNotes) {
        // Ajouter un silence si gap
        if (midiNote.tick > currentTick) {
            const gapTicks = midiNote.tick - currentTick;
            const gapDuration = gapTicks / ppq;
            
            notes.push({
                type: 'rest',
                duration: gapDuration
            });
        }
        
        // Convertir la note MIDI
        const noteData = this.midiNumberToNote(midiNote.midiNumber);
        const duration = midiNote.duration / ppq;
        
        notes.push({
            type: 'note',
            note: noteData.note,
            alteration: noteData.alteration,
            octave: noteData.octave,
            duration
        });
        
        currentTick = midiNote.tick + midiNote.duration;
    }
    
    return {
        title,
        tempo: tempoBpm,
        timeSignature: { numerator: 4, denominator: 4 },  // Par défaut 4/4
        clef: 'sol',
        keySignature: [],  // Pas d'armure par défaut
        notes
    };
}

/**
 * Convertit un numéro MIDI (0-127) en note + altération + octave.
 * Système MIDI : C4 (Do médium) = 60
 * Préfère les dièses aux bémols (Do# plutôt que Réb).
 * @param {number} midiNumber - Numéro MIDI (0-127)
 * @returns {{note: string, alteration: string, octave: number}}
 * @private
 */
midiNumberToNote(midiNumber) {
    // Clamping
    midiNumber = Math.max(0, Math.min(127, midiNumber));
    
    // Octave : C4 = 60, donc octave = floor((midiNumber - 60) / 12)
    // Mais pour l'éditeur, octave 0 = médium (C4), donc on ajuste
    const octave = Math.floor((midiNumber - 60) / 12);
    
    // Note dans l'octave (0-11)
    const noteInOctave = midiNumber % 12;
    
    // Mapping : préférer dièses (Do, Do#, Ré, Ré#, Mi, Fa, Fa#, Sol, Sol#, La, La#, Si)
    const noteMap = [
        { note: 'C', alteration: '' },      // 0 : Do
        { note: 'C', alteration: 'sharp' }, // 1 : Do#
        { note: 'D', alteration: '' },      // 2 : Ré
        { note: 'D', alteration: 'sharp' }, // 3 : Ré#
        { note: 'E', alteration: '' },      // 4 : Mi
        { note: 'F', alteration: '' },      // 5 : Fa
        { note: 'F', alteration: 'sharp' }, // 6 : Fa#
        { note: 'G', alteration: '' },      // 7 : Sol
        { note: 'G', alteration: 'sharp' }, // 8 : Sol#
        { note: 'A', alteration: '' },      // 9 : La
        { note: 'A', alteration: 'sharp' }, // 10 : La#
        { note: 'B', alteration: '' }       // 11 : Si
    ];
    
    return {
        note: noteMap[noteInOctave].note,
        alteration: noteMap[noteInOctave].alteration,
        octave
    };
}
```

**Commit:** `feat(midi-import): add MidiTrack to scoreData conversion`

---

### Task 8: Ajouter bouton import et input file dans index.html

**Objectif:** Ajouter les éléments HTML nécessaires à l'import.

**Test:** Vérifier visuellement que le bouton apparaît.

**Implémentation:**
```html
<!-- Dans index.html, section .actions, après btn-example -->

<button id="btn-import-midi" class="btn-secondary">📂 Importer MIDI</button>
<input type="file" id="midi-file-input" accept=".mid,.midi" style="display:none;">
```

**Commit:** `feat(midi-import): add import button and file input to UI`

---

### Task 9: Ajouter modale de sélection de piste dans index.html

**Objectif:** Structure HTML pour la modale de sélection multi-pistes.

**Test:** Vérifier visuellement la structure en ouvrant la modale via JS console.

**Implémentation:**
```html
<!-- Après la modale #transpose-modal, avant la fermeture de body -->

<!-- Modale de sélection de piste MIDI -->
<div id="track-selection-modal" class="modal-overlay" style="display: none;">
    <div class="modal-content">
        <h2>📂 Sélectionner une piste MIDI</h2>
        <p class="modal-subtitle">Ce fichier contient plusieurs pistes. Choisissez celle à afficher :</p>
        <div id="track-list" class="track-list">
            <!-- Les cartes de pistes seront générées dynamiquement -->
        </div>
        <div class="modal-actions">
            <button id="btn-cancel-track-selection" class="btn-secondary">
                Annuler
            </button>
        </div>
    </div>
</div>
```

**Commit:** `feat(midi-import): add track selection modal HTML structure`

---

### Task 10: Ajouter styles CSS pour la modale de sélection

**Objectif:** Styliser la modale et les cartes de pistes.

**Test:** Vérifier visuellement le rendu avec des données de test.

**Implémentation:**
```css
/* Ajouter à styles.css */

/* Liste de pistes */
.track-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    max-height: 400px;
    overflow-y: auto;
    margin: 1.5rem 0;
}

/* Carte de piste */
.track-preview-card {
    border: 2px solid #ddd;
    border-radius: 8px;
    padding: 1rem;
    cursor: pointer;
    transition: all 0.2s ease;
    background: #f9f9f9;
}

.track-preview-card:hover {
    border-color: #667eea;
    background: #f0f0ff;
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(102, 126, 234, 0.2);
}

.track-preview-card h3 {
    margin: 0 0 0.5rem 0;
    font-size: 1.1rem;
    color: #333;
}

.track-preview-card .track-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    font-size: 0.9rem;
    color: #666;
}

.track-preview-card .track-info strong {
    color: #333;
}

/* Scrollbar custom pour .track-list */
.track-list::-webkit-scrollbar {
    width: 8px;
}

.track-list::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 4px;
}

.track-list::-webkit-scrollbar-thumb {
    background: #ccc;
    border-radius: 4px;
}

.track-list::-webkit-scrollbar-thumb:hover {
    background: #aaa;
}
```

**Commit:** `feat(midi-import): add CSS styles for track selection modal`

---

### Task 11: Ajouter handler handleImportMidi dans app.js

**Objectif:** Gérer le clic sur "Importer MIDI" et lire le fichier.

**Test:** Vérifier manuellement qu'un clic ouvre le sélecteur de fichiers.

**Implémentation:**
```javascript
// Dans app.js, après la déclaration de midiExporter

let midiImporter;

// Dans la fonction init(), après l'initialisation de jazzTransformer

midiImporter = new MidiImporter();

// Bouton import MIDI
document.getElementById('btn-import-midi').addEventListener('click', handleImportMidi);

// Input file (changement de fichier)
document.getElementById('midi-file-input').addEventListener('change', handleFileSelected);

/**
 * Gère le clic sur le bouton "Importer MIDI".
 * Ouvre le sélecteur de fichiers.
 */
function handleImportMidi() {
    const fileInput = document.getElementById('midi-file-input');
    fileInput.value = '';  // Reset pour permettre de réimporter le même fichier
    fileInput.click();
}

/**
 * Gère la sélection d'un fichier MIDI.
 * @param {Event} event - Événement change de l'input file
 */
function handleFileSelected(event) {
    const file = event.target.files[0];
    
    if (!file) {
        return;
    }
    
    // Vérifier l'extension
    if (!file.name.match(/\.(mid|midi)$/i)) {
        showError('Format de fichier invalide. Veuillez sélectionner un fichier .mid ou .midi');
        return;
    }
    
    // Lire le fichier
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            const arrayBuffer = e.target.result;
            const parsedMidi = midiImporter.parseMidiFile(arrayBuffer);
            
            // Filtrer les pistes avec au moins une note
            const tracksWithNotes = parsedMidi.tracks.filter(track => track.noteCount > 0);
            
            if (tracksWithNotes.length === 0) {
                showError('Aucune note trouvée dans ce fichier MIDI');
                return;
            }
            
            // Si une seule piste : importer directement
            if (tracksWithNotes.length === 1) {
                importTrack(tracksWithNotes[0], parsedMidi.ppq);
                return;
            }
            
            // Sinon : afficher la modale de sélection
            showTrackSelectionModal(tracksWithNotes, parsedMidi.ppq);
            
        } catch (error) {
            showError(`Erreur lors de l'import MIDI : ${error.message}`);
            console.error(error);
        }
    };
    
    reader.onerror = function() {
        showError('Erreur lors de la lecture du fichier');
    };
    
    reader.readAsArrayBuffer(file);
}
```

**Commit:** `feat(midi-import): add file import handler in app.js`

---

### Task 12: Ajouter fonction showTrackSelectionModal

**Objectif:** Afficher la modale avec les pistes disponibles.

**Test:** Vérifier visuellement avec un fichier MIDI multi-pistes.

**Implémentation:**
```javascript
/**
 * Affiche la modale de sélection de piste MIDI.
 * @param {Array<MidiTrack>} tracks - Liste des pistes avec notes
 * @param {number} ppq - Pulses per quarter note
 */
function showTrackSelectionModal(tracks, ppq) {
    const modal = document.getElementById('track-selection-modal');
    const trackList = document.getElementById('track-list');
    
    // Vider la liste
    trackList.innerHTML = '';
    
    // Générer les cartes de pistes
    tracks.forEach((track, index) => {
        const card = document.createElement('div');
        card.className = 'track-preview-card';
        
        // Nom de piste ou "Piste N"
        const trackName = track.trackName || `Piste ${track.trackIndex + 1}`;
        
        // Calculer la durée en secondes (approximatif, basé sur tempo 120 BPM si non spécifié)
        const tempoBpm = track.tempo ? Math.round(60000000 / track.tempo) : 120;
        const durationSeconds = Math.round((track.durationTicks / ppq) * (60 / tempoBpm));
        
        // Formater la durée
        const minutes = Math.floor(durationSeconds / 60);
        const seconds = durationSeconds % 60;
        const durationStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        // Plage de notes
        const minNoteName = formatMidiNote(track.minNote);
        const maxNoteName = formatMidiNote(track.maxNote);
        
        card.innerHTML = `
            <h3>${trackName}</h3>
            <div class="track-info">
                <div><strong>Notes :</strong> ${track.noteCount}</div>
                <div><strong>Plage :</strong> ${minNoteName} - ${maxNoteName}</div>
                <div><strong>Durée :</strong> ${durationStr}</div>
                ${track.tempo ? `<div><strong>Tempo :</strong> ${tempoBpm} BPM</div>` : ''}
            </div>
        `;
        
        // Clic sur la carte : importer cette piste
        card.addEventListener('click', () => {
            modal.style.display = 'none';
            importTrack(track, ppq);
        });
        
        trackList.appendChild(card);
    });
    
    // Afficher la modale
    modal.style.display = 'flex';
}

/**
 * Formate un numéro MIDI en nom de note lisible (ex: 60 → "Do4").
 * @param {number} midiNumber - Numéro MIDI (0-127)
 * @returns {string} Nom de note (ex: "Do4", "Fa#2")
 */
function formatMidiNote(midiNumber) {
    const noteNames = ['Do', 'Do#', 'Ré', 'Ré#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si'];
    const octave = Math.floor(midiNumber / 12) - 1;
    const noteName = noteNames[midiNumber % 12];
    return `${noteName}${octave}`;
}

// Bouton annuler la sélection de piste
document.getElementById('btn-cancel-track-selection').addEventListener('click', () => {
    document.getElementById('track-selection-modal').style.display = 'none';
});
```

**Commit:** `feat(midi-import): add track selection modal display logic`

---

### Task 13: Ajouter fonction importTrack

**Objectif:** Importer une piste sélectionnée dans l'éditeur.

**Test:** Vérifier manuellement qu'une piste importée remplit la textarea et génère la partition.

**Implémentation:**
```javascript
/**
 * Importe une piste MIDI dans l'éditeur.
 * Convertit la piste en scoreData, puis en notation française, et génère la partition.
 * @param {MidiTrack} track - Piste à importer
 * @param {number} ppq - Pulses per quarter note
 */
function importTrack(track, ppq) {
    try {
        // Convertir en scoreData
        const scoreData = midiImporter.trackToScoreData(track, ppq);
        
        // Convertir en texte notation française
        const text = scoreToText(scoreData);
        
        // Remplir la textarea
        const textarea = document.getElementById('partition-input');
        textarea.value = text;
        
        // Générer la partition automatiquement
        handleRender();
        
        // Message de succès
        showSuccess(`Piste "${scoreData.title}" importée avec succès (${track.noteCount} notes)`);
        
    } catch (error) {
        showError(`Erreur lors de l'import de la piste : ${error.message}`);
        console.error(error);
    }
}

/**
 * Affiche un message de succès temporaire.
 * @param {string} message - Message à afficher
 */
function showSuccess(message) {
    const errorDiv = document.getElementById('error-message');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    errorDiv.style.background = '#d4edda';
    errorDiv.style.color = '#155724';
    errorDiv.style.borderColor = '#c3e6cb';
    
    // Masquer après 5 secondes
    setTimeout(() => {
        errorDiv.style.display = 'none';
        errorDiv.style.background = '';
        errorDiv.style.color = '';
        errorDiv.style.borderColor = '';
    }, 5000);
}
```

**Commit:** `feat(midi-import): add track import and success message`

---

### Task 14: Ajouter script tag pour midi-import.js dans index.html

**Objectif:** Charger le nouveau module dans la page.

**Test:** Vérifier qu'aucune erreur de chargement n'apparaît dans la console.

**Implémentation:**
```html
<!-- Dans index.html, avant la fermeture de body, après midi-export.js -->

<script src="midi-import.js"></script>
```

**Commit:** `feat(midi-import): load midi-import.js module in index.html`

---

### Task 15: Tester l'import avec un fichier MIDI Format 0 simple

**Objectif:** Test end-to-end avec un fichier réel.

**Test manuel:**
1. Créer un fichier MIDI simple avec MuseScore ou en ligne (ex: https://onlinesequencer.net/)
2. Importer dans l'application
3. Vérifier que :
   - La textarea est remplie
   - La partition est générée
   - Les notes sont correctes
   - Le tempo est correct

**Validation:**
- Tester avec "Au clair de la lune" : Do Do Do Ré Mi Mi Ré Ré Do
- Vérifier que les octaves sont préservés
- Vérifier que les silences sont ajoutés si nécessaire

**Commit:** `test(midi-import): validate Format 0 single-track import`

---

### Task 16: Tester l'import avec un fichier MIDI Format 1 multi-pistes

**Objectif:** Test end-to-end avec multi-pistes.

**Test manuel:**
1. Créer un fichier MIDI avec 3 pistes (mélodie, basse, batterie)
2. Importer dans l'application
3. Vérifier que :
   - La modale de sélection apparaît
   - Les 3 pistes (ou seulement celles avec notes) sont listées
   - Les infos (nombre de notes, plage, durée) sont correctes
   - Cliquer sur chaque piste fonctionne
   - La piste batterie (pas de notes mélodiques) est filtrée ou affichée avec avertissement

**Validation:**
- Tester avec un fichier MIDI d'un DAW (GarageBand, Logic, Ableton)
- Vérifier que les noms de pistes (Track Name meta-event) sont affichés

**Commit:** `test(midi-import): validate Format 1 multi-track import`

---

### Task 17: Gérer les cas limites (fichiers corrompus, formats inconnus)

**Objectif:** Robustesse face aux entrées invalides.

**Test:**
1. Tester avec un fichier non-MIDI (ex: .txt renommé en .mid)
2. Tester avec un fichier MIDI tronqué
3. Tester avec un fichier MIDI Format 2 (non supporté)
4. Tester avec un fichier MIDI sans notes

**Validation:**
- Tous les cas affichent un message d'erreur clair
- Aucun crash de l'application
- Les erreurs sont loggées dans la console pour le debug

**Corrections si nécessaire:**
```javascript
// Dans parseMidiFile, ajouter validation stricte
if (buffer.byteLength < 14) {
    throw new Error('Fichier MIDI trop court (header incomplet)');
}

// Dans parseTrack, ajouter timeout pour éviter les boucles infinies
let iterations = 0;
const MAX_ITERATIONS = 100000;

while (currentOffset < trackEnd) {
    if (iterations++ > MAX_ITERATIONS) {
        throw new Error('Parsing suspendu (boucle infinie détectée)');
    }
    // ...
}
```

**Commit:** `fix(midi-import): handle edge cases and corrupted files`

---

### Task 18: Ajouter documentation dans CLAUDE.md

**Objectif:** Documenter la nouvelle fonctionnalité.

**Implémentation:**
```markdown
<!-- Ajouter après la section "🎷 Arrangement Jazz" -->

## 📂 Import MIDI

L'application permet d'importer un fichier MIDI (.mid) et de le convertir en notation française pour l'afficher et l'éditer.

### Fonctionnement

1. **Sélection du fichier** : Clic sur "📂 Importer MIDI" → sélecteur de fichiers
2. **Parsing** : Extraction des notes et du tempo (autres features MIDI ignorées)
3. **Sélection de piste** : Si multi-pistes, modale avec aperçu (nombre de notes, plage, durée)
4. **Conversion** : scoreData → notation française → remplissage de la textarea
5. **Génération** : Rendu automatique de la partition

### Formats supportés

- **MIDI Format 0** : Piste unique (import direct)
- **MIDI Format 1** : Multi-pistes (sélection manuelle)
- **MIDI Format 2** : Non supporté (erreur)

### Features MIDI extraites

- **Notes** : Note On (0x90) et Note Off (0x80)
- **Tempo** : Set Tempo meta-event (0xFF 0x51)
- **Nom de piste** : Track Name meta-event (0xFF 0x03)

### Features MIDI ignorées

Toutes les autres features sont ignorées silencieusement :
- Contrôleurs (CC, 0xB0)
- Pitch bend (0xE0)
- Program Change (0xC0)
- Channel/Polyphonic Pressure (0xD0, 0xA0)
- SysEx (0xF0, 0xF7)
- Autres meta-events (paroles, marqueurs, etc.)

### Module midi-import.js

**Classe** : `MidiImporter`

**Méthodes principales** :
- `parseMidiFile(arrayBuffer)` → `ParsedMidiFile`
- `trackToScoreData(track, ppq, defaultTempo)` → `scoreData`

**Méthodes privées** :
- `parseHeader(buffer, offset)` → header info
- `parseTrack(buffer, offset, ppq, trackIndex)` → `MidiTrack`
- `parseEvent(buffer, offset, statusByte, currentTick, track)` → event info
- `parseMetaEvent(buffer, offset, track)` → meta-event info
- `readVarLength(buffer, offset)` → VLQ value
- `closeNoteOn(notes, midiNumber, currentTick)` → calcule durée
- `midiNumberToNote(midiNumber)` → {note, alteration, octave}

### Conversion MIDI → Notation française

**Numérotation MIDI** : C4 (Do médium) = 60
**Altérations** : Préférence pour les dièses (Do# plutôt que Réb)
**Silences** : Ajoutés automatiquement pour combler les gaps entre notes
**Tempo** : Converti de μs/quarter en BPM
**Armure** : Vide par défaut (pas d'information dans MIDI)
**Chiffrage** : 4/4 par défaut (pas d'extraction du Time Signature meta-event pour l'instant)

### Interface utilisateur

**Modale de sélection de piste** :
- Liste verticale de cartes cliquables
- Informations par piste :
  - Nom (Track Name ou "Piste N")
  - Nombre de notes
  - Plage (note min - note max)
  - Durée (mm:ss)
  - Tempo (si spécifié)
- Bouton "Annuler"

### Limitations

- ⚠️ Pas de support des accords simultanés (polyphonie intra-tick) → convertis en notes séparées
- ⚠️ Pas d'extraction du Time Signature (toujours 4/4 par défaut)
- ⚠️ Pas de support des nuances (velocity ignorée)
- ⚠️ Pas de détection automatique de clef (toujours clef de sol)
- ⚠️ Pas de détection automatique d'armure (optimisation manuelle possible via options avancées)

### Cas d'usage

- Importer une mélodie MIDI pour l'éditer
- Transcrire un fichier MIDI d'un DAW
- Récupérer les notes d'un morceau depuis MuseScore/Finale
- Partager une partition entre différents outils

---
```

**Commit:** `docs(midi-import): add MIDI import feature documentation`

---

### Task 19: Commit final et vérification

**Objectif:** Vérifier que tout est commité et que le plan est complet.

**Vérifications:**
```bash
# Vérifier que tous les fichiers sont suivis
git status

# Vérifier que chaque task a son commit
git log --oneline | grep -E '(feat|fix|test|docs)\(midi-import\)'

# Compter les commits (doit être >= 18)
git log --oneline --grep='midi-import' | wc -l

# Vérifier qu'aucun fichier n'est modifié
[ -z "$(git status --porcelain)" ] && echo "✅ Tout est commité" || echo "❌ Fichiers non commités"
```

**Commit du plan:**
```bash
git add docs/plans/2026-06-26-midi-import.md
git commit -m "docs(midi-import): add implementation plan"
```

---

## Résumé de l'architecture

### Flux de données

```
Fichier .mid (ArrayBuffer)
    ↓
MidiImporter.parseMidiFile()
    ↓
ParsedMidiFile { format, ppq, tracks: [MidiTrack, ...] }
    ↓
[Si multi-pistes] → Modale sélection → track choisi
    ↓
MidiImporter.trackToScoreData(track, ppq)
    ↓
scoreData { title, tempo, timeSignature, clef, keySignature, notes }
    ↓
scoreToText(scoreData)
    ↓
Notation française (textarea)
    ↓
Parser.parse() + Renderer.render()
    ↓
Canvas HTML5
```

### Fichiers modifiés/créés

**Créés:**
- `midi-import.js` (classe MidiImporter)
- `tests/test-midi-import.html` (tests unitaires)
- `docs/plans/2026-06-26-midi-import.md` (ce plan)

**Modifiés:**
- `index.html` (bouton, input file, modale)
- `styles.css` (styles modale et cartes)
- `app.js` (handlers, showTrackSelectionModal, importTrack, showSuccess)
- `CLAUDE.md` (documentation)

---

## Checklist finale

- [x] Parsing MIDI binaire (header, tracks, VLQ)
- [x] Extraction notes (Note On/Off)
- [x] Extraction tempo (Set Tempo meta-event)
- [x] Extraction nom de piste (Track Name meta-event)
- [x] Ignorer les features non supportées
- [x] Conversion MidiTrack → scoreData
- [x] Conversion MIDI number → note + octave
- [x] Ajout automatique de silences (gaps)
- [x] UI : bouton import + input file
- [x] UI : modale sélection multi-pistes
- [x] UI : cartes de pistes avec aperçu
- [x] Handlers : handleImportMidi, handleFileSelected
- [x] Fonction importTrack (scoreData → texte → textarea → render)
- [x] Message de succès
- [x] Gestion des erreurs (fichiers corrompus, formats inconnus)
- [x] Tests unitaires (parsing header, VLQ, tracks, notes, meta-events)
- [x] Tests end-to-end (Format 0, Format 1, cas limites)
- [x] Documentation CLAUDE.md
- [x] Commits atomiques (1 task = 1 commit)

---

**Plan prêt pour exécution par un agent agentic.** ✅
