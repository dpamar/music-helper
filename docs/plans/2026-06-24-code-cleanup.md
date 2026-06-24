> For agentic workers: implement this plan task-by-task with
> red-green-refactor discipline. One task, one commit. Never
> batch.

# Plan de nettoyage du code

**Date**: 2026-06-24
**Objectif**: Passe de nettoyage - indentation, point-virgules, commentaires utiles uniquement

## Contexte

Le code actuel contient:
- Des incohérences d'indentation (mix tabs/espaces, indentation irrégulière)
- Des points-virgules manquants en fin de ligne
- Des commentaires trop verbeux qui ne font que paraphraser le code
- Des commentaires utiles noyés dans le bruit

## Principes directeurs

1. **Indentation**: Utiliser des espaces (pas de tabs), 4 espaces par niveau
2. **Point-virgules**: Ajouter systématiquement en fin d'instruction
3. **Commentaires**: Ne garder que ceux qui expliquent le **POURQUOI**, pas le QUOI
   - Supprimer: commentaires qui répètent le code (`// Crée le canvas` avant `const canvas = document.createElement('canvas')`)
   - Garder: contraintes non-évidentes, workarounds, calculs complexes, formules mathématiques
   - Garder: headers de fichiers et de fonctions publiques (API)
   - Simplifier: commentaires verbeux → version concise

## Tâches

### Tâche 1: Nettoyer app.js

**Fichier**: `app.js`

**Actions**:
- Corriger l'indentation (4 espaces partout)
- Ajouter les point-virgules manquants
- Supprimer les commentaires redondants:
  - Lignes 8-13: Supprimer commentaires évidents (`// Instances globales`, `// Stocke les dernières données parsées`)
  - Lignes 17-30: Supprimer commentaire `// Mapping des instruments disponibles` (évident)
  - Lignes 33-35: Supprimer commentaire fonction `init()` (signature self-explanatory)
  - Lignes 43-52: Supprimer commentaires `// Récupère les éléments DOM`, `// Initialise le lecteur audio` (évidents)
  - Lignes 58-70: Supprimer commentaires événements audio (code self-explanatory)
  - Lignes 72-78: Supprimer commentaires `// Attache les événements` (évident)
  - Lignes 80-85: Garder commentaire `Ctrl+Enter` (comportement non-évident)
  - Lignes 158-160: Supprimer `// Gère le clic sur "Générer la partition"` (nom fonction suffit)
  - Continuer sur tout le fichier
