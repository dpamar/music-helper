"""Note class for representing musical notes."""

import re
from typing import Optional


class Note:
    """Represents a single musical note.

    Attributes:
        pitch: The note name in French solfège (Do, Re, Mi, Fa, Sol, La, Si)
        duration: The duration as a multiplier (4=whole, 2=half, 1=quarter, 0.5=eighth, 0.25=sixteenth)
        octave: The octave number (0-8, default 4)
        accidental: Sharp (#), flat (b), or None
    """

    VALID_PITCHES = ['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Si']
    VALID_DURATIONS = [4.0, 2.0, 1.0, 0.5, 0.25]
    VALID_ACCIDENTALS = ['#', 'b', None]
    MIN_OCTAVE = 0
    MAX_OCTAVE = 8

    def __init__(
        self,
        pitch: str,
        duration: float = 1.0,
        octave: int = 4,
        accidental: Optional[str] = None
    ):
        """Initialize a Note.

        Args:
            pitch: Note name in French solfège
            duration: Note duration (default 1.0 = quarter note)
            octave: Octave number (default 4 = middle octave)
            accidental: Sharp (#), flat (b), or None

        Raises:
            ValueError: If any parameter is invalid
        """
        self.pitch = pitch
        self.duration = duration
        self.octave = octave
        self.accidental = accidental
        self.validate()

    def validate(self) -> bool:
        """Validate the note parameters.

        Returns:
            True if valid

        Raises:
            ValueError: If any parameter is invalid
        """
        if self.pitch not in self.VALID_PITCHES:
            raise ValueError(
                f"Invalid pitch '{self.pitch}'. "
                f"Must be one of {self.VALID_PITCHES}"
            )

        if self.duration not in self.VALID_DURATIONS:
            raise ValueError(
                f"Invalid duration {self.duration}. "
                f"Must be one of {self.VALID_DURATIONS}"
            )

        if self.octave < self.MIN_OCTAVE or self.octave > self.MAX_OCTAVE:
            raise ValueError(
                f"Invalid octave {self.octave}. "
                f"Must be between {self.MIN_OCTAVE} and {self.MAX_OCTAVE}"
            )

        if self.accidental not in self.VALID_ACCIDENTALS:
            raise ValueError(
                f"Invalid accidental '{self.accidental}'. "
                f"Must be one of {self.VALID_ACCIDENTALS}"
            )

        return True

    def to_dict(self) -> dict:
        """Convert note to dictionary representation.

        Returns:
            Dictionary with note data
        """
        return {
            'type': 'note',
            'pitch': self.pitch,
            'duration': self.duration,
            'octave': self.octave,
            'accidental': self.accidental
        }

    @classmethod
    def from_string(cls, notation: str) -> 'Note':
        """Parse a note from French notation string.

        Notation format: <Pitch>[#|b][duration]
        Examples:
            - 'Do' -> Do quarter note
            - 'Do2' -> Do half note
            - 'Re0.5' -> Re eighth note
            - 'Mi.5' -> Mi eighth note (alternate format)
            - 'Fa#' -> Fa sharp quarter note
            - 'Sol#2' -> Sol sharp half note

        Args:
            notation: String in French notation

        Returns:
            Note instance

        Raises:
            ValueError: If notation is invalid
        """
        # Pattern: pitch + optional accidental + optional duration
        pattern = r'^(Do|Re|Mi|Fa|Sol|La|Si)([#b]?)(\d*\.?\d*)$'
        match = re.match(pattern, notation)

        if not match:
            raise ValueError(f"Invalid note notation: '{notation}'")

        pitch = match.group(1)
        accidental = match.group(2) if match.group(2) else None
        duration_str = match.group(3)

        # Parse duration
        if duration_str:
            duration = float(duration_str)
        else:
            duration = 1.0

        return cls(pitch=pitch, duration=duration, accidental=accidental)

    def __eq__(self, other) -> bool:
        """Check equality with another note."""
        if not isinstance(other, Note):
            return False
        return (
            self.pitch == other.pitch
            and self.duration == other.duration
            and self.octave == other.octave
            and self.accidental == other.accidental
        )

    def __ne__(self, other) -> bool:
        """Check inequality with another note."""
        return not self.__eq__(other)

    def __str__(self) -> str:
        """String representation of note."""
        accidental_str = self.accidental if self.accidental else ''
        return f"{self.pitch}{accidental_str} (duration={self.duration}, octave={self.octave})"

    def __repr__(self) -> str:
        """Detailed representation of note."""
        return (
            f"Note(pitch='{self.pitch}', duration={self.duration}, "
            f"octave={self.octave}, accidental={self.accidental!r})"
        )
