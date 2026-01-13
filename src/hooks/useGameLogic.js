import { useState, useEffect, useCallback } from 'react';

/**
 * HOOK UNIVERSEL DE LOGIQUE DE JEU
 * Gère le cycle de vie d'un exercice : Menu -> Jeu -> Score -> Fin.
 * * @param {Object} params
 * @param {Function} params.generator - La fonction qui génère les données (ex: generatePythagoreData)
 * @param {Function} params.onFinish - Callback pour sauvegarder le score (reçu du parent)
 * @param {Function} params.onSound - Callback pour jouer les sons (reçu du parent)
 * @param {number} params.totalQuestions - Nombre de questions (défaut: 10)
 * @param {number} params.initialLevel - Niveau de départ (défaut: 1)
 */
export const useGameLogic = ({
    generator,
    onFinish,
    onSound,
    totalQuestions = 10,
    initialLevel = 1
}) => {
    // --- ÉTATS ---
    // 'menu' (choix niveau), 'playing' (en cours), 'finished' (résultats)
    // Si un niveau initial est forcé (ex: via URL), on commence directement en 'playing'
    const [gameState, setGameState] = useState(initialLevel ? 'playing' : 'menu');
    const [level, setLevel] = useState(initialLevel);

    const [step, setStep] = useState(0);       // Index question actuelle (0 à 9)
    const [score, setScore] = useState(0);     // Score courant
    const [data, setData] = useState(null);    // Données de la question actuelle
    const [feedback, setFeedback] = useState(null); // null | 'correct' | 'wrong'

    // --- CHARGEMENT DE LA QUESTION ---
    // Mémorisé avec useCallback pour éviter les boucles infinies
    const loadQuestion = useCallback((targetLevel = level) => {
        if (!generator) return;

        // On génère la donnée fraîche
        const newData = generator({ level: targetLevel });
        setData(newData);

        // Reset des états transitoires
        setFeedback(null);
    }, [generator, level]);

    // Initialisation au montage si on est déjà en mode 'playing'
    useEffect(() => {
        if (gameState === 'playing' && !data) {
            loadQuestion(level);
        }
    }, [gameState, level, loadQuestion, data]);

    // --- ACTIONS DU JOUEUR ---

    /**
     * Démarre une partie (depuis le menu)
     * @param {number} selectedLevel - Le niveau choisi
     */
    const startGame = (selectedLevel) => {
        setLevel(selectedLevel);
        setScore(0);
        setStep(0);
        setGameState('playing');
        loadQuestion(selectedLevel);
        if (onSound) onSound('CLICK');
    };

    /**
     * Valide la réponse de l'utilisateur.
     * * @param {any} userAnswer - La réponse de l'élève OU un booléen.
     * * MODE 1 (Automatique) : Si on passe une valeur (string/number), le hook compare avec data.correct.
     * MODE 2 (Manuel) : Si on passe true/false, le hook fait juste confiance (pour les exos complexes).
     */
    const validate = (userAnswer) => {
        if (feedback) return; // Anti-spam clic

        let isCorrect = false;

        // Détection du mode de validation
        if (typeof userAnswer === 'boolean') {
            // Mode Manuel (ex: Tableau de valeurs où le composant fait sa propre vérif)
            isCorrect = userAnswer;
        } else {
            // Mode Automatique (ex: QCM, Pythagore)
            // On gère la comparaison souple (string vs number)
            isCorrect = String(userAnswer) === String(data.correct);
        }

        // Mise à jour des états
        setFeedback(isCorrect ? 'correct' : 'wrong');

        if (isCorrect) {
            setScore(s => s + 1);
            if (onSound) onSound('CORRECT');
        } else {
            if (onSound) onSound('WRONG');
        }
    };

    /**
     * Passe à la question suivante ou termine le jeu
     */
    const nextQuestion = () => {
        if (step < totalQuestions - 1) {
            // Question suivante
            setStep(s => s + 1);
            loadQuestion(level);
        } else {
            // Fin de la série
            setGameState('finished');
            if (score >= totalQuestions * 0.8 && onSound) {
                onSound('WIN');
            }
            // Appel automatique de la sauvegarde si fournie
            // Note : on passe le score final (score actuel + 1 si la dernière était bonne, mais 'score' state n'est pas encore à jour dans ce cycle)
            // Astuce : On utilise la valeur courante de score car setScore est asynchrone, 
            // mais ici on est dans le handler du bouton "Suivant", donc le score a DÉJÀ été mis à jour lors du validate().
            if (onFinish) onFinish(score);
        }
    };

    /**
     * Quitter le jeu (retour menu ou dashboard)
     * @param {Function} customQuitAction - Action spécifique (optionnelle)
     */
    const quit = (customQuitAction) => {
        if (onSound) onSound('CLICK');
        if (customQuitAction) {
            customQuitAction();
        } else {
            // Comportement par défaut : retour au menu interne
            setGameState('menu');
        }
    };

    /**
     * Redémarrer le niveau actuel (Reset)
     */
    const restart = () => {
        startGame(level);
    };

    // --- RETOUR DE L'INTERFACE ---
    return {
        // États (Lecture seule pour l'UI)
        gameState,      // 'menu', 'playing', 'finished'
        level,          // 1, 2, 3...
        step,           // 0 à 9
        totalQuestions, // 10
        score,          // 0 à 10
        data,           // Objet question { q, options, correct, ... }
        feedback,       // null, 'correct', 'wrong'

        // Actions (Méthodes à lier aux boutons)
        startGame,      // (lvl) => void
        validate,       // (answer OR boolean) => void
        nextQuestion,   // () => void
        quit,           // (callback?) => void
        restart,        // () => void

        // Utilitaires calculés
        progressPercent: ((step) / totalQuestions) * 100,
        isSuccess: score >= totalQuestions * 0.8
    };
};

export default useGameLogic;