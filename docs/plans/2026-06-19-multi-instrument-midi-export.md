# Plan d'implémentation : Export MIDI polyphonique multi-instruments

> Pour agentic workers: implémentez ce plan task-by-task avec
> red-green-refactor discipline. One task, one commit. Never
> batch.

**Date :** 2026-06-19  
**Feature :** Permettre la sélection de plusieurs instruments pour générer un fichier MIDI polyphonique (Format 1 avec pistes multiples)

## 🎯 Objectif

Actuellement, l'application permet de sélectionner un seul instrument pour l'export MIDI. L'objectif est de :
1. Permettre la sélection multiple d'instruments dans la modale
2. Générer un fichier MIDI au format SMF Format 1 (multi-pistes)
3. Créer une piste MIDI par instrument sélectionné
4. Chaque piste contient les mêmes notes mais avec son propre Program Change

## 📋 Modifications nécessaires

### Fichiers à modifier
- `index.html` - Modifier la modale pour permettre la sélection multiple
- `styles.css` - Ajouter les styles pour la sélection multiple
- `midi-export.js` - Ajouter support Format 1 avec multi-pistes
- `app.js` - Gérer la sélection multiple et passer un tableau d'instruments

### Nouveaux concepts
- **MIDI Format 1** : Plusieurs pistes synchronisées (vs Format 0 = piste unique)
- **Piste par instrument** : Chaque instrument a sa propre piste avec Program Change
- **Sélection multiple** : Interface utilisateur avec checkboxes
- **Validation** : S'assurer qu'au moins un instrument est sélectionné

---

## 📝 Tasks

### Task 1 : Modifier la modale HTML pour supporter la sélection multiple

**Fichier :** `index.html`

**Description :** Ajouter un bouton "Valider" dans la modale et préparer l'interface pour les checkboxes (au lieu de boutons cliquables).

**Changements :**

```html
<!-- Modale de sélection d'instrument -->
<div id="instrument-modal" class="modal-overlay" style="display: none;">
    <div class="modal-content">
        <h2>Choisissez un ou plusieurs instruments</h2>
        <p class="modal-subtitle">Sélectionnez les instruments pour créer un fichier MIDI polyphonique</p>
        <div id="instrument-grid" class="instrument-grid">
        </div>
        <div class="modal-actions">
            <button id="btn-validate-instruments" class="btn-primary">
                ✅ Valider la sélection
            </button>
            <button id="btn-cancel-instrument" class="btn-secondary">
                Annuler
            </button>
        </div>
    </div>
</div>
```

**Tests de validation :**
- Ouvrir `index.html` dans un navigateur
- Vérifier que la modale contient maintenant un bouton "Valider la sélection"
- Vérifier que le texte "Choisissez un ou plusieurs instruments" est présent

**Commit :** `feat(ui): add validation button to instrument modal for multi-selection`

---

### Task 2 : Ajouter les styles CSS pour la sélection multiple

**Fichier :** `styles.css`

**Description :** Ajouter les styles pour les checkboxes d'instruments et améliorer la mise en page de la modale.

**Changements à ajouter à la fin du fichier :**

```css
/* Modale : sous-titre */
.modal-subtitle {
    color: #666;
    font-size: 0.9rem;
    margin-bottom: 1.5rem;
    text-align: center;
}

/* Modale : actions (boutons) */
.modal-actions {
    display: flex;
    gap: 10px;
    margin-top: 1.5rem;
    justify-content: center;
}

/* Bouton d'instrument avec checkbox */
.instrument-button {
    position: relative;
    border: 2px solid #ddd;
    background: white;
    cursor: pointer;
    transition: all 0.2s;
}

.instrument-button.selected {
    border-color: #667eea;
    background: #f0f4ff;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.instrument-button .checkbox-indicator {
    position: absolute;
    top: 8px;
    right: 8px;
    width: 20px;
    height: 20px;
    border: 2px solid #ddd;
    border-radius: 4px;
    background: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
}

.instrument-button.selected .checkbox-indicator {
    background: #667eea;
    border-color: #667eea;
    color: white;
}
```

