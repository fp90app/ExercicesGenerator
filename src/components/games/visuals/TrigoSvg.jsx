import React from 'react';

/**
 * Composant visuel pur pour la Trigonométrie.
 * Affiche un triangle rectangle dynamique selon les données fournies.
 * @param {object} data - Données issues du générateur (points, values, highlightAngle, etc.)
 */
export const TrigoSvg = ({ data }) => {
    if (!data) return null;

    // --- Configuration du dessin ---
    // On définit une échelle pour que le triangle rentre toujours bien dans le cadre SVG 300x300
    // C est l'angle droit, on le place en bas à gauche.
    const SCALE = 15;
    const OFFSET_X = 50;
    const OFFSET_Y = 250;

    // Récupération des longueurs réelles
    const acLen = data.values.AC * SCALE; // Hauteur
    const bcLen = data.values.BC * SCALE; // Base

    // Coordonnées des points (Système SVG : y vers le bas)
    // C (Angle droit)
    const cX = OFFSET_X;
    const cY = OFFSET_Y;

    // A (Haut)
    const aX = OFFSET_X;
    const aY = OFFSET_Y - acLen;

    // B (Droite)
    const bX = OFFSET_X + bcLen;
    const bY = OFFSET_Y;

    // Labels à afficher sur les côtés (si demandés)
    // data.showValues est un objet du type { AB: 12, AC: '?' }
    const getLabel = (side) => {
        if (!data.showValues) return null;
        return data.showValues[side] || null;
    };

    // --- Helpers de dessin ---

    // Calcul du milieu d'un segment pour placer le texte
    const mid = (x1, y1, x2, y2) => ({ x: (x1 + x2) / 2, y: (y1 + y2) / 2 });

    const labelPos = {
        AC: { ...mid(aX, aY, cX, cY), dx: -15, dy: 0 }, // Gauche
        BC: { ...mid(bX, bY, cX, cY), dx: 0, dy: 20 },  // Bas
        AB: { ...mid(aX, aY, bX, bY), dx: 15, dy: -10 } // Hypoténuse (décalage simple)
    };

    // Couleur de l'angle actif
    const activeColor = "#4f46e5"; // Indigo-600
    const defaultColor = "#cbd5e1"; // Slate-300

    return (
        <svg
            viewBox="0 0 300 300"
            className="w-full h-full max-h-[400px]"
            role="img"
            aria-labelledby="trigoTitle trigoDesc"
        >
            <title id="trigoTitle">Triangle rectangle ABC</title>
            <desc id="trigoDesc">
                Triangle rectangle en C.
                {data.highlightAngle ? `L'angle ${data.highlightAngle} est mis en évidence.` : ''}
                {data.showValues && `Valeurs affichées : ${JSON.stringify(data.showValues)}`}
            </desc>

            {/* --- 1. Angle Droit (Carré en C) --- */}
            <path
                d={`M ${cX} ${cY - 20} L ${cX + 20} ${cY - 20} L ${cX + 20} ${cY}`}
                fill="none"
                stroke={defaultColor}
                strokeWidth="2"
            />

            {/* --- 2. Arc de l'angle mis en valeur & Valeur --- */}
            {data.highlightAngle === 'A' && (
                <g>
                    {/* Arc Angle A */}
                    <path
                        d={`M ${aX} ${aY + 30} Q ${aX + 15} ${aY + 25} ${aX + Math.sin(Math.atan(bcLen / acLen)) * 30} ${aY + Math.cos(Math.atan(bcLen / acLen)) * 30}`}
                        fill="rgba(79, 70, 229, 0.2)"
                        stroke={activeColor}
                        strokeWidth="3"
                    />
                    {/* Valeur Angle A (Ex: "42°" ou "?") */}
                    <text
                        x={aX + 15}
                        y={aY + 50}
                        className="font-bold fill-indigo-600 text-sm"
                        textAnchor="start"
                    >
                        {data.angleUnknown ? "?" : `${data.angles.A}°`}
                    </text>
                </g>
            )}

            {data.highlightAngle === 'B' && (
                <g>
                    {/* Arc Angle B */}
                    <path
                        d={`M ${bX - 30} ${bY} A 30 30 0 0 1 ${bX - 25} ${bY - 15}`} // Arc approximatif
                        fill="rgba(79, 70, 229, 0.2)"
                        stroke={activeColor}
                        strokeWidth="3"
                    />
                    {/* Valeur Angle B (Ex: "48°" ou "?") */}
                    <text
                        x={bX - 45}
                        y={bY - 10}
                        className="font-bold fill-indigo-600 text-sm"
                        textAnchor="end"
                    >
                        {data.angleUnknown ? "?" : `${data.angles.B}°`}
                    </text>
                </g>
            )}

            {/* --- 3. Triangle (Contour) --- */}
            <path
                d={`M ${cX} ${cY} L ${aX} ${aY} L ${bX} ${bY} Z`}
                fill="none"
                stroke="#1e293b"
                strokeWidth="3"
                strokeLinejoin="round"
            />

            {/* --- 4. Points (Sommets) --- */}
            <text x={aX - 10} y={aY - 10} className="font-bold text-lg fill-slate-700">A</text>
            <text x={bX + 10} y={bY + 10} className="font-bold text-lg fill-slate-700">B</text>
            <text x={cX - 15} y={cY + 10} className="font-bold text-lg fill-slate-700">C</text>

            {/* --- 5. Valeurs des côtés --- */}
            {['AC', 'BC', 'AB'].map(side => {
                const val = getLabel(side);
                if (!val) return null;
                const pos = labelPos[side];
                return (
                    <g key={side}>
                        <rect
                            x={pos.x + pos.dx - 15}
                            y={pos.y + pos.dy - 12}
                            width="30"
                            height="24"
                            rx="4"
                            fill="white"
                            stroke="#e2e8f0"
                            opacity="0.9"
                        />
                        <text
                            x={pos.x + pos.dx}
                            y={pos.y + pos.dy + 5}
                            textAnchor="middle"
                            className={`font-mono text-sm font-bold ${val === '?' ? 'fill-indigo-600' : 'fill-slate-600'}`}
                        >
                            {val}
                        </text>
                    </g>
                );
            })}
        </svg>
    );
};