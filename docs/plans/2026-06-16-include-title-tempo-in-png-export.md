# Plan: Include Title and Tempo in PNG Export

> For agentic workers: implement this plan task-by-task with red-green-refactor discipline. One task, one commit. Never batch.

**Date**: 2026-06-16  
**Feature**: Export PNG images that include the score title and tempo/metadata  
**Branch**: `claude-unleashed/032b9bd4-e589-4711-a49e-1c55df8f5472` (current worktree branch)

## Context

The application currently displays the title and tempo in HTML elements (`.score-header`, `.score-title`, `.score-meta`) above the canvas. When exporting to PNG via `canvas.toDataURL()`, only the canvas content is captured — the HTML header is not included in the image.

**Current behavior**:
- Title rendered in HTML: `<div class="score-title">Au clair de la lune</div>`
- Tempo/meta rendered in HTML: `<div class="score-meta">♩ = 120 | 4/4 | Clef de sol</div>`
- Canvas contains only the staff, clef, and notes
- PNG export captures only the canvas (missing title/tempo)

**Goal**: Draw title and tempo directly on the canvas so they're included in PNG exports.

## Architecture Decision

**Option chosen**: Render title and tempo on canvas, keep HTML version for screen display.

**Why**: 
1. HTML text rendering is clearer and more accessible for screen readers
2. Canvas rendering ensures export includes all information
3. Dual rendering is acceptable since the title/tempo text is small

**How to apply**: 
- Add `drawTitle()` and `drawMetadata()` methods to `Renderer`
- Call these before `drawStaff()` in the `render()` method
- Increase canvas height to accommodate header (add ~80px)
- Adjust `marginTop` dynamically based on title presence

## File Structure

Files to be modified:
- `renderer.js` — Add title/metadata rendering to canvas
- (No changes to `app.js`, `parser.js`, `index.html`, or `styles.css`)

## Implementation Tasks

### Task 1: Add `drawTitle()` method to Renderer class

**Objective**: Draw the score title on canvas at the top center.

**Why**: Title must be visible in exported PNG; currently it's HTML-only.

**How to apply**: Add this method after `renderHeader()` in `renderer.js`.

**Implementation**:

```javascript
/**
 * Dessine le titre de la partition sur le canvas
 * @param {CanvasRenderingContext2D} ctx - Contexte du canvas
 * @param {string} title - Titre de la partition
 * @param {number} canvasWidth - Largeur du canvas
 */
drawTitle(ctx, title, canvasWidth) {
    if (!title || title.trim() === '') {
        return; // Pas de titre à dessiner
    }

    ctx.font = 'bold 28px serif';
    ctx.fillStyle = '#000';
    ctx.textAlign = 'center';
    ctx.fillText(title, canvasWidth / 2, 40);
    ctx.textAlign = 'left'; // Reset alignment
}
```

**Test approach**: Visual verification — generate a score, check title appears on canvas.

**Commit message**: `feat(export): add drawTitle method to render title on canvas`

---

### Task 2: Add `drawMetadata()` method to Renderer class

**Objective**: Draw tempo and time signature metadata below the title.

**Why**: Metadata (tempo, chiffrage, clef) must be visible in exported PNG.

**How to apply**: Add this method after `drawTitle()` in `renderer.js`.

**Implementation**:

```javascript
/**
 * Dessine les métadonnées (tempo, chiffrage, clef) sur le canvas
 * @param {CanvasRenderingContext2D} ctx - Contexte du canvas
 * @param {object} scoreData - Données de la partition
 * @param {number} canvasWidth - Largeur du canvas
 */
drawMetadata(ctx, scoreData, canvasWidth) {
    const metaText = `♩ = ${scoreData.tempo} | ${scoreData.timeSignature.numerator}/${scoreData.timeSignature.denominator} | Clef de ${scoreData.clef}`;
    
    ctx.font = '16px sans-serif';
    ctx.fillStyle = '#555';
    ctx.textAlign = 'center';
    ctx.fillText(metaText, canvasWidth / 2, 65);
    ctx.textAlign = 'left'; // Reset alignment
}
```

**Test approach**: Visual verification — generate a score, check metadata appears below title.

**Commit message**: `feat(export): add drawMetadata method to render tempo and time signature on canvas`

---

### Task 3: Update `render()` method to call title and metadata drawing

