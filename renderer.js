/**
 * Renderer - Dessine la partition musicale sur un Canvas HTML5.
 */
class Renderer {
    /**
     * Initialise le moteur de rendu avec les configurations par defaut.
     */
    constructor() {
        this.config = {
            staffLineSpacing: 12,
            noteWidth: 40,
            marginLeft: 50,
            marginTop: 100,
            staffStartX: 80,
            clefWidth: 60,
            canvasBottomMargin: 50  // Marge en bas du canvas pour eviter que la barre finale ne touche le bord
        };

        this.notePositions = {
            'C': { 'sol': -2, 'fa': 3 },
            'D': { 'sol': -1, 'fa': 4 },
            'E': { 'sol': 0, 'fa': 5 },
            'F': { 'sol': 1, 'fa': 6 },
            'G': { 'sol': 2, 'fa': 7 },
            'A': { 'sol': 3, 'fa': 8 },
            'B': { 'sol': 4, 'fa': 9 }
        };

        this.drawingInfo = {
            optimizationMode: false,
            fakeMode: false,
            alterationCount: 0,
            lastScore: {}
        };
    }

    /**
     * Dessine la partition complete sur un Canvas HTML5.
     * Cree le canvas, dessine portee, clef, armure, chiffrage, notes.
     * @param {Object} scoreData - Objet ParseResult (resultat de Parser.parse())
     * @param {HTMLElement} container - Element DOM ou inserer le canvas
     * @returns {void}
     */
    render(scoreData, container) {
        const width = 1000;
        const initialHeight = 480;

        var ctx = null;
        var canvas = null;
        if (!this.drawingInfo.fakeMode) {
            while (container.firstChild) {
                container.removeChild(container.firstChild);
            }

            canvas = document.createElement('canvas');
            canvas.id = 'score-canvas';
            canvas.width = width;
            canvas.height = initialHeight;

            container.appendChild(canvas);
            ctx = canvas.getContext('2d');
        }

        this.drawingInfo.alterationCount = 0;
        this.lastScore = {};

        this.drawTitle(ctx, scoreData.title, width);
        this.drawMetadata(ctx, scoreData, width);
        this.drawStaff(ctx, scoreData.clef);
        this.drawClef(ctx, scoreData.clef);

        let currentX = this.config.staffStartX + this.config.clefWidth;
        currentX = this.drawKeySignature(ctx, scoreData.keySignature, currentX, scoreData.clef);
        currentX = this.drawTimeSignature(ctx, scoreData.timeSignature, currentX);

        currentX += 20;
        const finalHeight = this.drawNotes(ctx, scoreData.notes, scoreData.timeSignature, currentX, scoreData.clef, this.getSignaturesMap(scoreData.keySignature));

        // Redimensionner le canvas si necessaire
        if (!this.drawingInfo.fakeMode && canvas && finalHeight > initialHeight) {
            canvas.height = finalHeight; // finalHeight inclut deja canvasBottomMargin (retour de drawNotes)

            // Redessiner tout sur le canvas agrandi
            ctx = canvas.getContext('2d');
            this.drawTitle(ctx, scoreData.title, width);
            this.drawMetadata(ctx, scoreData, width);
            this.drawStaff(ctx, scoreData.clef);
            this.drawClef(ctx, scoreData.clef);

            let currentX = this.config.staffStartX + this.config.clefWidth;
            currentX = this.drawKeySignature(ctx, scoreData.keySignature, currentX, scoreData.clef);
            currentX = this.drawTimeSignature(ctx, scoreData.timeSignature, currentX);

            currentX += 20;
            this.drawNotes(ctx, scoreData.notes, scoreData.timeSignature, currentX, scoreData.clef, this.getSignaturesMap(scoreData.keySignature));
        }
    }

