// src/utils/brevetData.js

// 1. On importe les sujets individuels depuis le dossier 'sujets'
import { SUJET_2026_0A } from './sujetsDNB/dnb_2026_sujet0A.js';

// 2. On exporte la liste complète qui sera utilisée par l'application
export const BREVET_DATA = [
    SUJET_2026_0A,
    // Plus tard, tu ajouteras ici : SUJET_2025_METROPOLE, etc.
];