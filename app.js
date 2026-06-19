/**
 * APP.JS
 *
 * Point d'entrée de l'application
 * Gère les événements utilisateur et orchestre Parser et Renderer
 */

// Instances globales
let parser;
let renderer;
let midiAudioPlayer;
let midiExporter;
let currentScoreData = null; // Stocke les dernières données parsées pour l'export
let selectedInstruments = new Set(); // Stocke les clés des instruments sélectionnés

// Mapping des instruments disponibles
const INSTRUMENTS = {
    'piano': { name: 'Piano', program: 0, emoji: '🎹' },
    'guitare': { name: 'Guitare', program: 24, emoji: '🎸' },
    'violon': { name: 'Violon', program: 40, emoji: '🎻' },
    'flute': { name: 'Flûte', program: 73, emoji: '🪈' },
    'accordeon': { name: 'Accordéon', program: 21, emoji: '🪗' },
    'contrebasse': { name: 'Contrebasse', program: 43, emoji: '🎼' },
    'hautbois': { name: 'Hautbois', program: 68, emoji: '🎼' },
    'trompette': { name: 'Trompette', program: 56, emoji: '🎺' },
	'xylophone': { name: 'Xylophone', program: 13, emoji: '🎼' },
	'guitare électrique': { name: 'Guitare électrique', program: 26, emoji: '🎸' },
	'cornemuse': { name: 'Cornemuse', program: 109, emoji: '🎼' },
	'orgue': { name: 'Orgue', program: 16, emoji: '🎼' }
};

/**
 * Initialisation de l'application
 * Appelée au chargement de la page
 */
function init() {
    // Crée les instances
    parser = new Parser();
    renderer = new Renderer();
    midiExporter = new MidiExporter();
    midiAudioPlayer = new MidiAudioPlayer();

    // Récupère les éléments DOM
    const btnRender = document.getElementById('btn-render');
    const btnExample = document.getElementById('btn-example');
    const btnClear = document.getElementById('btn-clear');
    const btnExportPNG = document.getElementById('btn-export-png');
    const btnExportMIDI = document.getElementById('btn-export-midi');
    const textarea = document.getElementById('partition-input');
    const errorDiv = document.getElementById('error-message');
    const btnPlay = document.getElementById('btn-play');
    const audioElement = document.getElementById('midi-player');

    // Initialise le lecteur audio
    midiAudioPlayer.init(audioElement, midiExporter);

    // Écoute les événements de l'élément audio pour mettre à jour le bouton
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

    // Attache les événements
    btnRender.addEventListener('click', handleRender);
    btnExample.addEventListener('click', handleExample);
    btnClear.addEventListener('click', handleClear);
    btnExportPNG.addEventListener('click', handleExportPNG);
    btnExportMIDI.addEventListener('click', handleExportMIDI);
    btnPlay.addEventListener('click', handlePlay);

    // Permet de générer avec Ctrl+Enter dans le textarea
    textarea.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            handleRender();
        }
    });

    // Gestion de la modale d'instruments
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

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && instrumentModal.style.display === 'flex') {
            closeInstrumentModal();
        }
    });

    console.log('✅ Application initialisée');
}

/**
 * Gère le clic sur "Générer la partition"
 */
