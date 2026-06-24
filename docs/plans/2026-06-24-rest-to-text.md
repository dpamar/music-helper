# Plan d'implémentation : restToText et chordToText

> Pour agentic workers : implémente ce plan task-par-task avec la discipline red-green-refactor. Une task, un commit. Ne jamais regrouper.

**Date** : 2026-06-24  
**Objectif** : Implémenter les méthodes `restToText()` et `chordToText()` dans `parser.js` pour permettre la conversion complète d'une partition en texte.

## Contexte

Le fichier `parser.js` contient déjà une méthode `noteToText(note)` qui convertit un objet note en notation textuelle française. Deux méthodes sœurs sont actuellement vides :
- `restToText(rest)` : doit convertir un silence en texte (ex: `S`, `S2`, `S0.5`)
- `chordToText(chord)` : doit convertir un accord en texte (ex: `DoMiSol2`)

Ces méthodes sont appelées dynamiquement dans la méthode `toText()` via `this[note.type + "ToText"](note)`.

## Analyse du code existant

### Structure d'un objet `rest` (silence)
```javascript
{
  type: 'rest',
  duration: 1  // 0.25, 0.5, 1, 1.5, 2, 3, 4
}
```

### Structure d'un objet `chord` (accord)
```javascript
{
  type: 'chord',
  notes: [
    {note: 'C', alteration: '', octave: 0},
    {note: 'E', alteration: '', octave: 0},
    {note: 'G', alteration: '', octave: 0}
  ],
  duration: 2
}
```

### Format de sortie attendu

**Silences** :
- `S` (demi-pause/noire)
- `S2` (pause/blanche)
- `S4` (pause de ronde)
- `S0.5` (demi-soupir/croche)
- `S0.25` (quart de soupir/double croche)

**Accords** :
- `DoMiSol` (accord de Do majeur, durée par défaut = 1)
- `DoMiSol2` (accord de Do majeur, blanche)
- `Do#Mi+Sol+0.5` (accord de Do# majeur aigu, croche)

## Tasks

### Task 1 : Implémenter `restToText(rest)`

**Objectif** : Convertir un objet silence en notation textuelle.

**Code à ajouter dans `parser.js:95-96`** :

```javascript
restToText(rest) {
    var result = "S";
    
    // La durée (si différente de 1)
    if (rest.duration != 1) {
        result += rest.duration;
    }
    
    return result;
}
```

**Validation manuelle** :
1. Ouvrir `index.html` dans le navigateur
2. Saisir une partition avec des silences :
   ```
   Test silences
   120
   4/4
   sol
   Do S Re S0.5 Mi2
   ```
3. Générer la partition
4. Ouvrir la console et exécuter :
   ```javascript
   const parser = new Parser();
   const score = parser.parse(document.getElementById('input').value);
   console.log(parser.toText(score));
   ```
5. Vérifier que les silences sont correctement convertis : `Do S Re S0.5 Mi2`

**Commit** : `feat(parser): implement restToText method`

---

### Task 2 : Implémenter `chordToText(chord)`

**Objectif** : Convertir un objet accord en notation textuelle.

**Code à ajouter dans `parser.js:98-99`** :

```javascript
chordToText(chord) {
    var result = "";
    
    // Concaténer toutes les notes de l'accord
    for (const note of chord.notes) {
        result += this.noteToText({
            note: note.note,
            alteration: note.alteration,
            octave: note.octave,
            duration: 1  // Durée par défaut pour chaque note individuelle
        }).replace(/\d+\.?\d*$/, '');  // Supprimer la durée individuelle
    }
    
    // La durée s'applique à tout l'accord
    if (chord.duration != 1) {
        result += chord.duration;
    }
    
    return result;
}
```

**Validation manuelle** :
1. Ouvrir `index.html` dans le navigateur
2. Saisir une partition avec des accords :
   ```
   Test accords
   120
   4/4
   sol
   DoMiSol2 Do#Mi+Sol+0.5 Do
   ```
3. Générer la partition
4. Ouvrir la console et exécuter :
   ```javascript
   const parser = new Parser();
   const score = parser.parse(document.getElementById('input').value);
   console.log(parser.toText(score));
   ```
5. Vérifier que les accords sont correctement convertis : `DoMiSol2 Do#Mi+Sol+0.5 Do`

**Commit** : `feat(parser): implement chordToText method`

---

### Task 3 : Test manuel complet de round-trip

**Objectif** : Vérifier que `parse()` → `toText()` → `parse()` produit une partition équivalente.

**Actions** :
1. Ouvrir `index.html` dans le navigateur
2. Saisir une partition complexe avec notes, accords et silences :
   ```
   Test complet
   120
   4/4
   sol
   Do Re Mi Fa Sol2 S DoMiSol2 S0.5 Do#+ Mib- Si* S4
   ```
3. Générer la partition
4. Ouvrir la console et exécuter :
   ```javascript
   const parser = new Parser();
   const score1 = parser.parse(document.getElementById('input').value);
   const text = parser.toText(score1);
   console.log('Text:', text);
   const score2 = parser.parse(
       score1.title + '\n' + 
       score1.tempo + '\n' + 
       score1.timeSignature.numerator + '/' + score1.timeSignature.denominator + '\n' + 
       score1.clef + '\n' + 
       text
   );
   console.log('Score1 notes:', score1.notes);
   console.log('Score2 notes:', score2.notes);
   ```
5. Vérifier visuellement que `score1.notes` et `score2.notes` sont équivalents

**Cas testés** :
- Notes simples avec différentes durées
- Notes avec altérations (dièse, bémol, bécarre)
- Notes avec octaves (-, +)
- Accords avec durée
- Silences avec différentes durées

**Commit** : `test(parser): verify round-trip parse/toText/parse`

---

## Vérifications finales

- [ ] `restToText()` convertit correctement tous les types de silences
- [ ] `chordToText()` convertit correctement tous les types d'accords
- [ ] Les durées sont correctement gérées (suppression de la durée par défaut `1`)
- [ ] Le round-trip `parse` → `toText` → `parse` préserve la structure
- [ ] Aucune régression dans les fonctionnalités existantes

## Notes techniques

### Mapping note anglo-saxonne → française

Le `reverseNoteMapping` utilisé dans `noteToText()` (défini dans le constructor du Parser) :
```javascript
this.reverseNoteMapping = {
    'C': 'Do', 'D': 'Re', 'E': 'Mi', 'F': 'Fa',
    'G': 'Sol', 'A': 'La', 'B': 'Si'
};
```

### Suppression de la durée individuelle dans `chordToText`

L'astuce `.replace(/\d+\.?\d*$/, '')` permet de supprimer la durée qui serait ajoutée par `noteToText()` pour chaque note de l'accord, car la durée ne doit être affichée qu'une seule fois à la fin de l'accord complet.

### Durées standard

- `4` : ronde
- `3` : blanche pointée
- `2` : blanche
- `1.5` : noire pointée
- `1` : noire (par défaut)
- `0.75` : croche pointée
- `0.5` : croche
- `0.375` : double croche pointée
- `0.25` : double croche

---

**Temps estimé** : 15-20 minutes  
**Complexité** : Faible (implémentation straightforward basée sur `noteToText`)
