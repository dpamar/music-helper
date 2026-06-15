"""Symbol renderer for drawing musical symbols using Pillow."""

from PIL import ImageDraw
from typing import Tuple


class SymbolRenderer:
    """Renders individual musical symbols using Pillow drawing primitives.

    This is a simplified implementation that uses basic shapes.
    Future enhancements could use TrueType music fonts.
    """

    def __init__(self, draw: ImageDraw.Draw, scale: float = 1.0):
        """Initialize SymbolRenderer.

        Args:
            draw: PIL ImageDraw object
            scale: Scale factor for all symbols
        """
        self.draw = draw
        self.scale = scale
        self.line_spacing = int(10 * scale)

    def draw_staff(self, x: int, y: int, width: int) -> None:
        """Draw a 5-line musical staff.

        Args:
            x: Left x coordinate
            y: Top y coordinate (position of top line)
            width: Width of staff in pixels
        """
        for i in range(5):
            line_y = y + i * self.line_spacing
            self.draw.line(
                [(x, line_y), (x + width, line_y)],
                fill='black',
                width=1
            )

    def draw_treble_clef(self, x: int, y: int) -> None:
        """Draw simplified treble clef.

        Args:
            x: X coordinate
            y: Y coordinate (staff position)
        """
        # Simplified G clef shape
        center_y = y + 2 * self.line_spacing

        # Main spiral
        self.draw.ellipse(
            [x - 8, center_y - 10, x + 8, center_y + 10],
            outline='black',
            width=2
        )

        # Vertical line
        self.draw.line(
            [(x + 6, center_y - 10), (x + 6, y + 4 * self.line_spacing)],
            fill='black',
            width=2
        )

        # Top curl
        self.draw.arc(
            [x - 5, y - 10, x + 15, y + 20],
            start=180,
            end=0,
            fill='black',
            width=2
        )

    def draw_bass_clef(self, x: int, y: int) -> None:
        """Draw simplified bass clef.

        Args:
            x: X coordinate
            y: Y coordinate (staff position)
        """
        # F clef - simplified
        center_y = y + self.line_spacing

        # Main C shape
        self.draw.arc(
            [x - 10, center_y - 15, x + 10, center_y + 15],
            start=90,
            end=270,
            fill='black',
            width=3
        )

        # Two dots
        dot_y1 = y + self.line_spacing
        dot_y2 = y + 2 * self.line_spacing
        self.draw.ellipse([x + 12, dot_y1 - 3, x + 18, dot_y1 + 3], fill='black')
        self.draw.ellipse([x + 12, dot_y2 - 3, x + 18, dot_y2 + 3], fill='black')

    def draw_note_head(self, x: int, y: int, filled: bool = True) -> None:
        """Draw a note head.

        Args:
            x: Center x coordinate
            y: Center y coordinate
            filled: If True, draw filled note head (quarter/shorter), else hollow (half/whole)
        """
        # Ellipse for note head (slightly tilted)
        size = 6
        bbox = [x - size, y - int(size * 0.7), x + size, y + int(size * 0.7)]

        if filled:
            self.draw.ellipse(bbox, fill='black', outline='black')
        else:
            self.draw.ellipse(bbox, outline='black', width=2)

    def draw_stem(self, x: int, y: int, direction: str = 'up', length: int = 35) -> None:
        """Draw a note stem.

        Args:
            x: X coordinate (note head position)
            y: Y coordinate (note head center)
            direction: 'up' or 'down'
            length: Stem length in pixels
        """
        if direction == 'up':
            # Stem on right side, going up
            self.draw.line(
                [(x + 6, y), (x + 6, y - length)],
                fill='black',
                width=2
            )
        else:
            # Stem on left side, going down
            self.draw.line(
                [(x - 6, y), (x - 6, y + length)],
                fill='black',
                width=2
            )

    def draw_flag(self, x: int, y: int, duration: float, direction: str = 'up') -> None:
        """Draw flags for eighth/sixteenth notes.

        Args:
            x: X coordinate (top of stem)
            y: Y coordinate (top of stem)
            duration: Note duration (0.5 = eighth, 0.25 = sixteenth)
            direction: 'up' or 'down'
        """
        num_flags = 0
        if duration == 0.5:
            num_flags = 1
        elif duration == 0.25:
            num_flags = 2

        if direction == 'up':
            flag_x = x + 6
            for i in range(num_flags):
                flag_y = y + i * 6
                # Simple curved flag
                self.draw.arc(
                    [flag_x - 2, flag_y, flag_x + 10, flag_y + 12],
                    start=180,
                    end=90,
                    fill='black',
                    width=2
                )
        else:
            flag_x = x - 6
            for i in range(num_flags):
                flag_y = y + 35 - i * 6
                self.draw.arc(
                    [flag_x - 10, flag_y - 12, flag_x + 2, flag_y],
                    start=0,
                    end=270,
                    fill='black',
                    width=2
                )

    def draw_rest(self, x: int, y: int, duration: float) -> None:
        """Draw a rest symbol.

        Args:
            x: Center x coordinate
            y: Center y coordinate (staff middle)
            duration: Rest duration
        """
        if duration == 4.0:  # Whole rest
            # Block below a line
            self.draw.rectangle(
                [x - 8, y - self.line_spacing, x + 8, y - self.line_spacing + 6],
                fill='black'
            )
        elif duration == 2.0:  # Half rest
            # Block above a line
            self.draw.rectangle(
                [x - 8, y, x + 8, y + 6],
                fill='black'
            )
        elif duration == 1.0:  # Quarter rest
            # Simplified Z-shape
            self.draw.line([(x - 5, y - 10), (x + 5, y - 5)], fill='black', width=2)
            self.draw.line([(x + 5, y - 5), (x - 5, y)], fill='black', width=3)
            self.draw.line([(x - 5, y), (x + 5, y + 10)], fill='black', width=2)
        elif duration == 0.5:  # Eighth rest
            # Simplified hook
            self.draw.line([(x, y - 8), (x, y + 8)], fill='black', width=2)
            self.draw.ellipse([x - 4, y + 4, x + 4, y + 12], fill='black')
        elif duration == 0.25:  # Sixteenth rest
            # Two hooks
            self.draw.line([(x, y - 8), (x, y + 12)], fill='black', width=2)
            self.draw.ellipse([x - 4, y, x + 4, y + 8], fill='black')
            self.draw.ellipse([x - 4, y + 8, x + 4, y + 16], fill='black')

    def draw_time_signature(self, x: int, y: int, numerator: int, denominator: int) -> None:
        """Draw time signature.

        Args:
            x: X coordinate
            y: Y coordinate (staff top)
            numerator: Top number
            denominator: Bottom number
        """
        # Use simple text for numbers
        from PIL import ImageFont
        try:
            font = ImageFont.truetype("Arial", 20)
        except:
            font = ImageFont.load_default()

        center_y = y + 2 * self.line_spacing

        self.draw.text(
            (x, center_y - 15),
            str(numerator),
            fill='black',
            font=font,
            anchor='mm'
        )
        self.draw.text(
            (x, center_y + 10),
            str(denominator),
            fill='black',
            font=font,
            anchor='mm'
        )

    def draw_key_signature(self, x: int, y: int, key: str, clef: str) -> None:
        """Draw key signature (simplified - just shows number of sharps/flats).

        Args:
            x: X coordinate
            y: Y coordinate (staff top)
            key: Key signature
            clef: Clef type
        """
        # Simplified: just indicate sharps or flats
        # In a full implementation, would draw sharp/flat symbols at specific positions

        if '#' in key or key in ['G', 'D', 'A', 'E', 'B']:
            # Sharp keys - draw # symbols
            num_sharps = {'G': 1, 'D': 2, 'A': 3, 'E': 4, 'B': 5, 'F#': 6, 'C#': 7}.get(key, 0)
            for i in range(num_sharps):
                sharp_x = x + i * 8
                sharp_y = y + self.line_spacing
                self.draw.text((sharp_x, sharp_y), '#', fill='black')

        elif 'b' in key or key in ['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb']:
            # Flat keys - draw b symbols
            num_flats = {'F': 1, 'Bb': 2, 'Eb': 3, 'Ab': 4, 'Db': 5, 'Gb': 6, 'Cb': 7}.get(key, 0)
            for i in range(num_flats):
                flat_x = x + i * 8
                flat_y = y + 2 * self.line_spacing
                self.draw.text((flat_x, flat_y), 'b', fill='black')
