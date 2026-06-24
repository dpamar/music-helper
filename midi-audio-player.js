/**
 * MIDI-AUDIO-PLAYER.JS
 *
 * Synthesizes notes via Web Audio API directly in the browser.
 */

class MidiAudioPlayer {
    constructor() {
        this.audioContext = null;
        this.scheduledNotes = [];
        this.isCurrentlyPlaying = false;
        this.startTime = 0;
        this.midiExporter = null;
    }

    init(audioElement, midiExporter) {
        this.midiExporter = midiExporter;

        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    async play(scoreData) {
        if (!this.midiExporter) {
            throw new Error('MidiExporter not initialized. Call init() first.');
        }

        if (!scoreData) {
            throw new Error('No score data provided');
        }

        this.stop();

        // Resume suspended context (browser autoplay policy requires user gesture)
        if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }

        this.isCurrentlyPlaying = true;
        this.startTime = this.audioContext.currentTime;

        const ppq = 480;
        const microsecondsPerQuarter = 60000000 / scoreData.tempo;
        const secondsPerTick = (microsecondsPerQuarter / 1000000) / ppq;

        const events = this.midiExporter.generateMidiEvents(scoreData);

        const noteOffMap = new Map();

        events.forEach(e => {
            if (e.type === 'note_off') {
                const key = `${e.note}_${e.tick}`;
                noteOffMap.set(key, e);
            }
        });

        events.forEach(event => {
            if (event.type !== 'note_on') return;

            const noteOffEvent = events.find(e =>
                e.type === 'note_off' &&
                e.note === event.note &&
                e.tick > event.tick
            );

            if (!noteOffEvent) {
                console.warn(`Note off non trouvée pour MIDI ${event.note} à tick ${event.tick}`);
                return;
            }

            const startTimeAbs = this.startTime + (event.tick * secondsPerTick);
            const durationSec = (noteOffEvent.tick - event.tick) * secondsPerTick;

            this.scheduleNote(event.note, startTimeAbs, durationSec);
        });

        const lastEvent = events[events.length - 1];
        const totalDuration = lastEvent ? lastEvent.tick * secondsPerTick : 0;

        setTimeout(() => {
            this.isCurrentlyPlaying = false;
            this.scheduledNotes = [];
        }, totalDuration * 1000);
    }

    scheduleNote(midiNumber, startTime, duration) {
        // f = 440 * 2^((n - 69) / 12) where A4 = MIDI 69 = 440 Hz
        const frequency = 440 * Math.pow(2, (midiNumber - 69) / 12);

        const oscillator = this.audioContext.createOscillator();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(frequency, startTime);

        // Simplified ADSR envelope: fast attack, sustain at 0.2, linear release
        const gainNode = this.audioContext.createGain();
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.01);
        gainNode.gain.linearRampToValueAtTime(0.2, startTime + 0.05);
        gainNode.gain.linearRampToValueAtTime(0, startTime + duration);

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.start(startTime);
        oscillator.stop(startTime + duration);

        this.scheduledNotes.push({ oscillator, gainNode, startTime, duration });
    }

    stop() {
        this.isCurrentlyPlaying = false;

        this.scheduledNotes.forEach(({ oscillator, gainNode }) => {
            try {
                // Fast ramp to 0 avoids audio clicks
                gainNode.gain.cancelScheduledValues(this.audioContext.currentTime);
                gainNode.gain.setValueAtTime(gainNode.gain.value, this.audioContext.currentTime);
                gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 0.01);

                oscillator.stop(this.audioContext.currentTime + 0.01);
            } catch (e) {
                // Oscillator already stopped
            }
        });

        this.scheduledNotes = [];
    }

    get isPlaying() {
        return this.isCurrentlyPlaying;
    }

    cleanup() {
        this.stop();
    }
}
