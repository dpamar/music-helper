/**
 * PARSER.JS
 *
 * Ce fichier parse la notation textuelle saisie par l'utilisateur
 * et la transforme en structures de données exploitables.
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
        // Notes valides en notation française
        this.validNotes = ['do', 'ré', 're', 'mi', 'fa', 'sol', 'la', 'si'];

        // Mapping vers notation anglo-saxonne (pour faciliter le rendu)
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

    /**
     * Parse le texte complet de la partition
     * @param {string} text - Texte brut saisi par l'utilisateur
     * @returns {object} - Objet contenant toutes les données parsées
     */
    parse(text) {
        // Sépare le texte en lignes
        const lines = text.split('\n').map(line => line.trim());

        // Vérifie qu'on a au moins 5 lignes (4 méta + 1 ligne de notes minimum)
        if (lines.length < 5) {
            throw new Error('La partition doit contenir au moins 5 lignes (titre, tempo, chiffrage, clef, notes)');
        }

        // Parse les métadonnées
        const title = lines[0] || 'Sans titre';
        const tempo = this.parseTempo(lines[1]);
        const timeSignature = this.parseTimeSignature(lines[2]);
        const { clef, keySignature } = this.parseClefAndKey(lines[3]);

        // Parse les notes (toutes les lignes après la ligne 4)
        const noteLines = lines.slice(4).filter(line => line.length > 0);
        const notes = this.parseNotes(noteLines.join(' '));

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
     * Parse le tempo (ligne 2)
     * @param {string} tempoStr - Chaîne de caractères du tempo
     * @returns {number} - Tempo en BPM
     */
    parseTempo(tempoStr) {
        const tempo = parseInt(tempoStr);
        if (isNaN(tempo) || tempo < 20 || tempo > 300) {
            throw new Error(`Tempo invalide: "${tempoStr}". Le tempo doit être un nombre entre 20 et 300.`);
        }
        return tempo;
    }

    /**
     * Parse le chiffrage (ligne 3)
     * @param {string} timeStr - Chiffrage (ex: "4/4")
     * @returns {object} - {numerator, denominator}
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
     * Parse la clef et les altérations à la clef (ligne 4)
     * @param {string} clefStr - Clef et altérations (ex: "sol, Fa#, Do#" ou "sol Fa# Do#")
     * @returns {object} - {clef, keySignature}
     */
    parseClefAndKey(clefStr) {
        // Accepte à la fois les virgules ET les espaces comme séparateurs
        // On split d'abord par virgule, puis chaque partie par espace
        const parts = clefStr.split(/[,\s]+/).map(p => p.trim()).filter(p => p.length > 0);

        const clef = parts[0].toLowerCase();

        if (clef !== 'sol' && clef !== 'fa') {
            throw new Error(`Clef invalide: "${clef}". Clefs acceptées: "sol" ou "fa".`);
        }

        // Parse les altérations à la clef (si présentes)
        const keySignature = parts.slice(1).map(alt => this.parseAlteration(alt));

        return { clef, keySignature };
    }

    /**
     * Parse une altération (ex: "Fa#" ou "Sib")
     * @param {string} altStr - Altération
     * @returns {object} - {note, alteration}
     */
    parseAlteration(altStr) {
        // Match note exacte + altération (# ou b ou *)
        // Important : lister explicitement les noms de notes pour que "b" ne soit pas inclus dans le nom
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
     * Parse les notes et silences
     * @param {string} notesStr - Chaîne contenant toutes les notes
     * @returns {array} - Tableau d'objets représentant les notes/accords/silences
     */
    parseNotes(notesStr) {
        const tokens = notesStr.split(/\s+/);
        const notes = [];

        for (const token of tokens) {
            if (token.length === 0) continue;

            // Vérifie si c'est un silence (S seul ou S suivi de nombre, pas "sol" !)
            // On teste avec une regex stricte : S suivi optionnellement de chiffres/point
            if (/^s[\d.]*$/i.test(token)) {
                notes.push(this.parseRest(token));
            } else {
                // C'est une note ou un accord
                notes.push(this.parseNoteOrChord(token));
            }
        }

        return notes;
    }

    /**
     * Parse un silence (ex: "S", "S2", "S0.5")
     * @param {string} restStr - Chaîne représentant le silence
     * @returns {object} - Objet silence
     */
    parseRest(restStr) {
        // Extrait la durée après le S
        const durationMatch = restStr.match(/^s([\d.]+)?$/i);
        const duration = durationMatch && durationMatch[1] ? parseFloat(durationMatch[1]) : 1;

        return {
            type: 'rest',
            duration: duration
        };
    }

    /**
     * Parse une note ou un accord (ex: "Do", "Mi2", "Fa#", "DoMiSol1.5")
     * @param {string} noteStr - Chaîne représentant la note ou l'accord
     * @returns {object} - Objet note ou accord
     */
    parseNoteOrChord(noteStr) {
        // Détecte si c'est un accord (plusieurs notes collées)
        // On cherche plusieurs noms de notes consécutifs
        const notePattern = /(do|ré|re|mi|fa|sol|la|si)(#|b|\*)?(--|-|\+|\+\+)?/gi;
        const matches = [...noteStr.matchAll(notePattern)];

        if (matches.length === 0) {
            throw new Error(`Token invalide: "${noteStr}"`);
        }

        // Extrait la durée (à la fin du token)
        // La durée est partagée par toutes les notes de l'accord
        const remainingStr = noteStr.substring(matches[matches.length - 1].index + matches[matches.length - 1][0].length);
        const duration = remainingStr ? parseFloat(remainingStr) : 1;

        if (isNaN(duration)) {
            throw new Error(`Durée invalide dans "${noteStr}"`);
        }

        // Parse chaque note de l'accord
        const notesInChord = matches.map(match => {
            const noteName = match[1].toLowerCase();
            const alteration = match[2] || '';
            const octave = match[3] || '';

            return {
                note: this.noteMapping[noteName],
                alteration: alteration === '#' ? 'sharp' : alteration === 'b' ? 'flat' : alteration === '*' ? 'natural' : '',
                octave: this.parseOctave(octave)
            };
        });

        // Si une seule note, c'est une note simple
        if (notesInChord.length === 1) {
            return {
                type: 'note',
                ...notesInChord[0],
                duration: duration
            };
        } else {
            // Sinon c'est un accord
            return {
                type: 'chord',
                notes: notesInChord,
                duration: duration
            };
        }
    }

    /**
     * Parse l'octave (ex: "--", "-", "", "+", "++")
     * @param {string} octaveStr - Indicateur d'octave
     * @returns {number} - Décalage d'octave (-2, -1, 0, 1, 2)
     */
    parseOctave(octaveStr) {
        if (octaveStr === '--') return -2;
        if (octaveStr === '-') return -1;
        if (octaveStr === '+') return 1;
        if (octaveStr === '++') return 2;
        return 0; // Octave par défaut
    }
}