function handleRender() {
    const textarea = document.getElementById('partition-input');
    const errorDiv = document.getElementById('error-message');
    const outputDiv = document.getElementById('render-output');

    // Cache les erreurs précédentes
    errorDiv.style.display = 'none';

    try {
        // Parse le texte saisi
        const text = textarea.value.trim();

        if (!text) {
            throw new Error('Veuillez saisir une partition');
        }

        const scoreData = parser.parse(text);
        console.log('✅ Partition parsée:', scoreData);

        // Stocke les données pour l'export
        currentScoreData = scoreData;

        // Rend la partition
        renderer.render(scoreData, outputDiv);
        console.log('✅ Partition rendue');

        // Active les boutons d'export et de lecture
        setExportButtonState(true);
        setPlayButtonState(true);

    } catch (error) {
        // Affiche l'erreur
        console.error('❌ Erreur:', error.message);
        errorDiv.textContent = '❌ ' + error.message;
        errorDiv.style.display = 'block';

        // Désactive les boutons d'export et de lecture en cas d'erreur
        setExportButtonState(false);
        setPlayButtonState(false);

        // Scroll vers l'erreur
        errorDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

/**
 * Gère le clic sur "Charger un exemple"
 */
function handleExample() {
    const textarea = document.getElementById('partition-input');

    // Demande confirmation si le textarea n'est pas vide
    if (textarea.value.trim() && !confirm('Voulez-vous remplacer le contenu actuel par un exemple ?')) {
        return;
    }

    // Charge un exemple
    const example = `Au clair de la lune
120
4/4
sol
Do Do Do Re Mi2 Re2
Do Mi Re Re Do2
Do Do Do Re Mi2 Re2
Do Mi Re Re Do2`;

    textarea.value = example;

    // Génère automatiquement
    handleRender();
}

/**
 * Gère le clic sur "Effacer"
 */
function handleClear() {
    const textarea = document.getElementById('partition-input');
    const outputDiv = document.getElementById('render-output');
    const errorDiv = document.getElementById('error-message');

    // Demande confirmation
    if (textarea.value.trim() && !confirm('Voulez-vous vraiment effacer la partition ?')) {
        return;
    }

    // Efface tout
    textarea.value = '';
    errorDiv.style.display = 'none';

    // Nettoie le container de manière sécurisée
    while (outputDiv.firstChild) {
        outputDiv.removeChild(outputDiv.firstChild);
    }
    const placeholder = document.createElement('p');
    placeholder.className = 'placeholder';
    placeholder.textContent = 'Cliquez sur "Générer la partition" pour voir le rendu graphique';
    outputDiv.appendChild(placeholder);

    currentScoreData = null; // Efface les données stockées

    // Désactive les boutons d'export et de lecture
    setExportButtonState(false);
    setPlayButtonState(false);

    // Focus sur le textarea
    textarea.focus();
}

/**
 * Gère le clic sur "Exporter en PNG"
 * Convertit le canvas en image PNG et déclenche le téléchargement
 */
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

/**
 * Gère le clic sur "Exporter en MIDI"
 * Affiche la modale de sélection d'instrument
 */
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

/**
 * Gère le clic sur "Lire la partition" / "Arrêter"
 */
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
        console.error('❌ Erreur lecture:', error.message);
        errorDiv.textContent = '❌ ' + error.message;
        errorDiv.style.display = 'block';
        errorDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

/**
 * Active ou désactive les boutons d'export (PNG et MIDI)
 */
function setExportButtonState(enabled) {
    const btnExportPNG = document.getElementById('btn-export-png');
    const btnExportMIDI = document.getElementById('btn-export-midi');
    if (btnExportPNG) {
        btnExportPNG.disabled = !enabled;
    }
    if (btnExportMIDI) {
        btnExportMIDI.disabled = !enabled;
    }
}

/**
 * Active ou désactive le bouton de lecture
 */
function setPlayButtonState(enabled) {
    const btnPlay = document.getElementById('btn-play');
    if (btnPlay) {
        btnPlay.disabled = !enabled;
    }
}

/**
 * Affiche la modale de sélection d'instrument
 */
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

/**
 * Gère le toggle d'un instrument dans la sélection multiple
 */
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

/**
 * Gère la validation de la sélection multiple d'instruments
 */
function handleValidateInstruments() {
    const errorDiv = document.getElementById('error-message');

    if (selectedInstruments.size === 0) {
        alert('⚠️ Veuillez sélectionner au moins un instrument');
        return;
    }

    if (selectedInstruments.size > 16) {
        alert('⚠️ Maximum 16 instruments (limitation du format MIDI)');
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

        midiExporter.exportMultiTrack(currentScoreData, filename, instrumentConfigs);

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
        }, 5000);

    } catch (error) {
        errorDiv.textContent = '❌ Erreur lors de l\'export MIDI: ' + error.message;
        errorDiv.style.display = 'block';
        errorDiv.style.background = '';
        errorDiv.style.color = '';
        errorDiv.style.borderColor = '';
        errorDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

/**
 * Ferme la modale de sélection d'instrument
 */
function closeInstrumentModal() {
    const modal = document.getElementById('instrument-modal');
    modal.style.display = 'none';
}

// Lance l'initialisation au chargement de la page
// DOMContentLoaded s'assure que le DOM est prêt avant d'exécuter le code
document.addEventListener('DOMContentLoaded', init);
