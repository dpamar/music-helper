const BEATS_PER_LINE = 8;
const SUCCESS_MESSAGE_DURATION_MS = 5000;
const TRANSPOSE_MESSAGE_DURATION_MS = 3000;
const MAX_MIDI_CHANNELS = 16;

let parser;
let renderer;
let midiAudioPlayer;
let midiExporter;
let midiImporter;
let jazzTransformer;
let currentScoreData = null;
let selectedInstruments = new Set();
const reverseNoteMapping = {
     'C':'Do',
     'D':'Re',
     'E':'Mi',
     'F':'Fa',
     'G':'Sol',
     'A':'La',
     'B':'Si'
};
const reverseAlterationMapping = {
    'sharp': '#',
    'natural': '*',
    'flat': 'b'
};

function scoreToText(scoreData) {
    let result = "";
    result += scoreData.title + "\n";
    result += scoreData.tempo + "\n";
    result += scoreData.timeSignature.numerator + "/" + scoreData.timeSignature.denominator +"\n"
    result += scoreData.clef;
    scoreData.keySignature.map(note => result += " " + reverseNoteMapping[note.note] + reverseAlterationMapping[note.alteration]);
    result += "\n";

    const NOTE_TYPE_CONVERTERS = {
        'note': noteToText,
        'chord': chordToText,
        'rest': restToText
    };

    let totalDuration = 0;
    for (const note of scoreData.notes){
        const converter = NOTE_TYPE_CONVERTERS[note.type];
        if (!converter) {
            throw new Error(`Type de note inconnu : ${note.type}`);
        }
        result += converter(note) + " ";
        totalDuration += note.duration;
        if (totalDuration >= BEATS_PER_LINE) {
            totalDuration = 0;
            result += "\n";
        }
    }

    return result;
}

function addDuration(text, duration) {
    if (duration == 1) {
        return text;
    }
    return text + duration;
}

function restToText(rest) {
    return addDuration('S', rest.duration);
}

function chordToText(chord) {
    let result = '';
    for (const note of chord.notes) {
        result += reverseNoteMapping[note.note];
        result += reverseAlterationMapping[note.alteration] || '';
        if (note.octave < 0) {
            result += '-'.repeat(-note.octave);
        } else if (note.octave >0) {
            result += '+'.repeat(note.octave);
        }
    }
    return addDuration(result, chord.duration);
}

function noteToText(note) {
    let result = "";
    result += reverseNoteMapping[note.note];
    result += reverseAlterationMapping[note.alteration] || '';
    if (note.octave < 0) {
        result += '-'.repeat(-note.octave);
    } else if (note.octave >0) {
        result += '+'.repeat(note.octave);
    }
    return addDuration(result, note.duration);
}

const INSTRUMENTS = {
    'piano': { name: 'Piano', program: 0, emoji: '🎹', gmName: 'Acoustic Grand Piano' },
    'guitare': { name: 'Guitare', program: 24, emoji: '🎸', gmName: 'Acoustic Guitar (nylon)' },
    'violon': { name: 'Violon', program: 40, emoji: '🎻', gmName: 'Violin' },
    'flute': { name: 'Flûte', program: 73, emoji: '🪈', gmName: 'Flute' },
    'accordeon': { name: 'Accordéon', program: 21, emoji: '🪗', gmName: 'Accordion' },
    'contrebasse': { name: 'Contrebasse', program: 43, emoji: '🎼', gmName: 'Contrabass' },
    'hautbois': { name: 'Hautbois', program: 68, emoji: '🎼', gmName: 'Oboe' },
    'trompette': { name: 'Trompette', program: 56, emoji: '🎺', gmName: 'Trumpet' },
    'xylophone': { name: 'Xylophone', program: 13, emoji: '🎼', gmName: 'Xylophone' },
    'guitare électrique': { name: 'Guitare électrique', program: 26, emoji: '🎸', gmName: 'Electric Guitar (jazz)' },
    'cornemuse': { name: 'Cornemuse', program: 109, emoji: '🎼', gmName: 'Bag pipe' },
    'orgue': { name: 'Orgue', program: 16, emoji: '🎼', gmName: 'Drawbar Organ' }
};