**Tests de validation :**
- Ouvrir l'application et cliquer sur "Exporter en MIDI"
- Vérifier que les boutons d'instruments ont maintenant un indicateur de checkbox en haut à droite
- Cliquer sur un instrument → vérifier que le style "selected" s'applique (bordure bleue + fond clair)

**Commit :** `style(ui): add styles for multi-select instrument modal with checkboxes`

---

### Task 3 : Modifier l'interface JavaScript pour gérer la sélection multiple

**Fichier :** `app.js`

**Description :** Remplacer le clic direct par un système de sélection multiple avec validation.

**Changements dans `app.js` :**

1. Ajouter une variable globale pour stocker la sélection :

```javascript
// Ajout après currentScoreData
let selectedInstruments = new Set(); // Stocke les clés des instruments sélectionnés
```

2. Modifier `showInstrumentModal()` pour créer des boutons avec checkboxes :

```javascript
function showInstrumentModal() {
    const modal = document.getElementById('instrument-modal');
    const grid = document.getElementById('instrument-grid');

    grid.textContent = '';
    selectedInstruments.clear(); // Réinitialise la sélection

    for (const [key, data] of Object.entries(INSTRUMENTS)) {
        const button = document.createElement('button');
        button.className = 'instrument-button';
        button.dataset.instrument = key;
        
        // Indicateur de checkbox
        const checkbox = document.createElement('div');
        checkbox.className = 'checkbox-indicator';
        checkbox.textContent = '';
        button.appendChild(checkbox);
        
        const emojiSpan = document.createElement('span');
        emojiSpan.textContent = data.emoji;
        const nameSpan = document.createElement('span');
        nameSpan.textContent = data.name;
        button.appendChild(emojiSpan);
        button.appendChild(document.createElement('br'));
        button.appendChild(nameSpan);
        
        // Gère le toggle de sélection
        button.addEventListener('click', () => toggleInstrumentSelection(key, button, checkbox));
        
        grid.appendChild(button);
    }

    modal.style.display = 'flex';

    const firstButton = grid.querySelector('.instrument-button');
    if (firstButton) {
        firstButton.focus();
    }
}
```

3. Ajouter la fonction `toggleInstrumentSelection()` :

```javascript
/**
 * Gère le toggle d'un instrument dans la sélection multiple
 * @param {string} instrumentKey - Clé de l'instrument
 * @param {HTMLElement} button - Bouton cliqué
 * @param {HTMLElement} checkbox - Élément checkbox indicator
 */
function toggleInstrumentSelection(instrumentKey, button, checkbox) {
    if (selectedInstruments.has(instrumentKey)) {
        selectedInstruments.delete(instrumentKey);
        button.classList.remove('selected');
        checkbox.textContent = '';
    } else {
        selectedInstruments.add(instrumentKey);
        button.classList.add('selected');
        checkbox.textContent = '✓';
    }
}
```

4. Modifier l'initialisation dans `init()` pour ajouter l'événement sur le bouton de validation :

```javascript
// Dans init(), après la récupération des éléments :
const btnValidateInstruments = document.getElementById('btn-validate-instruments');

// Après les autres addEventListener :
btnValidateInstruments.addEventListener('click', handleValidateInstruments);
```

5. Ajouter la fonction `handleValidateInstruments()` :

