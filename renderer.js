/**
 * RENDERER.JS
 *
 * Ce fichier dessine la partition sur un canvas HTML5
 * Il prend les données parsées et crée un rendu graphique
 * de la portée musicale avec les notes.
 */

class Renderer {
    constructor() {
        // Configuration du rendu
        this.config = {
            staffLineSpacing: 12,      // Espacement entre les lignes de la portée
            noteWidth: 40,             // Largeur d'une note
            marginLeft: 50,            // Marge gauche
            marginTop: 100,            // Marge haute (pour le titre)
            staffStartX: 80,           // Début de la portée
            clefWidth: 60              // Largeur de la clef
        };

        // Positions des notes sur la portée
        // Réinterprétons : position 0 = interligne SOUS la ligne 1 (là où est le Ré)
        // Chaque position = un demi-espace (ligne ou interligne)
        //
        // CLEF DE SOL : première ligne (position 0) = MI
        // Position:  -1    0    1    2    3    4    5    6    7    8    9
        // Note:      Do   Ré   Mi   Fa  Sol   La   Si   Do+  Ré+  Mi+  Fa+
        //            LS   IL   L1   IL   L2   IL   L3   IL   L4   IL   L5
        //
        // LS = Ligne Supplémentaire (sous la portée)
        // IL = Interligne
        // L1 à L5 = Lignes de la portée (L1 = bas, L5 = haut)
        //
        // Do médium = position -1 (ligne supplémentaire sous la portée)
        // Ré médium = position 0 (interligne sous la portée... NON! Ré est sur l'interligne juste sous ligne 1)
        //
        // Attendez, si Mi est sur ligne 1 (position 0), alors entre Do et Mi il y a 2 demi-tons
        // Donc : Do, Ré, Mi
        // Si Mi = ligne 1, Ré = interligne sous, Do = ligne supplémentaire
        // Mais en positions : Mi=0, alors Ré doit être à l'interligne JUSTE SOUS la ligne 1
        //
        // AH! Je crois que le problème est que position 0 n'est PAS la ligne 1 !
        // Réinterprétons : position 0 = interligne SOUS la ligne 1 (là où est le Ré)
        //
        // Nouvelle interprétation :
        // Position 0 = interligne sous ligne 1 = RÉ médium
        // Position 1 = ligne 1 = MI
        // Position -1 = ligne supplémentaire = DO médium
        this.notePositions = {
            'C': { 'sol': -2, 'fa': 3 },  // Do : ligne supplémentaire sous la portée
            'D': { 'sol': -1, 'fa': 4 },   // Ré : interligne juste sous ligne 1
            'E': { 'sol': 0, 'fa': 5 },   // Mi : ligne 1 (sol)
            'F': { 'sol': 1, 'fa': 6 },   // Fa : interligne
            'G': { 'sol': 2, 'fa': 7 },   // Sol : ligne 2 (sol) / ligne 1 (fa) 
            'A': { 'sol': 3, 'fa': 8 },   // La : interligne
            'B': { 'sol': 4, 'fa': 9 }    // Si : ligne 3 (sol)
        };
    }

    /**
     * Rend la partition complète
     * @param {object} scoreData - Données parsées de la partition
     * @param {HTMLElement} container - Élément DOM où insérer le canvas
     */
    render(scoreData, container) {
        // Nettoie le container de manière sécurisée (pas d'innerHTML)
        while (container.firstChild) {
            container.removeChild(container.firstChild);
        }

        // Crée le canvas
        const canvas = document.createElement('canvas');
        canvas.id = 'score-canvas';

        // Calcule les dimensions nécessaires
        const width = 1000;
        const height = 480;
        canvas.width = width;
        canvas.height = height;

        container.appendChild(canvas);

        const ctx = canvas.getContext('2d');

        // Dessine le titre et les métadonnées sur le canvas
        this.drawTitle(ctx, scoreData.title, width);
        this.drawMetadata(ctx, scoreData, width);

        // Dessine la portée
        this.drawStaff(ctx, scoreData.clef);

        // Dessine la clef
        this.drawClef(ctx, scoreData.clef);

        // Dessine l'armure (altérations à la clef)
        let currentX = this.config.staffStartX + this.config.clefWidth;
        currentX = this.drawKeySignature(ctx, scoreData.keySignature, currentX, scoreData.clef);

        // Dessine le chiffrage
        currentX = this.drawTimeSignature(ctx, scoreData.timeSignature, currentX);

        // Dessine les notes
        currentX += 20; // Petit espace après le chiffrage
        this.drawNotes(ctx, scoreData.notes, scoreData.timeSignature, currentX, scoreData.clef);
    }

