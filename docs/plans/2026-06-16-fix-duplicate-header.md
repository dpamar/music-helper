# Fix Duplicate Header Display

> For agentic workers: implement this plan task-by-task with red-green-refactor discipline. One task, one commit. Never batch.

## Context

The music score editor was displaying headers (title, tempo, time signature, clef) twice:
1. In a DOM div with class `score-header` 
2. Rendered on the canvas itself

This duplication was unnecessary since the canvas rendering is the primary display method and the only content that gets exported.

## Root Cause

The `Renderer.render()` method called both:
- `this.renderHeader(scoreData, container)` - Creates DOM elements
- `this.drawTitle()` and `this.drawMetadata()` - Draws on canvas

The DOM header was never intended to be part of the final design.

## Solution

### Task 1: Remove DOM header rendering

**File**: `renderer.js`

**Action**: Remove the call to `this.renderHeader()` from the `render()` method

```javascript
render(scoreData, container) {
    // Nettoie le container
    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }

    // Removed: this.renderHeader(scoreData, container);

    // Crée le canvas
    const canvas = document.createElement('canvas');
    // ... rest of method
}
```

**Test**: Open `index.html`, generate a partition, verify title only appears once (on canvas).

---

### Task 2: Delete renderHeader method

**File**: `renderer.js`

**Action**: Remove the entire `renderHeader()` method (lines 149-164) as it's no longer used.

```javascript
// DELETE THIS METHOD:
renderHeader(scoreData, container) {
    const header = document.createElement('div');
    header.className = 'score-header';
    // ...
}
```

**Test**: Verify no references to `renderHeader` remain in codebase.

---

### Task 3: Fix export filename extraction

**Problem**: The `handleExportPNG()` function in `app.js` was querying `.score-title` from the DOM to generate the filename. That DOM element no longer exists.

**File**: `app.js`

**Action**: Store the parsed scoreData globally and use it for export filename.

```javascript
// Add at top of file:
let currentScoreData = null;

// In handleRender(), after parsing:
const scoreData = parser.parse(text);
currentScoreData = scoreData; // Store for export

// In handleExportPNG(), replace DOM query:
// OLD: const scoreTitle = document.querySelector('.score-title');
// NEW: Use currentScoreData.title directly

if (currentScoreData && currentScoreData.title && currentScoreData.title.trim()) {
    const cleanTitle = currentScoreData.title.trim()
        .toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
    filename = `${cleanTitle}.png`;
}
```

**Test**: Generate a partition titled "Ma partition", export PNG, verify filename is `ma-partition.png`.

---

### Task 4: Clear scoreData on clear action

**File**: `app.js`

**Action**: Add `currentScoreData = null;` in `handleClear()` to prevent stale data.

```javascript
function handleClear() {
    // ... existing code ...
    currentScoreData = null; // Add this line
    setExportButtonState(false);
}
```

**Test**: Generate partition, clear, attempt export - should show error message.

---

### Task 5: Fix innerHTML XSS vulnerability

**File**: `app.js`

**Problem**: `outputDiv.innerHTML = '<p class="placeholder">...'` flagged by security hook.

**Action**: Replace with DOM API.

```javascript
// OLD:
outputDiv.innerHTML = '<p class="placeholder">Cliquez sur "Générer la partition" pour voir le rendu graphique</p>';

// NEW:
while (outputDiv.firstChild) {
    outputDiv.removeChild(outputDiv.firstChild);
}
const placeholder = document.createElement('p');
placeholder.className = 'placeholder';
placeholder.textContent = 'Cliquez sur "Générer la partition" pour voir le rendu graphique';
outputDiv.appendChild(placeholder);
```

**Test**: Clear partition, verify placeholder text appears correctly.

---

## Testing Checklist

- [ ] Generate partition → Title appears once (on canvas only)
- [ ] Title is centered and properly styled
- [ ] Metadata (tempo, time signature) displays correctly on canvas
- [ ] Export PNG → filename based on title works
- [ ] Export PNG → default filename "partition.png" when no title
- [ ] Clear partition → placeholder text appears
- [ ] Clear partition → export button disabled
- [ ] No console errors
- [ ] No duplicate headers visible

## Files Modified

- `renderer.js`: Removed `renderHeader()` method and its call
- `app.js`: Added `currentScoreData` global, updated `handleExportPNG()`, fixed `handleClear()` innerHTML

## Commit Message

```
fix(canvas): remove duplicate header display

Headers (title, tempo, time signature) were displayed twice:
once in a DOM div and once on the canvas. This removes the
DOM rendering to keep only the canvas version.

Also fixes export filename extraction to use scoreData
instead of DOM query, and replaces innerHTML with safe
DOM API to prevent XSS.

Why:
- Cleaner single source of truth for display
- Canvas is the only exported content
- Prevents DOM/canvas sync issues

How to apply:
- Headers now only render on canvas via drawTitle/drawMetadata
- Export uses stored scoreData.title for filename
- Clear uses DOM API instead of innerHTML
```

## Notes

- The canvas remains the authoritative display
- All styling (font, size, position) is controlled in `drawTitle()` and `drawMetadata()`
- CSS rules for `.score-header`, `.score-title`, `.score-meta` can be removed if desired (not critical)
