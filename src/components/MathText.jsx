import React from 'react';
import 'katex/dist/katex.min.css'; // Import du CSS (Vital pour que ce soit joli)
import Latex from 'react-latex-next';

const MathText = ({ text, className = "" }) => {
    if (!text) return null;

    // Conversion en string pour éviter les bugs si on reçoit un nombre
    const safeText = String(text);

    return (
        <span className={`math-text-container ${className}`}>
            <Latex>{safeText}</Latex>
        </span>
    );
};

export default MathText;