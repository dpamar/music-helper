# Éditeur de Partitions Musicales

Application web client-side pour saisir et afficher des partitions musicales en notation française.

## 🎯 Vue d'ensemble

Cette application permet aux musiciens de :
- Saisir une partition en notation textuelle simplifiée (notation française)
- Générer automatiquement un rendu graphique sur portée musicale (Canvas HTML5)
- Exporter (PNG et MIDI disponibles, PDF en développement)

**Contraintes techniques :**
- 100% client-side (HTML/CSS/JS vanilla, aucun framework)
- Déployable sur GitHub Pages
- Code abondamment commenté pour les débutants

## 📁 Architecture

```
music-helper/
├── index.html          # Page principale et structure DOM
├── styles.css          # Design et mise en page
├── parser.js           # Parse la notation textuelle → structures de données
├── renderer.js         # Rendu graphique Canvas → portée musicale
├── midi-audio-player.js # Lecture MIDI via élément HTML <audio>
├── midi-export.js      # Export de fichiers MIDI (téléchargement .mid)
├── midi-import.js      # Import de fichiers MIDI (.mid → notation française)
├── jazz-transformer.js # Transformation jazz (swing, accords, walking bass, ghost notes)
├── app.js              # Orchestration et gestion des événements
├── test/
│   ├── jazz-transformer.test.js  # Tests unitaires (Mocha/Chai)
│   └── test-runner.html           # Runner de tests navigateur
└── CLAUDE.md           # Ce fichier
```

### Flux de données

```
Texte saisi par l'utilisateur
    ↓
Parser.parse() → Objet structuré (ParseResult)
    ↓
Renderer.render() → Canvas HTML5
```

## 🎼 Format de notation

### Structure (5 lignes minimum)

```
Ligne 1 : Titre de la partition
Ligne 2 : Tempo (ex: 120)
Ligne 3 : Chiffrage (ex: 4/4, 3/4, 6/8)
Ligne 4 : Clef et altérations (ex: sol, fa, sol Do# Mib)
Ligne 5+ : Notes et silences séparés par des espaces
```

### Syntaxe des notes

- **Note simple** : `Do`, `Re`, `Mi`, `Fa`, `Sol`, `La`, `Si` (insensible à la casse)
- **Durée** : nombre après la note
  - `Do` = noire (1, par défaut)
  - `Do4` = ronde
  - `Do2` = blanche
  - `Do1.5` = noire pointée
  - `Do0.5` ou `Do.5` = croche
  - `Do0.25` = double croche
- **Altération** : `#` (dièse), `b` (bémol), `*` (bécarre)
  - Exemples : `Do#`, `Mib`, `Fa*`
- **Octave** : `--`, `-`, (rien), `+`, `++`
  - `Do--` = 2 octaves en dessous
  - `Do-` = 1 octave en dessous
  - `Do` = octave de référence (médium)
  - `Do+` = 1 octave au-dessus
  - `Do++` = 2 octaves au-dessus
- **Accord** : notes collées (sans espace)
  - `DoMiSol2` = accord de Do majeur (blanche)
  - La durée s'applique à tout l'accord
- **Silence** : `S`, `S2`, `S0.5`, etc.

### Exemples

```
Au clair de la lune
120
4/4
sol
Do Do Do Re Mi2 Re2
Do Mi Re Re Do2
```

```
Gamme de Do majeur
100
3/4
sol Do# Fa#
Do Re Mi Fa Sol La Si Do+
```

## 🏗️ Modules principaux

### `parser.js` - Parser

**Classe** : `Parser`

**Responsabilité** : Transformer le texte brut en structures de données JavaScript.

**Méthodes principales :**
- `parse(text)` → `ParseResult`
  - Point d'entrée principal
  - Retourne un objet avec : `{title, tempo, timeSignature, clef, keySignature, notes}`
- `parseTempo(str)` → `number`
- `parseTimeSignature(str)` → `{numerator, denominator}`
- `parseClefAndKey(str)` → `{clef, keySignature}`
- `parseNotes(str)` → `Array<Note | Chord | Rest>`

**Structures de données retournées :**

