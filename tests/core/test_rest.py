"""Tests for Rest class."""

import pytest
from music_helper.core.rest import Rest


class TestRestCreation:
    """Tests for creating Rest instances."""

    def test_create_simple_rest(self):
        """Test creating a rest with default duration."""
        rest = Rest()
        assert rest.duration == 1.0

    def test_create_rest_with_duration(self):
        """Test creating a rest with specific duration."""
        rest = Rest(duration=2.0)
        assert rest.duration == 2.0


class TestRestValidation:
    """Tests for rest validation."""

    def test_valid_durations(self):
        """Test that all valid durations are accepted."""
        valid_durations = [4.0, 2.0, 1.0, 0.5, 0.25]
        for duration in valid_durations:
            rest = Rest(duration=duration)
            assert rest.validate() is True

    def test_invalid_duration(self):
        """Test that invalid durations raise ValueError."""
        with pytest.raises(ValueError):
            Rest(duration=3.0)

        with pytest.raises(ValueError):
            Rest(duration=-1.0)


class TestRestEquality:
    """Tests for rest equality."""

    def test_equal_rests(self):
        """Test that identical rests are equal."""
        rest1 = Rest(duration=1.0)
        rest2 = Rest(duration=1.0)
        assert rest1 == rest2

    def test_different_duration(self):
        """Test that rests with different durations are not equal."""
        rest1 = Rest(duration=1.0)
        rest2 = Rest(duration=2.0)
        assert rest1 != rest2


class TestRestSerialization:
    """Tests for rest serialization."""

    def test_to_dict(self):
        """Test converting rest to dictionary."""
        rest = Rest(duration=2.0)
        rest_dict = rest.to_dict()

        assert rest_dict['type'] == 'rest'
        assert rest_dict['duration'] == 2.0


class TestRestFromString:
    """Tests for parsing rests from string notation."""

    def test_parse_simple_rest(self):
        """Test parsing simple rest like 'R'."""
        rest = Rest.from_string('R')
        assert rest.duration == 1.0

    def test_parse_rest_with_duration(self):
        """Test parsing rest with duration like 'R2'."""
        rest = Rest.from_string('R2')
        assert rest.duration == 2.0

    def test_parse_rest_decimal_duration(self):
        """Test parsing rest with decimal duration like 'R0.5'."""
        rest = Rest.from_string('R0.5')
        assert rest.duration == 0.5


class TestRestString:
    """Tests for string representation of rests."""

    def test_str_rest(self):
        """Test string representation of rest."""
        rest = Rest(duration=2.0)
        assert 'Rest' in str(rest) or 'rest' in str(rest)
        assert '2' in str(rest)

    def test_repr_rest(self):
        """Test repr of rest."""
        rest = Rest(duration=1.0)
        repr_str = repr(rest)
        assert 'Rest' in repr_str
