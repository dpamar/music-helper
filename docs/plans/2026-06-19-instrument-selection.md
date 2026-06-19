# Plan d'implémentation : Sélection d'instrument pour l'export MIDI

> For agentic workers: implement this plan task-by-task with red-green-refactor discipline. One task, one commit. Never batch.

## Vue d'ensemble

Permettre à l'utilisateur de choisir un instrument MIDI lors de l'export, parmi une liste prédéfinie (piano, guitare, violon, flûte, accordéon, contrebasse, hautbois, trompette).

## Contraintes techniques

- 100% client-side (HTML/CSS/JS vanilla, pas de framework)
- Style cohérent avec le reste de l'application (dégradé violet)
- Accessibilité : modal fermable au clavier (Escape)
- MIDI Program Change : l'instrument est sélectionné via l'événement MIDI 0xC0 (Program Change)

## Mapping instruments → MIDI Program Number

Les numéros de programme MIDI standard (General MIDI Level 1) :

```javascript
const INSTRUMENTS = {
    'piano': { name: 'Piano', program: 0, emoji: '🎹' },
    'guitare': { name: 'Guitare', program: 24, emoji: '🎸' },
    'violon': { name: 'Violon', program: 40, emoji: '🎻' },
    'flute': { name: 'Flûte', program: 73, emoji: '🪈' },
    'accordeon': { name: 'Accordéon', program: 21, emoji: '🪗' },
    'contrebasse': { name: 'Contrebasse', program: 43, emoji: '🎼' },
    'hautbois': { name: 'Hautbois', program: 68, emoji: '🎼' },
    'trompette': { name: 'Trompette', program: 56, emoji: '🎺' }
};
```

## Modifications de fichiers

### 1. index.html
- Ajouter une modale cachée par défaut (`#instrument-modal`)
- Contient une liste de boutons (un par instrument)
- Bouton "Fermer" pour annuler

### 2. styles.css
- Styles pour la modale (overlay + contenu centré)
- Grille de boutons d'instruments (2 colonnes responsive)
- Animation d'apparition/disparition
- États hover/focus pour accessibilité

### 3. midi-export.js
- Ajouter `program` en paramètre optionnel de `export()` et `generateMidiFile()`
- Dans `buildTrackChunk()`, insérer un événement **Program Change (0xC0)** au début du track (delta time 0)
- Format : `[0x00, 0xC0 | channel, program]`

### 4. app.js
- Modifier `handleExportMIDI()` pour ouvrir la modale au lieu d'exporter directement
- Ajouter `showInstrumentModal()` qui affiche la modale
- Ajouter `handleInstrumentSelection(instrumentKey)` qui :
  - Ferme la modale
  - Appelle `midiExporter.export(currentScoreData, filename, program)`
- Attacher les événements aux boutons d'instruments
- Gérer la fermeture de la modale (clic sur overlay, bouton "Fermer", touche Escape)

---

## Tâches détaillées (à implémenter dans l'ordre)

---

### Tâche 1 : Ajouter la constante des instruments dans app.js

**Description** : Définir la liste des instruments avec leurs métadonnées (nom, emoji, program MIDI).

**Code à ajouter** (après les instances globales, ligne ~14 de app.js) :

```javascript
// Mapping des instruments disponibles
const INSTRUMENTS = {
    'piano': { name: 'Piano', program: 0, emoji: '🎹' },
    'guitare': { name: 'Guitare', program: 24, emoji: '🎸' },
    'violon': { name: 'Violon', program: 40, emoji: '🎻' },
    'flute': { name: 'Flûte', program: 73, emoji: '🪈' },
    'accordeon': { name: 'Accordéon', program: 21, emoji: '🪗' },
    'contrebasse': { name: 'Contrebasse', program: 43, emoji: '🎼' },
    'hautbois': { name: 'Hautbois', program: 68, emoji: '🎼' },
    'trompette': { name: 'Trompette', program: 56, emoji: '🎺' }
};
```

**Résultat attendu** : Constante définie, aucun changement de comportement.

**Commit message** : `feat(midi): add instruments mapping for MIDI export`