```javascript
// Note simple
{
  type: 'note',
  note: 'C',           // Notation anglo-saxonne (C, D, E, F, G, A, B)
  alteration: 'sharp', // 'sharp', 'flat', 'natural' ou ''
  octave: 0,           // -2, -1, 0, 1, 2
  duration: 1          // 0.25, 0.5, 1, 1.5, 2, 3, 4
}

// Accord
{
  type: 'chord',
  notes: [
    {note: 'C', alteration: '', octave: 0},
    {note: 'E', alteration: '', octave: 0},
    {note: 'G', alteration: '', octave: 0}
  ],
  duration: 2
}

// Silence
{
  type: 'rest',
  duration: 1
}
```

**Points d'attention :**
- Mapping français → anglo-saxon : `{do: 'C', ré: 'D', mi: 'E', fa: 'F', sol: 'G', la: 'A', si: 'B'}`
- Regex pour détecter les silences : `/^s[\d.]*$/i` (évite de confondre "Sol" avec "S")
- Regex pour parser les notes : `/(do|ré|re|mi|fa|sol|la|si)(#|b|\*)?(--|-|\+|\+\+)?/gi`

### `renderer.js` - Moteur de rendu

**Classe** : `Renderer`

**Responsabilité** : Dessiner la partition sur un Canvas HTML5.

**Configuration :**
```javascript
this.config = {
  staffLineSpacing: 12,    // Espacement entre lignes de portée
  noteWidth: 40,           // Largeur d'une note
  marginTop: 100,          // Marge haute (pour titre)
  staffStartX: 80,         // Début de la portée
  clefWidth: 60            // Largeur de la clef
}
```

**Positions des notes sur la portée :**

```javascript
// En clef de SOL :
// Position -1 = ligne supplémentaire (Do médium)
// Position 0 = interligne sous ligne 1 (Ré médium)
// Position 1 = ligne 1 (Mi)
// Position 3 = ligne 2 (Sol)
// Position 5 = ligne 3 (Si - milieu)
// Position 7 = ligne 4 (Ré+)
// Position 9 = ligne 5 (Fa+)

this.notePositions = {
  'C': { 'sol': -1, 'fa': 3 },  // Do
  'D': { 'sol': 0, 'fa': 4 },   // Ré
  'E': { 'sol': 1, 'fa': 5 },   // Mi
  'F': { 'sol': 2, 'fa': 6 },   // Fa
  'G': { 'sol': 3, 'fa': 0 },   // Sol
  'A': { 'sol': 4, 'fa': 1 },   // La
  'B': { 'sol': 5, 'fa': 2 }    // Si
}
```

**Méthodes principales :**
- `render(scoreData, container)` → void
  - Point d'entrée principal
  - Crée le canvas et orchestre le dessin
- `drawStaff(ctx, clef, yOffset)` → void (5 lignes horizontales)
- `drawClef(ctx, clef)` → void (symbole 𝄞 ou 𝄢)
- `drawKeySignature(ctx, keySignature, startX, clef)` → number (altérations à la clef)
- `drawTimeSignature(ctx, timeSignature, startX)` → number (chiffrage)
- `drawNotes(ctx, notes, startX, clef)` → void
- `drawNote(ctx, note, x, clef, staffY)` → number
- `drawChord(ctx, chord, x, clef, staffY)` → number
- `drawRest(ctx, rest, x, staffY)` → number
- `drawBarline(ctx, x, staffY, isDouble)` → void
- `drawLedgerLines(ctx, x, position, staffY)` → void (lignes supplémentaires)

**Calcul de position Y :**
```javascript
getYPosition(position, staffY = null) {
  const staffBottom = (staffY || this.config.marginTop) + (4 * this.config.staffLineSpacing);
  const spacing = this.config.staffLineSpacing / 2;
  return staffBottom - (position * spacing);
}
```

**Octaves :**
- Chaque octave = décalage de 7 positions (7 notes : Do Ré Mi Fa Sol La Si)
- Position finale = `basePosition + (octave * 7)`
- Exemple : Do+ → position -1 + 7 = 6

**Barres de mesure :**
- Automatiques tous les 4 temps (pour 4/4)
- Barre double à la fin
- TODO : adapter au chiffrage réel

