/**
 * APP.JS
 *
 * Point d'entrée de l'application
 * Gère les événements utilisateur et orchestre Parser et Renderer
 */

// Instances globales
let parser;
let renderer;
let currentScoreData = null; // Stocke les dernières données parsées pour l'export

/**
 * Initialisation de l'application
 * Appelée au chargement de la page
 */
function init() {
    // Crée les instances
    parser = new Parser();
    renderer = new Renderer();

    // Récupère les éléments DOM
    const btnRender = document.getElementById('btn-render');
    const btnExample = document.getElementById('btn-example');
    const btnClear = document.getElementById('btn-clear');
    const btnExportPNG = document.getElementById('btn-export-png');
    const textarea = document.getElementById('partition-input');
    const errorDiv = document.getElementById('error-message');

    // Attache les événements
    btnRender.addEventListener('click', handleRender);
    btnExample.addEventListener('click', handleExample);
    btnClear.addEventListener('click', handleClear);
    btnExportPNG.addEventListener('click', handleExportPNG);

    // Permet de générer avec Ctrl+Enter dans le textarea
    textarea.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            handleRender();
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
 * Active ou désactive le bouton d'export PNG
 */
function setExportButtonState(enabled) {
    const btnExportPNG = document.getElementById('btn-export-png');
    if (btnExportPNG) {
        btnExportPNG.disabled = !enabled;
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

// Lance l'initialisation au chargement de la page
// DOMContentLoaded s'assure que le DOM est prêt avant d'exécuter le code
document.addEventListener('DOMContentLoaded', init);