```javascript
/**
 * Gère la validation de la sélection multiple d'instruments
 */
function handleValidateInstruments() {
    const errorDiv = document.getElementById('error-message');

    if (selectedInstruments.size === 0) {
        errorDiv.textContent = '❌ Veuillez sélectionner au moins un instrument';
        errorDiv.style.display = 'block';
        errorDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        return;
    }

    closeInstrumentModal();

    if (!currentScoreData) {
        errorDiv.textContent = '❌ Veuillez d\'abord générer une partition';
        errorDiv.style.display = 'block';
        errorDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        return;
    }

    try {
        errorDiv.style.display = 'none';

        let filename = 'partition';

        if (currentScoreData.title && currentScoreData.title.trim()) {
            filename = currentScoreData.title.trim()
                .toLowerCase()
                .normalize('NFD').replace(/[̀-ͯ]/g, '')
                .replace(/[^a-z0-9\s-]/g, '')
                .replace(/\s+/g, '-')
                .replace(/-+/g, '-');
        }

        // Convertit le Set en tableau de configurations d'instruments
        const instrumentConfigs = Array.from(selectedInstruments).map(key => INSTRUMENTS[key]);

        midiExporter.exportMultiTrack(currentScoreData, filename, instrumentConfigs);

    } catch (error) {
        errorDiv.textContent = '❌ Erreur lors de l\'export MIDI: ' + error.message;
        errorDiv.style.display = 'block';
        errorDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}
```

6. Supprimer ou commenter l'ancienne fonction `handleInstrumentSelection()` (elle n'est plus utilisée).

**Tests de validation :**
- Générer une partition
- Cliquer sur "Exporter en MIDI"
- Cliquer sur plusieurs instruments → vérifier que les checkboxes s'activent/désactivent
- Cliquer sur "Valider la sélection" sans sélection → vérifier l'erreur "au moins un instrument"
- Sélectionner 2-3 instruments → cliquer "Valider" → vérifier qu'une erreur claire apparaît (car `exportMultiTrack()` n'existe pas encore)

**Commit :** `feat(ui): implement multi-select instrument interface with validation`

---

### Task 4 : Implémenter la génération MIDI Format 1 (multi-pistes)

**Fichier :** `midi-export.js`

**Description :** Ajouter la méthode `exportMultiTrack()` qui génère un fichier MIDI Format 1 avec une piste par instrument.

**Changements dans `midi-export.js` :**

1. Modifier la méthode `buildHeaderChunk()` pour accepter le format et le nombre de pistes :

```javascript
/**
 * Construit le chunk header MIDI (MThd)
 * @param {number} format - Format MIDI (0 = single track, 1 = multi-track)
 * @param {number} numTracks - Nombre de pistes
 * @param {number} ppq - Pulses per quarter note
 * @returns {Array<number>} Bytes du header chunk
 */
buildHeaderChunk(format, numTracks, ppq) {
    const bytes = [];

    // "MThd" (4 bytes)
    bytes.push(...this.writeString('MThd'));

    // Taille du header (toujours 6 bytes)
    bytes.push(...this.writeUint32(6));

    // Format (0 ou 1)
    bytes.push(...this.writeUint16(format));

    // Nombre de pistes
    bytes.push(...this.writeUint16(numTracks));

    // Division temporelle (ticks per quarter note)
    bytes.push(...this.writeUint16(ppq));

    return bytes;
}
```

2. Modifier `buildTrackChunk()` pour accepter un canal MIDI :

