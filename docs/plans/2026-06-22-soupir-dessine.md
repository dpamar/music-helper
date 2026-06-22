# Plan d'implémentation : Soupir dessiné (Silence durée = 1)

> Pour les agents exécuteurs : implémenter ce plan tâche par tâche avec discipline red-green-refactor. Un task, un commit. Ne jamais grouper.

## Contexte

L'application dessine les partitions musicales sur un Canvas HTML5. Tous les symboles de silence ont été implémentés avec des formes géométriques (`beginPath`, `arc`, `moveTo`, `lineTo`, `fill`, `stroke`) **sauf** le soupir (durée = 1), qui utilise encore le caractère Unicode `𝄽` (U+1D13D).

**Objectif** : Remplacer le caractère Unicode par un dessin géométrique pour le soupir, conformément aux autres silences déjà implémentés.

## Analyse du symbole musical : Soupir

Le soupir en notation musicale ressemble à ceci :

```
      ┌─┐
      │ │
    ┌─┘ │
    │   │
    └─┐ │
      └─┘
```

**Géométrie** :
- Rectangle vertical (tige principale) : largeur ~3px, hauteur ~20px
- Forme en "S" stylisé ou en escalier
- Centre du symbole aligné verticalement sur la ligne 2 de la portée (comme les autres silences)