    /**
     * Dessine le titre de la partition sur le canvas
     * @param {CanvasRenderingContext2D} ctx - Contexte du canvas
     * @param {string} title - Titre de la partition
     * @param {number} canvasWidth - Largeur du canvas
     */
    drawTitle(ctx, title, canvasWidth) {
        if (!title || title.trim() === '') {
            return;
        }

        ctx.font = 'bold 28px serif';
        ctx.fillStyle = '#000';
        ctx.textAlign = 'center';
        ctx.fillText(title, canvasWidth / 2, 40);
        ctx.textAlign = 'left';
    }

    /**
     * Dessine les métadonnées (tempo, chiffrage, clef) sur le canvas
     * @param {CanvasRenderingContext2D} ctx - Contexte du canvas
     * @param {object} scoreData - Données de la partition
     * @param {number} canvasWidth - Largeur du canvas
     */
    drawMetadata(ctx, scoreData, canvasWidth) {
        const metaText = `♩ = ${scoreData.tempo} | ${scoreData.timeSignature.numerator}/${scoreData.timeSignature.denominator} | Clef de ${scoreData.clef}`;

        ctx.font = '16px sans-serif';
        ctx.fillStyle = '#555';
        ctx.textAlign = 'center';
        ctx.fillText(metaText, canvasWidth / 2, 65);
        ctx.textAlign = 'left';
    }


    /**
     * Dessine la portée (5 lignes)
     * @param {CanvasRenderingContext2D} ctx - Contexte du canvas
     * @param {string} clef - Clef (sol ou fa)
     * @param {number} yOffset - Décalage Y (pour portées multiples)
     */
    drawStaff(ctx, clef, yOffset = null) {
        const y = yOffset || this.config.marginTop;
        const spacing = this.config.staffLineSpacing;

        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;

        // Dessine les 5 lignes de la portée
        for (let i = 0; i < 5; i++) {
            const lineY = y + (i * spacing);
            ctx.beginPath();
            ctx.moveTo(this.config.staffStartX, lineY);
            ctx.lineTo(900, lineY); // Longueur de la portée
            ctx.stroke();
        }
    }

    /**
     * Dessine la clef (sol ou fa)
     * @param {CanvasRenderingContext2D} ctx - Contexte du canvas
     * @param {string} clef - Type de clef
     */
    drawClef(ctx, clef) {
        const x = this.config.staffStartX + 10;

        ctx.font = 'bold 60px serif';
        ctx.fillStyle = '#000';

        // Symbole de clef
        if (clef === 'sol') {
            // Clef de sol : enroule autour de la ligne de Sol (2ème ligne, index 1)
            const y = this.config.marginTop + (3 * this.config.staffLineSpacing);
            ctx.fillText('𝄞', x, y + 5);
        } else {
            // Clef de fa : les deux points encadrent la ligne du Fa (4ème ligne, index 3)
            // La ligne AU-DESSUS (ligne 3) doit passer entre les deux points du symbole
            const y = this.config.marginTop + (3 * this.config.staffLineSpacing);
            ctx.fillText('𝄢', x, y + 2); // Remonté pour que ligne 3 passe entre les points
        }
    }

    /**
     * Dessine l'armure (altérations à la clef)
     * @param {CanvasRenderingContext2D} ctx - Contexte
     * @param {array} keySignature - Altérations à la clef
     * @param {number} startX - Position X de départ
     * @param {string} clef - Clef
     * @returns {number} - Nouvelle position X
     */
    drawKeySignature(ctx, keySignature, startX, clef) {
        let x = startX;

        for (const alt of keySignature) {
            // Pour Do et Ré, on affiche l'altération une octave au-dessus
            // pour qu'elle soit visible sur la portée (élégance musicale)
            let position = this.notePositions[alt.note][clef];

            // Si Do ou Ré en clef de sol (positions négatives), monte d'une octave
            if (clef === 'sol' && alt.note !== 'A' && alt.note !== 'B') {
                position += 7; // Monte d'une octave
            }

            const y = this.getYPosition(position)+5;

            ctx.font = 'bold 20px serif';
            ctx.fillStyle = '#000';

            if (alt.alteration === 'sharp') {
                ctx.fillText('♯', x, y);
            } else if (alt.alteration === 'flat') {
                ctx.fillText('♭', x, y);
            }

            x += 15; // Espace entre les altérations
        }

        return x;
    }

