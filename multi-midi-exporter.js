/**
 * MULTI-MIDI-EXPORTER.JS
 *
 * Exportateur MIDI Format 1 (multi-pistes)
 * Genere un fichier MIDI avec une piste par partition
 */

class MultiMidiExporter {
    constructor(midiExporter) {
        this.midiExporter = midiExporter;
    }

    buildHeaderChunk(numTracks, ppq) {
        const bytes = [];
        bytes.push(...this.midiExporter.writeString('MThd'));
        bytes.push(...this.midiExporter.writeUint32(6));
        bytes.push(...this.midiExporter.writeUint16(1));
        bytes.push(...this.midiExporter.writeUint16(numTracks));
        bytes.push(...this.midiExporter.writeUint16(ppq));
        return bytes;
    }

    buildTrackChunkForScore(scoreData, instrument, channel, ppq) {
        const trackData = [];
        let lastTick = 0;

        // Track Name
        const trackName = scoreData.title || instrument;
        trackData.push(0);
        trackData.push(0xFF);
        trackData.push(0x03);
        const titleBytes = this.midiExporter.writeString(trackName);
        trackData.push(...this.midiExporter.writeVarLength(titleBytes.length));
        trackData.push(...titleBytes);

        // Program Change
        const INSTRUMENTS = {
            'piano': 0, 'guitare': 24, 'violon': 40, 'flute': 73,
            'accordeon': 21, 'contrebasse': 43, 'hautbois': 68, 'trompette': 56
        };
        const program = INSTRUMENTS[instrument] || 0;

        trackData.push(0);
        trackData.push(0xC0 | channel);
        trackData.push(program);

        // Note events
        const events = this.midiExporter.generateMidiEvents(scoreData);

        for (const event of events) {
            const deltaTime = event.tick - lastTick;
            trackData.push(...this.midiExporter.writeVarLength(deltaTime));

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

        // End of Track
        trackData.push(0);
        trackData.push(0xFF);
        trackData.push(0x2F);
        trackData.push(0x00);

        const bytes = [];
        bytes.push(...this.midiExporter.writeString('MTrk'));
        bytes.push(...this.midiExporter.writeUint32(trackData.length));
        bytes.push(...trackData);

        return bytes;
    }

    buildTempoTrack(firstScoreData, ppq) {
        const trackData = [];

        // Track Name
        trackData.push(0);
        trackData.push(0xFF);
        trackData.push(0x03);
        const titleBytes = this.midiExporter.writeString('Tempo Track');
        trackData.push(...this.midiExporter.writeVarLength(titleBytes.length));
        trackData.push(...titleBytes);

        // Set Tempo
        const microsecondsPerQuarter = Math.round(60000000 / firstScoreData.tempo);
        trackData.push(0);
        trackData.push(0xFF);
        trackData.push(0x51);
        trackData.push(0x03);
        trackData.push((microsecondsPerQuarter >> 16) & 0xFF);
        trackData.push((microsecondsPerQuarter >> 8) & 0xFF);
        trackData.push(microsecondsPerQuarter & 0xFF);

        // Time Signature
        trackData.push(0);
        trackData.push(0xFF);
        trackData.push(0x58);
        trackData.push(0x04);
        trackData.push(firstScoreData.timeSignature.numerator);
        trackData.push(Math.log2(firstScoreData.timeSignature.denominator));
        trackData.push(24);
        trackData.push(8);

        // End of Track
        trackData.push(0);
        trackData.push(0xFF);
        trackData.push(0x2F);
        trackData.push(0x00);

        const bytes = [];
        bytes.push(...this.midiExporter.writeString('MTrk'));
        bytes.push(...this.midiExporter.writeUint32(trackData.length));
        bytes.push(...trackData);

        return bytes;
    }

    generateMidiBytes(multiScoreData) {
        if (!multiScoreData || !multiScoreData.scores || multiScoreData.scores.length === 0) {
            throw new Error('Aucune partition à exporter');
        }

        const ppq = 480;
        const numTracks = multiScoreData.scores.length + 1;

        const allBytes = [];
        allBytes.push(...this.buildHeaderChunk(numTracks, ppq));

        const firstScore = multiScoreData.scores[0].scoreData;
        allBytes.push(...this.buildTempoTrack(firstScore, ppq));

        for (let i = 0; i < multiScoreData.scores.length; i++) {
            const score = multiScoreData.scores[i];
            const channel = i % 16;
            allBytes.push(...this.buildTrackChunkForScore(score.scoreData, score.instrument, channel, ppq));
        }

        return new Uint8Array(allBytes);
    }

    export(multiScoreData, filename) {
        const midiBytes = this.generateMidiBytes(multiScoreData);

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