```javascript
/**
 * Construit le chunk track MIDI (MTrk)
 * @param {Object} scoreData - Données de partition
 * @param {Array} events - Événements MIDI générés
 * @param {number} program - Numéro de programme MIDI (0-127)
 * @param {number} channel - Canal MIDI (0-15)
 * @param {string} trackName - Nom de la piste (optionnel)
 * @returns {Array<number>} Bytes du track chunk
 */
buildTrackChunk(scoreData, events, program = 0, channel = 0, trackName = null) {
    const trackData = [];
    let lastTick = 0;

    // Événement meta : Track Name
    const name = trackName || scoreData.title;
    if (name) {
        trackData.push(0); // Delta time 0
        trackData.push(0xFF); // Meta event
        trackData.push(0x03); // Track name
        const nameBytes = this.writeString(name);
        trackData.push(...this.writeVarLength(nameBytes.length));
        trackData.push(...nameBytes);
    }

    // Événement meta : Set Tempo (uniquement sur la première piste)
    if (channel === 0) {
        if (!scoreData.tempo || scoreData.tempo <= 0) {
            throw new Error(`Invalid tempo: ${scoreData.tempo}. Must be a positive number.`);
        }
        const microsecondsPerQuarter = Math.round(60000000 / scoreData.tempo);
        trackData.push(0); // Delta time 0
        trackData.push(0xFF); // Meta event
        trackData.push(0x51); // Set tempo
        trackData.push(0x03); // Taille (toujours 3 bytes)
        trackData.push((microsecondsPerQuarter >> 16) & 0xFF);
        trackData.push((microsecondsPerQuarter >> 8) & 0xFF);
        trackData.push(microsecondsPerQuarter & 0xFF);

        // Événement meta : Time Signature (uniquement sur la première piste)
        if (!scoreData.timeSignature) {
            throw new Error('Missing timeSignature in scoreData');
        }
        trackData.push(0); // Delta time 0
        trackData.push(0xFF); // Meta event
        trackData.push(0x58); // Time signature
        trackData.push(0x04); // Taille (toujours 4 bytes)
        trackData.push(scoreData.timeSignature.numerator);
        trackData.push(Math.log2(scoreData.timeSignature.denominator));
        trackData.push(24); // MIDI clocks per metronome click
        trackData.push(8); // 32nds per quarter note
    }

    // Événement MIDI : Program Change (0xC0)
    trackData.push(0); // Delta time 0
    trackData.push(0xC0 | channel); // Program Change sur le canal spécifié
    trackData.push(program); // Numéro de programme MIDI (0-127)

    // Événements MIDI (note on/off) avec le canal spécifié
    for (const event of events) {
        const deltaTime = event.tick - lastTick;
        trackData.push(...this.writeVarLength(deltaTime));

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
    bytes.push(...this.writeString('MTrk'));
    bytes.push(...this.writeUint32(trackData.length));
    bytes.push(...trackData);

    return bytes;
}
```

3. Mettre à jour les méthodes existantes pour utiliser les nouvelles signatures :

```javascript
/**
 * Génère un Blob MIDI en mémoire (sans téléchargement) - Format 0 single track
 * @param {Object} scoreData - Données de partition parsées
 * @param {number} program - Numéro de programme MIDI (0-127)
 * @returns {Blob} Blob MIDI de type 'audio/midi'
 */
generateMidiFile(scoreData, program = 0) {
    const ppq = 480;

    const events = this.generateMidiEvents(scoreData);

    const headerBytes = this.buildHeaderChunk(0, 1, ppq); // Format 0, 1 piste
    const trackBytes = this.buildTrackChunk(scoreData, events, program, 0, null);

    const midiBytes = new Uint8Array([...headerBytes, ...trackBytes]);

    return new Blob([midiBytes], { type: 'audio/midi' });
}

/**
 * Exporte la partition en fichier MIDI et déclenche le téléchargement - Format 0 single track
 * @param {Object} scoreData - Données de partition parsées
 * @param {string} filename - Nom du fichier (sans extension)
 * @param {number} program - Numéro de programme MIDI (0-127)
 */
export(scoreData, filename, program = 0) {
    const ppq = 480;

    const events = this.generateMidiEvents(scoreData);

    const headerBytes = this.buildHeaderChunk(0, 1, ppq); // Format 0, 1 piste
    const trackBytes = this.buildTrackChunk(scoreData, events, program, 0, null);

    const midiBytes = new Uint8Array([...headerBytes, ...trackBytes]);

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
```

4. Ajouter la nouvelle méthode `exportMultiTrack()` :

