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

        // Pour l'instant, retourne une copie sans modification
        return JSON.parse(JSON.stringify(scoreData));
    }
}
