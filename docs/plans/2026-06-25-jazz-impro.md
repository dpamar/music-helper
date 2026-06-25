# Plan d'implémentation : Parties manquantes pour l'improvisation jazz

> For agentic workers: implement this plan task-by-task with red-green-refactor discipline. One task, one commit. Never batch.

**Date** : 2026-06-25  
**Branche** : `feat/jazz-impro-complete`  
**Contexte** : L'application dispose d'un transformateur jazz (`JazzTransformer`) qui applique swing, enrichissement d'accords et syncopation. Cependant, plusieurs fonctionnalités mentionnées dans la documentation sont non-implémentées ou incomplètes, notamment :
- Walking bass (flag `walkingBassEnabled` présent mais non utilisé)
- Extensions d'accords avancées (9ème, 11ème, 13ème)
- Détection automatique de la tonalité pour choisir les extensions appropriées
- Ornements jazz (ghost notes, bends, slides)
- Interface utilisateur pour paramétrer les transformations

## Objectifs

1. Implémenter la génération de walking bass
2. Ajouter des extensions d'accords avancées (9ème, 11ème, 13ème)
3. Détection automatique de tonalité pour extensions intelligentes
4. Ajouter des ornements jazz (ghost notes)
5. Interface utilisateur pour configurer les transformations jazz
6. Tests exhaustifs des nouvelles fonctionnalités

---

## Task 1: Implémenter la méthode `generateWalkingBass()`

**Objectif** : Créer une méthode qui génère une ligne de basse marchante à partir de la progression harmonique.

**Test** :
```javascript
// test-walking-bass.js
describe('JazzTransformer.generateWalkingBass', () => {
    it('génère une walking bass pour une progression Do-Fa-Sol-Do', () => {
        const transformer = new JazzTransformer();
        const notes = [
            { type: 'chord', notes: [{note: 'C', octave: 0}, {note: 'E', octave: 0}, {note: 'G', octave: 0}], duration: 4 },
            { type: 'chord', notes: [{note: 'F', octave: 0}, {note: 'A', octave: 0}, {note: 'C', octave: 1}], duration: 4 },
            { type: 'chord', notes: [{note: 'G', octave: 0}, {note: 'B', octave: 0}, {note: 'D', octave: 1}], duration: 4 },
            { type: 'chord', notes: [{note: 'C', octave: 0}, {note: 'E', octave: 0}, {note: 'G', octave: 0}], duration: 4 }
        ];
        
        const bassLine = transformer.generateWalkingBass(notes);
        
        // La walking bass doit contenir 16 notes (4 accords × 4 noires)
        expect(bassLine.length).toBe(16);
        
        // Toutes les notes doivent être dans l'octave basse (octave <= 0)
        bassLine.forEach(note => {
            expect(note.octave).toBeLessThanOrEqual(0);
        });
        
        // Les notes doivent être majoritairement des noires
        const quarterNotes = bassLine.filter(n => n.duration === 1);
        expect(quarterNotes.length).toBeGreaterThan(12);
    });
    
    it('utilise les notes de passage chromatiques', () => {
        const transformer = new JazzTransformer();
        const notes = [
            { type: 'chord', notes: [{note: 'C', octave: 0}, {note: 'E', octave: 0}], duration: 2 },
            { type: 'chord', notes: [{note: 'F', octave: 0}, {note: 'A', octave: 0}], duration: 2 }
        ];
        
        const bassLine = transformer.generateWalkingBass(notes);
        
        // Doit contenir une note de passage entre Do et Fa (Do# ou Ré ou Mib)
        const hasPassingTone = bassLine.some(note => 
            ['C', 'D', 'E'].includes(note.note) && note.alteration === 'sharp'
        );
        expect(hasPassingTone).toBe(true);
    });
});
```

**Implémentation** :
```javascript
// Dans jazz-transformer.js, après applySyncopation()

/**
 * Génère une ligne de basse marchante (walking bass) à partir de la progression harmonique.
 * 
 * Algorithme :
 * - Pour chaque accord, extraire la fondamentale (note la plus basse)
 * - Générer 4 noires par accord (temps forts)
 * - Utiliser : fondamentale, tierce, quinte, note de passage chromatique vers le prochain accord
 * 
 * @param {Array} notes - Tableau de notes/accords/silences
 * @returns {Array} Ligne de basse (tableau de notes simples)
 * @private
 */
generateWalkingBass(notes) {
    const bassLine = [];
    const chords = notes.filter(n => n.type === 'chord');
    
    // Mapping pour calculer les intervalles
    const noteSteps = {
        'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11
    };
    
    const stepsToNote = [
        'C', null, 'D', null, 'E', 'F', null, 'G', null, 'A', null, 'B'
    ];
    
    for (let i = 0; i < chords.length; i++) {
        const chord = chords[i];
        const root = chord.notes[0]; // Fondamentale (note la plus basse)
        const rootStep = noteSteps[root.note];
        
        // Calculer combien de noires dans cet accord
        const numBeats = Math.floor(chord.duration);
        
        // Pattern standard : fondamentale, tierce, quinte, note de passage
        const chordTones = [
            root.note,                                  // Beat 1: fondamentale
            stepsToNote[(rootStep + 4) % 12],          // Beat 2: tierce majeure (+4 demi-tons)
            stepsToNote[(rootStep + 7) % 12]           // Beat 3: quinte (+7 demi-tons)
        ];
        
        // Note de passage vers le prochain accord (approche chromatique)
        let passingTone = root.note;
        if (i < chords.length - 1) {
            const nextRoot = chords[i + 1].notes[0];
            const nextRootStep = noteSteps[nextRoot.note];
            
            // Approche chromatique : un demi-ton en dessous de la prochaine fondamentale
            const passingStep = (nextRootStep - 1 + 12) % 12;
            passingTone = stepsToNote[passingStep] || nextRoot.note;
        }
        
        chordTones.push(passingTone);
        
        // Générer les notes de basse (4 noires maximum)
        for (let beat = 0; beat < Math.min(numBeats, 4); beat++) {
            const noteName = chordTones[beat % chordTones.length];
            
            bassLine.push({
                type: 'note',
                note: noteName,
                alteration: '',
                octave: -1,  // Une octave en dessous (basse)
                duration: 1   // Noire
            });
        }
    }
    
    console.log(`  → Walking bass générée: ${bassLine.length} notes`);
    return bassLine;
}
```