    /**
     * Optimise l'armure pour minimiser les alterations accidentelles.
     * Teste toutes les armures possibles (0-7 dieses, 0-7 bemols) et choisit la meilleure.
     * @param {Object} scoreData - Partition a optimiser
     * @returns {Object} Nouvelle partition avec armure optimale
     */
    optimizeKeySignature(scoreData) {
        const allSignatures = [[]];
        const sharpSignatures = 'FCGDAEB', flatSignatures = 'BEADGCF';
        for (var i = 1; i <= 7; i++) {
            allSignatures.push([...sharpSignatures.substr(0, i)].map(x => { return { note: x, alteration: 'sharp' }; }));
            allSignatures.push([...flatSignatures.substr(0, i)].map(x => { return { note: x, alteration: 'flat' }; }));
        }

        this.drawingInfo.fakeMode = true;

        var minAlterationCount = Infinity;
        var bestScoreData = scoreData;

        for (const signature of allSignatures) {
            const newScoreData = {
                title: scoreData.title,
                tempo: scoreData.tempo,
                timeSignature: scoreData.timeSignature,
                clef: scoreData.clef,
                keySignature: signature,
                notes: scoreData.notes
            };
            this.render(newScoreData, null, true, true);
            if (minAlterationCount <= this.drawingInfo.alterationCount) {
                continue;
            }
            minAlterationCount = this.drawingInfo.alterationCount;
            bestScoreData = newScoreData;
        }
        this.drawingInfo.fakeMode = false;
        return bestScoreData;
    }

    /**
     * Active/desactive le mode optimisation (pour getBestRepresentation).
     * @param {boolean} optimizationMode - true pour activer l'optimisation
     * @returns {void}
     */
    setOptimizationMode(optimizationMode) {
        this.drawingInfo.optimizationMode = optimizationMode;
    }

    /**
     * Dessine le titre de la partition (centre, 28px, gras).
     * @param {CanvasRenderingContext2D} ctx - Contexte canvas
     * @param {string} title - Titre de la partition
     * @param {number} canvasWidth - Largeur du canvas
     * @returns {void}
     * @private
     */
    drawTitle(ctx, title, canvasWidth) {
        this.drawingInfo.lastScore.title = title;
        if (this.drawingInfo.fakeMode || !title || title.trim() === '') {
            return;
        }

        ctx.font = 'bold 28px serif';
        ctx.fillStyle = '#000';
        ctx.textAlign = 'center';
        ctx.fillText(title, canvasWidth / 2, 40);
        ctx.textAlign = 'left';
    }

    /**
     * Dessine les metadonnees (tempo, chiffrage, clef) sous le titre.
     * @param {CanvasRenderingContext2D} ctx - Contexte canvas
     * @param {Object} scoreData - Partition complete
     * @param {number} canvasWidth - Largeur du canvas
     * @returns {void}
     * @private
     */
    drawMetadata(ctx, scoreData, canvasWidth) {
        this.drawingInfo.lastScore.tempo = scoreData.tempo;
        if (this.drawingInfo.fakeMode) {
            return;
        }
        const metaText = `♩ = ${scoreData.tempo} | ${scoreData.timeSignature.numerator}/${scoreData.timeSignature.denominator} | Clef de ${scoreData.clef}`;

        ctx.font = '16px sans-serif';
        ctx.fillStyle = '#555';
        ctx.textAlign = 'center';
        ctx.fillText(metaText, canvasWidth / 2, 65);
        ctx.textAlign = 'left';
    }

    /**
     * Dessine les 5 lignes horizontales de la portee.
     * @param {CanvasRenderingContext2D} ctx - Contexte canvas
     * @param {string} clef - Type de clef (pour reference)
     * @param {number|null} yOffset - Position Y de la portee (null = utiliser marginTop)
     * @returns {void}
     * @private
     */
    drawStaff(ctx, clef, yOffset = null) {
        if (this.drawingInfo.fakeMode) {
            return;
        }
        const y = yOffset || this.config.marginTop;
        const spacing = this.config.staffLineSpacing;

        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;

        for (let i = 0; i < 5; i++) {
            const lineY = y + (i * spacing);
            ctx.beginPath();
            ctx.moveTo(this.config.staffStartX, lineY);
            ctx.lineTo(900, lineY);
            ctx.stroke();
        }
    }

