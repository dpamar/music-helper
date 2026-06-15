"""Text formatter for displaying partitions in text format."""

from typing import List
from ..core import Note, Chord, Rest, Partition


class TextFormatter:
    """Formats musical partitions as text output.

    Provides ASCII-art style text representation of musical scores.
    """

    def format_note(self, note: Note) -> str:
        """Format a note as text.

        Args:
            note: Note to format

        Returns:
            String representation of note
        """
        accidental_str = note.accidental if note.accidental else ''
        duration_str = self._duration_to_text(note.duration)
        return f"{note.pitch}{accidental_str}{duration_str}"

    def format_chord(self, chord: Chord) -> str:
        """Format a chord as text.

        Args:
            chord: Chord to format

        Returns:
            String representation of chord
        """
        note_strs = []
        for note in chord.notes:
            accidental_str = note.accidental if note.accidental else ''
            note_strs.append(f"{note.pitch}{accidental_str}")

        duration_str = self._duration_to_text(chord.duration)
        return f"[{'+'.join(note_strs)}]{duration_str}"

    def format_rest(self, rest: Rest) -> str:
        """Format a rest as text.

        Args:
            rest: Rest to format

        Returns:
            String representation of rest
        """
        duration_str = self._duration_to_text(rest.duration)
        return f"R{duration_str}"

    def format_partition(self, partition: Partition, width: int = 80) -> str:
        """Format entire partition as text.

        Args:
            partition: Partition to format
            width: Maximum width of output lines

        Returns:
            Multi-line string representation of partition
        """
        lines = []

        # Header
        header_line = "=" * width
        lines.append(header_line)

        # Title
        title_line = partition.metadata.title.center(width)
        lines.append(title_line)

        # Metadata
        meta_info = (
            f"Tempo: ♩={partition.metadata.tempo} | "
            f"Clef: {partition.metadata.clef} | "
            f"Key: {partition.metadata.key_signature} | "
            f"Time: {partition.metadata.time_signature[0]}/{partition.metadata.time_signature[1]}"
        )
        lines.append(meta_info.center(width))
        lines.append(header_line)
        lines.append("")

        # Elements
        lines.append("Musical Elements:")
        lines.append("-" * width)

        # Format elements in lines
        current_line = []
        current_width = 0
        max_element_width = width - 10

        for element in partition.elements:
            if isinstance(element, Note):
                elem_str = self.format_note(element)
            elif isinstance(element, Chord):
                elem_str = self.format_chord(element)
            elif isinstance(element, Rest):
                elem_str = self.format_rest(element)
            else:
                elem_str = str(element)

            # Add spacing
            elem_str = elem_str + "  "

            if current_width + len(elem_str) > max_element_width and current_line:
                # Start new line
                lines.append("  " + "".join(current_line))
                current_line = [elem_str]
                current_width = len(elem_str)
            else:
                current_line.append(elem_str)
                current_width += len(elem_str)

        # Add last line
        if current_line:
            lines.append("  " + "".join(current_line))

        lines.append("")
        lines.append("-" * width)

        # Summary
        total_duration = partition.total_duration()
        num_elements = len(partition.elements)
        lines.append(f"Total: {num_elements} elements, {total_duration} beats")
        lines.append(header_line)

        return "\n".join(lines)

    def _duration_to_text(self, duration: float) -> str:
        """Convert duration to text representation.

        Args:
            duration: Note duration

        Returns:
            Text representation (empty for quarter, or duration number)
        """
        if duration == 1.0:
            return ""  # Quarter note is default
        elif duration == 4.0:
            return "(whole)"
        elif duration == 2.0:
            return "(half)"
        elif duration == 0.5:
            return "(eighth)"
        elif duration == 0.25:
            return "(sixteenth)"
        else:
            return f"({duration})"

    def format_staff_ascii(self, partition: Partition) -> str:
        """Format partition with ASCII staff representation.

        Args:
            partition: Partition to format

        Returns:
            Multi-line string with ASCII staff art
        """
        lines = []

        # Title and metadata
        lines.append(partition.metadata.title)
        lines.append(f"♩ = {partition.metadata.tempo}")
        lines.append("")

        # Simple staff representation
        staff_lines = [
            "─────────────────────────────────────────────",
            "─────────────────────────────────────────────",
            "─────────────────────────────────────────────",
            "─────────────────────────────────────────────",
            "─────────────────────────────────────────────"
        ]

        for i, line in enumerate(staff_lines):
            lines.append(line)

        lines.append("")

        # Elements list below
        lines.append("Elements: ")
        for i, element in enumerate(partition.elements, 1):
            if isinstance(element, Note):
                elem_str = self.format_note(element)
            elif isinstance(element, Chord):
                elem_str = self.format_chord(element)
            elif isinstance(element, Rest):
                elem_str = self.format_rest(element)
            else:
                elem_str = str(element)

            lines.append(f"  {i}. {elem_str}")

        return "\n".join(lines)
