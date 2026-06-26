/**
 * Node.js test runner for midi-import.js
 * Run with: node tests/run-midi-import-tests.js
 */

const fs = require('fs');
const vm = require('vm');

const code = fs.readFileSync('midi-import.js', 'utf8');
const ctx = vm.createContext({ DataView, Uint8Array, ArrayBuffer, String, Math, Error, console });
vm.runInContext(code, ctx);

let passed = 0;
let failed = 0;

function test(name, fn) {
    try {
        fn();
        passed++;
        console.log('  PASS: ' + name);
    } catch (e) {
        failed++;
        console.log('  FAIL: ' + name + ' - ' + e.message);
    }
}

function assert(cond, msg) {
    if (!cond) throw new Error(msg || 'assertion failed');
}

function assertEqual(actual, expected, msg) {
    if (actual !== expected) throw new Error((msg || '') + ' expected ' + expected + ', got ' + actual);
}

function assertThrows(fn, expectedMsg) {
    try {
        fn();
        throw new Error('expected to throw');
    } catch (e) {
        if (expectedMsg && !e.message.includes(expectedMsg)) {
            throw new Error('wrong error: ' + e.message);
        }
    }
}

function getImporter() {
    return vm.runInContext('new MidiImporter()', ctx);
}

// =================== Header tests ===================
console.log('\n--- Header parsing ---');

test('parser un header MIDI Format 0', () => {
    const importer = getImporter();
    const bytes = new Uint8Array([0x4D,0x54,0x68,0x64, 0x00,0x00,0x00,0x06, 0x00,0x00, 0x00,0x01, 0x01,0xE0]);
    const r = importer.parseHeader(bytes.buffer, 0);
    assertEqual(r.format, 0);
    assertEqual(r.numTracks, 1);
    assertEqual(r.ppq, 480);
    assertEqual(r.nextOffset, 14);
});

test('parser un header MIDI Format 1', () => {
    const importer = getImporter();
    const bytes = new Uint8Array([0x4D,0x54,0x68,0x64, 0x00,0x00,0x00,0x06, 0x00,0x01, 0x00,0x03, 0x00,0xF0]);
    const r = importer.parseHeader(bytes.buffer, 0);
    assertEqual(r.format, 1);
    assertEqual(r.numTracks, 3);
    assertEqual(r.ppq, 240);
});

test('rejeter signature invalide', () => {
    const importer = getImporter();
    const bytes = new Uint8Array([0x52,0x49,0x46,0x46, 0x00,0x00,0x00,0x06, 0x00,0x00, 0x00,0x01, 0x01,0xE0]);
    assertThrows(() => importer.parseHeader(bytes.buffer, 0), 'Signature MIDI invalide');
});

test('rejeter Format 2', () => {
    const importer = getImporter();
    const bytes = new Uint8Array([0x4D,0x54,0x68,0x64, 0x00,0x00,0x00,0x06, 0x00,0x02, 0x00,0x01, 0x01,0xE0]);
    assertThrows(() => importer.parseHeader(bytes.buffer, 0), 'Format MIDI 2 non support');
});

// =================== VLQ tests ===================
console.log('\n--- VLQ parsing ---');

test('VLQ 1 byte (64)', () => {
    const importer = getImporter();
    const r = importer.readVarLength(new Uint8Array([0x40]).buffer, 0);
    assertEqual(r.value, 64);
    assertEqual(r.bytesRead, 1);
});

test('VLQ value 0', () => {
    const importer = getImporter();
    const r = importer.readVarLength(new Uint8Array([0x00]).buffer, 0);
    assertEqual(r.value, 0);
    assertEqual(r.bytesRead, 1);
});

test('VLQ 2 bytes (128)', () => {
    const importer = getImporter();
    const r = importer.readVarLength(new Uint8Array([0x81, 0x00]).buffer, 0);
    assertEqual(r.value, 128);
    assertEqual(r.bytesRead, 2);
});

test('VLQ 2 bytes (480)', () => {
    const importer = getImporter();
    const r = importer.readVarLength(new Uint8Array([0x83, 0x60]).buffer, 0);
    assertEqual(r.value, 480);
    assertEqual(r.bytesRead, 2);
});

test('VLQ 4 bytes (max)', () => {
    const importer = getImporter();
    const r = importer.readVarLength(new Uint8Array([0xFF, 0xFF, 0xFF, 0x7F]).buffer, 0);
    assertEqual(r.value, 0x0FFFFFFF);
    assertEqual(r.bytesRead, 4);
});

// =================== Track structure tests ===================
console.log('\n--- Track structure ---');

