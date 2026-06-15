# Music Helper

A Python music notation system that renders sheet music to images **without external applications** like MuseScore.

## Features

- **French Solfège Notation**: Use Do-Re-Mi notation for input
- **Programmatic Rendering**: Pure Python implementation using Pillow (no external dependencies)
- **Multiple Output Formats**: Text display and PNG image generation
- **Musical Elements**: Support for notes, chords, rests, accidentals
- **Flexible Duration**: Whole notes to sixteenth notes
- **CLI Interface**: Command-line tools for easy use
- **Well-Tested**: >70% test coverage with 151 passing tests

## Installation

```bash
# Install dependencies
pip install -e .
```

## Quick Start

### Display a Partition as Text

```bash
music-helper display examples/simple_melody.json
```

### Render a Partition to PNG

```bash
music-helper render examples/simple_melody.json -o output.png
```

### Parse French Notation Directly

```bash
music-helper parse "Do Re Mi Fa Sol" --title "Scale" --tempo 120 --clef sol -o scale.png
```

## French Notation Format

### Notes
- Basic: `Do`, `Re`, `Mi`, `Fa`, `Sol`, `La`, `Si`
- Duration: `Do2` (half), `Do0.5` (eighth)
- Accidentals: `Do#` (sharp), `Dob` (flat)

### Chords
- `Do+Mi+Sol` (C major chord)
- `Do+Mi+Sol2` (half note chord)

### Rests
- `R` (quarter rest)
- `R2` (half rest)

## Test Results

✓ 151 tests passing
✓ 72% code coverage
✓ All core modules tested
✓ TDD discipline followed
