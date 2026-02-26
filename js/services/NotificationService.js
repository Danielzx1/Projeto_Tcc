export class NotificationService {
    constructor() {
        this.permission = false;
        this.lastNotificationTime = 0;
    }

    async requestPermission() {
        if (!("Notification" in window)) return;
        const result = await Notification.requestPermission();
        this.permission = (result === "granted");
    }

    notify(title, body) {
        if (!this.permission) return;

        // Evita spam (só notifica a cada 10 segundos no máximo)
        const now = Date.now();
        if (now - this.lastNotificationTime < 10000) return;

        new Notification(title, {
            body: body,
            icon: 'https://cdn-icons-png.flaticon.com/512/427/427112.png' // Ícone genérico de alerta
        });

        this.lastNotificationTime = now;
    }
}