**Retour à la ligne :**
- À partir de x > 850px, nouvelle portée 150px plus bas
- Canvas agrandi dynamiquement

**Symboles Unicode utilisés :**
- Clef de sol : `𝄞` (U+1D11E)
- Clef de fa : `𝄢` (U+1D122)
- Dièse : `♯` (U+266F)
- Bémol : `♭` (U+266D)
- Bécarre : `♮` (U+266E)
- Silences : tous dessinés géométriquement (Canvas path API)

### `app.js` - Orchestration

**Responsabilité** : Gestion des événements utilisateur et coordination Parser ↔ Renderer.

**Fonctions principales :**
- `init()` → Initialisation au chargement de la page
- `handleRender()` → Génère la partition (parse + render)
- `handleExample()` → Charge un exemple prédéfini
- `handleClear()` → Efface tout
- `handleExportPNG()` → Exporte la partition en PNG
- `setExportButtonState(enabled)` → Active/désactive le bouton d'export

**Événements :**
- Clic sur "Générer la partition" → `handleRender()`
- Clic sur "Exemple" → `handleExample()`
- Clic sur "Effacer" → `handleClear()`
- Clic sur "Exporter en PNG" → `handleExportPNG()`
- `Ctrl+Enter` dans textarea → `handleRender()`

**Gestion d'erreurs :**
- `try/catch` autour du parsing et du rendu
- Affichage des erreurs dans `#error-message` avec scroll automatique

## 🎨 Design (styles.css)

- **Palette** : Dégradé violet (667eea → 764ba2)
- **Typographie** :
  - Titres : Segoe UI / sans-serif
  - Code/saisie : Courier New / monospace
- **Responsive** : Desktop optimisé, support tablet/mobile basique
- **États** :
  - Focus : bordure bleue + ombre
  - Hover : transformation subtile
  - Erreur : fond rouge clair + bordure rouge

## 📥 Export PNG

L'application permet d'exporter la partition générée sous forme d'image PNG.

### Fonctionnement

1. **Génération de l'image** : 
   - Utilise `canvas.toDataURL('image/png')` pour convertir le canvas en data URL
   - Format PNG pour garantir la qualité et la transparence

2. **Nom du fichier** :
   - Basé sur le titre de la partition (extrait de `.score-title`)
   - Nettoyage automatique : accents supprimés, espaces → tirets, caractères spéciaux filtrés
   - Exemple : `"Au clair de la lune"` → `au-clair-de-la-lune.png`
   - Par défaut : `partition.png` si pas de titre

3. **Téléchargement** :
   - Création d'un lien `<a>` temporaire avec attribut `download`
   - Click programmatique pour déclencher le téléchargement
   - Nettoyage du lien après téléchargement

### État du bouton

- **Désactivé** (`disabled`) :
  - Au chargement de la page
  - Après "Effacer"
  - En cas d'erreur de génération
- **Activé** :
  - Après une génération réussie de la partition

## 🎹 Export MIDI

L'application permet d'exporter la partition générée sous forme de fichier MIDI standard (.mid).

### Fonctionnement

1. **Format MIDI** :
   - Standard MIDI File (SMF) Format 0 (piste unique)
   - Encodage binaire selon la spécification MIDI 1.0
   - PPQ (Pulses Per Quarter note) = 480 ticks

2. **Structure du fichier** :
   - **Header chunk (MThd)** : Format, nombre de pistes, division temporelle
   - **Track chunk (MTrk)** : Événements MIDI (tempo, time signature, notes)

3. **Événements générés** :
   - **Meta events** :
     - Track Name (0xFF 0x03) : titre de la partition
     - Set Tempo (0xFF 0x51) : tempo en microsecondes par noire
     - Time Signature (0xFF 0x58) : chiffrage de mesure
   - **Note events** :
     - Note On (0x90) : début de note
     - Note Off (0x80) : fin de note
   - **End of Track (0xFF 0x2F)** : fin du track

4. **Conversion notes → MIDI** :
   - Système MIDI standard : C4 (Do médium) = 60
   - Plage MIDI : 0-127 (clamping automatique)
   - Altérations : dièse +1 demi-ton, bémol -1 demi-ton