    /**
     * Dessine le symbole de clef (treble 𝄞 ou bass 𝄢).
     * @param {CanvasRenderingContext2D} ctx - Contexte canvas
     * @param {string} clef - "sol" ou "fa"
     * @returns {void}
     * @private
     */
    drawClef(ctx, clef) {
        this.drawingInfo.lastScore.clef = clef;
        if (this.drawingInfo.fakeMode) {
            return;
        }
        const x = this.config.staffStartX + 10;

        ctx.font = 'bold 60px serif';
        ctx.fillStyle = '#000';

        if (clef === 'sol') {
            const y = this.config.marginTop + (3 * this.config.staffLineSpacing);
            ctx.fillText('𝄞', x, y + 5);
        } else {
            const y = this.config.marginTop + (3 * this.config.staffLineSpacing);
            ctx.fillText('𝄢', x, y + 2);
        }
    }

    /**
     * Dessine l'armure (dieses et bemols a la clef).
     * @param {CanvasRenderingContext2D} ctx - Contexte canvas
     * @param {Array<{note: string, alteration: string}>} keySignature - Armure
     * @param {number} startX - Position X de depart
     * @param {string} clef - "sol" ou "fa"
     * @returns {number} Position X apres l'armure
     * @private
     */
    drawKeySignature(ctx, keySignature, startX, clef) {
        this.drawingInfo.lastScore.keySignature = keySignature;
        if (this.drawingInfo.fakeMode) {
            return;
        }
        let x = startX;

        for (const alt of keySignature) {
            let position = this.notePositions[alt.note][clef];

            if (clef === 'sol' && alt.note !== 'A' && alt.note !== 'B') {
                position += 7;
            }

            const y = this.getYPosition(position) + 5;

            ctx.font = 'bold 20px serif';
            ctx.fillStyle = '#000';

            if (alt.alteration === 'sharp') {
                ctx.fillText('♯', x, y);
            } else if (alt.alteration === 'flat') {
                ctx.fillText('♭', x, y);
            }

            x += 15;
        }

        return x;
    }

    /**
     * Dessine le chiffrage de mesure (numerateur / denominateur).
     * @param {CanvasRenderingContext2D} ctx - Contexte canvas
     * @param {{numerator: number, denominator: number}} timeSignature - Chiffrage
     * @param {number} startX - Position X de depart
     * @returns {number} Position X apres le chiffrage
     * @private
     */
    drawTimeSignature(ctx, timeSignature, startX) {
        this.drawingInfo.lastScore.timeSignature = timeSignature;
        if (this.drawingInfo.fakeMode) {
            return;
        }
        const y = this.config.marginTop + (2 * this.config.staffLineSpacing);

        ctx.font = 'bold 24px serif';
        ctx.fillStyle = '#000';
        ctx.textAlign = 'center';

        ctx.fillText(timeSignature.numerator.toString(), startX + 15, y - 10);
        ctx.fillText(timeSignature.denominator.toString(), startX + 15, y + 20);

        ctx.textAlign = 'left';

        return startX + 40;
    }

