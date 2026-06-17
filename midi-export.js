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
     * Exporte la partition en fichier MIDI et déclenche le téléchargement
     * @param {Object} scoreData - Données de partition parsées
     * @param {string} filename - Nom du fichier (sans extension)
     */
    export(scoreData, filename) {
        // TODO: implémenter la génération du fichier MIDI
        console.log('Export MIDI:', scoreData, filename);
    }
}