5. **Nom du fichier** :
   - Basé sur le titre de la partition (nettoyage identique à PNG)
   - Exemple : `"Au clair de la lune"` → `au-clair-de-la-lune.mid`
   - Par défaut : `partition.mid` si pas de titre

6. **Nom des pistes** :
   - Utilise les noms officiels du standard General MIDI (ex: "Acoustic Grand Piano", "Violin")
   - Format 0 (mono-instrument) : nom GM de l'instrument sélectionné
   - Format 1 (multi-instruments) : chaque piste porte le nom GM de son instrument

7. **Téléchargement** :
   - Blob de type `audio/midi`
   - Lien temporaire avec attribut `download`
   - Nettoyage automatique après téléchargement

### Module midi-export.js

**Classe** : `MidiExporter`

**Méthodes principales** :
- `noteToMidiNumber(note, alteration, octave)` → number (0-127)
- `generateMidiEvents(scoreData)` → Array (événements MIDI avec ticks)
- `buildHeaderChunk(format, numTracks, ppq)` → Array (bytes du header MThd)
- `buildTrackChunk(scoreData, events, program, channel, trackName)` → Array (bytes du track MTrk)
- `export(scoreData, filename, program)` → void (Format 0, télécharge le fichier)
- `exportMultiTrack(scoreData, filename, instruments)` → void (Format 1, multi-pistes)
- `generateMidiFile(scoreData, program)` → Blob (Format 0, en mémoire)

**Fonctions utilitaires** :
- `writeVarLength(value)` → Array (Variable Length Quantity MIDI)
- `writeString(str)` → Array (bytes ASCII)
- `writeUint16(value)` → Array (2 bytes big-endian)
- `writeUint32(value)` → Array (4 bytes big-endian)

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

### État du bouton

- **Désactivé** : Au chargement, après "Effacer", en cas d'erreur
- **Activé** : Après génération réussie de la partition

### Compatibilité

Les fichiers MIDI générés (Format 0 et Format 1) sont compatibles avec :
- Lecteurs audio : VLC, Windows Media Player, QuickTime
- Logiciels de notation : MuseScore, Finale, Sibelius
- DAWs : GarageBand, Logic Pro, Ableton Live, FL Studio
- Synthétiseurs et instruments MIDI externes

### Limitations

- ⚠️ Pas de support des nuances (velocity fixe à 80)
- ⚠️ Pas d'informations de clef ou d'armure dans le fichier MIDI
- ⚠️ Pas de support des ornements ou articulations
- ⚠️ Maximum 16 instruments simultanés (limitation MIDI)
- ⚠️ Toutes les pistes jouent les mêmes notes (pas de polyphonie réelle avec notes différentes)

## ⚙️ Mode d'optimisation de l'armure

L'application dispose d'un mode d'optimisation qui trouve automatiquement la meilleure armure à la clef pour minimiser les altérations accidentelles sur la partition.

### Fonctionnement

1. **Activation** : Checkbox dans la modale "Options avancées" (bouton ⚙️)
2. **État par défaut** : Activé (coché)
3. **Algorithme** : Teste les 15 armures possibles (0 à 7 dièses, 0 à 7 bémols), choisit celle qui minimise les altérations dans les mesures
4. **Impact** : 
   - Activé : `optimizeKeySignature()` est appelé avant le rendu
   - Désactivé : L'armure saisie par l'utilisateur est conservée telle quelle

### Cas d'usage

- **Optimisation ON** (recommandé) : Pour les partitions sans armure définie ou pour trouver automatiquement la tonalité optimale
- **Optimisation OFF** : Pour conserver l'armure exacte spécifiée par l'utilisateur (respect strict de la saisie)

### Architecture

- **Méthode** : `Renderer.optimizeKeySignature(scoreData)` → retourne un nouveau `scoreData` avec l'armure optimisée
- **État** : `Renderer.setOptimizationMode(boolean)` → contrôle le mode pendant le rendu
- **UI** : Checkbox `#optimization-mode` dans `#transpose-modal`

## 🔧 Comment ajouter une fonctionnalité

### Ajouter un nouveau symbole musical