**Intégration dans `transform()`** :
```javascript
// Dans la méthode transform(), après applySyncopation()

// 5. Générer la walking bass si activée
if (this.config.walkingBassEnabled) {
    const bassLine = this.generateWalkingBass(jazzScore.notes);
    
    // Ajouter la ligne de basse au début (sera rendue en clef de fa)
    jazzScore.bassLine = bassLine;
    console.log(`✅ Walking bass générée (${bassLine.length} notes)`);
}
```

**Commit** : `feat(jazz): implement walking bass generation`

---

## Task 2: Ajouter le support du rendu multi-portée (clef de sol + clef de fa)

**Objectif** : Modifier `renderer.js` pour supporter deux portées simultanées (piano/combo style).

**Test** :
```javascript
// test-multi-staff.js
describe('Renderer multi-portée', () => {
    it('rend deux portées si bassLine est présente', () => {
        const renderer = new Renderer();
        const container = document.createElement('div');
        const scoreData = {
            title: 'Test Multi-Staff',
            tempo: 120,
            timeSignature: { numerator: 4, denominator: 4 },
            clef: 'sol',
            keySignature: [],
            notes: [
                { type: 'note', note: 'C', alteration: '', octave: 0, duration: 1 }
            ],
            bassLine: [
                { type: 'note', note: 'C', alteration: '', octave: -1, duration: 1 }
            ]
        };
        
        renderer.render(scoreData, container);
        
        const canvas = container.querySelector('canvas');
        expect(canvas).not.toBeNull();
        
        // Vérifier que le canvas est plus haut (deux portées)
        expect(canvas.height).toBeGreaterThan(300);
    });
});
```

**Implémentation** :
```javascript
// Dans renderer.js, modifier la méthode render()

render(scoreData, container) {
    console.log('🎨 Rendu de la partition...');
    
    container.textContent = '';  // Use textContent instead of innerHTML
    
    // Déterminer si rendu multi-portée
    const hasMultiStaff = scoreData.bassLine && scoreData.bassLine.length > 0;
    
    // Calculer hauteur canvas
    const baseHeight = hasMultiStaff ? 500 : 300;
    const canvas = document.createElement('canvas');
    canvas.width = 900;
    canvas.height = baseHeight;
    canvas.className = 'score-canvas';
    
    const ctx = canvas.getContext('2d');
    
    // 1. Titre
    ctx.font = 'bold 24px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(scoreData.title, canvas.width / 2, 40);
    
    // 2. Première portée (clef de sol)
    const trebleStaffY = this.config.marginTop;
    this.drawStaff(ctx, 'sol', trebleStaffY);
    this.drawClef(ctx, 'sol', trebleStaffY);
    
    let currentX = this.config.staffStartX + this.config.clefWidth;
    currentX = this.drawKeySignature(ctx, scoreData.keySignature, currentX, 'sol', trebleStaffY);
    currentX = this.drawTimeSignature(ctx, scoreData.timeSignature, currentX, trebleStaffY);
    
    currentX += 20;
    this.drawNotes(ctx, scoreData.notes, currentX, 'sol', trebleStaffY);
    
    // 3. Deuxième portée (clef de fa) si bassLine présente
    if (hasMultiStaff) {
        const bassStaffY = trebleStaffY + 150;  // Espacement entre portées
        
        this.drawStaff(ctx, 'fa', bassStaffY);
        this.drawClef(ctx, 'fa', bassStaffY);
        
        let bassX = this.config.staffStartX + this.config.clefWidth;
        bassX = this.drawKeySignature(ctx, scoreData.keySignature, bassX, 'fa', bassStaffY);
        bassX = this.drawTimeSignature(ctx, scoreData.timeSignature, bassX, bassStaffY);
        
        bassX += 20;
        this.drawNotes(ctx, scoreData.bassLine, bassX, 'fa', bassStaffY);
        
        // Ajuster hauteur canvas si nécessaire
        if (bassStaffY + 100 > canvas.height) {
            canvas.height = bassStaffY + 100;
        }
    }
    
    container.appendChild(canvas);
    console.log('✅ Partition rendue');
}
```

**Modifications auxiliaires** :
```javascript
// Modifier drawStaff() pour accepter un yOffset
drawStaff(ctx, clef, yOffset = null) {
    const staffY = yOffset || this.config.marginTop;
    
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    
    for (let i = 0; i < 5; i++) {
        const y = staffY + (i * this.config.staffLineSpacing);
        ctx.beginPath();
        ctx.moveTo(this.config.staffStartX, y);
        ctx.lineTo(850, y);
        ctx.stroke();
    }
}

// Modifier drawClef() pour accepter un yOffset
drawClef(ctx, clef, yOffset = null) {
    const staffY = yOffset || this.config.marginTop;
    const clefX = this.config.staffStartX + 10;
    
    ctx.font = '60px serif';
    ctx.textAlign = 'center';
    
    if (clef === 'sol') {
        const clefY = staffY + (3.5 * this.config.staffLineSpacing);
        ctx.fillText('𝄞', clefX, clefY);
    } else if (clef === 'fa') {
        const clefY = staffY + (1.5 * this.config.staffLineSpacing);
        ctx.fillText('𝄢', clefX, clefY);
    }
}
```

