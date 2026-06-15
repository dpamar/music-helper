"""Metadata class for musical score information."""

from typing import Tuple


class Metadata:
    """Represents metadata for a musical score.

    Attributes:
        title: Title of the piece
        tempo: Tempo in BPM (beats per minute)
        clef: Musical clef ('sol' for treble or 'fa' for bass)
        key_signature: Key signature (e.g., 'C', 'G', 'Bb')
        time_signature: Time signature as tuple (numerator, denominator)
    """

    VALID_CLEFS = ['sol', 'fa']
    VALID_KEY_SIGNATURES = [
        'C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#',
        'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb',
        'Am', 'Em', 'Bm', 'F#m', 'C#m', 'G#m', 'D#m', 'A#m',
        'Dm', 'Gm', 'Cm', 'Fm', 'Bbm', 'Ebm', 'Abm'
    ]
    VALID_TIME_DENOMINATORS = [2, 4, 8, 16]
    MIN_TEMPO = 20
    MAX_TEMPO = 400
    MIN_TIME_NUMERATOR = 1
    MAX_TIME_NUMERATOR = 16

    def __init__(
        self,
        title: str,
        tempo: int,
        clef: str,
        key_signature: str = 'C',
        time_signature: Tuple[int, int] = (4, 4)
    ):
        """Initialize Metadata.

        Args:
            title: Title of the piece
            tempo: Tempo in BPM (20-400)
            clef: Musical clef ('sol' or 'fa')
            key_signature: Key signature (default 'C')
            time_signature: Time signature as tuple (default (4, 4))

        Raises:
            ValueError: If any parameter is invalid
        """
        self.title = title
        self.tempo = tempo
        self.clef = clef
        self.key_signature = key_signature
        self.time_signature = time_signature
        self.validate()

    def validate(self) -> bool:
        """Validate the metadata parameters.

        Returns:
            True if valid

        Raises:
            ValueError: If any parameter is invalid
        """
        if self.clef not in self.VALID_CLEFS:
            raise ValueError(
                f"Invalid clef '{self.clef}'. "
                f"Must be one of {self.VALID_CLEFS}"
            )

        if self.tempo < self.MIN_TEMPO or self.tempo > self.MAX_TEMPO:
            raise ValueError(
                f"Invalid tempo {self.tempo}. "
                f"Must be between {self.MIN_TEMPO} and {self.MAX_TEMPO}"
            )

        if self.key_signature not in self.VALID_KEY_SIGNATURES:
            raise ValueError(
                f"Invalid key signature '{self.key_signature}'. "
                f"Must be one of {self.VALID_KEY_SIGNATURES}"
            )

        numerator, denominator = self.time_signature
        if numerator < self.MIN_TIME_NUMERATOR or numerator > self.MAX_TIME_NUMERATOR:
            raise ValueError(
                f"Invalid time signature numerator {numerator}. "
                f"Must be between {self.MIN_TIME_NUMERATOR} and {self.MAX_TIME_NUMERATOR}"
            )

        if denominator not in self.VALID_TIME_DENOMINATORS:
            raise ValueError(
                f"Invalid time signature denominator {denominator}. "
                f"Must be one of {self.VALID_TIME_DENOMINATORS}"
            )

        return True

    def to_dict(self) -> dict:
        """Convert metadata to dictionary representation.

        Returns:
            Dictionary with metadata
        """
        return {
            'title': self.title,
            'tempo': self.tempo,
            'clef': self.clef,
            'key_signature': self.key_signature,
            'time_signature': list(self.time_signature)
        }

    def __eq__(self, other) -> bool:
        """Check equality with another metadata."""
        if not isinstance(other, Metadata):
            return False
        return (
            self.title == other.title
            and self.tempo == other.tempo
            and self.clef == other.clef
            and self.key_signature == other.key_signature
            and self.time_signature == other.time_signature
        )

    def __ne__(self, other) -> bool:
        """Check inequality with another metadata."""
        return not self.__eq__(other)

    def __str__(self) -> str:
        """String representation of metadata."""
        return (
            f"'{self.title}' - {self.tempo} BPM - "
            f"{self.clef} clef - {self.key_signature} - "
            f"{self.time_signature[0]}/{self.time_signature[1]}"
        )

    def __repr__(self) -> str:
        """Detailed representation of metadata."""
        return (
            f"Metadata(title='{self.title}', tempo={self.tempo}, "
            f"clef='{self.clef}', key_signature='{self.key_signature}', "
            f"time_signature={self.time_signature})"
        )
