/**
 * PARSER.JS
 *
 * Format attendu :
 * - Ligne 1 : Titre
 * - Ligne 2 : Tempo (nombre)
 * - Ligne 3 : Chiffrage (ex: 4/4)
 * - Ligne 4 : Clef (sol ou fa) et altérations à la clef
 * - Lignes suivantes : Notes et silences
 */

class Parser {
    constructor() {
        this.validNotes = ['do', 'ré', 're', 'mi', 'fa', 'sol', 'la', 'si'];

        this.noteMapping = {
            'do': 'C',
            'ré': 'D',
            're': 'D',
            'mi': 'E',
            'fa': 'F',
            'sol': 'G',
            'la': 'A',
            'si': 'B'
        };
    }

    parse(text) {
        const lines = text.split('\n').map(line => line.trim());

        // 5 lines minimum: title, tempo, time signature, clef, notes
        if (lines.length < 5) {
            throw new Error('La partition doit contenir au moins 5 lignes (titre, tempo, chiffrage, clef, notes)');
        }

        const title = lines[0] || 'Sans titre';
        const tempo = this.parseTempo(lines[1]);
        const timeSignature = this.parseTimeSignature(lines[2]);
        const { clef, keySignature } = this.parseClefAndKey(lines[3]);

        const noteLines = lines.slice(4).filter(line => line.length > 0);
        const notes = this.parseNotes(noteLines.join(' '), this.getSignaturesMap(keySignature));

        return {
            title,
            tempo,
            timeSignature,
            clef,
            keySignature,
            notes
        };
    }

    getSignaturesMap(keySignature) {
        const signaturesMap = [];
        keySignature.map(x => signaturesMap[x.note] = x.alteration);
        return signaturesMap;
    }

    transposeScore(scoreData, numberOfHalfTones) {
        const title = scoreData.title;
        const tempo = scoreData.tempo;
        const timeSignature = scoreData.timeSignature;
        const clef = scoreData.clef;
        const keySignature = scoreData.keySignature;

        const notes = this.transposeNotes(scoreData.notes, this.getSignaturesMap(keySignature), numberOfHalfTones);

        return {
            title,
            tempo,
            timeSignature,
            clef,
            keySignature,
            notes
        };
    }

    transposeNotes(notes, signatures, numberOfHalfTones) {
        return notes.map(note => this.transposeNote(note, signatures, numberOfHalfTones));
    }

    transposeNote(note, signatures, numberOfHalfTones) {
        if (note.type === "rest") {
            return note;
        }

        if (note.type === 'chord') {
            const newNotes = note.notes.map(note => this.transposeNote(note, signatures, numberOfHalfTones));
            return {
                type: note.type,
                notes: newNotes,
                duration: note.duration
            };
        }

        // Chromatic scale: maps note name to semitone offset within an octave
        const noteToTone = {
            'C': 0,
            'D': 2,
            'E': 4,
            'F': 5,
            'G': 7,
            'A': 9,
            'B': 11
        };
        // Reverse mapping: semitone offset -> [noteName, alteration]
        const toneToNote = [
            ['C', ''],
            ['C', 'sharp'],
            ['D', ''],
            ['D', 'sharp'],
            ['E', ''],
            ['F', ''],
            ['F', 'sharp'],
            ['G', ''],
            ['G', 'sharp'],
            ['A', ''],
            ['A', 'sharp'],
            ['B', '']
        ];

        var tone = noteToTone[note.note] + numberOfHalfTones;
        var alteration = note.alteration || signatures[note.note] || '';
        if (alteration === 'sharp') {
            tone++;
        } else if (alteration === 'flat') {
            tone--;
        }

        // Wrap around octave boundaries: 12 semitones = 1 octave
        var octave = note.octave;
        octave += ~~(tone / 12);
        tone %= 12;
        if (tone < 0) {
            tone += 12;
            octave--;
        }

        var newNote = toneToNote[tone];

        return {
            alteration: newNote[1],
            type: note.type,
            duration: note.duration,
            octave: octave,
            note: newNote[0]
        };
    }

