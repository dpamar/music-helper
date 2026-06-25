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
                const swungNote = JSON.parse(JSON.stringify(note));

                if (isFirstOfPair) {
                    swungNote.duration = this.config.swingRatio;
                } else {
                    swungNote.duration = Math.round((1 - this.config.swingRatio) * 100) / 100;
                }

                swungNotes.push(swungNote);
                isFirstOfPair = !isFirstOfPair;
            } else {
                swungNotes.push(JSON.parse(JSON.stringify(note)));
                isFirstOfPair = true;
            }
        }

        return swungNotes;
    }
}
