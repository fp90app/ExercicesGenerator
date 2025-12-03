// src/hooks/useSound.js
import { useState, useCallback, useEffect } from 'react';

let globalAudioCtx = null;

const getAudioContext = () => {
    if (!globalAudioCtx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
            globalAudioCtx = new AudioContext();
        }
    }
    // Si le contexte est suspendu (sécurité navigateur), on le relance
    if (globalAudioCtx && globalAudioCtx.state === 'suspended') {
        globalAudioCtx.resume();
    }
    return globalAudioCtx;
};

export const useSound = () => {
    const [muted, setMuted] = useState(false);

    const playSound = (type, muted) => {
        if (muted) return;

        const ctx = getAudioContext();
        if (!ctx) return;

        // Fonction utilitaire pour jouer et nettoyer
        const playTone = (freq, type, startTime, duration, volStart, volEnd) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = type;
            osc.frequency.setValueAtTime(freq, startTime);

            gain.gain.setValueAtTime(volStart, startTime);
            // On utilise linearRamp pour éviter des erreurs de valeur négative
            gain.gain.linearRampToValueAtTime(volEnd, startTime + duration);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(startTime);
            osc.stop(startTime + duration);

            // NETTOYAGE CRUCIAL : On déconnecte tout une fois fini pour libérer la mémoire
            osc.onended = () => {
                osc.disconnect();
                gain.disconnect();
            };
        };

        const now = ctx.currentTime;

        if (type === 'CORRECT') {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(500, now);
            osc.frequency.exponentialRampToValueAtTime(1000, now + 0.1);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.3);
            osc.onended = () => { osc.disconnect(); gain.disconnect(); };

        } else if (type === 'WRONG') {
            playTone(150, 'sawtooth', now, 0.3, 0.2, 0.01);
        } else if (type === 'CLICK') {
            playTone(300, 'triangle', now, 0.05, 0.05, 0.001);
        } else if (type === 'WIN') {
            [400, 500, 600, 800].forEach((freq, i) => {
                const t = now + i * 0.1;
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.value = freq;
                gain.gain.setValueAtTime(0.1, t);
                gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(t);
                osc.stop(t + 0.3);
                osc.onended = () => { osc.disconnect(); gain.disconnect(); };
            });
        }
    };

    return { muted, setMuted, playSound };
};