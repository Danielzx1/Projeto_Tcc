// js/config/firebaseConfig.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

const firebaseConfig = {
    apiKey: "AIzaSyBzUUPtwq5G79A1JA-uveg7Z_CTwTKgk34",
    authDomain: "hydrogen-a780b.firebaseapp.com",
    projectId: "hydrogen-a780b",
    storageBucket: "hydrogen-a780b.firebasestorage.app",
    messagingSenderId: "672217055272",
    appId: "1:672217055272:web:315e777003136f75da351d",
    measurementId: "G-GNYBV5T5ZC"
};

export const app = initializeApp(firebaseConfig);