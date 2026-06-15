"""Chord class for representing multiple simultaneous notes."""

import re
from typing import List
from .note import Note


class Chord:
    """Represents a chord (multiple simultaneous notes).

    Attributes:
        notes: List of Note objects in the chord
        duration: The duration for all notes in the chord
    """

    VALID_DURATIONS = [4.0, 2.0, 1.0, 0.5, 0.25]

    def __init__(self, notes: List[Note], duration: float = 1.0):
        """Initialize a Chord.

        Args:
            notes: List of Note objects (must have at least 2 notes)
            duration: Duration for the chord (overrides individual note durations)

        Raises:
            ValueError: If notes list is empty, has single note, or duration is invalid
        """
        self.notes = notes
        self.duration = duration

        # Update all notes to have the chord's duration
        for note in self.notes:
            note.duration = duration

        self.validate()

    def validate(self) -> bool:
        """Validate the chord parameters.

        Returns:
            True if valid

        Raises:
            ValueError: If chord is invalid
        """
        if len(self.notes) == 0:
            raise ValueError("Chord must have at least 2 notes")

        if len(self.notes) == 1:
            raise ValueError("Chord must have at least 2 notes (use Note for single notes)")

        if self.duration not in self.VALID_DURATIONS:
            raise ValueError(
                f"Invalid duration {self.duration}. "
                f"Must be one of {self.VALID_DURATIONS}"
            )

        # Validate all notes
        for note in self.notes:
            note.validate()

        return True

    def to_dict(self) -> dict:
        """Convert chord to dictionary representation.

        Returns:
            Dictionary with chord data
        """
        return {
            'type': 'chord',
            'duration': self.duration,
            'notes': [note.to_dict() for note in self.notes]
        }

    @classmethod
    def from_string(cls, notation: str) -> 'Chord':
        """Parse a chord from French notation string with + separator.

        Notation format: <Note1>+<Note2>[+<Note3>...][duration]
        The duration applies to all notes and is taken from the last note if specified.

        Examples:
            - 'Do+Mi+Sol' -> C major chord (quarter notes)
            - 'Do+Mi2' -> C-E dyad (half notes)
            - 'Do#+Mi+Sol' -> C# major chord
            - 'Do+Mi+Sol0.5' -> C major chord (eighth notes)

        Args:
            notation: String in French notation with + separators

        Returns:
            Chord instance

        Raises:
            ValueError: If notation is invalid or has only one note
        """
        if '+' not in notation:
            raise ValueError(f"Invalid chord notation: '{notation}' (must contain +)")

        # Split by + to get individual note notations
        note_strings = notation.split('+')

        if len(note_strings) < 2:
            raise ValueError(f"Chord must have at least 2 notes: '{notation}'")

        notes = []
        chord_duration = 1.0

        # Parse each note
        for i, note_str in enumerate(note_strings):
            note = Note.from_string(note_str)

            # If this is the last note and it has a specific duration, use it for the chord
            if i == len(note_strings) - 1:
                chord_duration = note.duration

            notes.append(note)

        return cls(notes=notes, duration=chord_duration)

    def __eq__(self, other) -> bool:
        """Check equality with another chord."""
        if not isinstance(other, Chord):
            return False

        if self.duration != other.duration:
            return False

        if len(self.notes) != len(other.notes):
            return False

        # Check that all notes are equal (order matters)
        for note1, note2 in zip(self.notes, other.notes):
            if note1 != note2:
                return False

        return True

    def __ne__(self, other) -> bool:
        """Check inequality with another chord."""
        return not self.__eq__(other)

    def __str__(self) -> str:
        """String representation of chord."""
        note_names = '+'.join([note.pitch for note in self.notes])
        return f"Chord[{note_names}] (duration={self.duration})"

    def __repr__(self) -> str:
        """Detailed representation of chord."""
        return f"Chord(notes={self.notes!r}, duration={self.duration})"
