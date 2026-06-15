"""Tests for TextFormatter class."""

import pytest
from music_helper.display.text_formatter import TextFormatter
from music_helper.core import Note, Chord, Rest, Partition, Metadata


class TestFormatNote:
    """Tests for formatting notes."""

    def test_format_simple_note(self):
        """Test formatting a simple quarter note."""
        formatter = TextFormatter()
        note = Note('Do', duration=1.0)
        result = formatter.format_note(note)
        assert 'Do' in result

    def test_format_note_with_duration(self):
        """Test formatting note with duration."""
        formatter = TextFormatter()
        note = Note('Re', duration=2.0)
        result = formatter.format_note(note)
        assert 'Re' in result
        assert 'half' in result

    def test_format_note_with_accidental(self):
        """Test formatting note with accidental."""
        formatter = TextFormatter()
        note = Note('Fa', accidental='#')
        result = formatter.format_note(note)
        assert 'Fa' in result
        assert '#' in result


class TestFormatChord:
    """Tests for formatting chords."""

    def test_format_simple_chord(self):
        """Test formatting a simple chord."""
        formatter = TextFormatter()
        chord = Chord([Note('Do'), Note('Mi'), Note('Sol')])
        result = formatter.format_chord(chord)
        assert 'Do' in result
        assert 'Mi' in result
        assert 'Sol' in result
        assert '+' in result


class TestFormatRest:
    """Tests for formatting rests."""

    def test_format_simple_rest(self):
        """Test formatting a quarter rest."""
        formatter = TextFormatter()
        rest = Rest(1.0)
        result = formatter.format_rest(rest)
        assert 'R' in result


class TestFormatPartition:
    """Tests for formatting partitions."""

    def test_format_simple_partition(self):
        """Test formatting a simple partition."""
        formatter = TextFormatter()
        metadata = Metadata(title="Test", tempo=120, clef="sol")
        partition = Partition(metadata)
        partition.add_element(Note('Do'))
        partition.add_element(Rest(1.0))
        partition.add_element(Note('Re'))

        result = formatter.format_partition(partition)
        assert 'Test' in result
        assert '120' in result
        assert 'Do' in result
        assert 'Re' in result
