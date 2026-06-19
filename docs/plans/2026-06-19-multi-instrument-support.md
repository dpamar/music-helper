# Plan d'implémentation : Support multi-instruments avec exports MIDI individuels et globaux

> Pour agentic workers : implémenter ce plan task-by-task avec red-green-refactor discipline. Une tâche, un commit. Ne jamais grouper.

## Vue d'ensemble

Ajouter la possibilité de définir plusieurs partitions pour différents instruments, chacune avec son propre instrument MIDI, et exporter soit des fichiers MIDI individuels (un par partition), soit un fichier MIDI global combinant toutes les partitions en multi-pistes (Format 1).

## Objectifs

1. **Définition d'instrument par partition** : Chaque partition peut spécifier son instrument
2. **Saisie multi-partitions** : Interface pour gérer plusieurs partitions distinctes
3. **Export MIDI individuel** : Un fichier MIDI par partition (Format 0, mono-piste)
4. **Export MIDI global** : Un fichier MIDI multi-pistes (Format 1) combinant toutes les partitions

## Architecture cible

### Nouveaux fichiers

- `multi-score-manager.js` : Gère la collection de partitions
- `multi-midi-exporter.js` : Export MIDI Format 1 (multi-pistes)

### Modifications de fichiers existants

- `parser.js` : Ajouter parsing de l'instrument (ligne 5 optionnelle)
- `midi-export.js` : Adapter pour supporter Format 1 multi-pistes
- `app.js` : Orchestration multi-partitions
- `index.html` : UI pour gérer plusieurs partitions
- `styles.css` : Styles pour l'UI multi-partitions
- `CLAUDE.md` : Documentation de la nouvelle fonctionnalité

### Structure de données

```javascript
// Format étendu pour une partition avec instrument
{
  title: "Violon principal",
  tempo: 120,
  timeSignature: {numerator: 4, denominator: 4},
  clef: "sol",
  keySignature: [{note: 'F', alteration: 'sharp'}],
  instrument: "violon",  // NOUVEAU
  notes: [...]
}

// Collection de partitions
{
  globalTitle: "Mon Orchestre",
  scores: [
    {id: 1, scoreData: {...}, instrument: "violon"},
    {id: 2, scoreData: {...}, instrument: "piano"},
    ...
  ]
}
```

## Format de notation étendu

### Ligne 5 optionnelle : Instrument

```
Titre de la partition
120
4/4
sol
violon              # NOUVEAU (ligne 5 optionnelle)
Do Re Mi Fa Sol
```

Si la ligne 5 n'est pas un instrument reconnu, elle est traitée comme la première ligne de notes (backward compatible).

### Instruments reconnus

Réutilisation du mapping `INSTRUMENTS` existant dans `app.js` :
- `piano` (program 0)
- `guitare` (program 24)
- `violon` (program 40)
- `flute` (program 73)
- `accordeon` (program 21)
- `contrebasse` (program 43)
- `hautbois` (program 68)
- `trompette` (program 56)

## Tasks

---

### Task 1 : Étendre le parser pour supporter l'instrument (ligne 5 optionnelle)

**Objectif** : Permettre au parser de reconnaître un instrument en ligne 5 et de le stocker dans `scoreData`.

**Fichier** : `parser.js`

**Changements** :

1. Ajouter une méthode `parseInstrument(line)` qui vérifie si une ligne correspond à un instrument reconnu :

```javascript
/**
 * Parse l'instrument (ligne 5 optionnelle)
 * @param {string} instrumentStr - Nom de l'instrument
 * @returns {string|null} - Nom de l'instrument ou null si non reconnu
 */
parseInstrument(instrumentStr) {
    const validInstruments = [
        'piano', 'guitare', 'violon', 'flute',
        'accordeon', 'contrebasse', 'hautbois', 'trompette'
    ];
    
    const normalized = instrumentStr.trim().toLowerCase();
    return validInstruments.includes(normalized) ? normalized : null;
}
```

2. Modifier la méthode `parse(text)` pour tenter de parser la ligne 5 comme instrument :

```javascript
parse(text) {
    const lines = text.split('\n').map(line => line.trim());

    if (lines.length < 5) {
        throw new Error('La partition doit contenir au moins 5 lignes (titre, tempo, chiffrage, clef, notes)');
    }

    const title = lines[0] || 'Sans titre';
    const tempo = this.parseTempo(lines[1]);
    const timeSignature = this.parseTimeSignature(lines[2]);
    const { clef, keySignature } = this.parseClefAndKey(lines[3]);

    // Tente de parser la ligne 5 comme instrument
    let instrument = null;
    let noteLinesStartIndex = 4;
    
    if (lines.length > 5 || lines[4].trim().length > 0) {
        const parsedInstrument = this.parseInstrument(lines[4]);
        if (parsedInstrument !== null) {
            instrument = parsedInstrument;
            noteLinesStartIndex = 5;
        }
    }

    // Parse les notes (à partir de noteLinesStartIndex)
    const noteLines = lines.slice(noteLinesStartIndex).filter(line => line.length > 0);
    const notes = this.parseNotes(noteLines.join(' '));

    return {
        title,
        tempo,
        timeSignature,
        clef,
        keySignature,
        instrument, // NOUVEAU
        notes
    };
}
```

**Tests** :

