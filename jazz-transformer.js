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
            tempoMultiplier: 1.1,     // Tempo légèrement plus rapide
            chordExtensions: ['7th'],
            ghostNoteProbability: 0
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

        // 3. Détecter la tonalité et adapter les extensions
        const detectedKey = this.detectKey(jazzScore.notes);
        console.log(`✅ Tonalité détectée: ${detectedKey.tonic} ${detectedKey.mode}`);

        // 4. Enrichir les accords (sans muter config)
        jazzScore.notes = this.enrichChords(jazzScore.notes);
        console.log(`✅ Accords enrichis (extensions: ${this.config.chordExtensions.join(', ')})`);

        // 5. Appliquer la syncopation
        jazzScore.notes = this.applySyncopation(jazzScore.notes);
        console.log(`✅ Syncopation appliquée (prob: ${this.config.syncopationProbability})`);

        // 6. Ajouter les ghost notes si activées
        if (this.config.ghostNoteProbability > 0) {
            jazzScore.notes = this.addGhostNotes(jazzScore.notes);
            console.log(`✅ Ghost notes ajoutées (prob: ${this.config.ghostNoteProbability})`);
        }

        // 7. Générer la walking bass si activée
        if (this.config.walkingBassEnabled) {
            const bassLine = this.generateWalkingBass(jazzScore.notes);
            jazzScore.bassLine = bassLine;
            console.log(`✅ Walking bass générée (${bassLine.length} notes)`);
        }

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
     * Enrichit les accords avec des extensions jazz (7ème, 9ème, 11ème, 13ème).
     * Détecte automatiquement si l'accord est majeur ou mineur.
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
            if (item.type !== 'chord' || item.notes.length < 3) {
                return { ...item };
            }

            const chord = JSON.parse(JSON.stringify(item));
            const root = chord.notes[0];
            const rootStep = noteSteps[root.note];

            if (rootStep === undefined) {
                return chord;
            }

            // Detect major/minor by analyzing the third
            const third = chord.notes[1];
            const thirdStep = noteSteps[third.note];
            const thirdInterval = (thirdStep - rootStep + 12) % 12;
            const isMajor = thirdInterval === 4;

            const extensions = [];

            if (this.config.chordExtensions.includes('7th')) {
                const seventhInterval = isMajor ? 11 : 10;
                extensions.push(seventhInterval);
            }

            if (this.config.chordExtensions.includes('9th')) {
                extensions.push(14);
            }

            if (this.config.chordExtensions.includes('11th')) {
                extensions.push(17);
            }

            if (this.config.chordExtensions.includes('13th')) {
                extensions.push(21);
            }

            extensions.forEach(interval => {
                const extStep = (rootStep + interval) % 12;
                const extNote = stepsToNote[extStep];

                if (extNote) {
                    const octaveOffset = Math.floor((rootStep + interval) / 12);
                    chord.notes.push({
                        note: extNote,
                        alteration: '',
                        octave: root.octave + octaveOffset
                    });
                }
            });

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

    /**
     * Ajoute des ghost notes (notes fantômes) entre les notes principales.
     * @param {Array} notes - Tableau de notes/accords/silences
     * @returns {Array} Notes avec ghost notes ajoutées
     * @private
     */
    addGhostNotes(notes) {
        const decorated = [];

        const noteSteps = {
            'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11
        };

        const stepsToNote = [
            'C', null, 'D', null, 'E', 'F', null, 'G', null, 'A', null, 'B'
        ];

        for (let i = 0; i < notes.length; i++) {
            const note = notes[i];
            decorated.push({ ...note });

            const canAddGhost = note.type === 'note' &&
                               note.duration > 0.5 &&
                               i < notes.length - 1;

            if (canAddGhost && Math.random() < this.config.ghostNoteProbability) {
                const baseStep = noteSteps[note.note];
                if (baseStep === undefined) continue;

                const ghostStep = (baseStep + 1) % 12;
                let ghostNoteName = stepsToNote[ghostStep];
                let ghostAlteration = '';

                // If the chromatic step lands on a black key, use the base note with sharp
                if (!ghostNoteName) {
                    ghostNoteName = stepsToNote[(ghostStep - 1 + 12) % 12];
                    ghostAlteration = 'sharp';
                }

                if (ghostNoteName) {
                    decorated[decorated.length - 1].duration -= 0.125;

                    decorated.push({
                        type: 'note',
                        note: ghostNoteName,
                        alteration: ghostAlteration,
                        octave: note.octave,
                        duration: 0.125
                    });
                }
            }
        }

        return decorated;
    }

    /**
     * Détecte la tonalité par analyse statistique (Krumhansl-Schmuckler).
     * @param {Array} notes - Tableau de notes/accords/silences
     * @returns {{tonic: string, mode: string}} Tonalité détectée
     * @private
     */
    detectKey(notes) {
        const majorProfile = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
        const minorProfile = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

        const noteSteps = {
            'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11
        };

        const alterationOffset = { 'sharp': 1, 'flat': -1, 'natural': 0, '': 0 };

        const noteFrequency = new Array(12).fill(0);

        notes.forEach(item => {
            if (item.type === 'note') {
                const baseStep = noteSteps[item.note];
                if (baseStep !== undefined) {
                    const offset = alterationOffset[item.alteration || ''];
                    noteFrequency[(baseStep + offset + 12) % 12]++;
                }
            } else if (item.type === 'chord') {
                item.notes.forEach(note => {
                    const baseStep = noteSteps[note.note];
                    if (baseStep !== undefined) {
                        const offset = alterationOffset[note.alteration || ''];
                        noteFrequency[(baseStep + offset + 12) % 12]++;
                    }
                });
            }
        });

        let bestScore = -Infinity;
        let bestKey = { tonic: 'C', mode: 'major' };

        const tonicNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

        for (let tonic = 0; tonic < 12; tonic++) {
            let majorScore = 0;
            let minorScore = 0;
            for (let i = 0; i < 12; i++) {
                const degree = (i - tonic + 12) % 12;
                majorScore += noteFrequency[i] * majorProfile[degree];
                minorScore += noteFrequency[i] * minorProfile[degree];
            }

            if (majorScore > bestScore) {
                bestScore = majorScore;
                bestKey = { tonic: tonicNames[tonic], mode: 'major' };
            }
            if (minorScore > bestScore) {
                bestScore = minorScore;
                bestKey = { tonic: tonicNames[tonic], mode: 'minor' };
            }
        }

        return bestKey;
    }

    /**
     * Génère une ligne de basse marchante (walking bass) à partir de la progression harmonique.
     * @param {Array} notes - Tableau de notes/accords/silences
     * @returns {Array} Ligne de basse (tableau de notes simples)
     * @private
     */
    generateWalkingBass(notes) {
        const bassLine = [];
        const chords = notes.filter(n => n.type === 'chord');

        const noteSteps = {
            'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11
        };

        const stepsToNote = [
            'C', null, 'D', null, 'E', 'F', null, 'G', null, 'A', null, 'B'
        ];

        for (let i = 0; i < chords.length; i++) {
            const chord = chords[i];
            const root = chord.notes[0];
            const rootStep = noteSteps[root.note];

            // Guard against undefined rootStep
            if (rootStep === undefined) {
                console.warn(`Walking bass: unknown root note ${root.note}`);
                continue;
            }

            const numBeats = Math.floor(chord.duration);

            // Detect chord quality for correct third
            let thirdInterval = 4; // Major third by default
            if (chord.notes.length >= 2) {
                const third = chord.notes[1];
                const thirdStep = noteSteps[third.note];
                if (thirdStep !== undefined) {
                    const interval = (thirdStep - rootStep + 12) % 12;
                    if (interval === 3) {
                        thirdInterval = 3; // Minor third
                    }
                }
            }

            // Pattern: root, third, fifth, chromatic approach to next root
            const chordTones = [
                root.note,
                stepsToNote[(rootStep + thirdInterval) % 12],
                stepsToNote[(rootStep + 7) % 12]
            ];

            let passingTone = root.note;
            let passingAlteration = '';
            if (i < chords.length - 1) {
                const nextRoot = chords[i + 1].notes[0];
                const nextRootStep = noteSteps[nextRoot.note];
                const passingStep = (nextRootStep - 1 + 12) % 12;
                const resolvedNote = stepsToNote[passingStep];
                if (resolvedNote) {
                    passingTone = resolvedNote;
                } else {
                    // Chromatic note: use the note below with a sharp
                    const noteBelow = stepsToNote[(passingStep - 1 + 12) % 12];
                    passingTone = noteBelow || root.note;
                    passingAlteration = noteBelow ? 'sharp' : '';
                }
            }

            chordTones.push(passingTone);

            for (let beat = 0; beat < Math.min(numBeats, 4); beat++) {
                const noteName = chordTones[beat % chordTones.length];
                const alteration = (beat % chordTones.length === 3) ? passingAlteration : '';

                bassLine.push({
                    type: 'note',
                    note: noteName || root.note,
                    alteration: alteration,
                    octave: -1,
                    duration: 1
                });
            }
        }

        return bassLine;
    }
}
