/**
 * MIDI-EXPORT.JS
 *
 * Module d'export de fichiers MIDI
 * Génère des fichiers .mid au format SMF (Standard MIDI File) Format 0
 */

class MidiExporter {
    constructor() {
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

        const midiNumber = 60 + semitone;

        return Math.max(0, Math.min(127, midiNumber));
    }

    /**
     * Génère les événements MIDI à partir des données de partition
     * @param {Object} scoreData - Données parsées (tempo, notes, etc.)
     * @returns {Array} Liste d'événements MIDI triés par temps
     */
    generateMidiEvents(scoreData) {
        const events = [];
        const ppq = 480;
        let currentTick = 0;

        for (const item of scoreData.notes) {
            const durationTicks = Math.round(item.duration * ppq);

            if (item.type === 'rest') {
                currentTick += durationTicks;
            } else if (item.type === 'note') {
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

        events.sort((a, b) => a.tick - b.tick);

        return events;
    }

    /**
     * Encode un entier en Variable Length Quantity (format MIDI)
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
        trackData.push(Math.log2(scoreData.timeSignature.denominator));
        trackData.push(24); // MIDI clocks per metronome click
        trackData.push(8); // 32nds per quarter note

        // Événements MIDI (note on/off)
        for (const event of events) {
            const deltaTime = event.tick - lastTick;
            trackData.push(...this.writeVarLength(deltaTime));

            if (event.type === 'note_on') {
                trackData.push(0x90 | event.channel);
                trackData.push(event.note);
                trackData.push(event.velocity);
            } else if (event.type === 'note_off') {
                trackData.push(0x80 | event.channel);
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

    /**
     * Exporte la partition en fichier MIDI et déclenche le téléchargement
     * @param {Object} scoreData - Données de partition parsées
     * @param {string} filename - Nom du fichier (sans extension)
     */
    export(scoreData, filename) {
        const ppq = 480;

        const events = this.generateMidiEvents(scoreData);

        const headerBytes = this.buildHeaderChunk(ppq);
        const trackBytes = this.buildTrackChunk(scoreData, events);

        const midiBytes = new Uint8Array([...headerBytes, ...trackBytes]);

        const blob = new Blob([midiBytes], { type: 'audio/midi' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `${filename}.mid`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        URL.revokeObjectURL(url);
    }
}