    /**
     * Dessine toutes les notes, accords et silences avec barres de mesure.
     * Gere les retours a la ligne automatiques.
     * @param {CanvasRenderingContext2D} ctx - Contexte canvas
     * @param {Array} notes - Tableau de notes/accords/silences
     * @param {Object} timeSignature - Chiffrage de mesure
     * @param {number} startX - Position X de depart
     * @param {string} clef - "sol" ou "fa"
     * @param {Array} signatures - Map des alterations de l'armure
     * @returns {number} Hauteur finale necessaire pour le canvas
     * @private
     */
    drawNotes(ctx, notes, timeSignature, startX, clef, signatures) {
        this.drawingInfo.lastScore.notes = [];

        let x = startX;
        let currentStaffY = this.config.marginTop;
        let staffCount = 0;
        let beatsPerMesure = this.beatsPerMesure(timeSignature);

        let remainingUntilMeasureBar = beatsPerMesure;

        for (const item of notes) {
            if (x > 850) {
                staffCount++;
                x = this.config.staffStartX + this.config.clefWidth + 60;
                currentStaffY = this.config.marginTop + (staffCount * 150);

                this.drawStaff(ctx, clef, currentStaffY);
            }

            if (item.type === 'rest') {
                x = this.drawRest(ctx, item, x, currentStaffY);
                remainingUntilMeasureBar -= item.duration;
                if (remainingUntilMeasureBar <= 0) {
                    remainingUntilMeasureBar = beatsPerMesure;
                    this.drawBarline(ctx, x, currentStaffY, false);
                    x += this.config.noteWidth >> 1;
                }
            } else {
                let firstNoteX = null, lastNoteX = null;
                let noteY = null;

                let drawer = item.type === 'note' ? "drawNote" : "drawChord";

                let remainingItemDuration = item.duration;
                let noteBuffer = [];
                while (remainingItemDuration >= remainingUntilMeasureBar) {
                    firstNoteX = firstNoteX || x;
                    lastNoteX = x;
                    let notePosition = this[drawer](ctx, item, x, clef, signatures, currentStaffY, remainingUntilMeasureBar, noteBuffer);
                    x = notePosition.x;
                    noteY = notePosition.y;
                    remainingItemDuration -= remainingUntilMeasureBar;
                    remainingUntilMeasureBar = beatsPerMesure;

                    this.drawBarline(ctx, x, currentStaffY, false);
                    x += this.config.noteWidth >> 1;
                }
                if (remainingItemDuration > 0) {
                    firstNoteX = firstNoteX || x;
                    lastNoteX = x;
                    let notePosition = this[drawer](ctx, item, x, clef, signatures, currentStaffY, remainingItemDuration, noteBuffer);
                    x = notePosition.x;
                    noteY = notePosition.y;
                    remainingUntilMeasureBar -= remainingItemDuration;
                }
                this.drawingInfo.lastScore.notes.push(noteBuffer[0]);
                if (firstNoteX != lastNoteX) {
                    this.drawLink(ctx, firstNoteX + this.config.noteWidth / 2, lastNoteX, noteY - 40);
                }
            }
        }
        if (remainingUntilMeasureBar != beatsPerMesure) {
            if (remainingUntilMeasureBar >= 4) {
                x = this.drawRest(ctx, {duration: 4}, x, currentStaffY);
                remainingUntilMeasureBar -= 4;
            }
            if (remainingUntilMeasureBar >= 2) {
                x = this.drawRest(ctx, {duration: 2}, x, currentStaffY);
                remainingUntilMeasureBar -= 2;
            }
            if (remainingUntilMeasureBar >= 1) {
                x = this.drawRest(ctx, {duration: 1}, x, currentStaffY);
                remainingUntilMeasureBar -= 1;
            }
            if (remainingUntilMeasureBar >= .5) {
                x = this.drawRest(ctx, {duration: .5}, x, currentStaffY);
                remainingUntilMeasureBar -= .5;
            }
            if (remainingUntilMeasureBar >= .25) {
                x = this.drawRest(ctx, {duration: .25}, x, currentStaffY);
                remainingUntilMeasureBar -= .25;
            }
        }

        this.drawBarline(ctx, x, currentStaffY, true);

        // Retourner la hauteur finale necessaire (position derniere portee + hauteur portee + marge bas)
        return currentStaffY + (4 * this.config.staffLineSpacing) + this.config.canvasBottomMargin;
    }

    /**
     * Dessine une note simple (tete, hampe, alteration, point).
     * @param {CanvasRenderingContext2D} ctx - Contexte canvas
     * @param {Object} note - Note a dessiner
     * @param {number} x - Position X
     * @param {string} clef - "sol" ou "fa"
     * @param {Array} signatures - Map des alterations de l'armure
     * @param {number|null} staffY - Position Y de la portee (null = marginTop)
     * @param {number|null} durationModification - Duree alternative (pour notes liees)
     * @returns {{x: number, y: number}} Nouvelle position X et Y de la note
     * @private
     */
    drawNote(ctx, note, x, clef, signatures, staffY = null, durationModification = null, noteBuffer = []) {
        var effectiveNote = { note: note.note, alteration: note.alteration, octave: note.octave };
        effectiveNote = this.getBestRepresentation(effectiveNote, signatures);

        const basePosition = this.notePositions[effectiveNote.note][clef];
        const position = basePosition + (effectiveNote.octave * 7);
        const y = this.getYPosition(position, staffY);
        const duration = durationModification || note.duration;

        this.drawLedgerLines(ctx, x, position, staffY);
        this.drawNoteHead(ctx, x, y, duration);
        const effectiveAlteration = this.handleAlteration(ctx, x, y, effectiveNote, signatures);
        this.handleDot(ctx, x, y, duration);

        if (duration < 4) {
            this.drawNoteStem(ctx, x, y, duration);
        }

        noteBuffer.push({
            note: effectiveNote.note,
            alteration: effectiveAlteration,
            octave: effectiveNote.octave,
            type: 'note',
            duration: note.duration
        });

        return { 'x': x + this.config.noteWidth, 'y': y };
    }

