// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

// Ta configuration d'origine
const firebaseConfig = {
    apiKey: "AIzaSyC55YT-HI8iv6wBP46CTnvsRGKFYePgns8",
    authDomain: "maths---signoret---belfort.firebaseapp.com",
    projectId: "maths---signoret---belfort",
    messagingSenderId: "61597100148",
    appId: "1:61597100148:web:52646c2fc12c1deb7e4921",
    storageBucket: "maths---signoret---belfort.firebasestorage.app", // (Exemple, vérifie le tien)
};

// Initialisation
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);