function init() {
    parser = new Parser();
    renderer = new Renderer();
    midiExporter = new MidiExporter();
    midiImporter = new MidiImporter();
    midiAudioPlayer = new MidiAudioPlayer();
    jazzTransformer = new JazzTransformer();

    const btnRender = document.getElementById('btn-render');
    const btnExample = document.getElementById('btn-example');
    const btnClear = document.getElementById('btn-clear');
    const btnExportPNG = document.getElementById('btn-export-png');
    const btnExportMIDI = document.getElementById('btn-export-midi');
    const textarea = document.getElementById('partition-input');
    const errorDiv = document.getElementById('error-message');
    const btnPlay = document.getElementById('btn-play');
    const audioElement = document.getElementById('midi-player');
    const btnJazzArrange = document.getElementById('btn-jazz-arrange');

    midiAudioPlayer.init(audioElement, midiExporter);

    audioElement.addEventListener('play', () => {
        btnPlay.textContent = '⏹️ Arrêter';
    });

    audioElement.addEventListener('pause', () => {
        if (audioElement.ended || audioElement.currentTime === 0) {
            btnPlay.textContent = '🎵 Lire la partition';
        }
    });

    audioElement.addEventListener('ended', () => {
        btnPlay.textContent = '🎵 Lire la partition';
    });

    btnRender.addEventListener('click', handleRender);
    btnExample.addEventListener('click', handleExample);
    btnClear.addEventListener('click', handleClear);
    btnExportPNG.addEventListener('click', handleExportPNG);
    btnExportMIDI.addEventListener('click', handleExportMIDI);
    btnPlay.addEventListener('click', handlePlay);
    btnJazzArrange.addEventListener('click', handleJazzArrange);

    document.getElementById('btn-import-midi').addEventListener('click', handleImportMidi);
    document.getElementById('midi-file-input').addEventListener('change', handleFileSelected);
    document.getElementById('btn-cancel-track-selection').addEventListener('click', () => {
        document.getElementById('track-selection-modal').style.display = 'none';
    });

    textarea.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            handleRender();
        }
    });

    const instrumentModal = document.getElementById('instrument-modal');
    const btnCancelInstrument = document.getElementById('btn-cancel-instrument');
    const btnValidateInstruments = document.getElementById('btn-validate-instruments');

    btnCancelInstrument.addEventListener('click', closeInstrumentModal);
    btnValidateInstruments.addEventListener('click', handleValidateInstruments);

    instrumentModal.addEventListener('click', (e) => {
        if (e.target === instrumentModal) {
            closeInstrumentModal();
        }
    });

    const transposeModal = document.getElementById('transpose-modal');
    const btnAdvanced = document.getElementById('btn-advanced');
    const btnCancelTranspose = document.getElementById('btn-cancel-transpose');
    const btnApplyTranspose = document.getElementById('btn-apply-transpose');
    const btnTransposeMinus = document.getElementById('btn-transpose-minus');
    const btnTransposePlus = document.getElementById('btn-transpose-plus');
    const inputSemitones = document.getElementById('transpose-semitones');

    btnAdvanced.addEventListener('click', showTransposeModal);
    btnCancelTranspose.addEventListener('click', closeTransposeModal);
    btnApplyTranspose.addEventListener('click', handleApplyTranspose);

    btnTransposeMinus.addEventListener('click', () => {
        const current = parseInt(inputSemitones.value) || 0;
        inputSemitones.value = Math.max(-12, current - 1);
    });

    btnTransposePlus.addEventListener('click', () => {
        const current = parseInt(inputSemitones.value) || 0;
        inputSemitones.value = Math.min(12, current + 1);
    });

    inputSemitones.addEventListener('input', () => {
        let value = parseInt(inputSemitones.value);

        if (isNaN(value)) {
            inputSemitones.value = '0';
            return;
        }

        if (value < -12) {
            inputSemitones.value = '-12';
        } else if (value > 12) {
            inputSemitones.value = '12';
        }
    });

    transposeModal.addEventListener('click', (e) => {
        if (e.target === transposeModal) {
            closeTransposeModal();
        }
    });

    const jazzModal = document.getElementById('jazz-config-modal');
    const applyJazzBtn = document.getElementById('apply-jazz-config');
    const closeJazzBtn = document.getElementById('close-jazz-modal');

    document.getElementById('swing-ratio').addEventListener('input', (e) => {
        document.getElementById('swing-ratio-value').textContent = e.target.value;
    });

    document.getElementById('syncopation-prob').addEventListener('input', (e) => {
        document.getElementById('syncopation-prob-value').textContent = e.target.value;
    });

    document.getElementById('tempo-mult').addEventListener('input', (e) => {
        document.getElementById('tempo-mult-value').textContent = e.target.value;
    });

    applyJazzBtn.addEventListener('click', applyJazzTransformation);

    closeJazzBtn.addEventListener('click', () => {
        jazzModal.style.display = 'none';
    });

    jazzModal.addEventListener('click', (e) => {
        if (e.target === jazzModal) {
            jazzModal.style.display = 'none';
        }
    });

    const trackSelectionModal = document.getElementById('track-selection-modal');
    trackSelectionModal.addEventListener('click', (e) => {
        if (e.target === trackSelectionModal) {
            trackSelectionModal.style.display = 'none';
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (trackSelectionModal.style.display === 'flex') {
                trackSelectionModal.style.display = 'none';
            } else if (jazzModal.style.display === 'flex') {
                jazzModal.style.display = 'none';
            } else if (transposeModal.style.display === 'flex') {
                closeTransposeModal();
            } else if (instrumentModal.style.display === 'flex') {
                closeInstrumentModal();
            }
        }
    });

    console.log('✅ Application initialisée');
}