- Partition avec instrument (6 lignes) → `instrument: "violon"`
- Partition sans instrument (5 lignes) → `instrument: null`
- Partition avec ligne 5 = note (pas instrument) → `instrument: null`, ligne 5 traitée comme notes

**Commit message** :

```
feat(parser): add optional instrument parsing on line 5

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

---

### Task 2 : Créer le gestionnaire de partitions multiples

**Objectif** : Classe pour gérer une collection de partitions avec ID unique, ajout, suppression, mise à jour.

**Fichier** : `multi-score-manager.js` (nouveau)

**Contenu** :

```javascript
/**
 * MULTI-SCORE-MANAGER.JS
 *
 * Gestionnaire de collection de partitions multiples
 * Permet d'ajouter, supprimer, et organiser plusieurs partitions
 * pour un export MIDI multi-pistes
 */

class MultiScoreManager {
    constructor() {
        this.scores = [];
        this.nextId = 1;
        this.globalTitle = 'Orchestre';
    }

    /**
     * Définit le titre global de la collection
     * @param {string} title - Titre global
     */
    setGlobalTitle(title) {
        this.globalTitle = title || 'Orchestre';
    }

    /**
     * Ajoute une partition à la collection
     * @param {Object} scoreData - Données parsées de la partition
     * @returns {number} ID de la partition ajoutée
     */
    addScore(scoreData) {
        if (!scoreData) {
            throw new Error('scoreData is required');
        }

        const id = this.nextId++;
        this.scores.push({
            id,
            scoreData,
            instrument: scoreData.instrument || 'piano'
        });

        return id;
    }

    /**
     * Supprime une partition par ID
     * @param {number} id - ID de la partition
     * @returns {boolean} true si supprimée, false si non trouvée
     */
    removeScore(id) {
        const index = this.scores.findIndex(s => s.id === id);
        if (index === -1) {
            return false;
        }
        this.scores.splice(index, 1);
        return true;
    }

    /**
     * Récupère une partition par ID
     * @param {number} id - ID de la partition
     * @returns {Object|null} Partition ou null si non trouvée
     */
    getScore(id) {
        return this.scores.find(s => s.id === id) || null;
    }

    /**
     * Récupère toutes les partitions
     * @returns {Array} Tableau de partitions
     */
    getAllScores() {
        return [...this.scores];
    }

    /**
     * Compte le nombre de partitions
     * @returns {number} Nombre de partitions
     */
    getCount() {
        return this.scores.length;
    }

    /**
     * Vérifie si la collection est vide
     * @returns {boolean} true si vide
     */
    isEmpty() {
        return this.scores.length === 0;
    }

    /**
     * Efface toutes les partitions
     */
    clear() {
        this.scores = [];
        this.nextId = 1;
    }

    /**
     * Met à jour l'instrument d'une partition
     * @param {number} id - ID de la partition
     * @param {string} instrument - Nom de l'instrument
     * @returns {boolean} true si mise à jour réussie
     */
    updateInstrument(id, instrument) {
        const score = this.getScore(id);
        if (!score) {
            return false;
        }
        score.instrument = instrument;
        score.scoreData.instrument = instrument;
        return true;
    }

    /**
     * Exporte la structure complète pour l'export MIDI
     * @returns {Object} Structure complète
     */
    exportForMidi() {
        return {
            globalTitle: this.globalTitle,
            scores: this.getAllScores()
        };
    }
}
```

**Tests** :

- `addScore()` → ID incrémenté
- `removeScore()` → partition supprimée
- `getScore()` → partition récupérée
- `clear()` → collection vide
- `isEmpty()` → true après clear

**Commit message** :

```
feat(multi-score): add MultiScoreManager class

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

---

### Task 3 : Créer l'exportateur MIDI multi-pistes (Format 1)

**Objectif** : Classe pour exporter un fichier MIDI Format 1 avec plusieurs pistes (une par partition).

**Fichier** : `multi-midi-exporter.js` (nouveau)

**Contenu** :

