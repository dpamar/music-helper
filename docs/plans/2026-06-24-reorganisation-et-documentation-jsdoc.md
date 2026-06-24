> For agentic workers: implement this plan task-by-task with
> red-green-refactor discipline. One task, one commit. Never
> batch.

# Plan : Réorganisation et Documentation JSDoc des Modules JavaScript

**Date** : 2026-06-24  
**Objectif** : Réorganiser les méthodes dans toutes les classes JavaScript (Parser, Renderer, MidiExporter, MidiAudioPlayer) selon un ordre logique et ajouter une documentation JSDoc complète en français.

---

## Tâche 1 : Réorganisation et documentation de `parser.js`

### Ordre cible des méthodes :
1. Constructor
2. Méthodes publiques principales : `parse()`, `transposeScore()`
3. Méthodes publiques auxiliaires : `parseTempo()`, `parseTimeSignature()`, `parseClefAndKey()`, `parseAlteration()`, `parseNotes()`, `parseNoteOrChord()`, `parseRest()`, `parseOctave()`
4. Méthodes privées/helpers : `getSignaturesMap()`, `transposeNotes()`, `transposeNote()`

### Documentation JSDoc à ajouter :

```javascript
/**
 * Parser - Analyse la notation textuelle et génère des structures de données.
 * Format attendu :
 * - Ligne 1 : Titre
 * - Ligne 2 : Tempo (nombre)
 * - Ligne 3 : Chiffrage (ex: 4/4)
 * - Ligne 4 : Clef (sol ou fa) et altérations à la clef
 * - Lignes suivantes : Notes et silences
 */
class Parser {
    /**
     * Initialise le parser avec les mappings de notes français → anglo-saxon.
     */
    constructor() { ... }

    /**
     * Parse le texte complet d'une partition et retourne un objet structuré.
     * @param {string} text - Texte brut de la partition (lignes séparées par \n)
     * @returns {{title: string, tempo: number, timeSignature: {numerator: number, denominator: number}, clef: string, keySignature: Array, notes: Array}} Objet ParseResult
     * @throws {Error} Si le format est invalide (moins de 5 lignes, tempo/chiffrage invalide, etc.)
     */
    parse(text) { ... }

    /**
     * Transpose une partition entière d'un nombre de demi-tons.
     * @param {Object} scoreData - Objet ParseResult (résultat de parse())
     * @param {number} numberOfHalfTones - Nombre de demi-tons (positif = vers l'aigu, négatif = vers le grave)
     * @returns {Object} Nouvelle partition transposée (même structure que ParseResult)
     */
    transposeScore(scoreData, numberOfHalfTones) { ... }

    /**
     * Parse la ligne de tempo et valide la valeur.
     * @param {string} tempoStr - Ligne de tempo (ex: "120")
     * @returns {number} Tempo en BPM
     * @throws {Error} Si le tempo n'est pas un nombre entre 20 et 300
     */
    parseTempo(tempoStr) { ... }

    /**
     * Parse le chiffrage de mesure.
     * @param {string} timeStr - Chiffrage (ex: "4/4", "3/4", "6/8")
     * @returns {{numerator: number, denominator: number}} Numérateur et dénominateur
     * @throws {Error} Si le format n'est pas "n/n"
     */
    parseTimeSignature(timeStr) { ... }

    /**
     * Parse la clef et les altérations à la clef.
     * @param {string} clefStr - Ligne clef (ex: "sol", "fa", "sol Do# Mib")
     * @returns {{clef: string, keySignature: Array<{note: string, alteration: string}>}} Clef et armure
     * @throws {Error} Si la clef n'est pas "sol" ou "fa", ou si une altération est mal formée
     */
    parseClefAndKey(clefStr) { ... }

    /**
     * Parse une altération à la clef (ex: "Do#", "Mib", "Fa*").
     * @param {string} altStr - Altération (ex: "Do#")
     * @returns {{note: string, alteration: string}} Note (anglo-saxonne) et altération ('sharp', 'flat', 'natural')
     * @throws {Error} Si le format est invalide
     */
    parseAlteration(altStr) { ... }

    /**
     * Parse une ligne de notes et silences.
     * @param {string} notesStr - Ligne de notes (ex: "Do Re Mi Fa Sol")
     * @param {Array} signatures - Map des altérations de l'armure (ex: signatures['C'] = 'sharp')
     * @returns {Array<{type: string, ...}>} Tableau de notes/accords/silences
     */
    parseNotes(notesStr, signatures) { ... }

    /**
     * Parse une note ou un accord (ex: "Do2", "DoMiSol4", "Fa#0.5").
     * @param {string} noteStr - Token de note/accord
     * @param {Array} signatures - Map des altérations de l'armure
     * @returns {{type: 'note'|'chord', ...}} Note simple ou accord
     * @throws {Error} Si le token est invalide ou la durée n'est pas un nombre
     */
    parseNoteOrChord(noteStr, signatures) { ... }

    /**
     * Parse un silence (ex: "S", "S2", "S0.5").
     * @param {string} restStr - Token de silence
     * @returns {{type: 'rest', duration: number}} Objet silence
     */
    parseRest(restStr) { ... }

    /**
     * Parse le modificateur d'octave (ex: "--", "-", "", "+", "++").
     * @param {string} octaveStr - Symbole d'octave
     * @returns {number} Décalage d'octave (-2, -1, 0, 1, 2)
     */
    parseOctave(octaveStr) { ... }

    /**
     * Convertit l'armure en map pour accès rapide (note → altération).
     * @param {Array<{note: string, alteration: string}>} keySignature - Armure
     * @returns {Array} Map indexée par nom de note
     * @private
     */
    getSignaturesMap(keySignature) { ... }

    /**
     * Transpose un tableau de notes.
     * @param {Array} notes - Tableau de notes/accords/silences
     * @param {Array} signatures - Map des altérations de l'armure
     * @param {number} numberOfHalfTones - Nombre de demi-tons
     * @returns {Array} Tableau transposé
     * @private
     */
    transposeNotes(notes, signatures, numberOfHalfTones) { ... }

    /**
     * Transpose une note individuelle (ou récursivement un accord).
     * Gère les passages d'octave automatiquement.
     * @param {Object} note - Note à transposer
     * @param {Array} signatures - Map des altérations de l'armure
     * @param {number} numberOfHalfTones - Nombre de demi-tons
     * @returns {Object} Note transposée
     * @private
     */
    transposeNote(note, signatures, numberOfHalfTones) { ... }
}
```

