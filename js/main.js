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

        this.state = { bluetoothConnected: false, userData: null };
        this.isRealMode = false;
        
        this.tempHour = 12;
        this.tempMin = 0;
        
        // 🛑 SEU EMAIL DE DEV AQUI
        this.DEV_EMAIL = "danieloliveirasilva@seuemail.com"; 

        this.init();
    }

    init() {
        this.physics.setDemoMode(true); 
        this.loadTheme();

        const ctx = document.getElementById('realtimeChart');
        if (ctx) this.chart.init(ctx);
        
        setInterval(() => this.loadTheme(), 60000); 

        if (this.ui.showForecastLoading) this.ui.showForecastLoading();
        this.loadWeather();

        this.authService.onUserChange((user) => {
            if (user) {
                this.ui.toggleAuthScreen(false);
                this.ui.updateConnectionStatus(true);
                this.loadUserData(user.uid);
                
                const isDev = user.email === this.DEV_EMAIL;
                const menuLogs = document.querySelector('.menu-item[data-target="view-logs"]');
                const cardHist = document.getElementById('card-historico');
                
                if (menuLogs) menuLogs.style.display = isDev ? 'flex' : 'none';
                if (cardHist) cardHist.style.display = isDev ? 'block' : 'none';
                if (isDev) this.loadLogs(user.uid);
            } else {
                this.ui.toggleAuthScreen(true);
                this.physics.stopSimulation();
            }
        });

        this.setupEventListeners();
    }

    loadTheme() {
        const auto = localStorage.getItem('autoTheme') === 'true';
        const dark = localStorage.getItem('theme') === 'dark'; 
        
        const autoToggle = document.getElementById('toggle-auto-theme');
        const darkToggle = document.getElementById('toggle-dark-mode');

        if (auto) {
            if (autoToggle) autoToggle.classList.add('active');
            const hour = new Date().getHours();
            const isNight = hour < 6 || hour >= 18;
            this.applyTheme(isNight);
            if (darkToggle) darkToggle.classList.toggle('active', isNight);
        } else {
            if (autoToggle) autoToggle.classList.remove('active');
            this.applyTheme(dark);
            if (darkToggle) darkToggle.classList.toggle('active', dark);
        }
    }

    applyTheme(isDark) {
        if (isDark) {
            document.body.classList.add('dark-mode');
            document.body.classList.remove('light-mode');
        } else {
            document.body.classList.add('light-mode');
            document.body.classList.remove('dark-mode');
        }
    }

    loadUserData(userId) {
        this.dbService.listenToUserData(userId, (data) => {
            this.state.userData = data;
            if (data.system) {
                this.ui.renderDashboard(data.system, this.state.bluetoothConnected);
                if (this.state.bluetoothConnected) this.chart.updateChart(data.system.battery, data.system.water);
                
                this.physics.startSimulation(data.system.isOn, data.system.speed, data.system, (newState) => {
                    const tempSystem = { ...data.system, ...newState };
                    this.ui.renderDashboard(tempSystem, this.state.bluetoothConnected);
                    if (this.state.bluetoothConnected) this.chart.updateChart(newState.battery, newState.water);
                    if (Math.floor(Date.now() / 1000) % 2 === 0) this.dbService.updateSystemData(userId, newState);
                });
            }
            this.ui.updateProfile(data);
            if (data.schedules) {
                this.ui.renderSchedule(data.schedules, (id) => this.dbService.removeSchedule(userId, id), (id, state) => this.dbService.toggleScheduleActive(userId, id, state));
            } else { this.ui.renderSchedule(null); }
        });
    }

    loadLogs(userId) { this.logService.listenToLogs(userId, (logs) => this.ui.renderLogs(logs)); }
    async loadWeather() { try { const dailyData = await this.weatherService.getLocalWeather(); this.ui.renderForecast(dailyData); } catch(e){} }
    
    updateBluetoothUI() {
        const dot = document.getElementById('bt-indicator'); const text = document.getElementById('bt-status');
        if (this.state.bluetoothConnected) { dot.classList.add('connected'); text.innerText = "Conectado"; text.style.color = "#00e05e"; } 
        else { dot.classList.remove('connected'); text.innerText = "Desconectado"; text.style.color = "#6b6b7a"; }
    }

    updateTimeDisplay() {
        const h = document.getElementById('display-hour');
        const m = document.getElementById('display-min');
        if(h) h.innerText = String(this.tempHour).padStart(2, '0');
        if(m) m.innerText = String(this.tempMin).padStart(2, '0');
    }
    
    addFakeDevice(name, icon, isHydrogen = false) {
        const li = document.createElement('li');
        li.className = `device-item ${isHydrogen ? 'hydrogen' : ''}`;
        li.innerHTML = `<i class="fa-solid ${icon}"></i> <strong>${name}</strong>`;
        
        li.addEventListener('click', async () => {
            if (isHydrogen) {
                if (this.isRealMode) {
                    try {
                        const device = await navigator.bluetooth.requestDevice({ acceptAllDevices: true });
                        this.state.bluetoothConnected = true; 
                        this.updateBluetoothUI();
                        document.getElementById('modal-bluetooth').classList.remove('active');
                        const user = this.authService.getCurrentUser();
                        if(user && user.email === this.DEV_EMAIL) this.logService.addLog(user.uid, `Hardware: ${device.name}`, "success");
                        if(this.state.userData) this.ui.renderDashboard(this.state.userData.system, true);
                    } catch (error) { alert("Conexão falhou ou foi cancelada."); }
                } else {
                    this.state.bluetoothConnected = true; 
                    this.updateBluetoothUI();
                    document.getElementById('modal-bluetooth').classList.remove('active');
                    if(this.state.userData) this.ui.renderDashboard(this.state.userData.system, true);
                }
            } else {
                alert(`O dispositivo ${name} recusou o pareamento. Selecione o dispositivo da estação.`);
            }
        });
        document.getElementById('bt-device-list').appendChild(li);
    }

    setupEventListeners() {
        document.getElementById('toggle-auto-theme')?.addEventListener('click', () => {
            const current = localStorage.getItem('autoTheme') === 'true';
            localStorage.setItem('autoTheme', !current);
            this.loadTheme();
        });

        document.getElementById('toggle-dark-mode')?.addEventListener('click', () => {
            if (localStorage.getItem('autoTheme') === 'true') return alert("Desative o Tema Automático primeiro.");
            const isDark = document.body.classList.contains('dark-mode');
            localStorage.setItem('theme', isDark ? 'light' : 'dark');
            this.loadTheme();
        });

        const btnBt = document.getElementById('btn-bluetooth');
        const btModal = document.getElementById('modal-bluetooth');
        const btList = document.getElementById('bt-device-list');
        const radarText = document.getElementById('radar-text');
        let pressTimer;
        
        const startPress = () => {
            pressTimer = setTimeout(() => {
                this.isRealMode = !this.isRealMode;
                this.physics.setDemoMode(!this.isRealMode);
                
                if (this.state.bluetoothConnected) {
                    this.state.bluetoothConnected = false;
                    this.updateBluetoothUI();
                    const user = this.authService.getCurrentUser();
                    if(user && this.state.userData?.system?.isOn) this.dbService.updateSystemData(user.uid, { isOn: false });
                    if(this.state.userData) this.ui.renderDashboard(this.state.userData.system, false);
                }
                
                document.body.classList.toggle('real-mode', this.isRealMode);
                const btnReset = document.getElementById('btn-reset-metrics');
                if(btnReset) btnReset.style.display = this.isRealMode ? 'none' : 'flex';
                
                alert(this.isRealMode ? "⚠️ MODO REAL (Física Ativada)" : "🧪 MODO DEMO (Acelerado 120x)");
            }, 1500);
        };

        btnBt?.addEventListener('mousedown', startPress);
        btnBt?.addEventListener('mouseup', () => clearTimeout(pressTimer));
        btnBt?.addEventListener('click', () => {
            if (!this.state.bluetoothConnected) {
                btModal.classList.add('active');
                btList.innerHTML = ''; 
                
                if (this.isRealMode) {
                    if (radarText) radarText.innerText = "Buscando Hardware BLE...";
                    this.addFakeDevice('Mark II', 'fa-microchip', true);
                } else {
                    if (radarText) radarText.innerText = "Procurando dispositivos próximos...";
                    setTimeout(() => this.addFakeDevice('Xiaomi 14', 'fa-mobile-screen', false), 400);
                    setTimeout(() => this.addFakeDevice('Galaxy S24', 'fa-mobile-screen', false), 900);
                    setTimeout(() => this.addFakeDevice('Mark II', 'fa-droplet', true), 1600);
                }
            } else { 
                this.state.bluetoothConnected = false; 
                this.updateBluetoothUI();
                if(this.state.userData) this.ui.renderDashboard(this.state.userData.system, false);
            }
        });

        document.getElementById('btn-power')?.addEventListener('click', () => {
            if (!this.state.bluetoothConnected) return alert("Conecte o Bluetooth primeiro!");
            const user = this.authService.getCurrentUser();
            if (user && this.state.userData) this.dbService.updateSystemData(user.uid, { isOn: !this.state.userData.system.isOn });
        });

        document.querySelectorAll('.s-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (!this.state.bluetoothConnected) return alert("Conecte o Bluetooth primeiro!");
                const user = this.authService.getCurrentUser();
                if (user) this.dbService.updateSystemData(user.uid, { speed: parseInt(btn.getAttribute('data-speed')) });
            });
        });

        document.getElementById('btn-reset-metrics')?.addEventListener('click', () => {
            if (this.isRealMode) return; 
            if (!this.state.bluetoothConnected) return alert("Conecte o Bluetooth primeiro!");
            const user = this.authService.getCurrentUser();
            if (user) { this.ui.animateResetButton(); this.dbService.updateSystemData(user.uid, { battery: 100, water: 0, speed: 1, isOn: false }); }
        });

        document.getElementById('close-bt-modal')?.addEventListener('click', () => btModal.classList.remove('active'));

        const schedModal = document.getElementById('modal-new-schedule');
        const modeSwitch = document.getElementById('new-task-mode');
        
        document.getElementById('btn-add-schedule')?.addEventListener('click', () => { 
            schedModal.classList.add('active'); 
            this.tempHour = 12; 
            this.tempMin = 0; 
            this.updateTimeDisplay(); 
        });
        
        document.getElementById('close-schedule-modal')?.addEventListener('click', () => schedModal.classList.remove('active'));
        
        modeSwitch?.addEventListener('click', () => modeSwitch.classList.toggle('active'));
        
        document.getElementById('hour-up')?.addEventListener('click', () => { this.tempHour = (this.tempHour + 1) % 24; this.updateTimeDisplay(); });
        document.getElementById('hour-down')?.addEventListener('click', () => { this.tempHour = (this.tempHour - 1 + 24) % 24; this.updateTimeDisplay(); });
        document.getElementById('min-up')?.addEventListener('click', () => { this.tempMin = (this.tempMin + 5) % 60; this.updateTimeDisplay(); });
        document.getElementById('min-down')?.addEventListener('click', () => { this.tempMin = (this.tempMin - 5 + 60) % 60; this.updateTimeDisplay(); });
        
        document.getElementById('btn-save-schedule')?.addEventListener('click', () => { 
            const user = this.authService.getCurrentUser(); 
            if(!user) return; 
            const timeStr = `${String(this.tempHour).padStart(2, '0')}:${String(this.tempMin).padStart(2, '0')}`; 
            const isTurbo = modeSwitch.classList.contains('active'); 
            this.dbService.addSchedule(user.uid, timeStr, isTurbo ? 'Turbo' : 'Econômico').then(() => { schedModal.classList.remove('active'); }); 
        });

        document.getElementById('btn-save-profile')?.addEventListener('click', () => {
            const user = this.authService.getCurrentUser();
            if (!user) return;
            const name = document.getElementById('edit-name').value;
            const photo = document.getElementById('edit-photo').value;
            this.dbService.updateUserProfile(user.uid, { name, photo }).then(() => alert("Perfil Salvo!"));
        });

        document.querySelectorAll('.menu-item').forEach(item => {
            item.addEventListener('click', () => {
                const target = item.getAttribute('data-target');
                document.querySelectorAll('.menu-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                document.querySelectorAll('.view-section').forEach(v => v.classList.remove('active'));
                document.getElementById(target).classList.add('active');
            });
        });

        // --- LÓGICA DE TROCA DE TELAS (AQUI ESTAVA O PROBLEMA!) ---
        document.getElementById('link-register')?.addEventListener('click', (e) => { 
            e.preventDefault(); 
            document.getElementById('login-form').classList.remove('active'); 
            document.getElementById('register-form').classList.add('active'); 
        });
        
        document.getElementById('link-login')?.addEventListener('click', (e) => { 
            e.preventDefault(); 
            document.getElementById('register-form').classList.remove('active'); 
            document.getElementById('login-form').classList.add('active'); 
        });
        // ----------------------------------------------------------

        document.getElementById('login-form')?.addEventListener('submit', (e) => { e.preventDefault(); this.authService.login(document.getElementById('login-email').value, document.getElementById('login-pass').value).catch(err => alert(err.message)); });
        document.getElementById('register-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('reg-email').value; const pass = document.getElementById('reg-pass').value;
            const confirmPass = document.getElementById('reg-confirm-pass').value; const name = document.getElementById('reg-name').value;
            if (pass !== confirmPass) return alert("Senhas não coincidem!");
            this.authService.register(email, pass).then(cred => this.dbService.createUserProfile(cred.user.uid, name, email)).catch(err => alert(err.message));
        });
        document.getElementById('btn-logout')?.addEventListener('click', () => this.authService.logout());
    }
}
new App();