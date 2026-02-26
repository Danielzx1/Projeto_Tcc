import { getDatabase, ref, set, update, onValue, push } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { app } from "../config/firebaseConfig.js";

export class DatabaseService {
    constructor() {
        this.db = getDatabase(app);
    }

    createUserProfile(userId, name, email) {
        return set(ref(this.db, 'users/' + userId), {
            name: name, email: email,
            system: { isOn: false, speed: 1, battery: 100, water: 0 },
            schedules: null
        });
    }

    updateSystemData(userId, data) {
        return update(ref(this.db, 'users/' + userId + '/system'), data);
    }
    
    updateUserProfile(userId, data) {
        return update(ref(this.db, 'users/' + userId), data);
    }

    updateSchedule(userId, data) {
        return update(ref(this.db, 'users/' + userId + '/schedule'), data);
    }

    addSchedule(userId, time, mode) {
        const newRef = push(ref(this.db, `users/${userId}/schedules`));
        return set(newRef, { time: time, mode: mode, active: true });
    }

    removeSchedule(userId, scheduleId) {
        return set(ref(this.db, `users/${userId}/schedules/${scheduleId}`), null);
    }

    toggleScheduleActive(userId, scheduleId, newState) {
        return update(ref(this.db, `users/${userId}/schedules/${scheduleId}`), { active: newState });
    }

    listenToUserData(userId, callback) {
        const userRef = ref(this.db, 'users/' + userId);
        onValue(userRef, (snapshot) => {
            const data = snapshot.val();
            if (data) callback(data);
        });
    }
}