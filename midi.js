/**
 * MIDI.JS
 *
 * Module de synthèse et lecture MIDI
 * Utilise Web Audio API pour générer les sons de piano
 */

class MidiPlayer {
    constructor() {
        this.audioContext = null;
        this.isPlaying = false;
        this.currentNotes = [];
        this.scheduledNotes = [];
        this.masterVolume = 0.3;
        this.sustainTime = 0.1;
    }

    initAudioContext() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        return this.audioContext;
    }

    generateMidiEvents(scoreData) {
        const events = [];
        let currentTime = 0;
        const quarterNoteDuration = 60 / scoreData.tempo;

        for (const item of scoreData.notes) {
            if (item.type === 'rest') {
                currentTime += item.duration * quarterNoteDuration;
            } else if (item.type === 'note') {
                const frequency = this.noteToFrequency(item.note, item.alteration, item.octave);
                events.push({
                    time: currentTime,
                    type: 'note',
                    notes: [{frequency}],
                    duration: item.duration * quarterNoteDuration
                });
                currentTime += item.duration * quarterNoteDuration;
            } else if (item.type === 'chord') {
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

    async play(scoreData) {
    }

    stop() {
    }

    noteToFrequency(note, alteration, octave) {
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

        // MIDI number: C4 (Do médium) = 60, A4 = 69 = 440 Hz
        const midiNumber = 60 + semitone;
        return 440 * Math.pow(2, (midiNumber - 69) / 12);
    }

    playNote(frequency, startTime, duration) {
        if (!this.audioContext) {
            throw new Error('AudioContext not initialized. Call initAudioContext() first.');
        }

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(frequency, startTime);

        const attackTime = 0.01;
        const decayTime = 0.1;
        const sustainLevel = 0.7;
        const releaseTime = this.sustainTime;

        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(this.masterVolume, startTime + attackTime);
        gainNode.gain.linearRampToValueAtTime(
            this.masterVolume * sustainLevel,
            startTime + attackTime + decayTime
        );

        const releaseStart = startTime + duration;
        gainNode.gain.setValueAtTime(this.masterVolume * sustainLevel, releaseStart);
        gainNode.gain.linearRampToValueAtTime(0, releaseStart + releaseTime);

        oscillator.start(startTime);
        oscillator.stop(releaseStart + releaseTime);

        oscillator.onended = () => {
            oscillator.disconnect();
            gainNode.disconnect();
        };
    }
}