```javascript
/**
 * Exporte la partition en fichier MIDI multi-pistes (Format 1)
 * Chaque instrument sélectionné génère une piste avec les mêmes notes
 * @param {Object} scoreData - Données de partition parsées
 * @param {string} filename - Nom du fichier (sans extension)
 * @param {Array<Object>} instruments - Tableau d'objets {name, program, emoji}
 */
exportMultiTrack(scoreData, filename, instruments) {
    if (!instruments || instruments.length === 0) {
        throw new Error('Au moins un instrument doit être sélectionné');
    }

    if (instruments.length > 16) {
        throw new Error('Maximum 16 instruments (limitation MIDI : 16 canaux)');
    }

    const ppq = 480;

    // Générer les événements MIDI (identiques pour toutes les pistes)
    const events = this.generateMidiEvents(scoreData);

    // Header : Format 1, nombre de pistes = nombre d'instruments
    const headerBytes = this.buildHeaderChunk(1, instruments.length, ppq);

    const allTrackBytes = [];

    // Créer une piste pour chaque instrument
    for (let i = 0; i < instruments.length; i++) {
        const instrument = instruments[i];
        const channel = i; // Canal MIDI (0-15)
        const trackName = `${instrument.name} - ${scoreData.title || 'Partition'}`;

        const trackBytes = this.buildTrackChunk(
            scoreData,
            events,
            instrument.program,
            channel,
            trackName
        );

        allTrackBytes.push(...trackBytes);
    }

    // Combiner header + toutes les pistes
    const midiBytes = new Uint8Array([...headerBytes, ...allTrackBytes]);

    // Télécharger le fichier
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
```

**Tests de validation :**
- Générer une partition
- Cliquer sur "Exporter en MIDI"
- Sélectionner 1 seul instrument → valider → téléchargement doit fonctionner
- Sélectionner 3 instruments (ex: Piano, Guitare, Violon) → valider → téléchargement doit fonctionner
- Ouvrir le fichier MIDI téléchargé dans un lecteur MIDI (VLC, MuseScore) → vérifier que les 3 pistes sont présentes
- Vérifier que chaque piste a le bon instrument (son différent)

**Commit :** `feat(midi): implement Format 1 multi-track MIDI export with multiple instruments`

---

### Task 5 : Ajouter la validation et les messages d'erreur explicites

**Fichier :** `app.js`

**Description :** Améliorer l'expérience utilisateur avec des messages d'erreur clairs et des validations.

**Changements dans `handleValidateInstruments()` :**

```javascript
/**
 * Gère la validation de la sélection multiple d'instruments
 */
function handleValidateInstruments() {
    const errorDiv = document.getElementById('error-message');

    // Validation : au moins un instrument sélectionné
    if (selectedInstruments.size === 0) {
        alert('⚠️ Veuillez sélectionner au moins un instrument');
        return;
    }

    // Validation : maximum 16 instruments (limitation MIDI)
    if (selectedInstruments.size > 16) {
        alert('⚠️ Maximum 16 instruments (limitation du format MIDI)');
        return;
    }

    closeInstrumentModal();

    if (!currentScoreData) {
        errorDiv.textContent = '❌ Veuillez d\'abord générer une partition';
        errorDiv.style.display = 'block';
        errorDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        return;
    }

    try {
        errorDiv.style.display = 'none';

        let filename = 'partition';

        if (currentScoreData.title && currentScoreData.title.trim()) {
            filename = currentScoreData.title.trim()
                .toLowerCase()
                .normalize('NFD').replace(/[̀-ͯ]/g, '')
                .replace(/[^a-z0-9\s-]/g, '')
                .replace(/\s+/g, '-')
                .replace(/-+/g, '-');
        }

        // Convertit le Set en tableau de configurations d'instruments
        const instrumentConfigs = Array.from(selectedInstruments).map(key => INSTRUMENTS[key]);

        // Message de feedback pour indiquer le nombre de pistes générées
        console.log(`🎹 Export MIDI avec ${instrumentConfigs.length} instrument(s):`, 
                    instrumentConfigs.map(i => i.name).join(', '));

        midiExporter.exportMultiTrack(currentScoreData, filename, instrumentConfigs);

        // Message de succès
        const successMsg = `✅ Fichier MIDI généré avec ${instrumentConfigs.length} piste(s) : ` +
                          instrumentConfigs.map(i => i.name).join(', ');
        errorDiv.textContent = successMsg;
        errorDiv.style.display = 'block';
        errorDiv.style.background = '#d4edda';
        errorDiv.style.color = '#155724';
        errorDiv.style.borderColor = '#c3e6cb';
        
        setTimeout(() => {
            errorDiv.style.display = 'none';
            errorDiv.style.background = '';
            errorDiv.style.color = '';
            errorDiv.style.borderColor = '';
        }, 5000);

    } catch (error) {
        errorDiv.textContent = '❌ Erreur lors de l\'export MIDI: ' + error.message;
        errorDiv.style.display = 'block';
        errorDiv.style.background = '';
        errorDiv.style.color = '';
        errorDiv.style.borderColor = '';
        errorDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}
```