---

### Tâche 2 : Ajouter la modale HTML pour la sélection d'instrument

**Description** : Créer la structure HTML de la modale cachée par défaut.

**Code à ajouter** (dans index.html, juste avant `</body>`, ligne ~65) :

```html
<!-- Modale de sélection d'instrument -->
<div id="instrument-modal" class="modal-overlay" style="display: none;">
    <div class="modal-content">
        <h2>Choisissez un instrument</h2>
        <div id="instrument-grid" class="instrument-grid">
            <!-- Les boutons seront générés dynamiquement par JavaScript -->
        </div>
        <button id="btn-cancel-instrument" class="btn-secondary" style="margin-top: 1rem;">
            Annuler
        </button>
    </div>
</div>
```

**Résultat attendu** : Modale invisible au chargement, structure HTML en place.

**Commit message** : `feat(ui): add instrument selection modal structure`

---

### Tâche 3 : Ajouter les styles CSS pour la modale

**Description** : Styler la modale, l'overlay et la grille d'instruments.

**Code à ajouter** (dans styles.css, à la fin du fichier) :

```css
/* Modale de sélection d'instrument */
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    animation: fadeIn 0.2s ease-out;
}

.modal-content {
    background: white;
    border-radius: 12px;
    padding: 2rem;
    max-width: 500px;
    width: 90%;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    animation: slideUp 0.3s ease-out;
}

.modal-content h2 {
    margin-top: 0;
    color: #667eea;
    text-align: center;
}

.instrument-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
    margin: 1.5rem 0;
}

.instrument-button {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 8px;
    padding: 1rem;
    font-size: 1rem;
    cursor: pointer;
    transition: transform 0.2s, box-shadow 0.2s;
    text-align: center;
    font-family: 'Segoe UI', sans-serif;
}

.instrument-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.instrument-button:active {
    transform: translateY(0);
}

.instrument-button:focus {
    outline: 2px solid #667eea;
    outline-offset: 2px;
}

/* Animations */
@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}

@keyframes slideUp {
    from {
        opacity: 0;
        transform: translateY(20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

/* Responsive */
@media (max-width: 600px) {
    .instrument-grid {
        grid-template-columns: 1fr;
    }
}
```

**Résultat attendu** : Modale stylée (non visible car `display: none` par défaut).

**Commit message** : `style(modal): add instrument selection modal styles`

---

### Tâche 4 : Implémenter showInstrumentModal() dans app.js

**Description** : Créer une fonction qui génère dynamiquement les boutons d'instruments et affiche la modale.

**Code à ajouter** (dans app.js, après `setPlayButtonState()`, ligne ~321) :

```javascript
/**
 * Affiche la modale de sélection d'instrument
 */
function showInstrumentModal() {
    const modal = document.getElementById('instrument-modal');
    const grid = document.getElementById('instrument-grid');

    // Vide la grille (au cas où elle aurait déjà été remplie)
    grid.innerHTML = '';

    // Génère les boutons d'instruments
    for (const [key, data] of Object.entries(INSTRUMENTS)) {
        const button = document.createElement('button');
        button.className = 'instrument-button';
        button.dataset.instrument = key;
        button.innerHTML = `${data.emoji}<br>${data.name}`;
        button.addEventListener('click', () => handleInstrumentSelection(key));
        grid.appendChild(button);
    }

    // Affiche la modale
    modal.style.display = 'flex';

    // Focus sur le premier bouton pour l'accessibilité
    const firstButton = grid.querySelector('.instrument-button');
    if (firstButton) {
        firstButton.focus();
    }
}
```

**Résultat attendu** : Fonction définie, mais pas encore appelée. Pas de changement visible.

**Commit message** : `feat(modal): implement showInstrumentModal function`

---

### Tâche 5 : Implémenter closeInstrumentModal() dans app.js

**Description** : Créer une fonction pour fermer la modale proprement.

**Code à ajouter** (après `showInstrumentModal()`) :

```javascript
/**
 * Ferme la modale de sélection d'instrument
 */
function closeInstrumentModal() {
    const modal = document.getElementById('instrument-modal');
    modal.style.display = 'none';
}
```

