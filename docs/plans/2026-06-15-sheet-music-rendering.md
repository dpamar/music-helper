# Sheet Music Rendering Implementation Plan

## Overview
Implement a Python music notation system that renders sheet music to images WITHOUT external applications like MuseScore. The system will use Pillow (PIL) for programmatic image generation.

## Requirements Analysis
From step1 document:
1. Allow user to input a partition/score
2. Display the partition in text format
3. Generate the partition as an image

### Input Requirements
- Title
- Tempo (quarter note = BPM)
- Clef (treble/sol or bass/fa, no C clef)
- Key signature
- Notes in do-re-mi (solfège) notation
- Chords: use + notation (e.g., Do+Mi+Sol)
- Duration: whole to sixteenth notes
  - Do == Do1 == quarter note
  - Do2 == half note
  - Do0.5 == Do.5 == eighth note
- Rests/silences
- Time signature (asked during graphical display)

### Output Requirements
- Text format display
- Image format display (PNG) with:
  - Title centered at top
  - Tempo in top right
  - Musical staves with notes
  - Proper formatting and spacing

## Architecture

### Technology Stack
- **Core Language**: Python 3.8+
- **Image Rendering**: Pillow (PIL Fork)
- **Testing**: pytest, pytest-cov
- **CLI**: argparse or click
- **File Format**: Custom text format (.mpart) or JSON

### Directory Structure
```
music-helper/
├── docs/
│   └── plans/
│       └── 2026-06-15-sheet-music-rendering.md
├── music_helper/
│   ├── __init__.py
│   ├── core/
│   │   ├── __init__.py
│   │   ├── note.py          # Note representation
│   │   ├── chord.py         # Chord (multiple notes)
│   │   ├── rest.py          # Rest/silence
│   │   ├── metadata.py      # Title, tempo, key, time signature
│   │   └── partition.py     # Complete musical score
│   ├── parser/
│   │   ├── __init__.py
│   │   └── french_parser.py # Parse French notation
│   ├── renderer/
│   │   ├── __init__.py
│   │   ├── renderer.py      # Main rendering engine
│   │   ├── symbols.py       # Draw musical symbols
│   │   └── layout.py        # Layout engine for staff positioning
│   ├── display/
│   │   ├── __init__.py
│   │   └── text_formatter.py # Text display
│   └── cli/
│       ├── __init__.py
│       └── main.py          # CLI interface
├── tests/
│   ├── __init__.py
│   ├── core/
│   │   ├── test_note.py
│   │   ├── test_chord.py
│   │   ├── test_rest.py
│   │   ├── test_metadata.py
│   │   └── test_partition.py
│   ├── parser/
│   │   └── test_french_parser.py
│   ├── renderer/
│   │   ├── test_renderer.py
│   │   ├── test_symbols.py
│   │   └── test_layout.py
│   └── display/
│       └── test_text_formatter.py
├── examples/
│   ├── simple_melody.mpart
│   └── chord_progression.mpart
├── requirements.txt
├── requirements-dev.txt
├── setup.py
└── README.md
```

## Implementation Phases

### Phase 1: Core Data Models (TDD)

#### 1.1 Note Class
**Tests First** (`tests/core/test_note.py`):
- Test note creation with pitch and duration
- Test note validation (valid pitches, durations)
- Test note equality and comparison
- Test octave handling
- Test accidentals (sharp, flat, natural)

**Implementation** (`music_helper/core/note.py`):
```python
class Note:
    """Represents a single musical note."""
    VALID_PITCHES = ['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Si']
    VALID_DURATIONS = [4, 2, 1, 0.5, 0.25]  # whole, half, quarter, eighth, sixteenth
    
    def __init__(self, pitch: str, duration: float = 1.0, octave: int = 4, accidental: str = None)
    def validate(self) -> bool
    def to_dict(self) -> dict
    @classmethod
    def from_string(cls, notation: str) -> 'Note'
```

#### 1.2 Chord Class
**Tests First** (`tests/core/test_chord.py`):
- Test chord creation with multiple notes
- Test chord from + notation (Do+Mi+Sol)
- Test chord validation
- Test chord duration