**Actions :**
1. Réorganiser les méthodes dans cet ordre
2. Ajouter les commentaires JSDoc en français au-dessus de chaque méthode
3. Vérifier que la syntaxe JavaScript reste valide
4. Tester avec `node parser.js` ou en chargeant la page
5. Commit : `docs(parser): reorganize methods and add JSDoc comments`

---

## Tâche 2 : Réorganisation et documentation de `renderer.js`

### Ordre cible des méthodes :
1. Constructor
2. Méthodes publiques principales : `render()`, `optimizeKeySignature()`, `setOptimizationMode()`
3. Méthodes de dessin principal : `drawTitle()`, `drawMetadata()`, `drawStaff()`, `drawClef()`, `drawKeySignature()`, `drawTimeSignature()`, `drawNotes()`
4. Méthodes de dessin de notes : `drawNote()`, `drawChord()`, `drawRest()`, `drawNoteHead()`, `drawNoteStem()`, `drawAccidental()`
5. Méthodes auxiliaires de dessin : `drawBarline()`, `drawLedgerLines()`, `drawLink()`
6. Helpers privés : `getSignaturesMap()`, `beatsPerMesure()`, `getYPosition()`, `handleAlteration()`, `handleDot()`, `computeAlteration()`, `getBestRepresentation()`, `getSecondaryRepresentation()`, `isDotted()`

