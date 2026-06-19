> For agentic workers: implement this plan task-by-task with red-green-refactor discipline. One task, one commit. Never batch.

# Plan : Nommer les pistes MIDI avec les noms officiels General MIDI

## Contexte

L'application exporte des fichiers MIDI (Format 0 et Format 1). Actuellement, les noms de pistes utilisent les noms d'instruments en français tels que définis dans le dictionnaire `INSTRUMENTS` de `app.js` (ex: "Piano", "Guitare", "Violon").

L'objectif est de **remplacer ces noms français par les noms officiels du standard General MIDI** dans les pistes du fichier MIDI généré. Cela améliorera la compatibilité avec les lecteurs MIDI et logiciels de notation musicale qui s'attendent à des noms standard.

## Référence General MIDI

Les noms officiels General MIDI pour les instruments actuellement supportés sont :

| Program | Nom français actuel | Nom officiel GM           |
|---------|---------------------|---------------------------|
| 0       | Piano               | Acoustic Grand Piano      |
| 13      | Xylophone           | Xylophone                 |
| 16      | Orgue               | Drawbar Organ             |
| 21      | Accordéon           | Accordion                 |
| 24      | Guitare             | Acoustic Guitar (nylon)   |
| 26      | Guitare électrique  | Electric Guitar (jazz)    |
| 40      | Violon              | Violin                    |
| 43      | Contrebasse         | Contrabass                |
| 56      | Trompette           | Trumpet                   |
| 68      | Hautbois            | Oboe                      |
| 73      | Flûte               | Flute                     |
| 109     | Cornemuse           | Bag pipe                  |

## Modifications requises

### Fichier `app.js`

Ajouter une propriété `gmName` (nom officiel General MIDI) à chaque instrument dans le dictionnaire `INSTRUMENTS` :

```javascript
const INSTRUMENTS = {
    'piano': { name: 'Piano', program: 0, emoji: '🎹', gmName: 'Acoustic Grand Piano' },
    'guitare': { name: 'Guitare', program: 24, emoji: '🎸', gmName: 'Acoustic Guitar (nylon)' },
    'violon': { name: 'Violon', program: 40, emoji: '🎻', gmName: 'Violin' },
    'flute': { name: 'Flûte', program: 73, emoji: '🪈', gmName: 'Flute' },
    'accordeon': { name: 'Accordéon', program: 21, emoji: '🪗', gmName: 'Accordion' },
    'contrebasse': { name: 'Contrebasse', program: 43, emoji: '🎼', gmName: 'Contrabass' },
    'hautbois': { name: 'Hautbois', program: 68, emoji: '🎼', gmName: 'Oboe' },
    'trompette': { name: 'Trompette', program: 56, emoji: '🎺', gmName: 'Trumpet' },
    'xylophone': { name: 'Xylophone', program: 13, emoji: '🎼', gmName: 'Xylophone' },
    'guitare électrique': { name: 'Guitare électrique', program: 26, emoji: '🎸', gmName: 'Electric Guitar (jazz)' },
    'cornemuse': { name: 'Cornemuse', program: 109, emoji: '🎼', gmName: 'Bag pipe' },
    'orgue': { name: 'Orgue', program: 16, emoji: '🎼', gmName: 'Drawbar Organ' }
};
```

### Fichier `midi-export.js`

Modifier la méthode `buildTrackChunk()` pour **utiliser le nom GM (`gmName`) au lieu du nom français (`name`)** lors de la génération du Track Name event (meta event 0x03).

**Actuellement** (ligne 236) :
```javascript
const name = trackName || scoreData.title;
```

**Après modification** :
Le nom de piste doit être le nom GM seul (pas de concaténation avec le titre de la partition).

Modifier la méthode `exportMultiTrack()` (ligne 386) pour passer le `gmName` au lieu d'une concaténation :

**Actuellement** (ligne 386) :
```javascript
const trackName = `${instrument.name} - ${scoreData.title || 'Partition'}`;
```

**Après modification** :
```javascript
const trackName = instrument.gmName || instrument.name;
```

### Fichier `CLAUDE.md`

Mettre à jour la documentation pour refléter l'utilisation des noms General MIDI dans les pistes :

1. **Section "Export MIDI"**, sous-section "Nom du fichier" (ligne ~420) : Ajouter une note précisant que les noms de pistes utilisent les noms officiels GM.

2. **Section "Ajouter un nouvel instrument MIDI"** (ligne ~460) : Ajouter une colonne `gmName` dans les instructions pour ajouter un instrument :