    /**
     * Dessine le chiffrage
     * @param {CanvasRenderingContext2D} ctx - Contexte
     * @param {object} timeSignature - Chiffrage
     * @param {number} startX - Position X
     * @returns {number} - Nouvelle position X
     */
    drawTimeSignature(ctx, timeSignature, startX) {
        const y = this.config.marginTop + (2 * this.config.staffLineSpacing);

        ctx.font = 'bold 24px serif';
        ctx.fillStyle = '#000';
        ctx.textAlign = 'center';

        // Numérateur (au-dessus)
        ctx.fillText(timeSignature.numerator.toString(), startX + 15, y - 10);

        // Dénominateur (en-dessous)
        ctx.fillText(timeSignature.denominator.toString(), startX + 15, y + 20);

        ctx.textAlign = 'left'; // Reset l'alignement

        return startX + 40;
    }

    /**calcul automatique du placement des mesures en fonction du chiffrage
	 * Les if sont là pour transformer le dénominateur en sa valeur en temps
	 */
    beatsPerMesure(timeSignature) {
		const unit = {1:4,2:2,4:1,8:0.5,16:0.25}
		var result = timeSignature.numerator*unit[timeSignature.denominator];
		return result;
	}
	
    /**
     * Dessine toutes les notes
     * @param {CanvasRenderingContext2D} ctx - Contexte
     * @param {array} notes - Tableau des notes
     * @param {number} startX - Position X de départ
     * @param {string} clef - Clef
     */
    drawNotes(ctx, notes, timeSignature, startX, clef) {
        let x = startX;
        let beatCount = 0; // Pour compter les temps et dessiner les barres de mesure
        let currentStaffY = this.config.marginTop; // Position Y de la portée actuelle
        let staffCount = 0; // Nombre de portées dessinées
        let beatsPerMesure = this.beatsPerMesure(timeSignature);
		
        for (const item of notes) {
            // Si on dépasse 850px, on passe à la ligne (nouvelle portée)
            if (x > 850) {
                staffCount++;
                x = this.config.staffStartX + this.config.clefWidth + 60;
                currentStaffY = this.config.marginTop + (staffCount * 150); // Nouvelle portée 150px plus bas

                // Dessine la nouvelle portée
                this.drawStaff(ctx, clef, currentStaffY);
                beatCount = 0; // Reset du compteur de mesures
            }

            if (item.type === 'rest') {
                // Dessine un silence
                x = this.drawRest(ctx, item, x, currentStaffY);
                beatCount += item.duration;
            } else {
                // Dessine une note simple ou un accord
                let drawer = item.type === 'note' ? "drawNote" : "drawChord";

                x = this[drawer](ctx, item, x, clef, currentStaffY);
                beatCount += item.duration;
            }

            if (beatCount >= beatsPerMesure) {
                this.drawBarline(ctx, x + this.config.noteWidth - 10, currentStaffY, false);
                beatCount = 0;
                x += 10; // Espace supplémentaire après la barre
            }

            x += this.config.noteWidth; // Espace entre les notes
        }

        // Barre finale
        this.drawBarline(ctx, x, currentStaffY, true);
    }

    /**
     * Dessine une note simple
     * @param {CanvasRenderingContext2D} ctx - Contexte
     * @param {object} note - Note à dessiner
     * @param {number} x - Position X
     * @param {string} clef - Clef
     * @param {number} staffY - Position Y de la portée
     * @returns {number} - Nouvelle position X
     */
    drawNote(ctx, note, x, clef, staffY = null) {
        // Calcule la position Y de la note sur la portée
        const basePosition = this.notePositions[note.note][clef];
        const position = basePosition + (note.octave * 7); // Décalage d'octave
        const y = this.getYPosition(position, staffY);

        // Dessine les lignes supplémentaires si la note est hors portée 
        this.drawLedgerLines(ctx, x, position, staffY);

        // Dessine la tête de note
        this.drawNoteHead(ctx, x, y, note.duration);

        // Dessine l'altération (si présente)
        if (note.alteration) {
            this.drawAccidental(ctx, note.alteration, x - 15, y);
        }

        // Dessine la queue (si pas ronde)
        if (note.duration < 4) {
            this.drawNoteStem(ctx, x, y, note.duration);
        }

        // Dessine le point (pour les notes pointées)
        if (this.isDotted(note)) {
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.arc(x + 20, y, 2, 0, Math.PI * 2);
            ctx.fill();
        }

        return x;
    }

