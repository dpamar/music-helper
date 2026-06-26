/**
 * MIDI-IMPORT.JS
 *
 * Parse les fichiers MIDI Standard (Format 0 et Format 1).
 * Ignore les features MIDI non supportées (contrôleurs, pitch bend, etc.).
 * Extrait uniquement : notes (Note On/Off) et tempo (Set Tempo meta-event).
 */

class MidiImporter {
    constructor() {
    }

    /**
     * Parse le header chunk MIDI (MThd).
     * @param {ArrayBuffer} buffer - Buffer du fichier MIDI
     * @param {number} offset - Position de départ
     * @returns {{format: number, numTracks: number, ppq: number, nextOffset: number}}
     * @throws {Error} Si le header est invalide
     */
    parseHeader(buffer, offset) {
        const view = new DataView(buffer);

        const signature = String.fromCharCode(
            view.getUint8(offset),
            view.getUint8(offset + 1),
            view.getUint8(offset + 2),
            view.getUint8(offset + 3)
        );

        if (signature !== 'MThd') {
            throw new Error('Signature MIDI invalide (MThd attendu)');
        }

        const headerLength = view.getUint32(offset + 4);
        if (headerLength !== 6) {
            throw new Error(`Longueur de header invalide: ${headerLength} (6 attendu)`);
        }

        const format = view.getUint16(offset + 8);
        const numTracks = view.getUint16(offset + 10);
        const ppq = view.getUint16(offset + 12);

        if (format !== 0 && format !== 1) {
            throw new Error(`Format MIDI ${format} non supporté (seulement Format 0 et 1)`);
        }

        return {
            format,
            numTracks,
            ppq,
            nextOffset: offset + 14
        };
    }

    /**
     * Lit une Variable Length Quantity (VLQ) MIDI.
     * @param {ArrayBuffer} buffer - Buffer MIDI
     * @param {number} offset - Position de départ
     * @returns {{value: number, bytesRead: number}}
     */
    readVarLength(buffer, offset) {
        const view = new DataView(buffer);
        let value = 0;
        let bytesRead = 0;
        let currentByte;

        do {
            if (bytesRead >= 4) {
                throw new Error('VLQ invalide (plus de 4 bytes)');
            }

            currentByte = view.getUint8(offset + bytesRead);
            value = (value << 7) | (currentByte & 0x7F);
            bytesRead++;
        } while (currentByte & 0x80);

        return { value, bytesRead };
    }
}
