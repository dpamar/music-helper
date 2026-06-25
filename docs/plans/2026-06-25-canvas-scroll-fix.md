# Plan: Fix du canvas non scrollable pour les partitions longues

> Pour agentic workers: implémenter ce plan task-by-task avec
> red-green-refactor discipline. Une task, un commit. Ne jamais
> batcher.

**Date**: 2026-06-25  
**Auteur**: Claude (planner agent)  
**Problème**: Quand la partition est trop longue, on ne voit pas plus de la troisième portée et on ne peut pas scroller plus bas.

## Analyse du problème

Le canvas HTML5 créé dans `renderer.js` a une hauteur fixe de 480px (ligne 45). Quand la partition génère plusieurs portées (via des retours à la ligne automatiques quand `x > 850`), les portées au-delà de la hauteur fixe sont dessinées mais ne sont pas visibles car le canvas ne s'agrandit pas dynamiquement.

**Causes identifiées**:
1. Hauteur de canvas fixe à 480px
2. Le nombre de portées n'est calculé qu'au moment du dessin des notes
3. Pas de redimensionnement du canvas après calcul de la hauteur nécessaire

## Solution implémentée

La solution consiste à :

1. **Calculer la hauteur nécessaire** pendant le dessin des notes en retournant `currentStaffY` final
2. **Redimensionner le canvas** si la hauteur calculée dépasse la hauteur initiale
3. **Redessiner** tout le contenu sur le canvas agrandi

### Modifications apportées

#### 1. `renderer.js` - Méthode `render()`

**Changements**:
- Stocker la référence au `canvas` (pas seulement `ctx`)
- Récupérer la hauteur finale retournée par `drawNotes()`
- Redimensionner le canvas si nécessaire
- Redessiner tout le contenu sur le canvas agrandi

**Code modifié** (lignes 43-76):

```javascript
render(scoreData, container) {
    const width = 1000;
    const initialHeight = 480;

    var ctx = null;
    var canvas = null;  // ← Nouveau: stocker la référence
    if (!this.drawingInfo.fakeMode) {
        while (container.firstChild) {
            container.removeChild(container.firstChild);
        }

        canvas = document.createElement('canvas');
        canvas.id = 'score-canvas';
        canvas.width = width;
        canvas.height = initialHeight;

        container.appendChild(canvas);
        ctx = canvas.getContext('2d');
    }

    this.drawingInfo.alterationCount = 0;
    this.lastScore = {};

    this.drawTitle(ctx, scoreData.title, width);
    this.drawMetadata(ctx, scoreData, width);
    this.drawStaff(ctx, scoreData.clef);
    this.drawClef(ctx, scoreData.clef);

    let currentX = this.config.staffStartX + this.config.clefWidth;
    currentX = this.drawKeySignature(ctx, scoreData.keySignature, currentX, scoreData.clef);
    currentX = this.drawTimeSignature(ctx, scoreData.timeSignature, currentX);

    currentX += 20;
    const finalHeight = this.drawNotes(ctx, scoreData.notes, scoreData.timeSignature, currentX, scoreData.clef, this.getSignaturesMap(scoreData.keySignature));  // ← Récupérer la hauteur

    // ← Nouveau: Redimensionner si nécessaire
    if (!this.drawingInfo.fakeMode && canvas && finalHeight > initialHeight) {
        canvas.height = finalHeight + 50; // Ajouter une marge en bas

        // Redessiner tout sur le canvas agrandi
        ctx = canvas.getContext('2d');
        this.drawTitle(ctx, scoreData.title, width);
        this.drawMetadata(ctx, scoreData, width);
        this.drawStaff(ctx, scoreData.clef);
        this.drawClef(ctx, scoreData.clef);

        let currentX = this.config.staffStartX + this.config.clefWidth;
        currentX = this.drawKeySignature(ctx, scoreData.keySignature, currentX, scoreData.clef);
        currentX = this.drawTimeSignature(ctx, scoreData.timeSignature, currentX);

        currentX += 20;
        this.drawNotes(ctx, scoreData.notes, scoreData.timeSignature, currentX, scoreData.clef, this.getSignaturesMap(scoreData.keySignature));
    }
}
```

#### 2. `renderer.js` - Méthode `drawNotes()`

**Changements**:
- Modifier le commentaire JSDoc pour indiquer le retour de valeur
- Ajouter `@returns {number}` au lieu de `@returns {void}`
- Retourner la hauteur finale calculée à la fin

**Code modifié** (lignes 289-301 et 384-387):

