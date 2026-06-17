/**
 * MIDI-AUDIO-PLAYER.JS
 *
 * Module de lecture MIDI via élément HTML <audio>
 * Génère un fichier MIDI en mémoire et l'injecte dans un lecteur audio natif
 */

class MidiAudioPlayer {
    constructor() {
        this.audioElement = null;
        this.currentBlobURL = null;
        this.midiExporter = null;
    }

    /**
     * Initialise le lecteur audio
     * @param {HTMLAudioElement} audioElement - L'élément <audio> du DOM
     * @param {MidiExporter} midiExporter - Instance de MidiExporter
     */
    init(audioElement, midiExporter) {
        this.audioElement = audioElement;
        this.midiExporter = midiExporter;

        this.audioElement.addEventListener('ended', () => {
            this.cleanup();
        });

        this.audioElement.addEventListener('play', () => {
            this.audioElement.style.display = 'block';
        });

        this.audioElement.addEventListener('pause', () => {
            if (this.audioElement.ended) {
                this.audioElement.style.display = 'none';
            }
        });
    }

    /**
     * Lance la lecture de la partition
     * @param {Object} scoreData - Données parsées (tempo, notes, etc.)
     */
    play(scoreData) {
        if (!this.midiExporter) {
            throw new Error('MidiExporter not initialized. Call init() first.');
        }

        if (!scoreData) {
            throw new Error('No score data provided');
        }

        this.cleanup();

        const midiBlob = this.midiExporter.generateMidiFile(scoreData);

        this.currentBlobURL = URL.createObjectURL(midiBlob);

        this.audioElement.src = this.currentBlobURL;
        this.audioElement.style.display = 'block';

        this.audioElement.play().catch(error => {
            console.error('Erreur lecture audio:', error);
            throw new Error('Impossible de lire le fichier MIDI. Votre navigateur supporte-t-il le format MIDI ?');
        });
    }

    /**
     * Arrête la lecture
     */
    stop() {
        if (this.audioElement) {
            this.audioElement.pause();
            this.audioElement.currentTime = 0;
            this.audioElement.style.display = 'none';
        }
        this.cleanup();
    }

    /**
     * Vérifie si la lecture est en cours
     * @returns {boolean} true si en cours de lecture
     */
    get isPlaying() {
        return this.audioElement && !this.audioElement.paused && !this.audioElement.ended;
    }

    /**
     * Nettoie les ressources (Blob URL)
     */
    cleanup() {
        if (this.currentBlobURL) {
            URL.revokeObjectURL(this.currentBlobURL);
            this.currentBlobURL = null;
        }
    }
}