**Implementation** (`music_helper/core/chord.py`):
```python
class Chord:
    """Represents a chord (multiple simultaneous notes)."""
    
    def __init__(self, notes: List[Note], duration: float = 1.0)
    def validate(self) -> bool
    @classmethod
    def from_string(cls, notation: str) -> 'Chord'
```

#### 1.3 Rest Class
**Tests First** (`tests/core/test_rest.py`):
- Test rest creation with duration
- Test rest validation
- Test rest equality

**Implementation** (`music_helper/core/rest.py`):
```python
class Rest:
    """Represents a musical rest/silence."""
    
    def __init__(self, duration: float = 1.0)
    def validate(self) -> bool
```

#### 1.4 Metadata Class
**Tests First** (`tests/core/test_metadata.py`):
- Test metadata creation
- Test tempo validation (positive BPM)
- Test clef validation (sol/fa only)
- Test key signature validation
- Test time signature validation

**Implementation** (`music_helper/core/metadata.py`):
```python
class Metadata:
    """Represents score metadata."""
    VALID_CLEFS = ['sol', 'fa']
    
    def __init__(self, title: str, tempo: int, clef: str, key_signature: str = 'C', 
                 time_signature: tuple = (4, 4))
    def validate(self) -> bool
```

#### 1.5 Partition Class
**Tests First** (`tests/core/test_partition.py`):
- Test partition creation
- Test adding notes, chords, rests
- Test partition serialization/deserialization
- Test partition validation

**Implementation** (`music_helper/core/partition.py`):
```python
class Partition:
    """Represents a complete musical score."""
    
    def __init__(self, metadata: Metadata)
    def add_element(self, element: Union[Note, Chord, Rest])
    def validate(self) -> bool
    def to_dict(self) -> dict
    def to_json(self, filepath: str)
    @classmethod
    def from_json(cls, filepath: str) -> 'Partition'
```

### Phase 2: Parsing (TDD)

#### 2.1 French Notation Parser
**Tests First** (`tests/parser/test_french_parser.py`):
- Test parsing single notes (Do, Re, Mi, etc.)
- Test parsing notes with durations (Do1, Do2, Do0.5)
- Test parsing chords (Do+Mi+Sol)
- Test parsing rests
- Test parsing complete partition input
- Test error handling for invalid notation

**Implementation** (`music_helper/parser/french_parser.py`):
```python
class FrenchParser:
    """Parses French musical notation."""
    
    def parse_note(self, notation: str) -> Note
    def parse_chord(self, notation: str) -> Chord
    def parse_rest(self, notation: str) -> Rest
    def parse_sequence(self, notation: str) -> List[Union[Note, Chord, Rest]]
    def parse_partition(self, input_data: dict) -> Partition
```

### Phase 3: Rendering Engine (TDD)

#### 3.1 Symbol Drawing
**Tests First** (`tests/renderer/test_symbols.py`):
- Test drawing note heads (filled/hollow)
- Test drawing stems
- Test drawing beams
- Test drawing treble clef
- Test drawing bass clef
- Test drawing time signature
- Test drawing key signature
- Test drawing rests

**Implementation** (`music_helper/renderer/symbols.py`):
```python
class SymbolRenderer:
    """Renders individual musical symbols using Pillow."""
    
    def __init__(self, draw: ImageDraw.Draw, scale: float = 1.0)
    def draw_staff(self, x: int, y: int, width: int)
    def draw_treble_clef(self, x: int, y: int)
    def draw_bass_clef(self, x: int, y: int)
    def draw_note_head(self, x: int, y: int, filled: bool = True)
    def draw_stem(self, x: int, y: int, direction: str = 'up')
    def draw_rest(self, x: int, y: int, duration: float)
    def draw_time_signature(self, x: int, y: int, numerator: int, denominator: int)
    def draw_key_signature(self, x: int, y: int, key: str, clef: str)
```

#### 3.2 Layout Engine
**Tests First** (`tests/renderer/test_layout.py`):
- Test staff positioning
- Test note spacing calculation
- Test measure layout
- Test multi-line staff layout
- Test page margins and title positioning

