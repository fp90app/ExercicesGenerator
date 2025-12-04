import React from 'react';

const COLORS = {
    event: { bg: "#FFBF00", border: "#CC9900" },   // Jaune (Événements)
    control: { bg: "#FFAB19", border: "#CF8B17" }, // Orange (Contrôle)
    var: { bg: "#FF8C1A", border: "#DB6E00" },     // Orange Foncé (Variables)
    motion: { bg: "#4C97FF", border: "#3373CC" },  // Bleu (Mouvement)
    looks: { bg: "#9966FF", border: "#774DCB" },   // Violet (Apparence)
    operator: { bg: "#59C059", border: "#389438" } // Vert (Opérateurs)
};

const ScratchBlock = ({ type = "var", text = "", isHat = false, indent = 0, highlight = null }) => {
    const theme = COLORS[type] || COLORS.var;

    // 1. Calcul de la largeur nécessaire selon le texte
    // On force une largeur min de 100px pour éviter les blocs écrasés
    const width = Math.max(100, text.length * 9 + 30);
    const height = 44;

    // 2. Définition des chemins SVG (Paths)
    // J'utilise des variables ${width} directement dans la string pour éviter les erreurs de .replace()

    // Forme "Chapeau" (Quand drapeau cliqué)
    const hatPath = `M 0 12 Q 0 0 12 0 L ${width - 12} 0 Q ${width} 0 ${width} 12 L ${width} 28 Q ${width} 32 ${width - 4} 32 L 64 32 L 60 36 L 52 36 L 48 32 L 4 32 Q 0 32 0 28 Z`;

    // Forme "Standard" (Puzzle)
    const stdPath = `M 0 4 L 4 4 L 8 8 L 16 8 L 20 4 L ${width - 4} 4 Q ${width} 4 ${width} 8 L ${width} 36 Q ${width} 40 ${width - 4} 40 L 64 40 L 60 44 L 52 44 L 48 40 L 4 40 Q 0 40 0 36 Z`;

    const finalPath = isHat ? hatPath : stdPath;

    // 3. Gestion du texte avec mise en évidence (Gras/Foncé)
    const renderText = () => {
        if (!text) return ""; // Sécurité si texte vide
        if (!highlight || !text.includes(highlight)) return text;

        const parts = text.split(new RegExp(`(${highlight})`, 'g'));
        return parts.map((part, i) => (
            part === highlight ? (
                <tspan key={i} fill="rgba(0,0,0,0.6)" fontWeight="900">{part}</tspan>
            ) : (
                <tspan key={i}>{part}</tspan>
            )
        ));
    };

    return (
        <div style={{ marginLeft: indent * 20, marginBottom: -4 }} className="relative drop-shadow-sm filter">
            <svg width={width} height={height + 4} className="block overflow-visible">
                <path
                    d={finalPath}
                    fill={theme.bg}
                    stroke={theme.border}
                    strokeWidth="1"
                />
                <text
                    x="12"
                    y={isHat ? 22 : 26}
                    fill="white"
                    fontFamily="Verdana, sans-serif"
                    fontSize="12"
                    fontWeight="bold"
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                    {renderText()}
                </text>
            </svg>
        </div>
    );
};

// Le composant conteneur pour la liste
export const ScratchScript = ({ blocks }) => {
    if (!blocks || blocks.length === 0) return null;

    return (
        <div className="inline-flex flex-col items-start p-4 bg-slate-50 rounded-xl border border-slate-200 min-w-[200px]">
            {blocks.map((b, i) => (
                <ScratchBlock key={i} {...b} />
            ))}
        </div>
    );
};

export default ScratchScript; 