    /**
     * Dessine un accord (plusieurs notes superposees).
     * @param {CanvasRenderingContext2D} ctx - Contexte canvas
     * @param {Object} chord - Accord a dessiner
     * @param {number} x - Position X
     * @param {string} clef - "sol" ou "fa"
     * @param {Array} signatures - Map des alterations de l'armure
     * @param {number|null} staffY - Position Y de la portee
     * @param {number|null} durationModification - Duree alternative
     * @returns {{x: number, y: number}} Nouvelle position X et Y
     * @private
     */
    drawChord(ctx, chord, x, clef, signatures, staffY = null, durationModification = null, noteBuffer = []) {
        const duration = durationModification || chord.duration;

        var chordData;
        noteBuffer.push(chordData = {
            type: 'chord',
            duration: chord.duration,
            notes: []
        });
        var firstNote = null;
        var firstNotePosition = 0;
        for (const note of chord.notes) {
            var effectiveNote = { note: note.note, alteration: note.alteration, octave: note.octave };
            effectiveNote = this.getBestRepresentation(effectiveNote, signatures);

            const basePosition = this.notePositions[effectiveNote.note][clef];
            const position = basePosition + (effectiveNote.octave * 7);
            if (firstNote == null || firstNotePosition < position) {
                firstNote = effectiveNote;
                firstNotePosition = position;
            }
            const y = this.getYPosition(position, staffY);

            this.drawLedgerLines(ctx, x, position, staffY);
            this.drawNoteHead(ctx, x, y, duration);
            if (duration < 4) {
                this.drawNoteStem(ctx, x, y, 1);
            }

            const effectiveAlteration = this.handleAlteration(ctx, x, y, effectiveNote, signatures);
            chordData.notes.push({note: effectiveNote.note, alteration: effectiveAlteration, octave: effectiveNote.octave});
        }

        const basePosition = this.notePositions[firstNote.note][clef];
        const position = basePosition + (firstNote.octave * 7);
        const y = this.getYPosition(position, staffY);

        if (duration < 4) {
            this.drawNoteStem(ctx, x, y, duration);
        }

        this.handleDot(ctx, x, y, duration);
        return { 'x': x + this.config.noteWidth, 'y': y };
    }