### Documentation JSDoc à ajouter :

```javascript
/**
 * Renderer - Dessine la partition musicale sur un Canvas HTML5.
 */
class Renderer {
    /**
     * Initialise le moteur de rendu avec les configurations par défaut.
     */
    constructor() { ... }

    /**
     * Dessine la partition complète sur un Canvas HTML5.
     * Crée le canvas, dessine portée, clef, armure, chiffrage, notes.
     * @param {Object} scoreData - Objet ParseResult (résultat de Parser.parse())
     * @param {HTMLElement} container - Élément DOM où insérer le canvas
     * @returns {void}
     */
    render(scoreData, container) { ... }

    /**
     * Optimise l'armure pour minimiser les altérations accidentelles.
     * Teste toutes les armures possibles (0-7 dièses, 0-7 bémols) et choisit la meilleure.
     * @param {Object} scoreData - Partition à optimiser
     * @returns {Object} Nouvelle partition avec armure optimale
     */
    optimizeKeySignature(scoreData) { ... }

    /**
     * Active/désactive le mode optimisation (pour getBestRepresentation).
     * @param {boolean} optimizationMode - true pour activer l'optimisation
     * @returns {void}
     */
    setOptimizationMode(optimizationMode) { ... }

    /**
     * Dessine le titre de la partition (centré, 28px, gras).
     * @param {CanvasRenderingContext2D} ctx - Contexte canvas
     * @param {string} title - Titre de la partition
     * @param {number} canvasWidth - Largeur du canvas
     * @returns {void}
     * @private
     */
    drawTitle(ctx, title, canvasWidth) { ... }

    /**
     * Dessine les métadonnées (tempo, chiffrage, clef) sous le titre.
     * @param {CanvasRenderingContext2D} ctx - Contexte canvas
     * @param {Object} scoreData - Partition complète
     * @param {number} canvasWidth - Largeur du canvas
     * @returns {void}
     * @private
     */
    drawMetadata(ctx, scoreData, canvasWidth) { ... }

    /**
     * Dessine les 5 lignes horizontales de la portée.
     * @param {CanvasRenderingContext2D} ctx - Contexte canvas
     * @param {string} clef - Type de clef (pour référence)
     * @param {number|null} yOffset - Position Y de la portée (null = utiliser marginTop)
     * @returns {void}
     * @private
     */
    drawStaff(ctx, clef, yOffset = null) { ... }

    /**
     * Dessine le symbole de clef (𝄞 sol ou 𝄢 fa).
     * @param {CanvasRenderingContext2D} ctx - Contexte canvas
     * @param {string} clef - "sol" ou "fa"
     * @returns {void}
     * @private
     */
    drawClef(ctx, clef) { ... }

    /**
     * Dessine l'armure (dièses et bémols à la clef).
     * @param {CanvasRenderingContext2D} ctx - Contexte canvas
     * @param {Array<{note: string, alteration: string}>} keySignature - Armure
     * @param {number} startX - Position X de départ
     * @param {string} clef - "sol" ou "fa"
     * @returns {number} Position X après l'armure
     * @private
     */
    drawKeySignature(ctx, keySignature, startX, clef) { ... }

    /**
     * Dessine le chiffrage de mesure (numérateur / dénominateur).
     * @param {CanvasRenderingContext2D} ctx - Contexte canvas
     * @param {{numerator: number, denominator: number}} timeSignature - Chiffrage
     * @param {number} startX - Position X de départ
     * @returns {number} Position X après le chiffrage
     * @private
     */
    drawTimeSignature(ctx, timeSignature, startX) { ... }

    /**
     * Dessine toutes les notes, accords et silences avec barres de mesure.
     * Gère les retours à la ligne automatiques.
     * @param {CanvasRenderingContext2D} ctx - Contexte canvas
     * @param {Array} notes - Tableau de notes/accords/silences
     * @param {Object} timeSignature - Chiffrage de mesure
     * @param {number} startX - Position X de départ
     * @param {string} clef - "sol" ou "fa"
     * @param {Array} signatures - Map des altérations de l'armure
     * @returns {void}
     * @private
     */
    drawNotes(ctx, notes, timeSignature, startX, clef, signatures) { ... }

    /**
     * Dessine une note simple (tête, hampe, altération, point).
     * @param {CanvasRenderingContext2D} ctx - Contexte canvas
     * @param {Object} note - Note à dessiner
     * @param {number} x - Position X
     * @param {string} clef - "sol" ou "fa"
     * @param {Array} signatures - Map des altérations de l'armure
     * @param {number|null} staffY - Position Y de la portée (null = marginTop)
     * @param {number|null} durationModification - Durée alternative (pour notes liées)
     * @returns {{x: number, y: number}} Nouvelle position X et Y de la note
     * @private
     */
    drawNote(ctx, note, x, clef, signatures, staffY = null, durationModification = null) { ... }

    /**
     * Dessine un accord (plusieurs notes superposées).
     * @param {CanvasRenderingContext2D} ctx - Contexte canvas
     * @param {Object} chord - Accord à dessiner
     * @param {number} x - Position X
     * @param {string} clef - "sol" ou "fa"
     * @param {Array} signatures - Map des altérations de l'armure
     * @param {number|null} staffY - Position Y de la portée
     * @param {number|null} durationModification - Durée alternative
     * @returns {{x: number, y: number}} Nouvelle position X et Y
     * @private
     */
    drawChord(ctx, chord, x, clef, signatures, staffY = null, durationModification = null) { ... }

    /**
     * Dessine un silence (symbole géométrique selon la durée).
     * @param {CanvasRenderingContext2D} ctx - Contexte canvas
     * @param {Object} rest - Silence à dessiner
     * @param {number} x - Position X
     * @param {number|null} staffY - Position Y de la portée
     * @returns {number} Nouvelle position X
     * @private
     */
    drawRest(ctx, rest, x, staffY = null) { ... }

    /**
     * Dessine la tête de note (ovale pleine ou vide selon la durée).
     * @param {CanvasRenderingContext2D} ctx - Contexte canvas
     * @param {number} x - Position X
     * @param {number} y - Position Y
     * @param {number} duration - Durée de la note
     * @returns {void}
     * @private
     */
    drawNoteHead(ctx, x, y, duration) { ... }

    /**
     * Dessine la hampe de note (et crochets si nécessaire).
     * @param {CanvasRenderingContext2D} ctx - Contexte canvas
     * @param {number} x - Position X
     * @param {number} y - Position Y de la tête
     * @param {number} duration - Durée de la note
     * @returns {void}
     * @private
     */
    drawNoteStem(ctx, x, y, duration) { ... }

    /**
     * Dessine une altération accidentelle (♯, ♭, ♮).
     * Incrémente le compteur d'altérations (pour optimisation).
     * @param {CanvasRenderingContext2D} ctx - Contexte canvas
     * @param {string} alteration - Type d'altération ('sharp', 'flat', 'natural')
     * @param {number} x - Position X
     * @param {number} y - Position Y
     * @returns {void}
     * @private
     */
    drawAccidental(ctx, alteration, x, y) { ... }

    /**
     * Dessine une barre de mesure (simple ou double).
     * @param {CanvasRenderingContext2D} ctx - Contexte canvas
     * @param {number} x - Position X
     * @param {number|null} staffY - Position Y de la portée
     * @param {boolean} isDouble - true pour barre double (fin de morceau)
     * @returns {void}
     * @private
     */
    drawBarline(ctx, x, staffY = null, isDouble = false) { ... }

    /**
     * Dessine les lignes supplémentaires (au-dessus ou en-dessous de la portée).
     * @param {CanvasRenderingContext2D} ctx - Contexte canvas
     * @param {number} x - Position X de la note
     * @param {number} position - Position sur la portée
     * @param {number|null} staffY - Position Y de la portée
     * @returns {void}
     * @private
     */
    drawLedgerLines(ctx, x, position, staffY = null) { ... }

    /**
     * Dessine un arc de liaison entre deux notes (pour notes prolongées sur plusieurs mesures).
     * @param {CanvasRenderingContext2D} ctx - Contexte canvas
     * @param {number} firstNoteX - Position X de la première note
     * @param {number} lastNoteX - Position X de la dernière note
     * @param {number} noteY - Position Y des notes
     * @returns {void}
     * @private
     */
    drawLink(ctx, firstNoteX, lastNoteX, noteY) { ... }

    /**
     * Convertit l'armure en map pour accès rapide.
     * @param {Array<{note: string, alteration: string}>} keySignature - Armure
     * @returns {Array} Map indexée par nom de note
     * @private
     */
    getSignaturesMap(keySignature) { ... }

    /**
     * Calcule le nombre de temps par mesure (en noires).
     * @param {{numerator: number, denominator: number}} timeSignature - Chiffrage
     * @returns {number} Nombre de temps par mesure
     * @private
     */
    beatsPerMesure(timeSignature) { ... }

    /**
     * Convertit une position de portée (0-9 = lignes et interlignes) en coordonnée Y pixels.
     * @param {number} position - Position sur la portée (0 = ligne du bas, 9 = ligne du haut)
     * @param {number|null} staffY - Position Y de la portée (null = marginTop)
     * @returns {number} Coordonnée Y en pixels
     * @private
     */
    getYPosition(position, staffY = null) { ... }

    /**
     * Gère l'affichage de l'altération d'une note (dièse, bémol, bécarre).
     * Appelle drawAccidental si nécessaire.
     * @param {CanvasRenderingContext2D} ctx - Contexte canvas
     * @param {number} x - Position X
     * @param {number} y - Position Y
     * @param {Object} note - Note avec altération
     * @param {Array} defaultAlterations - Altérations de l'armure
     * @returns {void}
     * @private
     */
    handleAlteration(ctx, x, y, note, defaultAlterations) { ... }

    /**
     * Gère l'affichage du point de prolongation (note pointée).
     * @param {CanvasRenderingContext2D} ctx - Contexte canvas
     * @param {number} x - Position X
     * @param {number} y - Position Y
     * @param {number} duration - Durée de la note
     * @returns {void}
     * @private
     */
    handleDot(ctx, x, y, duration) { ... }

    /**
     * Calcule l'altération effective à afficher (en tenant compte de l'armure).
     * @param {string} note - Nom de la note
     * @param {string} initialAlteration - Altération de la note
     * @param {string} defaultAlteration - Altération de l'armure pour cette note
     * @returns {string} Altération à dessiner ('' si aucune)
     * @private
     */
    computeAlteration(note, initialAlteration, defaultAlteration) { ... }

    /**
     * Choisit la meilleure représentation d'une note (Do# ou Réb) pour minimiser les altérations.
     * @param {Object} noteWithAlteration - Note avec altération
     * @param {Array} defaultAlterations - Altérations de l'armure
     * @returns {Object} Représentation optimale (peut être la note originale ou son enharmonique)
     * @private
     */
    getBestRepresentation(noteWithAlteration, defaultAlterations) { ... }

    /**
     * Calcule la représentation enharmonique d'une note (Do# ↔ Réb).
     * @param {Object} noteWithAlteration - Note avec altération
     * @returns {Object} Note enharmonique (ou note originale si non applicable)
     * @private
     */
    getSecondaryRepresentation(noteWithAlteration) { ... }

    /**
     * Vérifie si une durée correspond à une note pointée.
     * @param {number} duration - Durée de la note
     * @returns {boolean} true si pointée (0.375, 0.75, 1.5, 3, 6)
     * @private
     */
    isDotted(duration) { ... }
}
```