function handleRender() {
    const textarea = document.getElementById('partition-input');
    const errorDiv = document.getElementById('error-message');
    const outputDiv = document.getElementById('render-output');
    const checkboxOptimization = document.getElementById('optimization-mode');

    errorDiv.style.display = 'none';

    try {
        const text = textarea.value.trim();

        if (!text) {
            throw new Error('Veuillez saisir une partition');
        }

        const scoreData = parser.parse(text);
        console.log('✅ Partition parsée:', scoreData);

        currentScoreData = scoreData;

        const optimizationEnabled = checkboxOptimization && checkboxOptimization.checked;
        renderer.setOptimizationMode(optimizationEnabled);
        const dataToRender = optimizationEnabled
            ? renderer.optimizeKeySignature(scoreData)
            : scoreData;

        renderer.render(dataToRender, outputDiv);

        const displayedScore = renderer.drawingInfo.lastScore;
        const displayedScoreText = scoreToText(displayedScore);
        textarea.value = displayedScoreText;

        renderer.setOptimizationMode(false);
        console.log(`✅ Partition rendue (optimization: ${optimizationEnabled ? 'ON' : 'OFF'})`);

        setExportButtonState(true);
        setPlayButtonState(true);

    } catch (error) {
        console.error('❌ Erreur:', error);
        errorDiv.textContent = '❌ ' + error.message;
        errorDiv.style.display = 'block';

        setExportButtonState(false);
        setPlayButtonState(false);

        errorDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

function handleExample() {
    const textarea = document.getElementById('partition-input');

    if (textarea.value.trim() && !confirm('Voulez-vous remplacer le contenu actuel par un exemple ?')) {
        return;
    }

    const example = `Au clair de la lune
120
4/4
sol
Do Do Do Re Mi2 Re2
Do Mi Re Re Do2 S2
Do Do Do Re Mi2 Re2
Do Mi Re Re Do2`;

    textarea.value = example;

    handleRender();
}

function handleClear() {
    const textarea = document.getElementById('partition-input');
    const outputDiv = document.getElementById('render-output');
    const errorDiv = document.getElementById('error-message');

    if (textarea.value.trim() && !confirm('Voulez-vous vraiment effacer la partition ?')) {
        return;
    }

    textarea.value = '';
    errorDiv.style.display = 'none';

    while (outputDiv.firstChild) {
        outputDiv.removeChild(outputDiv.firstChild);
    }
    const placeholder = document.createElement('p');
    placeholder.className = 'placeholder';
    placeholder.textContent = 'Cliquez sur "Générer la partition" pour voir le rendu graphique';
    outputDiv.appendChild(placeholder);

    currentScoreData = null;

    setExportButtonState(false);
    setPlayButtonState(false);

    textarea.focus();
}

function handleExportPNG() {
    const canvas = document.getElementById('score-canvas');
    const errorDiv = document.getElementById('error-message');

    if (!canvas) {
        errorDiv.textContent = '❌ Veuillez d\'abord générer une partition';
        errorDiv.style.display = 'block';
        errorDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        return;
    }

    try {
        errorDiv.style.display = 'none';

        const dataURL = canvas.toDataURL('image/png');

        let filename = 'partition.png';

        if (currentScoreData && currentScoreData.title && currentScoreData.title.trim()) {
            const cleanTitle = currentScoreData.title.trim()
                .toLowerCase()
                .normalize('NFD').replace(/[̀-ͯ]/g, '')
                .replace(/[^a-z0-9\s-]/g, '')
                .replace(/\s+/g, '-')
                .replace(/-+/g, '-');

            filename = `${cleanTitle}.png`;
        }

        const link = document.createElement('a');
        link.download = filename;
        link.href = dataURL;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

    } catch (error) {
        errorDiv.textContent = '❌ Erreur lors de l\'export: ' + error.message;
        errorDiv.style.display = 'block';
        errorDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

function handleExportMIDI() {
    const errorDiv = document.getElementById('error-message');

    if (!currentScoreData) {
        errorDiv.textContent = '❌ Veuillez d\'abord générer une partition';
        errorDiv.style.display = 'block';
        errorDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        return;
    }

    showInstrumentModal();
}

function handlePlay() {
    const btnPlay = document.getElementById('btn-play');
    const errorDiv = document.getElementById('error-message');

    try {
        errorDiv.style.display = 'none';

        if (!currentScoreData) {
            throw new Error('Veuillez d\'abord générer une partition');
        }

        if (midiAudioPlayer.isPlaying) {
            midiAudioPlayer.stop();
            btnPlay.textContent = '🎵 Lire la partition';
        } else {
            midiAudioPlayer.play(currentScoreData);
            btnPlay.textContent = '⏹️ Arrêter';
        }

    } catch (error) {
        console.error('❌ Erreur lecture:', error);
        errorDiv.textContent = '❌ ' + error.message;
        errorDiv.style.display = 'block';
        errorDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

function setExportButtonState(enabled) {
    const btnExportPNG = document.getElementById('btn-export-png');
    const btnExportMIDI = document.getElementById('btn-export-midi');
    const btnJazzArrange = document.getElementById('btn-jazz-arrange');
    if (btnExportPNG) {
        btnExportPNG.disabled = !enabled;
    }
    if (btnExportMIDI) {
        btnExportMIDI.disabled = !enabled;
    }
    if (btnJazzArrange) {
        btnJazzArrange.disabled = !enabled;
    }
}

function setPlayButtonState(enabled) {
    const btnPlay = document.getElementById('btn-play');
    if (btnPlay) {
        btnPlay.disabled = !enabled;
    }
}

function handleJazzArrange() {
    const errorDiv = document.getElementById('error-message');

    if (!currentScoreData) {
        errorDiv.textContent = '❌ Veuillez d\'abord générer une partition';
        errorDiv.style.display = 'block';
        errorDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        return;
    }

    const modal = document.getElementById('jazz-config-modal');
    modal.style.display = 'flex';
}

function applyJazzTransformation() {
    const errorDiv = document.getElementById('error-message');
    const outputDiv = document.getElementById('render-output');
    const textarea = document.getElementById('partition-input');
    const modal = document.getElementById('jazz-config-modal');

    try {
        errorDiv.style.display = 'none';

        jazzTransformer.config.swingRatio = parseFloat(document.getElementById('swing-ratio').value);
        jazzTransformer.config.syncopationProbability = parseFloat(document.getElementById('syncopation-prob').value);
        jazzTransformer.config.tempoMultiplier = parseFloat(document.getElementById('tempo-mult').value);
        jazzTransformer.config.walkingBassEnabled = document.getElementById('walking-bass-enabled').checked;
        jazzTransformer.config.ghostNoteProbability = document.getElementById('ghost-notes-enabled').checked ? 0.3 : 0;

        const extensions = [];
        if (document.getElementById('ext-7th').checked) extensions.push('7th');
        if (document.getElementById('ext-9th').checked) extensions.push('9th');
        if (document.getElementById('ext-11th').checked) extensions.push('11th');
        if (document.getElementById('ext-13th').checked) extensions.push('13th');
        jazzTransformer.config.chordExtensions = extensions;

        const jazzScore = jazzTransformer.transform(currentScoreData);

        if (!jazzScore.title.includes('(Jazz Arrangement)')) {
            jazzScore.title = jazzScore.title + ' (Jazz Arrangement)';
        }

        currentScoreData = jazzScore;
        renderer.render(jazzScore, outputDiv);

        const jazzScoreText = scoreToText(jazzScore);
        textarea.value = jazzScoreText;

        modal.style.display = 'none';

        errorDiv.textContent = `✅ Arrangement jazz appliqué ! (Tempo: ${jazzScore.tempo} BPM)`;
        errorDiv.style.display = 'block';
        errorDiv.style.background = '#d4edda';
        errorDiv.style.color = '#155724';
        errorDiv.style.borderColor = '#c3e6cb';

        setTimeout(() => {
            errorDiv.style.display = 'none';
            errorDiv.style.background = '';
            errorDiv.style.color = '';
            errorDiv.style.borderColor = '';
        }, SUCCESS_MESSAGE_DURATION_MS);

    } catch (error) {
        console.error('❌ Erreur arrangement jazz:', error);
        errorDiv.textContent = '❌ Erreur arrangement jazz: ' + error.message;
        errorDiv.style.display = 'block';
        errorDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

function showInstrumentModal() {
    const modal = document.getElementById('instrument-modal');
    const grid = document.getElementById('instrument-grid');

    grid.textContent = '';
    selectedInstruments.clear();

    for (const [key, data] of Object.entries(INSTRUMENTS)) {
        const button = document.createElement('button');
        button.className = 'instrument-button';
        button.dataset.instrument = key;

        const checkbox = document.createElement('div');
        checkbox.className = 'checkbox-indicator';
        checkbox.textContent = '';
        button.appendChild(checkbox);

        const emojiSpan = document.createElement('span');
        emojiSpan.textContent = data.emoji;
        const nameSpan = document.createElement('span');
        nameSpan.textContent = data.name;
        button.appendChild(emojiSpan);
        button.appendChild(document.createElement('br'));
        button.appendChild(nameSpan);

        button.addEventListener('click', () => toggleInstrumentSelection(key, button, checkbox));

        grid.appendChild(button);
    }

    modal.style.display = 'flex';

    const firstButton = grid.querySelector('.instrument-button');
    if (firstButton) {
        firstButton.focus();
    }
}

function toggleInstrumentSelection(instrumentKey, button, checkbox) {
    if (selectedInstruments.has(instrumentKey)) {
        selectedInstruments.delete(instrumentKey);
        button.classList.remove('selected');
        checkbox.textContent = '';
    } else {
        selectedInstruments.add(instrumentKey);
        button.classList.add('selected');
        checkbox.textContent = '✓';
    }
}

function handleValidateInstruments() {
    const errorDiv = document.getElementById('error-message');

    if (selectedInstruments.size === 0) {
        alert('⚠️ Veuillez sélectionner au moins un instrument');
        return;
    }

    if (selectedInstruments.size > MAX_MIDI_CHANNELS) {
        alert(`⚠️ Maximum ${MAX_MIDI_CHANNELS} instruments (limitation du format MIDI)`);
        return;
    }

    closeInstrumentModal();

    if (!currentScoreData) {
        errorDiv.textContent = '❌ Veuillez d\'abord générer une partition';
        errorDiv.style.display = 'block';
        errorDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        return;
    }

    try {
        errorDiv.style.display = 'none';

        let filename = 'partition';

        if (currentScoreData.title && currentScoreData.title.trim()) {
            filename = currentScoreData.title.trim()
                .toLowerCase()
                .normalize('NFD').replace(/[̀-ͯ]/g, '')
                .replace(/[^a-z0-9\s-]/g, '')
                .replace(/\s+/g, '-')
                .replace(/-+/g, '-');
        }

        const instrumentConfigs = Array.from(selectedInstruments).map(key => INSTRUMENTS[key]);

        if (instrumentConfigs.length === 1) {
            const instrument = instrumentConfigs[0];
            midiExporter.export(currentScoreData, filename, instrument.program, instrument.gmName);
        } else {
            midiExporter.exportMultiTrack(currentScoreData, filename, instrumentConfigs);
        }

        const successMsg = `✅ Fichier MIDI généré avec ${instrumentConfigs.length} piste(s) : ` +
                          instrumentConfigs.map(i => i.name).join(', ');
        errorDiv.textContent = successMsg;
        errorDiv.style.display = 'block';
        errorDiv.style.background = '#d4edda';
        errorDiv.style.color = '#155724';
        errorDiv.style.borderColor = '#c3e6cb';

        setTimeout(() => {
            errorDiv.style.display = 'none';
            errorDiv.style.background = '';
            errorDiv.style.color = '';
            errorDiv.style.borderColor = '';
        }, SUCCESS_MESSAGE_DURATION_MS);

    } catch (error) {
        errorDiv.textContent = '❌ Erreur lors de l\'export MIDI: ' + error.message;
        errorDiv.style.display = 'block';
        errorDiv.style.background = '';
        errorDiv.style.color = '';
        errorDiv.style.borderColor = '';
        errorDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

function closeInstrumentModal() {
    const modal = document.getElementById('instrument-modal');
    modal.style.display = 'none';
}

function handleApplyTranspose() {
    const textarea = document.getElementById('partition-input');
    const errorDiv = document.getElementById('error-message');
    const outputDiv = document.getElementById('render-output');
    const inputSemitones = document.getElementById('transpose-semitones');
    const checkboxOptimization = document.getElementById('optimization-mode');

    errorDiv.style.display = 'none';

    closeTransposeModal();

    try {
        const text = textarea.value.trim();

        if (!text) {
            throw new Error('Veuillez saisir une partition');
        }

        const parsedData = parser.parse(text);

        const semitones = parseInt(inputSemitones.value) || 0;
        const scoreData = semitones !== 0
            ? parser.transposeScore(parsedData, semitones)
            : parsedData;

        console.log(`✅ Partition parsée (transposition: ${semitones} demi-tons):`, scoreData);

        currentScoreData = scoreData;

        const optimizationEnabled = checkboxOptimization && checkboxOptimization.checked;
        renderer.setOptimizationMode(optimizationEnabled);
        const dataToRender = optimizationEnabled
            ? renderer.optimizeKeySignature(scoreData)
            : scoreData;

        renderer.render(dataToRender, outputDiv);

        const displayedScore = renderer.drawingInfo.lastScore;
        const displayedScoreText = scoreToText(displayedScore);
        textarea.value = displayedScoreText;

        renderer.setOptimizationMode(false);
        console.log(`✅ Partition rendue (optimization: ${optimizationEnabled ? 'ON' : 'OFF'})`);

        setExportButtonState(true);
        setPlayButtonState(true);

        if (semitones !== 0) {
            errorDiv.textContent = `✅ Partition générée avec transposition de ${semitones > 0 ? '+' : ''}${semitones} demi-ton(s)`;
            errorDiv.style.display = 'block';
            errorDiv.style.background = '#d4edda';
            errorDiv.style.color = '#155724';
            errorDiv.style.borderColor = '#c3e6cb';

            setTimeout(() => {
                errorDiv.style.display = 'none';
                errorDiv.style.background = '';
                errorDiv.style.color = '';
                errorDiv.style.borderColor = '';
            }, TRANSPOSE_MESSAGE_DURATION_MS);
        }

    } catch (error) {
        console.error('❌ Erreur:', error.message);
        errorDiv.textContent = '❌ ' + error.message;
        errorDiv.style.display = 'block';

        setExportButtonState(false);
        setPlayButtonState(false);

        errorDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

function showTransposeModal() {
    const modal = document.getElementById('transpose-modal');
    const input = document.getElementById('transpose-semitones');

    input.value = '0';
    modal.style.display = 'flex';
    input.focus();
}

function closeTransposeModal() {
    const modal = document.getElementById('transpose-modal');
    modal.style.display = 'none';
}

function handleImportMidi() {
    const fileInput = document.getElementById('midi-file-input');
    fileInput.value = '';
    fileInput.click();
}

function handleFileSelected(event) {
    const file = event.target.files[0];

    if (!file) {
        return;
    }

    if (!file.name.match(/\.(mid|midi)$/i)) {
        showError('Format de fichier invalide. Veuillez sélectionner un fichier .mid ou .midi');
        return;
    }

    const reader = new FileReader();

    reader.onload = function(e) {
        try {
            const arrayBuffer = e.target.result;
            const parsedMidi = midiImporter.parseMidiFile(arrayBuffer);

            const tracksWithNotes = parsedMidi.tracks.filter(track => track.noteCount > 0);

            if (tracksWithNotes.length === 0) {
                showError('Aucune note trouvée dans ce fichier MIDI');
                return;
            }

            if (tracksWithNotes.length === 1) {
                importTrack(tracksWithNotes[0], parsedMidi.ppq);
                return;
            }

            showTrackSelectionModal(tracksWithNotes, parsedMidi.ppq);

        } catch (error) {
            showError("Erreur lors de l'import MIDI : " + error.message);
            console.error(error);
        }
    };

    reader.onerror = function() {
        showError('Erreur lors de la lecture du fichier');
    };

    reader.readAsArrayBuffer(file);
}

function showTrackSelectionModal(tracks, ppq) {
    const modal = document.getElementById('track-selection-modal');
    const trackList = document.getElementById('track-list');

    trackList.innerHTML = '';

    tracks.forEach(function(track) {
        const card = document.createElement('div');
        card.className = 'track-preview-card';

        const trackName = track.trackName || ('Piste ' + (track.trackIndex + 1));

        const tempoBpm = track.tempo ? Math.round(60000000 / track.tempo) : 120;
        const durationSeconds = Math.round((track.durationTicks / ppq) * (60 / tempoBpm));

        const minutes = Math.floor(durationSeconds / 60);
        const seconds = durationSeconds % 60;
        const durationStr = minutes + ':' + seconds.toString().padStart(2, '0');

        const minNoteName = formatMidiNote(track.minNote);
        const maxNoteName = formatMidiNote(track.maxNote);

        card.innerHTML =
            '<h3>' + trackName + '</h3>' +
            '<div class="track-info">' +
            '<div><strong>Notes :</strong> ' + track.noteCount + '</div>' +
            '<div><strong>Plage :</strong> ' + minNoteName + ' - ' + maxNoteName + '</div>' +
            '<div><strong>Durée :</strong> ' + durationStr + '</div>' +
            (track.tempo ? '<div><strong>Tempo :</strong> ' + tempoBpm + ' BPM</div>' : '') +
            '</div>';

        card.addEventListener('click', function() {
            modal.style.display = 'none';
            importTrack(track, ppq);
        });

        trackList.appendChild(card);
    });

    modal.style.display = 'flex';
}

function formatMidiNote(midiNumber) {
    const noteNames = ['Do', 'Do#', 'Ré', 'Ré#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si'];
    const octave = Math.floor(midiNumber / 12) - 1;
    const noteName = noteNames[midiNumber % 12];
    return noteName + octave;
}

function importTrack(track, ppq) {
    try {
        const scoreData = midiImporter.trackToScoreData(track, ppq);

        const text = scoreToText(scoreData);

        const textarea = document.getElementById('partition-input');
        textarea.value = text;

        handleRender();

        showSuccess('Piste "' + scoreData.title + '" importée avec succès (' + track.noteCount + ' notes)');

    } catch (error) {
        showError("Erreur lors de l'import de la piste : " + error.message);
        console.error(error);
    }
}

function showError(message) {
    const errorDiv = document.getElementById('error-message');
    errorDiv.textContent = '❌ ' + message;
    errorDiv.style.display = 'block';
    errorDiv.style.background = '';
    errorDiv.style.color = '';
    errorDiv.style.borderColor = '';
    errorDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function showSuccess(message) {
    const errorDiv = document.getElementById('error-message');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    errorDiv.style.background = '#d4edda';
    errorDiv.style.color = '#155724';
    errorDiv.style.borderColor = '#c3e6cb';

    setTimeout(() => {
        errorDiv.style.display = 'none';
        errorDiv.style.background = '';
        errorDiv.style.color = '';
        errorDiv.style.borderColor = '';
    }, SUCCESS_MESSAGE_DURATION_MS);
}

document.addEventListener('DOMContentLoaded', init);
