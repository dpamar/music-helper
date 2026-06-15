"""Command-line interface for Music Helper."""

import argparse
import sys
import json
from pathlib import Path

from ..core import Partition, Metadata, Note, Chord, Rest
from ..parser import FrenchParser
from ..renderer import PartitionRenderer
from ..display import TextFormatter


def main():
    """Main entry point for Music Helper CLI."""
    parser = argparse.ArgumentParser(
        description='Music Helper - Sheet Music Renderer',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Display partition as text
  music-helper display examples/simple_melody.json

  # Render partition to image
  music-helper render examples/simple_melody.json -o output.png

  # Create partition interactively
  music-helper create

  # Parse French notation
  music-helper parse "Do Re Mi Fa Sol" --title "Scale" --tempo 120 --clef sol -o scale.png
        """
    )

    subparsers = parser.add_subparsers(dest='command', help='Available commands')

    # Display command
    display_parser = subparsers.add_parser('display', help='Display partition as text')
    display_parser.add_argument('input', help='Input partition file (JSON)')
    display_parser.add_argument('--width', type=int, default=80, help='Output width')

    # Render command
    render_parser = subparsers.add_parser('render', help='Render partition to image')
    render_parser.add_argument('input', help='Input partition file (JSON)')
    render_parser.add_argument('-o', '--output', required=True, help='Output PNG file')
    render_parser.add_argument('--width', type=int, default=800, help='Image width')
    render_parser.add_argument('--height', type=int, default=1000, help='Image height')

    # Parse command
    parse_parser = subparsers.add_parser('parse', help='Parse French notation and render')
    parse_parser.add_argument('notes', help='Musical elements in French notation')
    parse_parser.add_argument('--title', required=True, help='Title of the piece')
    parse_parser.add_argument('--tempo', type=int, required=True, help='Tempo (BPM)')
    parse_parser.add_argument('--clef', required=True, choices=['sol', 'fa'], help='Clef')
    parse_parser.add_argument('--key', default='C', help='Key signature')
    parse_parser.add_argument('--time', default='4/4', help='Time signature (e.g., 4/4)')
    parse_parser.add_argument('-o', '--output', help='Output PNG file')
    parse_parser.add_argument('--save-json', help='Save partition as JSON')

    # Create command
    create_parser = subparsers.add_parser('create', help='Create partition interactively')
    create_parser.add_argument('-o', '--output', help='Output JSON file')

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(1)

    try:
        if args.command == 'display':
            display_partition(args)
        elif args.command == 'render':
            render_partition(args)
        elif args.command == 'parse':
            parse_and_render(args)
        elif args.command == 'create':
            create_partition(args)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


def display_partition(args):
    """Display partition as text."""
    partition = Partition.from_json(args.input)
    formatter = TextFormatter()
    output = formatter.format_partition(partition, width=args.width)
    print(output)


def render_partition(args):
    """Render partition to image."""
    partition = Partition.from_json(args.input)
    renderer = PartitionRenderer(width=args.width, height=args.height)
    renderer.render(partition, args.output)
    print(f"Rendered partition to {args.output}")


def parse_and_render(args):
    """Parse French notation and render."""
    # Parse time signature
    time_parts = args.time.split('/')
    time_signature = (int(time_parts[0]), int(time_parts[1]))

    # Create parser and parse
    parser = FrenchParser()
    partition = parser.parse_partition_from_string(
        title=args.title,
        tempo=args.tempo,
        clef=args.clef,
        notes=args.notes,
        key_signature=args.key,
        time_signature=time_signature
    )

    # Save JSON if requested
    if args.save_json:
        partition.to_json(args.save_json)
        print(f"Saved partition to {args.save_json}")

    # Render if output specified
    if args.output:
        renderer = PartitionRenderer()
        renderer.render(partition, args.output)
        print(f"Rendered partition to {args.output}")
    else:
        # Just display as text
        formatter = TextFormatter()
        output = formatter.format_partition(partition)
        print(output)


def create_partition(args):
    """Create partition interactively."""
    print("=== Music Helper - Create Partition ===\n")

    # Get metadata
    title = input("Title: ")
    tempo = int(input("Tempo (BPM): "))
    clef = input("Clef (sol/fa): ")

    while clef not in ['sol', 'fa']:
        print("Invalid clef. Must be 'sol' or 'fa'.")
        clef = input("Clef (sol/fa): ")

    key_signature = input("Key signature (default C): ") or 'C'
    time_sig_str = input("Time signature (default 4/4): ") or '4/4'

    time_parts = time_sig_str.split('/')
    time_signature = (int(time_parts[0]), int(time_parts[1]))

    # Create metadata and partition
    metadata = Metadata(title, tempo, clef, key_signature, time_signature)
    partition = Partition(metadata)

    print("\nEnter musical elements (one per line).")
    print("Format: Do, Re2, Mi#, Do+Mi+Sol, R, etc.")
    print("Type 'done' when finished.\n")

    parser = FrenchParser()

    while True:
        elem_input = input("Element: ").strip()

        if elem_input.lower() == 'done':
            break

        if not elem_input:
            continue

        try:
            element = parser.parse_element(elem_input)
            partition.add_element(element)
            print(f"  Added: {element}")
        except Exception as e:
            print(f"  Error: {e}")

    # Display summary
    print(f"\nCreated partition with {len(partition.elements)} elements.")

    # Save if requested
    if args.output:
        partition.to_json(args.output)
        print(f"Saved to {args.output}")
    else:
        # Ask where to save
        save_path = input("\nSave to (leave empty to skip): ").strip()
        if save_path:
            partition.to_json(save_path)
            print(f"Saved to {save_path}")

    # Ask if want to render
    render = input("\nRender to image? (y/n): ").strip().lower()
    if render == 'y':
        output_path = input("Output PNG file: ").strip()
        if output_path:
            renderer = PartitionRenderer()
            renderer.render(partition, output_path)
            print(f"Rendered to {output_path}")


if __name__ == '__main__':
    main()