**Tests de validation :**
- Tenter de valider sans sélection → alerte "au moins un instrument"
- Sélectionner 17 instruments → alerte "maximum 16 instruments"
- Export réussi avec 1 instrument → message vert "1 piste : Piano"
- Export réussi avec 3 instruments → message vert "3 pistes : Piano, Guitare, Violon"
- Le message de succès disparaît après 5 secondes

**Commit :** `feat(validation): add error handling and success messages for multi-track export`

---

### Task 6 : Mettre à jour la documentation CLAUDE.md

**Fichier :** `CLAUDE.md`

**Description :** Documenter la nouvelle fonctionnalité d'export MIDI multi-pistes dans la documentation du projet.

**Changements dans la section `## 🎹 Export MIDI` :**

Remplacer la section "Limitations" par :

```markdown
### Sélection d'instruments

L'application permet de sélectionner **un ou plusieurs instruments** pour l'export MIDI :

- **Un seul instrument** : Génère un fichier MIDI Format 0 (piste unique)
- **Plusieurs instruments** : Génère un fichier MIDI Format 1 (multi-pistes)
  - Une piste par instrument
  - Toutes les pistes jouent les mêmes notes
  - Chaque piste a son propre Program Change (timbre différent)
  - Maximum 16 instruments (limitation MIDI : 16 canaux)

### Format MIDI

**Format 0 (mono-instrument) :**
- Structure : 1 header chunk + 1 track chunk
- Tous les événements sur le canal 0
- Utilisé quand un seul instrument est sélectionné

**Format 1 (multi-instruments) :**
- Structure : 1 header chunk + N track chunks (N = nombre d'instruments)
- Chaque piste a son propre canal MIDI (0-15)
- Les pistes sont synchronisées (même tempo, même time signature)
- Meta-événements globaux (tempo, time signature) sur la première piste uniquement

### Interface utilisateur

**Modale de sélection :**
- Cliquez sur les instruments pour les sélectionner/désélectionner
- Un indicateur de checkbox apparaît en haut à droite de chaque instrument sélectionné
- Cliquez sur "Valider la sélection" pour générer le fichier MIDI
- Un message de succès indique le nombre de pistes générées

**Validations :**
- Au moins 1 instrument doit être sélectionné
- Maximum 16 instruments (limitation du format MIDI)
- Message d'erreur clair en cas de problème

### Compatibilité

Les fichiers MIDI générés (Format 0 et Format 1) sont compatibles avec :
- Lecteurs audio : VLC, Windows Media Player, QuickTime
- Logiciels de notation : MuseScore, Finale, Sibelius
- DAWs : GarageBand, Logic Pro, Ableton Live, FL Studio
- Synthétiseurs et instruments MIDI externes

### Limitations

- ✅ Support des formats 0 et 1 (mono et multi-pistes)
- ⚠️ Pas de support des nuances (velocity fixe à 80)
- ⚠️ Pas d'informations de clef ou d'armure dans le fichier MIDI
- ⚠️ Pas de support des ornements ou articulations
- ⚠️ Maximum 16 instruments simultanés (limitation MIDI)
- ⚠️ Toutes les pistes jouent les mêmes notes (pas de polyphonie réelle avec notes différentes)
```