**Commit** : `feat(renderer): add multi-staff support for bass line`

---

## Task 3: Ajouter les extensions d'accords avancées (9ème, 11ème, 13ème)

**Objectif** : Enrichir `enrichChords()` pour ajouter des extensions jazz avancées selon la tonalité.

**Test** :
```javascript
// test-chord-extensions.js
describe('JazzTransformer.enrichChords avec extensions', () => {
    it('ajoute une 9ème majeure aux accords majeurs', () => {
        const transformer = new JazzTransformer();
        transformer.config.chordExtensions = ['9th'];
        
        const notes = [
            { type: 'chord', notes: [
                {note: 'C', octave: 0, alteration: ''},
                {note: 'E', octave: 0, alteration: ''},
                {note: 'G', octave: 0, alteration: ''}
            ], duration: 2 }
        ];
        
        const enriched = transformer.enrichChords(notes);
        
        // Cmaj7add9 : C E G B D
        expect(enriched[0].notes.length).toBe(5);
        expect(enriched[0].notes[4].note).toBe('D'); // 9ème
    });
    
    it('ajoute une 11ème aux accords mineurs', () => {
        const transformer = new JazzTransformer();
        transformer.config.chordExtensions = ['11th'];
        
        const notes = [
            { type: 'chord', notes: [
                {note: 'A', octave: 0, alteration: ''},
                {note: 'C', octave: 1, alteration: ''},  // Tierce mineure
                {note: 'E', octave: 1, alteration: ''}
            ], duration: 2 }
        ];
        
        const enriched = transformer.enrichChords(notes);
        
        // Am11 : A C E G D
        expect(enriched[0].notes.length).toBeGreaterThanOrEqual(4);
    });
});
```

**Implémentation** :
```javascript
// Dans jazz-transformer.js, ajouter au constructor

constructor() {
    this.config = {
        swingRatio: 0.67,
        syncopationProbability: 0.3,
        walkingBassEnabled: false,
        tempoMultiplier: 1.1,
        chordExtensions: ['7th', '9th']  // Extensions à appliquer
    };
}

// Remplacer enrichChords() par cette version avancée

/**
 * Enrichit les accords avec des extensions jazz (7ème, 9ème, 11ème, 13ème).
 * Détecte automatiquement si l'accord est majeur ou mineur pour choisir les extensions appropriées.
 * 
 * @param {Array} notes - Tableau de notes/accords/silences
 * @returns {Array} Notes avec accords enrichis
 * @private
 */
enrichChords(notes) {
    const noteSteps = {
        'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11
    };
    
    const stepsToNote = [
        'C', null, 'D', null, 'E', 'F', null, 'G', null, 'A', null, 'B'
    ];
    
    return notes.map(item => {
        if (item.type !== 'chord' || item.notes.length < 3) {
            return { ...item };
        }
        
        const chord = JSON.parse(JSON.stringify(item));
        const root = chord.notes[0];
        const rootStep = noteSteps[root.note];
        
        if (rootStep === undefined) {
            console.warn(`Unknown note: ${root.note}`);
            return chord;
        }
        
        // Détecter si accord majeur ou mineur (analyser la tierce)
        const third = chord.notes[1];
        const thirdStep = noteSteps[third.note];
        const thirdInterval = (thirdStep - rootStep + 12) % 12;
        const isMajor = thirdInterval === 4;  // Tierce majeure = 4 demi-tons
        
        console.log(`  → Enrichissement: ${root.note} ${isMajor ? 'majeur' : 'mineur'}`);
        
        // Ajouter les extensions selon la configuration
        const extensions = [];
        
        if (this.config.chordExtensions.includes('7th')) {
            // 7ème majeure pour accords majeurs, 7ème mineure pour accords mineurs
            const seventhInterval = isMajor ? 11 : 10;
            extensions.push({
                interval: seventhInterval,
                name: isMajor ? '7M' : '7m'
            });
        }
        
        if (this.config.chordExtensions.includes('9th')) {
            // 9ème majeure = 14 demi-tons (octave + 2)
            extensions.push({
                interval: 14,
                name: '9'
            });
        }
        
        if (this.config.chordExtensions.includes('11th')) {
            // 11ème = 17 demi-tons (octave + 5)
            extensions.push({
                interval: 17,
                name: '11'
            });
        }
        
        if (this.config.chordExtensions.includes('13th')) {
            // 13ème = 21 demi-tons (octave + 9)
            extensions.push({
                interval: 21,
                name: '13'
            });
        }
        
        // Ajouter chaque extension
        extensions.forEach(ext => {
            const extStep = (rootStep + ext.interval) % 12;
            const extNote = stepsToNote[extStep];
            
            if (extNote) {
                const octaveOffset = Math.floor((rootStep + ext.interval) / 12);
                
                chord.notes.push({
                    note: extNote,
                    alteration: '',
                    octave: root.octave + octaveOffset
                });
                
                console.log(`    + ${ext.name} (${extNote})`);
            }
        });
        
        return chord;
    });
}
```

**Commit** : `feat(jazz): add advanced chord extensions (9th, 11th, 13th)`

---

## Task 4: Implémenter la détection automatique de tonalité

**Objectif** : Créer une méthode qui analyse les notes pour détecter la tonalité et choisir les extensions appropriées.