- **Garder**:
  - Commentaire ligne 614: `DOMContentLoaded s'assure que le DOM est prêt` (explique POURQUOI)
  - Formules mathématiques (s'il y en a)

**Commit**: `chore(app): clean indentation, semicolons, and redundant comments`

---

### Tâche 2: Nettoyer parser.js

**Fichier**: `parser.js`

**Actions**:
- Corriger l'indentation (problèmes lignes 67-71, 74-162)
- Ajouter les point-virgules manquants
- Supprimer commentaires redondants:
  - Lignes 1-13: Simplifier header (garder format attendu, supprimer description évidente)
  - Lignes 17-31: Supprimer `// Notes valides`, `// Mapping vers notation anglo-saxonne` (évidents)
  - Lignes 33-37: Simplifier docstring `parse()` (garder signature, supprimer verbiage)
  - Lignes 73-92: Supprimer commentaires de fonction `transposeScore()` (signature suffit)
  - Continuer sur tout le fichier
- **Garder**:
  - Commentaire ligne 42-44: Vérification 5 lignes minimum (contrainte métier)
  - Formules de transposition (lignes 112-134): ajouter un commentaire expliquant la formule mathématique
  - Commentaire ligne 251: Regex stricte pour éviter confusion "Sol" / "S" (bug historique)

**Commit**: `chore(parser): clean indentation, semicolons, and redundant comments`

---

### Tâche 3: Nettoyer renderer.js

**Fichier**: `renderer.js`

**Actions**:
- Corriger l'indentation (problèmes lignes 60-64, 155-159)
- Ajouter les point-virgules manquants
- Supprimer commentaires redondants:
  - Lignes 1-7: Simplifier header
  - Lignes 10-19: Supprimer `// Configuration du rendu` (évident)
  - Lignes 21-56: **GARDER** commentaires positions notes (mapping complexe, historique de bugs)
  - Lignes 104-107: Supprimer commentaires évidents de fonction `render()`
  - Lignes 161-166: Supprimer docstring `drawTitle()` (signature suffit)
  - Continuer sur tout le fichier
- **Garder**:
  - Lignes 21-56: Positions notes (calcul complexe, contraintes portée)
  - Commentaire ligne 322: Transformation dénominateur en valeur temporelle (formule)
  - Commentaire ligne 768-774: Calcul position Y (formule géométrique)

**Commit**: `chore(renderer): clean indentation, semicolons, and redundant comments`

---

### Tâche 4: Nettoyer midi-export.js

**Fichier**: `midi-export.js`

**Actions**:
- Corriger l'indentation (relativement propre, vérifier lignes 69-72)
- Ajouter les point-virgules manquants
- Supprimer commentaires redondants:
  - Lignes 1-6: Simplifier header
  - Lignes 12-18: Simplifier docstring `noteToMidiNumber()` (signature suffit)
  - Lignes 43-49: Simplifier docstring `computeAlteration()`
  - Lignes 56-60: Simplifier docstring `generateMidiEvents()`
  - Continuer sur tout le fichier
- **Garder**:
  - Commentaire ligne 38: Formule MIDI C4 = 60
  - Commentaire ligne 132-152: Algorithme Variable Length Quantity (format MIDI spécifique)
  - Commentaires format MIDI (lignes 200-219, 220-309): protocole binaire

**Commit**: `chore(midi-export): clean indentation, semicolons, and redundant comments`

---

### Tâche 5: Nettoyer midi-audio-player.js

**Fichier**: `midi-audio-player.js`

**Actions**:
- Corriger l'indentation (bon état)
- Ajouter les point-virgules manquants
- Supprimer commentaires redondants:
  - Lignes 1-7: Simplifier header
  - Lignes 18-22: Simplifier docstring `init()`
  - Lignes 32-35: Simplifier docstring `play()`
  - Continuer sur tout le fichier
- **Garder**:
  - Commentaire ligne 49: Politique navigateurs (contexte suspendu)
  - Commentaire ligne 115: Formule fréquence MIDI (A4 = 440 Hz)
  - Commentaire ligne 123: Enveloppe ADSR (terminologie audio)

**Commit**: `chore(midi-audio-player): clean indentation, semicolons, and redundant comments`

---

### Tâche 6: Nettoyer test-gm-names.js et test-midi-export.js

**Fichier**: `test-gm-names.js`, `test-midi-export.js`

**Actions**:
- Corriger l'indentation (test-midi-export ligne 16 compacte, déplier)
- Ajouter les point-virgules manquants
- Supprimer commentaires redondants:
  - Simplifier headers
  - Garder commentaires de setup (shims DOM non-évidents)
  - Garder commentaires de tests (expliquent ce qui est vérifié)
- **Garder**:
  - Commentaires expliquant les shims DOM (lignes 6-29 de test-gm-names.js)
  - Commentaires de tests (numérotation, description)

**Commit**: `chore(tests): clean indentation, semicolons, and redundant comments`

---

### Tâche 7: Vérification finale

**Actions**:
- Relire tous les fichiers modifiés
- Vérifier cohérence indentation (4 espaces partout)
- Vérifier point-virgules présents
- Vérifier commentaires restants sont tous utiles (POURQUOI, pas QUOI)
- Exécuter tests: `node test-gm-names.js && node test-midi-export.js`
- Vérifier application fonctionne: ouvrir `index.html` dans navigateur

**Commit**: Aucun (vérification uniquement, corrections mineures si nécessaire)

---

## Critères d'acceptation

- [ ] Tous les fichiers JS ont une indentation cohérente (4 espaces)
- [ ] Tous les points-virgules sont présents en fin d'instruction
- [ ] Les commentaires restants expliquent le POURQUOI, pas le QUOI
- [ ] Les tests passent (exit code 0)
- [ ] L'application fonctionne (génération partition, export, lecture)
- [ ] Aucune régression fonctionnelle

## Notes

- **Ne pas toucher** au fichier `index.html` (hors scope)
- **Ne pas toucher** au fichier `styles.css` (hors scope)
- **Ne pas toucher** au fichier `CLAUDE.md` (documentation)
- **Ne pas refactoriser** le code (uniquement nettoyage cosmétique)
- **Ne pas renommer** de variables ou fonctions
- **Ne pas modifier** la logique métier

---

**Fin du plan**
