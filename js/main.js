import { AuthService } from "./services/AuthService.js";
import { DatabaseService } from "./services/DatabaseService.js";
import { WeatherService } from "./services/WeatherService.js";
import { LogService } from "./services/LogService.js";
import { NotificationService } from "./services/NotificationService.js";
import { SystemPhysics } from "./models/SystemPhysics.js";
import { UIManager } from "./view/UIManager.js";
import { ChartManager } from "./view/ChartManager.js";

class App {
    constructor() {
        this.authService = new AuthService();
        this.dbService = new DatabaseService();
        this.weatherService = new WeatherService();
        this.logService = new LogService();
        this.notifyService = new NotificationService();
        this.physics = new SystemPhysics();
        this.ui = new UIManager();
        this.chart = new ChartManager();

        this.state = {
            bluetoothConnected: false,
            userData: null
        };
        
        // Variáveis do Modal de Agendamento
        this.tempHour = 12;
        this.tempMin = 0;

        this.init();
    }

    init() {
        const ctx = document.getElementById('realtimeChart');
        if (ctx) this.chart.init(ctx);
        this.notifyService.requestPermission();
        this.loadTheme();

        this.authService.onUserChange((user) => {
            if (user) {
                this.ui.toggleAuthScreen(false);
                this.ui.updateConnectionStatus(true);
                this.loadUserData(user.uid);
                this.loadLogs(user.uid);
                this.loadWeather();
            } else {
                this.ui.toggleAuthScreen(true);
                this.ui.updateConnectionStatus(false);
                this.physics.stopSimulation();
            }
        });

        this.setupEventListeners();
    }

    loadTheme() {
        const savedTheme = localStorage.getItem('theme');
        const toggleBtn = document.getElementById('btn-theme-toggle');
        if (savedTheme === 'light') {
            document.body.classList.add('light-mode');
            if(toggleBtn) toggleBtn.classList.remove('active');
        } else {
            if(toggleBtn) toggleBtn.classList.add('active');
        }
    }

    toggleTheme() {
        document.body.classList.toggle('light-mode');
        const isLight = document.body.classList.contains('light-mode');
        localStorage.setItem('theme', isLight ? 'light' : 'dark');
        const toggleBtn = document.getElementById('btn-theme-toggle');
        if(isLight) toggleBtn.classList.remove('active');
        else toggleBtn.classList.add('active');
    }

    loadLogs(userId) {
        this.logService.listenToLogs(userId, (logs) => this.ui.renderLogs(logs));
    }

    loadUserData(userId) {
        this.dbService.listenToUserData(userId, (data) => {
            this.state.userData = data;
            
            if (data.system) {
                this.ui.renderDashboard(data.system, this.state.bluetoothConnected);
                this.chart.updateChart(data.system.battery, data.system.water);
                if (data.system.battery < 20 && data.system.isOn) this.notifyService.notify("Bateria Crítica!", "Nível abaixo de 20%.");
                
                this.physics.startSimulation(data.system.isOn, data.system.speed, data.system, (newState) => {
                    const tempSystem = { ...data.system, ...newState };
                    this.ui.renderDashboard(tempSystem, this.state.bluetoothConnected);
                    this.chart.updateChart(newState.battery, newState.water);
                     if (Math.floor(Date.now() / 1000) % 2 === 0) {
                        this.dbService.updateSystemData(userId, newState);
                     }
                });
            }
            this.ui.updateProfile(data);

            if (data.schedules) {
                this.ui.renderSchedule(data.schedules, 
                    (id) => this.dbService.removeSchedule(userId, id),
                    (id, state) => this.dbService.toggleScheduleActive(userId, id, state)
                );
            } else {
                this.ui.renderSchedule(null);
            }
        });
    }

    async loadWeather() {
        try {
            const dailyData = await this.weatherService.getLocalWeather();
            this.ui.renderForecast(dailyData);
        } catch (e) { console.error(e); }
    }

    updateTimeDisplay() {
        document.getElementById('display-hour').innerText = String(this.tempHour).padStart(2, '0');
        document.getElementById('display-min').innerText = String(this.tempMin).padStart(2, '0');
    }

