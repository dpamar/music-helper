"""Tests for LayoutEngine class."""

import pytest
from music_helper.renderer.layout import LayoutEngine
from music_helper.core import Note, Chord, Rest, Partition, Metadata


class TestLayoutEngineCreation:
    """Tests for creating LayoutEngine instances."""

    def test_create_default_layout(self):
        """Test creating layout engine with default values."""
        layout = LayoutEngine()
        assert layout.width == 800
        assert layout.height == 1000
        assert layout.staff_spacing == 100
        assert layout.margin == 50

    def test_create_custom_layout(self):
        """Test creating layout engine with custom values."""
        layout = LayoutEngine(width=1000, height=1200, staff_spacing=120, margin=60)
        assert layout.width == 1000
        assert layout.height == 1200
        assert layout.staff_spacing == 120
        assert layout.margin == 60


class TestStaffPositions:
    """Tests for calculating staff positions."""

    def test_single_staff_position(self):
        """Test calculating position for single staff."""
        layout = LayoutEngine()
        positions = layout.calculate_staff_positions(1)
        assert len(positions) == 1
        assert positions[0] > layout.margin

    def test_multiple_staff_positions(self):
        """Test calculating positions for multiple staves."""
        layout = LayoutEngine()
        positions = layout.calculate_staff_positions(3)
        assert len(positions) == 3
        # Check they are spaced correctly
        assert positions[1] - positions[0] >= layout.staff_spacing
        assert positions[2] - positions[1] >= layout.staff_spacing

    def test_staff_positions_within_bounds(self):
        """Test that staff positions stay within page bounds."""
        layout = LayoutEngine()
        positions = layout.calculate_staff_positions(5)
        for pos in positions:
            assert pos >= layout.margin
            assert pos <= layout.height - layout.margin


class TestNoteX:
    """Tests for calculating horizontal note positions."""

    def test_note_x_at_start(self):
        """Test calculating x position at start of measure."""
        layout = LayoutEngine()
        x = layout.calculate_note_x(measure_x=100, beat_position=0.0)
        assert x >= 100

    def test_note_x_progression(self):
        """Test that x positions increase with beat position."""
        layout = LayoutEngine()
        x1 = layout.calculate_note_x(measure_x=100, beat_position=0.0)
        x2 = layout.calculate_note_x(measure_x=100, beat_position=1.0)
        x3 = layout.calculate_note_x(measure_x=100, beat_position=2.0)
        assert x1 < x2 < x3

    def test_note_x_spacing(self):
        """Test that note spacing is proportional to duration."""
        layout = LayoutEngine()
        x_start = layout.calculate_note_x(measure_x=100, beat_position=0.0)
        x_one_beat = layout.calculate_note_x(measure_x=100, beat_position=1.0)
        x_two_beats = layout.calculate_note_x(measure_x=100, beat_position=2.0)

        spacing_one = x_one_beat - x_start
        spacing_two = x_two_beats - x_start

        # Two beats should be roughly twice the spacing of one beat
        assert abs(spacing_two - 2 * spacing_one) < 10


class TestNoteY:
    """Tests for calculating vertical note positions."""

    def test_note_y_middle_c_treble(self):
        """Test calculating y position for middle C in treble clef."""
        layout = LayoutEngine()
        y = layout.calculate_note_y(staff_y=200, pitch='Do', octave=4, clef='sol')
        assert isinstance(y, int)
        assert y > 0

    def test_note_y_different_pitches(self):
        """Test that different pitches have different y positions."""
        layout = LayoutEngine()
        y_do = layout.calculate_note_y(staff_y=200, pitch='Do', octave=4, clef='sol')
        y_re = layout.calculate_note_y(staff_y=200, pitch='Re', octave=4, clef='sol')
        y_mi = layout.calculate_note_y(staff_y=200, pitch='Mi', octave=4, clef='sol')

        # Higher pitches should have lower y coordinates (y increases downward)
        assert y_do != y_re != y_mi

    def test_note_y_different_octaves(self):
        """Test that different octaves have different y positions."""
        layout = LayoutEngine()
        y_oct3 = layout.calculate_note_y(staff_y=200, pitch='Do', octave=3, clef='sol')
        y_oct4 = layout.calculate_note_y(staff_y=200, pitch='Do', octave=4, clef='sol')
        y_oct5 = layout.calculate_note_y(staff_y=200, pitch='Do', octave=5, clef='sol')

        # Higher octaves should have lower y coordinates
        assert y_oct5 < y_oct4 < y_oct3

    def test_note_y_treble_vs_bass(self):
        """Test that y positions differ between treble and bass clefs."""
        layout = LayoutEngine()
        y_treble = layout.calculate_note_y(staff_y=200, pitch='Do', octave=4, clef='sol')
        y_bass = layout.calculate_note_y(staff_y=200, pitch='Do', octave=4, clef='fa')

        # Same pitch/octave should have different positions in different clefs
        assert y_treble != y_bass