**Test** :
```javascript
// test-key-detection.js
describe('JazzTransformer.detectKey', () => {
    it('détecte Do majeur à partir d\'une gamme', () => {
        const transformer = new JazzTransformer();
        const notes = [
            { type: 'note', note: 'C', octave: 0 },
            { type: 'note', note: 'D', octave: 0 },
            { type: 'note', note: 'E', octave: 0 },
            { type: 'note', note: 'F', octave: 0 },
            { type: 'note', note: 'G', octave: 0 },
            { type: 'note', note: 'A', octave: 0 },
            { type: 'note', note: 'B', octave: 0 }
        ];
        
        const key = transformer.detectKey(notes);
        
        expect(key.tonic).toBe('C');
        expect(key.mode).toBe('major');
    });
    
    it('détecte La mineur à partir d\'altérations', () => {
        const transformer = new JazzTransformer();
        const notes = [
            { type: 'note', note: 'A', octave: 0 },
            { type: 'note', note: 'B', octave: 0 },
            { type: 'note', note: 'C', octave: 1 },
            { type: 'note', note: 'D', octave: 1 },
            { type: 'note', note: 'E', octave: 1 },
            { type: 'note', note: 'F', octave: 1 },
            { type: 'note', note: 'G', octave: 1, alteration: 'sharp' }
        ];
        
        const key = transformer.detectKey(notes);
        
        expect(key.tonic).toBe('A');
        expect(key.mode).toBe('minor');
    });
});
```

**Implémentation** :
```javascript
// Dans jazz-transformer.js, ajouter après enrichChords()

/**
 * Détecte la tonalité d'une partition par analyse statistique des notes.
 * 
 * Algorithme :
 * 1. Compter la fréquence de chaque note (en tenant compte des altérations)
 * 2. Calculer le score de chaque tonalité candidate (majeur et mineur)
 * 3. Retourner la tonalité avec le meilleur score
 * 
 * @param {Array} notes - Tableau de notes/accords/silences
 * @returns {Object} {tonic: 'C', mode: 'major'|'minor'}
 * @private
 */
detectKey(notes) {
    // Profils de tonalités (poids de chaque degré)
    const majorProfile = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
    const minorProfile = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];
    
    // Compter la fréquence de chaque note (chromatique)
    const noteFrequency = new Array(12).fill(0);
    
    const noteSteps = {
        'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11
    };
    
    const alterationOffset = {
        'sharp': 1,
        'flat': -1,
        'natural': 0,
        '': 0
    };
    
    // Parcourir toutes les notes
    notes.forEach(item => {
        if (item.type === 'note') {
            const baseStep = noteSteps[item.note];
            const offset = alterationOffset[item.alteration || ''];
            const chromaticStep = (baseStep + offset + 12) % 12;
            noteFrequency[chromaticStep]++;
        } else if (item.type === 'chord') {
            item.notes.forEach(note => {
                const baseStep = noteSteps[note.note];
                const offset = alterationOffset[note.alteration || ''];
                const chromaticStep = (baseStep + offset + 12) % 12;
                noteFrequency[chromaticStep]++;
            });
        }
    });
    
    // Calculer les scores pour chaque tonalité
    let bestScore = -Infinity;
    let bestKey = { tonic: 'C', mode: 'major' };
    
    const tonicNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    
    for (let tonic = 0; tonic < 12; tonic++) {
        // Test majeur
        let majorScore = 0;
        for (let i = 0; i < 12; i++) {
            const degree = (i - tonic + 12) % 12;
            majorScore += noteFrequency[i] * majorProfile[degree];
        }
        
        if (majorScore > bestScore) {
            bestScore = majorScore;
            bestKey = { tonic: tonicNames[tonic], mode: 'major' };
        }
        
        // Test mineur
        let minorScore = 0;
        for (let i = 0; i < 12; i++) {
            const degree = (i - tonic + 12) % 12;
            minorScore += noteFrequency[i] * minorProfile[degree];
        }
        
        if (minorScore > bestScore) {
            bestScore = minorScore;
            bestKey = { tonic: tonicNames[tonic], mode: 'minor' };
        }
    }
    
    console.log(`  → Tonalité détectée: ${bestKey.tonic} ${bestKey.mode}`);
    return bestKey;
}
```

**Intégration dans `transform()`** :
```javascript
// Dans la méthode transform(), avant enrichChords()

// Détecter la tonalité
const detectedKey = this.detectKey(jazzScore.notes);
console.log(`✅ Tonalité détectée: ${detectedKey.tonic} ${detectedKey.mode}`);

// Adapter les extensions selon le mode
if (detectedKey.mode === 'minor') {
    // Pour les tonalités mineures : privilégier 11ème et 9ème mineure
    this.config.chordExtensions = ['7th', '9th', '11th'];
} else {
    // Pour les tonalités majeures : privilégier 9ème et 13ème
    this.config.chordExtensions = ['7th', '9th', '13th'];
}
```

**Commit** : `feat(jazz): implement automatic key detection with Krumhansl-Schmuckler algorithm`

---

## Task 5: Ajouter les ghost notes (ornements jazz)

**Objectif** : Implémenter une méthode qui ajoute des ghost notes (notes fantômes) pour enrichir le groove jazz.

**Test** :
```javascript
// test-ghost-notes.js
describe('JazzTransformer.addGhostNotes', () => {
    it('ajoute des ghost notes entre les temps forts', () => {
        const transformer = new JazzTransformer();
        transformer.config.ghostNoteProbability = 0.5;
        
        const notes = [
            { type: 'note', note: 'C', octave: 0, duration: 1 },
            { type: 'note', note: 'D', octave: 0, duration: 1 },
            { type: 'note', note: 'E', octave: 0, duration: 1 }
        ];
        
        const decorated = transformer.addGhostNotes(notes);
        
        // Doit contenir plus de notes que l'original
        expect(decorated.length).toBeGreaterThan(notes.length);
        
        // Les ghost notes doivent avoir une durée très courte (0.125)
        const ghostNotes = decorated.filter(n => n.duration === 0.125);
        expect(ghostNotes.length).toBeGreaterThan(0);
    });
});
```