```javascript
/**
 * MULTI-MIDI-EXPORTER.JS
 *
 * Exportateur MIDI Format 1 (multi-pistes)
 * Génère un fichier MIDI avec une piste par partition
 */

class MultiMidiExporter {
    constructor(midiExporter) {
        this.midiExporter = midiExporter;
    }

    /**
     * Construit le chunk header MIDI Format 1 (multi-pistes)
     * @param {number} numTracks - Nombre de pistes
     * @param {number} ppq - Pulses per quarter note
     * @returns {Array<number>} Bytes du header chunk
     */
    buildHeaderChunk(numTracks, ppq) {
        const bytes = [];

        // "MThd" (4 bytes)
        bytes.push(...this.midiExporter.writeString('MThd'));

        // Taille du header (toujours 6 bytes)
        bytes.push(...this.midiExporter.writeUint32(6));

        // Format 1 (multi-track)
        bytes.push(...this.midiExporter.writeUint16(1));

        // Nombre de pistes
        bytes.push(...this.midiExporter.writeUint16(numTracks));

        // Division temporelle (ticks per quarter note)
        bytes.push(...this.midiExporter.writeUint16(ppq));

        return bytes;
    }

    /**
     * Construit une piste MIDI pour une partition donnée
     * @param {Object} scoreData - Données de partition
     * @param {string} instrument - Nom de l'instrument
     * @param {number} channel - Canal MIDI (0-15)
     * @param {number} ppq - Pulses per quarter note
     * @returns {Array<number>} Bytes du track chunk
     */
    buildTrackChunkForScore(scoreData, instrument, channel, ppq) {
        const trackData = [];
        let lastTick = 0;

        // Événement meta : Track Name
        const trackName = scoreData.title || instrument;
        trackData.push(0); // Delta time 0
        trackData.push(0xFF); // Meta event
        trackData.push(0x03); // Track name
        const titleBytes = this.midiExporter.writeString(trackName);
        trackData.push(...this.midiExporter.writeVarLength(titleBytes.length));
        trackData.push(...titleBytes);

        // Program Change (instrument)
        const INSTRUMENTS = {
            'piano': 0, 'guitare': 24, 'violon': 40, 'flute': 73,
            'accordeon': 21, 'contrebasse': 43, 'hautbois': 68, 'trompette': 56
        };
        const program = INSTRUMENTS[instrument] || 0;

        trackData.push(0); // Delta time 0
        trackData.push(0xC0 | channel); // Program Change
        trackData.push(program);

        // Génère les événements de notes
        const events = this.midiExporter.generateMidiEvents(scoreData);

        // Remplace le canal par celui de la piste
        for (const event of events) {
            const deltaTime = event.tick - lastTick;
            trackData.push(...this.midiExporter.writeVarLength(deltaTime));

            if (event.type === 'note_on') {
                trackData.push(0x90 | channel);
                trackData.push(event.note);
                trackData.push(event.velocity);
            } else if (event.type === 'note_off') {
                trackData.push(0x80 | channel);
                trackData.push(event.note);
                trackData.push(event.velocity);
            }

            lastTick = event.tick;
        }

        // Événement meta : End of Track
        trackData.push(0); // Delta time 0
        trackData.push(0xFF); // Meta event
        trackData.push(0x2F); // End of track
        trackData.push(0x00); // Taille 0

        // Construire le chunk complet
        const bytes = [];
        bytes.push(...this.midiExporter.writeString('MTrk'));
        bytes.push(...this.midiExporter.writeUint32(trackData.length));
        bytes.push(...trackData);

        return bytes;
    }

    /**
     * Construit une piste MIDI de tempo/métadonnées globales (piste 0)
     * @param {Object} firstScoreData - Première partition (pour tempo/chiffrage)
     * @param {number} ppq - Pulses per quarter note
     * @returns {Array<number>} Bytes du track chunk
     */
    buildTempoTrack(firstScoreData, ppq) {
        const trackData = [];

        // Événement meta : Track Name
        trackData.push(0); // Delta time 0
        trackData.push(0xFF); // Meta event
        trackData.push(0x03); // Track name
        const titleBytes = this.midiExporter.writeString('Tempo Track');
        trackData.push(...this.midiExporter.writeVarLength(titleBytes.length));
        trackData.push(...titleBytes);

        // Set Tempo
        const microsecondsPerQuarter = Math.round(60000000 / firstScoreData.tempo);
        trackData.push(0); // Delta time 0
        trackData.push(0xFF); // Meta event
        trackData.push(0x51); // Set tempo
        trackData.push(0x03); // Taille (toujours 3 bytes)
        trackData.push((microsecondsPerQuarter >> 16) & 0xFF);
        trackData.push((microsecondsPerQuarter >> 8) & 0xFF);
        trackData.push(microsecondsPerQuarter & 0xFF);

        // Time Signature
        trackData.push(0); // Delta time 0
        trackData.push(0xFF); // Meta event
        trackData.push(0x58); // Time signature
        trackData.push(0x04); // Taille (toujours 4 bytes)
        trackData.push(firstScoreData.timeSignature.numerator);
        trackData.push(Math.log2(firstScoreData.timeSignature.denominator));
        trackData.push(24); // MIDI clocks per metronome click
        trackData.push(8); // 32nds per quarter note

        // End of Track
        trackData.push(0); // Delta time 0
        trackData.push(0xFF); // Meta event
        trackData.push(0x2F); // End of track
        trackData.push(0x00); // Taille 0

        // Construire le chunk complet
        const bytes = [];
        bytes.push(...this.midiExporter.writeString('MTrk'));
        bytes.push(...this.midiExporter.writeUint32(trackData.length));
        bytes.push(...trackData);

        return bytes;
    }

    /**
     * Exporte la collection complète en un seul fichier MIDI Format 1
     * @param {Object} multiScoreData - {globalTitle, scores: [{scoreData, instrument}, ...]}
     * @param {string} filename - Nom du fichier (sans extension)
     */
    export(multiScoreData, filename) {
        if (!multiScoreData || !multiScoreData.scores || multiScoreData.scores.length === 0) {
            throw new Error('Aucune partition à exporter');
        }

        const ppq = 480;
        const numTracks = multiScoreData.scores.length + 1; // +1 pour la piste de tempo

        const allBytes = [];

        // Header chunk (Format 1)
        allBytes.push(...this.buildHeaderChunk(numTracks, ppq));

        // Piste 0 : Tempo et métadonnées
        const firstScore = multiScoreData.scores[0].scoreData;
        allBytes.push(...this.buildTempoTrack(firstScore, ppq));

        // Pistes 1..N : Une piste par partition (canaux MIDI 0-15)
        for (let i = 0; i < multiScoreData.scores.length; i++) {
            const score = multiScoreData.scores[i];
            const channel = i % 16; // MIDI canaux 0-15 (on wrappe si > 16 pistes)
            allBytes.push(...this.buildTrackChunkForScore(score.scoreData, score.instrument, channel, ppq));
        }

        // Créer le Blob et télécharger
        const midiBytes = new Uint8Array(allBytes);
        const blob = new Blob([midiBytes], { type: 'audio/midi' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `${filename}.mid`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        URL.revokeObjectURL(url);
    }
}
```

