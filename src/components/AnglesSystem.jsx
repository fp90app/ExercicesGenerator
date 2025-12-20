import React from 'react';

const AnglesSystem = ({ config }) => {
    if (!config) return <div className="text-gray-400 text-xs p-4">Chargement géométrie...</div>;

    // --- 1. NETTOYAGE DES DONNÉES (C'est ici qu'on corrige les bugs du JSON) ---

    // Fonction pour vérifier si une variable est VRAIE (gère "true", 1, true)
    const isTrue = (val) => String(val) === 'true' || String(val) === '1' || val === true;

    // Récupération sécurisée de l'angle (gère "angle" ou "angle1")
    let angleVal = config.angle || config.angle1 || 45;
    // On nettoie : si c'est du texte "45°", on garde que 45
    if (typeof angleVal === 'string') angleVal = parseFloat(angleVal.replace('°', ''));
    if (isNaN(angleVal)) angleVal = 45;

    // DÉDUCTION AUTOMATIQUE DU MODE (Si le JSON est mal configuré)
    let mode = config.mode;
    let relation = config.relation;

    // Si le mode n'est pas clair, on le devine avec les variables booléennes
    if (!mode || mode === 'undefined' || mode.includes('{')) {
        if (config.is_comp !== undefined) {
            // Niveau 2 : Complémentaire ou Supplémentaire
            mode = isTrue(config.is_comp) ? 'COMPLEMENTARY' : 'SUPPLEMENTARY';
        } else {
            // Niveau 1 : Par défaut X_SHAPE
            mode = 'X_SHAPE';
        }
    }

    // Si la relation (Opposés/Adjacents) n'est pas claire, on la devine
    if (!relation || relation === 'undefined' || relation.includes('{')) {
        relation = isTrue(config.is_oppose) ? 'OPPOSES' : 'ADJACENTS';
    }

    // --- 2. PARAMÈTRES GRAPHIQUES ---
    const SIZE = 300;
    const CENTER = 150;
    const RADIUS = 100;
    const labels = config.labels || {};
    const colors = config.colors || { blue: "#3b82f6", red: "#ef4444" };

    // --- 3. MOTEUR GRAPHIQUE (Corrigé Y vers le Haut) ---
    const getPos = (deg, r = RADIUS) => {
        const rad = (deg * Math.PI) / 180.0;
        return {
            x: CENTER + (r * Math.cos(rad)),
            y: CENTER - (r * Math.sin(rad)) // Y inversé pour SVG
        };
    };

    const drawWedge = (start, end, color, label) => {
        // Normalisation
        let s = start; let e = end;
        let diff = e - s;
        while (diff < 0) diff += 360;

        // Coordonnées
        const p1 = getPos(s, 35);
        const p2 = getPos(e, 35);
        const largeArc = diff > 180 ? 1 : 0;

        // Label
        const mid = s + diff / 2;
        const lblPos = getPos(mid, 55);

        return (
            <g>
                <path d={`M ${CENTER} ${CENTER} L ${p1.x} ${p1.y} A 35 35 0 ${largeArc} 0 ${p2.x} ${p2.y} Z`}
                    fill={color} fillOpacity="0.2" stroke={color} strokeWidth="2" />
                {label && label !== "?" && (
                    <text x={lblPos.x} y={lblPos.y} fill={color} fontSize="14" fontWeight="bold" textAnchor="middle" dominantBaseline="middle" style={{ textShadow: "0px 0px 4px white" }}>
                        {label}
                    </text>
                )}
                {label === "?" && (
                    <text x={lblPos.x} y={lblPos.y} fill={color} fontSize="18" fontWeight="bold" textAnchor="middle" dominantBaseline="middle">?</text>
                )}
            </g>
        );
    };

    const drawLine = (deg, txt) => {
        const p = getPos(deg, RADIUS);
        const l = getPos(deg, RADIUS + 20);
        return (
            <g>
                <line x1={CENTER} y1={CENTER} x2={p.x} y2={p.y} stroke="black" strokeWidth="3" strokeLinecap="round" />
                {txt && <text x={l.x} y={l.y} fill="#64748b" fontSize="12" fontWeight="bold" textAnchor="middle" dominantBaseline="middle">{txt}</text>}
            </g>
        );
    };

    // --- 4. RENDU VISUEL ---

    // SCÈNE 1 : X_SHAPE (Opposés / Adjacents)
    if (mode === 'X_SHAPE') {
        const base = -20;
        const gap = angleVal; // L'angle reçu du JSON
        const a1 = base;
        const a2 = base + gap;
        const a3 = base + 180;
        const a4 = base + gap + 180;

        return (
            <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-full h-full bg-white rounded-xl">
                <line x1={getPos(a1).x} y1={getPos(a1).y} x2={getPos(a3).x} y2={getPos(a3).y} stroke="black" strokeWidth="3" />
                <line x1={getPos(a2).x} y1={getPos(a2).y} x2={getPos(a4).x} y2={getPos(a4).y} stroke="black" strokeWidth="3" />
                <text x={CENTER} y={CENTER + 20} textAnchor="middle" fill="#94a3b8" fontSize="10">O</text>

                {relation === 'OPPOSES' ? (
                    <>
                        {drawWedge(a1, a2, colors.blue, labels.ang1)}
                        {drawWedge(a3, a4, colors.red, labels.ang2)}
                    </>
                ) : (
                    <>
                        {drawWedge(a1, a2, colors.blue, labels.ang1)}
                        {drawWedge(a2, a3, colors.red, labels.ang2)}
                    </>
                )}
            </svg>
        );
    }

    // SCÈNE 2 : COMPLEMENTARY (90°)
    if (mode === 'COMPLEMENTARY') {
        return (
            <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-full h-full bg-white rounded-xl">
                <path d={`M ${CENTER} ${CENTER - 20} L ${CENTER + 20} ${CENTER - 20} L ${CENTER + 20} ${CENTER}`} fill="none" stroke="#94a3b8" />
                {drawLine(0, labels.A)}
                {drawLine(90, labels.B)}
                {drawLine(angleVal, labels.M)}
                {drawWedge(0, angleVal, colors.blue, labels.ang1)}
                {drawWedge(angleVal, 90, colors.red, labels.ang2)}
                <text x={CENTER - 15} y={CENTER + 15} fill="#94a3b8">O</text>
            </svg>
        );
    }

    // SCÈNE 3 : SUPPLEMENTARY (180°)
    if (mode === 'SUPPLEMENTARY') {
        return (
            <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-full h-full bg-white rounded-xl">
                {drawLine(0, labels.A)}
                {drawLine(180, labels.B)}
                {drawLine(angleVal, labels.C)}
                {drawWedge(0, angleVal, colors.blue, labels.ang1)}
                {drawWedge(angleVal, 180, colors.red, labels.ang2)}
                <text x={CENTER} y={CENTER + 20} textAnchor="middle" fill="#94a3b8">O</text>
            </svg>
        );
    }

    // Fallback d'erreur
    return <div className="text-red-500 font-bold p-10 text-center">Mode "{mode}" inconnu (Check JSON)</div>;
};

export default AnglesSystem;