1. **Parser** : Ajouter la syntaxe dans `parseNotes()` ou créer une nouvelle méthode
2. **Structure de données** : Définir le format de l'objet retourné
3. **Renderer** : Créer une méthode `draw[Symbol]()`
4. **Appeler** depuis `drawNotes()`

Exemple : ajouter les nuances (forte, piano) :
```javascript
// 1. Parser
parseNuance(token) {
  if (token === 'f') return { type: 'nuance', value: 'forte' };
  if (token === 'p') return { type: 'nuance', value: 'piano' };
  return null;
}

// 2. Renderer
drawNuance(ctx, nuance, x, staffY) {
  const y = (staffY || this.config.marginTop) + 60;
  ctx.font = 'italic 16px serif';
  ctx.fillText(nuance.value === 'forte' ? 'f' : 'p', x, y);
}
```

### Ajouter un export PDF

1. Inclure une bibliothèque : [jsPDF](https://github.com/parallax/jsPDF)
2. Dans `app.js`, créer `handleExportPDF()`
3. Capturer le canvas : `canvas.toDataURL()`
4. Insérer dans PDF et déclencher le téléchargement

### Ajouter un nouvel instrument MIDI

Pour ajouter un instrument dans la liste de sélection :

1. **Dans `app.js`**, ajouter l'instrument au dictionnaire `INSTRUMENTS` :

```javascript
const INSTRUMENTS = {
    // ...
    'saxophone': { name: 'Saxophone', program: 65, emoji: '🎷', gmName: 'Alto Sax' }
};
```

2. Les numéros de programme MIDI standards (General MIDI) et leurs noms officiels :
   - 0 : Acoustic Grand Piano
   - 24 : Acoustic Guitar (nylon)
   - 40 : Violin
   - 56 : Trumpet
   - 65 : Alto Sax
   - 73 : Flute

3. Consulter la liste complète des noms GM : https://en.wikipedia.org/wiki/General_MIDI#Program_change_events

4. L'instrument apparaît automatiquement dans la modale de sélection.

5. Aucune modification nécessaire dans `midi-export.js` (gère tous les instruments via leur numéro de programme et nom GM).

### Changer les positions des notes

**⚠️ ATTENTION** : Les positions sont critiques et interconnectées.

- Modifier `this.notePositions` dans `renderer.js`
- Vérifier l'impact sur :
  - `drawKeySignature()` (altérations à la clef)
  - `drawLedgerLines()` (lignes supplémentaires)
  - Les octaves (multiplication par 7)
- **Tester exhaustivement** : Do, Ré, Mi en octave médium, +, ++, -, --

## 🎵 Lecture MIDI

L'application permet de lire la partition générée avec une synthèse audio directe dans le navigateur.

### Fonctionnement

1. **Synthèse via Web Audio API** :
   - Utilise `AudioContext` pour générer les sons directement
   - Compatible avec **tous** les navigateurs modernes (Chrome, Firefox, Safari)
   - Pas de dépendance au support MIDI natif du navigateur

2. **Génération des sons** :
   - Conversion des notes MIDI en fréquences : `f = 440 × 2^((n - 69) / 12)`
   - Oscillateurs sinusoïdaux programmés à l'avance
   - Enveloppe ADSR simplifiée (Attack, Sustain, Release)

3. **Programmation temporelle** :
   - Calcul du timing basé sur le tempo et les ticks MIDI
   - Tous les oscillateurs sont programmés à l'avance (pas de drift)
   - Arrêt propre avec rampe de gain pour éviter les clics

### Architecture

**Module** : `midi-audio-player.js`

**Classe** : `MidiAudioPlayer`

**Méthodes principales** :
- `init(audioElement, midiExporter)` → Initialise le contexte audio
- `play(scoreData)` → Programme et lance la lecture
- `scheduleNote(midiNumber, startTime, duration)` → Programme une note individuelle
- `stop()` → Arrête tous les oscillateurs en cours
- `cleanup()` → Libère les ressources audio
- `get isPlaying()` → Retourne l'état de lecture

**Configuration audio** :
- Type d'onde : `sine` (son doux)
- Gain max : 0.3 (évite la saturation)
- Attack : 10ms (évite les clics)
- Sustain : 0.2 (volume stable)
- Release : durée de la note (extinction progressive)

### État du bouton

- **Désactivé** : Au chargement, après "Effacer", en cas d'erreur
- **Activé** : Après génération réussie
- **Texte alternatif** : "🎵 Lire la partition" (repos) / "⏹️ Arrêter" (en lecture)

### Avantages

- **Compatibilité universelle** : Fonctionne sur Chrome, Firefox, Safari (desktop et mobile)
- **Arrêt instantané** : Stop propre avec rampe de gain (pas de clics)
- **Léger** : Aucune dépendance externe, synthèse native JavaScript
- **Contrôle total** : Possibilité d'ajuster l'enveloppe et le timbre

### Limitations

- **Son synthétique** : Oscillateurs simples (pas de son réaliste de piano/orchestre)
- **Pas de nuances** : Toutes les notes au même volume
- **Timbre fixe** : Onde sinusoïdale uniquement (pourrait être enrichi avec `triangle`, `sawtooth`, etc.)

## 🎷 Arrangement Jazz (Complet)

L'application permet de transformer une partition classique en arrangement jazz avec des transformations configurables.

### Fonctionnalités

1. **Swing rhythm** : Croches transformées en triolets shuffle (ratio configurable)
2. **Accords enrichis** : Extensions jazz (7ème, 9ème, 11ème, 13ème)
3. **Syncopation** : Décalages rythmiques probabilistes
4. **Walking bass** : Ligne de basse marchante automatique
5. **Ghost notes** : Ornements rythmiques subtils
6. **Détection automatique de tonalité** : Extensions adaptées au mode (majeur/mineur)

### Interface utilisateur

**Modale de configuration** (ouverte au clic sur "🎷 Arrangement Jazz") :
- **Swing Ratio** : Contrôle l'intensité du shuffle (0.5 = droit, 0.67 = standard, 0.8 = très marqué)
- **Syncopation** : Fréquence des décalages (0-100%)
- **Tempo Multiplier** : Accélération du tempo (1.0 = original, 1.5 = +50%)
- **Walking Bass** : Active/désactive la génération de basse marchante
- **Ghost Notes** : Active/désactive les ornements rythmiques
- **Extensions d'accords** : Sélection des extensions à appliquer (7ème, 9ème, 11ème, 13ème)

### Module jazz-transformer.js

**Classe** : `JazzTransformer`

**Configuration** :
```javascript
this.config = {
    swingRatio: 0.67,              // Ratio pour le swing (2/3)
    syncopationProbability: 0.3,   // 30% de chances de syncopation
    walkingBassEnabled: false,     // Walking bass
    tempoMultiplier: 1.1,          // Tempo +10%
    chordExtensions: ['7th'],      // Extensions à appliquer
    ghostNoteProbability: 0        // 0 = désactivé, 0.3 = 30% de chances
}
```

**Méthodes principales** :
- `transform(scoreData)` → scoreData jazzifié
- `applySwing(notes)` → notes avec swing rhythm
- `enrichChords(notes)` → accords avec extensions (7ème, 9ème, 11ème, 13ème)
- `applySyncopation(notes)` → notes avec décalages rythmiques
- `generateWalkingBass(notes)` → ligne de basse marchante
- `addGhostNotes(notes)` → notes avec ornements subtils
- `detectKey(notes)` → {tonic: 'C', mode: 'major'|'minor'}

### Algorithmes

**Walking Bass** :
- Pour chaque accord, génère 4 noires (temps forts)
- Pattern : fondamentale → tierce → quinte → note de passage chromatique
- Note de passage : approche chromatique de la prochaine fondamentale

**Détection de tonalité** :
- Algorithme de Krumhansl-Schmuckler
- Analyse statistique des notes (fréquence de chaque degré chromatique)
- Comparaison avec les profils majeur et mineur
- Retour de la tonalité avec le meilleur score de corrélation

**Extensions d'accords** :
- Détection automatique majeur/mineur (analyse de la tierce)
- Majeur : 7ème majeure (11 demi-tons), mineur : 7ème mineure (10 demi-tons)
- 9ème = 14 demi-tons, 11ème = 17 demi-tons, 13ème = 21 demi-tons

**Ghost Notes** :
- Probabilité configurable (défaut 30% quand activé)
- Ajout d'une double-croche chromatique (+1 demi-ton)
- Raccourcissement de la note principale pour faire de la place

### Rendu multi-portée

Quand `scoreData.bassLine` est présent :
- **Portée supérieure** (clef de sol) : mélodie et accords
- **Portée inférieure** (clef de fa) : walking bass
- Espacement vertical : 150px entre les portées
- Synchronisation : même armure, même chiffrage, mêmes barres de mesure

### Tests

Fichiers de test dans `test/` :
- `test/jazz-transformer.test.js` : Tests unitaires (Mocha/Chai)
- `test/test-runner.html` : Runner navigateur

### État du bouton

- **Désactivé** : Au chargement, après "Effacer", en cas d'erreur
- **Activé** : Après génération réussie d'une partition
- **Action** : Ouvre la modale de configuration jazz

### Limitations

- ⚠️ La syncopation et les ghost notes sont probabilistes (non reproductibles)
- ⚠️ La walking bass suppose des accords de durée entière (pas de croches)
- ⚠️ Les extensions d'accords utilisent toujours des intervalles fixes (pas d'altérations contextuelles)
- ⚠️ La détection de tonalité peut échouer sur des partitions atonales ou modales