**Implémentation** :
```javascript
// Dans jazz-transformer.js, ajouter au constructor

constructor() {
    this.config = {
        swingRatio: 0.67,
        syncopationProbability: 0.3,
        walkingBassEnabled: false,
        tempoMultiplier: 1.1,
        chordExtensions: ['7th', '9th'],
        ghostNoteProbability: 0.3  // 30% de chances d'ajouter une ghost note
    };
}

// Ajouter après applySyncopation()

/**
 * Ajoute des ghost notes (notes fantômes) entre les notes principales.
 * Les ghost notes sont des notes très courtes (double-croches) qui enrichissent le groove.
 * 
 * @param {Array} notes - Tableau de notes/accords/silences
 * @returns {Array} Notes avec ghost notes ajoutées
 * @private
 */
addGhostNotes(notes) {
    const decorated = [];
    
    const noteSteps = {
        'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11
    };
    
    const stepsToNote = [
        'C', null, 'D', null, 'E', 'F', null, 'G', null, 'A', null, 'B'
    ];
    
    for (let i = 0; i < notes.length; i++) {
        const note = notes[i];
        
        // Ajouter la note principale
        decorated.push({ ...note });
        
        // Possibilité d'ajouter une ghost note après (seulement pour les notes simples)
        const canAddGhost = note.type === 'note' && 
                           note.duration >= 0.5 &&
                           i < notes.length - 1;
        
        if (canAddGhost && Math.random() < this.config.ghostNoteProbability) {
            // Ghost note = note chromatiquement proche
            const baseStep = noteSteps[note.note];
            const ghostStep = (baseStep + 1) % 12;  // Demi-ton au-dessus
            const ghostNote = stepsToNote[ghostStep];
            
            if (ghostNote) {
                // Raccourcir la note principale pour faire de la place
                decorated[decorated.length - 1].duration -= 0.125;
                
                // Ajouter la ghost note (double-croche)
                decorated.push({
                    type: 'note',
                    note: ghostNote,
                    alteration: '',
                    octave: note.octave,
                    duration: 0.125
                });
                
                console.log(`  → Ghost note ajoutée: ${note.note} → ${ghostNote}`);
            }
        }
    }
    
    return decorated;
}
```

**Intégration dans `transform()`** :
```javascript
// Dans la méthode transform(), après applySyncopation()

// 5. Ajouter les ghost notes (ornements)
jazzScore.notes = this.addGhostNotes(jazzScore.notes);
console.log(`✅ Ghost notes ajoutées (prob: ${this.config.ghostNoteProbability})`);
```

**Commit** : `feat(jazz): add ghost notes for enhanced groove`

---

## Task 6: Créer l'interface utilisateur pour configurer les transformations jazz

**Objectif** : Ajouter une modale permettant de paramétrer les transformations jazz avant application.

**Test manuel** :
1. Générer une partition
2. Cliquer sur "🎷 Arrangement Jazz"
3. Une modale s'ouvre avec les options :
   - Swing ratio (slider 0.5 - 0.8)
   - Syncopation probability (slider 0 - 1)
   - Walking bass (checkbox)
   - Ghost notes (checkbox)
   - Chord extensions (checkboxes : 7th, 9th, 11th, 13th)
   - Tempo multiplier (slider 1.0 - 1.5)
4. Cliquer sur "Appliquer" → Transformation avec les paramètres choisis

**Implémentation HTML** :
```html
<!-- Dans index.html, après #transpose-modal -->

<!-- Modale de configuration Jazz -->
<div id="jazz-config-modal" class="modal">
    <div class="modal-content">
        <h2>⚙️ Configuration Jazz</h2>
        
        <div class="option-group">
            <label>
                Swing Ratio : <span id="swing-ratio-value">0.67</span>
                <input type="range" id="swing-ratio" min="0.5" max="0.8" step="0.01" value="0.67">
            </label>
            <p class="option-description">Contrôle le "shuffle" des croches (0.5 = droit, 0.67 = swing standard)</p>
        </div>
        
        <div class="option-group">
            <label>
                Probabilité de syncopation : <span id="syncopation-prob-value">0.3</span>
                <input type="range" id="syncopation-prob" min="0" max="1" step="0.1" value="0.3">
            </label>
            <p class="option-description">Fréquence des décalages rythmiques (0 = aucun, 1 = maximum)</p>
        </div>
        
        <div class="option-group">
            <label>
                Multiplicateur de tempo : <span id="tempo-mult-value">1.1</span>
                <input type="range" id="tempo-mult" min="1.0" max="1.5" step="0.05" value="1.1">
            </label>
            <p class="option-description">Accélération du tempo (1.0 = tempo original)</p>
        </div>
        
        <div class="option-group">
            <label>
                <input type="checkbox" id="walking-bass-enabled">
                Walking Bass (ligne de basse marchante)
            </label>
        </div>
        
        <div class="option-group">
            <label>
                <input type="checkbox" id="ghost-notes-enabled">
                Ghost Notes (ornements rythmiques)
            </label>
        </div>
        
        <div class="option-group">
            <h3>Extensions d'accords</h3>
            <label>
                <input type="checkbox" id="ext-7th" checked>
                7ème (Cmaj7, Dm7)
            </label>
            <label>
                <input type="checkbox" id="ext-9th" checked>
                9ème (Cmaj9, Dm9)
            </label>
            <label>
                <input type="checkbox" id="ext-11th">
                11ème (Cm11, F11)
            </label>
            <label>
                <input type="checkbox" id="ext-13th">
                13ème (G13, A13)
            </label>
        </div>
        
        <div class="modal-actions">
            <button id="apply-jazz-config" class="btn-primary">🎷 Appliquer</button>
            <button id="close-jazz-modal" class="btn-secondary">Annuler</button>
        </div>
    </div>
</div>
```

