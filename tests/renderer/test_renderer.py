"""Tests for PartitionRenderer class."""

import pytest
import tempfile
import os
from PIL import Image
from music_helper.renderer.renderer import PartitionRenderer
from music_helper.core import Note, Chord, Rest, Partition, Metadata


class TestRendererCreation:
    """Tests for creating renderer."""

    def test_create_default_renderer(self):
        """Test creating renderer with default settings."""
        renderer = PartitionRenderer()
        assert renderer.width == 800
        assert renderer.height == 1000

    def test_create_custom_renderer(self):
        """Test creating renderer with custom settings."""
        renderer = PartitionRenderer(width=1000, height=1200)
        assert renderer.width == 1000
        assert renderer.height == 1200


class TestRenderPartition:
    """Tests for rendering partitions."""

    def test_render_simple_partition(self):
        """Test rendering a simple partition."""
        renderer = PartitionRenderer()
        metadata = Metadata(title="Test", tempo=120, clef="sol")
        partition = Partition(metadata)
        partition.add_element(Note('Do'))

        with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as f:
            temp_path = f.name

        try:
            renderer.render(partition, temp_path)
            assert os.path.exists(temp_path)

            # Verify it's a valid PNG
            img = Image.open(temp_path)
            assert img.format == 'PNG'
            assert img.size == (800, 1000)
        finally:
            if os.path.exists(temp_path):
                os.unlink(temp_path)

    def test_render_partition_with_chords(self):
        """Test rendering partition with chords."""
        renderer = PartitionRenderer()
        metadata = Metadata(title="Chords", tempo=90, clef="sol")
        partition = Partition(metadata)
        chord = Chord([Note('Do'), Note('Mi'), Note('Sol')])
        partition.add_element(chord)

        with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as f:
            temp_path = f.name

        try:
            renderer.render(partition, temp_path)
            assert os.path.exists(temp_path)
        finally:
            if os.path.exists(temp_path):
                os.unlink(temp_path)

    def test_render_partition_with_rests(self):
        """Test rendering partition with rests."""
        renderer = PartitionRenderer()
        metadata = Metadata(title="Rests", tempo=120, clef="sol")
        partition = Partition(metadata)
        partition.add_element(Note('Do'))
        partition.add_element(Rest(1.0))
        partition.add_element(Note('Re'))

        with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as f:
            temp_path = f.name

        try:
            renderer.render(partition, temp_path)
            assert os.path.exists(temp_path)
        finally:
            if os.path.exists(temp_path):
                os.unlink(temp_path)
