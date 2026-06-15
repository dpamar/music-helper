"""Tests for Partition class."""

import pytest
import json
import tempfile
import os
from music_helper.core.partition import Partition
from music_helper.core.metadata import Metadata
from music_helper.core.note import Note
from music_helper.core.chord import Chord
from music_helper.core.rest import Rest


class TestPartitionCreation:
    """Tests for creating Partition instances."""

    def test_create_empty_partition(self):
        """Test creating an empty partition with metadata."""
        metadata = Metadata(title="Test", tempo=120, clef="sol")
        partition = Partition(metadata)
        assert partition.metadata == metadata
        assert len(partition.elements) == 0

    def test_create_partition_with_elements(self):
        """Test creating partition with initial elements."""
        metadata = Metadata(title="Test", tempo=120, clef="sol")
        elements = [Note('Do'), Rest(1.0), Note('Re')]
        partition = Partition(metadata, elements)
        assert len(partition.elements) == 3


class TestPartitionAddElement:
    """Tests for adding elements to partition."""

    def test_add_note(self):
        """Test adding a note to partition."""
        metadata = Metadata(title="Test", tempo=120, clef="sol")
        partition = Partition(metadata)
        note = Note('Do')
        partition.add_element(note)
        assert len(partition.elements) == 1
        assert partition.elements[0] == note

    def test_add_chord(self):
        """Test adding a chord to partition."""
        metadata = Metadata(title="Test", tempo=120, clef="sol")
        partition = Partition(metadata)
        chord = Chord([Note('Do'), Note('Mi')])
        partition.add_element(chord)
        assert len(partition.elements) == 1
        assert partition.elements[0] == chord

    def test_add_rest(self):
        """Test adding a rest to partition."""
        metadata = Metadata(title="Test", tempo=120, clef="sol")
        partition = Partition(metadata)
        rest = Rest(1.0)
        partition.add_element(rest)
        assert len(partition.elements) == 1
        assert partition.elements[0] == rest

    def test_add_multiple_elements(self):
        """Test adding multiple elements."""
        metadata = Metadata(title="Test", tempo=120, clef="sol")
        partition = Partition(metadata)
        partition.add_element(Note('Do'))
        partition.add_element(Rest(1.0))
        partition.add_element(Chord([Note('Mi'), Note('Sol')]))
        assert len(partition.elements) == 3

    def test_add_invalid_element(self):
        """Test that adding invalid element raises TypeError."""
        metadata = Metadata(title="Test", tempo=120, clef="sol")
        partition = Partition(metadata)
        with pytest.raises(TypeError):
            partition.add_element("not a valid element")


class TestPartitionValidation:
    """Tests for partition validation."""

    def test_valid_partition(self):
        """Test that valid partition passes validation."""
        metadata = Metadata(title="Test", tempo=120, clef="sol")
        partition = Partition(metadata)
        partition.add_element(Note('Do'))
        assert partition.validate() is True

    def test_empty_partition_valid(self):
        """Test that empty partition is valid."""
        metadata = Metadata(title="Test", tempo=120, clef="sol")
        partition = Partition(metadata)
        assert partition.validate() is True


class TestPartitionSerialization:
    """Tests for partition serialization."""

    def test_to_dict(self):
        """Test converting partition to dictionary."""
        metadata = Metadata(title="Test Song", tempo=120, clef="sol")
        partition = Partition(metadata)
        partition.add_element(Note('Do', duration=1.0))
        partition.add_element(Rest(1.0))

        part_dict = partition.to_dict()

        assert part_dict['metadata']['title'] == "Test Song"
        assert len(part_dict['elements']) == 2
        assert part_dict['elements'][0]['type'] == 'note'
        assert part_dict['elements'][1]['type'] == 'rest'

    def test_to_json(self):
        """Test saving partition to JSON file."""
        metadata = Metadata(title="Test", tempo=120, clef="sol")
        partition = Partition(metadata)
        partition.add_element(Note('Do'))

        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            temp_path = f.name

        try:
            partition.to_json(temp_path)
            assert os.path.exists(temp_path)

            # Verify content
            with open(temp_path, 'r') as f:
                data = json.load(f)
                assert data['metadata']['title'] == "Test"
                assert len(data['elements']) == 1
        finally:
            if os.path.exists(temp_path):
                os.unlink(temp_path)

    def test_from_json(self):
        """Test loading partition from JSON file."""
        metadata = Metadata(title="Saved Song", tempo=90, clef="fa")
        partition = Partition(metadata)
        partition.add_element(Note('Do', duration=2.0))
        partition.add_element(Rest(1.0))

        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            temp_path = f.name

        try:
            partition.to_json(temp_path)
            loaded_partition = Partition.from_json(temp_path)

            assert loaded_partition.metadata.title == "Saved Song"
            assert loaded_partition.metadata.tempo == 90
            assert loaded_partition.metadata.clef == "fa"
            assert len(loaded_partition.elements) == 2
            assert isinstance(loaded_partition.elements[0], Note)
            assert isinstance(loaded_partition.elements[1], Rest)
        finally:
            if os.path.exists(temp_path):
                os.unlink(temp_path)

    def test_from_dict(self):
        """Test creating partition from dictionary."""
        data = {
            'metadata': {
                'title': 'Test',
                'tempo': 120,
                'clef': 'sol',
                'key_signature': 'C',
                'time_signature': [4, 4]
            },
            'elements': [
                {'type': 'note', 'pitch': 'Do', 'duration': 1.0, 'octave': 4, 'accidental': None},
                {'type': 'rest', 'duration': 1.0},
                {'type': 'chord', 'duration': 2.0, 'notes': [
                    {'type': 'note', 'pitch': 'Mi', 'duration': 2.0, 'octave': 4, 'accidental': None},
                    {'type': 'note', 'pitch': 'Sol', 'duration': 2.0, 'octave': 4, 'accidental': None}
                ]}
            ]
        }

        partition = Partition.from_dict(data)

        assert partition.metadata.title == 'Test'
        assert len(partition.elements) == 3
        assert isinstance(partition.elements[0], Note)
        assert isinstance(partition.elements[1], Rest)
        assert isinstance(partition.elements[2], Chord)


class TestPartitionDuration:
    """Tests for partition duration calculation."""

    def test_total_duration(self):
        """Test calculating total duration of partition."""
        metadata = Metadata(title="Test", tempo=120, clef="sol")
        partition = Partition(metadata)
        partition.add_element(Note('Do', duration=1.0))
        partition.add_element(Note('Re', duration=2.0))
        partition.add_element(Rest(1.0))

        assert partition.total_duration() == 4.0

    def test_empty_partition_duration(self):
        """Test that empty partition has zero duration."""
        metadata = Metadata(title="Test", tempo=120, clef="sol")
        partition = Partition(metadata)
        assert partition.total_duration() == 0.0


class TestPartitionString:
    """Tests for string representation of partition."""

    def test_str_partition(self):
        """Test string representation of partition."""
        metadata = Metadata(title="Test Song", tempo=120, clef="sol")
        partition = Partition(metadata)
        partition.add_element(Note('Do'))

        part_str = str(partition)
        assert "Test Song" in part_str

    def test_repr_partition(self):
        """Test repr of partition."""
        metadata = Metadata(title="Test", tempo=120, clef="sol")
        partition = Partition(metadata)
        repr_str = repr(partition)
        assert 'Partition' in repr_str
