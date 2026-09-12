import React from 'react';
import 'katex/dist/katex.min.css'; // Import du CSS (Vital pour que ce soit joli)
import Latex from 'react-latex-next';

const MathText = ({ text, className = "" }) => {
    if (!text) return null;

    // Conversion en string pour éviter les bugs si on reçoit un nombre
    const safeText = String(text);

    // Fonction pour parser le Markdown basique (Gras, Souligné) SANS casser le LaTeX
    const parseFormatting = (str) => {
        // 1. Découpage pour le GRAS (**texte**)
        // L'expression régulière garde les délimiteurs dans le tableau
        const boldParts = str.split(/(\*\*.*?\*\*)/g);

        return boldParts.map((bPart, bIndex) => {
            if (bPart.startsWith('**') && bPart.endsWith('**')) {
                // On enveloppe dans <strong> et on parse le LaTeX à l'intérieur
                // (utile si le prof met du LaTeX dans le gras, ex: **$x^2$**)
                return (
                    <strong key={bIndex}>
                        <Latex>{bPart.slice(2, -2)}</Latex>
                    </strong>
                );
            }

            // 2. Découpage pour le SOULIGNÉ (__texte__)
            const underlineParts = bPart.split(/(__.*?__)/g);
            return underlineParts.map((uPart, uIndex) => {
                if (uPart.startsWith('__') && uPart.endsWith('__')) {
                    return (
                        <u key={`${bIndex}-${uIndex}`}>
                            <Latex>{uPart.slice(2, -2)}</Latex>
                        </u>
                    );
                }

                // 3. Rendu standard du texte pur ou des équations LaTeX
                return <Latex key={`${bIndex}-${uIndex}`}>{uPart}</Latex>;
            });
        });
    };

    return (
        <span className={`math-text-container ${className}`}>
            {parseFormatting(safeText)}
        </span>
    );
};

export default MathText;