Ajouter une nouvelle sous-section dans `## 🔧 Comment ajouter une fonctionnalité` :

```markdown
### Ajouter un nouvel instrument MIDI

Pour ajouter un instrument dans la liste de sélection :

1. **Dans `app.js`**, ajouter l'instrument au dictionnaire `INSTRUMENTS` :

```javascript
const INSTRUMENTS = {
    // ...
    'saxophone': { name: 'Saxophone', program: 65, emoji: '🎷' }
};
```

2. Les numéros de programme MIDI standards (General MIDI) :
   - 0 : Piano acoustique
   - 24 : Guitare acoustique
   - 40 : Violon
   - 56 : Trompette
   - 65 : Saxophone alto
   - 73 : Flûte
   - [Liste complète General MIDI](https://www.midi.org/specifications-old/item/gm-level-1-sound-set)

3. L'instrument apparaît automatiquement dans la modale de sélection.

4. Aucune modification nécessaire dans `midi-export.js` (gère tous les instruments via leur numéro de programme).
```

**Tests de validation :**
- Relire la documentation complète
- Vérifier que toutes les informations sont cohérentes avec l'implémentation
- Vérifier que les exemples de code sont corrects

**Commit :** `docs: update CLAUDE.md with multi-track MIDI export documentation`

---

### Task 7 : Tester l'export avec différentes combinaisons d'instruments

**Description :** Tests d'intégration complets pour valider le bon fonctionnement de l'export multi-pistes.

**Scénarios de test :**

1. **Export mono-instrument (Format 0) :**
   - Générer une partition
   - Sélectionner 1 seul instrument (Piano)
   - Valider
   - Télécharger et ouvrir dans MuseScore
   - Vérifier : 1 piste, son de piano

2. **Export multi-instruments (Format 1) :**
   - Sélectionner 3 instruments : Piano, Guitare, Violon
   - Valider
   - Télécharger et ouvrir dans MuseScore
   - Vérifier : 3 pistes, noms corrects, sons différents

3. **Export avec tous les instruments disponibles :**
   - Sélectionner tous les instruments de la liste (12 instruments)
   - Valider
   - Télécharger et ouvrir dans un DAW (GarageBand, Ableton)
   - Vérifier : 12 pistes synchronisées, timbres différents

4. **Validation des erreurs :**
   - Cliquer sur "Valider" sans sélection → alerte
   - Sélectionner plus de 16 instruments (si possible) → alerte

5. **Test de compatibilité :**
   - Ouvrir les fichiers générés dans VLC → vérifier lecture audio
   - Ouvrir dans MuseScore → vérifier affichage de la partition
   - Importer dans un DAW → vérifier les pistes séparées

**Résultats attendus :**
- ✅ Format 0 et Format 1 fonctionnent correctement
- ✅ Les instruments ont des sons distincts
- ✅ Les pistes sont nommées correctement
- ✅ Les fichiers sont lisibles dans tous les logiciels testés
- ✅ Les validations empêchent les erreurs utilisateur

**Commit :** `test: validate multi-track MIDI export with various instrument combinations`

---

### Task 8 : Test final et nettoyage du code

**Description :** Relecture complète du code, nettoyage et validation finale.

**Checklist :**

1. **Code review `app.js` :**
   - ✅ Variable `selectedInstruments` bien initialisée
   - ✅ Event listeners bien attachés
   - ✅ Pas de code mort (ancienne fonction `handleInstrumentSelection`)
   - ✅ Commentaires à jour
   - ✅ Gestion d'erreurs cohérente