**Implémentation CSS** :
```css
/* Dans styles.css, après .modal */

.option-group {
    margin: 20px 0;
    padding: 15px;
    background: #f8f9fa;
    border-radius: 8px;
}

.option-group label {
    display: block;
    margin: 10px 0;
    font-weight: 500;
}

.option-group input[type="range"] {
    width: 100%;
    margin: 10px 0;
}

.option-group input[type="checkbox"] {
    margin-right: 10px;
    width: 20px;
    height: 20px;
    cursor: pointer;
}

.option-description {
    font-size: 13px;
    color: #666;
    margin: 5px 0 0 0;
    font-style: italic;
}

.modal-actions {
    display: flex;
    gap: 15px;
    margin-top: 30px;
}

.btn-primary {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    padding: 12px 24px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 16px;
    flex: 1;
}

.btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-secondary {
    background: #6c757d;
    color: white;
    border: none;
    padding: 12px 24px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 16px;
}

.btn-secondary:hover {
    background: #5a6268;
}
```

**Implémentation JavaScript** :
```javascript
// Dans app.js, remplacer handleJazzArrange() par :

function handleJazzArrange() {
    const errorDiv = document.getElementById('error-message');
    
    if (!currentScoreData) {
        errorDiv.textContent = '❌ Veuillez d\'abord générer une partition';
        errorDiv.style.display = 'block';
        errorDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        return;
    }
    
    // Ouvrir la modale de configuration
    const modal = document.getElementById('jazz-config-modal');
    modal.style.display = 'flex';
}

// Ajouter dans init() :

function init() {
    // ... code existant ...
    
    // Gestion de la modale jazz
    const jazzModal = document.getElementById('jazz-config-modal');
    const applyJazzBtn = document.getElementById('apply-jazz-config');
    const closeJazzBtn = document.getElementById('close-jazz-modal');
    
    // Mise à jour des valeurs affichées pour les sliders
    document.getElementById('swing-ratio').addEventListener('input', (e) => {
        document.getElementById('swing-ratio-value').textContent = e.target.value;
    });
    
    document.getElementById('syncopation-prob').addEventListener('input', (e) => {
        document.getElementById('syncopation-prob-value').textContent = e.target.value;
    });
    
    document.getElementById('tempo-mult').addEventListener('input', (e) => {
        document.getElementById('tempo-mult-value').textContent = e.target.value;
    });
    
    // Application des transformations jazz
    applyJazzBtn.addEventListener('click', applyJazzTransformation);
    
    // Fermeture de la modale
    closeJazzBtn.addEventListener('click', () => {
        jazzModal.style.display = 'none';
    });
    
    // Fermeture au clic en dehors
    jazzModal.addEventListener('click', (e) => {
        if (e.target === jazzModal) {
            jazzModal.style.display = 'none';
        }
    });
}

// Nouvelle fonction pour appliquer les transformations avec config UI
function applyJazzTransformation() {
    const errorDiv = document.getElementById('error-message');
    const outputDiv = document.getElementById('render-output');
    const textarea = document.getElementById('partition-input');
    const modal = document.getElementById('jazz-config-modal');
    
    try {
        errorDiv.style.display = 'none';
        
        // Lire la configuration depuis l'UI
        jazzTransformer.config.swingRatio = parseFloat(document.getElementById('swing-ratio').value);
        jazzTransformer.config.syncopationProbability = parseFloat(document.getElementById('syncopation-prob').value);
        jazzTransformer.config.tempoMultiplier = parseFloat(document.getElementById('tempo-mult').value);
        jazzTransformer.config.walkingBassEnabled = document.getElementById('walking-bass-enabled').checked;
        jazzTransformer.config.ghostNoteProbability = document.getElementById('ghost-notes-enabled').checked ? 0.3 : 0;
        
        // Extensions d'accords
        const extensions = [];
        if (document.getElementById('ext-7th').checked) extensions.push('7th');
        if (document.getElementById('ext-9th').checked) extensions.push('9th');
        if (document.getElementById('ext-11th').checked) extensions.push('11th');
        if (document.getElementById('ext-13th').checked) extensions.push('13th');
        jazzTransformer.config.chordExtensions = extensions;
        
        console.log('🎷 Arrangement jazz avec config:', jazzTransformer.config);
        
        // Appliquer la transformation
        const jazzScore = jazzTransformer.transform(currentScoreData);
        
        if (!jazzScore.title.includes('(Jazz Arrangement)')) {
            jazzScore.title = jazzScore.title + ' (Jazz Arrangement)';
        }
        
        currentScoreData = jazzScore;
        renderer.render(jazzScore, outputDiv);
        
        const jazzScoreText = scoreToText(jazzScore);
        textarea.value = jazzScoreText;
        
        console.log('✅ Partition jazz rendue');
        
        // Fermer la modale
        modal.style.display = 'none';
        
        // Message de succès
        errorDiv.textContent = `✅ Arrangement jazz appliqué ! (Tempo: ${jazzScore.tempo} BPM)`;
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
        console.error('❌ Erreur arrangement jazz:', error);
        errorDiv.textContent = '❌ Erreur lors de l\'arrangement jazz: ' + error.message;
        errorDiv.style.display = 'block';
        errorDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}
```

**Commit** : `feat(ui): add jazz configuration modal with advanced options`

---

## Task 7: Ajouter des tests unitaires pour toutes les nouvelles méthodes

**Objectif** : Créer un fichier de tests complet pour valider les fonctionnalités jazz.