    /**
     * Dessine un accord (plusieurs notes empilées)
     * @param {CanvasRenderingContext2D} ctx - Contexte
     * @param {object} chord - Accord
     * @param {number} x - Position X
     * @param {string} clef - Clef
     * @param {number} staffY - Position Y de la portée
     * @returns {number} - Nouvelle position X
     */
    drawChord(ctx, chord, x, clef, staffY = null) {
        // Dessine chaque note de l'accord à la même position X
		var firstNote = null;
		var firstNotePosition = 0;
        for (const note of chord.notes) {
            const basePosition = this.notePositions[note.note][clef];
            const position = basePosition + (note.octave * 7);
			if (firstNote == null || firstNotePosition < position) {
				firstNote = note;
				firstNotePosition = position;
			}
            const y = this.getYPosition(position, staffY);

            // Lignes supplémentaires
            this.drawLedgerLines(ctx, x, position, staffY);

            // Tête de note
            this.drawNoteHead(ctx, x, y, chord.duration);
			if (chord.duration < 4 ) {
				this.drawNoteStem(ctx, x, y, 1);
			}


            // Altération
            if (note.alteration) {
                this.drawAccidental(ctx, note.alteration, x - 15, y);
            }
        }

        const basePosition = this.notePositions[firstNote.note][clef];
        const position = basePosition + (firstNote.octave * 7);
        const y = this.getYPosition(position, staffY);

        // Dessine UNE queue pour tout l'accord si pas ronde
        if (chord.duration < 4) {
            this.drawNoteStem(ctx, x, y, chord.duration);
        }

        // Dessine le point (pour les accords pointés, un pour tout l'accord)
        if (this.isDotted(chord)) {
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.arc(x + 20, y, 2, 0, Math.PI * 2);
            ctx.fill();
        }

        return x;
    }

    /**
     * Dessine un silence
     * @param {CanvasRenderingContext2D} ctx - Contexte
     * @param {object} rest - Silence
     * @param {number} x - Position X
     * @param {number} staffY - Position Y de la portée
     * @returns {number} - Nouvelle position X
     */
    drawRest(ctx, rest, x, staffY = null) {
        const y = (staffY || this.config.marginTop) + (2 * this.config.staffLineSpacing);

        ctx.font = 'bold 30px serif';
        ctx.fillStyle = '#000';

        // Symbole de silence selon la durée
        if (rest.duration >= 4) {
            ctx.fillText('𝄻', x, y); // Pause (silence de ronde)
        } else if (rest.duration >= 2) {
            ctx.fillText('𝄼', x, y); // Demi-pause
        } else if (rest.duration >= 1) {
            ctx.fillText('𝄽', x, y); // Soupir
        } else if (rest.duration >= 0.5) {
            ctx.fillText('𝄾', x, y); // Demi-soupir
        } else {
            ctx.fillText('𝄿', x, y); // Quart de soupir
        }

        return x;
    }