class TestPartitionLayout:
    """Tests for laying out complete partitions."""

    def test_layout_empty_partition(self):
        """Test laying out an empty partition."""
        layout = LayoutEngine()
        metadata = Metadata(title="Test", tempo=120, clef="sol")
        partition = Partition(metadata)

        layout_data = layout.layout_partition(partition)

        assert 'metadata' in layout_data
        assert 'staves' in layout_data
        assert len(layout_data['staves']) >= 0

    def test_layout_simple_partition(self):
        """Test laying out a partition with few notes."""
        layout = LayoutEngine()
        metadata = Metadata(title="Simple", tempo=120, clef="sol")
        partition = Partition(metadata)
        partition.add_element(Note('Do', duration=1.0))
        partition.add_element(Note('Re', duration=1.0))
        partition.add_element(Note('Mi', duration=1.0))

        layout_data = layout.layout_partition(partition)

        assert 'staves' in layout_data
        assert len(layout_data['staves']) >= 1
        assert len(layout_data['staves'][0]['elements']) == 3

    def test_layout_with_different_durations(self):
        """Test layout with notes of different durations."""
        layout = LayoutEngine()
        metadata = Metadata(title="Test", tempo=120, clef="sol")
        partition = Partition(metadata)
        partition.add_element(Note('Do', duration=2.0))
        partition.add_element(Note('Re', duration=1.0))
        partition.add_element(Note('Mi', duration=0.5))

        layout_data = layout.layout_partition(partition)

        assert len(layout_data['staves'][0]['elements']) == 3

    def test_layout_with_rests(self):
        """Test layout with rests."""
        layout = LayoutEngine()
        metadata = Metadata(title="Test", tempo=120, clef="sol")
        partition = Partition(metadata)
        partition.add_element(Note('Do'))
        partition.add_element(Rest(1.0))
        partition.add_element(Note('Re'))

        layout_data = layout.layout_partition(partition)

        assert len(layout_data['staves'][0]['elements']) == 3

    def test_layout_with_chords(self):
        """Test layout with chords."""
        layout = LayoutEngine()
        metadata = Metadata(title="Test", tempo=120, clef="sol")
        partition = Partition(metadata)
        chord = Chord([Note('Do'), Note('Mi'), Note('Sol')])
        partition.add_element(chord)

        layout_data = layout.layout_partition(partition)

        assert len(layout_data['staves'][0]['elements']) == 1

    def test_layout_multi_staff(self):
        """Test layout that requires multiple staves."""
        layout = LayoutEngine(width=400)  # Narrow width to force multiple staves
        metadata = Metadata(title="Long", tempo=120, clef="sol")
        partition = Partition(metadata)

        # Add many notes to overflow one staff
        for i in range(20):
            partition.add_element(Note('Do', duration=1.0))

        layout_data = layout.layout_partition(partition)

        # Should have multiple staves
        assert len(layout_data['staves']) >= 2


class TestLayoutConstants:
    """Tests for layout constants and measurements."""

    def test_staff_line_spacing(self):
        """Test that staff line spacing is defined."""
        layout = LayoutEngine()
        assert hasattr(layout, 'line_spacing')
        assert layout.line_spacing > 0

    def test_note_spacing(self):
        """Test that note spacing is defined."""
        layout = LayoutEngine()
        assert hasattr(layout, 'note_spacing')
        assert layout.note_spacing > 0
