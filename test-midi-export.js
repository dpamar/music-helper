/**
 * Integration test for multi-track MIDI export
 * Run with: node test-midi-export.js
 */

// DOM shims required because midi-export.js references Blob
global.document = { addEventListener: () => {} };

const fs = require('fs');
const vm = require('vm');

const parserCode = fs.readFileSync('./parser.js', 'utf8');
const midiCode = fs.readFileSync('./midi-export.js', 'utf8');

const context = vm.createContext({
    console, Math, Array, Uint8Array,
    Blob: class Blob {
        constructor(parts, opts) { this.parts = parts; this.type = opts.type; }
    }
});
vm.runInContext(parserCode, context);
vm.runInContext(midiCode, context);

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

// Test 1: Format 0 single track (backward compat)
console.log('\n--- Test 1: Format 0 backward compatibility ---');
const events = exporter.generateMidiEvents(scoreData);
assert(events.length > 0, 'generateMidiEvents returns events');

const header0 = exporter.buildHeaderChunk(0, 1, 480);
assert(header0.length === 14, `Header chunk is 14 bytes (got ${header0.length})`);
assert(header0[0] === 0x4D && header0[1] === 0x54 && header0[2] === 0x68 && header0[3] === 0x64, 'Header starts with MThd');
assert(header0[8] === 0 && header0[9] === 0, 'Format is 0');
assert(header0[10] === 0 && header0[11] === 1, 'Num tracks is 1');
assert(header0[12] === 1 && header0[13] === 0xE0, 'PPQ is 480');

const track0 = exporter.buildTrackChunk(scoreData, events, 0, 0, null);
assert(track0[0] === 0x4D && track0[1] === 0x54 && track0[2] === 0x72 && track0[3] === 0x6B, 'Track starts with MTrk');

// Test 2: Format 1 multi-track
console.log('\n--- Test 2: Format 1 multi-track ---');
const instruments = [
    { name: 'Piano', program: 0, emoji: '🎹' },
    { name: 'Guitare', program: 24, emoji: '🎸' },
    { name: 'Violon', program: 40, emoji: '🎻' }
];

const header1 = exporter.buildHeaderChunk(1, 3, 480);
assert(header1[8] === 0 && header1[9] === 1, 'Format is 1');
assert(header1[10] === 0 && header1[11] === 3, 'Num tracks is 3');

const allTracks = [];
for (let i = 0; i < instruments.length; i++) {
    const trackBytes = exporter.buildTrackChunk(
        scoreData, events, instruments[i].program, i,
        `${instruments[i].name} - ${scoreData.title}`
    );
    allTracks.push(trackBytes);
}

assert(allTracks.length === 3, '3 tracks generated');

for (let i = 0; i < allTracks.length; i++) {
    const t = allTracks[i];
    assert(t[0] === 0x4D && t[1] === 0x54 && t[2] === 0x72 && t[3] === 0x6B,
        `Track ${i} starts with MTrk`);
}

// Track 0 (channel 0) has tempo meta event (0xFF 0x51)
const track0Data = allTracks[0];
let foundTempo = false;
for (let i = 0; i < track0Data.length - 2; i++) {
    if (track0Data[i] === 0xFF && track0Data[i + 1] === 0x51) {
        foundTempo = true;
        break;
    }
}
assert(foundTempo, 'Track 0 contains tempo meta event');

// Track 1 (channel 1) does NOT have tempo meta event
const track1Data = allTracks[1];
let foundTempoTrack1 = false;
for (let i = 0; i < track1Data.length - 2; i++) {
    if (track1Data[i] === 0xFF && track1Data[i + 1] === 0x51) {
        foundTempoTrack1 = true;
        break;
    }
}
assert(!foundTempoTrack1, 'Track 1 does NOT contain tempo meta event');

function findProgramChange(trackBytes, expectedChannel, expectedProgram) {
    for (let i = 0; i < trackBytes.length - 1; i++) {
        if (trackBytes[i] === (0xC0 | expectedChannel) && trackBytes[i + 1] === expectedProgram) {
            return true;
        }
    }
    return false;
}

assert(findProgramChange(allTracks[0], 0, 0), 'Track 0: Program Change ch0 program 0 (Piano)');
assert(findProgramChange(allTracks[1], 1, 24), 'Track 1: Program Change ch1 program 24 (Guitare)');
assert(findProgramChange(allTracks[2], 2, 40), 'Track 2: Program Change ch2 program 40 (Violon)');

function findNoteOn(trackBytes, expectedChannel) {
    const statusByte = 0x90 | expectedChannel;
    for (let i = 0; i < trackBytes.length - 2; i++) {
        if (trackBytes[i] === statusByte && trackBytes[i + 2] > 0) {
            return true;
        }
    }
    return false;
}

assert(findNoteOn(allTracks[0], 0), 'Track 0: Note On events on channel 0');
assert(findNoteOn(allTracks[1], 1), 'Track 1: Note On events on channel 1');
assert(findNoteOn(allTracks[2], 2), 'Track 2: Note On events on channel 2');

// Test 3: Validation
console.log('\n--- Test 3: Validation ---');
let threwEmpty = false;
try {
    exporter.exportMultiTrack(scoreData, 'test', []);
} catch (e) {
    threwEmpty = true;
    assert(e.message.includes('Au moins un instrument'), `Empty instruments throws: "${e.message}"`);
}
assert(threwEmpty, 'exportMultiTrack throws on empty instruments');

let threwTooMany = false;
const tooMany = Array(17).fill({ name: 'X', program: 0, emoji: '' });
try {
    exporter.exportMultiTrack(scoreData, 'test', tooMany);
} catch (e) {
    threwTooMany = true;
    assert(e.message.includes('Maximum 16'), `>16 instruments throws: "${e.message}"`);
}
assert(threwTooMany, 'exportMultiTrack throws on >16 instruments');

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
process.exit(failed > 0 ? 1 : 0);
