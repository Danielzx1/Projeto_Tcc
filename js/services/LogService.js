import { getDatabase, ref, push, query, limitToLast, onValue } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { app } from "../config/firebaseConfig.js";

export class LogService {
    constructor() {
        this.db = getDatabase(app);
    }

    addLog(userId, message, type = 'info') {
        const logsRef = ref(this.db, `users/${userId}/logs`);
        const timestamp = new Date().toLocaleTimeString('pt-BR');
        push(logsRef, {
            message: message,
            time: timestamp,
            type: type,
            fullDate: Date.now() // para ordenar
        });
    }

    listenToLogs(userId, callback) {
        const logsRef = query(ref(this.db, `users/${userId}/logs`), limitToLast(20)); // Pega os últimos 20
        onValue(logsRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                // Converte objeto em array e inverte (mais recente primeiro)
                const logsArray = Object.values(data).sort((a, b) => b.fullDate - a.fullDate);
                callback(logsArray);
            } else {
                callback([]);
            }
        });
    }
}