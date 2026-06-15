"""Partition class for representing a complete musical score."""

import json
from typing import List, Union
from .metadata import Metadata
from .note import Note
from .chord import Chord
from .rest import Rest


class Partition:
    """Represents a complete musical score/partition.

    Attributes:
        metadata: Metadata about the piece
        elements: List of musical elements (Notes, Chords, Rests)
    """

    def __init__(self, metadata: Metadata, elements: List[Union[Note, Chord, Rest]] = None):
        """Initialize a Partition.

        Args:
            metadata: Metadata object with piece information
            elements: Optional list of initial elements

        Raises:
            ValueError: If metadata is invalid
        """
        self.metadata = metadata
        self.elements = elements if elements is not None else []
        self.validate()

    def add_element(self, element: Union[Note, Chord, Rest]) -> None:
        """Add a musical element to the partition.

        Args:
            element: Note, Chord, or Rest object to add

        Raises:
            TypeError: If element is not Note, Chord, or Rest
        """
        if not isinstance(element, (Note, Chord, Rest)):
            raise TypeError(
                f"Element must be Note, Chord, or Rest, not {type(element).__name__}"
            )
        self.elements.append(element)

    def validate(self) -> bool:
        """Validate the partition.

        Returns:
            True if valid

        Raises:
            ValueError: If partition is invalid
        """
        # Validate metadata
        self.metadata.validate()

        # Validate all elements
        for element in self.elements:
            element.validate()

        return True

    def total_duration(self) -> float:
        """Calculate total duration of the partition.

        Returns:
            Total duration in beats
        """
        return sum(element.duration for element in self.elements)

    def to_dict(self) -> dict:
        """Convert partition to dictionary representation.

        Returns:
            Dictionary with partition data
        """
        return {
            'metadata': self.metadata.to_dict(),
            'elements': [element.to_dict() for element in self.elements]
        }

    def to_json(self, filepath: str) -> None:
        """Save partition to JSON file.

        Args:
            filepath: Path to save JSON file
        """
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(self.to_dict(), f, indent=2, ensure_ascii=False)

    @classmethod
    def from_dict(cls, data: dict) -> 'Partition':
        """Create partition from dictionary representation.

        Args:
            data: Dictionary with partition data

        Returns:
            Partition instance
        """
        # Create metadata
        meta_dict = data['metadata']
        metadata = Metadata(
            title=meta_dict['title'],
            tempo=meta_dict['tempo'],
            clef=meta_dict['clef'],
            key_signature=meta_dict.get('key_signature', 'C'),
            time_signature=tuple(meta_dict.get('time_signature', [4, 4]))
        )

        # Create partition
        partition = cls(metadata)

        # Add elements
        for elem_dict in data['elements']:
            element = cls._element_from_dict(elem_dict)
            partition.add_element(element)

        return partition

    @staticmethod
    def _element_from_dict(elem_dict: dict) -> Union[Note, Chord, Rest]:
        """Convert element dictionary to object.

        Args:
            elem_dict: Dictionary representing an element

        Returns:
            Note, Chord, or Rest object
        """
        elem_type = elem_dict['type']

        if elem_type == 'note':
            return Note(
                pitch=elem_dict['pitch'],
                duration=elem_dict['duration'],
                octave=elem_dict['octave'],
                accidental=elem_dict.get('accidental')
            )
        elif elem_type == 'rest':
            return Rest(duration=elem_dict['duration'])
        elif elem_type == 'chord':
            notes = []
            for note_dict in elem_dict['notes']:
                notes.append(Note(
                    pitch=note_dict['pitch'],
                    duration=note_dict['duration'],
                    octave=note_dict['octave'],
                    accidental=note_dict.get('accidental')
                ))
            return Chord(notes=notes, duration=elem_dict['duration'])
        else:
            raise ValueError(f"Unknown element type: {elem_type}")

    @classmethod
    def from_json(cls, filepath: str) -> 'Partition':
        """Load partition from JSON file.

        Args:
            filepath: Path to JSON file

        Returns:
            Partition instance
        """
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        return cls.from_dict(data)

    def __str__(self) -> str:
        """String representation of partition."""
        return (
            f"Partition: {self.metadata.title}\n"
            f"  {self.metadata}\n"
            f"  {len(self.elements)} elements, "
            f"total duration: {self.total_duration()} beats"
        )

    def __repr__(self) -> str:
        """Detailed representation of partition."""
        return f"Partition(metadata={self.metadata!r}, elements={len(self.elements)} items)"
