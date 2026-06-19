/**
 * MULTI-SCORE-MANAGER.JS
 *
 * Gestionnaire de collection de partitions multiples
 * Permet d'ajouter, supprimer, et organiser plusieurs partitions
 * pour un export MIDI multi-pistes
 */

class MultiScoreManager {
    constructor() {
        this.scores = [];
        this.nextId = 1;
        this.globalTitle = 'Orchestre';
    }

    setGlobalTitle(title) {
        this.globalTitle = title || 'Orchestre';
    }

    addScore(scoreData) {
        if (!scoreData) {
            throw new Error('scoreData is required');
        }

        const id = this.nextId++;
        this.scores.push({
            id,
            scoreData,
            instrument: scoreData.instrument || 'piano'
        });

        return id;
    }

    removeScore(id) {
        const index = this.scores.findIndex(s => s.id === id);
        if (index === -1) {
            return false;
        }
        this.scores.splice(index, 1);
        return true;
    }

    getScore(id) {
        return this.scores.find(s => s.id === id) || null;
    }

    getAllScores() {
        return [...this.scores];
    }

    getCount() {
        return this.scores.length;
    }

    isEmpty() {
        return this.scores.length === 0;
    }

    clear() {
        this.scores = [];
        this.nextId = 1;
    }

    updateInstrument(id, instrument) {
        const score = this.getScore(id);
        if (!score) {
            return false;
        }
        score.instrument = instrument;
        score.scoreData.instrument = instrument;
        return true;
    }

    exportForMidi() {
        return {
            globalTitle: this.globalTitle,
            scores: this.getAllScores()
        };
    }
}
