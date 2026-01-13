import React from 'react';

// Palette de couleurs douces et modernes pour les graphiques
const COLORS = [
    '#6366f1', // Indigo
    '#ec4899', // Pink
    '#10b981', // Emerald
    '#f59e0b', // Amber
    '#8b5cf6', // Violet
    '#3b82f6', // Blue
    '#ef4444', // Red
];

// --- UTILITAIRES SVG ---

// Convertit polaire (angle/rayon) vers cartésien (x/y) pour le Camembert
const polarToCartesian = (centerX, centerY, radius, angleInDegrees) => {
    const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
    return {
        x: centerX + (radius * Math.cos(angleInRadians)),
        y: centerY + (radius * Math.sin(angleInRadians))
    };
};

// Crée le chemin SVG d'une part de camembert
const describeArc = (x, y, radius, startAngle, endAngle) => {
    const start = polarToCartesian(x, y, radius, endAngle);
    const end = polarToCartesian(x, y, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
    return [
        "M", start.x, start.y,
        "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y,
        "L", x, y,
        "Z"
    ].join(" ");
};

const DataReadingSystem = ({ config, highlight }) => {
    // Dimensions globales du SVG
    const WIDTH = 600;
    const HEIGHT = 400;

    // Marges ajustées pour laisser la place aux textes longs (Jours) et aux axes
    const PADDING_LEFT = 50;
    const PADDING_BOTTOM = 60;
    const PADDING_TOP = 40;
    const PADDING_RIGHT = 20;

    const CHART_W = WIDTH - PADDING_LEFT - PADDING_RIGHT;
    const CHART_H = HEIGHT - PADDING_TOP - PADDING_BOTTOM;

    // --- ALGORITHME D'ÉCHELLE INTELLIGENT ---
    // Permet d'avoir des lignes de grille sur des nombres entiers (0, 2, 4...)
    // et règle les problèmes de précision visuelle.
    const calculateScale = (minValue, maxValue) => {
        let min = Math.floor(minValue);
        // Pour les bâtons, on commence souvent à 0. Pour les courbes, on s'adapte.
        if (min > 0 && config.type !== 'BAR') min = Math.max(0, min - 2);
        if (config.type === 'BAR') min = 0;

        let max = Math.ceil(maxValue);
        let range = max - min;

        // Détermination du pas (step) pour avoir une grille lisible
        let step = 1;
        if (range > 20) step = 2;
        if (range > 40) step = 5;
        if (range > 100) step = 10;

        // Arrondi aux multiples du pas
        const niceMin = Math.floor(min / step) * step;
        const niceMax = Math.ceil(max / step) * step; // On inclut le max
        const niceRange = niceMax - niceMin;

        // Génération des ticks (les valeurs de l'axe Y)
        const ticks = [];
        for (let v = niceMin; v <= niceMax; v += step) {
            ticks.push(v);
        }

        return { min: niceMin, max: niceMax, range: niceRange, ticks };
    };

    // --- 1. RENDER : DIAGRAMME EN BÂTONS (BAR) ---
    const renderBarChart = () => {
        const { labels, values, correct } = config;

        // Calcul de l'échelle propre (0, 2, 4, 6...)
        const scale = calculateScale(0, Math.max(...values));

        const barWidth = (CHART_W / values.length) * 0.5;
        const spacing = CHART_W / values.length;

        return (
            <g>
                {/* Grille et Axe Y */}
                {scale.ticks.map((val, i) => {
                    // Position Y exacte selon l'échelle mathématique
                    const y = PADDING_TOP + CHART_H - ((val - scale.min) / scale.range) * CHART_H;
                    return (
                        <g key={`grid-${i}`}>
                            <line x1={PADDING_LEFT} y1={y} x2={WIDTH - PADDING_RIGHT} y2={y} stroke="#e2e8f0" strokeDasharray="4 4" />
                            <text x={PADDING_LEFT - 10} y={y + 4} textAnchor="end" className="text-xs fill-slate-500 font-mono font-bold">{val}</text>
                        </g>
                    );
                })}

                {/* Axes principaux */}
                <line x1={PADDING_LEFT} y1={PADDING_TOP} x2={PADDING_LEFT} y2={HEIGHT - PADDING_BOTTOM} stroke="#cbd5e1" strokeWidth="2" />
                <line x1={PADDING_LEFT} y1={HEIGHT - PADDING_BOTTOM} x2={WIDTH - PADDING_RIGHT} y2={HEIGHT - PADDING_BOTTOM} stroke="#cbd5e1" strokeWidth="2" />

                {/* Les Bâtons */}
                {values.map((val, i) => {
                    // Hauteur calculée précisément selon l'échelle
                    const barH = ((val - scale.min) / scale.range) * CHART_H;
                    const x = PADDING_LEFT + (i * spacing) + (spacing - barWidth) / 2;
                    const y = HEIGHT - PADDING_BOTTOM - barH;

                    const isTarget = highlight && (String(val) === String(correct) || labels[i] === correct);
                    const color = isTarget ? "#10b981" : COLORS[i % COLORS.length];

                    return (
                        <g key={i}>
                            <rect
                                x={x} y={y}
                                width={barWidth} height={barH}
                                fill={color}
                                rx="2"
                                className="transition-all duration-500 hover:opacity-80"
                            />
                            {/* Valeur sur la barre (Si demandé ou correction) */}
                            {(highlight || config.level === 1) && (
                                <text x={x + barWidth / 2} y={y - 5} textAnchor="middle" className="font-bold fill-slate-600 text-sm">
                                    {val}
                                </text>
                            )}
                            {/* Label Axe X (Jours, Sports...) */}
                            <text
                                x={x + barWidth / 2}
                                y={HEIGHT - PADDING_BOTTOM + 20}
                                textAnchor="middle"
                                className="text-xs font-bold fill-slate-600"
                                style={{ fontSize: labels.length > 5 ? '10px' : '11px' }} // Ajuste la taille si beaucoup de texte
                            >
                                {labels[i]}
                            </text>
                        </g>
                    );
                })}

                {/* Titre de l'axe Y */}
                <text x={PADDING_LEFT} y={30} className="text-xs fill-slate-400 italic">Effectif</text>
            </g>
        );
    };

    // --- 2. RENDER : DIAGRAMME CIRCULAIRE (PIE) ---
    const renderPieChart = () => {
        const { labels, values, displayValues, correct } = config;
        const total = values.reduce((a, b) => a + b, 0);

        let cumulativeAngle = 0;
        const radius = 130;
        const cx = WIDTH / 2 - 80;
        const cy = HEIGHT / 2;

        return (
            <g>
                {values.map((val, i) => {
                    const angle = (val / total) * 360;
                    const startAngle = cumulativeAngle;
                    const endAngle = cumulativeAngle + angle;
                    const midAngle = startAngle + (angle / 2);

                    const path = describeArc(cx, cy, radius, startAngle, endAngle);
                    const textPos = polarToCartesian(cx, cy, radius * 0.7, midAngle);

                    cumulativeAngle += angle;

                    const isTarget = highlight && (String(val) === String(correct) || labels[i] === correct);
                    const color = COLORS[i % COLORS.length];

                    return (
                        <g key={i}>
                            <path
                                d={path}
                                fill={color}
                                stroke="white"
                                strokeWidth="3"
                                className="transition-all duration-300 hover:scale-105 origin-center"
                                style={{ opacity: (highlight && !isTarget) ? 0.3 : 1 }}
                            />
                            {displayValues && (
                                <text x={textPos.x} y={textPos.y} textAnchor="middle" dominantBaseline="middle" fill="white" className="font-black text-sm drop-shadow-md">
                                    {displayValues[i]}
                                </text>
                            )}
                        </g>
                    );
                })}
                {/* Légende */}
                <g transform={`translate(${WIDTH - 180}, ${HEIGHT / 2 - (values.length * 15)})`}>
                    {labels.map((label, i) => (
                        <g key={i} transform={`translate(0, ${i * 30})`}>
                            <rect width="15" height="15" rx="4" fill={COLORS[i % COLORS.length]} />
                            <text x="25" y="12" className="text-sm fill-slate-600 font-bold">{label}</text>
                        </g>
                    ))}
                </g>
            </g>
        );
    };

    // --- 3. RENDER : GRAPHIQUE COURBE (LINE) ---
    const renderLineChart = () => {
        const { labels, values, correct } = config;

        // Échelle précise basée sur min/max
        const scale = calculateScale(Math.min(...values), Math.max(...values));

        const stepX = CHART_W / (labels.length - 1);

        // Fonction pour calculer Y précisément
        const getY = (val) => PADDING_TOP + CHART_H - ((val - scale.min) / scale.range) * CHART_H;

        const pointsStr = values.map((val, i) => {
            const x = PADDING_LEFT + (i * stepX);
            const y = getY(val);
            return `${x},${y}`;
        }).join(" ");

        return (
            <g>
                {/* Grille Y précise */}
                {scale.ticks.map((val, i) => {
                    const y = getY(val);
                    return (
                        <g key={`grid-${i}`}>
                            <line x1={PADDING_LEFT} y1={y} x2={WIDTH - PADDING_RIGHT} y2={y} stroke="#e2e8f0" strokeDasharray="4 4" />
                            <text x={PADDING_LEFT - 10} y={y + 4} textAnchor="end" className="text-xs fill-slate-500 font-mono font-bold">{val}°</text>
                        </g>
                    );
                })}

                {/* Axes */}
                <line x1={PADDING_LEFT} y1={PADDING_TOP} x2={PADDING_LEFT} y2={HEIGHT - PADDING_BOTTOM} stroke="#94a3b8" strokeWidth="2" />
                <line x1={PADDING_LEFT} y1={HEIGHT - PADDING_BOTTOM} x2={WIDTH - PADDING_RIGHT} y2={HEIGHT - PADDING_BOTTOM} stroke="#94a3b8" strokeWidth="2" />

                {/* Courbe */}
                <polyline
                    points={pointsStr}
                    fill="none"
                    stroke="#6366f1"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="drop-shadow-sm"
                />

                {/* Points */}
                {values.map((val, i) => {
                    const x = PADDING_LEFT + (i * stepX);
                    const y = getY(val);
                    const isTarget = highlight && val === correct;

                    return (
                        <g key={i}>
                            <circle
                                cx={x} cy={y}
                                r={isTarget ? 6 : 4}
                                fill={isTarget ? "#ef4444" : "white"}
                                stroke="#6366f1"
                                strokeWidth="2"
                            />
                            {/* Label Axe X (Jours) - On affiche les 3 premières lettres pour éviter chevauchement si besoin */}
                            <text x={x} y={HEIGHT - PADDING_BOTTOM + 20} textAnchor="middle" className="text-xs font-bold fill-slate-600">
                                {labels[i].length > 4 ? labels[i].substring(0, 3) + '.' : labels[i]}
                            </text>

                            {(highlight && isTarget) && (
                                <text x={x} y={y - 15} textAnchor="middle" className="font-bold fill-red-600 text-sm bg-white/80 px-1 rounded">
                                    {val}°
                                </text>
                            )}
                        </g>
                    );
                })}
            </g>
        );
    };

    // --- SÉLECTION DU MOTEUR ---
    const renderContent = () => {
        if (!config) return null;
        switch (config.type) {
            case 'BAR': return renderBarChart();
            case 'PIE': return renderPieChart();
            case 'LINE': return renderLineChart();
            default: return <text>Type de graphique inconnu</text>;
        }
    };

    return (
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} width="100%" height="100%" className="bg-white rounded-xl select-none">
            {/* Titre intégré au SVG */}
            {config?.title && (
                <text x={WIDTH / 2} y={30} textAnchor="middle" className="text-lg font-black fill-slate-700 uppercase tracking-wide">
                    {config.title}
                </text>
            )}
            {renderContent()}
        </svg>
    );
};

export default DataReadingSystem;