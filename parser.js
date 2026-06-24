/**
 * Parser - Analyse la notation textuelle et genere des structures de donnees.
 * Format attendu :
 * - Ligne 1 : Titre
 * - Ligne 2 : Tempo (nombre)
 * - Ligne 3 : Chiffrage (ex: 4/4)
 * - Ligne 4 : Clef (sol ou fa) et alterations a la clef
 * - Lignes suivantes : Notes et silences
 */
class Parser {
    /**
     * Initialise le parser avec les mappings de notes francais -> anglo-saxon.
     */
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
	this.reverseNoteMapping = {
             'C':'Do',
             'D':'Re',
             'E':'Mi',
             'F':'Fa',
             'G':'Sol',
             'A':'La',
             'B':'Si'
        };
    }

    /**
     * Parse le texte complet d'une partition et retourne un objet structure.
     * @param {string} text - Texte brut de la partition (lignes separees par \n)
     * @returns {{title: string, tempo: number, timeSignature: {numerator: number, denominator: number}, clef: string, keySignature: Array, notes: Array}} Objet ParseResult
     * @throws {Error} Si le format est invalide (moins de 5 lignes, tempo/chiffrage invalide, etc.)
     */
    parse(text) {
        const lines = text.split('\n').map(line => line.trim());

        if (lines.length < 5) {
            throw new Error('La partition doit contenir au moins 5 lignes (titre, tempo, chiffrage, clef, notes)');
        }

        const title = lines[0] || 'Sans titre';
        const tempo = this.parseTempo(lines[1]);
        const timeSignature = this.parseTimeSignature(lines[2]);
        const { clef, keySignature } = this.parseClefAndKey(lines[3]);

        const noteLines = lines.slice(4).filter(line => line.length > 0);
        const notes = this.parseNotes(noteLines.join(' '), this.getSignaturesMap(keySignature));

        const scoreData = {
            title,
            tempo,
            timeSignature,
            clef,
            keySignature,
            notes
        };
        console.log(this.toText(scoreData)); 
        return scoreData;
    }

    toText(scoreData) {
        var result = "";
        // Ajout du titre
        result += scoreData.title + "\n";

        // Ajout du tempo
        result += scoreData.tempo + "\n";
		
		// Ajout du chiffrage
		result += scoreData.timeSignature.numerator + "/" + scoreData.timeSignature.denominator +"\n"
		
		// Ajout de la clef
		result += scoreData.clef + "\n";
		
		// Ajout de l'armure
		result += scoreData.keySignature + "\n";
		
		// Ajout des notes
		for (const note of scoreData.notes){
                    const methodName = note.type + "ToText";
                    if (typeof this[methodName] !== 'function') {
                        throw new Error('Unknown note type: ' + note.type);
                    }
                    result += this[methodName](note) + " ";
                }
        return result;
    }

    restToText(rest) {
        var result = "S";
        if (rest.duration !== 1) {
            result += rest.duration;
        }
        return result;
    }

    chordToText(chord) {
        var result = "";
        for (const note of chord.notes) {
            result += this.noteToText({
                note: note.note,
                alteration: note.alteration,
                octave: note.octave,
                duration: 1
            }).replace(/\d+\.?\d*$/, '');
        }
        if (chord.duration !== 1) {
            result += chord.duration;
        }
        return result;
    }

    noteToText(note) {
        var result = "";
        // La note
        const noteName = this.reverseNoteMapping[note.note];
        if (!noteName) {
            throw new Error('Unknown note: ' + note.note);
        }
        result += noteName;

        // L'altération
        switch(note.alteration) {
            case 'flat' : result += 'b'; break;
            case 'sharp': result += '#'; break;
            case 'natural': result += '*'; break;
        }

        // L'octave
        if (note.octave < 0) {
            result += '-'.repeat(-note.octave);
        } else if (note.octave >0) {
            result += '+'.repeat(note.octave);
        }

        // La durée
        if(note.duration != 1) {
            result += note.duration;
        }

        return result;
    }

    /**
     * Transpose une partition entiere d'un nombre de demi-tons.
     * @param {Object} scoreData - Objet ParseResult (resultat de parse())
     * @param {number} numberOfHalfTones - Nombre de demi-tons (positif = vers l'aigu, negatif = vers le grave)
     * @returns {Object} Nouvelle partition transposee (meme structure que ParseResult)
     */
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

    /**
     * Parse la ligne de tempo et valide la valeur.
     * @param {string} tempoStr - Ligne de tempo (ex: "120")
     * @returns {number} Tempo en BPM
     * @throws {Error} Si le tempo n'est pas un nombre entre 20 et 300
     */
    parseTempo(tempoStr) {
        const tempo = parseInt(tempoStr);
        if (isNaN(tempo) || tempo < 20 || tempo > 300) {
            throw new Error(`Tempo invalide: "${tempoStr}". Le tempo doit être un nombre entre 20 et 300.`);
        }
        return tempo;
    }

    /**
     * Parse le chiffrage de mesure.
     * @param {string} timeStr - Chiffrage (ex: "4/4", "3/4", "6/8")
     * @returns {{numerator: number, denominator: number}} Numerateur et denominateur
     * @throws {Error} Si le format n'est pas "n/n"
     */
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

    /**
     * Parse la clef et les alterations a la clef.
     * @param {string} clefStr - Ligne clef (ex: "sol", "fa", "sol Do# Mib")
     * @returns {{clef: string, keySignature: Array<{note: string, alteration: string}>}} Clef et armure
     * @throws {Error} Si la clef n'est pas "sol" ou "fa", ou si une alteration est mal formee
     */
    parseClefAndKey(clefStr) {
        const parts = clefStr.split(/[,\s]+/).map(p => p.trim()).filter(p => p.length > 0);

        const clef = parts[0].toLowerCase();

        if (clef !== 'sol' && clef !== 'fa') {
            throw new Error(`Clef invalide: "${clef}". Clefs acceptées: "sol" ou "fa".`);
        }

        const keySignature = parts.slice(1).map(alt => this.parseAlteration(alt));

        return { clef, keySignature };
    }

    /**
     * Parse une alteration a la clef (ex: "Do#", "Mib", "Fa*").
     * @param {string} altStr - Alteration (ex: "Do#")
     * @returns {{note: string, alteration: string}} Note (anglo-saxonne) et alteration ('sharp', 'flat', 'natural')
     * @throws {Error} Si le format est invalide
     */
    parseAlteration(altStr) {
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

    /**
     * Parse une ligne de notes et silences.
     * @param {string} notesStr - Ligne de notes (ex: "Do Re Mi Fa Sol")
     * @param {Array} signatures - Map des alterations de l'armure (ex: signatures['C'] = 'sharp')
     * @returns {Array<{type: string}>} Tableau de notes/accords/silences
     */
    parseNotes(notesStr, signatures) {
        const tokens = notesStr.split(/\s+/);
        const notes = [];

        for (const token of tokens) {
            if (token.length === 0) continue;

            if (/^s[\d.]*$/i.test(token)) {
                notes.push(this.parseRest(token));
            } else {
                notes.push(this.parseNoteOrChord(token, signatures));
            }
        }

        return notes;
    }

    /**
     * Parse une note ou un accord (ex: "Do2", "DoMiSol4", "Fa#0.5").
     * @param {string} noteStr - Token de note/accord
     * @param {Array} signatures - Map des alterations de l'armure
     * @returns {{type: 'note'|'chord'}} Note simple ou accord
     * @throws {Error} Si le token est invalide ou la duree n'est pas un nombre
     */
    parseNoteOrChord(noteStr, signatures) {
        const notePattern = /(do|ré|re|mi|fa|sol|la|si)(#|b|\*)?(--|-|\+|\+\+)?/gi;
        const matches = [...noteStr.matchAll(notePattern)];

        if (matches.length === 0) {
            throw new Error(`Token invalide: "${noteStr}"`);
        }

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

    /**
     * Parse un silence (ex: "S", "S2", "S0.5").
     * @param {string} restStr - Token de silence
     * @returns {{type: 'rest', duration: number}} Objet silence
     */
    parseRest(restStr) {
        const durationMatch = restStr.match(/^s([\d.]+)?$/i);
        const duration = durationMatch && durationMatch[1] ? parseFloat(durationMatch[1]) : 1;

        return {
            type: 'rest',
            duration: duration
        };
    }

    /**
     * Parse le modificateur d'octave (ex: "--", "-", "", "+", "++").
     * @param {string} octaveStr - Symbole d'octave
     * @returns {number} Decalage d'octave (-2, -1, 0, 1, 2)
     */
    parseOctave(octaveStr) {
        if (octaveStr === '--') return -2;
        if (octaveStr === '-') return -1;
        if (octaveStr === '+') return 1;
        if (octaveStr === '++') return 2;
        return 0;
    }

    /**
     * Convertit l'armure en map pour acces rapide (note -> alteration).
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
     * Transpose un tableau de notes.
     * @param {Array} notes - Tableau de notes/accords/silences
     * @param {Array} signatures - Map des alterations de l'armure
     * @param {number} numberOfHalfTones - Nombre de demi-tons
     * @returns {Array} Tableau transpose
     * @private
     */
    transposeNotes(notes, signatures, numberOfHalfTones) {
        return notes.map(note => this.transposeNote(note, signatures, numberOfHalfTones));
    }

    /**
     * Transpose une note individuelle (ou recursivement un accord).
     * Gere les passages d'octave automatiquement.
     * @param {Object} note - Note a transposer
     * @param {Array} signatures - Map des alterations de l'armure
     * @param {number} numberOfHalfTones - Nombre de demi-tons
     * @returns {Object} Note transposee
     * @private
     */
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

        const noteToTone = {
            'C': 0,
            'D': 2,
            'E': 4,
            'F': 5,
            'G': 7,
            'A': 9,
            'B': 11
        };
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
}