**Objective**: Integrate title and metadata rendering into the main render pipeline.

**Why**: Drawing must happen before the staff so title appears at the top of the exported image.

**How to apply**: In `renderer.js`, modify the `render()` method to call `drawTitle()` and `drawMetadata()` after creating the canvas context but before drawing the staff.

**Implementation**:

In `renderer.js`, locate the `render()` method (currently lines 65-104). After line 86 (`const ctx = canvas.getContext('2d');`), insert:

```javascript
// Dessine le titre et les métadonnées sur le canvas
this.drawTitle(ctx, scoreData.title, width);
this.drawMetadata(ctx, scoreData, width);
```

**Exact change**:

```javascript
// OLD (line 86-89):
const ctx = canvas.getContext('2d');

// Dessine la portée
this.drawStaff(ctx, scoreData.clef);

// NEW:
const ctx = canvas.getContext('2d');

// Dessine le titre et les métadonnées sur le canvas
this.drawTitle(ctx, scoreData.title, width);
this.drawMetadata(ctx, scoreData, width);

// Dessine la portée
this.drawStaff(ctx, scoreData.clef);
```

**Test approach**: Generate a score, verify title and metadata appear above the staff on canvas.

**Commit message**: `feat(export): integrate title and metadata rendering into main render pipeline`

---

### Task 4: Increase canvas height to accommodate title/metadata

**Objective**: Ensure canvas is tall enough for title, metadata, and staff without clipping.

**Why**: Default height (400px) may clip content when title is added. Need ~80px for header.

**How to apply**: In `renderer.js`, in the `render()` method, increase the initial canvas height calculation.

**Implementation**:

In `renderer.js`, line 79-80, change:

```javascript
// OLD:
const width = 1000;
const height = 400;

// NEW:
const width = 1000;
const height = 480; // +80px pour le titre et métadonnées
```

**Test approach**: Generate a score with a long title, verify no clipping occurs.

**Commit message**: `fix(canvas): increase height to 480px to accommodate title and metadata`

---

### Task 5: Manual verification test

**Objective**: Verify that exported PNG files contain both title and tempo.

**Why**: Automated tests don't exist; manual verification is the acceptance criterion.

**How to apply**: 
1. Open `index.html` in a browser
2. Load the example score ("Au clair de la lune")
3. Click "Exporter en PNG"
4. Open the downloaded PNG file
5. Verify:
   - Title "Au clair de la lune" is visible at the top center
   - Metadata "♩ = 120 | 4/4 | Clef de sol" is visible below title
   - Staff and notes are rendered correctly below metadata
6. Test with a custom score (different title, tempo)
7. Verify empty title case doesn't break rendering

**Test cases**:
- ✅ Standard score with title and tempo
- ✅ Score with long title (>30 characters)
- ✅ Score with empty title (should skip title rendering gracefully)
- ✅ Score with unusual tempo (e.g., 200 BPM)

**Expected result**: All exported PNG files include the title and tempo at the top of the image.

**Commit message**: `test(export): verify PNG exports include title and metadata` (no code change, just verification notes in commit message)

---

## Edge Cases

1. **Empty title**: `drawTitle()` checks for empty string and returns early
2. **Very long title**: May overflow canvas width — acceptable for MVP (user should abbreviate)
3. **Special characters in title**: Canvas text rendering supports Unicode, should work
4. **Multiple staves**: Title drawn only once at top (current behavior)

## Non-Goals

- PDF export (out of scope, requires external library)
- Editable title/tempo after rendering (requires re-parsing)
- Custom font selection for title (fixed to serif for consistency)
- Title wrapping for very long text (user responsibility)

## Rollback Plan

If rendering breaks:
1. `git log --not main --oneline` to find commits
2. `git revert <commit-sha>` for each problematic commit
3. Each task is atomic, so reverting any single task is safe

## Success Criteria

- [ ] Title appears on canvas above staff
- [ ] Tempo/metadata appears on canvas below title
- [ ] Exported PNG files contain title and tempo
- [ ] HTML header still displays (dual rendering)
- [ ] No visual regression in note positioning or staff rendering

---

**Total estimated time**: 15-20 minutes  
**Complexity**: Low — additive changes, no refactoring  
**Risk**: Low — no destructive operations, canvas drawing is append-only
