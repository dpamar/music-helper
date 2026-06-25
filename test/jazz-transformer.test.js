/**
 * Tests unitaires pour JazzTransformer
 *
 * Pour exécuter : ouvrir test/test-runner.html dans le navigateur
 */

describe('JazzTransformer', () => {
    let transformer;

    beforeEach(() => {
        transformer = new JazzTransformer();
    });

    describe('generateWalkingBass', () => {
        it('génère une walking bass pour une progression simple', () => {
            const notes = [
                { type: 'chord', notes: [{note: 'C', octave: 0}, {note: 'E', octave: 0}, {note: 'G', octave: 0}], duration: 4 }
            ];

            const bassLine = transformer.generateWalkingBass(notes);

            expect(bassLine.length).to.equal(4);
            expect(bassLine[0].note).to.equal('C');
            expect(bassLine[0].octave).to.equal(-1);
        });

        it('génère 16 notes pour 4 accords de durée 4', () => {
            const notes = [
                { type: 'chord', notes: [{note: 'C', octave: 0}, {note: 'E', octave: 0}, {note: 'G', octave: 0}], duration: 4 },
                { type: 'chord', notes: [{note: 'F', octave: 0}, {note: 'A', octave: 0}, {note: 'C', octave: 1}], duration: 4 },
                { type: 'chord', notes: [{note: 'G', octave: 0}, {note: 'B', octave: 0}, {note: 'D', octave: 1}], duration: 4 },
                { type: 'chord', notes: [{note: 'C', octave: 0}, {note: 'E', octave: 0}, {note: 'G', octave: 0}], duration: 4 }
            ];

            const bassLine = transformer.generateWalkingBass(notes);

            expect(bassLine.length).to.equal(16);
            bassLine.forEach(note => {
                expect(note.octave).to.be.at.most(0);
                expect(note.duration).to.equal(1);
            });
        });

        it('utilise des notes de passage chromatiques', () => {
            const notes = [
                { type: 'chord', notes: [{note: 'C', octave: 0}], duration: 4 },
                { type: 'chord', notes: [{note: 'F', octave: 0}], duration: 4 }
            ];

            const bassLine = transformer.generateWalkingBass(notes);

            const hasPassingTone = bassLine.some(note => note.alteration === 'sharp');
            expect(hasPassingTone).to.be.true;
        });
    });

    describe('detectKey', () => {
        it('détecte Do majeur avec tonic emphasis', () => {
            const notes = [
                { type: 'note', note: 'C', octave: 0 },
                { type: 'note', note: 'E', octave: 0 },
                { type: 'note', note: 'G', octave: 0 },
                { type: 'note', note: 'C', octave: 0 }
            ];

            const key = transformer.detectKey(notes);

            expect(key.tonic).to.equal('C');
            expect(key.mode).to.equal('major');
        });

        it('détecte La mineur', () => {
            const notes = [
                { type: 'note', note: 'A', octave: 0 },
                { type: 'note', note: 'C', octave: 1 },
                { type: 'note', note: 'E', octave: 1 },
                { type: 'note', note: 'A', octave: 0 }
            ];

            const key = transformer.detectKey(notes);

            expect(key.tonic).to.equal('A');
            expect(key.mode).to.equal('minor');
        });

        it('gère les accords dans la détection', () => {
            const notes = [
                { type: 'chord', notes: [{note: 'G', octave: 0}, {note: 'B', octave: 0}, {note: 'D', octave: 1}], duration: 4 },
                { type: 'note', note: 'G', octave: 0 }
            ];

            const key = transformer.detectKey(notes);

            expect(key.tonic).to.equal('G');
            expect(key.mode).to.equal('major');
        });
    });

    describe('enrichChords', () => {
        it('ajoute une 7ème aux triades', () => {
            transformer.config.chordExtensions = ['7th'];

            const notes = [
                { type: 'chord', notes: [
                    {note: 'C', octave: 0, alteration: ''},
                    {note: 'E', octave: 0, alteration: ''},
                    {note: 'G', octave: 0, alteration: ''}
                ], duration: 2 }
            ];

            const enriched = transformer.enrichChords(notes);

            expect(enriched[0].notes.length).to.equal(4);
            expect(enriched[0].notes[3].note).to.equal('B');
        });

        it('ajoute une 9ème majeure aux accords majeurs', () => {
            transformer.config.chordExtensions = ['7th', '9th'];

            const notes = [
                { type: 'chord', notes: [
                    {note: 'C', octave: 0, alteration: ''},
                    {note: 'E', octave: 0, alteration: ''},
                    {note: 'G', octave: 0, alteration: ''}
                ], duration: 2 }
            ];

            const enriched = transformer.enrichChords(notes);

            expect(enriched[0].notes.length).to.equal(5);
            expect(enriched[0].notes[4].note).to.equal('D');
        });

        it('utilise 7ème mineure pour accords mineurs', () => {
            transformer.config.chordExtensions = ['7th'];

            const notes = [
                { type: 'chord', notes: [
                    {note: 'A', octave: 0, alteration: ''},
                    {note: 'C', octave: 1, alteration: ''},
                    {note: 'E', octave: 1, alteration: ''}
                ], duration: 2 }
            ];

            const enriched = transformer.enrichChords(notes);

            expect(enriched[0].notes[3].note).to.equal('G');
        });

        it('ajoute toutes les extensions (7, 9, 11, 13)', () => {
            transformer.config.chordExtensions = ['7th', '9th', '11th', '13th'];

            const notes = [
                { type: 'chord', notes: [
                    {note: 'C', octave: 0, alteration: ''},
                    {note: 'E', octave: 0, alteration: ''},
                    {note: 'G', octave: 0, alteration: ''}
                ], duration: 2 }
            ];

            const enriched = transformer.enrichChords(notes);

            expect(enriched[0].notes.length).to.equal(7);
        });

        it('ne modifie pas les notes simples', () => {
            const notes = [
                { type: 'note', note: 'C', octave: 0, alteration: '', duration: 1 }
            ];

            const enriched = transformer.enrichChords(notes);

            expect(enriched[0].type).to.equal('note');
        });
    });

    describe('addGhostNotes', () => {
        it('ajoute des ghost notes entre les notes principales', () => {
            transformer.config.ghostNoteProbability = 1.0;

            const notes = [
                { type: 'note', note: 'C', octave: 0, duration: 1 },
                { type: 'note', note: 'D', octave: 0, duration: 1 }
            ];

            const decorated = transformer.addGhostNotes(notes);

            expect(decorated.length).to.be.greaterThan(2);

            const hasGhostNotes = decorated.some(n => n.duration === 0.125);
            expect(hasGhostNotes).to.be.true;
        });

        it('ne modifie pas les silences', () => {
            transformer.config.ghostNoteProbability = 1.0;

            const notes = [
                { type: 'rest', duration: 1 }
            ];

            const decorated = transformer.addGhostNotes(notes);

            expect(decorated.length).to.equal(1);
            expect(decorated[0].type).to.equal('rest');
        });

        it('ne modifie pas les notes trop courtes', () => {
            transformer.config.ghostNoteProbability = 1.0;

            const notes = [
                { type: 'note', note: 'C', octave: 0, duration: 0.25 },
                { type: 'note', note: 'D', octave: 0, duration: 1 }
            ];

            const decorated = transformer.addGhostNotes(notes);

            expect(decorated[0].duration).to.equal(0.25);
        });

        it('respecte la probabilité 0 (pas de ghost notes)', () => {
            transformer.config.ghostNoteProbability = 0;

            const notes = [
                { type: 'note', note: 'C', octave: 0, duration: 1 },
                { type: 'note', note: 'D', octave: 0, duration: 1 },
                { type: 'note', note: 'E', octave: 0, duration: 1 }
            ];

            const decorated = transformer.addGhostNotes(notes);

            expect(decorated.length).to.equal(3);
        });
    });

    describe('applySwing', () => {
        it('transforme les croches en triolets swing', () => {
            const notes = [
                { type: 'note', note: 'C', duration: 0.5 },
                { type: 'note', note: 'D', duration: 0.5 }
            ];

            const swung = transformer.applySwing(notes);

            expect(swung[0].duration).to.equal(0.67);
            expect(swung[1].duration).to.equal(0.33);
        });

        it('ne modifie pas les notes non-croches', () => {
            const notes = [
                { type: 'note', note: 'C', duration: 1 },
                { type: 'note', note: 'D', duration: 2 }
            ];

            const swung = transformer.applySwing(notes);

            expect(swung[0].duration).to.equal(1);
            expect(swung[1].duration).to.equal(2);
        });
    });

    describe('transform (intégration)', () => {
        it('applique toutes les transformations jazz', () => {
            const scoreData = {
                title: 'Test',
                tempo: 120,
                timeSignature: { numerator: 4, denominator: 4 },
                clef: 'sol',
                keySignature: [],
                notes: [
                    { type: 'chord', notes: [
                        {note: 'C', octave: 0, alteration: ''},
                        {note: 'E', octave: 0, alteration: ''},
                        {note: 'G', octave: 0, alteration: ''}
                    ], duration: 4 }
                ]
            };

            transformer.config.walkingBassEnabled = true;

            const jazzScore = transformer.transform(scoreData);

            expect(jazzScore.tempo).to.be.greaterThan(120);
            expect(jazzScore.bassLine).to.exist;
            expect(jazzScore.bassLine.length).to.be.greaterThan(0);
            expect(jazzScore.notes[0].notes.length).to.be.greaterThan(3);
        });

        it('conserve le titre original', () => {
            const scoreData = {
                title: 'Ma chanson',
                tempo: 100,
                timeSignature: { numerator: 3, denominator: 4 },
                clef: 'sol',
                keySignature: [],
                notes: [
                    { type: 'note', note: 'C', octave: 0, alteration: '', duration: 1 }
                ]
            };

            const jazzScore = transformer.transform(scoreData);

            expect(jazzScore.title).to.equal('Ma chanson');
        });
    });
});
