# Plan d'implémentation : Lecture MIDI via élément HTML audio

> Pour agentic workers : implement this plan task-by-task with red-green-refactor discipline. One task, one commit. Never batch.

## Contexte

Actuellement, l'application utilise Web Audio API avec des oscillateurs pour synthétiser et jouer les notes. La nouvelle approche consiste à :
1. Générer un fichier MIDI en mémoire (réutiliser `MidiExporter`)
2. Créer un Blob URL
3. L'injecter dans un élément HTML `<audio>` pour la lecture

**Avantages :**
- Sons MIDI natifs du navigateur (meilleure qualité qu'oscillateurs)
- Code simplifié (pas de gestion manuelle des oscillateurs)
- Pas de limitation Web Audio API (notes déjà programmées non annulables)

## Architecture cible

```
Parser → scoreData
              ↓
   MidiExporter.generateMidiFile(scoreData)
              ↓
         Blob MIDI en mémoire
              ↓
     URL.createObjectURL(blob)
              ↓
   <audio src="blob:..." controls></audio>
```

## Tâches d'implémentation

### Task 1 : Ajouter une méthode `generateMidiFile()` dans `MidiExporter`

**Objectif :** Créer une méthode qui retourne un `Blob` MIDI au lieu de déclencher directement le téléchargement.

**Fichier :** `midi-export.js`

**Code à ajouter :**

```javascript
/**
 * Génère un Blob MIDI en mémoire (sans téléchargement)
 * @param {Object} scoreData - Données de partition parsées
 * @returns {Blob} Blob MIDI de type 'audio/midi'
 */
generateMidiFile(scoreData) {
    const ppq = 480;

    const events = this.generateMidiEvents(scoreData);

    const headerBytes = this.buildHeaderChunk(ppq);
    const trackBytes = this.buildTrackChunk(scoreData, events);

    const midiBytes = new Uint8Array([...headerBytes, ...trackBytes]);

    return new Blob([midiBytes], { type: 'audio/midi' });
}
```

**Position :** Ajouter après la méthode `export()` (ligne 309).

**Test :**
```javascript
// Console test
const exporter = new MidiExporter();
const blob = exporter.generateMidiFile(currentScoreData);
console.log(blob.type, blob.size); // Doit afficher "audio/midi" et une taille > 0
```

**Commit :** `feat(midi-export): add generateMidiFile method for in-memory MIDI generation`

---

### Task 2 : Ajouter un élément `<audio>` dans le HTML

**Objectif :** Créer un lecteur audio HTML caché dans la page.

**Fichier :** `index.html`

**Code à ajouter :**

```html
<!-- Ajout après la div #render-output, avant la div .export-actions (ligne 45) -->
<div class="audio-player-container" style="margin-top: 1rem;">
    <audio id="midi-player" controls style="width: 100%; display: none;">
        Votre navigateur ne supporte pas la lecture audio.
    </audio>
</div>
```

**Position :** Entre `</div>` de `#render-output` et `<div class="export-actions">`.

**Test manuel :** Recharger la page, inspecter le DOM → l'élément `<audio id="midi-player">` doit exister.

**Commit :** `feat(ui): add hidden audio element for MIDI playback`

---

### Task 3 : Créer une nouvelle classe `MidiAudioPlayer`

**Objectif :** Remplacer `MidiPlayer` (Web Audio API) par un lecteur basé sur `<audio>`.

**Fichier :** Créer `midi-audio-player.js`

**Code complet :**

```javascript
/**
 * MIDI-AUDIO-PLAYER.JS
 *
 * Module de lecture MIDI via élément HTML <audio>
 * Génère un fichier MIDI en mémoire et l'injecte dans un lecteur audio natif
 */

class MidiAudioPlayer {
    constructor() {
        this.audioElement = null;
        this.currentBlobURL = null;
        this.midiExporter = null;
    }

    /**
     * Initialise le lecteur audio
     * @param {HTMLAudioElement} audioElement - L'élément <audio> du DOM
     * @param {MidiExporter} midiExporter - Instance de MidiExporter
     */
    init(audioElement, midiExporter) {
        this.audioElement = audioElement;
        this.midiExporter = midiExporter;

        // Événements audio
        this.audioElement.addEventListener('ended', () => {
            this.cleanup();
        });

        this.audioElement.addEventListener('play', () => {
            this.audioElement.style.display = 'block';
        });

        this.audioElement.addEventListener('pause', () => {
            if (this.audioElement.ended) {
                this.audioElement.style.display = 'none';
            }
        });
    }

    /**
     * Lance la lecture de la partition
     * @param {Object} scoreData - Données parsées (tempo, notes, etc.)
     */
    play(scoreData) {
        if (!this.midiExporter) {
            throw new Error('MidiExporter not initialized. Call init() first.');
        }

        if (!scoreData) {
            throw new Error('No score data provided');
        }

        // Nettoie le Blob URL précédent si existant
        this.cleanup();

        // Génère le fichier MIDI en mémoire
        const midiBlob = this.midiExporter.generateMidiFile(scoreData);

        // Crée un Blob URL
        this.currentBlobURL = URL.createObjectURL(midiBlob);

        // Injecte dans l'élément audio
        this.audioElement.src = this.currentBlobURL;
        this.audioElement.style.display = 'block';

        // Lance la lecture
        this.audioElement.play().catch(error => {
            console.error('Erreur lecture audio:', error);
            throw new Error('Impossible de lire le fichier MIDI. Votre navigateur supporte-t-il le format MIDI ?');
        });
    }

    /**
     * Arrête la lecture
     */
    stop() {
        if (this.audioElement) {
            this.audioElement.pause();
            this.audioElement.currentTime = 0;
            this.audioElement.style.display = 'none';
        }
        this.cleanup();
    }

    /**
     * Vérifie si la lecture est en cours
     * @returns {boolean} true si en cours de lecture
     */
    get isPlaying() {
        return this.audioElement && !this.audioElement.paused && !this.audioElement.ended;
    }

    /**
     * Nettoie les ressources (Blob URL)
     */
    cleanup() {
        if (this.currentBlobURL) {
            URL.revokeObjectURL(this.currentBlobURL);
            this.currentBlobURL = null;
        }
    }
}
```

**Test (console) :**
```javascript
// Après chargement de la page et génération d'une partition
const player = new MidiAudioPlayer();
player.init(document.getElementById('midi-player'), midiExporter);
player.play(currentScoreData);
```

**Commit :** `feat(midi-audio-player): create MIDI playback via HTML audio element`

---

### Task 4 : Importer le nouveau module dans `index.html`

**Objectif :** Charger le fichier JavaScript du nouveau lecteur.

**Fichier :** `index.html`

**Modification :**

Remplacer :
```html
<script src="midi.js"></script>
<script src="midi-export.js"></script>
<script src="app.js"></script>
```

Par :
```html
<script src="midi-export.js"></script>
<script src="midi-audio-player.js"></script>
<script src="app.js"></script>
```

**Position :** Lignes 63-66.

**Explication :** On retire `midi.js` (ancien système Web Audio API) et on ajoute `midi-audio-player.js`.

**Test manuel :** Recharger la page → aucune erreur console. Vérifier que `MidiAudioPlayer` est défini (`typeof MidiAudioPlayer` → `"function"`).

**Commit :** `refactor(html): replace midi.js with midi-audio-player.js`

---

### Task 5 : Mettre à jour `app.js` pour utiliser `MidiAudioPlayer`

**Objectif :** Remplacer l'instanciation et l'utilisation de `MidiPlayer` par `MidiAudioPlayer`.

**Fichier :** `app.js`

**Modifications :**

**1. Remplacer la déclaration globale (ligne 11) :**

Avant :
```javascript
let midiPlayer;
```

Après :
```javascript
let midiAudioPlayer;
```

**2. Modifier la fonction `init()` (lignes 19-53) :**

Avant :
```javascript
function init() {
    parser = new Parser();
    renderer = new Renderer();
    midiPlayer = new MidiPlayer();
    midiExporter = new MidiExporter();

    // ...récupération des éléments DOM...

    const btnPlay = document.getElementById('btn-play');

    // ...événements...

    console.log('✅ Application initialisée');
}
```

Après :
```javascript
function init() {
    parser = new Parser();
    renderer = new Renderer();
    midiExporter = new MidiExporter();
    midiAudioPlayer = new MidiAudioPlayer();

    // Récupère les éléments DOM
    const btnRender = document.getElementById('btn-render');
    const btnExample = document.getElementById('btn-example');
    const btnClear = document.getElementById('btn-clear');
    const btnExportPNG = document.getElementById('btn-export-png');
    const btnExportMIDI = document.getElementById('btn-export-midi');
    const textarea = document.getElementById('partition-input');
    const errorDiv = document.getElementById('error-message');
    const btnPlay = document.getElementById('btn-play');
    const audioElement = document.getElementById('midi-player');

    // Initialise le lecteur audio
    midiAudioPlayer.init(audioElement, midiExporter);

    // Attache les événements
    btnRender.addEventListener('click', handleRender);
    btnExample.addEventListener('click', handleExample);
    btnClear.addEventListener('click', handleClear);
    btnExportPNG.addEventListener('click', handleExportPNG);
    btnExportMIDI.addEventListener('click', handleExportMIDI);
    btnPlay.addEventListener('click', handlePlay);

    // Permet de générer avec Ctrl+Enter dans le textarea
    textarea.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            handleRender();
        }
    });

    console.log('✅ Application initialisée');
}
```

**3. Réécrire la fonction `handlePlay()` (lignes 254-292) :**

Avant :
```javascript
function handlePlay() {
    const btnPlay = document.getElementById('btn-play');
    const errorDiv = document.getElementById('error-message');

    try {
        errorDiv.style.display = 'none';

        if (!currentScoreData) {
            throw new Error('Veuillez d\'abord générer une partition');
        }

        if (midiPlayer.isPlaying) {
            midiPlayer.stop();
            btnPlay.textContent = '🎵 Lire la partition';
        } else {
            midiPlayer.initAudioContext();
            midiPlayer.play(currentScoreData);
            btnPlay.textContent = '⏹️ Arrêter';

            const quarterDuration = 60 / currentScoreData.tempo;
            let totalDuration = 0;
            for (const note of currentScoreData.notes) {
                totalDuration += note.duration * quarterDuration;
            }

            setTimeout(() => {
                if (!midiPlayer.isPlaying) {
                    btnPlay.textContent = '🎵 Lire la partition';
                }
            }, totalDuration * 1000 + 500);
        }

    } catch (error) {
        console.error('❌ Erreur lecture:', error.message);
        errorDiv.textContent = '❌ ' + error.message;
        errorDiv.style.display = 'block';
        errorDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}
```

Après :
```javascript
function handlePlay() {
    const btnPlay = document.getElementById('btn-play');
    const errorDiv = document.getElementById('error-message');

    try {
        errorDiv.style.display = 'none';

        if (!currentScoreData) {
            throw new Error('Veuillez d\'abord générer une partition');
        }

        if (midiAudioPlayer.isPlaying) {
            midiAudioPlayer.stop();
            btnPlay.textContent = '🎵 Lire la partition';
        } else {
            midiAudioPlayer.play(currentScoreData);
            btnPlay.textContent = '⏹️ Arrêter';
        }

    } catch (error) {
        console.error('❌ Erreur lecture:', error.message);
        errorDiv.textContent = '❌ ' + error.message;
        errorDiv.style.display = 'block';
        errorDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}
```

**Explication des changements :**
- Plus besoin de `midiPlayer.initAudioContext()` (géré en interne par `<audio>`)
- Plus besoin de calculer `totalDuration` et setTimeout (l'élément `<audio>` émet un événement `'ended'` automatiquement)
- Code simplifié : juste `play()` ou `stop()`

**Test manuel :**
1. Générer une partition
2. Cliquer sur "🎵 Lire la partition"
3. Vérifier que le lecteur audio apparaît et joue
4. Cliquer sur "⏹️ Arrêter"
5. Vérifier que la lecture s'arrête et que le lecteur disparaît

**Commit :** `refactor(app): replace MidiPlayer with MidiAudioPlayer`

---

### Task 6 : Gérer l'état du bouton de lecture selon les événements audio

**Objectif :** Mettre à jour le texte du bouton "Lire" / "Arrêter" en fonction de l'état de l'élément `<audio>`.

**Fichier :** `app.js`

**Modification :**

Dans la fonction `init()`, après `midiAudioPlayer.init(audioElement, midiExporter);` (après ligne ~24 dans le nouveau code), ajouter :

```javascript
// Écoute les événements de l'élément audio pour mettre à jour le bouton
audioElement.addEventListener('play', () => {
    btnPlay.textContent = '⏹️ Arrêter';
});

audioElement.addEventListener('pause', () => {
    if (audioElement.ended || audioElement.currentTime === 0) {
        btnPlay.textContent = '🎵 Lire la partition';
    }
});

audioElement.addEventListener('ended', () => {
    btnPlay.textContent = '🎵 Lire la partition';
});
```

**Explication :** Ces événements garantissent que le bouton est synchronisé avec l'état réel du lecteur (lecture, pause, fin).

**Test manuel :**
1. Lire une partition
2. Laisser la lecture aller jusqu'au bout
3. Vérifier que le bouton repasse automatiquement à "🎵 Lire la partition"
4. Tester également avec un arrêt manuel

**Commit :** `feat(app): sync play button state with audio element events`

---

### Task 7 : Supprimer l'ancien fichier `midi.js`

**Objectif :** Nettoyer le code mort (ancien système Web Audio API).

**Fichier :** `midi.js`

**Action :** Supprimer le fichier.

```bash
git rm midi.js
```

**Test manuel :** L'application fonctionne toujours sans erreur console.

**Commit :** `chore(midi): remove deprecated Web Audio API player (midi.js)`

---

### Task 8 : Mettre à jour `CLAUDE.md` avec la nouvelle architecture

**Objectif :** Documenter le changement d'architecture de lecture MIDI.

**Fichier :** `CLAUDE.md`

**Modifications :**

**1. Section "## 🎹 Export MIDI" (ligne ~107) — Ajouter après "### Compatibilité" :**

```markdown
## 🎵 Lecture MIDI

L'application permet de lire la partition générée avec des sons MIDI natifs du navigateur.

### Fonctionnement

1. **Génération MIDI en mémoire** :
   - `MidiExporter.generateMidiFile()` génère un `Blob` MIDI (pas de téléchargement)
   - Réutilise toute la logique de `buildHeaderChunk()` et `buildTrackChunk()`

2. **Lecteur audio HTML natif** :
   - Blob URL créé via `URL.createObjectURL()`
   - Injecté dans un élément `<audio id="midi-player">`
   - Lecture native par le navigateur (pas de synthèse Web Audio)

3. **Gestion de l'état** :
   - Le lecteur audio apparaît pendant la lecture
   - Il se cache automatiquement à la fin
   - Le bouton "Lire" / "Arrêter" se synchronise via les événements `play`, `pause`, `ended`

### Architecture

**Module** : `midi-audio-player.js`

**Classe** : `MidiAudioPlayer`

**Méthodes principales** :
- `init(audioElement, midiExporter)` → Initialise le lecteur
- `play(scoreData)` → Génère le MIDI en mémoire et lance la lecture
- `stop()` → Arrête la lecture et nettoie les ressources
- `cleanup()` → Révoque le Blob URL (libère la mémoire)
- `get isPlaying()` → Retourne l'état de lecture

### État du bouton

- **Désactivé** : Au chargement, après "Effacer", en cas d'erreur
- **Activé** : Après génération réussie
- **Texte alternatif** : "🎵 Lire la partition" (repos) / "⏹️ Arrêter" (en lecture)

### Avantages vs Web Audio API

- **Son natif** : Meilleure qualité (synthétiseur MIDI du système)
- **Simplicité** : Pas de gestion manuelle d'oscillateurs/enveloppes
- **Arrêt instantané** : Plus de problème de notes déjà programmées
- **Contrôles natifs** : L'élément `<audio>` offre des contrôles standards (play, pause, timeline)

### Limitations

- **Support navigateur** : Certains navigateurs ne lisent pas les fichiers MIDI (notamment Safari mobile)
- **Pas de personnalisation audio** : Le son dépend du synthétiseur MIDI du système (pas de contrôle du timbre)
```

**2. Mettre à jour la section "## 🐛 Bugs connus / Limitations" (ligne ~146) :**

Supprimer :
```markdown
- ✅ ~~Pas d'export MIDI~~ → Implémenté
```

Ajouter :
```markdown
- ✅ ~~Lecture MIDI via Web Audio API (limitations)~~ → Remplacé par lecteur audio natif
- ⚠️ Lecture MIDI : dépend du support navigateur (certains mobiles Safari ne lisent pas les fichiers MIDI)
```

**3. Mettre à jour la section "## 📁 Architecture" (ligne ~10) :**

Remplacer :
```markdown
├── midi.js             # Synthèse et lecture MIDI via Web Audio API
```

Par :
```markdown
├── midi-audio-player.js # Lecture MIDI via élément HTML <audio>
```

**Test manuel :** Relire `CLAUDE.md` pour vérifier la cohérence.

**Commit :** `docs(CLAUDE.md): update MIDI playback documentation with audio element approach`

---

### Task 9 : Ajouter un style CSS pour le lecteur audio

**Objectif :** S'assurer que l'élément `<audio>` s'intègre bien visuellement.

**Fichier :** `styles.css`

**Code à ajouter à la fin du fichier :**

```css
/* ===========================
   Lecteur Audio MIDI
   =========================== */

.audio-player-container {
    margin-top: 1rem;
    padding: 1rem;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    display: flex;
    justify-content: center;
    align-items: center;
}

#midi-player {
    width: 100%;
    max-width: 600px;
    outline: none;
}

#midi-player::-webkit-media-controls-panel {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
```

**Explication :**
- Container avec fond semi-transparent pour isoler visuellement le lecteur
- Lecteur centré avec largeur max 600px
- Personnalisation des contrôles (gradient violet cohérent avec le design)

**Test manuel :** Lire une partition et vérifier que le lecteur audio a le style violet du reste de l'application.

**Commit :** `style(css): add styling for MIDI audio player`

---

### Task 10 : Tester la compatibilité navigateur et gérer les erreurs

**Objectif :** Afficher un message clair si le navigateur ne supporte pas la lecture MIDI.

**Fichier :** `midi-audio-player.js`

**Modification dans la méthode `play()` :**

Remplacer :
```javascript
// Lance la lecture
this.audioElement.play().catch(error => {
    console.error('Erreur lecture audio:', error);
    throw new Error('Impossible de lire le fichier MIDI. Votre navigateur supporte-t-il le format MIDI ?');
});
```

Par :
```javascript
// Vérifie si le navigateur peut lire le MIDI
const canPlayMidi = this.audioElement.canPlayType('audio/midi');

if (!canPlayMidi || canPlayMidi === '') {
    throw new Error('Votre navigateur ne supporte pas la lecture de fichiers MIDI. Essayez Chrome, Firefox ou Edge.');
}

// Lance la lecture
this.audioElement.play().catch(error => {
    console.error('Erreur lecture audio:', error);
    throw new Error('Impossible de lire le fichier MIDI : ' + error.message);
});
```

**Test manuel :**
1. Tester sur Chrome (doit fonctionner)
2. Tester sur Firefox (doit fonctionner)
3. Si possible, tester sur Safari desktop (peut ne pas fonctionner)
4. Vérifier que le message d'erreur est clair dans la console et dans `#error-message`

**Commit :** `feat(midi-audio-player): add browser compatibility check for MIDI playback`

---

## Validation finale

### Checklist

- [ ] `MidiExporter.generateMidiFile()` retourne un `Blob` valide
- [ ] L'élément `<audio id="midi-player">` existe dans le HTML
- [ ] `MidiAudioPlayer` est correctement instancié et initialisé
- [ ] Le bouton "Lire" lance la lecture et change en "Arrêter"
- [ ] Le bouton "Arrêter" stoppe la lecture et redevient "Lire"
- [ ] À la fin de la lecture, le bouton revient automatiquement à "Lire"
- [ ] Le lecteur audio apparaît pendant la lecture et se cache à la fin
- [ ] Pas d'erreur console après chargement et lecture
- [ ] L'ancien fichier `midi.js` est supprimé
- [ ] `CLAUDE.md` est à jour avec la nouvelle architecture
- [ ] Le style CSS du lecteur audio est cohérent avec le design

### Tests manuels

1. **Cas nominal** :
   - Saisir une partition simple (ex: "Do Re Mi Fa Sol")
   - Générer la partition
   - Cliquer sur "Lire"
   - Vérifier que le son est audible
   - Attendre la fin → vérifier que le bouton revient à "Lire"

2. **Cas d'arrêt manuel** :
   - Générer une partition longue
   - Lancer la lecture
   - Cliquer sur "Arrêter" avant la fin
   - Vérifier que la lecture s'arrête immédiatement

3. **Cas d'erreur** :
   - Tenter de lire sans partition générée → message d'erreur clair
   - Vérifier le message dans `#error-message`

4. **Export MIDI** (régression) :
   - Vérifier que l'export MIDI fonctionne toujours
   - Télécharger le fichier `.mid`
   - L'ouvrir dans un lecteur MIDI externe (VLC, MuseScore, etc.)

---

## Rollback plan

En cas de problème critique :

1. **Revert Task 10 → Task 1** :
   ```bash
   git revert HEAD~9..HEAD
   ```

2. **Restaurer `midi.js`** :
   ```bash
   git checkout HEAD~10 -- midi.js
   ```

3. **Restaurer l'ancienne version de `index.html` et `app.js`** :
   ```bash
   git checkout HEAD~10 -- index.html app.js
   ```

---

## Notes pour l'exécuteur

- **Discipline TDD** : Chaque tâche = 1 commit, pas de batch
- **Tests entre chaque tâche** : Recharger la page, vérifier la console
- **Pas de refactoring hors scope** : Ne pas toucher au Parser ou au Renderer
- **Messages de commit conventionnels** : `feat`, `refactor`, `chore`, `docs`, `style`

---

**Fin du plan. Prêt pour exécution séquentielle.**