## 📂 Import MIDI

L'application permet d'importer un fichier MIDI (.mid) et de le convertir en notation française pour l'afficher et l'éditer.

### Fonctionnement

1. **Sélection du fichier** : Clic sur "📂 Importer MIDI" → sélecteur de fichiers
2. **Parsing** : Extraction des notes et du tempo (autres features MIDI ignorées)
3. **Sélection de piste** : Si multi-pistes, modale avec aperçu (nombre de notes, plage, durée)
4. **Conversion** : scoreData → notation française → remplissage de la textarea
5. **Génération** : Rendu automatique de la partition

### Formats supportés

- **MIDI Format 0** : Piste unique (import direct)
- **MIDI Format 1** : Multi-pistes (sélection manuelle)
- **MIDI Format 2** : Non supporté (erreur)

### Features MIDI extraites

- **Notes** : Note On (0x90) et Note Off (0x80)
- **Tempo** : Set Tempo meta-event (0xFF 0x51)
- **Nom de piste** : Track Name meta-event (0xFF 0x03)

### Features MIDI ignorées

Toutes les autres features sont ignorées silencieusement :
- Contrôleurs (CC, 0xB0)
- Pitch bend (0xE0)
- Program Change (0xC0)
- Channel/Polyphonic Pressure (0xD0, 0xA0)
- SysEx (0xF0, 0xF7)
- Autres meta-events (paroles, marqueurs, etc.)