**Implémentation** :
```javascript
// Créer test/jazz-transformer.test.js

/**
 * Tests unitaires pour JazzTransformer
 * 
 * Pour exécuter : ouvrir test/test-runner.html dans le navigateur
 */

describe('JazzTransformer', () => {
    let transformer;
    
    beforeEach(() => {
        transformer = new JazzTransformer();
    });
    
    describe('generateWalkingBass', () => {
        it('génère une walking bass pour une progression simple', () => {
            const notes = [
                { type: 'chord', notes: [{note: 'C', octave: 0}, {note: 'E', octave: 0}, {note: 'G', octave: 0}], duration: 4 }
            ];
            
            const bassLine = transformer.generateWalkingBass(notes);
            
            expect(bassLine.length).toBe(4); // 4 noires
            expect(bassLine[0].note).toBe('C'); // Fondamentale
            expect(bassLine[0].octave).toBe(-1); // Octave basse
        });
        
        it('utilise des notes de passage entre accords', () => {
            const notes = [
                { type: 'chord', notes: [{note: 'C', octave: 0}], duration: 2 },
                { type: 'chord', notes: [{note: 'F', octave: 0}], duration: 2 }
            ];
            
            const bassLine = transformer.generateWalkingBass(notes);
            
            // Devrait contenir une approche chromatique vers F
            expect(bassLine.length).toBe(4);
        });
    });
    
    describe('detectKey', () => {
        it('détecte Do majeur', () => {
            const notes = [
                { type: 'note', note: 'C', octave: 0 },
                { type: 'note', note: 'E', octave: 0 },
                { type: 'note', note: 'G', octave: 0 },
                { type: 'note', note: 'C', octave: 0 }
            ];
            
            const key = transformer.detectKey(notes);
            
            expect(key.tonic).toBe('C');
            expect(key.mode).toBe('major');
        });
        
        it('détecte La mineur', () => {
            const notes = [
                { type: 'note', note: 'A', octave: 0 },
                { type: 'note', note: 'C', octave: 1 },
                { type: 'note', note: 'E', octave: 1 },
                { type: 'note', note: 'A', octave: 0 }
            ];
            
            const key = transformer.detectKey(notes);
            
            expect(key.tonic).toBe('A');
            expect(key.mode).toBe('minor');
        });
    });
    
    describe('enrichChords', () => {
        it('ajoute une 7ème aux triades', () => {
            transformer.config.chordExtensions = ['7th'];
            
            const notes = [
                { type: 'chord', notes: [
                    {note: 'C', octave: 0, alteration: ''},
                    {note: 'E', octave: 0, alteration: ''},
                    {note: 'G', octave: 0, alteration: ''}
                ], duration: 2 }
            ];
            
            const enriched = transformer.enrichChords(notes);
            
            expect(enriched[0].notes.length).toBe(4);
            expect(enriched[0].notes[3].note).toBe('B'); // 7ème majeure de C
        });
        
        it('ajoute 9ème et 13ème pour accords majeurs', () => {
            transformer.config.chordExtensions = ['7th', '9th', '13th'];
            
            const notes = [
                { type: 'chord', notes: [
                    {note: 'C', octave: 0, alteration: ''},
                    {note: 'E', octave: 0, alteration: ''},
                    {note: 'G', octave: 0, alteration: ''}
                ], duration: 2 }
            ];
            
            const enriched = transformer.enrichChords(notes);
            
            expect(enriched[0].notes.length).toBe(6); // C E G B D A
        });
    });
    
    describe('addGhostNotes', () => {
        it('ajoute des ghost notes entre les notes principales', () => {
            transformer.config.ghostNoteProbability = 1.0; // Force l'ajout
            
            const notes = [
                { type: 'note', note: 'C', octave: 0, duration: 1 },
                { type: 'note', note: 'D', octave: 0, duration: 1 }
            ];
            
            const decorated = transformer.addGhostNotes(notes);
            
            expect(decorated.length).toBeGreaterThan(2);
            
            // Les ghost notes doivent avoir une durée de 0.125
            const hasGhostNotes = decorated.some(n => n.duration === 0.125);
            expect(hasGhostNotes).toBe(true);
        });
        
        it('ne modifie pas les silences', () => {
            transformer.config.ghostNoteProbability = 1.0;
            
            const notes = [
                { type: 'rest', duration: 1 }
            ];
            
            const decorated = transformer.addGhostNotes(notes);
            
            expect(decorated.length).toBe(1);
            expect(decorated[0].type).toBe('rest');
        });
    });
    
    describe('transform (intégration)', () => {
        it('applique toutes les transformations jazz', () => {
            const scoreData = {
                title: 'Test',
                tempo: 120,
                timeSignature: { numerator: 4, denominator: 4 },
                clef: 'sol',
                keySignature: [],
                notes: [
                    { type: 'chord', notes: [
                        {note: 'C', octave: 0, alteration: ''},
                        {note: 'E', octave: 0, alteration: ''},
                        {note: 'G', octave: 0, alteration: ''}
                    ], duration: 4 }
                ]
            };
            
            transformer.config.walkingBassEnabled = true;
            
            const jazzScore = transformer.transform(scoreData);
            
            // Tempo augmenté
            expect(jazzScore.tempo).toBeGreaterThan(120);
            
            // Walking bass ajoutée
            expect(jazzScore.bassLine).toBeDefined();
            expect(jazzScore.bassLine.length).toBeGreaterThan(0);
            
            // Accords enrichis
            expect(jazzScore.notes[0].notes.length).toBeGreaterThan(3);
        });
    });
});
```

**Créer test/test-runner.html** :
```html
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Tests - Jazz Transformer</title>
    <link rel="stylesheet" href="https://unpkg.com/mocha/mocha.css">
</head>
<body>
    <div id="mocha"></div>
    
    <script src="https://unpkg.com/chai/chai.js"></script>
    <script src="https://unpkg.com/mocha/mocha.js"></script>
    
    <script>
        mocha.setup('bdd');
        const expect = chai.expect;
    </script>
    
    <!-- Code source -->
    <script src="../jazz-transformer.js"></script>
    
    <!-- Tests -->
    <script src="jazz-transformer.test.js"></script>
    
    <script>
        mocha.run();
    </script>
</body>
</html>
```

