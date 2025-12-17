import React, { useMemo } from 'react';

const CartesianSystem = ({
    // --- PROPS LEGACY (Anciens exos) ---
    f,
    xMin = -5,
    xMax = 5,
    yMin = -5,
    yMax = 5,
    width = 400,
    height = 400,
    highlightPoints = [],
    showGrid = true,
    onClick = null,

    // --- PROPS CMS (Nouveaux exos) ---
    config,
    highlight = false // Mode correction (affiche les pointillés)
}) => {

    // 1. UNIFICATION DES DONNÉES
    // Si "config" existe (mode CMS), on l'utilise prioritairement. Sinon on garde les defaults.
    const effXMin = config?.min !== undefined ? parseFloat(config.min) : xMin;
    const effXMax = config?.max !== undefined ? parseFloat(config.max) : xMax;
    // Pour l'instant, les exos CMS sont carrés (min/max identiques en X et Y), mais on peut adapter
    const effYMin = config?.min !== undefined ? parseFloat(config.min) : yMin;
    const effYMax = config?.max !== undefined ? parseFloat(config.max) : yMax;
    const effGridSize = config?.gridSize || 1;

    // 2. FONCTIONS DE MAPPING (Math -> SVG)
    const mapX = (x) => ((x - effXMin) / (effXMax - effXMin)) * width;
    const mapY = (y) => height - ((y - effYMin) / (effYMax - effYMin)) * height;

    const invMapX = (px) => effXMin + (px / width) * (effXMax - effXMin);
    const invMapY = (py) => effYMin + ((height - py) / height) * (effYMax - effYMin);

    // 3. GESTION DU CLIC
    const handleSvgClick = (e) => {
        if (!onClick) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;
        const scaleX = width / rect.width;
        const scaleY = height / rect.height;
        onClick({ x: invMapX(clickX * scaleX), y: invMapY(clickY * scaleY) });
    };

    // 4. PRÉPARATION DES POINTS (Fusion Legacy + CMS)
    const pointsToRender = useMemo(() => {
        let pts = [];

        // A. Points Legacy (ex: Tableau de valeurs)
        if (highlightPoints.length > 0) {
            pts = highlightPoints.map(p => ({ ...p, type: 'legacy' }));
        }

        // B. Points CMS (ex: Exercice Coordonnées)
        if (config?.points) {
            const cmsPoints = config.points.map(p => ({
                x: parseFloat(p.x),
                y: parseFloat(p.y),
                label: p.label,
                color: p.color || 'indigo',
                type: 'cms',
                showCorrection: highlight // Le point affiche sa correction si le mode global est actif
            }));
            pts = [...pts, ...cmsPoints];
        }
        return pts;
    }, [highlightPoints, config, highlight]);

    // 5. GRILLE & AXES
    // On génère des ticks propres (entiers si possible)
    const ticksX = [];
    for (let i = Math.ceil(effXMin); i <= Math.floor(effXMax); i += effGridSize) ticksX.push(i);
    const ticksY = [];
    for (let i = Math.ceil(effYMin); i <= Math.floor(effYMax); i += effGridSize) ticksY.push(i);

    // Path de la fonction (Legacy)
    const pathData = useMemo(() => {
        if (!f) return "";
        let path = "";
        const step = (effXMax - effXMin) / (width / 2); // Résolution de 2px
        let penDown = false;
        for (let x = effXMin; x <= effXMax; x += step) {
            const y = f(x);
            if (y >= effYMin * 2 && y <= effYMax * 2) { // Sécurité hors-cadre large
                path += `${penDown ? 'L' : 'M'} ${mapX(x).toFixed(1)} ${mapY(y).toFixed(1)} `;
                penDown = true;
            } else {
                penDown = false;
            }
        }
        return path;
    }, [f, effXMin, effXMax, effYMin, effYMax, width, height]);

    const originX = mapX(0);
    const originY = mapY(0);

    return (
        <svg
            viewBox={`0 0 ${width} ${height}`}
            className={`w-full h-auto bg-white rounded-xl shadow-inner select-none border border-slate-200 ${onClick ? 'cursor-crosshair' : ''}`}
            onClick={handleSvgClick}
        >
            {/* --- GRILLE --- */}
            {showGrid && (
                <g className="stroke-slate-200" strokeWidth="1">
                    {ticksX.map(x => <line key={`gx-${x}`} x1={mapX(x)} y1={0} x2={mapX(x)} y2={height} vectorEffect="non-scaling-stroke" />)}
                    {ticksY.map(y => <line key={`gy-${y}`} x1={0} y1={mapY(y)} x2={width} y2={mapY(y)} vectorEffect="non-scaling-stroke" />)}
                </g>
            )}

            {/* --- AXES NOIRS --- */}
            <g className="stroke-slate-800" strokeWidth="2">
                {/* Axe X */}
                <line x1={0} y1={originY} x2={width} y2={originY} />
                {/* Axe Y */}
                <line x1={originX} y1={0} x2={originX} y2={height} />
            </g>

            {/* --- GRADUATIONS (Chiffres) --- */}
            <g className="text-[10px] fill-slate-500 font-mono pointer-events-none font-bold">
                {ticksX.map(x => Math.abs(x) > 0.001 && (
                    <text key={`tx-${x}`} x={mapX(x)} y={originY + 15} textAnchor="middle">{parseFloat(x.toFixed(2))}</text>
                ))}
                {ticksY.map(y => Math.abs(y) > 0.001 && (
                    <text key={`ty-${y}`} x={originX - 6} y={mapY(y) + 4} textAnchor="end">{parseFloat(y.toFixed(2))}</text>
                ))}
                <text x={originX - 6} y={originY + 15} className="fill-slate-700">0</text>
            </g>

            {/* --- COURBE DE FONCTION (Legacy) --- */}
            <path d={pathData} fill="none" stroke="#4f46e5" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="pointer-events-none" />

            {/* --- POINTS (Legacy & CMS) --- */}
            {pointsToRender.map((pt, i) => {
                const px = mapX(pt.x);
                const py = mapY(pt.y);
                const color = pt.showCorrection ? "#10b981" : (pt.color || "#ef4444");

                return (
                    <g key={i} className="pointer-events-none">
                        {/* 1. Pointillés de correction (Mode CMS) */}
                        {pt.showCorrection && (
                            <g stroke="#10b981" strokeWidth="2" strokeDasharray="4 4" opacity="0.8">
                                <line x1={px} y1={py} x2={px} y2={originY} />
                                <line x1={px} y1={py} x2={originX} y2={py} />
                                {/* Étiquettes sur les axes */}
                                <rect x={px - 14} y={originY + 20} width="28" height="18" rx="4" fill="#10b981" stroke="none" />
                                <text x={px} y={originY + 32} textAnchor="middle" fill="white" fontSize="10" fontWeight="bold" stroke="none">{pt.x}</text>

                                <rect x={originX - 34} y={py - 9} width="28" height="18" rx="4" fill="#10b981" stroke="none" />
                                <text x={originX - 6} y={py + 4} textAnchor="end" fill="white" fontSize="10" fontWeight="bold" stroke="none">{pt.y}</text>
                            </g>
                        )}

                        {/* 2. Le Point (Croix ou Rond) */}
                        {pt.shape === 'cross' || pt.type === 'cms' ? (
                            <g stroke={color} strokeWidth="3" strokeLinecap="round">
                                <line x1={px - 5} y1={py - 5} x2={px + 5} y2={py + 5} />
                                <line x1={px - 5} y1={py + 5} x2={px + 5} y2={py - 5} />
                            </g>
                        ) : (
                            <circle cx={px} cy={py} r="5" fill={color} stroke="white" strokeWidth="2" />
                        )}

                        {/* 3. Label (A, B...) */}
                        {pt.label && (
                            <g transform={`translate(${px + 10}, ${py - 10})`}>
                                <rect x="0" y="-14" width="20" height="20" rx="4" fill="white" stroke={color} strokeWidth="2" />
                                <text x="10" y="0" textAnchor="middle" fill={color} fontSize="12" fontWeight="black" stroke="none">
                                    {pt.label}
                                </text>
                            </g>
                        )}
                    </g>
                );
            })}
        </svg>
    );
};

export default CartesianSystem;