**Résultat attendu** : Fonction définie, pas encore utilisée.

**Commit message** : `feat(modal): implement closeInstrumentModal function`

---

### Tâche 6 : Implémenter handleInstrumentSelection() dans app.js

**Description** : Gérer la sélection d'un instrument (fermer modale + exporter MIDI).

**Code à ajouter** (après `closeInstrumentModal()`) :

```javascript
/**
 * Gère la sélection d'un instrument pour l'export MIDI
 * @param {string} instrumentKey - Clé de l'instrument dans INSTRUMENTS
 */
function handleInstrumentSelection(instrumentKey) {
    const instrument = INSTRUMENTS[instrumentKey];
    if (!instrument) {
        console.error(`Instrument inconnu: ${instrumentKey}`);
        return;
    }

    // Ferme la modale
    closeInstrumentModal();

    const errorDiv = document.getElementById('error-message');

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

        // Export avec le numéro de programme MIDI de l'instrument sélectionné
        midiExporter.export(currentScoreData, filename, instrument.program);

    } catch (error) {
        errorDiv.textContent = '❌ Erreur lors de l\'export MIDI: ' + error.message;
        errorDiv.style.display = 'block';
        errorDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}
```

**Résultat attendu** : Fonction définie, prête à gérer la sélection.

**Commit message** : `feat(export): implement instrument selection handler`

---

### Tâche 7 : Modifier handleExportMIDI() pour ouvrir la modale

**Description** : Au lieu d'exporter directement, afficher la modale de sélection.

**Code à remplacer** (dans app.js, lignes 236-267) :

**ANCIEN CODE** :
```javascript
function handleExportMIDI() {
    const errorDiv = document.getElementById('error-message');

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

        midiExporter.export(currentScoreData, filename);

    } catch (error) {
        errorDiv.textContent = '❌ Erreur lors de l\'export MIDI: ' + error.message;
        errorDiv.style.display = 'block';
        errorDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}
```

**NOUVEAU CODE** :
```javascript
function handleExportMIDI() {
    const errorDiv = document.getElementById('error-message');

    if (!currentScoreData) {
        errorDiv.textContent = '❌ Veuillez d\'abord générer une partition';
        errorDiv.style.display = 'block';
        errorDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        return;
    }

    // Affiche la modale de sélection d'instrument
    showInstrumentModal();
}
```