```markdown
### Ajouter un nouvel instrument MIDI

Pour ajouter un instrument dans la liste de sélection :

1. **Dans `app.js`**, ajouter l'instrument au dictionnaire `INSTRUMENTS` :

\`\`\`javascript
const INSTRUMENTS = {
    // ...
    'saxophone': { name: 'Saxophone', program: 65, emoji: '🎷', gmName: 'Alto Sax' }
};
\`\`\`

2. Les numéros de programme MIDI standards (General MIDI) :
   - 0 : Acoustic Grand Piano
   - 24 : Acoustic Guitar (nylon)
   - 40 : Violin
   - 56 : Trumpet
   - 65 : Alto Sax
   - 73 : Flute

3. Consulter la liste complète : https://en.wikipedia.org/wiki/General_MIDI#Program_change_events

4. L'instrument apparaît automatiquement dans la modale de sélection.
```

## Plan d'implémentation

### Tâche 1 : Ajouter les noms GM dans le dictionnaire INSTRUMENTS

**Fichier** : `app.js`

**Changement** :
- Ajouter la propriété `gmName` à chaque objet instrument dans `INSTRUMENTS`
- Utiliser les noms officiels General MIDI du tableau de référence ci-dessus

**Test** :
- Ouvrir la console navigateur
- Vérifier que `INSTRUMENTS['piano'].gmName === 'Acoustic Grand Piano'`
- Vérifier tous les instruments

**Commit** : `feat(midi): add General MIDI official names to INSTRUMENTS dictionary`

---

### Tâche 2 : Utiliser gmName pour les noms de pistes en Format 1 (multi-pistes)

**Fichier** : `midi-export.js`

**Changement** :
- Modifier `exportMultiTrack()` ligne 386
- Remplacer `${instrument.name} - ${scoreData.title || 'Partition'}` par `instrument.gmName || instrument.name`

