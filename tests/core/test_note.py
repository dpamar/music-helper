"""Tests for Note class."""

import pytest
from music_helper.core.note import Note


class TestNoteCreation:
    """Tests for creating Note instances."""

    def test_create_simple_note(self):
        """Test creating a note with pitch and default duration."""
        note = Note('Do')
        assert note.pitch == 'Do'
        assert note.duration == 1.0
        assert note.octave == 4
        assert note.accidental is None

    def test_create_note_with_duration(self):
        """Test creating a note with specific duration."""
        note = Note('Re', duration=2.0)
        assert note.pitch == 'Re'
        assert note.duration == 2.0

    def test_create_note_with_octave(self):
        """Test creating a note with specific octave."""
        note = Note('Mi', octave=5)
        assert note.pitch == 'Mi'
        assert note.octave == 5

    def test_create_note_with_accidental(self):
        """Test creating a note with accidental."""
        note = Note('Fa', accidental='#')
        assert note.pitch == 'Fa'
        assert note.accidental == '#'

        note_flat = Note('Si', accidental='b')
        assert note_flat.accidental == 'b'


class TestNoteValidation:
    """Tests for note validation."""

    def test_valid_pitches(self):
        """Test that all valid pitches are accepted."""
        valid_pitches = ['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Si']
        for pitch in valid_pitches:
            note = Note(pitch)
            assert note.validate() is True

    def test_invalid_pitch(self):
        """Test that invalid pitches raise ValueError."""
        with pytest.raises(ValueError):
            Note('Invalid')

    def test_valid_durations(self):
        """Test that all valid durations are accepted."""
        valid_durations = [4.0, 2.0, 1.0, 0.5, 0.25]
        for duration in valid_durations:
            note = Note('Do', duration=duration)
            assert note.validate() is True

    def test_invalid_duration(self):
        """Test that invalid durations raise ValueError."""
        with pytest.raises(ValueError):
            Note('Do', duration=3.0)

        with pytest.raises(ValueError):
            Note('Do', duration=-1.0)

    def test_valid_octaves(self):
        """Test that valid octaves are accepted."""
        for octave in range(0, 9):
            note = Note('Do', octave=octave)
            assert note.validate() is True

    def test_invalid_octave(self):
        """Test that invalid octaves raise ValueError."""
        with pytest.raises(ValueError):
            Note('Do', octave=-1)

        with pytest.raises(ValueError):
            Note('Do', octave=10)

    def test_valid_accidentals(self):
        """Test that valid accidentals are accepted."""
        valid_accidentals = ['#', 'b', None]
        for accidental in valid_accidentals:
            note = Note('Do', accidental=accidental)
            assert note.validate() is True

    def test_invalid_accidental(self):
        """Test that invalid accidentals raise ValueError."""
        with pytest.raises(ValueError):
            Note('Do', accidental='x')


class TestNoteEquality:
    """Tests for note equality and comparison."""

    def test_equal_notes(self):
        """Test that identical notes are equal."""
        note1 = Note('Do', duration=1.0, octave=4)
        note2 = Note('Do', duration=1.0, octave=4)
        assert note1 == note2

    def test_different_pitch(self):
        """Test that notes with different pitches are not equal."""
        note1 = Note('Do')
        note2 = Note('Re')
        assert note1 != note2

    def test_different_duration(self):
        """Test that notes with different durations are not equal."""
        note1 = Note('Do', duration=1.0)
        note2 = Note('Do', duration=2.0)
        assert note1 != note2

    def test_different_octave(self):
        """Test that notes with different octaves are not equal."""
        note1 = Note('Do', octave=4)
        note2 = Note('Do', octave=5)
        assert note1 != note2

    def test_different_accidental(self):
        """Test that notes with different accidentals are not equal."""
        note1 = Note('Do', accidental='#')
        note2 = Note('Do', accidental='b')
        assert note1 != note2


class TestNoteSerialization:
    """Tests for note serialization."""

    def test_to_dict(self):
        """Test converting note to dictionary."""
        note = Note('Do', duration=2.0, octave=5, accidental='#')
        note_dict = note.to_dict()

        assert note_dict['type'] == 'note'
        assert note_dict['pitch'] == 'Do'
        assert note_dict['duration'] == 2.0
        assert note_dict['octave'] == 5
        assert note_dict['accidental'] == '#'

    def test_to_dict_no_accidental(self):
        """Test converting note without accidental to dictionary."""
        note = Note('Re')
        note_dict = note.to_dict()

        assert note_dict['accidental'] is None


class TestNoteFromString:
    """Tests for parsing notes from string notation."""

    def test_parse_simple_note(self):
        """Test parsing simple note like 'Do'."""
        note = Note.from_string('Do')
        assert note.pitch == 'Do'
        assert note.duration == 1.0

    def test_parse_note_with_duration(self):
        """Test parsing note with duration like 'Do2' (half note)."""
        note = Note.from_string('Do2')
        assert note.pitch == 'Do'
        assert note.duration == 2.0

    def test_parse_note_with_decimal_duration(self):
        """Test parsing note with decimal duration like 'Re0.5' (eighth note)."""
        note = Note.from_string('Re0.5')
        assert note.pitch == 'Re'
        assert note.duration == 0.5

    def test_parse_note_alternate_decimal(self):
        """Test parsing note with alternate decimal notation like 'Mi.5'."""
        note = Note.from_string('Mi.5')
        assert note.pitch == 'Mi'
        assert note.duration == 0.5

    def test_parse_note_with_accidental(self):
        """Test parsing note with accidental like 'Fa#'."""
        note = Note.from_string('Fa#')
        assert note.pitch == 'Fa'
        assert note.accidental == '#'

        note_flat = Note.from_string('Sib')
        assert note_flat.pitch == 'Si'
        assert note_flat.accidental == 'b'

    def test_parse_note_with_duration_and_accidental(self):
        """Test parsing note with both duration and accidental like 'Sol#2'."""
        note = Note.from_string('Sol#2')
        assert note.pitch == 'Sol'
        assert note.duration == 2.0
        assert note.accidental == '#'


class TestNoteString:
    """Tests for string representation of notes."""

    def test_str_simple_note(self):
        """Test string representation of simple note."""
        note = Note('Do')
        assert 'Do' in str(note)
        assert '1.0' in str(note) or '1' in str(note)

    def test_repr_note(self):
        """Test repr of note."""
        note = Note('Re', duration=2.0, octave=5, accidental='#')
        repr_str = repr(note)
        assert 'Note' in repr_str
        assert 'Re' in repr_str
