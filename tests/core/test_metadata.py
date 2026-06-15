"""Tests for Metadata class."""

import pytest
from music_helper.core.metadata import Metadata


class TestMetadataCreation:
    """Tests for creating Metadata instances."""

    def test_create_simple_metadata(self):
        """Test creating metadata with required fields."""
        metadata = Metadata(title="Test Song", tempo=120, clef="sol")
        assert metadata.title == "Test Song"
        assert metadata.tempo == 120
        assert metadata.clef == "sol"
        assert metadata.key_signature == "C"
        assert metadata.time_signature == (4, 4)

    def test_create_metadata_with_all_fields(self):
        """Test creating metadata with all fields."""
        metadata = Metadata(
            title="Complete Song",
            tempo=90,
            clef="fa",
            key_signature="G",
            time_signature=(3, 4)
        )
        assert metadata.title == "Complete Song"
        assert metadata.tempo == 90
        assert metadata.clef == "fa"
        assert metadata.key_signature == "G"
        assert metadata.time_signature == (3, 4)


class TestMetadataValidation:
    """Tests for metadata validation."""

    def test_valid_clefs(self):
        """Test that valid clefs are accepted."""
        for clef in ['sol', 'fa']:
            metadata = Metadata(title="Test", tempo=120, clef=clef)
            assert metadata.validate() is True

    def test_invalid_clef(self):
        """Test that invalid clef raises ValueError."""
        with pytest.raises(ValueError):
            Metadata(title="Test", tempo=120, clef="ut")

    def test_valid_tempo(self):
        """Test that valid tempos are accepted."""
        for tempo in [40, 60, 120, 180, 240]:
            metadata = Metadata(title="Test", tempo=tempo, clef="sol")
            assert metadata.validate() is True

    def test_invalid_tempo_zero(self):
        """Test that zero tempo raises ValueError."""
        with pytest.raises(ValueError):
            Metadata(title="Test", tempo=0, clef="sol")

    def test_invalid_tempo_negative(self):
        """Test that negative tempo raises ValueError."""
        with pytest.raises(ValueError):
            Metadata(title="Test", tempo=-60, clef="sol")

    def test_invalid_tempo_too_high(self):
        """Test that extremely high tempo raises ValueError."""
        with pytest.raises(ValueError):
            Metadata(title="Test", tempo=500, clef="sol")

    def test_valid_key_signatures(self):
        """Test that valid key signatures are accepted."""
        valid_keys = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#',
                     'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb']
        for key in valid_keys:
            metadata = Metadata(title="Test", tempo=120, clef="sol", key_signature=key)
            assert metadata.validate() is True

    def test_invalid_key_signature(self):
        """Test that invalid key signature raises ValueError."""
        with pytest.raises(ValueError):
            Metadata(title="Test", tempo=120, clef="sol", key_signature="X")

    def test_valid_time_signatures(self):
        """Test that valid time signatures are accepted."""
        valid_times = [(2, 4), (3, 4), (4, 4), (5, 4), (6, 8), (9, 8), (12, 8)]
        for time_sig in valid_times:
            metadata = Metadata(title="Test", tempo=120, clef="sol", time_signature=time_sig)
            assert metadata.validate() is True

    def test_invalid_time_signature_numerator(self):
        """Test that invalid time signature numerator raises ValueError."""
        with pytest.raises(ValueError):
            Metadata(title="Test", tempo=120, clef="sol", time_signature=(0, 4))

        with pytest.raises(ValueError):
            Metadata(title="Test", tempo=120, clef="sol", time_signature=(20, 4))

    def test_invalid_time_signature_denominator(self):
        """Test that invalid time signature denominator raises ValueError."""
        with pytest.raises(ValueError):
            Metadata(title="Test", tempo=120, clef="sol", time_signature=(4, 3))

        with pytest.raises(ValueError):
            Metadata(title="Test", tempo=120, clef="sol", time_signature=(4, 7))


class TestMetadataEquality:
    """Tests for metadata equality."""

    def test_equal_metadata(self):
        """Test that identical metadata are equal."""
        meta1 = Metadata(title="Song", tempo=120, clef="sol")
        meta2 = Metadata(title="Song", tempo=120, clef="sol")
        assert meta1 == meta2

    def test_different_title(self):
        """Test that metadata with different titles are not equal."""
        meta1 = Metadata(title="Song1", tempo=120, clef="sol")
        meta2 = Metadata(title="Song2", tempo=120, clef="sol")
        assert meta1 != meta2

    def test_different_tempo(self):
        """Test that metadata with different tempos are not equal."""
        meta1 = Metadata(title="Song", tempo=120, clef="sol")
        meta2 = Metadata(title="Song", tempo=90, clef="sol")
        assert meta1 != meta2


class TestMetadataSerialization:
    """Tests for metadata serialization."""

    def test_to_dict(self):
        """Test converting metadata to dictionary."""
        metadata = Metadata(
            title="Test Song",
            tempo=120,
            clef="sol",
            key_signature="G",
            time_signature=(3, 4)
        )
        meta_dict = metadata.to_dict()

        assert meta_dict['title'] == "Test Song"
        assert meta_dict['tempo'] == 120
        assert meta_dict['clef'] == "sol"
        assert meta_dict['key_signature'] == "G"
        assert meta_dict['time_signature'] == [3, 4]


class TestMetadataString:
    """Tests for string representation of metadata."""

    def test_str_metadata(self):
        """Test string representation of metadata."""
        metadata = Metadata(title="Test Song", tempo=120, clef="sol")
        meta_str = str(metadata)
        assert "Test Song" in meta_str
        assert "120" in meta_str

    def test_repr_metadata(self):
        """Test repr of metadata."""
        metadata = Metadata(title="Test", tempo=120, clef="sol")
        repr_str = repr(metadata)
        assert 'Metadata' in repr_str