**Test manuel** :
1. Ouvrir `index.html` dans le navigateur
2. Charger l'exemple "Au clair de la lune"
3. Générer la partition
4. Cliquer sur "Exporter en MIDI"
5. Sélectionner 2 instruments (ex: Piano + Violon)
6. Valider et télécharger le fichier `.mid`
7. Ouvrir le fichier dans un logiciel MIDI (MuseScore, VLC, ou en ligne via https://signal.vercel.app/edit)
8. Vérifier que les noms de pistes sont "Acoustic Grand Piano" et "Violin" (pas "Piano" et "Violon")

**Commit** : `feat(midi): use General MIDI official names for track names in Format 1 export`

---

### Tâche 3 : Utiliser gmName pour le nom de piste en Format 0 (mono-piste)

**Fichier** : `midi-export.js`

**Changement** :
- Modifier `export()` ligne 336
- Actuellement, `buildTrackChunk()` est appelé avec `trackName = null`, donc utilise `scoreData.title`
- Ajouter un paramètre optionnel `gmName` à `export()` et le passer à `buildTrackChunk()`

**Implémentation** :

```javascript
export(scoreData, filename, program = 0, gmName = null) {
    const ppq = 480;

    const events = this.generateMidiEvents(scoreData);

    const headerBytes = this.buildHeaderChunk(0, 1, ppq);
    const trackBytes = this.buildTrackChunk(scoreData, events, program, 0, gmName);

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

**Fichier** : `app.js`

**Changement** :
- Dans `handleValidateInstruments()`, si un seul instrument est sélectionné, passer le `gmName` à `export()` :

```javascript
if (selectedInstrumentsArray.length === 1) {
    const instrument = selectedInstrumentsArray[0];
    midiExporter.export(currentScoreData, filename, instrument.program, instrument.gmName);
} else {
    midiExporter.exportMultiTrack(currentScoreData, filename, selectedInstrumentsArray);
}
```

**Test manuel** :
1. Ouvrir `index.html` dans le navigateur
2. Charger l'exemple "Au clair de la lune"
3. Générer la partition
4. Cliquer sur "Exporter en MIDI"
5. Sélectionner 1 seul instrument (ex: Piano)
6. Valider et télécharger le fichier `.mid`
7. Ouvrir le fichier dans un logiciel MIDI (MuseScore, VLC, ou en ligne via https://signal.vercel.app/edit)
8. Vérifier que le nom de la piste est "Acoustic Grand Piano" (pas "Piano" ou "Au clair de la lune")

**Commit** : `feat(midi): use General MIDI official names for track name in Format 0 export`

---

### Tâche 4 : Mettre à jour la documentation CLAUDE.md

**Fichier** : `CLAUDE.md`

**Changements** :

1. **Section "Export MIDI"** (vers ligne 420) : Ajouter une note sur les noms de pistes

```markdown
5. **Nom du fichier** :
   - Basé sur le titre de la partition (nettoyage identique à PNG)
   - Exemple : `"Au clair de la lune"` → `au-clair-de-la-lune.mid`
   - Par défaut : `partition.mid` si pas de titre

6. **Nom des pistes** :
   - Utilise les noms officiels du standard General MIDI (ex: "Acoustic Grand Piano", "Violin")
   - Format 0 (mono-instrument) : nom GM de l'instrument sélectionné
   - Format 1 (multi-instruments) : chaque piste porte le nom GM de son instrument
```

2. **Section "Ajouter un nouvel instrument MIDI"** (vers ligne 460) : Ajouter `gmName` dans l'exemple

```markdown
### Ajouter un nouvel instrument MIDI

Pour ajouter un instrument dans la liste de sélection :

1. **Dans `app.js`**, ajouter l'instrument au dictionnaire `INSTRUMENTS` :

\`\`\`javascript
const INSTRUMENTS = {
    // ...
    'saxophone': { name: 'Saxophone', program: 65, emoji: '🎷', gmName: 'Alto Sax' }
};
\`\`\`

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
```

**Test** :
- Lire la documentation complète
- Vérifier la cohérence avec le code
- Vérifier que les nouveaux développeurs comprennent comment ajouter un instrument avec son nom GM

**Commit** : `docs(midi): document General MIDI official names usage in track names`

---

### Tâche 5 : Test end-to-end complet

**Scénario de test** :

1. **Test Format 0 (mono-instrument)** :
   - Charger l'exemple "Au clair de la lune"
   - Générer la partition
   - Exporter en MIDI avec 1 seul instrument (Piano)
   - Ouvrir le fichier dans MuseScore
   - Vérifier : nom de piste = "Acoustic Grand Piano"

2. **Test Format 1 (multi-instruments)** :
   - Charger l'exemple "Au clair de la lune"
   - Générer la partition
   - Exporter en MIDI avec 3 instruments (Piano, Violon, Flûte)
   - Ouvrir le fichier dans MuseScore
   - Vérifier : noms de pistes = "Acoustic Grand Piano", "Violin", "Flute"

3. **Test avec tous les instruments** :
   - Charger l'exemple "Au clair de la lune"
   - Générer la partition
   - Exporter en MIDI avec TOUS les 12 instruments
   - Ouvrir le fichier dans MuseScore
   - Vérifier : les 12 noms de pistes correspondent aux noms GM du tableau de référence

4. **Test de compatibilité** :
   - Ouvrir le fichier exporté dans VLC (lecture audio)
   - Ouvrir le fichier exporté dans GarageBand (si disponible)
   - Ouvrir le fichier exporté dans un éditeur MIDI en ligne (ex: https://signal.vercel.app/edit)
   - Vérifier : le fichier est lisible et les noms de pistes sont corrects

**Si tous les tests passent** : tout est OK.

**Si un test échoue** : corriger le bug, tester à nouveau, et faire un nouveau commit de fix.

**Commit final** (si nécessaire) : `fix(midi): correct GM name handling for edge case X`

---

## Checklist de validation

- [ ] Tous les instruments dans `INSTRUMENTS` ont une propriété `gmName`
- [ ] Les noms GM correspondent exactement au standard General MIDI (vérifier sur https://en.wikipedia.org/wiki/General_MIDI#Program_change_events)
- [ ] Export Format 0 (mono-piste) utilise le nom GM
- [ ] Export Format 1 (multi-pistes) utilise les noms GM pour chaque piste
- [ ] La documentation `CLAUDE.md` est à jour
- [ ] Les tests manuels end-to-end passent (MuseScore, VLC, éditeur en ligne)
- [ ] Le code est abondamment commenté (pour les débutants)
- [ ] Aucune régression : l'export MIDI fonctionne toujours pour mono et multi-pistes
- [ ] Les fichiers exportés sont compatibles avec les logiciels MIDI standard

---

## Notes pour le développeur

- **Attention** : Ne pas confondre `name` (nom français affiché dans l'UI) et `gmName` (nom officiel GM pour les pistes MIDI)
- **Ressource** : Liste complète GM : https://en.wikipedia.org/wiki/General_MIDI#Program_change_events
- **Compatibilité** : Les noms GM sont en anglais et respectent la casse (ex: "Acoustic Grand Piano", pas "acoustic grand piano")
- **Fallback** : Si `gmName` n'est pas défini, utiliser `name` (compatibilité ascendante)

---

## Résultat attendu

Après implémentation, un export MIDI généré par l'application contiendra des noms de pistes conformes au standard General MIDI, améliorant ainsi la compatibilité avec les lecteurs et logiciels de notation musicale professionnels.

**Exemple de fichier exporté (Format 1, 3 instruments)** :
- Piste 1 : "Acoustic Grand Piano"
- Piste 2 : "Violin"
- Piste 3 : "Flute"

**Au lieu de** :
- Piste 1 : "Piano - Au clair de la lune"
- Piste 2 : "Violon - Au clair de la lune"
- Piste 3 : "Flûte - Au clair de la lune"
