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

        if (!(note in noteValues)) {
            throw new Error(`Unknown note: ${note}`);
        }

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
     * Calcule l'altération réelle d'une note à partir de la note
     * et des altérations à l'armure
     * @param {Object} note - la note
     * @param {Map} keySignature - altérations à l'armure
     * @returns {String} Altération à prendre en compte.
     */
    computeAlteration(note, keySignature) {
        // Altération explicite : on la prend telle quelle
        // Pas d'altération : on regarde à l'armure (ou on renvoie "pas d'altération")
        return note.alteration || keySignature[note.note] || '';
    }

    /**
     * Génère les événements MIDI à partir des données de partition
     * @param {Object} scoreData - Données parsées (tempo, notes, etc.)
     * @returns {Array} Liste d'événements MIDI triés par temps
     */
    generateMidiEvents(scoreData) {
        if (!scoreData || !Array.isArray(scoreData.notes)) {
            return [];
        }

        const events = [];
        const ppq = 480;
        let currentTick = 0;

        const signatures = [];
        scoreData.keySignature.map(x=>signatures[x.note] = x.alteration)

        for (const item of scoreData.notes) {
            const durationTicks = Math.round(item.duration * ppq);

            if (item.type === 'rest') {
                currentTick += durationTicks;
            } else if (item.type === 'note') {
                const midiNumber = this.noteToMidiNumber(item.note, this.computeAlteration(item, signatures), item.octave);
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
                        this.computeAlteration(noteData, signatures),
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
        if (value < 0) {
            throw new Error(`VLQ value cannot be negative: ${value}`);
        }
        if (value > 0x0FFFFFFF) {
            throw new Error(`VLQ value exceeds MIDI maximum (268435455): ${value}`);
        }

        const bytes = [];

        // Extract 7-bit groups from LSB to MSB
        bytes.push(value & 0x7F);
        value >>= 7;

        while (value > 0) {
            bytes.push((value & 0x7F) | 0x80);
            value >>= 7;
        }

        // Reverse to get MSB-first order
        return bytes.reverse();
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
     * @param {number} format - Format MIDI (0 = single track, 1 = multi-track)
     * @param {number} numTracks - Nombre de pistes
     * @param {number} ppq - Pulses per quarter note
     * @returns {Array<number>} Bytes du header chunk
     */
    buildHeaderChunk(format, numTracks, ppq) {
        const bytes = [];

        // "MThd" (4 bytes)
        bytes.push(...this.writeString('MThd'));

        // Taille du header (toujours 6 bytes)
        bytes.push(...this.writeUint32(6));

        // Format (0 ou 1)
        bytes.push(...this.writeUint16(format));

        // Nombre de pistes
        bytes.push(...this.writeUint16(numTracks));

        // Division temporelle (ticks per quarter note)
        bytes.push(...this.writeUint16(ppq));

        return bytes;
    }

    /**
     * Construit le chunk track MIDI (MTrk)
     * @param {Object} scoreData - Données de partition
     * @param {Array} events - Événements MIDI générés
     * @param {number} program - Numéro de programme MIDI (0-127)
     * @param {number} channel - Canal MIDI (0-15)
     * @param {string} trackName - Nom de la piste (optionnel)
     * @returns {Array<number>} Bytes du track chunk
     */
    buildTrackChunk(scoreData, events, program = 0, channel = 0, trackName = null) {
        const trackData = [];
        let lastTick = 0;

        // Événement meta : Track Name
        const name = trackName || scoreData.title;
        if (name) {
            trackData.push(0); // Delta time 0
            trackData.push(0xFF); // Meta event
            trackData.push(0x03); // Track name
            const nameBytes = this.writeString(name);
            trackData.push(...this.writeVarLength(nameBytes.length));
            trackData.push(...nameBytes);
        }

        // Événement meta : Set Tempo (uniquement sur la première piste)
        if (channel === 0) {
            if (!scoreData.tempo || scoreData.tempo <= 0) {
                throw new Error(`Invalid tempo: ${scoreData.tempo}. Must be a positive number.`);
            }
            const microsecondsPerQuarter = Math.round(60000000 / scoreData.tempo);
            trackData.push(0); // Delta time 0
            trackData.push(0xFF); // Meta event
            trackData.push(0x51); // Set tempo
            trackData.push(0x03); // Taille (toujours 3 bytes)
            trackData.push((microsecondsPerQuarter >> 16) & 0xFF);
            trackData.push((microsecondsPerQuarter >> 8) & 0xFF);
            trackData.push(microsecondsPerQuarter & 0xFF);

            // Événement meta : Time Signature (uniquement sur la première piste)
            if (!scoreData.timeSignature) {
                throw new Error('Missing timeSignature in scoreData');
            }
            trackData.push(0); // Delta time 0
            trackData.push(0xFF); // Meta event
            trackData.push(0x58); // Time signature
            trackData.push(0x04); // Taille (toujours 4 bytes)
            trackData.push(scoreData.timeSignature.numerator);
            trackData.push(Math.log2(scoreData.timeSignature.denominator));
            trackData.push(24); // MIDI clocks per metronome click
            trackData.push(8); // 32nds per quarter note
        }

        // Événement MIDI : Program Change (0xC0)
        trackData.push(0); // Delta time 0
        trackData.push(0xC0 | channel); // Program Change sur le canal spécifié
        trackData.push(program); // Numéro de programme MIDI (0-127)

        // Événements MIDI (note on/off) avec le canal spécifié
        for (const event of events) {
            const deltaTime = event.tick - lastTick;
            trackData.push(...this.writeVarLength(deltaTime));

            if (event.type === 'note_on') {
                trackData.push(0x90 | channel);
                trackData.push(event.note);
                trackData.push(event.velocity);
            } else if (event.type === 'note_off') {
                trackData.push(0x80 | channel);
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
     * Génère un Blob MIDI en mémoire (sans téléchargement) - Format 0 single track
     * @param {Object} scoreData - Données de partition parsées
     * @param {number} program - Numéro de programme MIDI (0-127)
     * @returns {Blob} Blob MIDI de type 'audio/midi'
     */
    generateMidiFile(scoreData, program = 0) {
        const ppq = 480;

        const events = this.generateMidiEvents(scoreData);

        const headerBytes = this.buildHeaderChunk(0, 1, ppq);
        const trackBytes = this.buildTrackChunk(scoreData, events, program, 0, null);

        const midiBytes = new Uint8Array([...headerBytes, ...trackBytes]);

        return new Blob([midiBytes], { type: 'audio/midi' });
    }

    /**
     * Exporte la partition en fichier MIDI et déclenche le téléchargement - Format 0 single track
     * @param {Object} scoreData - Données de partition parsées
     * @param {string} filename - Nom du fichier (sans extension)
     * @param {number} program - Numéro de programme MIDI (0-127)
     */
    export(scoreData, filename, program = 0, gmName = null) {
        const ppq = 480;

        const events = this.generateMidiEvents(scoreData);

        const headerBytes = this.buildHeaderChunk(0, 1, ppq);
        const trackBytes = this.buildTrackChunk(scoreData, events, program, 0, gmName);

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

    /**
     * Exporte la partition en fichier MIDI multi-pistes (Format 1)
     * Chaque instrument sélectionné génère une piste avec les mêmes notes
     * @param {Object} scoreData - Données de partition parsées
     * @param {string} filename - Nom du fichier (sans extension)
     * @param {Array<Object>} instruments - Tableau d'objets {name, program, emoji}
     */
    exportMultiTrack(scoreData, filename, instruments) {
        if (!instruments || instruments.length === 0) {
            throw new Error('Au moins un instrument doit être sélectionné');
        }

        if (instruments.length > 16) {
            throw new Error('Maximum 16 instruments (limitation MIDI : 16 canaux)');
        }

        const ppq = 480;

        const events = this.generateMidiEvents(scoreData);

        const headerBytes = this.buildHeaderChunk(1, instruments.length, ppq);

        const allTrackBytes = [];

        for (let i = 0; i < instruments.length; i++) {
            const instrument = instruments[i];
            const channel = i;
            const trackName = instrument.gmName || instrument.name;

            const trackBytes = this.buildTrackChunk(
                scoreData,
                events,
                instrument.program,
                channel,
                trackName
            );

            allTrackBytes.push(...trackBytes);
        }

        const midiBytes = new Uint8Array([...headerBytes, ...allTrackBytes]);

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