2. **Code review `midi-export.js` :**
   - ✅ Signatures de méthodes correctes
   - ✅ Validation des paramètres
   - ✅ Pas de régression sur `export()` et `generateMidiFile()`
   - ✅ Commentaires JSDoc complets
   - ✅ Pas de duplication de code

3. **Code review `index.html` :**
   - ✅ Structure HTML valide
   - ✅ IDs uniques
   - ✅ Accessibilité (attributs alt, aria-label si nécessaire)

4. **Code review `styles.css` :**
   - ✅ Pas de classes orphelines
   - ✅ Styles cohérents avec le reste de l'app
   - ✅ Responsive (fonctionne sur mobile)

5. **Tests finaux :**
   - ✅ Tester sur Chrome, Firefox, Safari
   - ✅ Tester sur mobile (iOS/Android)
   - ✅ Vérifier que le bouton "Lire la partition" n'est PAS affecté (lecture audio Web Audio API inchangée)
   - ✅ Vérifier que l'export PNG fonctionne toujours

6. **Nettoyage :**
   - Supprimer les `console.log()` de debug inutiles (garder ceux qui sont utiles)
   - Supprimer les fonctions commentées
   - Vérifier l'indentation et le formatage

**Commit :** `chore: final cleanup and code review for multi-track MIDI export`

---

## 🎯 Résultat attendu

À la fin de ce plan :

1. ✅ L'utilisateur peut sélectionner plusieurs instruments dans la modale
2. ✅ Un fichier MIDI Format 1 (multi-pistes) est généré
3. ✅ Chaque instrument a sa propre piste avec son timbre
4. ✅ L'ancien export mono-instrument fonctionne toujours (rétrocompatibilité)
5. ✅ La documentation est à jour
6. ✅ Les validations empêchent les erreurs utilisateur
7. ✅ Le code est propre, commenté et testé

## 📊 Critères de succès

- [ ] Modale de sélection multiple fonctionnelle (UI/UX)
- [ ] Export MIDI Format 1 génère des fichiers valides
- [ ] Les fichiers MIDI multi-pistes s'ouvrent dans MuseScore/DAW
- [ ] Les instruments ont des sons distincts à la lecture
- [ ] Les validations (minimum 1, maximum 16) fonctionnent
- [ ] Messages de succès et d'erreur clairs
- [ ] Documentation CLAUDE.md à jour
- [ ] Pas de régression sur l'export mono-instrument
- [ ] Pas de régression sur la lecture audio (Web Audio API)

## 🚀 Points d'attention

1. **Format MIDI :**
   - Format 0 (mono) : 1 piste, tous les événements sur canal 0
   - Format 1 (multi) : N pistes, canal 0-15, événements globaux sur piste 0 uniquement

2. **Limitation MIDI :**
   - Maximum 16 canaux MIDI → maximum 16 instruments
   - Valider cette limite dans l'interface

3. **Rétrocompatibilité :**
   - L'ancienne méthode `export(scoreData, filename, program)` doit continuer à fonctionner
   - Les fichiers générés avec 1 seul instrument doivent rester en Format 0 (pour compatibilité)

4. **Performance :**
   - Générer un fichier multi-pistes est quasiment instantané (même avec 16 pistes)
   - Pas besoin d'optimisation particulière

5. **UX :**
   - Feedback visuel immédiat lors de la sélection (checkboxes)
   - Message de succès avec le nombre de pistes générées
   - Gestion d'erreurs claire et en français

---

**Fin du plan**

**Note pour l'exécuteur :**
- Suivre l'ordre des tâches strictement
- Un commit par tâche, avec le message indiqué
- Tester après chaque tâche avant de passer à la suivante
- En cas d'erreur, déboguer avant de continuer
- TDD : pour les fonctions critiques (`exportMultiTrack`, `buildTrackChunk`), écrire des tests unitaires si nécessaire
