/**
 * MIDI-AUDIO-PLAYER.JS
 *
 * Module de lecture MIDI via Web Audio API
 * Synthétise les notes directement dans le navigateur
 * Compatible avec tous les navigateurs modernes (Chrome, Firefox, Safari)
 */

class MidiAudioPlayer {
    constructor() {
        this.audioContext = null;
        this.scheduledNotes = [];
        this.isCurrentlyPlaying = false;
        this.startTime = 0;
        this.midiExporter = null;
    }

    /**
     * Initialise le lecteur audio
     * @param {HTMLAudioElement} audioElement - L'élément <audio> du DOM (non utilisé, gardé pour compatibilité)
     * @param {MidiExporter} midiExporter - Instance de MidiExporter
     */
    init(audioElement, midiExporter) {
        this.midiExporter = midiExporter;

        // Initialiser Web Audio API (nécessite une interaction utilisateur)
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    /**
     * Lance la lecture de la partition
     * @param {Object} scoreData - Données parsées (tempo, notes, etc.)
     */
    async play(scoreData) {
        if (!this.midiExporter) {
            throw new Error('MidiExporter not initialized. Call init() first.');
        }

        if (!scoreData) {
            throw new Error('No score data provided');
        }

        // Arrêter toute lecture en cours
        this.stop();

        // Reprendre le contexte audio si suspendu (politique des navigateurs)
        if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }

        this.isCurrentlyPlaying = true;
        this.startTime = this.audioContext.currentTime;

        // Calculer la durée d'un tick en secondes
        const ppq = 480;
        const microsecondsPerQuarter = 60000000 / scoreData.tempo;
        const secondsPerTick = (microsecondsPerQuarter / 1000000) / ppq;

        // Générer les événements MIDI
        const events = this.midiExporter.generateMidiEvents(scoreData);

        // Regrouper les événements note_on/note_off par paires
        // Les événements sont triés par tick, donc on peut les parcourir en ordre
        const noteOffMap = new Map();

        events.forEach(e => {
            if (e.type === 'note_off') {
                const key = `${e.note}_${e.tick}`;
                noteOffMap.set(key, e);
            }
        });

        // Programmer chaque note
        events.forEach(event => {
            if (event.type !== 'note_on') return;

            // Chercher le note_off correspondant (même note, tick > note_on)
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

        // Calculer la durée totale et programmer l'arrêt
        const lastEvent = events[events.length - 1];
        const totalDuration = lastEvent ? lastEvent.tick * secondsPerTick : 0;

        setTimeout(() => {
            this.isCurrentlyPlaying = false;
            this.scheduledNotes = [];
        }, totalDuration * 1000);
    }

    /**
     * Programme une note à jouer
     * @param {number} midiNumber - Numéro MIDI de la note (0-127)
     * @param {number} startTime - Temps de début absolu (AudioContext.currentTime)
     * @param {number} duration - Durée en secondes
     */
    scheduleNote(midiNumber, startTime, duration) {
        // Convertir le numéro MIDI en fréquence (A4 = 440 Hz = MIDI 69)
        const frequency = 440 * Math.pow(2, (midiNumber - 69) / 12);

        // Créer un oscillateur (son sinusoïdal simple)
        const oscillator = this.audioContext.createOscillator();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(frequency, startTime);

        // Créer une enveloppe d'amplitude (ADSR simplifié)
        const gainNode = this.audioContext.createGain();
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.01); // Attack rapide
        gainNode.gain.linearRampToValueAtTime(0.2, startTime + 0.05); // Sustain
        gainNode.gain.linearRampToValueAtTime(0, startTime + duration); // Release

        // Connecter oscillateur → gain → destination
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        // Démarrer et arrêter
        oscillator.start(startTime);
        oscillator.stop(startTime + duration);

        // Garder une référence (pour un éventuel stop anticipé)
        this.scheduledNotes.push({ oscillator, gainNode, startTime, duration });
    }

    /**
     * Arrête la lecture
     */
    stop() {
        this.isCurrentlyPlaying = false;

        // Arrêter tous les oscillateurs programmés
        this.scheduledNotes.forEach(({ oscillator, gainNode }) => {
            try {
                // Rampe rapide vers 0 pour éviter les clics
                gainNode.gain.cancelScheduledValues(this.audioContext.currentTime);
                gainNode.gain.setValueAtTime(gainNode.gain.value, this.audioContext.currentTime);
                gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 0.01);

                oscillator.stop(this.audioContext.currentTime + 0.01);
            } catch (e) {
                // Oscillateur déjà arrêté, ignorer
            }
        });

        this.scheduledNotes = [];
    }

    /**
     * Vérifie si la lecture est en cours
     * @returns {boolean} true si en cours de lecture
     */
    get isPlaying() {
        return this.isCurrentlyPlaying;
    }

    /**
     * Nettoie les ressources
     */
    cleanup() {
        this.stop();
    }
}