**Implementation** (`music_helper/renderer/layout.py`):
```python
class LayoutEngine:
    """Calculates positions for musical elements."""
    
    def __init__(self, width: int = 800, height: int = 1000, 
                 staff_spacing: int = 100, margin: int = 50)
    def calculate_staff_positions(self, num_staves: int) -> List[int]
    def calculate_note_x(self, measure_x: int, beat_position: float) -> int
    def calculate_note_y(self, staff_y: int, pitch: str, octave: int, clef: str) -> int
    def layout_partition(self, partition: Partition) -> dict
```

#### 3.3 Main Renderer
**Tests First** (`tests/renderer/test_renderer.py`):
- Test rendering simple note
- Test rendering chord
- Test rendering rest
- Test rendering complete partition
- Test output image properties (size, format)
- Test rendering with different clefs
- Test rendering with different time signatures

**Implementation** (`music_helper/renderer/renderer.py`):
```python
class PartitionRenderer:
    """Main rendering engine that combines layout and symbols."""
    
    def __init__(self, width: int = 800, height: int = 1000)
    def render(self, partition: Partition, output_path: str)
    def _render_metadata(self, metadata: Metadata, image: Image, draw: ImageDraw.Draw)
    def _render_staff(self, staff_y: int, elements: List, image: Image, draw: ImageDraw.Draw)
    def _render_note(self, note: Note, x: int, y: int, draw: ImageDraw.Draw)
    def _render_chord(self, chord: Chord, x: int, y: int, draw: ImageDraw.Draw)
    def _render_rest(self, rest: Rest, x: int, y: int, draw: ImageDraw.Draw)
```

### Phase 4: Text Display (TDD)

#### 4.1 Text Formatter
**Tests First** (`tests/display/test_text_formatter.py`):
- Test formatting metadata
- Test formatting single note
- Test formatting chord
- Test formatting rest
- Test formatting complete partition
- Test output width wrapping

**Implementation** (`music_helper/display/text_formatter.py`):
```python
class TextFormatter:
    """Formats partition as text output."""
    
    def format_note(self, note: Note) -> str
    def format_chord(self, chord: Chord) -> str
    def format_rest(self, rest: Rest) -> str
    def format_partition(self, partition: Partition, width: int = 80) -> str
```

### Phase 5: CLI Interface (TDD)

#### 5.1 Main CLI
**Tests First** (using pytest with subprocess/mock):
- Test help output
- Test text display command
- Test render command
- Test interactive mode
- Test file input/output

**Implementation** (`music_helper/cli/main.py`):
```python
def main():
    parser = argparse.ArgumentParser(description='Music Helper - Sheet Music Renderer')
    # Subcommands: input, display, render
    
def input_partition() -> Partition:
    """Interactive input of partition."""
    
def display_text(partition: Partition):
    """Display partition as text."""
    
def render_image(partition: Partition, output_path: str):
    """Render partition to image."""
```

## Testing Strategy

### Unit Tests
- Each class has comprehensive unit tests
- Mock external dependencies (file I/O, image creation)
- Test edge cases and error conditions
- Aim for >80% code coverage

### Integration Tests
- Test complete workflow: input → parse → render
- Test file I/O operations
- Test actual image generation
- Verify output image properties

### Test Execution
```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=music_helper --cov-report=html

# Run specific test file
pytest tests/core/test_note.py -v

# Run with verbose output
pytest -v
```

## Dependencies

### requirements.txt
```
Pillow>=10.0.0
```

### requirements-dev.txt
```
pytest>=7.0.0
pytest-cov>=4.0.0
black>=23.0.0
flake8>=6.0.0
mypy>=1.0.0
```

### setup.py
```python
from setuptools import setup, find_packages

setup(
    name='music-helper',
    version='0.1.0',
    packages=find_packages(),
    install_requires=[
        'Pillow>=10.0.0',
    ],
    entry_points={
        'console_scripts': [
            'music-helper=music_helper.cli.main:main',
        ],
    },
)
```

## Example Usage

### Example 1: Simple Melody
```python
# examples/simple_melody.mpart (JSON format)
{
    "metadata": {
        "title": "Simple Melody",
        "tempo": 120,
        "clef": "sol",
        "key_signature": "C",
        "time_signature": [4, 4]
    },
    "elements": [
        {"type": "note", "pitch": "Do", "duration": 1.0, "octave": 4},
        {"type": "note", "pitch": "Re", "duration": 1.0, "octave": 4},
        {"type": "note", "pitch": "Mi", "duration": 1.0, "octave": 4},
        {"type": "note", "pitch": "Fa", "duration": 1.0, "octave": 4},
        {"type": "rest", "duration": 1.0},
        {"type": "note", "pitch": "Sol", "duration": 2.0, "octave": 4}
    ]
}
```