    setupEventListeners() {
        document.getElementById('login-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.authService.login(document.getElementById('login-email').value, document.getElementById('login-pass').value).catch(err => alert(err.message));
        });
        document.getElementById('register-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('reg-email').value;
            const pass = document.getElementById('reg-pass').value;
            const confirmPass = document.getElementById('reg-confirm-pass').value;
            const name = document.getElementById('reg-name').value;
            const lgpdCheck = document.getElementById('lgpd-check').checked;
            if (pass !== confirmPass) return alert("🛑 As senhas não coincidem!");
            if (!lgpdCheck) return alert("🛑 Você precisa aceitar os Termos de Uso (LGPD).");
            this.authService.register(email, pass)
            .then(cred => this.dbService.createUserProfile(cred.user.uid, name, email))
            .catch(err => alert(err.message));
        });
        document.getElementById('btn-logout')?.addEventListener('click', () => this.authService.logout());
        document.getElementById('link-register')?.addEventListener('click', () => { document.getElementById('login-form').classList.remove('active'); document.getElementById('register-form').classList.add('active'); });
        document.getElementById('link-login')?.addEventListener('click', () => { document.getElementById('register-form').classList.remove('active'); document.getElementById('login-form').classList.add('active'); });

        const modal = document.getElementById('lgpd-modal');
        document.getElementById('open-lgpd')?.addEventListener('click', () => modal.classList.add('active'));
        document.getElementById('close-lgpd')?.addEventListener('click', () => modal.classList.remove('active'));
        modal.addEventListener('click', (e) => { if(e.target === modal) modal.classList.remove('active'); });
        document.getElementById('btn-theme-toggle')?.addEventListener('click', () => this.toggleTheme());

        document.getElementById('btn-bluetooth').addEventListener('click', () => {
            this.state.bluetoothConnected = !this.state.bluetoothConnected;
            const dot = document.getElementById('bt-indicator');
            const text = document.getElementById('bt-status');
            if (this.state.bluetoothConnected) {
                dot.classList.add('connected'); text.innerText = "Conectado"; text.style.color = "#00e05e";
            } else {
                dot.classList.remove('connected'); text.innerText = "Desconectado"; text.style.color = "#6b6b7a";
                const user = this.authService.getCurrentUser();
                if(user && this.state.userData?.system?.isOn) {
                    this.dbService.updateSystemData(user.uid, { isOn: false });
                    this.logService.addLog(user.uid, "Desligamento por conexão", "alert");
                }
            }
            if(this.state.userData) this.ui.renderDashboard(this.state.userData.system, this.state.bluetoothConnected);
        });

        document.getElementById('btn-power').addEventListener('click', () => {
            if (!this.state.bluetoothConnected) return alert("Conecte o Bluetooth!");
            const user = this.authService.getCurrentUser();
            if (user && this.state.userData) {
                const newState = !this.state.userData.system.isOn;
                this.dbService.updateSystemData(user.uid, { isOn: newState });
                this.logService.addLog(user.uid, `Sistema ${newState ? 'LIGADO' : 'DESLIGADO'}`, newState ? 'success' : 'alert');
            }
        });
        document.querySelectorAll('.s-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const user = this.authService.getCurrentUser();
                if (user) {
                    const speed = parseInt(btn.getAttribute('data-speed'));
                    this.dbService.updateSystemData(user.uid, { speed: speed });
                    this.logService.addLog(user.uid, `Velocidade: ${speed}`);
                }
            });
        });
        document.getElementById('btn-reset-metrics')?.addEventListener('click', () => {
            const user = this.authService.getCurrentUser();
            if (!user) return;
            this.ui.animateResetButton();
            this.dbService.updateSystemData(user.uid, { battery: 100, water: 0, speed: 1, isOn: false });
            this.logService.addLog(user.uid, "Reset de métricas", "info");
        });
        document.getElementById('btn-save-profile')?.addEventListener('click', () => {
            const user = this.authService.getCurrentUser();
            if (!user) return;
            const newName = document.getElementById('edit-name').value;
            const newPhoto = document.getElementById('edit-photo').value;
            this.dbService.updateUserProfile(user.uid, { name: newName, photo: newPhoto }).then(() => { alert("Salvo!"); this.logService.addLog(user.uid, "Perfil atualizado"); });
        });
        document.querySelectorAll('.menu-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const target = item.getAttribute('data-target');
                document.querySelectorAll('.menu-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                document.querySelectorAll('.view-section').forEach(v => v.classList.remove('active'));
                document.getElementById(target).classList.add('active');
            });
        });

        // --- NOVA LÓGICA DE AGENDAMENTO (MODAL) ---
        const schedModal = document.getElementById('modal-new-schedule');
        const modeSwitch = document.getElementById('new-task-mode');
        const ecoLabel = document.getElementById('mode-eco');
        const turboLabel = document.getElementById('mode-turbo');

        document.getElementById('btn-add-schedule')?.addEventListener('click', () => {
            schedModal.classList.add('active');
            this.tempHour = 12; this.tempMin = 0; this.updateTimeDisplay();
            modeSwitch.classList.remove('active');
            ecoLabel.classList.add('active-text'); turboLabel.classList.remove('active-text');
        });
        document.getElementById('close-schedule-modal')?.addEventListener('click', () => schedModal.classList.remove('active'));
        modeSwitch?.addEventListener('click', () => {
            modeSwitch.classList.toggle('active');
            const isTurbo = modeSwitch.classList.contains('active');
            if (isTurbo) { turboLabel.classList.add('active-text'); ecoLabel.classList.remove('active-text'); } 
            else { ecoLabel.classList.add('active-text'); turboLabel.classList.remove('active-text'); }
        });
        document.getElementById('hour-up')?.addEventListener('click', () => { this.tempHour = (this.tempHour + 1) % 24; this.updateTimeDisplay(); });
        document.getElementById('hour-down')?.addEventListener('click', () => { this.tempHour = (this.tempHour - 1 + 24) % 24; this.updateTimeDisplay(); });
        document.getElementById('min-up')?.addEventListener('click', () => { this.tempMin = (this.tempMin + 5) % 60; this.updateTimeDisplay(); });
        document.getElementById('min-down')?.addEventListener('click', () => { this.tempMin = (this.tempMin - 5 + 60) % 60; this.updateTimeDisplay(); });
        document.getElementById('btn-save-schedule')?.addEventListener('click', () => {
            const user = this.authService.getCurrentUser();
            if(!user) return;
            const timeStr = `${String(this.tempHour).padStart(2, '0')}:${String(this.tempMin).padStart(2, '0')}`;
            const isTurbo = modeSwitch.classList.contains('active');
            this.dbService.addSchedule(user.uid, timeStr, isTurbo ? 'Turbo' : 'Econômico')
                .then(() => { schedModal.classList.remove('active'); this.logService.addLog(user.uid, `Nova automação criada: ${timeStr}`); });
        });
    }
}
const app = new App();