**Résultat attendu** : Clic sur "Exporter en MIDI" ouvre la modale (mais pas encore d'événements de fermeture).

**Commit message** : `refactor(export): show instrument modal on MIDI export click`

---

### Tâche 8 : Attacher les événements de fermeture de modale dans init()

**Description** : Permettre de fermer la modale via bouton "Annuler", clic sur overlay, ou touche Escape.

**Code à ajouter** (dans la fonction `init()`, après la ligne 68, juste avant `console.log('✅ Application initialisée')`) :

```javascript
    // Gestion de la modale d'instruments
    const instrumentModal = document.getElementById('instrument-modal');
    const btnCancelInstrument = document.getElementById('btn-cancel-instrument');

    // Fermer via bouton "Annuler"
    btnCancelInstrument.addEventListener('click', closeInstrumentModal);

    // Fermer via clic sur l'overlay (en dehors du contenu)
    instrumentModal.addEventListener('click', (e) => {
        if (e.target === instrumentModal) {
            closeInstrumentModal();
        }
    });

    // Fermer via touche Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && instrumentModal.style.display === 'flex') {
            closeInstrumentModal();
        }
    });
```

**Résultat attendu** : Modale fermable via bouton, overlay ou Escape.

**Test manuel** :
1. Générer une partition
2. Cliquer sur "Exporter en MIDI"
3. Vérifier que la modale s'ouvre
4. Tester fermeture via bouton "Annuler"
5. Ré-ouvrir, tester fermeture via clic hors de la modale
6. Ré-ouvrir, tester fermeture via touche Escape

**Commit message** : `feat(modal): add modal closing event handlers`

---

### Tâche 9 : Modifier midi-export.js pour accepter le paramètre program

**Description** : Ajouter le paramètre `program` (optionnel) aux méthodes `export()` et `generateMidiFile()`.

**Code à modifier** (dans midi-export.js) :

**LIGNE 321** (signature de `export()`) :

**ANCIEN** :
```javascript
export(scoreData, filename) {
```

**NOUVEAU** :
```javascript
export(scoreData, filename, program = 0) {
```

**LIGNE 326** (appel à `buildTrackChunk`) :

**ANCIEN** :
```javascript
const trackBytes = this.buildTrackChunk(scoreData, events);
```

**NOUVEAU** :
```javascript
const trackBytes = this.buildTrackChunk(scoreData, events, program);
```

**LIGNE 303** (signature de `generateMidiFile()`) :

**ANCIEN** :
```javascript
generateMidiFile(scoreData) {
```

**NOUVEAU** :
```javascript
generateMidiFile(scoreData, program = 0) {
```

**LIGNE 309** (appel à `buildTrackChunk` dans `generateMidiFile`) :

**ANCIEN** :
```javascript
const trackBytes = this.buildTrackChunk(scoreData, events);
```

**NOUVEAU** :
```javascript
const trackBytes = this.buildTrackChunk(scoreData, events, program);
```

**Résultat attendu** : Paramètre accepté mais pas encore utilisé. Comportement par défaut inchangé (program = 0 = piano).

**Commit message** : `refactor(midi): add optional program parameter to export methods`

---

### Tâche 10 : Insérer l'événement MIDI Program Change dans buildTrackChunk()

**Description** : Ajouter l'événement Program Change (0xC0) au début du track MIDI, juste après Time Signature et avant les notes.

**Code à modifier** (dans midi-export.js, méthode `buildTrackChunk()`) :

**LIGNE 225** (signature) :

**ANCIEN** :
```javascript
buildTrackChunk(scoreData, events) {
```

**NOUVEAU** :
```javascript
buildTrackChunk(scoreData, events, program = 0) {
```

**LIGNE 263** (après l'événement Time Signature, avant la boucle `for (const event of events)`) :

**Code à ajouter** :
```javascript
        // Événement MIDI : Program Change (0xC0)
        // Sélectionne l'instrument MIDI (0 = Piano, 24 = Guitare, etc.)
        trackData.push(0); // Delta time 0
        trackData.push(0xC0 | 0); // Program Change sur canal 0
        trackData.push(program); // Numéro de programme MIDI (0-127)
```

**Résultat attendu** : L'événement Program Change est inséré dans le fichier MIDI.

**Test manuel** :
1. Générer une partition
2. Exporter en MIDI, choisir "Guitare"
3. Ouvrir le fichier .mid dans un DAW ou lecteur MIDI (MuseScore, GarageBand, VLC)
4. Vérifier que le son est celui d'une guitare et non d'un piano

**Commit message** : `feat(midi): insert Program Change event for instrument selection`

---

### Tâche 11 : Modifier midi-audio-player.js pour supporter l'instrument

**Description** : Faire en sorte que le bouton "Lire la partition" utilise aussi l'instrument sélectionné (pour cohérence avec l'export).

**IMPORTANT** : Cette tâche est **optionnelle** car le `MidiAudioPlayer` utilise des oscillateurs Web Audio API (synthèse directe), pas le format MIDI. L'événement Program Change n'a aucun effet dans ce contexte.

**Options** :
1. **Ignorer** : Laisser la lecture avec le son synthétique actuel (oscillateur sinusoïdal)
2. **Future work** : Charger des samples audio par instrument (complexe, nécessite des fichiers externes)
3. **Documentation** : Ajouter une note dans CLAUDE.md expliquant la limitation

**Pour ce plan, nous choisissons l'option 3** : documenter la limitation.

**Code à ajouter** (dans CLAUDE.md, section "🐛 Bugs connus / Limitations", ligne ~250) :

```markdown
- ⚠️ Lecture MIDI : la sélection d'instrument n'affecte PAS le bouton "Lire la partition" (son synthétique uniforme), seulement l'export MIDI
```

**Résultat attendu** : Documentation mise à jour, utilisateur informé de la limitation.

**Commit message** : `docs(midi): clarify instrument selection limitation for playback`

---

### Tâche 12 : Tests manuels complets

**Description** : Valider le flux complet de sélection d'instrument.

**Procédure de test** :

1. **Ouvrir index.html dans un navigateur**
2. **Saisir une partition d'exemple** (bouton "Charger un exemple")
3. **Générer la partition** (bouton "Générer la partition")
4. **Cliquer sur "Exporter en MIDI"**
   - ✅ La modale s'ouvre
   - ✅ Les 8 instruments sont affichés avec emojis
5. **Tester fermeture sans sélection** :
   - Cliquer sur "Annuler" → modale se ferme
   - Ré-ouvrir, cliquer hors de la modale → modale se ferme
   - Ré-ouvrir, appuyer sur Escape → modale se ferme
6. **Exporter avec chaque instrument** :
   - Piano → Télécharge `au-clair-de-la-lune.mid`, ouvrir dans MuseScore → son de piano
   - Guitare → Télécharge, ouvrir → son de guitare
   - Violon → Télécharge, ouvrir → son de violon
   - Flûte → Télécharge, ouvrir → son de flûte
   - Accordéon → Télécharge, ouvrir → son d'accordéon
   - Contrebasse → Télécharge, ouvrir → son de contrebasse
   - Hautbois → Téléchargé, ouvrir → son de hautbois
   - Trompette → Télécharge, ouvrir → son de trompette
7. **Vérifier accessibilité** :
   - Navigation au clavier (Tab) dans la modale
   - Focus visible sur les boutons
   - Escape fonctionne pour fermer
8. **Vérifier responsive** :
   - Redimensionner la fenêtre → grille passe en 1 colonne sur mobile

**Résultat attendu** : Tous les tests passent, fonctionnalité complète et accessible.

**Commit message** : `test(midi): validate instrument selection flow`

---

## Résumé des changements

### Fichiers modifiés
- **index.html** : Ajout de la modale HTML
- **styles.css** : Styles de la modale et grille d'instruments
- **app.js** : Fonctions de gestion de modale + modification de `handleExportMIDI()`
- **midi-export.js** : Ajout du paramètre `program` + insertion de Program Change
- **CLAUDE.md** : Documentation de la limitation (lecture audio)

### Fichiers créés
- Aucun (modifications uniquement)

### Dépendances ajoutées
- Aucune (100% vanilla JS)

---

## Points d'attention

1. **Mapping MIDI General Level 1** : Les numéros de programme correspondent à la norme GM1. Les synthétiseurs modernes les supportent tous.

2. **Ordre des événements MIDI** : Le Program Change **DOIT** être inséré **AVANT** le premier Note On, sinon l'instrument par défaut (piano) sera utilisé pour les premières notes.

3. **Accessibilité** : La modale doit être fermable au clavier (Escape) et les boutons doivent avoir un focus visible.

4. **Responsive** : La grille d'instruments passe en 1 colonne sur mobile (< 600px).

5. **Cohérence visuelle** : Les boutons d'instruments utilisent le même dégradé violet que le reste de l'application.

6. **Validation** : Le lecteur MIDI intégré (`MidiAudioPlayer`) ne change PAS de son (limitation Web Audio API oscillateurs). Seul l'export MIDI téléchargé contiendra l'instrument sélectionné.

---

## Évolutions futures possibles

- **Prévisualisation sonore** : Jouer un court échantillon de l'instrument avant sélection
- **Instruments personnalisés** : Permettre d'ajouter des instruments via un champ de saisie
- **Multi-track** : Exporter plusieurs pistes avec des instruments différents (nécessite passage au format MIDI 1)
- **Banque de sons** : Charger des samples audio pour que le bouton "Lire la partition" utilise aussi l'instrument sélectionné

---

**Fin du plan d'implémentation**

Auteur : Claude Sonnet 4.5  
Date : 2026-06-19
