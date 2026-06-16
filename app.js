/**
 * APP.JS
 *
 * Point d'entrée de l'application
 * Gère les événements utilisateur et orchestre Parser et Renderer
 */

// Instances globales
let parser;
let renderer;

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
    const textarea = document.getElementById('partition-input');
    const errorDiv = document.getElementById('error-message');

    // Attache les événements
    btnRender.addEventListener('click', handleRender);
    btnExample.addEventListener('click', handleExample);
    btnClear.addEventListener('click', handleClear);

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

        // Rend la partition
        renderer.render(scoreData, outputDiv);
        console.log('✅ Partition rendue');

    } catch (error) {
        // Affiche l'erreur
        console.error('❌ Erreur:', error.message);
        errorDiv.textContent = '❌ ' + error.message;
        errorDiv.style.display = 'block';

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
    outputDiv.innerHTML = '<p class="placeholder">Cliquez sur "Générer la partition" pour voir le rendu graphique</p>';

    // Focus sur le textarea
    textarea.focus();
}

// Lance l'initialisation au chargement de la page
// DOMContentLoaded s'assure que le DOM est prêt avant d'exécuter le code
document.addEventListener('DOMContentLoaded', init);