### Example 2: Chord Progression
```python
# Programmatic creation
from music_helper.core import *
from music_helper.renderer import PartitionRenderer

metadata = Metadata(
    title="Chord Progression",
    tempo=90,
    clef="sol",
    key_signature="C",
    time_signature=(4, 4)
)

partition = Partition(metadata)

# C major chord
c_chord = Chord.from_string("Do+Mi+Sol")
partition.add_element(c_chord)

# Rest
partition.add_element(Rest(1.0))

# G major chord
g_chord = Chord.from_string("Sol+Si+Re")
partition.add_element(g_chord)

# Render
renderer = PartitionRenderer()
renderer.render(partition, "chord_progression.png")
```

### CLI Usage
```bash
# Interactive mode
music-helper input

# Display text
music-helper display examples/simple_melody.mpart

# Render to image
music-helper render examples/simple_melody.mpart -o output.png

# Complete workflow
music-helper input | music-helper display
music-helper input -o my_song.mpart
music-helper render my_song.mpart -o my_song.png
```

## Implementation Order (TDD Red-Green-Refactor)

1. **Setup Project Structure**
   - Create directory structure
   - Create __init__.py files
   - Setup requirements.txt and setup.py

2. **Phase 1: Core Models** (In order)
   - Note (most fundamental)
   - Rest (simple, no pitch)
   - Chord (depends on Note)
   - Metadata (independent)
   - Partition (depends on all above)

3. **Phase 2: Parser**
   - FrenchParser (depends on core models)

4. **Phase 3: Rendering**
   - LayoutEngine (mathematical, few dependencies)
   - SymbolRenderer (Pillow basics)
   - PartitionRenderer (combines layout + symbols)

5. **Phase 4: Display**
   - TextFormatter (simple string formatting)

6. **Phase 5: CLI**
   - Main CLI (ties everything together)

7. **Examples and Documentation**
   - Create example files
   - Test end-to-end workflows

## Success Criteria

- [ ] All unit tests pass
- [ ] Test coverage >70%
- [ ] Can parse French notation input
- [ ] Can display partition as text
- [ ] Can render partition to PNG image
- [ ] CLI is functional
- [ ] At least 2 example partitions work end-to-end
- [ ] No external application dependencies (MuseScore, LilyPond, etc.)
- [ ] Code is clean and well-documented

## Timeline Estimate

- Phase 1 (Core Models): 2-3 hours
- Phase 2 (Parser): 1 hour
- Phase 3 (Rendering): 3-4 hours (most complex)
- Phase 4 (Display): 30 minutes
- Phase 5 (CLI): 1 hour
- Testing & Refinement: 1-2 hours

**Total: ~8-12 hours**

## Notes and Constraints

### Rendering Simplifications
For the initial implementation, we'll use simplified musical symbols:
- Note heads: circles (filled/hollow)
- Stems: straight lines
- Clefs: simplified ASCII-art style shapes
- No complex beaming initially
- Fixed staff spacing

### Future Enhancements (Out of Scope for Initial Implementation)
- Beaming eighth notes together
- Tuplets (triplets, etc.)
- Complex ornaments (trills, mordents)
- Dynamics markings (p, f, crescendo)
- Articulations (staccato, accent)
- Multiple voices per staff
- Guitar tablature
- MIDI playback
- MusicXML import/export

### Design Decisions
1. **Why Pillow over other libraries?**
   - Pure Python, no external dependencies
   - Cross-platform
   - Simple API for drawing primitives
   - Sufficient for basic music notation

2. **Why custom format over MusicXML?**
   - Simpler to implement
   - Matches the French notation requirement
   - Can add MusicXML support later

3. **Why not use music21 library?**
   - Requirement is to avoid external applications
   - Learning exercise in implementing music notation
   - Full control over rendering

## Implementation Start

Begin with Phase 1, Step 1.1: Note Class TDD cycle.
