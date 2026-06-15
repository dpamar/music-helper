"""Tests for FrenchParser class."""

import pytest
from music_helper.parser.french_parser import FrenchParser
from music_helper.core import Note, Chord, Rest, Partition, Metadata


class TestParseNote:
    """Tests for parsing individual notes."""

    def test_parse_simple_note(self):
        """Test parsing a simple note."""
        parser = FrenchParser()
        note = parser.parse_note('Do')
        assert isinstance(note, Note)
        assert note.pitch == 'Do'
        assert note.duration == 1.0

    def test_parse_note_with_duration(self):
        """Test parsing note with duration."""
        parser = FrenchParser()
        note = parser.parse_note('Re2')
        assert note.pitch == 'Re'
        assert note.duration == 2.0

    def test_parse_note_with_accidental(self):
        """Test parsing note with accidental."""
        parser = FrenchParser()
        note = parser.parse_note('Fa#')
        assert note.pitch == 'Fa'
        assert note.accidental == '#'


class TestParseChord:
    """Tests for parsing chords."""

    def test_parse_simple_chord(self):
        """Test parsing a simple chord."""
        parser = FrenchParser()
        chord = parser.parse_chord('Do+Mi+Sol')
        assert isinstance(chord, Chord)
        assert len(chord.notes) == 3

    def test_parse_chord_with_duration(self):
        """Test parsing chord with duration."""
        parser = FrenchParser()
        chord = parser.parse_chord('Do+Mi2')
        assert chord.duration == 2.0


class TestParseRest:
    """Tests for parsing rests."""

    def test_parse_simple_rest(self):
        """Test parsing a simple rest."""
        parser = FrenchParser()
        rest = parser.parse_rest('R')
        assert isinstance(rest, Rest)
        assert rest.duration == 1.0

    def test_parse_rest_with_duration(self):
        """Test parsing rest with duration."""
        parser = FrenchParser()
        rest = parser.parse_rest('R2')
        assert rest.duration == 2.0


class TestParseSequence:
    """Tests for parsing sequences of elements."""

    def test_parse_simple_sequence(self):
        """Test parsing a sequence with notes and rests."""
        parser = FrenchParser()
        sequence = parser.parse_sequence('Do Re Mi R Fa')
        assert len(sequence) == 5
        assert isinstance(sequence[0], Note)
        assert isinstance(sequence[3], Rest)

    def test_parse_sequence_with_chords(self):
        """Test parsing sequence with chords."""
        parser = FrenchParser()
        sequence = parser.parse_sequence('Do Do+Mi+Sol Re')
        assert len(sequence) == 3
        assert isinstance(sequence[0], Note)
        assert isinstance(sequence[1], Chord)
        assert isinstance(sequence[2], Note)

    def test_parse_sequence_with_durations(self):
        """Test parsing sequence with various durations."""
        parser = FrenchParser()
        sequence = parser.parse_sequence('Do2 Re0.5 Mi R2')
        assert sequence[0].duration == 2.0
        assert sequence[1].duration == 0.5
        assert sequence[3].duration == 2.0

    def test_parse_empty_sequence(self):
        """Test parsing empty sequence."""
        parser = FrenchParser()
        sequence = parser.parse_sequence('')
        assert len(sequence) == 0

    def test_parse_sequence_with_comma_separator(self):
        """Test parsing sequence with comma separator."""
        parser = FrenchParser()
        sequence = parser.parse_sequence('Do, Re, Mi')
        assert len(sequence) == 3

    def test_parse_sequence_mixed_separators(self):
        """Test parsing with mixed separators (spaces and commas)."""
        parser = FrenchParser()
        sequence = parser.parse_sequence('Do Re, Mi R')
        assert len(sequence) == 4


class TestParsePartition:
    """Tests for parsing complete partitions."""

    def test_parse_partition_from_dict(self):
        """Test parsing partition from dictionary."""
        parser = FrenchParser()
        data = {
            'title': 'Test Song',
            'tempo': 120,
            'clef': 'sol',
            'key_signature': 'C',
            'time_signature': [4, 4],
            'notes': 'Do Re Mi Fa Sol'
        }

        partition = parser.parse_partition(data)

        assert isinstance(partition, Partition)
        assert partition.metadata.title == 'Test Song'
        assert partition.metadata.tempo == 120
        assert len(partition.elements) == 5

    def test_parse_partition_with_chords(self):
        """Test parsing partition with chords."""
        parser = FrenchParser()
        data = {
            'title': 'Chord Song',
            'tempo': 90,
            'clef': 'sol',
            'notes': 'Do+Mi+Sol R Do+Fa+La'
        }

        partition = parser.parse_partition(data)
        assert len(partition.elements) == 3
        assert isinstance(partition.elements[0], Chord)
        assert isinstance(partition.elements[1], Rest)
        assert isinstance(partition.elements[2], Chord)

    def test_parse_partition_minimal(self):
        """Test parsing partition with minimal data."""
        parser = FrenchParser()
        data = {
            'title': 'Minimal',
            'tempo': 120,
            'clef': 'sol',
            'notes': 'Do'
        }

        partition = parser.parse_partition(data)
        assert partition.metadata.title == 'Minimal'
        assert len(partition.elements) == 1

    def test_parse_partition_defaults(self):
        """Test that partition uses default values when not specified."""
        parser = FrenchParser()
        data = {
            'title': 'Test',
            'tempo': 100,
            'clef': 'fa',
            'notes': 'Do'
        }

        partition = parser.parse_partition(data)
        assert partition.metadata.key_signature == 'C'
        assert partition.metadata.time_signature == (4, 4)


class TestParseErrors:
    """Tests for error handling."""

    def test_parse_invalid_note(self):
        """Test that invalid note raises ValueError."""
        parser = FrenchParser()
        with pytest.raises(ValueError):
            parser.parse_note('Invalid')

    def test_parse_invalid_chord(self):
        """Test that invalid chord raises ValueError."""
        parser = FrenchParser()
        with pytest.raises(ValueError):
            parser.parse_chord('Do')  # No + separator

    def test_parse_invalid_rest(self):
        """Test that invalid rest raises ValueError."""
        parser = FrenchParser()
        with pytest.raises(ValueError):
            parser.parse_rest('X')


class TestAutoDetect:
    """Tests for auto-detecting element types."""

    def test_autodetect_note(self):
        """Test auto-detecting a note."""
        parser = FrenchParser()
        elements = parser.parse_sequence('Do')
        assert isinstance(elements[0], Note)

    def test_autodetect_chord(self):
        """Test auto-detecting a chord."""
        parser = FrenchParser()
        elements = parser.parse_sequence('Do+Mi')
        assert isinstance(elements[0], Chord)

    def test_autodetect_rest(self):
        """Test auto-detecting a rest."""
        parser = FrenchParser()
        elements = parser.parse_sequence('R')
        assert isinstance(elements[0], Rest)


class TestParserConfiguration:
    """Tests for parser configuration and options."""

    def test_parser_creation(self):
        """Test creating parser instance."""
        parser = FrenchParser()
        assert parser is not None

    def test_parse_with_whitespace(self):
        """Test that parser handles extra whitespace correctly."""
        parser = FrenchParser()
        sequence = parser.parse_sequence('  Do   Re    Mi  ')
        assert len(sequence) == 3