**Tests** :

- Export avec 1 partition → Format 1, 2 pistes (tempo + 1 partition)
- Export avec 3 partitions → Format 1, 4 pistes (tempo + 3 partitions)
- Vérification des canaux MIDI distincts

**Commit message** :

```
feat(multi-midi): add MultiMidiExporter for Format 1 export

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

---

### Task 4 : Ajouter l'UI pour gérer plusieurs partitions (HTML)

**Objectif** : Interface pour ajouter/supprimer des partitions, liste des partitions actives.

**Fichier** : `index.html`

**Changements** :

1. Ajouter une section "Gestion des partitions" après la section de saisie :

```html
<!-- Zone de gestion des partitions -->
<section class="multi-score-section">
    <h2>Partitions de l'orchestre</h2>
    <div class="help-text">
        <strong>Multi-instruments :</strong> Ajoutez plusieurs partitions avec différents instruments pour créer un orchestre.
    </div>
    
    <div class="multi-score-controls">
        <input type="text" id="global-title-input" placeholder="Titre de l'orchestre" value="Mon Orchestre">
        <button id="btn-add-score" class="btn-primary">Ajouter la partition actuelle</button>
        <button id="btn-clear-all-scores" class="btn-secondary">Effacer toutes les partitions</button>
    </div>

    <div id="scores-list" class="scores-list">
        <p class="placeholder">Aucune partition ajoutée pour l'instant</p>
    </div>

    <div class="multi-export-actions">
        <button id="btn-export-individual" class="btn-secondary" disabled>
            💾 Exporter chaque partition (MIDI)
        </button>
        <button id="btn-export-multi" class="btn-secondary" disabled>
            🎼 Exporter l'orchestre complet (MIDI)
        </button>
    </div>
</section>
```

2. Ajouter les imports de scripts à la fin du `<body>` :

```html
<!-- Scripts -->
<script src="parser.js"></script>
<script src="renderer.js"></script>
<script src="midi-export.js"></script>
<script src="midi-audio-player.js"></script>
<script src="multi-score-manager.js"></script>
<script src="multi-midi-exporter.js"></script>
<script src="app.js"></script>
```

**Commit message** :

```
feat(ui): add multi-score management section to HTML

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

---

### Task 5 : Ajouter les styles CSS pour l'UI multi-partitions

**Objectif** : Styles pour la section de gestion des partitions.

**Fichier** : `styles.css`

**Changements** (ajouter à la fin du fichier) :

```css
/* === Multi-Score Section === */
.multi-score-section {
    background-color: white;
    padding: 2rem;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    margin-top: 2rem;
}

.multi-score-controls {
    display: flex;
    gap: 1rem;
    margin-bottom: 1rem;
    flex-wrap: wrap;
}

#global-title-input {
    flex: 1;
    min-width: 200px;
    padding: 0.75rem;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 1rem;
    font-family: inherit;
}

#global-title-input:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.scores-list {
    min-height: 100px;
    max-height: 400px;
    overflow-y: auto;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    padding: 1rem;
    margin-bottom: 1rem;
    background-color: #fafafa;
}

.score-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem;
    margin-bottom: 0.5rem;
    background-color: white;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    transition: all 0.2s;
}

.score-item:hover {
    border-color: #667eea;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.score-item-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}

.score-item-title {
    font-weight: bold;
    color: #333;
}

.score-item-instrument {
    font-size: 0.9rem;
    color: #666;
}

.score-item-actions {
    display: flex;
    gap: 0.5rem;
}

.btn-icon {
    padding: 0.5rem;
    background-color: transparent;
    border: 1px solid #ccc;
    border-radius: 4px;
    cursor: pointer;
    font-size: 1rem;
    transition: all 0.2s;
}

.btn-icon:hover {
    background-color: #f0f0f0;
    border-color: #999;
}

.btn-icon:active {
    transform: scale(0.95);
}

.btn-delete {
    color: #e74c3c;
}

.btn-delete:hover {
    background-color: #ffebee;
    border-color: #e74c3c;
}

.btn-export {
    color: #3498db;
}

.btn-export:hover {
    background-color: #e3f2fd;
    border-color: #3498db;
}

.multi-export-actions {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
}

.multi-export-actions button {
    flex: 1;
    min-width: 200px;
}

/* === Responsive === */
@media (max-width: 768px) {
    .multi-score-controls {
        flex-direction: column;
    }

    #global-title-input {
        width: 100%;
    }

    .score-item {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.5rem;
    }

    .score-item-actions {
        width: 100%;
        justify-content: flex-end;
    }

    .multi-export-actions {
        flex-direction: column;
    }

    .multi-export-actions button {
        width: 100%;
    }
}
```

