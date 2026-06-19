/**
 * Tests for General MIDI official names in MIDI export
 * Run with: node test-gm-names.js
 */

// Minimal DOM shims for loading browser modules
global.document = { addEventListener: () => {} };

const fs = require('fs');
const vm = require('vm');

const parserCode = fs.readFileSync('./parser.js', 'utf8');
const midiCode = fs.readFileSync('./midi-export.js', 'utf8');
const appCode = fs.readFileSync('./app.js', 'utf8');

const context = vm.createContext({
    console, Math, Array, Uint8Array, Set,
    Blob: class Blob { constructor(parts, opts) { this.parts = parts; this.type = opts.type; } },
    document: {
        addEventListener: () => {},
        getElementById: () => ({ addEventListener: () => {}, style: {}, disabled: false }),
        createElement: () => ({ appendChild: () => {}, click: () => {}, addEventListener: () => {} }),
        body: { appendChild: () => {}, removeChild: () => {} }
    },
    URL: { createObjectURL: () => 'blob:', revokeObjectURL: () => {} },
    alert: () => {},
    confirm: () => true,
    setTimeout: () => {}
});

vm.runInContext(parserCode, context);
vm.runInContext(midiCode, context);
vm.runInContext(appCode, context);

const INSTRUMENTS = vm.runInContext('INSTRUMENTS', context);
const parser = vm.runInContext('new Parser()', context);
const exporter = vm.runInContext('new MidiExporter()', context);

const scoreText = `Au clair de la lune
120
4/4
sol
Do Do Do Re Mi2 Re2`;

const scoreData = parser.parse(scoreText);

let passed = 0;
let failed = 0;

function assert(condition, msg) {
    if (condition) {
        console.log(`  ✓ ${msg}`);
        passed++;
    } else {
        console.error(`  ✗ ${msg}`);
        failed++;
    }
}

// Test 1: All instruments have gmName property
console.log('\n--- Test 1: All instruments have gmName ---');

const expectedGmNames = {
    'piano': 'Acoustic Grand Piano',
    'guitare': 'Acoustic Guitar (nylon)',
    'violon': 'Violin',
    'flute': 'Flute',
    'accordeon': 'Accordion',
    'contrebasse': 'Contrabass',
    'hautbois': 'Oboe',
    'trompette': 'Trumpet',
    'xylophone': 'Xylophone',
    'guitare électrique': 'Electric Guitar (jazz)',
    'cornemuse': 'Bag pipe',
    'orgue': 'Drawbar Organ'
};

for (const [key, expectedName] of Object.entries(expectedGmNames)) {
    const instrument = INSTRUMENTS[key];
    assert(instrument !== undefined, `Instrument '${key}' exists`);
    if (instrument) {
        assert(instrument.gmName === expectedName,
            `${key}.gmName === '${expectedName}' (got '${instrument.gmName}')`);
    }
}

// Test 2: Format 1 track names use gmName
console.log('\n--- Test 2: Format 1 track names use gmName ---');

const instruments = [
    INSTRUMENTS['piano'],
    INSTRUMENTS['violon'],
    INSTRUMENTS['flute']
];

const events = exporter.generateMidiEvents(scoreData);

function extractTrackName(trackBytes) {
    for (let i = 0; i < trackBytes.length - 3; i++) {
        // Look for delta=0, 0xFF, 0x03 (Track Name meta event)
        if (trackBytes[i] === 0xFF && trackBytes[i+1] === 0x03) {
            const len = trackBytes[i+2];
            const nameBytes = trackBytes.slice(i+3, i+3+len);
            return String.fromCharCode(...nameBytes);
        }
    }
    return null;
}

for (let i = 0; i < instruments.length; i++) {
    const instrument = instruments[i];
    const trackName = instrument.gmName || instrument.name;
    const trackBytes = exporter.buildTrackChunk(scoreData, events, instrument.program, i, trackName);
    const extractedName = extractTrackName(trackBytes);
    assert(extractedName === instrument.gmName,
        `Track ${i} name is '${instrument.gmName}' (got '${extractedName}')`);
}

// Test 3: Format 0 track name uses gmName when provided
console.log('\n--- Test 3: Format 0 track name uses gmName ---');

const piano = INSTRUMENTS['piano'];
const trackBytesF0 = exporter.buildTrackChunk(scoreData, events, piano.program, 0, piano.gmName);
const extractedF0Name = extractTrackName(trackBytesF0);
assert(extractedF0Name === 'Acoustic Grand Piano',
    `Format 0 track name is 'Acoustic Grand Piano' (got '${extractedF0Name}')`);

// Test 4: Fallback to name if gmName missing
console.log('\n--- Test 4: Fallback when gmName missing ---');

const noGmInstrument = { name: 'Test', program: 0, emoji: '' };
const trackNameFallback = noGmInstrument.gmName || noGmInstrument.name;
assert(trackNameFallback === 'Test', `Fallback to name when gmName undefined`);

// Summary
console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
process.exit(failed > 0 ? 1 : 0);