**Référence visuelle** : Le soupir est composé de :
1. Un rectangle incliné vertical (tige gauche)
2. Un décalage horizontal (marche d'escalier)
3. Un rectangle incliné vertical (tige droite)
4. Ces éléments forment un "Z" stylisé

## Fichiers concernés

- **`renderer.js`** : Méthode `drawRest()`, ligne 466-507 (cas `rest.duration >= 1`)

## Décomposition en tâches

### Task 1 : Créer un test visuel pour le soupir

**Type** : Test + Documentation

**Objectif** : Avant de modifier le code, créer un exemple de partition contenant uniquement des soupirs pour valider visuellement le rendu.

**Actions** :
1. Créer un fichier `docs/test-soupir.txt` avec une partition de test :
   ```
   Test soupir
   120
   4/4
   sol
   S1 S1 S1 S1
   ```

2. Dans `app.js`, ajouter temporairement un bouton "Test Soupir" (ou utiliser l'exemple existant) pour charger cette partition :
   ```javascript
   // À ajouter temporairement dans handleExample()
   document.getElementById('partition-input').value = `Test soupir
   120
   4/4
   sol
   S1 S1 S1 S1`;
   handleRender();
   ```

**Critères de succès** :
- Le fichier `docs/test-soupir.txt` existe
- La partition de test s'affiche avec 4 soupirs (actuellement en Unicode)

**Commit** : `test(renderer): add visual test case for quarter rest (soupir)`

---

### Task 2 : Implémenter le dessin géométrique du soupir

**Type** : Implémentation

**Objectif** : Remplacer le `ctx.fillText('𝄽', ...)` par un dessin géométrique dans `drawRest()`.

**Actions** :

1. Localiser le bloc concerné dans `renderer.js` (lignes 481-482) :
   ```javascript
   } else if (rest.duration >= 1) {
       ctx.fillText('𝄽', x+5, y+20); // Soupir
   ```

2. Remplacer par un dessin géométrique :
   ```javascript
   } else if (rest.duration >= 1) {
       // Soupir (quarter rest) dessiné géométriquement
       ctx.beginPath();
       ctx.lineWidth = 2;
       ctx.strokeStyle = '#000';
       ctx.fillStyle = '#000';
       
       // Tige gauche descendante (rectangle incliné)
       ctx.moveTo(x + 8, y);
       ctx.lineTo(x + 5, y + 8);
       ctx.lineTo(x + 7, y + 10);
       ctx.lineTo(x + 10, y + 2);
       ctx.closePath();
       ctx.fill();
       
       // Décalage horizontal (trait oblique)
       ctx.beginPath();
       ctx.moveTo(x + 7, y + 10);
       ctx.lineTo(x + 12, y + 12);
       ctx.stroke();
       
       // Tige droite descendante (rectangle incliné)
       ctx.beginPath();
       ctx.moveTo(x + 12, y + 12);
       ctx.lineTo(x + 9, y + 20);
       ctx.lineTo(x + 11, y + 22);
       ctx.lineTo(x + 14, y + 14);
       ctx.closePath();
       ctx.fill();
       
       // Crochet final (petit arc en bas)
       ctx.beginPath();
       ctx.arc(x + 10, y + 22, 2, 0, Math.PI);
       ctx.fill();
   ```

**Notes de conception** :
- Le centre vertical du symbole doit être autour de `y + 11` (milieu de la hauteur ~22px)
- La largeur totale du symbole : ~9px (de `x+5` à `x+14`)
- Utiliser `fill()` pour les rectangles pleins et `stroke()` pour les traits fins
- Garder la cohérence visuelle avec les autres silences déjà dessinés

**Critères de succès** :
- Le soupir apparaît comme un dessin géométrique (pas de caractère Unicode)
- Le symbole est visuellement reconnaissable comme un soupir standard
- Alignement vertical cohérent avec les autres silences

**Commit** : `feat(renderer): draw quarter rest (soupir) using geometric shapes`

---

### Task 3 : Ajuster les proportions et l'alignement

**Type** : Affinement visuel

**Objectif** : Peaufiner le dessin pour qu'il soit visuellement harmonieux avec les autres symboles de la portée.

**Actions** :

1. Tester avec la partition de test (Task 1) et observer :
   - L'alignement vertical (centré sur ligne 2 de la portée ?)
   - Les proportions (largeur/hauteur du symbole)
   - L'épaisseur des traits (cohérence avec les hampes de notes)

2. Ajuster les coordonnées si nécessaire :
   - Décaler verticalement (`y + offset`) si mal centré
   - Ajuster `lineWidth` pour cohérence avec `drawNoteStem()` (actuellement `lineWidth: 2`)
   - Modifier les points de contrôle pour un meilleur "S"

3. Comparer visuellement avec :
   - Demi-soupir (durée 0.5) : lignes 483-490
   - Quart de soupir (durée 0.25) : lignes 492-502
   - S'assurer d'une cohérence de style (épaisseur, couleur, etc.)

**Critères de succès** :
- Le soupir est visuellement harmonieux avec les autres silences
- Pas de décalage vertical anormal
- Test visuel avec `Test soupir` confirme la lisibilité

**Commit** : `refactor(renderer): adjust quarter rest (soupir) proportions and alignment`

---

### Task 4 : Nettoyer le code et documenter

**Type** : Documentation + Nettoyage

**Objectif** : Ajouter des commentaires explicatifs et supprimer le code de test temporaire.

**Actions** :

1. Ajouter un commentaire détaillé au-dessus du bloc soupir :
   ```javascript
   // Soupir (quarter rest) : forme en "Z" stylisé
   // Composé de deux rectangles inclinés reliés par un trait oblique
   // Centre vertical aligné sur ligne 2 de la portée (y + 11)
   ```

2. Vérifier que les autres cas de `drawRest()` ont des commentaires cohérents :
   - Pause (durée >= 4)
   - Demi-pause (durée >= 2)
   - Demi-soupir (durée >= 0.5)
   - Quart de soupir (durée < 0.5)

3. Supprimer le fichier de test temporaire `docs/test-soupir.txt` (ou le garder en documentation si utile)

4. Mettre à jour `CLAUDE.md` si nécessaire :
   - Section "🐛 Bugs connus / Limitations" : marquer comme résolu
   - Section "Module midi-export.js" ou "Renderer" : documenter le dessin géométrique du soupir

**Critères de succès** :
- Le code est bien commenté
- `CLAUDE.md` est à jour (soupir dessiné mentionné)
- Pas de code de test temporaire restant (sauf si documenté)

**Commit** : `docs(renderer): document geometric quarter rest implementation`

---

### Task 5 : Test de régression complet

**Type** : Test

**Objectif** : Vérifier que le changement n'a pas cassé d'autres fonctionnalités.

**Actions** :

1. Tester avec une partition complète contenant :
   - Soupirs (durée 1)
   - Demi-soupirs (durée 0.5)
   - Quarts de soupir (durée 0.25)
   - Pauses et demi-pauses (durée >= 2)
   - Mélange de notes et silences

   Exemple :
   ```
   Test silences complet
   120
   4/4
   sol
   Do S1 Re S0.5 Mi S0.25 Fa S2 Sol S4
   ```

2. Vérifier visuellement :
   - Tous les silences s'affichent correctement
   - Pas de décalage ou de chevauchement
   - Alignement vertical cohérent

3. Tester l'export PNG :
   - Générer la partition
   - Exporter en PNG
   - Ouvrir l'image et vérifier le soupir

4. Tester l'export MIDI (le soupir ne devrait pas affecter l'audio, mais vérifier qu'il n'y a pas d'erreur) :
   - Sélectionner un instrument
   - Exporter en MIDI
   - Vérifier que le fichier est généré sans erreur

**Critères de succès** :
- Toutes les durées de silences s'affichent correctement
- Pas de régression sur les exports PNG/MIDI
- Pas d'erreur console

**Commit** : `test(renderer): verify all rest types display correctly after soupir refactor`

---

## Checklist de sortie

Avant d'émettre `RESULT`, vérifier :

- [ ] Le plan est commité dans `docs/plans/2026-06-22-soupir-dessine.md`
- [ ] `git status --porcelain` est vide (tout est commité)
- [ ] Le worktree est resté sur la branche `claude-unleashed/49480791-c872-434f-833d-6847ecee0215` (pas de nouvelle branche créée)
- [ ] Toutes les tâches ont un `activeForm` clair

## Risques et considérations

- **Risque** : Le dessin géométrique peut ne pas ressembler exactement à un soupir standard
  - **Mitigation** : Comparaison visuelle avec des références musicales réelles, ajustements itératifs

- **Risque** : Décalage vertical par rapport aux autres silences
  - **Mitigation** : Utiliser les mêmes coordonnées de base (`y`) et offsets que les autres cas

- **Considération** : Le caractère Unicode était peut-être utilisé pour éviter la complexité du dessin
  - **Réponse** : Les autres silences sont déjà dessinés géométriquement (demi-soupir, quart de soupir), donc cohérence architecturale

## Notes pour l'exécuteur

- **Ne pas** modifier les autres cas de `drawRest()` (pause, demi-pause, etc.) sauf si nécessaire pour la cohérence
- **Tester visuellement** à chaque commit (ouvrir `index.html` dans un navigateur)
- **Références** : Consulter des partitions réelles pour valider la forme du soupir si besoin
- **Style** : Garder le même style graphique que les autres silences (épaisseur de trait, couleur noire, formes simples)

---

**Estimation** : 5 commits, ~30-45 minutes d'implémentation + tests visuels
