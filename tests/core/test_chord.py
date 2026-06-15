"""Tests for Chord class."""

import pytest
from music_helper.core.chord import Chord
from music_helper.core.note import Note


class TestChordCreation:
    """Tests for creating Chord instances."""

    def test_create_chord_with_notes(self):
        """Test creating a chord with a list of notes."""
        notes = [Note('Do'), Note('Mi'), Note('Sol')]
        chord = Chord(notes)
        assert len(chord.notes) == 3
        assert chord.duration == 1.0

    def test_create_chord_with_duration(self):
        """Test creating a chord with specific duration."""
        notes = [Note('Do'), Note('Mi')]
        chord = Chord(notes, duration=2.0)
        assert chord.duration == 2.0

    def test_chord_updates_note_durations(self):
        """Test that chord duration overrides individual note durations."""
        notes = [Note('Do', duration=1.0), Note('Mi', duration=0.5)]
        chord = Chord(notes, duration=2.0)
        # All notes in chord should have the chord's duration
        for note in chord.notes:
            assert note.duration == 2.0


class TestChordValidation:
    """Tests for chord validation."""

    def test_valid_chord(self):
        """Test that valid chords pass validation."""
        notes = [Note('Do'), Note('Mi'), Note('Sol')]
        chord = Chord(notes)
        assert chord.validate() is True

    def test_empty_chord_invalid(self):
        """Test that empty chord raises ValueError."""
        with pytest.raises(ValueError):
            Chord([])

    def test_single_note_chord_invalid(self):
        """Test that chord with single note raises ValueError."""
        with pytest.raises(ValueError):
            Chord([Note('Do')])

    def test_chord_with_invalid_duration(self):
        """Test that chord with invalid duration raises ValueError."""
        notes = [Note('Do'), Note('Mi')]
        with pytest.raises(ValueError):
            Chord(notes, duration=3.0)


class TestChordEquality:
    """Tests for chord equality."""

    def test_equal_chords(self):
        """Test that identical chords are equal."""
        chord1 = Chord([Note('Do'), Note('Mi'), Note('Sol')], duration=1.0)
        chord2 = Chord([Note('Do'), Note('Mi'), Note('Sol')], duration=1.0)
        assert chord1 == chord2

    def test_different_notes(self):
        """Test that chords with different notes are not equal."""
        chord1 = Chord([Note('Do'), Note('Mi')])
        chord2 = Chord([Note('Do'), Note('Fa')])
        assert chord1 != chord2

    def test_different_duration(self):
        """Test that chords with different durations are not equal."""
        chord1 = Chord([Note('Do'), Note('Mi')], duration=1.0)
        chord2 = Chord([Note('Do'), Note('Mi')], duration=2.0)
        assert chord1 != chord2

    def test_different_number_of_notes(self):
        """Test that chords with different number of notes are not equal."""
        chord1 = Chord([Note('Do'), Note('Mi')])
        chord2 = Chord([Note('Do'), Note('Mi'), Note('Sol')])
        assert chord1 != chord2


class TestChordSerialization:
    """Tests for chord serialization."""

    def test_to_dict(self):
        """Test converting chord to dictionary."""
        notes = [Note('Do'), Note('Mi'), Note('Sol')]
        chord = Chord(notes, duration=2.0)
        chord_dict = chord.to_dict()

        assert chord_dict['type'] == 'chord'
        assert chord_dict['duration'] == 2.0
        assert len(chord_dict['notes']) == 3
        assert chord_dict['notes'][0]['pitch'] == 'Do'


class TestChordFromString:
    """Tests for parsing chords from string notation."""

    def test_parse_simple_chord(self):
        """Test parsing chord with + notation like 'Do+Mi+Sol'."""
        chord = Chord.from_string('Do+Mi+Sol')
        assert len(chord.notes) == 3
        assert chord.notes[0].pitch == 'Do'
        assert chord.notes[1].pitch == 'Mi'
        assert chord.notes[2].pitch == 'Sol'
        assert chord.duration == 1.0

    def test_parse_chord_with_duration(self):
        """Test parsing chord with duration like 'Do+Mi2'."""
        chord = Chord.from_string('Do+Mi2')
        assert len(chord.notes) == 2
        assert chord.duration == 2.0

    def test_parse_chord_with_accidentals(self):
        """Test parsing chord with accidentals like 'Do#+Mi+Sol'."""
        chord = Chord.from_string('Do#+Mi+Sol')
        assert chord.notes[0].pitch == 'Do'
        assert chord.notes[0].accidental == '#'
        assert chord.notes[1].pitch == 'Mi'

    def test_parse_chord_duration_from_last_note(self):
        """Test that chord duration comes from last note's duration."""
        chord = Chord.from_string('Do+Mi+Sol2')
        assert chord.duration == 2.0

    def test_parse_two_note_chord(self):
        """Test parsing two-note chord."""
        chord = Chord.from_string('Do+Sol')
        assert len(chord.notes) == 2

    def test_invalid_chord_single_note(self):
        """Test that single note without + raises ValueError."""
        with pytest.raises(ValueError):
            Chord.from_string('Do')


class TestChordString:
    """Tests for string representation of chords."""

    def test_str_chord(self):
        """Test string representation of chord."""
        notes = [Note('Do'), Note('Mi'), Note('Sol')]
        chord = Chord(notes)
        chord_str = str(chord)
        assert 'Chord' in chord_str or 'chord' in chord_str
        assert 'Do' in chord_str
        assert 'Mi' in chord_str
        assert 'Sol' in chord_str

    def test_repr_chord(self):
        """Test repr of chord."""
        notes = [Note('Do'), Note('Mi')]
        chord = Chord(notes, duration=2.0)
        repr_str = repr(chord)
        assert 'Chord' in repr_str
