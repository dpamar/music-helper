/**
 * MidiExporter - Genere des fichiers MIDI Standard (Format 0 et Format 1).
 */
class MidiExporter {
    /**
     * Initialise l'exporteur MIDI.
     */
    constructor() {
    }

    /**
     * Exporte la partition en fichier MIDI Format 0 (mono-piste) et declenche le telechargement.
     * @param {Object} scoreData - Partition a exporter
     * @param {string} filename - Nom du fichier (sans extension)
     * @param {number} program - Numero de programme MIDI (0-127, ex: 0 = Piano)
     * @param {string|null} gmName - Nom General MIDI de l'instrument (pour meta Track Name)
     * @returns {void}
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
     * Exporte la partition en fichier MIDI Format 1 (multi-pistes) et declenche le telechargement.
     * Chaque instrument est une piste distincte.
     * @param {Object} scoreData - Partition a exporter
     * @param {string} filename - Nom du fichier (sans extension)
     * @param {Array<{name: string, program: number, gmName: string}>} instruments - Liste des instruments
     * @returns {void}
     * @throws {Error} Si aucun instrument ou plus de 16 instruments (limite MIDI)
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

    /**
     * Genere un Blob MIDI Format 0 en memoire (sans telecharger).
     * @param {Object} scoreData - Partition a convertir
     * @param {number} program - Numero de programme MIDI
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
     * Genere les evenements MIDI (Note On/Off) a partir de la partition.
     * @param {Object} scoreData - Partition avec notes/accords/silences
     * @returns {Array<{tick: number, type: string, channel: number, note: number, velocity: number}>} Evenements MIDI tries par tick
     */
    generateMidiEvents(scoreData) {
        if (!scoreData || !Array.isArray(scoreData.notes)) {
            return [];
        }

        const events = [];
        const ppq = 480;
        let currentTick = 0;

        const signatures = [];
        scoreData.keySignature.map(x => signatures[x.note] = x.alteration);

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
     * Construit le header chunk MIDI (MThd).
     * @param {number} format - Format MIDI (0 = mono-piste, 1 = multi-pistes)
     * @param {number} numTracks - Nombre de pistes
     * @param {number} ppq - Ticks par noire (Pulses Per Quarter note)
     * @returns {Array<number>} Bytes du header chunk
     */
    buildHeaderChunk(format, numTracks, ppq) {
        const bytes = [];

        bytes.push(...this.writeString('MThd'));
        bytes.push(...this.writeUint32(6));
        bytes.push(...this.writeUint16(format));
        bytes.push(...this.writeUint16(numTracks));
        bytes.push(...this.writeUint16(ppq));

        return bytes;
    }

    /**
     * Construit un track chunk MIDI (MTrk) avec meta-evenements et notes.
     * @param {Object} scoreData - Partition
     * @param {Array} events - Evenements MIDI (Note On/Off)
     * @param {number} program - Numero de programme MIDI
     * @param {number} channel - Canal MIDI (0-15)
     * @param {string|null} trackName - Nom de la piste (meta Track Name)
     * @returns {Array<number>} Bytes du track chunk (MTrk header + donnees)
     * @throws {Error} Si le tempo est invalide ou le timeSignature est manquant
     */
    buildTrackChunk(scoreData, events, program = 0, channel = 0, trackName = null) {
        const trackData = [];
        let lastTick = 0;

        const name = trackName || scoreData.title;
        if (name) {
            trackData.push(0);
            trackData.push(0xFF);
            trackData.push(0x03);
            const nameBytes = this.writeString(name);
            trackData.push(...this.writeVarLength(nameBytes.length));
            trackData.push(...nameBytes);
        }

        if (channel === 0) {
            if (!scoreData.tempo || scoreData.tempo <= 0) {
                throw new Error(`Invalid tempo: ${scoreData.tempo}. Must be a positive number.`);
            }
            const microsecondsPerQuarter = Math.round(60000000 / scoreData.tempo);
            trackData.push(0);
            trackData.push(0xFF);
            trackData.push(0x51);
            trackData.push(0x03);
            trackData.push((microsecondsPerQuarter >> 16) & 0xFF);
            trackData.push((microsecondsPerQuarter >> 8) & 0xFF);
            trackData.push(microsecondsPerQuarter & 0xFF);

            if (!scoreData.timeSignature) {
                throw new Error('Missing timeSignature in scoreData');
            }
            trackData.push(0);
            trackData.push(0xFF);
            trackData.push(0x58);
            trackData.push(0x04);
            trackData.push(scoreData.timeSignature.numerator);
            trackData.push(Math.log2(scoreData.timeSignature.denominator));
            trackData.push(24);
            trackData.push(8);
        }

        trackData.push(0);
        trackData.push(0xC0 | channel);
        trackData.push(program);

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

        trackData.push(0);
        trackData.push(0xFF);
        trackData.push(0x2F);
        trackData.push(0x00);

        const bytes = [];
        bytes.push(...this.writeString('MTrk'));
        bytes.push(...this.writeUint32(trackData.length));
        bytes.push(...trackData);

        return bytes;
    }

    /**
     * Convertit une note musicale en numero MIDI (0-127).
     * C4 (Do medium) = MIDI 60.
     * @param {string} note - Nom de note anglo-saxon (C, D, E, F, G, A, B)
     * @param {string} alteration - Alteration ('sharp', 'flat', '' ou autre)
     * @param {number} octave - Decalage d'octave (-2 a +2)
     * @returns {number} Numero MIDI (0-127, clamping automatique)
     * @throws {Error} Si le nom de note est inconnu
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
     * Calcule l'alteration effective d'une note (explicite ou issue de l'armure).
     * @param {Object} note - Note avec champ .alteration
     * @param {Array} keySignature - Map des alterations de l'armure
     * @returns {string} Alteration effective ('sharp', 'flat', '' ou autre)
     * @private
     */
    computeAlteration(note, keySignature) {
        return note.alteration || keySignature[note.note] || '';
    }

    /**
     * Encode un nombre en Variable Length Quantity (VLQ) MIDI.
     * Format : 7 bits de donnees + 1 bit de continuation (MSB) par byte.
     * @param {number} value - Valeur a encoder (0 - 268435455)
     * @returns {Array<number>} Bytes VLQ (MSB-first)
     * @throws {Error} Si la valeur est negative ou depasse 0x0FFFFFFF
     * @private
     */
    writeVarLength(value) {
        if (value < 0) {
            throw new Error(`VLQ value cannot be negative: ${value}`);
        }
        if (value > 0x0FFFFFFF) {
            throw new Error(`VLQ value exceeds MIDI maximum (268435455): ${value}`);
        }

        const bytes = [];

        bytes.push(value & 0x7F);
        value >>= 7;

        while (value > 0) {
            bytes.push((value & 0x7F) | 0x80);
            value >>= 7;
        }

        return bytes.reverse();
    }

    /**
     * Convertit une chaine en tableau de bytes ASCII.
     * @param {string} str - Chaine a encoder
     * @returns {Array<number>} Bytes ASCII
     * @private
     */
    writeString(str) {
        const bytes = [];
        for (let i = 0; i < str.length; i++) {
            bytes.push(str.charCodeAt(i));
        }
        return bytes;
    }

    /**
     * Encode un entier 16 bits en big-endian (2 bytes).
     * @param {number} value - Valeur (0-65535)
     * @returns {Array<number>} 2 bytes big-endian
     * @private
     */
    writeUint16(value) {
        return [
            (value >> 8) & 0xFF,
            value & 0xFF
        ];
    }

    /**
     * Encode un entier 32 bits en big-endian (4 bytes).
     * @param {number} value - Valeur (0-4294967295)
     * @returns {Array<number>} 4 bytes big-endian
     * @private
     */
    writeUint32(value) {
        return [
            (value >> 24) & 0xFF,
            (value >> 16) & 0xFF,
            (value >> 8) & 0xFF,
            value & 0xFF
        ];
    }
}
