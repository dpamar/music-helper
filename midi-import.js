/**
 * MIDI-IMPORT.JS
 *
 * Parse les fichiers MIDI Standard (Format 0 et Format 1).
 * Ignore les features MIDI non supportées (contrôleurs, pitch bend, etc.).
 * Extrait uniquement : notes (Note On/Off) et tempo (Set Tempo meta-event).
 */

class MidiImporter {
    constructor() {
    }

    /**
     * Parse un fichier MIDI complet.
     * @param {ArrayBuffer} buffer - Contenu du fichier .mid
     * @returns {{format: number, ppq: number, tracks: Array}}
     * @throws {Error} Si le fichier est invalide
     */
    parseMidiFile(buffer) {
        if (buffer.byteLength < 14) {
            throw new Error('Fichier MIDI trop court (header incomplet)');
        }

        const header = this.parseHeader(buffer, 0);

        const tracks = [];
        let currentOffset = header.nextOffset;

        for (let i = 0; i < header.numTracks; i++) {
            const track = this.parseTrack(buffer, currentOffset, header.ppq, i);
            tracks.push(track);

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

    /**
     * Parse le header chunk MIDI (MThd).
     * @param {ArrayBuffer} buffer - Buffer du fichier MIDI
     * @param {number} offset - Position de départ
     * @returns {{format: number, numTracks: number, ppq: number, nextOffset: number}}
     * @throws {Error} Si le header est invalide
     */
    parseHeader(buffer, offset) {
        const view = new DataView(buffer);

        const signature = String.fromCharCode(
            view.getUint8(offset),
            view.getUint8(offset + 1),
            view.getUint8(offset + 2),
            view.getUint8(offset + 3)
        );

        if (signature !== 'MThd') {
            throw new Error('Signature MIDI invalide (MThd attendu)');
        }

        const headerLength = view.getUint32(offset + 4);
        if (headerLength !== 6) {
            throw new Error(`Longueur de header invalide: ${headerLength} (6 attendu)`);
        }

        const format = view.getUint16(offset + 8);
        const numTracks = view.getUint16(offset + 10);
        const ppq = view.getUint16(offset + 12);

        if (format !== 0 && format !== 1) {
            throw new Error(`Format MIDI ${format} non supporté (seulement Format 0 et 1)`);
        }

        return {
            format,
            numTracks,
            ppq,
            nextOffset: offset + 14
        };
    }

    /**
     * Lit une Variable Length Quantity (VLQ) MIDI.
     * @param {ArrayBuffer} buffer - Buffer MIDI
     * @param {number} offset - Position de départ
     * @returns {{value: number, bytesRead: number}}
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
        } while (currentByte & 0x80);

        return { value, bytesRead };
    }

    /**
     * Parse un track chunk MIDI (MTrk).
     * @param {ArrayBuffer} buffer - Buffer MIDI
     * @param {number} offset - Position du track
     * @param {number} ppq - Pulses per quarter note
     * @param {number} trackIndex - Index de la piste
     * @returns {Object} MidiTrack
     * @throws {Error} Si le track est invalide
     */
    parseTrack(buffer, offset, ppq, trackIndex = 0) {
        const view = new DataView(buffer);

        const signature = String.fromCharCode(
            view.getUint8(offset),
            view.getUint8(offset + 1),
            view.getUint8(offset + 2),
            view.getUint8(offset + 3)
        );

        if (signature !== 'MTrk') {
            throw new Error(`Signature track invalide: ${signature} (MTrk attendu)`);
        }

        const trackLength = view.getUint32(offset + 4);
        const trackEnd = offset + 8 + trackLength;

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
        let iterations = 0;
        const MAX_ITERATIONS = 100000;

        while (currentOffset < trackEnd) {
            if (iterations++ > MAX_ITERATIONS) {
                throw new Error('Parsing suspendu (boucle infinie détectée)');
            }
            const delta = this.readVarLength(buffer, currentOffset);
            currentOffset += delta.bytesRead;
            currentTick += delta.value;

            let statusByte = view.getUint8(currentOffset);

            if (statusByte < 0x80) {
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

            const eventResult = this.parseEvent(
                buffer,
                currentOffset,
                statusByte,
                currentTick,
                track
            );

            currentOffset = eventResult.nextOffset;

            if (eventResult.isEndOfTrack) {
                break;
            }
        }

        track.durationTicks = currentTick;
        track.noteCount = track.notes.length;

        return track;
    }

    /**
     * Parse un événement MIDI individuel.
     * @param {ArrayBuffer} buffer - Buffer MIDI
     * @param {number} offset - Position après status byte
     * @param {number} statusByte - Status byte
     * @param {number} currentTick - Tick absolu actuel
     * @param {Object} track - Track à mettre à jour
     * @returns {{nextOffset: number, isEndOfTrack: boolean}}
     */
    parseEvent(buffer, offset, statusByte, currentTick, track) {
        const view = new DataView(buffer);
        const eventType = statusByte & 0xF0;

        if (eventType === 0x80) {
            const note = view.getUint8(offset);
            this.closeNoteOn(track.notes, note, currentTick);
            return { nextOffset: offset + 2, isEndOfTrack: false };
        }

        if (eventType === 0x90) {
            const note = view.getUint8(offset);
            const velocity = view.getUint8(offset + 1);

            if (velocity === 0) {
                this.closeNoteOn(track.notes, note, currentTick);
            } else {
                track.notes.push({
                    tick: currentTick,
                    midiNumber: note,
                    duration: -1,
                    velocity
                });
                track.minNote = Math.min(track.minNote, note);
                track.maxNote = Math.max(track.maxNote, note);
            }

            return { nextOffset: offset + 2, isEndOfTrack: false };
        }

        if (eventType === 0xA0) {
            return { nextOffset: offset + 2, isEndOfTrack: false };
        }

        if (eventType === 0xB0) {
            return { nextOffset: offset + 2, isEndOfTrack: false };
        }

        if (eventType === 0xC0) {
            return { nextOffset: offset + 1, isEndOfTrack: false };
        }

        if (eventType === 0xD0) {
            return { nextOffset: offset + 1, isEndOfTrack: false };
        }

        if (eventType === 0xE0) {
            return { nextOffset: offset + 2, isEndOfTrack: false };
        }

        if (statusByte === 0xFF) {
            return this.parseMetaEvent(buffer, offset, track);
        }

        if (statusByte === 0xF0 || statusByte === 0xF7) {
            const length = this.readVarLength(buffer, offset);
            return { nextOffset: offset + length.bytesRead + length.value, isEndOfTrack: false };
        }

        throw new Error(`Événement MIDI inconnu: 0x${statusByte.toString(16)}`);
    }

    /**
     * Parse un meta-event MIDI (0xFF).
     * @param {ArrayBuffer} buffer - Buffer MIDI
     * @param {number} offset - Position après 0xFF
     * @param {Object} track - Track à mettre à jour
     * @returns {{nextOffset: number, isEndOfTrack: boolean}}
     */
    parseMetaEvent(buffer, offset, track) {
        const view = new DataView(buffer);
        const metaType = view.getUint8(offset);
        const length = this.readVarLength(buffer, offset + 1);
        const dataOffset = offset + 1 + length.bytesRead;

        if (metaType === 0x51) {
            if (length.value === 3) {
                const microsecondsPerQuarter =
                    (view.getUint8(dataOffset) << 16) |
                    (view.getUint8(dataOffset + 1) << 8) |
                    view.getUint8(dataOffset + 2);

                if (track.tempo === null) {
                    track.tempo = microsecondsPerQuarter;
                }
            }
        }

        if (metaType === 0x03) {
            let name = '';
            for (let i = 0; i < length.value; i++) {
                name += String.fromCharCode(view.getUint8(dataOffset + i));
            }
            track.trackName = name;
        }

        if (metaType === 0x2F) {
            return { nextOffset: dataOffset + length.value, isEndOfTrack: true };
        }

        return { nextOffset: dataOffset + length.value, isEndOfTrack: false };
    }

    /**
     * Ferme un Note On en calculant sa durée.
     * @param {Array} notes - Liste des notes du track
     * @param {number} midiNumber - Numéro MIDI de la note à fermer
     * @param {number} currentTick - Tick du Note Off
     */
    closeNoteOn(notes, midiNumber, currentTick) {
        for (let i = notes.length - 1; i >= 0; i--) {
            const note = notes[i];
            if (note.midiNumber === midiNumber && note.duration === -1) {
                note.duration = currentTick - note.tick;
                return;
            }
        }
    }

    /**
     * Convertit un MidiTrack en scoreData compatible avec l'éditeur.
     * @param {Object} track - Track MIDI à convertir
     * @param {number} ppq - Pulses per quarter note
     * @param {number} defaultTempo - Tempo par défaut si non spécifié (BPM)
     * @returns {Object} scoreData compatible avec Parser/Renderer
     */
    trackToScoreData(track, ppq, defaultTempo = 120) {
        let tempoBpm = defaultTempo;
        if (track.tempo !== null) {
            tempoBpm = Math.round(60000000 / track.tempo);
        }

        const title = track.trackName || 'Partition importée';

        const sortedNotes = [...track.notes].sort((a, b) => a.tick - b.tick);

        const notes = [];
        let currentTick = 0;

        for (const midiNote of sortedNotes) {
            // Skip unclosed notes (no matching Note Off)
            if (midiNote.duration < 0) {
                continue;
            }

            if (midiNote.tick > currentTick) {
                const gapTicks = midiNote.tick - currentTick;
                const gapDuration = gapTicks / ppq;
                notes.push({ type: 'rest', duration: gapDuration });
            }

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
            timeSignature: { numerator: 4, denominator: 4 },
            clef: 'sol',
            keySignature: [],
            notes
        };
    }

    /**
     * Convertit un numéro MIDI (0-127) en note + altération + octave.
     * C4 (Do médium) = 60, octave 0 dans l'éditeur.
     * @param {number} midiNumber - Numéro MIDI (0-127)
     * @returns {{note: string, alteration: string, octave: number}}
     */
    midiNumberToNote(midiNumber) {
        midiNumber = Math.max(0, Math.min(127, midiNumber));

        // Standard MIDI octave: C4=60 is octave 4, so floor(60/12)=5, offset by -5 to get 0
        // Then adjust by +1 to match editor convention (C4=octave 0)
        const octave = Math.floor(midiNumber / 12) - 5;
        const noteInOctave = ((midiNumber % 12) + 12) % 12;

        const noteMap = [
            { note: 'C', alteration: '' },
            { note: 'C', alteration: 'sharp' },
            { note: 'D', alteration: '' },
            { note: 'D', alteration: 'sharp' },
            { note: 'E', alteration: '' },
            { note: 'F', alteration: '' },
            { note: 'F', alteration: 'sharp' },
            { note: 'G', alteration: '' },
            { note: 'G', alteration: 'sharp' },
            { note: 'A', alteration: '' },
            { note: 'A', alteration: 'sharp' },
            { note: 'B', alteration: '' }
        ];

        return {
            note: noteMap[noteInOctave].note,
            alteration: noteMap[noteInOctave].alteration,
            octave
        };
    }
}