    /**
     * Dessine la tête d'une note
     * @param {CanvasRenderingContext2D} ctx - Contexte
     * @param {number} x - Position X
     * @param {number} y - Position Y
     * @param {number} duration - Durée de la note
     */
    drawNoteHead(ctx, x, y, duration) {
        ctx.fillStyle = '#000';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;

        if (duration >= 2) {
            // Blanche ou ronde : tête vide (ovale)
            ctx.beginPath();
            ctx.ellipse(x + 5, y, 6, 5, -0.3, 0, Math.PI * 2);
            ctx.stroke();
        } else {
            // Noire, croche, etc. : tête pleine
            ctx.beginPath();
            ctx.ellipse(x + 5, y, 6, 5, -0.3, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    /**
     * Dessine la queue d'une note
     * @param {CanvasRenderingContext2D} ctx - Contexte
     * @param {number} x - Position X
     * @param {number} y - Position Y
     * @param {number} duration - Durée
     */
    drawNoteStem(ctx, x, y, duration) {
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;

        // Queue verticale
        ctx.beginPath();
        ctx.moveTo(x + 11, y);
        ctx.lineTo(x + 11, y - 40);
        ctx.stroke();

        // Crochets pour croche et double-croche
        if (duration <= 0.5) {
            // Premier crochet
            ctx.beginPath();
            ctx.moveTo(x + 11, y - 40);
            ctx.quadraticCurveTo(x + 20, y - 35, x + 18, y - 30);
            ctx.stroke();
        }
        if (duration < 0.5) {
            // Deuxième crochet si besoin
            ctx.beginPath();
            ctx.moveTo(x + 11, y - 33);
            ctx.quadraticCurveTo(x + 20, y - 28, x + 18, y - 23);
            ctx.stroke();
        }
    }

    /**
     * Dessine une altération (dièse, bémol, bécarre)
     * @param {CanvasRenderingContext2D} ctx - Contexte
     * @param {string} alteration - Type d'altération
     * @param {number} x - Position X
     * @param {number} y - Position Y
     */
    drawAccidental(ctx, alteration, x, y) {
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
     * Calcule la position Y d'une note sur la portée
     * @param {number} position - Position relative (0 = ligne du bas, peut être négatif)
     * @param {number} staffY - Position Y de la portée actuelle
     * @returns {number} - Position Y en pixels
     */
    getYPosition(position, staffY = null) {
        // La portée a 5 lignes, position 0 = ligne du bas (ligne 1, index 0)
        // On part de la première ligne (marginTop + 4*spacing serait la dernière ligne)
        const staffFirstLine = (staffY || this.config.marginTop);

        // Chaque position = espacement / 2 (une position = une ligne ou un interligne)
        const spacing = this.config.staffLineSpacing / 2;

        // Position 0 = première ligne (bas), position augmente vers le haut
        // Donc on va VERS LE BAS (y augmente) pour les positions négatives
        return staffFirstLine + (4 * this.config.staffLineSpacing) - (position * spacing);
    }

    /**
     * Dessine une barre de mesure
     * @param {CanvasRenderingContext2D} ctx - Contexte
     * @param {number} x - Position X
     * @param {number} staffY - Position Y de la portée
     * @param {boolean} isDouble - Barre double (fin de partition)
     */
    drawBarline(ctx, x, staffY = null, isDouble = false) {
        const y = staffY || this.config.marginTop;
        const height = 4 * this.config.staffLineSpacing;

        ctx.strokeStyle = '#000';
        ctx.lineWidth = isDouble ? 3 : 1;

        // Première ligne
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + height);
        ctx.stroke();

        // Si c'est une barre double (fin), dessine une seconde ligne
        if (isDouble) {
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x - 5, y);
            ctx.lineTo(x - 5, y + height);
            ctx.stroke();
        }
    }

    /**
     * Dessine les lignes supplémentaires pour notes hors portée
     * @param {CanvasRenderingContext2D} ctx - Contexte
     * @param {number} x - Position X de la note
     * @param {number} position - Position relative de la note
     * @param {number} staffY - Position Y de la portée
     */
    drawLedgerLines(ctx, x, position, staffY = null) {
		ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;

        // Si la note est en dessous de la portée (position < 0)
        if (position < 0) {
            for (let p = -1; p > position; p -= 2) {
                const y = this.getYPosition(p, staffY);
                ctx.beginPath();
                ctx.moveTo(x - 5, y+5);
                ctx.lineTo(x + 18, y+5);
                ctx.stroke();
            }
        }
        // Si la note est au-dessus de la portée (position > 9 pour clef de sol)
        else if (position > 9) {
            for (let p = 9; p < position; p += 2) {
                const y = this.getYPosition(p, staffY);
                ctx.beginPath();
                ctx.moveTo(x - 5, y-5);
                ctx.lineTo(x + 18, y-5);
                ctx.stroke();
            }
        }
    }

    /**
     * Indique si une note ou un accord est pointé
     * @param {Object} noteOrChord - note, ou accord
     * @returns {boolean} - true si la note ou l'accord est pointé
     */
    isDotted(noteOrChord) {
        return [0.375, 0.75, 1.5, 3, 6].indexOf(noteOrChord.duration) >= 0;
    }
}
