/**
 * RENDERER.JS
 *
 * Draws the musical score on an HTML5 canvas.
 */

class Renderer {
    constructor() {
        this.config = {
            staffLineSpacing: 12,
            noteWidth: 40,
            marginLeft: 50,
            marginTop: 100,
            staffStartX: 80,
            clefWidth: 60
        };

        // Staff position mapping for each note name per clef.
        //
        // TREBLE CLEF (sol): line 1 = E (position 0)
        // Position:  -2   -1    0    1    2    3    4    5    6    7    8    9
        // Note:      Do   Ré   Mi   Fa  Sol   La   Si   Do+  Ré+  Mi+  Fa+  Sol+
        //            LS   IL   L1   IL   L2   IL   L3   IL   L4   IL   L5   ...
        //
        // LS = ledger line, IL = interline, L1-L5 = staff lines
        // Each octave shifts by 7 positions.
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
            alterationCount: 0
        };
    }

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

    setOptimizationMode(optimizationMode) {
        this.drawingInfo.optimizationMode = optimizationMode;
    }

    render(scoreData, container) {
        const width = 1000;
        const height = 480;

        var ctx = null;
        if (!this.drawingInfo.fakeMode) {
            while (container.firstChild) {
                container.removeChild(container.firstChild);
            }

            const canvas = document.createElement('canvas');
            canvas.id = 'score-canvas';
            canvas.width = width;
            canvas.height = height;

            container.appendChild(canvas);
            ctx = canvas.getContext('2d');
        }

        this.drawingInfo.alterationCount = 0;

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

    getSignaturesMap(keySignature) {
        const signaturesMap = [];
        keySignature.map(x => signaturesMap[x.note] = x.alteration);
        return signaturesMap;
    }

    drawTitle(ctx, title, canvasWidth) {
        if (this.drawingInfo.fakeMode || !title || title.trim() === '') {
            return;
        }

        ctx.font = 'bold 28px serif';
        ctx.fillStyle = '#000';
        ctx.textAlign = 'center';
        ctx.fillText(title, canvasWidth / 2, 40);
        ctx.textAlign = 'left';
    }

    drawMetadata(ctx, scoreData, canvasWidth) {
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

    drawClef(ctx, clef) {
        if (this.drawingInfo.fakeMode) {
            return;
        }
        const x = this.config.staffStartX + 10;

        ctx.font = 'bold 60px serif';
        ctx.fillStyle = '#000';

        if (clef === 'sol') {
            // Treble clef wraps around G line (2nd line)
            const y = this.config.marginTop + (3 * this.config.staffLineSpacing);
            ctx.fillText('𝄞', x, y + 5);
        } else {
            // Bass clef dots straddle the F line (4th line)
            const y = this.config.marginTop + (3 * this.config.staffLineSpacing);
            ctx.fillText('𝄢', x, y + 2);
        }
    }

    drawKeySignature(ctx, keySignature, startX, clef) {
        if (this.drawingInfo.fakeMode) {
            return;
        }
        let x = startX;

        for (const alt of keySignature) {
            // For notes below the staff in treble clef, display one octave up for visibility
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

    drawTimeSignature(ctx, timeSignature, startX) {
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

    // Converts time signature denominator to beat value: {1:4, 2:2, 4:1, 8:0.5, 16:0.25}
    beatsPerMesure(timeSignature) {
        const unit = { 1: 4, 2: 2, 4: 1, 8: 0.5, 16: 0.25 };
        var result = timeSignature.numerator * unit[timeSignature.denominator];
        return result;
    }

    drawNotes(ctx, notes, timeSignature, startX, clef, signatures) {
        let x = startX;
        let currentStaffY = this.config.marginTop;
        let staffCount = 0;
        let beatsPerMesure = this.beatsPerMesure(timeSignature);

        let remainingUntilMeasureBar = beatsPerMesure;

        for (const item of notes) {
            // Line break when exceeding staff width
            if (x > 850) {
                staffCount++;
                x = this.config.staffStartX + this.config.clefWidth + 60;
                currentStaffY = this.config.marginTop + (staffCount * 150);

                this.drawStaff(ctx, clef, currentStaffY);
            }

            if (item.type === 'rest') {
                x = this.drawRest(ctx, item, x, currentStaffY);
                remainingUntilMeasureBar -= item.duration;
            } else {
                let firstNoteX = null, lastNoteX = null;
                let noteY = null;

                let drawer = item.type === 'note' ? "drawNote" : "drawChord";

                let remainingItemDuration = item.duration;
                while (remainingItemDuration >= remainingUntilMeasureBar) {
                    firstNoteX = firstNoteX || x;
                    lastNoteX = x;
                    let notePosition = this[drawer](ctx, item, x, clef, signatures, currentStaffY, remainingUntilMeasureBar);
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
                    let notePosition = this[drawer](ctx, item, x, clef, signatures, currentStaffY, remainingItemDuration);
                    x = notePosition.x;
                    noteY = notePosition.y;
                    remainingUntilMeasureBar -= remainingItemDuration;
                }
                // Tie arc between split notes
                if (firstNoteX != lastNoteX) {
                    this.drawLink(ctx, firstNoteX + this.config.noteWidth / 2, lastNoteX, noteY - 40);
                }
            }
        }

        this.drawBarline(ctx, x, currentStaffY, true);
    }

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

    drawNote(ctx, note, x, clef, signatures, staffY = null, durationModification = null) {
        var effectiveNote = { note: note.note, alteration: note.alteration, octave: note.octave };
        effectiveNote = this.getBestRepresentation(effectiveNote, signatures);

        // position = base + octave * 7 (7 notes per octave on the staff)
        const basePosition = this.notePositions[effectiveNote.note][clef];
        const position = basePosition + (effectiveNote.octave * 7);
        const y = this.getYPosition(position, staffY);
        const duration = durationModification || note.duration;

        this.drawLedgerLines(ctx, x, position, staffY);
        this.drawNoteHead(ctx, x, y, duration);
        this.handleAlteration(ctx, x, y, effectiveNote, signatures);
        this.handleDot(ctx, x, y, duration);

        if (duration < 4) {
            this.drawNoteStem(ctx, x, y, duration);
        }

        return { 'x': x + this.config.noteWidth, 'y': y };
    }

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

    handleAlteration(ctx, x, y, note, defaultAlterations) {
        var alterationToDraw = this.computeAlteration(note.note, note.alteration, defaultAlterations[note.note]);
        if (alterationToDraw) {
            this.drawAccidental(ctx, alterationToDraw, x - 15, y);
        }
    }

    drawChord(ctx, chord, x, clef, signatures, staffY = null, durationModification = null) {
        const duration = durationModification || chord.duration;

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

            this.handleAlteration(ctx, x, y, effectiveNote.alteration, signatures[effectiveNote.note]);
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

    drawRest(ctx, rest, x, staffY = null) {
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
            // Quarter rest: zigzag with curved tail
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
            // Eighth rest
            ctx.beginPath();
            ctx.arc(x + 5, y + 3, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.moveTo(x + 8, y + 3);
            ctx.lineTo(x + 10, y);
            ctx.lineTo(x + 5, y + 15);
            ctx.stroke();
        } else {
            // Sixteenth rest
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

    drawNoteHead(ctx, x, y, duration) {
        if (this.drawingInfo.fakeMode) {
            return;
        }

        ctx.fillStyle = '#000';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;

        if (duration >= 2) {
            // Half/whole note: hollow oval
            ctx.beginPath();
            ctx.ellipse(x + 5, y, 6, 5, -0.3, 0, Math.PI * 2);
            ctx.stroke();
        } else {
            // Quarter/eighth/sixteenth: filled oval
            ctx.beginPath();
            ctx.ellipse(x + 5, y, 6, 5, -0.3, 0, Math.PI * 2);
            ctx.fill();
        }
    }

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

        // Flag(s) for eighth and sixteenth notes
        if (duration <= 0.5) {
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

    // Y = staffFirstLine + 4*spacing - position * halfSpacing
    // Position 0 = bottom line, increases upward; each position = half a staff spacing
    getYPosition(position, staffY = null) {
        const staffFirstLine = (staffY || this.config.marginTop);
        const spacing = this.config.staffLineSpacing / 2;
        return staffFirstLine + (4 * this.config.staffLineSpacing) - (position * spacing);
    }

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

    isDotted(duration) {
        return [0.375, 0.75, 1.5, 3, 6].indexOf(duration) >= 0;
    }
}