**Actions :**
1. Réorganiser les méthodes dans cet ordre
2. Ajouter les commentaires JSDoc en français
3. Vérifier la syntaxe
4. Tester en générant une partition
5. Commit : `docs(renderer): reorganize methods and add JSDoc comments`

---

## Tâche 3 : Réorganisation et documentation de `midi-export.js`

### Ordre cible des méthodes :
1. Constructor
2. Méthodes publiques principales : `export()`, `exportMultiTrack()`, `generateMidiFile()`
3. Méthodes de génération : `generateMidiEvents()`, `buildHeaderChunk()`, `buildTrackChunk()`
4. Méthodes de conversion : `noteToMidiNumber()`, `computeAlteration()`
5. Helpers d'encodage : `writeVarLength()`, `writeString()`, `writeUint16()`, `writeUint32()`

### Documentation JSDoc à ajouter :

```javascript
/**
 * MidiExporter - Génère des fichiers MIDI Standard (Format 0 et Format 1).
 */
class MidiExporter {
    /**
     * Initialise l'exporteur MIDI.
     */
    constructor() { ... }

    /**
     * Exporte la partition en fichier MIDI Format 0 (mono-piste) et déclenche le téléchargement.
     * @param {Object} scoreData - Partition à exporter
     * @param {string} filename - Nom du fichier (sans extension)
     * @param {number} program - Numéro de programme MIDI (0-127, ex: 0 = Piano)
     * @param {string|null} gmName - Nom General MIDI de l'instrument (pour meta Track Name)
     * @returns {void}
     */
    export(scoreData, filename, program = 0, gmName = null) { ... }

    /**
     * Exporte la partition en fichier MIDI Format 1 (multi-pistes) et déclenche le téléchargement.
     * Chaque instrument est une piste distincte.
     * @param {Object} scoreData - Partition à exporter
     * @param {string} filename - Nom du fichier (sans extension)
     * @param {Array<{name: string, program: number, gmName: string}>} instruments - Liste des instruments
     * @returns {void}
     * @throws {Error} Si aucun instrument ou plus de 16 instruments (limite MIDI)
     */
    exportMultiTrack(scoreData, filename, instruments) { ... }

    /**
     * Génère un Blob MIDI Format 0 en mémoire (sans télécharger).
     * @param {Object} scoreData - Partition à convertir
     * @param {number} program - Numéro de programme MIDI
     * @returns {Blob} Blob MIDI de type 'audio/midi'
     */
    generateMidiFile(scoreData, program = 0) { ... }

    /**
     * Génère les événements MIDI (Note On/Off) à partir de la partition.
     * @param {Object} scoreData - Partition avec notes/accords/silences
     * @returns {Array<{tick: number, type: string, channel: number, note: number, velocity: number}>} Événements MIDI triés par tick
     */
    generateMidiEvents(scoreData) { ... }

    /**
     * Construit le header chunk MIDI (MThd).
     * @param {number} format - Format MIDI (0 = mono-piste, 1 = multi-pistes)
     * @param {number} numTracks - Nombre de pistes
     * @param {number} ppq - Ticks par noire (Pulses Per Quarter note)
     * @returns {Array<number>} Bytes du header chunk
     */
    buildHeaderChunk(format, numTracks, ppq) { ... }

    /**
     * Construit un track chunk MIDI (MTrk) avec meta-événements et notes.
     * @param {Object} scoreData - Partition
     * @param {Array} events - Événements MIDI (Note On/Off)
     * @param {number} program - Numéro de programme MIDI
     * @param {number} channel - Canal MIDI (0-15)
     * @param {string|null} trackName - Nom de la piste (meta Track Name)
     * @returns {Array<number>} Bytes du track chunk (MTrk header + données)
     * @throws {Error} Si le tempo est invalide ou le timeSignature est manquant
     */
    buildTrackChunk(scoreData, events, program = 0, channel = 0, trackName = null) { ... }

    /**
     * Convertit une note musicale en numéro MIDI (0-127).
     * C4 (Do médium) = MIDI 60.
     * @param {string} note - Nom de note anglo-saxon (C, D, E, F, G, A, B)
     * @param {string} alteration - Altération ('sharp', 'flat', '' ou autre)
     * @param {number} octave - Décalage d'octave (-2 à +2)
     * @returns {number} Numéro MIDI (0-127, clamping automatique)
     * @throws {Error} Si le nom de note est inconnu
     */
    noteToMidiNumber(note, alteration, octave) { ... }

    /**
     * Calcule l'altération effective d'une note (explicite ou issue de l'armure).
     * @param {Object} note - Note avec champ .alteration
     * @param {Array} keySignature - Map des altérations de l'armure
     * @returns {string} Altération effective ('sharp', 'flat', '' ou autre)
     * @private
     */
    computeAlteration(note, keySignature) { ... }

    /**
     * Encode un nombre en Variable Length Quantity (VLQ) MIDI.
     * Format : 7 bits de données + 1 bit de continuation (MSB) par byte.
     * @param {number} value - Valeur à encoder (0 - 268435455)
     * @returns {Array<number>} Bytes VLQ (MSB-first)
     * @throws {Error} Si la valeur est négative ou dépasse 0x0FFFFFFF
     * @private
     */
    writeVarLength(value) { ... }

    /**
     * Convertit une chaîne en tableau de bytes ASCII.
     * @param {string} str - Chaîne à encoder
     * @returns {Array<number>} Bytes ASCII
     * @private
     */
    writeString(str) { ... }

    /**
     * Encode un entier 16 bits en big-endian (2 bytes).
     * @param {number} value - Valeur (0-65535)
     * @returns {Array<number>} 2 bytes big-endian
     * @private
     */
    writeUint16(value) { ... }

    /**
     * Encode un entier 32 bits en big-endian (4 bytes).
     * @param {number} value - Valeur (0-4294967295)
     * @returns {Array<number>} 4 bytes big-endian
     * @private
     */
    writeUint32(value) { ... }
}
```

