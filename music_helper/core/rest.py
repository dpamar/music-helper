"""Rest class for representing musical rests/silences."""

import re


class Rest:
    """Represents a musical rest (silence).

    Attributes:
        duration: The duration as a multiplier (4=whole, 2=half, 1=quarter, 0.5=eighth, 0.25=sixteenth)
    """

    VALID_DURATIONS = [4.0, 2.0, 1.0, 0.5, 0.25]

    def __init__(self, duration: float = 1.0):
        """Initialize a Rest.

        Args:
            duration: Rest duration (default 1.0 = quarter rest)

        Raises:
            ValueError: If duration is invalid
        """
        self.duration = duration
        self.validate()

    def validate(self) -> bool:
        """Validate the rest parameters.

        Returns:
            True if valid

        Raises:
            ValueError: If duration is invalid
        """
        if self.duration not in self.VALID_DURATIONS:
            raise ValueError(
                f"Invalid duration {self.duration}. "
                f"Must be one of {self.VALID_DURATIONS}"
            )
        return True

    def to_dict(self) -> dict:
        """Convert rest to dictionary representation.

        Returns:
            Dictionary with rest data
        """
        return {
            'type': 'rest',
            'duration': self.duration
        }

    @classmethod
    def from_string(cls, notation: str) -> 'Rest':
        """Parse a rest from notation string.

        Notation format: R[duration]
        Examples:
            - 'R' -> quarter rest
            - 'R2' -> half rest
            - 'R0.5' -> eighth rest

        Args:
            notation: String notation (R or R<duration>)

        Returns:
            Rest instance

        Raises:
            ValueError: If notation is invalid
        """
        pattern = r'^R(\d*\.?\d*)$'
        match = re.match(pattern, notation)

        if not match:
            raise ValueError(f"Invalid rest notation: '{notation}'")

        duration_str = match.group(1)

        # Parse duration
        if duration_str:
            duration = float(duration_str)
        else:
            duration = 1.0

        return cls(duration=duration)

    def __eq__(self, other) -> bool:
        """Check equality with another rest."""
        if not isinstance(other, Rest):
            return False
        return self.duration == other.duration

    def __ne__(self, other) -> bool:
        """Check inequality with another rest."""
        return not self.__eq__(other)

    def __str__(self) -> str:
        """String representation of rest."""
        return f"Rest (duration={self.duration})"

    def __repr__(self) -> str:
        """Detailed representation of rest."""
        return f"Rest(duration={self.duration})"