    parseTempo(tempoStr) {
        const tempo = parseInt(tempoStr);
        if (isNaN(tempo) || tempo < 20 || tempo > 300) {
            throw new Error(`Tempo invalide: "${tempoStr}". Le tempo doit être un nombre entre 20 et 300.`);
        }
        return tempo;
    }

    parseTimeSignature(timeStr) {
        const match = timeStr.match(/^(\d+)\/(\d+)$/);
        if (!match) {
            throw new Error(`Chiffrage invalide: "${timeStr}". Format attendu: "4/4", "3/4", etc.`);
        }
        return {
            numerator: parseInt(match[1]),
            denominator: parseInt(match[2])
        };
    }

    parseClefAndKey(clefStr) {
        // Accepts both commas and spaces as separators
        const parts = clefStr.split(/[,\s]+/).map(p => p.trim()).filter(p => p.length > 0);

        const clef = parts[0].toLowerCase();

        if (clef !== 'sol' && clef !== 'fa') {
            throw new Error(`Clef invalide: "${clef}". Clefs acceptées: "sol" ou "fa".`);
        }

        const keySignature = parts.slice(1).map(alt => this.parseAlteration(alt));

        return { clef, keySignature };
    }

    parseAlteration(altStr) {
        // Explicit note names prevent "b" in "Sib" from being parsed as part of the note name
        const noteMatch = altStr.match(/^(do|ré|re|mi|fa|sol|la|si)(#|b|\*)?$/i);
        if (!noteMatch) {
            throw new Error(`Altération invalide: "${altStr}". Format attendu: "Do#", "Mib", "Fa*"`);
        }

        const noteName = noteMatch[1].toLowerCase();
        const alteration = noteMatch[2] || '';

        return {
            note: this.noteMapping[noteName],
            alteration: alteration === '#' ? 'sharp' : alteration === 'b' ? 'flat' : 'natural'
        };
    }

    parseNotes(notesStr, signatures) {
        const tokens = notesStr.split(/\s+/);
        const notes = [];

        for (const token of tokens) {
            if (token.length === 0) continue;

            // Strict regex: "S" optionally followed by digits/dot — avoids matching "Sol" as a rest
            if (/^s[\d.]*$/i.test(token)) {
                notes.push(this.parseRest(token));
            } else {
                notes.push(this.parseNoteOrChord(token, signatures));
            }
        }

        return notes;
    }

    parseRest(restStr) {
        const durationMatch = restStr.match(/^s([\d.]+)?$/i);
        const duration = durationMatch && durationMatch[1] ? parseFloat(durationMatch[1]) : 1;

        return {
            type: 'rest',
            duration: duration
        };
    }

    parseNoteOrChord(noteStr, signatures) {
        const notePattern = /(do|ré|re|mi|fa|sol|la|si)(#|b|\*)?(--|-|\+|\+\+)?/gi;
        const matches = [...noteStr.matchAll(notePattern)];

        if (matches.length === 0) {
            throw new Error(`Token invalide: "${noteStr}"`);
        }

        // Duration is shared across all notes in a chord, appears at the end of the token
        const remainingStr = noteStr.substring(matches[matches.length - 1].index + matches[matches.length - 1][0].length);
        const duration = remainingStr ? parseFloat(remainingStr) : 1;

        if (isNaN(duration)) {
            throw new Error(`Durée invalide dans "${noteStr}"`);
        }

        const notesInChord = matches.map(match => {
            const noteName = this.noteMapping[match[1].toLowerCase()];
            const alteration = match[2] || signatures[noteName] || '';
            const octave = match[3] || '';

            return {
                note: noteName,
                alteration: alteration === '#' ? 'sharp' : alteration === 'b' ? 'flat' : alteration === '*' ? 'natural' : alteration,
                octave: this.parseOctave(octave)
            };
        });

        if (notesInChord.length === 1) {
            return {
                type: 'note',
                ...notesInChord[0],
                duration: duration
            };
        } else {
            return {
                type: 'chord',
                notes: notesInChord,
                duration: duration
            };
        }
    }

    parseOctave(octaveStr) {
        if (octaveStr === '--') return -2;
        if (octaveStr === '-') return -1;
        if (octaveStr === '+') return 1;
        if (octaveStr === '++') return 2;
        return 0;
    }
}