**Actions :**
1. Réorganiser les méthodes dans cet ordre
2. Ajouter les commentaires JSDoc en français
3. Vérifier la syntaxe
4. Tester l'export MIDI
5. Commit : `docs(midi-export): reorganize methods and add JSDoc comments`

---

## Tâche 4 : Réorganisation et documentation de `midi-audio-player.js`

### Ordre cible des méthodes :
1. Constructor
2. Méthodes publiques principales : `init()`, `play()`, `stop()`
3. Méthodes auxiliaires : `scheduleNote()`, `cleanup()`
4. Getter : `get isPlaying()`

### Documentation JSDoc à ajouter :

```javascript
/**
 * MidiAudioPlayer - Synthétise les notes via Web Audio API directement dans le navigateur.
 */
class MidiAudioPlayer {
    /**
     * Initialise le lecteur audio (contexte non créé, fait à l'init()).
     */
    constructor() { ... }

    /**
     * Initialise le contexte Web Audio et stocke la référence au MidiExporter.
     * @param {HTMLAudioElement} audioElement - Élément audio (peut être null, non utilisé actuellement)
     * @param {MidiExporter} midiExporter - Instance de MidiExporter pour générer les événements MIDI
     * @returns {void}
     */
    init(audioElement, midiExporter) { ... }

    /**
     * Lit la partition avec synthèse audio Web Audio API.
     * Programme tous les oscillateurs à l'avance (pas de drift temporel).
     * @param {Object} scoreData - Partition à jouer
     * @returns {Promise<void>} Promise qui se résout immédiatement (lecture asynchrone)
     * @throws {Error} Si MidiExporter n'est pas initialisé ou si scoreData est null
     */
    async play(scoreData) { ... }

    /**
     * Arrête la lecture immédiatement avec rampe de gain (évite les clics).
     * @returns {void}
     */
    stop() { ... }

    /**
     * Programme une note individuelle (oscillateur + enveloppe ADSR).
     * Formule de fréquence : f = 440 × 2^((n - 69) / 12) où A4 = MIDI 69 = 440 Hz.
     * @param {number} midiNumber - Numéro MIDI (0-127)
     * @param {number} startTime - Temps de début (AudioContext.currentTime + offset)
     * @param {number} duration - Durée en secondes
     * @returns {void}
     * @private
     */
    scheduleNote(midiNumber, startTime, duration) { ... }

    /**
     * Libère les ressources audio (appelle stop()).
     * @returns {void}
     */
    cleanup() { ... }

    /**
     * Retourne l'état de lecture actuel.
     * @returns {boolean} true si en cours de lecture
     */
    get isPlaying() { ... }
}
```