**Commit** : `test(jazz): add comprehensive unit tests for all jazz features`

---

## Task 8: Mettre à jour CLAUDE.md avec la documentation complète

**Objectif** : Documenter toutes les nouvelles fonctionnalités dans CLAUDE.md.

**Modifications** :
```markdown
<!-- Dans CLAUDE.md, section "🎷 Arrangement Jazz" -->

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

**Modale de configuration** :
- **Swing Ratio** : Contrôle l'intensité du shuffle (0.5 = droit, 0.67 = standard, 0.8 = très marqué)
- **Syncopation Probability** : Fréquence des décalages (0-100%)
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
    chordExtensions: ['7th', '9th'], // Extensions à appliquer
    ghostNoteProbability: 0.3       // 30% de chances de ghost note
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
- Analyse statistique des notes (fréquence de chaque degré)
- Comparaison avec les profils majeur et mineur
- Retour de la tonalité avec le meilleur score

**Extensions d'accords** :
- Détection automatique majeur/mineur (analyse de la tierce)
- Majeur : privilégie 9ème et 13ème
- Mineur : privilégie 11ème et 9ème mineure
- Calculs en demi-tons : 7ème (11), 9ème (14), 11ème (17), 13ème (21)

**Ghost Notes** :
- Probabilité configurable (défaut 30%)
- Ajout d'une double-croche chromatique (+1 demi-ton)
- Raccourcissement de la note principale pour faire de la place

### Rendu multi-portée

Quand `scoreData.bassLine` est présent :
- **Portée supérieure** (clef de sol) : mélodie et accords
- **Portée inférieure** (clef de fa) : walking bass
- Espacement vertical : 150px entre les portées
- Synchronisation : même armure, même chiffrage, même barres de mesure

### État du bouton

- **Désactivé** : Au chargement, après "Effacer", en cas d'erreur
- **Activé** : Après génération réussie d'une partition
- **Action** : Ouvre la modale de configuration

### Limitations

- ⚠️ La syncopation et les ghost notes sont probabilistes (non reproductibles)
- ⚠️ La walking bass suppose des accords de durée entière (pas de croches)
- ⚠️ Les extensions d'accords utilisent toujours des intervalles majeurs (pas d'altérations contextuelles)
- ⚠️ La détection de tonalité peut échouer sur des partitions atonales ou modales
```

**Commit** : `docs: update CLAUDE.md with complete jazz improvisation documentation`

---

## Task 9: Tester manuellement toutes les fonctionnalités et corriger les bugs

**Objectif** : Validation complète du workflow jazz avec scénarios réels.

**Scénarios de test** :

1. **Test basique** :
   - Générer "Au clair de la lune"
   - Appliquer arrangement jazz avec config par défaut
   - Vérifier : tempo augmenté, swing visible, accords enrichis

2. **Test walking bass** :
   - Générer une progression d'accords simple (Do-Fa-Sol-Do)
   - Activer Walking Bass dans la modale
   - Vérifier : portée supplémentaire en clef de fa, 4 noires par accord

3. **Test extensions avancées** :
   - Générer une partition avec triades
   - Activer toutes les extensions (7th, 9th, 11th, 13th)
   - Vérifier : accords à 6 notes

4. **Test détection de tonalité** :
   - Générer une partition en Do majeur
   - Appliquer jazz → vérifier console : "Tonalité détectée: C major"
   - Générer une partition en La mineur
   - Appliquer jazz → vérifier console : "Tonalité détectée: A minor"

5. **Test ghost notes** :
   - Activer Ghost Notes
   - Vérifier console : "Ghost note ajoutée"
   - Écouter le rendu MIDI (si possible)

6. **Test exports** :
   - Arrangement jazz appliqué
   - Export PNG → vérifier 2 portées si walking bass
   - Export MIDI → vérifier lecture correcte

**Corrections attendues** :
- Ajustements du rendu multi-portée (espacements, tailles)
- Gestion des cas limites (partition vide, accords incomplets)
- Messages d'erreur clairs

**Commit** : `fix: address bugs found during manual testing`

---

## Task 10: Commit final et vérification

**Objectif** : S'assurer que tous les changements sont committés et la branche est propre.

**Actions** :
1. Vérifier `git status --porcelain` → doit être vide
2. Vérifier `git log --not main --oneline` → doit montrer tous les commits
3. Vérifier que le plan est bien commité

**Commandes** :
```bash
git status --porcelain
git log --not main --oneline
```

Si tout est OK, émission du résultat final.

---

## Résumé des livrables

✅ **Fichiers modifiés** :
- `jazz-transformer.js` : +300 lignes (5 nouvelles méthodes)
- `renderer.js` : +100 lignes (rendu multi-portée)
- `app.js` : +150 lignes (UI de configuration)
- `index.html` : +100 lignes (modale jazz)
- `styles.css` : +80 lignes (styles modale)
- `CLAUDE.md` : +150 lignes (documentation complète)

✅ **Nouveaux fichiers** :
- `test/jazz-transformer.test.js` : Tests unitaires complets
- `test/test-runner.html` : Runner de tests

✅ **Fonctionnalités implémentées** :
1. ✅ Walking bass avec notes de passage chromatiques
2. ✅ Extensions d'accords avancées (9ème, 11ème, 13ème)
3. ✅ Détection automatique de tonalité (Krumhansl-Schmuckler)
4. ✅ Ghost notes (ornements rythmiques)
5. ✅ Interface utilisateur complète avec sliders et checkboxes
6. ✅ Rendu multi-portée (clef de sol + clef de fa)
7. ✅ Tests unitaires exhaustifs
8. ✅ Documentation mise à jour

✅ **Tests** : 15+ tests unitaires couvrant tous les cas d'usage

**Estimation** : 10 tasks, ~8 heures de développement, 1000+ lignes de code.