### Module midi-import.js

**Classe** : `MidiImporter`

**Méthodes principales** :
- `parseMidiFile(arrayBuffer)` → `ParsedMidiFile`
- `trackToScoreData(track, ppq, defaultTempo)` → `scoreData`

**Méthodes privées** :
- `parseHeader(buffer, offset)` → header info
- `parseTrack(buffer, offset, ppq, trackIndex)` → `MidiTrack`
- `parseEvent(buffer, offset, statusByte, currentTick, track)` → event info
- `parseMetaEvent(buffer, offset, track)` → meta-event info
- `readVarLength(buffer, offset)` → VLQ value
- `closeNoteOn(notes, midiNumber, currentTick)` → calcule durée
- `midiNumberToNote(midiNumber)` → {note, alteration, octave}

### Conversion MIDI → Notation française

- **Numérotation MIDI** : C4 (Do médium) = 60
- **Altérations** : Préférence pour les dièses (Do# plutôt que Réb)
- **Silences** : Ajoutés automatiquement pour combler les gaps entre notes
- **Tempo** : Converti de μs/quarter en BPM
- **Armure** : Vide par défaut (pas d'information dans MIDI)
- **Chiffrage** : 4/4 par défaut

### Interface utilisateur

**Modale de sélection de piste** :
- Liste verticale de cartes cliquables
- Informations par piste : nom, nombre de notes, plage, durée, tempo
- Bouton "Annuler"

### Limitations

- ⚠️ Pas de support des accords simultanés (polyphonie intra-tick) → convertis en notes séparées
- ⚠️ Pas d'extraction du Time Signature (toujours 4/4 par défaut)
- ⚠️ Pas de support des nuances (velocity ignorée)
- ⚠️ Pas de détection automatique de clef (toujours clef de sol)
- ⚠️ Pas de détection automatique d'armure (optimisation manuelle possible via options avancées)

## 🐛 Bugs connus / Limitations

- ✅ ~~Do et Ré médiums mal positionnés~~ → Corrigé
- ✅ ~~Clef de fa mal centrée~~ → Corrigé
- ✅ ~~"Sol" détecté comme silence~~ → Corrigé
- ✅ ~~Bémols non reconnus (Mib)~~ → Corrigé
- ⚠️ Barres de mesure : calculées sur 4 temps fixes (ne s'adapte pas au chiffrage)
- ⚠️ Pas de validation de la cohérence des mesures (sous-remplies ou sur-remplies)
- ℹ️ L'optimisation de l'armure est activée par défaut mais peut être désactivée dans les options avancées
- ✅ ~~Pas de support multi-voix~~ → Implémenté via export MIDI multi-pistes (Format 1)
- ✅ ~~Pas d'export PNG~~ → Implémenté
- ✅ ~~Pas d'export MIDI~~ → Implémenté
- ✅ ~~Lecture MIDI : problème de support navigateur (Chrome)~~ → Corrigé via Web Audio API
- ✅ ~~Walking bass non implémenté~~ → Implémenté avec notes de passage chromatiques
- ✅ ~~Pas de détection de tonalité~~ → Implémenté (Krumhansl-Schmuckler)
- ⚠️ Lecture MIDI : son synthétique (oscillateurs simples), pas de son réaliste
- ⚠️ Lecture MIDI : la sélection d'instrument n'affecte PAS le bouton "Lire la partition" (son synthétique uniforme), seulement l'export MIDI
- ⚠️ Pas d'export PDF pour l'instant (nécessite une bibliothèque externe)

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

## 📚 Ressources

### Notation musicale
- [Théorie musicale de base](https://fr.wikipedia.org/wiki/Solf%C3%A8ge)
- [Clef de sol](https://fr.wikipedia.org/wiki/Clef_de_sol)
- [Clef de fa](https://fr.wikipedia.org/wiki/Clef_de_fa)

### Techniques
- [Canvas API](https://developer.mozilla.org/fr/docs/Web/API/Canvas_API)
- [Musical Symbols Unicode](https://en.wikipedia.org/wiki/Musical_Symbols_(Unicode_block))

### Bibliothèques similaires
- [VexFlow](https://www.vexflow.com/) - Moteur de rendu musical (non utilisé ici pour rester vanilla)
- [abcjs](https://abcjs.net/) - Notation ABC

## 🚀 Déploiement

### GitHub Pages

1. Commit et push le projet
2. Settings → Pages → Source: main branch
3. L'app sera disponible à `https://[username].github.io/music-helper/`

### Local

Ouvrir simplement `index.html` dans un navigateur moderne (Chrome, Firefox, Safari, Edge).

Aucun serveur requis ! 🎉

## 🎓 Pour les débutants

### Lire le code

1. Commencez par `app.js` → Comprenez le flux utilisateur
2. Regardez `parser.js` → Voyez comment le texte devient des données
3. Explorez `renderer.js` → Découvrez le dessin sur Canvas

### Concepts clés

- **Canvas** : Zone de dessin pixel par pixel (comme Paint, mais en code)
- **Parsing** : Transformer du texte en structures exploitables
- **Regex** : Motifs pour reconnaître des patterns dans le texte
- **Event listeners** : Écouter les actions utilisateur (clics, touches)

### Exercices

1. Changer les couleurs (dans `styles.css`)
2. Ajouter un nouvel exemple (dans `handleExample()`)
3. Modifier le tempo par défaut (dans `parseTempo()`)
4. Dessiner un nouveau symbole sur la portée

---

**Créé avec ❤️ pour les musiciens et les développeurs débutants.**

*Bonne musique et bon code ! 🎵💻*
