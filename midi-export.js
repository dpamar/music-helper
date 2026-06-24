/**
 * MIDI-EXPORT.JS
 *
 * Generates Standard MIDI Files (SMF) Format 0 and Format 1.
 */

class MidiExporter {
    constructor() {
    }

    // C4 (middle C) = MIDI 60. Semitone offsets: C=0, D=2, E=4, F=5, G=7, A=9, B=11
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

    // Returns effective alteration: explicit on the note, or from key signature, or none
    computeAlteration(note, keySignature) {
        return note.alteration || keySignature[note.note] || '';
    }

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

    // Variable Length Quantity (VLQ): MIDI's variable-width integer encoding.
    // Each byte uses 7 data bits + 1 continuation bit (MSB). MSB-first order.
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

    writeString(str) {
        const bytes = [];
        for (let i = 0; i < str.length; i++) {
            bytes.push(str.charCodeAt(i));
        }
        return bytes;
    }

    writeUint16(value) {
        return [
            (value >> 8) & 0xFF,
            value & 0xFF
        ];
    }

    writeUint32(value) {
        return [
            (value >> 24) & 0xFF,
            (value >> 16) & 0xFF,
            (value >> 8) & 0xFF,
            value & 0xFF
        ];
    }

    // MThd chunk: format, numTracks, PPQ (ticks per quarter note)
    buildHeaderChunk(format, numTracks, ppq) {
        const bytes = [];

        bytes.push(...this.writeString('MThd'));
        bytes.push(...this.writeUint32(6));
        bytes.push(...this.writeUint16(format));
        bytes.push(...this.writeUint16(numTracks));
        bytes.push(...this.writeUint16(ppq));

        return bytes;
    }

    // MTrk chunk: meta events (tempo, time sig) + program change + note events
    buildTrackChunk(scoreData, events, program = 0, channel = 0, trackName = null) {
        const trackData = [];
        let lastTick = 0;

        // Meta: Track Name (0xFF 0x03)
        const name = trackName || scoreData.title;
        if (name) {
            trackData.push(0);
            trackData.push(0xFF);
            trackData.push(0x03);
            const nameBytes = this.writeString(name);
            trackData.push(...this.writeVarLength(nameBytes.length));
            trackData.push(...nameBytes);
        }

        // Meta: Set Tempo (0xFF 0x51) — only on channel 0 (first track in Format 1)
        if (channel === 0) {
            if (!scoreData.tempo || scoreData.tempo <= 0) {
                throw new Error(`Invalid tempo: ${scoreData.tempo}. Must be a positive number.`);
            }
            // microseconds per quarter note = 60,000,000 / BPM
            const microsecondsPerQuarter = Math.round(60000000 / scoreData.tempo);
            trackData.push(0);
            trackData.push(0xFF);
            trackData.push(0x51);
            trackData.push(0x03);
            trackData.push((microsecondsPerQuarter >> 16) & 0xFF);
            trackData.push((microsecondsPerQuarter >> 8) & 0xFF);
            trackData.push(microsecondsPerQuarter & 0xFF);

            // Meta: Time Signature (0xFF 0x58)
            if (!scoreData.timeSignature) {
                throw new Error('Missing timeSignature in scoreData');
            }
            trackData.push(0);
            trackData.push(0xFF);
            trackData.push(0x58);
            trackData.push(0x04);
            trackData.push(scoreData.timeSignature.numerator);
            trackData.push(Math.log2(scoreData.timeSignature.denominator));
            trackData.push(24); // MIDI clocks per metronome click
            trackData.push(8);  // 32nds per quarter note
        }

        // Program Change (0xC0 | channel)
        trackData.push(0);
        trackData.push(0xC0 | channel);
        trackData.push(program);

        // Note On/Off events with delta times
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

        // Meta: End of Track (0xFF 0x2F 0x00)
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

    generateMidiFile(scoreData, program = 0) {
        const ppq = 480;

        const events = this.generateMidiEvents(scoreData);

        const headerBytes = this.buildHeaderChunk(0, 1, ppq);
        const trackBytes = this.buildTrackChunk(scoreData, events, program, 0, null);

        const midiBytes = new Uint8Array([...headerBytes, ...trackBytes]);

        return new Blob([midiBytes], { type: 'audio/midi' });
    }

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