**Actions :**
1. Réorganiser les méthodes dans cet ordre
2. Ajouter les commentaires JSDoc en français
3. Vérifier la syntaxe
4. Tester la lecture audio
5. Commit : `docs(midi-audio-player): reorganize methods and add JSDoc comments`

---

## Tâche 5 : Vérification finale et tests

**Actions :**
1. Charger `index.html` dans un navigateur
2. Tester le workflow complet :
   - Saisir une partition
   - Générer la partition → vérifier le rendu
   - Exporter PNG → vérifier le téléchargement
   - Exporter MIDI (mono) → vérifier le fichier
   - Exporter MIDI (multi) → vérifier le fichier
   - Lire la partition → vérifier l'audio
3. Ouvrir la console développeur → vérifier qu'il n'y a pas d'erreurs JavaScript
4. Commit : `test: verify JSDoc reorganization with full workflow`

---

## Tâche 6 : Mise à jour de CLAUDE.md

**Actions :**
1. Ouvrir `CLAUDE.md`
2. Ajouter une section "## 📝 Documentation JSDoc" :
   ```markdown
   ## 📝 Documentation JSDoc

   Tous les modules JavaScript sont documentés avec JSDoc en français.

   **Format des commentaires :**
   - Description de la fonction/méthode
   - `@param {type} nom - Description` pour chaque paramètre
   - `@returns {type} Description` pour la valeur de retour
   - `@throws {Error} Description` si la fonction lance des exceptions
   - `@private` pour les méthodes internes (helpers)

   **Ordre des méthodes dans chaque classe :**
   1. Constructor
   2. Méthodes publiques principales (ordre d'utilisation dans le workflow)
   3. Méthodes publiques auxiliaires
   4. Méthodes privées/helpers

   **Exemple :**
   ```javascript
   /**
    * Parse le texte complet d'une partition.
    * @param {string} text - Texte brut de la partition
    * @returns {Object} Objet ParseResult
    * @throws {Error} Si le format est invalide
    */
   parse(text) { ... }
   ```

   Cette organisation facilite la compréhension du code pour les débutants et améliore l'auto-complétion dans les IDE modernes.
   ```
3. Commit : `docs: add JSDoc documentation section to CLAUDE.md`

---

## Résumé des commits attendus

1. `docs(parser): reorganize methods and add JSDoc comments`
2. `docs(renderer): reorganize methods and add JSDoc comments`
3. `docs(midi-export): reorganize methods and add JSDoc comments`
4. `docs(midi-audio-player): reorganize methods and add JSDoc comments`
5. `test: verify JSDoc reorganization with full workflow`
6. `docs: add JSDoc documentation section to CLAUDE.md`

---

**Notes importantes :**
- Aucun changement de logique, seulement réorganisation + documentation
- Les commentaires JSDoc sont en **français** (cohérent avec le reste du projet)
- Tester après chaque fichier modifié (pas de batch)
- Commit fréquent (1 module = 1 commit)
- L'ordre des méthodes suit le workflow utilisateur (parse → render → export → play)

---

**Fin du plan.**
