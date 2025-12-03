// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Ta configuration d'origine
const firebaseConfig = {
    apiKey: "AIzaSyC55YT-HI8iv6wBP46CTnvsRGKFYePgns8",
    authDomain: "maths---signoret---belfort.firebaseapp.com",
    projectId: "maths---signoret---belfort",
    storageBucket: "maths---signoret---belfort.firebasestorage.app",
    messagingSenderId: "61597100148",
    appId: "1:61597100148:web:52646c2fc12c1deb7e4921"
};

// Initialisation
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);