```javascript
/**
 * Dessine toutes les notes, accords et silences avec barres de mesure.
 * Gere les retours a la ligne automatiques.
 * @param {CanvasRenderingContext2D} ctx - Contexte canvas
 * @param {Array} notes - Tableau de notes/accords/silences
 * @param {Object} timeSignature - Chiffrage de mesure
 * @param {number} startX - Position X de depart
 * @param {string} clef - "sol" ou "fa"
 * @param {Array} signatures - Map des alterations de l'armure
 * @returns {number} Hauteur finale necessaire pour le canvas  // ← Modifié
 * @private
 */
drawNotes(ctx, notes, timeSignature, startX, clef, signatures) {
    // ... (code existant) ...

    this.drawBarline(ctx, x, currentStaffY, true);

    // ← Nouveau: Retourner la hauteur finale necessaire
    return currentStaffY + (4 * this.config.staffLineSpacing) + 50;
}
```

### Calcul de la hauteur finale

La hauteur finale est calculée comme suit:
```
hauteur_finale = currentStaffY + (4 * staffLineSpacing) + 50
```

Où:
- `currentStaffY` = position Y de la dernière portée (augmente de 150px à chaque retour à la ligne)
- `4 * staffLineSpacing` = hauteur d'une portée (5 lignes espacées de 12px = 48px)
- `50` = marge en bas pour éviter que la barre double finale ne touche le bord

### Pourquoi redessiner ?

Quand on redimensionne un canvas HTML5, son contenu est **automatiquement effacé**. C'est un comportement intrinsèque de l'API Canvas. Il est donc nécessaire de redessiner tout le contenu après avoir changé la hauteur.

## Tests à effectuer

### Test 1: Partition courte (1 portée)
```
Test court
120
4/4
sol
Do Re Mi Fa Sol La Si Do+
```
**Résultat attendu**: Canvas de 480px de hauteur, pas de redimensionnement.

### Test 2: Partition moyenne (2-3 portées)
```
Test moyen
120
4/4
sol
Do Re Mi Fa Sol La Si Do+ Re+ Mi+ Fa+ Sol+ La+ Si+ Do++ Re++ Mi++ Fa++ Sol++ La++ Si++ Do
Do Re Mi Fa Sol La Si Do+ Re+ Mi+ Fa+ Sol+ La+ Si+ Do++
```
**Résultat attendu**: Canvas redimensionné à ~400px (marginTop=100 + 2×150 + 48 + 50).

### Test 3: Partition très longue (5+ portées)
```
Test long
120
4/4
sol
Do Re Mi Fa Sol La Si Do+ Re+ Mi+ Fa+ Sol+ La+ Si+ Do++ Re++ Mi++ Fa++ Sol++ La++ Si++ Do
(répéter la ligne 7 fois)
```
**Résultat attendu**: Canvas redimensionné à ~950px (marginTop=100 + 5×150 + 48 + 50), toutes les portées visibles avec scroll.

### Test 4: Compatibilité avec autres features
- Export PNG avec partition longue → Le PNG doit capturer TOUT le canvas agrandi
- Export MIDI avec partition longue → Pas d'impact (génération depuis les données, pas le canvas)
- Lecture MIDI avec partition longue → Pas d'impact
- Arrangement Jazz avec partition longue → La partition jazzifiée doit aussi s'afficher correctement

## Limitations connues

1. **Performance**: Pour une partition extrêmement longue (100+ portées), le redimensionnement et le redessin peuvent prendre quelques centaines de millisecondes. Acceptable pour une application client-side sans contrainte temps réel.

2. **Mémoire**: Les navigateurs limitent la taille maximale d'un canvas (généralement ~16384px de hauteur). Pour une partition de 100 portées, on atteint ~15100px. Au-delà, le canvas pourrait ne pas se créer.

3. **Double dessin**: Pour les partitions longues, le contenu est dessiné 2 fois (une fois pour calculer la hauteur, une fois après redimensionnement). Optimisation possible avec une passe de pré-calcul sans dessin, mais complexité accrue.

## Commit message

```
fix(renderer): allow canvas to expand for long scores

- Calculate final height needed during note drawing
- Resize canvas dynamically if score exceeds initial 480px height
- Redraw entire content on resized canvas
- Add 50px bottom margin to avoid clipping the final barline

Fixes: partition trop longue non scrollable après la 3ème portée
```

## Validation finale

Avant de considérer cette feature complète, vérifier:

- [ ] `git status --porcelain` est vide (tout committé)
- [ ] Les tests manuels passent (partitions courte, moyenne, longue)
- [ ] Pas de régression sur l'export PNG (capture le canvas complet)
- [ ] Pas de régression sur les autres fonctionnalités (MIDI, Jazz, lecture)
- [ ] Le plan est committé dans `docs/plans/`

---

**Fin du plan**