test('track vide (End of Track only)', () => {
    const importer = getImporter();
    const bytes = new Uint8Array([
        0x4D, 0x54, 0x72, 0x6B, 0x00, 0x00, 0x00, 0x04,
        0x00, 0xFF, 0x2F, 0x00
    ]);
    const t = importer.parseTrack(bytes.buffer, 0, 480);
    assertEqual(t.trackIndex, 0);
    assertEqual(t.notes.length, 0);
    assertEqual(t.noteCount, 0);
});

test('rejeter signature track invalide', () => {
    const importer = getImporter();
    const bytes = new Uint8Array([0x4D,0x54,0x68,0x64, 0x00,0x00,0x00,0x04, 0x00, 0xFF,0x2F,0x00]);
    assertThrows(() => importer.parseTrack(bytes.buffer, 0, 480), 'Signature track invalide');
});

// =================== Note events tests ===================
console.log('\n--- Note events ---');

test('Note On + Note Off', () => {
    const importer = getImporter();
    const bytes = new Uint8Array([
        0x4D, 0x54, 0x72, 0x6B, 0x00, 0x00, 0x00, 0x0C,
        0x00, 0x90, 0x3C, 0x50,
        0x83, 0x60,
        0x80, 0x3C, 0x00,
        0x00, 0xFF, 0x2F, 0x00
    ]);
    const t = importer.parseTrack(bytes.buffer, 0, 480);
    assertEqual(t.notes.length, 1);
    assertEqual(t.notes[0].tick, 0);
    assertEqual(t.notes[0].midiNumber, 60);
    assertEqual(t.notes[0].duration, 480);
    assertEqual(t.notes[0].velocity, 80);
});

test('Note On velocity 0 = Note Off', () => {
    const importer = getImporter();
    const bytes = new Uint8Array([
        0x4D, 0x54, 0x72, 0x6B, 0x00, 0x00, 0x00, 0x0C,
        0x00, 0x90, 0x3C, 0x50,
        0x83, 0x60,
        0x90, 0x3C, 0x00,
        0x00, 0xFF, 0x2F, 0x00
    ]);
    const t = importer.parseTrack(bytes.buffer, 0, 480);
    assertEqual(t.notes.length, 1);
    assertEqual(t.notes[0].duration, 480);
});

test('Running status', () => {
    const importer = getImporter();
    const bytes = new Uint8Array([
        0x4D, 0x54, 0x72, 0x6B, 0x00, 0x00, 0x00, 0x0F,
        0x00, 0x90, 0x3C, 0x50,
        0x83, 0x60,
        0x3C, 0x00,
        0x00,
        0x3E, 0x60,
        0x83, 0x60,
        0x3E, 0x00,
        0x00, 0xFF, 0x2F, 0x00
    ]);
    const t = importer.parseTrack(bytes.buffer, 0, 480);
    assertEqual(t.notes.length, 2);
    assertEqual(t.notes[0].midiNumber, 60);
    assertEqual(t.notes[0].duration, 480);
    assertEqual(t.notes[1].midiNumber, 62);
    assertEqual(t.notes[1].duration, 480);
});

// =================== Meta events tests ===================
console.log('\n--- Meta events ---');

test('Set Tempo (120 BPM = 500000 us)', () => {
    const importer = getImporter();
    const bytes = new Uint8Array([
        0x4D, 0x54, 0x72, 0x6B, 0x00, 0x00, 0x00, 0x0A,
        0x00, 0xFF, 0x51, 0x03, 0x07, 0xA1, 0x20,
        0x00, 0xFF, 0x2F, 0x00
    ]);
    const t = importer.parseTrack(bytes.buffer, 0, 480);
    assertEqual(t.tempo, 500000);
});

test('Track Name', () => {
    const importer = getImporter();
    const bytes = new Uint8Array([
        0x4D, 0x54, 0x72, 0x6B, 0x00, 0x00, 0x00, 0x0C,
        0x00, 0xFF, 0x03, 0x05,
        0x50, 0x69, 0x61, 0x6E, 0x6F,
        0x00, 0xFF, 0x2F, 0x00
    ]);
    const t = importer.parseTrack(bytes.buffer, 0, 480);
    assertEqual(t.trackName, 'Piano');
});

test('ignore unknown meta-events', () => {
    const importer = getImporter();
    const bytes = new Uint8Array([
        0x4D, 0x54, 0x72, 0x6B, 0x00, 0x00, 0x00, 0x0C,
        0x00, 0xFF, 0x05, 0x05,
        0x48, 0x65, 0x6C, 0x6C, 0x6F,
        0x00, 0xFF, 0x2F, 0x00
    ]);
    const t = importer.parseTrack(bytes.buffer, 0, 480);
    assertEqual(t.trackName, null);
    assertEqual(t.notes.length, 0);
});

// =================== Summary ===================
console.log('\n--- Results ---');
console.log(passed + ' passed, ' + failed + ' failed');
if (failed > 0) process.exit(1);
