"""Layout engine for calculating positions of musical elements."""

from typing import List, Dict, Any, Tuple
from ..core import Note, Chord, Rest, Partition


class LayoutEngine:
    """Calculates positions for musical elements on the page.

    Attributes:
        width: Page width in pixels
        height: Page height in pixels
        staff_spacing: Vertical space between staves
        margin: Margin around the page
        line_spacing: Space between staff lines (pixels)
        note_spacing: Base horizontal space between notes (pixels)
    """

    # Staff line constants
    STAFF_LINES = 5
    LINE_SPACING = 10  # pixels between staff lines

    # Musical constants
    BEATS_PER_MEASURE = 4  # default, can be overridden by time signature
    NOTE_SPACING = 40  # base pixels per quarter note

    # Layout constants
    STAFF_LEFT_MARGIN = 80  # space for clef, key signature
    STAFF_MIN_WIDTH = 200  # minimum width for a staff
    TITLE_HEIGHT = 60  # space for title
    METADATA_HEIGHT = 40  # space for tempo, etc.

    def __init__(
        self,
        width: int = 800,
        height: int = 1000,
        staff_spacing: int = 100,
        margin: int = 50
    ):
        """Initialize LayoutEngine.

        Args:
            width: Page width in pixels
            height: Page height in pixels
            staff_spacing: Vertical spacing between staves
            margin: Page margin
        """
        self.width = width
        self.height = height
        self.staff_spacing = staff_spacing
        self.margin = margin
        self.line_spacing = self.LINE_SPACING
        self.note_spacing = self.NOTE_SPACING

    def calculate_staff_positions(self, num_staves: int) -> List[int]:
        """Calculate y positions for staff lines.

        Args:
            num_staves: Number of staves needed

        Returns:
            List of y coordinates for each staff (top line position)
        """
        positions = []
        # Start after margin, title, and metadata
        y = self.margin + self.TITLE_HEIGHT + self.METADATA_HEIGHT

        for i in range(num_staves):
            positions.append(y)
            y += self.staff_spacing

        return positions

    def calculate_note_x(self, measure_x: int, beat_position: float) -> int:
        """Calculate horizontal position for a note.

        Args:
            measure_x: X position of measure start
            beat_position: Beat position within measure (0.0 = start)

        Returns:
            X coordinate for the note
        """
        return measure_x + int(beat_position * self.note_spacing)

    def calculate_note_y(self, staff_y: int, pitch: str, octave: int, clef: str) -> int:
        """Calculate vertical position for a note.

        Args:
            staff_y: Y position of staff (top line)
            pitch: Note pitch (Do, Re, Mi, etc.)
            octave: Note octave (0-8)
            clef: Clef type ('sol' or 'fa')

        Returns:
            Y coordinate for the note center
        """
        # Map pitches to half-steps from Do
        pitch_to_halfsteps = {
            'Do': 0, 'Re': 2, 'Mi': 4, 'Fa': 5,
            'Sol': 7, 'La': 9, 'Si': 11
        }

        # Calculate absolute pitch (half-steps from C0)
        halfsteps = octave * 12 + pitch_to_halfsteps[pitch]

        # Reference pitches for each clef (on middle line of staff)
        if clef == 'sol':  # Treble clef
            # B4 (Si4) is on middle line
            reference_halfsteps = 4 * 12 + 11  # Si4 = 59
        else:  # 'fa' - Bass clef
            # D3 (Re3) is on middle line
            reference_halfsteps = 3 * 12 + 2  # Re3 = 38

        # Calculate position relative to middle line
        # Each half-step is approximately half a line spacing (5 pixels)
        half_step_pixels = self.line_spacing / 2
        staff_middle = staff_y + 2 * self.line_spacing  # Middle line of staff

        # Higher pitches are lower on screen (y increases downward)
        y = staff_middle - int((halfsteps - reference_halfsteps) * half_step_pixels)

        return y

    def layout_partition(self, partition: Partition) -> Dict[str, Any]:
        """Calculate layout for entire partition.

        Args:
            partition: Partition to layout

        Returns:
            Dictionary with layout information:
            {
                'metadata': {...},
                'staves': [
                    {
                        'y': staff_y_position,
                        'elements': [
                            {
                                'element': Note/Chord/Rest object,
                                'x': x_position,
                                'y': y_position(s),  # list for chords
                                'beat_position': float
                            },
                            ...
                        ]
                    },
                    ...
                ]
            }
        """
        layout_data = {
            'metadata': partition.metadata,
            'staves': []
        }

        if not partition.elements:
            return layout_data

        # Calculate available width for notes
        staff_width = self.width - 2 * self.margin - self.STAFF_LEFT_MARGIN
        max_beats_per_staff = staff_width / self.note_spacing

        # Distribute elements across staves
        staves_data = []
        current_staff = []
        current_beat = 0.0

        for element in partition.elements:
            duration = element.duration

            # Check if we need a new staff
            if current_beat + duration > max_beats_per_staff and current_staff:
                staves_data.append(current_staff)
                current_staff = []
                current_beat = 0.0

            current_staff.append({
                'element': element,
                'beat_position': current_beat
            })

            current_beat += duration

        # Add last staff if not empty
        if current_staff:
            staves_data.append(current_staff)

        # Calculate staff positions
        staff_positions = self.calculate_staff_positions(len(staves_data))

        # Create layout for each staff
        for staff_idx, staff_elements in enumerate(staves_data):
            staff_y = staff_positions[staff_idx]
            staff_x = self.margin + self.STAFF_LEFT_MARGIN

            staff_layout = {
                'y': staff_y,
                'x': staff_x,
                'elements': []
            }

            for elem_data in staff_elements:
                element = elem_data['element']
                beat_pos = elem_data['beat_position']

                x = self.calculate_note_x(staff_x, beat_pos)

                if isinstance(element, Note):
                    y = self.calculate_note_y(
                        staff_y, element.pitch, element.octave, partition.metadata.clef
                    )
                    staff_layout['elements'].append({
                        'element': element,
                        'x': x,
                        'y': y,
                        'beat_position': beat_pos
                    })

                elif isinstance(element, Chord):
                    # Calculate y position for each note in chord
                    ys = []
                    for note in element.notes:
                        y = self.calculate_note_y(
                            staff_y, note.pitch, note.octave, partition.metadata.clef
                        )
                        ys.append(y)

                    staff_layout['elements'].append({
                        'element': element,
                        'x': x,
                        'y': ys,  # list of y positions
                        'beat_position': beat_pos
                    })

                elif isinstance(element, Rest):
                    # Rest at middle of staff
                    y = staff_y + 2 * self.line_spacing
                    staff_layout['elements'].append({
                        'element': element,
                        'x': x,
                        'y': y,
                        'beat_position': beat_pos
                    })

            layout_data['staves'].append(staff_layout)

        return layout_data

    def get_staff_height(self) -> int:
        """Get the height of a single staff.

        Returns:
            Height in pixels
        """
        return (self.STAFF_LINES - 1) * self.line_spacing
