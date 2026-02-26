import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { app } from "../config/firebaseConfig.js";

export class AuthService {
    constructor() {
        this.auth = getAuth(app);
    }

    onUserChange(callback) {
        onAuthStateChanged(this.auth, callback);
    }

    login(email, password) {
        return signInWithEmailAndPassword(this.auth, email, password);
    }

    register(email, password) {
        return createUserWithEmailAndPassword(this.auth, email, password);
    }

    logout() {
        return signOut(this.auth);
    }

    getCurrentUser() {
        return this.auth.currentUser;
    }
}