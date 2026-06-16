# Cross-Browser Compatibility - PNG Export

## APIs Used

The PNG export feature relies on:
- `canvas.toDataURL('image/png')` — supported in all modern browsers
- `<a download="filename.png">` — supported in Chrome, Firefox, Edge; Safari requires user permission
- `document.body.appendChild/removeChild` — universal
- `String.normalize('NFD')` — supported in all modern browsers

## Tested Browsers

- [ ] Chrome/Chromium (latest)
- [ ] Firefox (latest)
- [ ] Safari (macOS)
- [ ] Edge (latest)

## Known Browser-Specific Behaviors

### Safari
- May block programmatic downloads; user must allow popups/downloads
- `<a download>` may open in a new tab instead of downloading (older versions)

### Firefox
- Works without issues

### Chrome / Edge
- Works without issues

## Test Procedure

1. Open `index.html` in the target browser
2. Click "Charger un exemple"
3. Verify partition renders correctly
4. Click "Exporter en PNG"
5. Confirm file downloads with correct name (`au-clair-de-la-lune.png`)
6. Open the PNG file and verify it contains the full partition
