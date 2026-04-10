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
        
        this.tempHour = 12;
        this.tempMin = 0;
        this.isRealMode = false;

        // 🛑 MODO DESENVOLVEDOR: Coloque o seu email de login aqui!
        this.DEV_EMAIL = "daniel-oli55@hotmail.com"; 

        this.init();
    }

    init() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('./sw.js').catch(e => console.log('Erro PWA', e));
        }

        const ctx = document.getElementById('realtimeChart');
        if (ctx) this.chart.init(ctx);
        this.notifyService.requestPermission();
        this.loadTheme();

        if (this.ui.showForecastLoading) {
            this.ui.showForecastLoading();
        }
        this.loadWeather();

this.authService.onUserChange((user) => {
            if (user) {
                this.ui.toggleAuthScreen(false);
                this.ui.updateConnectionStatus(true);
                this.loadUserData(user.uid);
                
                // 🕵️ LÓGICA DE LOGS RESTRITA PARA DEV
                const logsMenuBtn = document.querySelector('.menu-item[data-target="view-logs"]');
                const cardHistorico = document.getElementById('card-historico'); // Pega a caixa inteira do histórico

                if (user.email === this.DEV_EMAIL) {
                    // É o Daniel (Dev)! Mostra o menu, mostra a caixa e carrega os dados.
                    if (logsMenuBtn) logsMenuBtn.style.display = ''; 
                    if (cardHistorico) cardHistorico.style.display = ''; 
                    this.loadLogs(user.uid);
                } else {
                    // Usuário comum (ex: Selma)! Esconde tudo relacionado a logs/histórico.
                    if (logsMenuBtn) logsMenuBtn.style.display = 'none';
                    if (cardHistorico) cardHistorico.style.display = 'none';
                }

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
        if (savedTheme === 'light') { document.body.classList.add('light-mode'); if(toggleBtn) toggleBtn.classList.remove('active'); } 
        else { if(toggleBtn) toggleBtn.classList.add('active'); }
    }

    toggleTheme() {
        document.body.classList.toggle('light-mode');
        const isLight = document.body.classList.contains('light-mode');
        localStorage.setItem('theme', isLight ? 'light' : 'dark');
        const toggleBtn = document.getElementById('btn-theme-toggle');
        if(isLight) toggleBtn.classList.remove('active'); else toggleBtn.classList.add('active');
    }

    loadLogs(userId) {
        this.logService.listenToLogs(userId, (logs) => this.ui.renderLogs(logs));
    }

    loadUserData(userId) {
        this.dbService.listenToUserData(userId, (data) => {
            this.state.userData = data;
            
            if (data.system) {
                this.ui.renderDashboard(data.system, this.state.bluetoothConnected);
                if (this.state.bluetoothConnected) this.chart.updateChart(data.system.battery, data.system.water);

                if (data.system.battery < 20 && data.system.isOn) this.notifyService.notify("Bateria Crítica!", "Nível < 20%.");
                
                this.physics.startSimulation(data.system.isOn, data.system.speed, data.system, (newState) => {
                    const tempSystem = { ...data.system, ...newState };
                    
                    this.ui.renderDashboard(tempSystem, this.state.bluetoothConnected);
                    if (this.state.bluetoothConnected) this.chart.updateChart(newState.battery, newState.water);

                    if (Math.floor(Date.now() / 1000) % 2 === 0) this.dbService.updateSystemData(userId, newState);
                });
            }
            this.ui.updateProfile(data);

            if (data.schedules) {
                this.ui.renderSchedule(data.schedules, 
                    (id) => this.dbService.removeSchedule(userId, id),
                    (id, state) => this.dbService.toggleScheduleActive(userId, id, state)
                );
            } else { this.ui.renderSchedule(null); }
        });
    }

    async loadWeather() {
        try { 
            const dailyData = await this.weatherService.getLocalWeather(); 
            this.ui.renderForecast(dailyData); 
        } catch(e){ console.error(e); }
    }

    updateTimeDisplay() {
        document.getElementById('display-hour').innerText = String(this.tempHour).padStart(2, '0');
        document.getElementById('display-min').innerText = String(this.tempMin).padStart(2, '0');
    }

    updateBluetoothUI() {
        const dot = document.getElementById('bt-indicator');
        const text = document.getElementById('bt-status');
        if (this.state.bluetoothConnected) {
            dot.classList.add('connected'); text.innerText = "Conectado"; text.style.color = "#00e05e";
        } else {
            dot.classList.remove('connected'); text.innerText = "Desconectado"; text.style.color = "#6b6b7a";
        }
    }

    addFakeDevice(name, icon, isHydrogen = false) {
        const li = document.createElement('li');
        li.className = `device-item ${isHydrogen ? 'hydrogen' : ''}`;
        li.innerHTML = `<i class="fa-solid ${icon}"></i> <strong>${name}</strong>`;
        
        li.addEventListener('click', async () => {
            if (isHydrogen) {
                if (this.isRealMode) {
                    try {
                        const device = await navigator.bluetooth.requestDevice({
                            acceptAllDevices: true
                        });
                        console.log('Pareado físico:', device.name);
                        this.state.bluetoothConnected = true;
                        this.updateBluetoothUI();
                        document.getElementById('modal-bluetooth').classList.remove('active');
                        
                        const user = this.authService.getCurrentUser();
                        if(user) this.logService.addLog(user.uid, `Hardware Conectado: ${device.name}`, "success");
                        if(this.state.userData) this.ui.renderDashboard(this.state.userData.system, true);
                    } catch (error) {
                        console.error('Falha BT Real:', error);
                        alert("Busca de hardware cancelada ou sem permissão.");
                    }
                } else {
                    this.state.bluetoothConnected = true;
                    this.updateBluetoothUI();
                    document.getElementById('modal-bluetooth').classList.remove('active');
                    
                    const user = this.authService.getCurrentUser();
                    if(user) this.logService.addLog(user.uid, "Conectado ao Hydrogen (Demo)", "success");
                    if(this.state.userData) this.ui.renderDashboard(this.state.userData.system, true);
                }
            } else {
                alert(`O dispositivo ${name} recusou o pareamento.`);
            }
        });
        document.getElementById('bt-device-list').appendChild(li);
    }

    setupEventListeners() {
        document.getElementById('login-form')?.addEventListener('submit', (e) => { e.preventDefault(); this.authService.login(document.getElementById('login-email').value, document.getElementById('login-pass').value).catch(err => alert(err.message)); });
        document.getElementById('register-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('reg-email').value; const pass = document.getElementById('reg-pass').value;
            const confirmPass = document.getElementById('reg-confirm-pass').value; const name = document.getElementById('reg-name').value;
            const lgpdCheck = document.getElementById('lgpd-check').checked;
            if (pass !== confirmPass) return alert("🛑 Senhas não coincidem!");
            if (!lgpdCheck) return alert("🛑 Aceite os Termos de Uso (LGPD).");
            this.authService.register(email, pass).then(cred => this.dbService.createUserProfile(cred.user.uid, name, email)).catch(err => alert(err.message));
        });
        document.getElementById('btn-logout')?.addEventListener('click', () => this.authService.logout());
        document.getElementById('link-register')?.addEventListener('click', () => { document.getElementById('login-form').classList.remove('active'); document.getElementById('register-form').classList.add('active'); });
        document.getElementById('link-login')?.addEventListener('click', () => { document.getElementById('register-form').classList.remove('active'); document.getElementById('login-form').classList.add('active'); });

        const modalLGPD = document.getElementById('lgpd-modal');
        document.getElementById('open-lgpd')?.addEventListener('click', () => modalLGPD.classList.add('active'));
        document.getElementById('close-lgpd')?.addEventListener('click', () => modalLGPD.classList.remove('active'));
        document.getElementById('btn-theme-toggle')?.addEventListener('click', () => this.toggleTheme());

        const btnBt = document.getElementById('btn-bluetooth');
        const btModal = document.getElementById('modal-bluetooth');
        const btList = document.getElementById('bt-device-list');
        const radarText = document.getElementById('radar-text');

        let pressTimer;
        let isLongPress = false;

        const startPress = () => {
            isLongPress = false; 
            pressTimer = setTimeout(() => {
                isLongPress = true; 
                this.isRealMode = !this.isRealMode; 

                // Zera conexão e painel na troca de modo
                if (this.state.bluetoothConnected) {
                    this.state.bluetoothConnected = false;
                    this.updateBluetoothUI();
                    const user = this.authService.getCurrentUser();
                    if(user && this.state.userData?.system?.isOn) {
                        this.dbService.updateSystemData(user.uid, { isOn: false });
                    }
                    if(this.state.userData) {
                        this.ui.renderDashboard(this.state.userData.system, false);
                    }
                }
                
                const user = this.authService.getCurrentUser();
                const btnReset = document.getElementById('btn-reset-metrics'); // Pega o botão de reset

                if (this.isRealMode) {
                    document.body.classList.add('real-mode');
                    
                    // 🪄 ESCONDE O BOTÃO DE RESET NO MODO FÍSICO
                    if (btnReset) btnReset.style.display = 'none'; 
                    
                    alert("⚠️ MODO REAL: Acesso a hardware habilitado!");
                    if (user && user.email === this.DEV_EMAIL) this.logService.addLog(user.uid, "Alterado para Modo Físico (Real)", "info");
                } else {
                    document.body.classList.remove('real-mode');
                    
                    // 🪄 MOSTRA O BOTÃO DE RESET NO MODO DEMO
                    if (btnReset) btnReset.style.display = ''; 
                    
                    alert("🧪 MODO DEMO: Simulação restaurada.");
                    if (user && user.email === this.DEV_EMAIL) this.logService.addLog(user.uid, "Alterado para Modo Simulação (Demo)", "info");
                }
            }, 1500); 
        };

        const cancelPress = () => { clearTimeout(pressTimer); }; 

        if (btnBt) {
            btnBt.addEventListener('mousedown', startPress);
            btnBt.addEventListener('touchstart', startPress);
            btnBt.addEventListener('mouseup', cancelPress);
            btnBt.addEventListener('mouseleave', cancelPress);
            btnBt.addEventListener('touchend', cancelPress);

            btnBt.addEventListener('click', () => {
                if (isLongPress) return; 

                if (this.state.bluetoothConnected) {
                    this.state.bluetoothConnected = false;
                    this.updateBluetoothUI();
                    const user = this.authService.getCurrentUser();
                    if(user && this.state.userData?.system?.isOn) {
                        this.dbService.updateSystemData(user.uid, { isOn: false });
                        if(user.email === this.DEV_EMAIL) this.logService.addLog(user.uid, "Sinal Bluetooth perdido", "alert");
                    }
                    if(this.state.userData) this.ui.renderDashboard(this.state.userData.system, false);
                } else {
                    btModal.classList.add('active');
                    btList.innerHTML = '';
                    
                    if (this.isRealMode) {
                        radarText.innerText = "Dispositivo pareado encontrado:";
                        this.addFakeDevice('Hydrogen (Hardware)', 'fa-droplet', true);
                    } else {
                        radarText.innerText = "Procurando dispositivos próximos...";
                        setTimeout(() => this.addFakeDevice('Xiaomi 14', 'fa-mobile-screen'), 1000);
                        setTimeout(() => this.addFakeDevice('Galaxy S24', 'fa-mobile-screen'), 2000);
                        setTimeout(() => {
                            radarText.innerText = "Dispositivos encontrados:";
                            this.addFakeDevice('Hydrogen', 'fa-droplet', true);
                        }, 3000);
                    }
                }
            });
        }
        document.getElementById('close-bt-modal')?.addEventListener('click', () => btModal.classList.remove('active'));

        document.getElementById('btn-power').addEventListener('click', () => {
            if (!this.state.bluetoothConnected) return alert("⚠️ Conecte o Bluetooth no painel primeiro!");
            const user = this.authService.getCurrentUser();
            if (user && this.state.userData) {
                const newState = !this.state.userData.system.isOn;
                this.dbService.updateSystemData(user.uid, { isOn: newState });
            }
        });

        document.querySelectorAll('.s-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (!this.state.bluetoothConnected) return alert("⚠️ Conecte o Bluetooth primeiro!");
                const user = this.authService.getCurrentUser();
                if (user) {
                    const speed = parseInt(btn.getAttribute('data-speed'));
                    this.dbService.updateSystemData(user.uid, { speed: speed });
                }
            });
        });

        document.getElementById('btn-reset-metrics')?.addEventListener('click', () => {
            // Dupla garantia: se estiver no modo real, ignora o clique (caso burle o CSS)
            if (this.isRealMode) return; 
            if (!this.state.bluetoothConnected) return alert("⚠️ Conecte o Bluetooth primeiro!");
            
            const user = this.authService.getCurrentUser();
            if (!user) return;
            this.ui.animateResetButton();
            this.dbService.updateSystemData(user.uid, { battery: 100, water: 0, speed: 1, isOn: false });
        });

        document.getElementById('btn-save-profile')?.addEventListener('click', () => {
            const user = this.authService.getCurrentUser();
            if (!user) return;
            const newName = document.getElementById('edit-name').value;
            const newPhoto = document.getElementById('edit-photo').value;
            this.dbService.updateUserProfile(user.uid, { name: newName, photo: newPhoto }).then(() => { alert("Salvo!"); });
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

        const schedModal = document.getElementById('modal-new-schedule');
        const modeSwitch = document.getElementById('new-task-mode');
        const ecoLabel = document.getElementById('mode-eco');
        const turboLabel = document.getElementById('mode-turbo');
        document.getElementById('btn-add-schedule')?.addEventListener('click', () => { schedModal.classList.add('active'); this.tempHour = 12; this.tempMin = 0; this.updateTimeDisplay(); modeSwitch.classList.remove('active'); ecoLabel.classList.add('active-text'); turboLabel.classList.remove('active-text'); });
        document.getElementById('close-schedule-modal')?.addEventListener('click', () => schedModal.classList.remove('active'));
        modeSwitch?.addEventListener('click', () => { modeSwitch.classList.toggle('active'); const isTurbo = modeSwitch.classList.contains('active'); if (isTurbo) { turboLabel.classList.add('active-text'); ecoLabel.classList.remove('active-text'); } else { ecoLabel.classList.add('active-text'); turboLabel.classList.remove('active-text'); } });
        document.getElementById('hour-up')?.addEventListener('click', () => { this.tempHour = (this.tempHour + 1) % 24; this.updateTimeDisplay(); });
        document.getElementById('hour-down')?.addEventListener('click', () => { this.tempHour = (this.tempHour - 1 + 24) % 24; this.updateTimeDisplay(); });
        document.getElementById('min-up')?.addEventListener('click', () => { this.tempMin = (this.tempMin + 5) % 60; this.updateTimeDisplay(); });
        document.getElementById('min-down')?.addEventListener('click', () => { this.tempMin = (this.tempMin - 5 + 60) % 60; this.updateTimeDisplay(); });
        document.getElementById('btn-save-schedule')?.addEventListener('click', () => { const user = this.authService.getCurrentUser(); if(!user) return; const timeStr = `${String(this.tempHour).padStart(2, '0')}:${String(this.tempMin).padStart(2, '0')}`; const isTurbo = modeSwitch.classList.contains('active'); this.dbService.addSchedule(user.uid, timeStr, isTurbo ? 'Turbo' : 'Econômico').then(() => { schedModal.classList.remove('active'); }); });
    }
}
const app = new App();