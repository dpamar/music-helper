"""Main rendering engine for musical partitions."""

from PIL import Image, ImageDraw, ImageFont
from typing import List
from ..core import Note, Chord, Rest, Partition
from .layout import LayoutEngine
from .symbols import SymbolRenderer


class PartitionRenderer:
    """Main renderer for converting partitions to images.

    Uses LayoutEngine for positioning and SymbolRenderer for drawing.
    """

    def __init__(self, width: int = 800, height: int = 1000):
        """Initialize PartitionRenderer.

        Args:
            width: Image width in pixels
            height: Image height in pixels
        """
        self.width = width
        self.height = height
        self.layout_engine = LayoutEngine(width=width, height=height)

    def render(self, partition: Partition, output_path: str) -> None:
        """Render partition to image file.

        Args:
            partition: Partition to render
            output_path: Path to save PNG file
        """
        # Create blank white image
        image = Image.new('RGB', (self.width, self.height), 'white')
        draw = ImageDraw.Draw(image)

        # Initialize symbol renderer
        symbol_renderer = SymbolRenderer(draw)

        # Render metadata (title, tempo, etc.)
        self._render_metadata(partition.metadata, image, draw)

        # Get layout
        layout_data = self.layout_engine.layout_partition(partition)

        # Render each staff
        for staff_data in layout_data['staves']:
            self._render_staff(staff_data, partition.metadata, symbol_renderer, draw)

        # Save image
        image.save(output_path, 'PNG')

    def _render_metadata(self, metadata, image: Image, draw: ImageDraw.Draw) -> None:
        """Render title, tempo, and other metadata.

        Args:
            metadata: Metadata object
            image: PIL Image
            draw: PIL ImageDraw
        """
        try:
            title_font = ImageFont.truetype("Arial", 24)
            info_font = ImageFont.truetype("Arial", 14)
        except:
            title_font = ImageFont.load_default()
            info_font = ImageFont.load_default()

        # Title - centered
        title_bbox = draw.textbbox((0, 0), metadata.title, font=title_font)
        title_width = title_bbox[2] - title_bbox[0]
        title_x = (self.width - title_width) // 2
        draw.text((title_x, 20), metadata.title, fill='black', font=title_font)

        # Tempo - top right
        tempo_text = f"♩ = {metadata.tempo}"
        draw.text((self.width - 100, 20), tempo_text, fill='black', font=info_font)

        # Key and time signature info (will also be drawn on staff)
        info_text = f"{metadata.key_signature} - {metadata.time_signature[0]}/{metadata.time_signature[1]}"
        draw.text((self.layout_engine.margin, 55), info_text, fill='black', font=info_font)

    def _render_staff(
        self,
        staff_data: dict,
        metadata,
        symbol_renderer: SymbolRenderer,
        draw: ImageDraw.Draw
    ) -> None:
        """Render a single staff with all its elements.

        Args:
            staff_data: Layout data for this staff
            metadata: Partition metadata
            symbol_renderer: SymbolRenderer instance
            draw: PIL ImageDraw
        """
        staff_y = staff_data['y']
        staff_x = staff_data['x']

        # Draw staff lines
        staff_width = self.width - staff_x - self.layout_engine.margin
        symbol_renderer.draw_staff(staff_x, staff_y, staff_width)

        # Draw clef at start of staff
        clef_x = staff_x - 60
        if metadata.clef == 'sol':
            symbol_renderer.draw_treble_clef(clef_x, staff_y)
        else:
            symbol_renderer.draw_bass_clef(clef_x, staff_y)

        # Draw time signature
        time_sig_x = staff_x - 30
        symbol_renderer.draw_time_signature(
            time_sig_x,
            staff_y,
            metadata.time_signature[0],
            metadata.time_signature[1]
        )

        # Draw key signature
        key_sig_x = staff_x - 20
        if metadata.key_signature != 'C':
            symbol_renderer.draw_key_signature(
                key_sig_x,
                staff_y,
                metadata.key_signature,
                metadata.clef
            )

        # Draw elements (notes, chords, rests)
        for elem_data in staff_data['elements']:
            element = elem_data['element']
            x = elem_data['x']

            if isinstance(element, Note):
                y = elem_data['y']
                self._render_note(element, x, y, symbol_renderer)

            elif isinstance(element, Chord):
                ys = elem_data['y']  # List of y positions
                self._render_chord(element, x, ys, symbol_renderer)

            elif isinstance(element, Rest):
                y = elem_data['y']
                self._render_rest(element, x, y, symbol_renderer)

    def _render_note(
        self,
        note: Note,
        x: int,
        y: int,
        symbol_renderer: SymbolRenderer
    ) -> None:
        """Render a single note.

        Args:
            note: Note object
            x: X position
            y: Y position
            symbol_renderer: SymbolRenderer instance
        """
        # Determine if note head should be filled
        filled = note.duration <= 1.0  # Quarter note and shorter are filled

        # Draw note head
        symbol_renderer.draw_note_head(x, y, filled=filled)

        # Draw stem for notes shorter than whole note
        if note.duration < 4.0:
            # Determine stem direction (up if below middle of staff, down if above)
            # For simplicity, we'll use a fixed rule
            symbol_renderer.draw_stem(x, y, direction='up')

            # Draw flags for eighth and sixteenth notes
            if note.duration <= 0.5:
                symbol_renderer.draw_flag(x, y - 35, note.duration, direction='up')

    def _render_chord(
        self,
        chord: Chord,
        x: int,
        ys: List[int],
        symbol_renderer: SymbolRenderer
    ) -> None:
        """Render a chord (multiple notes at same x position).

        Args:
            chord: Chord object
            x: X position
            ys: List of Y positions for each note in chord
            symbol_renderer: SymbolRenderer instance
        """
        filled = chord.duration <= 1.0

        # Draw all note heads
        for y in ys:
            symbol_renderer.draw_note_head(x, y, filled=filled)

        # Draw single stem from lowest to highest note
        if chord.duration < 4.0 and ys:
            min_y = min(ys)
            max_y = max(ys)

            # Draw stem from lowest note
            symbol_renderer.draw_stem(x, max_y, direction='up')

            # Draw flags if needed
            if chord.duration <= 0.5:
                symbol_renderer.draw_flag(x, min_y - 35, chord.duration, direction='up')

    def _render_rest(
        self,
        rest: Rest,
        x: int,
        y: int,
        symbol_renderer: SymbolRenderer
    ) -> None:
        """Render a rest.

        Args:
            rest: Rest object
            x: X position
            y: Y position
            symbol_renderer: SymbolRenderer instance
        """
        symbol_renderer.draw_rest(x, y, rest.duration)
