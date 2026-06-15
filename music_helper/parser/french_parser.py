"""French notation parser for musical elements."""

import re
from typing import List, Union, Dict, Any
from ..core import Note, Chord, Rest, Partition, Metadata


class FrenchParser:
    """Parses French musical notation into musical objects.

    Notation format:
        - Notes: Do, Re, Mi, Fa, Sol, La, Si
        - Duration: Do2 (half), Do1 (quarter), Do0.5 (eighth)
        - Accidentals: Do# (sharp), Dob (flat)
        - Chords: Do+Mi+Sol (notes separated by +)
        - Rests: R, R2, R0.5
        - Sequences: space or comma separated
    """

    def parse_note(self, notation: str) -> Note:
        """Parse a single note from notation.

        Args:
            notation: Note in French notation (e.g., 'Do', 'Re2', 'Mi#')

        Returns:
            Note object

        Raises:
            ValueError: If notation is invalid
        """
        return Note.from_string(notation)

    def parse_chord(self, notation: str) -> Chord:
        """Parse a chord from notation.

        Args:
            notation: Chord in French notation (e.g., 'Do+Mi+Sol', 'Do#+Mi2')

        Returns:
            Chord object

        Raises:
            ValueError: If notation is invalid
        """
        return Chord.from_string(notation)

    def parse_rest(self, notation: str) -> Rest:
        """Parse a rest from notation.

        Args:
            notation: Rest notation (e.g., 'R', 'R2', 'R0.5')

        Returns:
            Rest object

        Raises:
            ValueError: If notation is invalid
        """
        return Rest.from_string(notation)

    def parse_element(self, notation: str) -> Union[Note, Chord, Rest]:
        """Parse a single musical element (auto-detect type).

        Args:
            notation: Musical element notation

        Returns:
            Note, Chord, or Rest object

        Raises:
            ValueError: If notation is invalid
        """
        notation = notation.strip()

        if not notation:
            raise ValueError("Empty notation string")

        # Check if it's a rest (R followed by optional duration, not a note like Re)
        # Rest pattern: R[digits/decimal] (not followed by letters)
        if re.match(r'^R(\d*\.?\d*)$', notation):
            return self.parse_rest(notation)

        # Check if it's a chord (contains +)
        if '+' in notation:
            return self.parse_chord(notation)

        # Otherwise it's a note
        return self.parse_note(notation)

    def parse_sequence(self, notation: str) -> List[Union[Note, Chord, Rest]]:
        """Parse a sequence of musical elements.

        Elements can be separated by spaces, commas, or both.

        Args:
            notation: String with musical elements separated by spaces/commas

        Returns:
            List of Note, Chord, and/or Rest objects
        """
        if not notation or not notation.strip():
            return []

        # Split by both spaces and commas, then filter empty strings
        # Replace commas with spaces and split
        notation = notation.replace(',', ' ')
        tokens = [token.strip() for token in notation.split() if token.strip()]

        elements = []
        for token in tokens:
            element = self.parse_element(token)
            elements.append(element)

        return elements

    def parse_partition(self, data: Dict[str, Any]) -> Partition:
        """Parse a complete partition from dictionary data.

        Expected dictionary format:
        {
            'title': str (required),
            'tempo': int (required),
            'clef': str (required, 'sol' or 'fa'),
            'key_signature': str (optional, default 'C'),
            'time_signature': [int, int] (optional, default [4, 4]),
            'notes': str (required, space/comma separated elements)
        }

        Args:
            data: Dictionary with partition data

        Returns:
            Partition object

        Raises:
            ValueError: If required fields are missing or invalid
            KeyError: If required keys are missing
        """
        # Validate required fields
        required_fields = ['title', 'tempo', 'clef', 'notes']
        for field in required_fields:
            if field not in data:
                raise KeyError(f"Missing required field: '{field}'")

        # Create metadata
        metadata = Metadata(
            title=data['title'],
            tempo=data['tempo'],
            clef=data['clef'],
            key_signature=data.get('key_signature', 'C'),
            time_signature=tuple(data.get('time_signature', [4, 4]))
        )

        # Create partition
        partition = Partition(metadata)

        # Parse and add elements
        notes_str = data['notes']
        elements = self.parse_sequence(notes_str)

        for element in elements:
            partition.add_element(element)

        return partition

    def parse_partition_from_string(
        self,
        title: str,
        tempo: int,
        clef: str,
        notes: str,
        key_signature: str = 'C',
        time_signature: tuple = (4, 4)
    ) -> Partition:
        """Parse partition from individual string parameters.

        Convenience method for creating partitions programmatically.

        Args:
            title: Title of the piece
            tempo: Tempo in BPM
            clef: Clef ('sol' or 'fa')
            notes: Space/comma separated musical elements
            key_signature: Key signature (default 'C')
            time_signature: Time signature tuple (default (4, 4))

        Returns:
            Partition object
        """
        data = {
            'title': title,
            'tempo': tempo,
            'clef': clef,
            'key_signature': key_signature,
            'time_signature': list(time_signature),
            'notes': notes
        }
        return self.parse_partition(data)
