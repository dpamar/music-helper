/**
 * JazzTransformer - Transforme une partition classique en arrangement jazz.
 *
 * Transformations appliquées :
 * - Swing rhythm : croches en triolets (shuffle)
 * - Accords enrichis : ajout de 7ème, 9ème, 13ème
 * - Syncopation : décalages rythmiques
 * - Walking bass : lignes de basse marchantes
 */
class JazzTransformer {
    /**
     * Initialise le transformateur avec les configurations par défaut.
     */
    constructor() {
        this.config = {
            swingRatio: 0.67,        // Ratio pour le swing (2/3 - 1/3)
            syncopationProbability: 0.3,  // 30% de chances de syncopation
            walkingBassEnabled: false,     // Walking bass (désactivé par défaut)
            tempoMultiplier: 1.1      // Tempo légèrement plus rapide
        };
    }

    /**
     * Transforme une partition en arrangement jazz.
     * @param {Object} scoreData - Objet ParseResult (résultat de Parser.parse())
     * @returns {Object} Nouvelle partition jazzifiée (même structure)
     */
    transform(scoreData) {
        console.log('🎷 Transformation jazz en cours...');

        // Copie profonde pour ne pas modifier l'original
        const jazzScore = JSON.parse(JSON.stringify(scoreData));

        // 1. Ajuster le tempo (10% plus rapide, typique du jazz)
        jazzScore.tempo = Math.round(scoreData.tempo * this.config.tempoMultiplier);
        console.log(`✅ Tempo ajusté: ${scoreData.tempo} → ${jazzScore.tempo} BPM`);

        // 2. Appliquer le swing rhythm
        jazzScore.notes = this.applySwing(jazzScore.notes);
        console.log(`✅ Swing appliqué (ratio ${this.config.swingRatio})`);

        // 3. Enrichir les accords
        jazzScore.notes = this.enrichChords(jazzScore.notes);
        console.log(`✅ Accords enrichis (7ème ajoutée)`);

        // 4. Appliquer la syncopation
        jazzScore.notes = this.applySyncopation(jazzScore.notes);
        console.log(`✅ Syncopation appliquée (prob: ${this.config.syncopationProbability})`);

        return jazzScore;
    }

    /**
     * Applique le swing rhythm aux notes (shuffle des croches).
     * Les croches (0.5) deviennent des triolets swing (alternance 0.67 / 0.33).
     * @param {Array} notes - Tableau de notes/accords/silences
     * @returns {Array} Notes avec swing appliqué
     * @private
     */
    applySwing(notes) {
        const swungNotes = [];
        let isFirstOfPair = true;

        for (const note of notes) {
            if (note.duration === 0.5) {
                // Shallow copy sufficient since duration is a primitive
                const swungNote = { ...note };

                if (isFirstOfPair) {
                    swungNote.duration = this.config.swingRatio;
                } else {
                    swungNote.duration = Math.round((1 - this.config.swingRatio) * 100) / 100;
                }

                swungNotes.push(swungNote);
                isFirstOfPair = !isFirstOfPair;
            } else {
                swungNotes.push({ ...note });
                isFirstOfPair = true;
            }
        }

        return swungNotes;
    }

    /**
     * Enrichit les accords avec des extensions jazz (7ème).
     * Triade (3 notes) → Accord de 7ème (4 notes).
     * @param {Array} notes - Tableau de notes/accords/silences
     * @returns {Array} Notes avec accords enrichis
     * @private
     */
    enrichChords(notes) {
        const noteSteps = {
            'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11
        };

        const stepsToNote = [
            'C', null, 'D', null, 'E', 'F', null, 'G', null, 'A', null, 'B'
        ];

        return notes.map(item => {
            if (item.type !== 'chord') {
                return { ...item };
            }

            // Deep copy needed because we'll modify chord.notes array
            const chord = JSON.parse(JSON.stringify(item));

            if (chord.notes.length !== 3) {
                return chord;
            }

            const root = chord.notes[0];
            const rootStep = noteSteps[root.note];

            if (rootStep === undefined) {
                console.warn(`Unknown note: ${root.note}`);
                return chord;
            }

            // Major 7th is 11 semitones above root (Cmaj7, Dmaj7, etc.)
            // Dominant 7th would be 10 semitones - this uses major 7th
            const seventhStep = (rootStep + 11) % 12;
            const seventhNote = stepsToNote[seventhStep];

            if (seventhNote) {
                // Octave offset: 0 if 7th is in same octave, 1 if it wraps
                // Example: C (0) + 11 = B (same octave), D (2) + 11 = C# (next octave)
                chord.notes.push({
                    note: seventhNote,
                    alteration: '',
                    octave: root.octave + Math.floor((rootStep + 11) / 12)
                });

                console.log(`  → Accord enrichi: ${root.note} triade + 7ème (${seventhNote})`);
            }

            return chord;
        });
    }

    /**
     * Applique une syncopation légère aux notes.
     * Certaines notes sont décalées avec un court silence devant.
     *
     * NOTE: Utilise Math.random() donc non-déterministe. Chaque appel
     * produit un résultat différent. Ne pas appliquer plusieurs fois.
     *
     * @param {Array} notes - Tableau de notes/accords/silences
     * @returns {Array} Notes avec syncopation appliquée
     * @private
     */
    applySyncopation(notes) {
        const syncopatedNotes = [];

        for (const note of notes) {
            const canSyncopate = (note.duration === 1.0 || note.duration === 2.0) &&
                                  note.type !== 'rest';

            if (canSyncopate && Math.random() < this.config.syncopationProbability) {
                const silenceDuration = note.duration * 0.25;
                const noteDuration = note.duration * 0.75;

                syncopatedNotes.push({
                    type: 'rest',
                    duration: silenceDuration
                });

                const syncopatedNote = { ...note, duration: noteDuration };
                syncopatedNotes.push(syncopatedNote);

                console.log(`  → Syncopation: ${note.duration} → silence(${silenceDuration}) + note(${noteDuration})`);
            } else {
                syncopatedNotes.push({ ...note });
            }
        }

        return syncopatedNotes;
    }
}