**Commit message** :

```
style(multi-score): add CSS for multi-score management UI

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

---

### Task 6 : Intégrer la gestion multi-partitions dans app.js (partie 1 : initialisation)

**Objectif** : Initialiser le gestionnaire de partitions et câbler les événements de base.

**Fichier** : `app.js`

**Changements** :

1. Ajouter les instances globales en haut du fichier (après `currentScoreData`) :

```javascript
let multiScoreManager;
let multiMidiExporter;
```

2. Dans la fonction `init()`, après l'initialisation de `midiAudioPlayer` :

```javascript
// Crée les instances multi-partitions
multiScoreManager = new MultiScoreManager();
multiMidiExporter = new MultiMidiExporter(midiExporter);

// Récupère les éléments DOM pour multi-partitions
const globalTitleInput = document.getElementById('global-title-input');
const btnAddScore = document.getElementById('btn-add-score');
const btnClearAllScores = document.getElementById('btn-clear-all-scores');
const btnExportIndividual = document.getElementById('btn-export-individual');
const btnExportMulti = document.getElementById('btn-export-multi');
const scoresList = document.getElementById('scores-list');

// Attache les événements
btnAddScore.addEventListener('click', handleAddScore);
btnClearAllScores.addEventListener('click', handleClearAllScores);
btnExportIndividual.addEventListener('click', handleExportIndividual);
btnExportMulti.addEventListener('click', handleExportMulti);

globalTitleInput.addEventListener('input', (e) => {
    multiScoreManager.setGlobalTitle(e.target.value);
});
```

**Commit message** :

```
feat(app): initialize MultiScoreManager and wire basic events

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

---

### Task 7 : Intégrer la gestion multi-partitions dans app.js (partie 2 : ajout/suppression)

**Objectif** : Implémenter l'ajout et la suppression de partitions dans la collection.

**Fichier** : `app.js`

**Changements** (ajouter ces fonctions à la fin du fichier, avant `document.addEventListener('DOMContentLoaded', init);`) :

```javascript
/**
 * Gère le clic sur "Ajouter la partition actuelle"
 */
function handleAddScore() {
    const errorDiv = document.getElementById('error-message');

    if (!currentScoreData) {
        errorDiv.textContent = '❌ Veuillez d\'abord générer une partition';
        errorDiv.style.display = 'block';
        errorDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        return;
    }

    try {
        errorDiv.style.display = 'none';

        // Ajoute la partition à la collection
        const id = multiScoreManager.addScore(currentScoreData);
        console.log('✅ Partition ajoutée:', id);

        // Rafraîchit l'affichage
        refreshScoresList();

        // Active les boutons d'export multi-partitions
        updateMultiExportButtons();

    } catch (error) {
        console.error('❌ Erreur ajout partition:', error.message);
        errorDiv.textContent = '❌ ' + error.message;
        errorDiv.style.display = 'block';
        errorDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

/**
 * Gère le clic sur "Effacer toutes les partitions"
 */
function handleClearAllScores() {
    if (multiScoreManager.isEmpty()) {
        return;
    }

    if (!confirm('Voulez-vous vraiment effacer toutes les partitions de l\'orchestre ?')) {
        return;
    }

    multiScoreManager.clear();
    refreshScoresList();
    updateMultiExportButtons();
}

/**
 * Gère la suppression d'une partition individuelle
 * @param {number} id - ID de la partition
 */
function handleRemoveScore(id) {
    if (!confirm('Voulez-vous vraiment supprimer cette partition ?')) {
        return;
    }

    multiScoreManager.removeScore(id);
    refreshScoresList();
    updateMultiExportButtons();
}

/**
 * Rafraîchit l'affichage de la liste des partitions
 */
function refreshScoresList() {
    const scoresList = document.getElementById('scores-list');
    scoresList.textContent = '';

    if (multiScoreManager.isEmpty()) {
        const placeholder = document.createElement('p');
        placeholder.className = 'placeholder';
        placeholder.textContent = 'Aucune partition ajoutée pour l\'instant';
        scoresList.appendChild(placeholder);
        return;
    }

    const scores = multiScoreManager.getAllScores();

    for (const score of scores) {
        const item = document.createElement('div');
        item.className = 'score-item';
        item.dataset.id = score.id;

        const info = document.createElement('div');
        info.className = 'score-item-info';

        const title = document.createElement('div');
        title.className = 'score-item-title';
        title.textContent = score.scoreData.title || 'Sans titre';

        const instrumentName = INSTRUMENTS[score.instrument]?.name || score.instrument || 'Piano';
        const instrumentEmoji = INSTRUMENTS[score.instrument]?.emoji || '🎹';
        const instrumentDiv = document.createElement('div');
        instrumentDiv.className = 'score-item-instrument';
        instrumentDiv.textContent = `${instrumentEmoji} ${instrumentName}`;

        info.appendChild(title);
        info.appendChild(instrumentDiv);

        const actions = document.createElement('div');
        actions.className = 'score-item-actions';

        const btnExport = document.createElement('button');
        btnExport.className = 'btn-icon btn-export';
        btnExport.textContent = '💾';
        btnExport.title = 'Exporter cette partition en MIDI';
        btnExport.addEventListener('click', () => handleExportSingleScore(score.id));

        const btnDelete = document.createElement('button');
        btnDelete.className = 'btn-icon btn-delete';
        btnDelete.textContent = '🗑️';
        btnDelete.title = 'Supprimer cette partition';
        btnDelete.addEventListener('click', () => handleRemoveScore(score.id));

        actions.appendChild(btnExport);
        actions.appendChild(btnDelete);

        item.appendChild(info);
        item.appendChild(actions);

        scoresList.appendChild(item);
    }
}

/**
 * Met à jour l'état des boutons d'export multi-partitions
 */
function updateMultiExportButtons() {
    const btnExportIndividual = document.getElementById('btn-export-individual');
    const btnExportMulti = document.getElementById('btn-export-multi');

    const enabled = !multiScoreManager.isEmpty();

    if (btnExportIndividual) {
        btnExportIndividual.disabled = !enabled;
    }
    if (btnExportMulti) {
        btnExportMulti.disabled = !enabled;
    }
}
```