    /**
     * Dessine un silence (symbole geometrique selon la duree).
     * @param {CanvasRenderingContext2D} ctx - Contexte canvas
     * @param {Object} rest - Silence a dessiner
     * @param {number} x - Position X
     * @param {number|null} staffY - Position Y de la portee
     * @returns {number} Nouvelle position X
     * @private
     */
    drawRest(ctx, rest, x, staffY = null) {
        this.drawingInfo.lastScore.notes.push({
            type: 'rest',
            duration: rest.duration
        });
        if (this.drawingInfo.fakeMode) {
            return;
        }

        const y = (staffY || this.config.marginTop) + (this.config.staffLineSpacing);

        ctx.font = 'bold 30px serif';
        ctx.fillStyle = '#000';

        if (rest.duration >= 2) {
            const originY = rest.duration >= 4 ? y : y + 7;
            ctx.moveTo(x + 5, originY);
            ctx.lineTo(x + 20, originY);
            ctx.lineTo(x + 20, originY + 5);
            ctx.lineTo(x + 5, originY + 5);
            ctx.lineTo(x + 5, originY);
            ctx.fill();
        } else if (rest.duration >= 1) {
            ctx.save();
            ctx.strokeStyle = '#000';
            ctx.fillStyle = '#000';
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.lineWidth = 2.5;

            ctx.beginPath();
            ctx.moveTo(x + 11, y + 1);
            ctx.lineTo(x + 5, y + 8);
            ctx.lineTo(x + 11, y + 11);
            ctx.lineTo(x + 5, y + 18);
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(x + 8, y + 20, 3, Math.PI * 0.7, Math.PI * 2.3);
            ctx.stroke();

            ctx.restore();
        } else if (rest.duration >= 0.5) {
            ctx.beginPath();
            ctx.arc(x + 5, y + 3, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.moveTo(x + 8, y + 3);
            ctx.lineTo(x + 10, y);
            ctx.lineTo(x + 5, y + 15);
            ctx.stroke();
        } else {
            ctx.beginPath();
            ctx.arc(x + 5, y + 3, 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.arc(x + 8, y - 5, 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.moveTo(x + 8, y + 3);
            ctx.lineTo(x + 10, y);
            ctx.stroke();
            ctx.moveTo(x + 12, y - 8);
            ctx.lineTo(x + 5, y + 15);
            ctx.stroke();
        }
        x += this.config.noteWidth;

        return x;
    }

    /**
     * Dessine la tete de note (ovale pleine ou vide selon la duree).
     * @param {CanvasRenderingContext2D} ctx - Contexte canvas
     * @param {number} x - Position X
     * @param {number} y - Position Y
     * @param {number} duration - Duree de la note
     * @returns {void}
     * @private
     */
    drawNoteHead(ctx, x, y, duration) {
        if (this.drawingInfo.fakeMode) {
            return;
        }

        ctx.fillStyle = '#000';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;

        if (duration >= 2) {
            ctx.beginPath();
            ctx.ellipse(x + 5, y, 6, 5, -0.3, 0, Math.PI * 2);
            ctx.stroke();
        } else {
            ctx.beginPath();
            ctx.ellipse(x + 5, y, 6, 5, -0.3, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    /**
     * Dessine la hampe de note (et crochets si necessaire).
     * @param {CanvasRenderingContext2D} ctx - Contexte canvas
     * @param {number} x - Position X
     * @param {number} y - Position Y de la tete
     * @param {number} duration - Duree de la note
     * @returns {void}
     * @private
     */
    drawNoteStem(ctx, x, y, duration) {
        if (this.drawingInfo.fakeMode) {
            return;
        }

        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.moveTo(x + 11, y);
        ctx.lineTo(x + 11, y - 40);
        ctx.stroke();

        if (duration < 1) {
            ctx.beginPath();
            ctx.moveTo(x + 11, y - 40);
            ctx.quadraticCurveTo(x + 20, y - 35, x + 18, y - 30);
            ctx.stroke();
        }
        if (duration < 0.5) {
            ctx.beginPath();
            ctx.moveTo(x + 11, y - 33);
            ctx.quadraticCurveTo(x + 20, y - 28, x + 18, y - 23);
            ctx.stroke();
        }
    }

    /**
     * Dessine une alteration accidentelle (diese, bemol, becarre).
     * Incremente le compteur d'alterations (pour optimisation).
     * @param {CanvasRenderingContext2D} ctx - Contexte canvas
     * @param {string} alteration - Type d'alteration ('sharp', 'flat', 'natural')
     * @param {number} x - Position X
     * @param {number} y - Position Y
     * @returns {void}
     * @private
     */
    drawAccidental(ctx, alteration, x, y) {
        this.drawingInfo.alterationCount++;
        if (this.drawingInfo.fakeMode) {
            return;
        }

        ctx.font = 'bold 20px serif';
        ctx.fillStyle = '#000';

        if (alteration === 'sharp') {
            ctx.fillText('♯', x, y);
        } else if (alteration === 'flat') {
            ctx.fillText('♭', x, y);
        } else if (alteration === 'natural') {
            ctx.fillText('♮', x, y);
        }
    }

    /**
     * Dessine une barre de mesure (simple ou double).
     * @param {CanvasRenderingContext2D} ctx - Contexte canvas
     * @param {number} x - Position X
     * @param {number|null} staffY - Position Y de la portee
     * @param {boolean} isDouble - true pour barre double (fin de morceau)
     * @returns {void}
     * @private
     */
    drawBarline(ctx, x, staffY = null, isDouble = false) {
        if (this.drawingInfo.fakeMode) {
            return;
        }

        const y = staffY || this.config.marginTop;
        const height = 4 * this.config.staffLineSpacing;

        ctx.strokeStyle = '#000';
        ctx.lineWidth = isDouble ? 3 : 1;

        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + height);
        ctx.stroke();

        if (isDouble) {
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x - 5, y);
            ctx.lineTo(x - 5, y + height);
            ctx.stroke();
        }
    }

    /**
     * Dessine les lignes supplementaires (au-dessus ou en-dessous de la portee).
     * @param {CanvasRenderingContext2D} ctx - Contexte canvas
     * @param {number} x - Position X de la note
     * @param {number} position - Position sur la portee
     * @param {number|null} staffY - Position Y de la portee
     * @returns {void}
     * @private
     */
    drawLedgerLines(ctx, x, position, staffY = null) {
        if (this.drawingInfo.fakeMode) {
            return;
        }

        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;

        if (position < 0) {
            for (let p = -1; p > position; p -= 2) {
                const y = this.getYPosition(p, staffY);
                ctx.beginPath();
                ctx.moveTo(x - 5, y + 5);
                ctx.lineTo(x + 18, y + 5);
                ctx.stroke();
            }
        } else if (position > 9) {
            for (let p = 9; p < position; p += 2) {
                const y = this.getYPosition(p, staffY);
                ctx.beginPath();
                ctx.moveTo(x - 5, y - 5);
                ctx.lineTo(x + 18, y - 5);
                ctx.stroke();
            }
        }
    }

    /**
     * Dessine un arc de liaison entre deux notes (pour notes prolongees sur plusieurs mesures).
     * @param {CanvasRenderingContext2D} ctx - Contexte canvas
     * @param {number} firstNoteX - Position X de la premiere note
     * @param {number} lastNoteX - Position X de la derniere note
     * @param {number} noteY - Position Y des notes
     * @returns {void}
     * @private
     */
    drawLink(ctx, firstNoteX, lastNoteX, noteY) {
        if (this.drawingInfo.fakeMode) {
            return;
        }
        let centerX = (firstNoteX + lastNoteX) / 2;
        let offsetY = this.config.staffLineSpacing * 10;
        let centerY = noteY + offsetY;
        let radiusX = (lastNoteX - firstNoteX) / 2;
        let radius = (radiusX ** 2 + offsetY ** 2) ** .5;
        let angleStart = Math.asin(offsetY / radius) - Math.PI;
        let angleEnd = -Math.asin(offsetY / radius);

        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, angleEnd, angleStart, true);
        ctx.stroke();
    }

    /**
     * Convertit l'armure en map pour acces rapide.
     * @param {Array<{note: string, alteration: string}>} keySignature - Armure
     * @returns {Array} Map indexee par nom de note
     * @private
     */
    getSignaturesMap(keySignature) {
        const signaturesMap = [];
        keySignature.map(x => signaturesMap[x.note] = x.alteration);
        return signaturesMap;
    }

    /**
     * Calcule le nombre de temps par mesure (en noires).
     * @param {{numerator: number, denominator: number}} timeSignature - Chiffrage
     * @returns {number} Nombre de temps par mesure
     * @private
     */
    beatsPerMesure(timeSignature) {
        const unit = { 1: 4, 2: 2, 4: 1, 8: 0.5, 16: 0.25 };
        var result = timeSignature.numerator * unit[timeSignature.denominator];
        return result;
    }

    /**
     * Convertit une position de portee en coordonnee Y pixels.
     * @param {number} position - Position sur la portee (0 = ligne du bas, augmente vers le haut)
     * @param {number|null} staffY - Position Y de la portee (null = marginTop)
     * @returns {number} Coordonnee Y en pixels
     * @private
     */
    getYPosition(position, staffY = null) {
        const staffFirstLine = (staffY || this.config.marginTop);
        const spacing = this.config.staffLineSpacing / 2;
        return staffFirstLine + (4 * this.config.staffLineSpacing) - (position * spacing);
    }

    /**
     * Gere l'affichage de l'alteration d'une note (diese, bemol, becarre).
     * Appelle drawAccidental si necessaire.
     * @param {CanvasRenderingContext2D} ctx - Contexte canvas
     * @param {number} x - Position X
     * @param {number} y - Position Y
     * @param {Object} note - Note avec alteration
     * @param {Array} defaultAlterations - Alterations de l'armure
     * @returns {string} - Alteration effective
     * @private
     */
    handleAlteration(ctx, x, y, note, defaultAlterations) {
        var alterationToDraw = this.computeAlteration(note.note, note.alteration, defaultAlterations[note.note]);
        if (alterationToDraw) {
            this.drawAccidental(ctx, alterationToDraw, x - 15, y);
        }
        return alterationToDraw;
    }

    /**
     * Gere l'affichage du point de prolongation (note pointee).
     * @param {CanvasRenderingContext2D} ctx - Contexte canvas
     * @param {number} x - Position X
     * @param {number} y - Position Y
     * @param {number} duration - Duree de la note
     * @returns {void}
     * @private
     */
    handleDot(ctx, x, y, duration) {
        if (this.drawingInfo.fakeMode) {
            return;
        }

        if (this.isDotted(duration)) {
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.arc(x + 20, y, 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    /**
     * Calcule l'alteration effective a afficher (en tenant compte de l'armure).
     * @param {string} note - Nom de la note
     * @param {string} initialAlteration - Alteration de la note
     * @param {string} defaultAlteration - Alteration de l'armure pour cette note
     * @returns {string} Alteration a dessiner ('' si aucune)
     * @private
     */
    computeAlteration(note, initialAlteration, defaultAlteration) {
        var alterationToDraw = initialAlteration;
        if (defaultAlteration) {
            if (alterationToDraw == defaultAlteration) {
                alterationToDraw = '';
            } else if (alterationToDraw == '') {
                alterationToDraw = 'natural';
            }
        }
        return alterationToDraw;
    }

    /**
     * Choisit la meilleure representation d'une note (Do# ou Reb) pour minimiser les alterations.
     * @param {Object} noteWithAlteration - Note avec alteration
     * @param {Array} defaultAlterations - Alterations de l'armure
     * @returns {Object} Representation optimale (peut etre la note originale ou son enharmonique)
     * @private
     */
    getBestRepresentation(noteWithAlteration, defaultAlterations) {
        if (!this.drawingInfo.optimizationMode) {
            return noteWithAlteration;
        }
        var option1 = this.computeAlteration(noteWithAlteration.note, noteWithAlteration.alteration, defaultAlterations[noteWithAlteration.note]);
        if (!option1) {
            return noteWithAlteration;
        }
        var secondaryRep = this.getSecondaryRepresentation(noteWithAlteration);
        var option2 = this.computeAlteration(secondaryRep.note, secondaryRep.alteration, defaultAlterations[secondaryRep.note]);
        if (!option2) {
            return secondaryRep;
        }
        return noteWithAlteration;
    }

    /**
     * Calcule la representation enharmonique d'une note (Do# <-> Reb).
     * @param {Object} noteWithAlteration - Note avec alteration
     * @returns {Object} Note enharmonique (ou note originale si non applicable)
     * @private
     */
    getSecondaryRepresentation(noteWithAlteration) {
        if (noteWithAlteration.alteration == 'sharp') {
            const notes = 'ABCDEFGA';
            return {
                note: notes[notes.indexOf(noteWithAlteration.note) + 1],
                alteration: 'flat',
                octave: noteWithAlteration.note == 'B' ? noteWithAlteration.octave + 1 : noteWithAlteration.octave
            };
        }
        if (noteWithAlteration.alteration == 'flat') {
            const notes = 'AGFEDCBA';
            return {
                note: notes[notes.indexOf(noteWithAlteration.note) + 1],
                alteration: 'sharp',
                octave: noteWithAlteration.note == 'C' ? noteWithAlteration.octave - 1 : noteWithAlteration.octave
            };
        }
        return noteWithAlteration;
    }

    /**
     * Verifie si une duree correspond a une note pointee.
     * @param {number} duration - Duree de la note
     * @returns {boolean} true si pointee (0.375, 0.75, 1.5, 3, 6)
     * @private
     */
    isDotted(duration) {
        return [0.375, 0.75, 1.5, 3, 6].indexOf(duration) >= 0;
    }
}