**Commit message** :

```
feat(app): implement add/remove score operations

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

---

### Task 8 : Intégrer la gestion multi-partitions dans app.js (partie 3 : exports)

**Objectif** : Implémenter les exports MIDI individuels et global.

**Fichier** : `app.js`

**Changements** (ajouter ces fonctions à la fin du fichier, avant `document.addEventListener('DOMContentLoaded', init);`) :

```javascript
/**
 * Gère l'export MIDI d'une seule partition
 * @param {number} id - ID de la partition
 */
function handleExportSingleScore(id) {
    const errorDiv = document.getElementById('error-message');

    const score = multiScoreManager.getScore(id);
    if (!score) {
        errorDiv.textContent = '❌ Partition non trouvée';
        errorDiv.style.display = 'block';
        errorDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        return;
    }

    try {
        errorDiv.style.display = 'none';

        let filename = 'partition';

        if (score.scoreData.title && score.scoreData.title.trim()) {
            filename = score.scoreData.title.trim()
                .toLowerCase()
                .normalize('NFD').replace(/[̀-ͯ]/g, '')
                .replace(/[^a-z0-9\s-]/g, '')
                .replace(/\s+/g, '-')
                .replace(/-+/g, '-');
        }

        const program = INSTRUMENTS[score.instrument]?.program || 0;
        midiExporter.export(score.scoreData, filename, program);

        console.log('✅ Export MIDI individuel réussi:', filename);

    } catch (error) {
        console.error('❌ Erreur export individuel:', error.message);
        errorDiv.textContent = '❌ ' + error.message;
        errorDiv.style.display = 'block';
        errorDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

/**
 * Gère l'export MIDI individuel de toutes les partitions
 */
function handleExportIndividual() {
    const errorDiv = document.getElementById('error-message');

    if (multiScoreManager.isEmpty()) {
        errorDiv.textContent = '❌ Aucune partition à exporter';
        errorDiv.style.display = 'block';
        errorDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        return;
    }

    try {
        errorDiv.style.display = 'none';

        const scores = multiScoreManager.getAllScores();

        for (const score of scores) {
            let filename = 'partition';

            if (score.scoreData.title && score.scoreData.title.trim()) {
                filename = score.scoreData.title.trim()
                    .toLowerCase()
                    .normalize('NFD').replace(/[̀-ͯ]/g, '')
                    .replace(/[^a-z0-9\s-]/g, '')
                    .replace(/\s+/g, '-')
                    .replace(/-+/g, '-');
            }

            const program = INSTRUMENTS[score.instrument]?.program || 0;
            midiExporter.export(score.scoreData, filename, program);
        }

        console.log(`✅ ${scores.length} fichiers MIDI exportés individuellement`);

    } catch (error) {
        console.error('❌ Erreur export individuel:', error.message);
        errorDiv.textContent = '❌ ' + error.message;
        errorDiv.style.display = 'block';
        errorDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

/**
 * Gère l'export MIDI global (multi-pistes)
 */
function handleExportMulti() {
    const errorDiv = document.getElementById('error-message');

    if (multiScoreManager.isEmpty()) {
        errorDiv.textContent = '❌ Aucune partition à exporter';
        errorDiv.style.display = 'block';
        errorDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        return;
    }

    try {
        errorDiv.style.display = 'none';

        const multiScoreData = multiScoreManager.exportForMidi();

        let filename = 'orchestre';

        if (multiScoreData.globalTitle && multiScoreData.globalTitle.trim()) {
            filename = multiScoreData.globalTitle.trim()
                .toLowerCase()
                .normalize('NFD').replace(/[̀-ͯ]/g, '')
                .replace(/[^a-z0-9\s-]/g, '')
                .replace(/\s+/g, '-')
                .replace(/-+/g, '-');
        }

        multiMidiExporter.export(multiScoreData, filename);

        console.log('✅ Export MIDI multi-pistes réussi:', filename);

    } catch (error) {
        console.error('❌ Erreur export multi-pistes:', error.message);
        errorDiv.textContent = '❌ ' + error.message;
        errorDiv.style.display = 'block';
        errorDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}
```

**Commit message** :

```
feat(app): implement individual and multi-track MIDI exports

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

---

### Task 9 : Mettre à jour CLAUDE.md avec la documentation multi-instruments

**Objectif** : Documenter la nouvelle fonctionnalité dans le fichier de documentation du projet.

**Fichier** : `CLAUDE.md`

**Changements** :

1. Ajouter une section après "## 🎼 Format de notation" :

```markdown
### Instrument (ligne 5 optionnelle)

L'application supporte maintenant la définition d'un instrument par partition :

```
Titre de la partition
120
4/4
sol
violon              # NOUVEAU : ligne 5 optionnelle
Do Re Mi Fa Sol
```

Si la ligne 5 n'est pas reconnue comme un instrument, elle est traitée comme la première ligne de notes (backward compatible).

**Instruments reconnus** :
- `piano` → Piano 🎹 (MIDI program 0)
- `guitare` → Guitare 🎸 (MIDI program 24)
- `violon` → Violon 🎻 (MIDI program 40)
- `flute` → Flûte 🪈 (MIDI program 73)
- `accordeon` → Accordéon 🪗 (MIDI program 21)
- `contrebasse` → Contrebasse 🎼 (MIDI program 43)
- `hautbois` → Hautbois 🎼 (MIDI program 68)
- `trompette` → Trompette 🎺 (MIDI program 56)
```

2. Ajouter une section après "## 🏗️ Modules principaux" :

```markdown
### `multi-score-manager.js` - Gestionnaire de partitions multiples

**Classe** : `MultiScoreManager`

**Responsabilité** : Gérer une collection de partitions pour créer un orchestre multi-instruments.

**Méthodes principales** :
- `addScore(scoreData)` → number (ID de la partition ajoutée)
- `removeScore(id)` → boolean
- `getScore(id)` → Object | null
- `getAllScores()` → Array
- `getCount()` → number
- `isEmpty()` → boolean
- `clear()` → void
- `updateInstrument(id, instrument)` → boolean
- `exportForMidi()` → Object (structure pour export MIDI)

**Structure de données** :

```javascript
{
  scores: [
    {
      id: 1,
      scoreData: {...},  // Données parsées
      instrument: 'violon'
    },
    ...
  ],
  globalTitle: 'Mon Orchestre'
}
```

### `multi-midi-exporter.js` - Exportateur MIDI multi-pistes

**Classe** : `MultiMidiExporter`

**Responsabilité** : Exporter plusieurs partitions en un seul fichier MIDI Format 1 (multi-pistes).

**Méthodes principales** :
- `buildHeaderChunk(numTracks, ppq)` → Array (bytes du header Format 1)
- `buildTempoTrack(firstScoreData, ppq)` → Array (piste 0 : tempo/métadonnées)
- `buildTrackChunkForScore(scoreData, instrument, channel, ppq)` → Array (piste N)
- `export(multiScoreData, filename)` → void (génère et télécharge)

**Format MIDI** :
- **Format 1** : Multi-pistes (1 piste par partition + 1 piste de tempo)
- **Piste 0** : Métadonnées (tempo, time signature)
- **Pistes 1..N** : Une partition par piste, avec son instrument (Program Change)
- **Canaux MIDI** : 0-15 (wrappe si > 16 pistes)
```

3. Ajouter une section après "## 🎹 Export MIDI" :

```markdown
## 🎼 Orchestres multi-instruments

L'application permet de créer des orchestres en combinant plusieurs partitions avec différents instruments.

### Fonctionnement

1. **Ajouter des partitions** :
   - Saisissez une partition avec un instrument en ligne 5
   - Cliquez sur "Générer la partition"
   - Cliquez sur "Ajouter la partition actuelle"
   - Répétez pour chaque instrument

2. **Gérer les partitions** :
   - Liste des partitions actives avec titre et instrument
   - Suppression individuelle (🗑️)
   - Export individuel (💾) d'une partition en MIDI

3. **Export MIDI** :
   - **Export individuel** : Génère un fichier MIDI par partition (Format 0, mono-piste)
   - **Export global** : Génère un seul fichier MIDI multi-pistes (Format 1) avec toutes les partitions

### Structure MIDI Format 1

```
Fichier MIDI multi-pistes :
├── Header (MThd) : Format 1, N+1 pistes
├── Piste 0 : Tempo Track (métadonnées globales)
│   ├── Track Name : "Tempo Track"
│   ├── Set Tempo : 120 BPM
│   └── Time Signature : 4/4
├── Piste 1 : Violon (canal MIDI 0)
│   ├── Track Name : "Violon principal"
│   ├── Program Change : 40 (violon)
│   └── Note events...
├── Piste 2 : Piano (canal MIDI 1)
│   ├── Track Name : "Piano accompagnement"
│   ├── Program Change : 0 (piano)
│   └── Note events...
└── ...
```

### Exemple d'utilisation

**Partition 1 (Violon)** :
```
Mélodie violon
120
4/4
sol
violon
Do Re Mi Fa Sol La Si Do+
```

**Partition 2 (Piano)** :
```
Accompagnement piano
120
4/4
sol
piano
DoMiSol2 FaLaDo2
```

→ **Résultat** : Fichier MIDI avec 2 pistes synchronisées
```

4. Modifier la section "## 🐛 Bugs connus / Limitations" :

```markdown
## 🐛 Bugs connus / Limitations

- ✅ ~~Do et Ré médiums mal positionnés~~ → Corrigé
- ✅ ~~Clef de fa mal centrée~~ → Corrigé
- ✅ ~~"Sol" détecté comme silence~~ → Corrigé
- ✅ ~~Bémols non reconnus (Mib)~~ → Corrigé
- ⚠️ Barres de mesure : calculées sur 4 temps fixes (ne s'adapte pas au chiffrage)
- ⚠️ Pas de validation de la cohérence des mesures (sous-remplies ou sur-remplies)
- ⚠️ Pas de support multi-voix sur une même portée
- ✅ ~~Pas d'export PNG~~ → Implémenté
- ✅ ~~Pas d'export MIDI~~ → Implémenté
- ✅ ~~Lecture MIDI : problème de support navigateur (Chrome)~~ → Corrigé via Web Audio API
- ⚠️ Lecture MIDI : son synthétique (oscillateurs simples), pas de son réaliste
- ⚠️ Lecture MIDI : la sélection d'instrument n'affecte PAS le bouton "Lire la partition" (son synthétique uniforme), seulement l'export MIDI
- ✅ ~~Pas de support multi-instruments~~ → Implémenté (Format 1 multi-pistes)
- ⚠️ Export multi-pistes : limite de 16 canaux MIDI (wrappe si > 16 pistes)
- ⚠️ Export multi-pistes : toutes les pistes doivent avoir le même tempo et chiffrage (utilise ceux de la première partition)
- ⚠️ Pas d'export PDF pour l'instant (nécessite une bibliothèque externe)
```

**Commit message** :

```
docs(claude): document multi-instrument orchestration feature

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

---

### Task 10 : Tests end-to-end et vérification finale

**Objectif** : Tester manuellement toutes les fonctionnalités et corriger les bugs éventuels.

**Tests à effectuer** :

1. **Backward compatibility** :
   - Partition sans instrument (5 lignes) → doit fonctionner normalement
   - Export MIDI simple → doit fonctionner avec instrument par défaut (piano)

2. **Instrument parsing** :
   - Partition avec instrument en ligne 5 → instrument reconnu
   - Partition avec ligne 5 = note (pas instrument) → ligne 5 traitée comme notes

3. **Multi-partitions** :
   - Ajouter 3 partitions avec instruments différents → liste affichée correctement
   - Supprimer une partition → disparaît de la liste
   - Effacer toutes les partitions → liste vide

4. **Export MIDI individuel** :
   - Export d'une seule partition (icône 💾) → fichier MIDI Format 0 avec bon instrument
   - Export de toutes les partitions (bouton "Exporter chaque partition") → N fichiers MIDI générés

5. **Export MIDI global** :
   - Export multi-pistes (bouton "Exporter l'orchestre complet") → fichier MIDI Format 1
   - Ouvrir le fichier dans un DAW (GarageBand, Logic, etc.) → vérifier les pistes et instruments

6. **Edge cases** :
   - Tenter d'ajouter une partition sans avoir généré → message d'erreur approprié
   - Tenter d'exporter sans partitions → message d'erreur approprié
   - Plus de 16 partitions → vérifier que les canaux MIDI wrappent correctement

**Fichiers à vérifier** :

- `parser.js` : instrument parsing
- `multi-score-manager.js` : gestion de collection
- `multi-midi-exporter.js` : export Format 1
- `app.js` : orchestration
- `index.html` : UI complète
- `styles.css` : styles appliqués

**Corrections à apporter** :

- Si bugs détectés : les corriger immédiatement
- Si comportement inattendu : ajouter des logs de debug

**Commit message** :

```
test: verify multi-instrument features end-to-end

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

---

## Points d'attention

### Compatibilité ascendante

- Les partitions existantes (5 lignes, sans instrument) doivent continuer à fonctionner
- L'instrument par défaut est `piano` si non spécifié

### Limitations MIDI

- **16 canaux maximum** : Si > 16 pistes, les canaux wrappent (modulo 16)
- **Tempo/chiffrage unique** : Toutes les pistes utilisent le tempo et chiffrage de la première partition
- **Pas de nuances** : Velocity fixe à 80 pour toutes les notes

### Performance

- L'ajout de partitions est instantané (pas de copie profonde)
- L'export multi-pistes peut être lent si beaucoup de notes (> 1000 notes totales)

### Sécurité

- Validation de l'instrument dans le parser (liste blanche)
- Validation de `scoreData` avant ajout à la collection
- Nettoyage DOM sécurisé (pas d'innerHTML)

---

## Tests de régression

Après implémentation complète, vérifier que :

1. ✅ L'export PNG fonctionne toujours
2. ✅ L'export MIDI simple (modale instrument) fonctionne toujours
3. ✅ La lecture MIDI (Web Audio API) fonctionne toujours
4. ✅ Le rendu graphique (Canvas) fonctionne toujours
5. ✅ Le parsing de notes/accords/silences fonctionne toujours

---

## Améliorations futures (hors scope de ce plan)

- Édition d'une partition après ajout (renommer, changer d'instrument)
- Réordonnancement des partitions (drag & drop)
- Visualisation simultanée de plusieurs portées
- Support de tempos/chiffrages différents par piste
- Export PDF multi-portées
- Import de fichiers MIDI existants

---

**Fin du plan. Total : 10 tasks.**
