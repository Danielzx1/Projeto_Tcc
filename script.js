/* --- CONFIGURAÇÃO INICIAL --- */
const state = {
    isOn: false,
    isConnected: false,
    speed: 3,
    battery: 85,
    water: 35,
    interval: null
};

// --- AUTENTICAÇÃO E LOGIN ---
document.addEventListener('DOMContentLoaded', () => {
    // Verifica se já tem usuário salvo
    const session = localStorage.getItem('hydrogen_session');
    if (session) {
        document.getElementById('auth-overlay').classList.add('hidden');
        updateUserProfile(JSON.parse(session));
    }
    
    // Configura botões de troca de tela (Login <-> Registro)
    document.getElementById('link-register').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('login-form').classList.remove('active');
        document.getElementById('register-form').classList.add('active');
    });

    document.getElementById('link-login').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('register-form').classList.remove('active');
        document.getElementById('login-form').classList.add('active');
    });

    // Configura Logout
    document.getElementById('btn-logout').addEventListener('click', () => {
        localStorage.removeItem('hydrogen_session');
        location.reload();
    });

    // Popular dados fictícios nas abas
    renderStats();
    renderSchedule();
});

// LOGIN Lógica
document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-pass').value;

    const savedUser = localStorage.getItem('user_' + email);
    
    if (savedUser) {
        const user = JSON.parse(savedUser);
        if (user.pass === pass) {
            loginSuccess(user);
        } else {
            alert("Senha incorreta!");
        }
    } else {
        alert("Usuário não encontrado. Crie uma conta primeiro.");
    }
});

// REGISTRO Lógica
document.getElementById('register-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const pass = document.getElementById('reg-pass').value;

    const user = { name, email, pass };
    localStorage.setItem('user_' + email, JSON.stringify(user));
    
    alert("Conta criada! Faça login.");
    document.getElementById('link-login').click(); // Volta pro login automaticamente
});

function loginSuccess(user) {
    localStorage.setItem('hydrogen_session', JSON.stringify(user));
    updateUserProfile(user);
    document.getElementById('auth-overlay').classList.add('hidden');
}

function updateUserProfile(user) {
    document.getElementById('sidebar-username').innerText = user.name;
    document.getElementById('settings-email').innerText = user.email;
    const initials = user.name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
    document.querySelector('.avatar').innerText = initials;
}

// --- NAVEGAÇÃO SPA ---
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

// --- SISTEMA DASHBOARD ---
// Bluetooth
document.getElementById('btn-bluetooth').addEventListener('click', () => {
    state.isConnected = !state.isConnected;
    const dot = document.getElementById('bt-indicator');
    const text = document.getElementById('bt-status');
    const label = document.getElementById('connection-label');

    if(state.isConnected) {
        dot.classList.add('connected');
        text.innerText = "Conectado";
        text.style.color = "#00e05e";
        label.innerText = "Online";
        label.style.color = "#00e05e";
    } else {
        dot.classList.remove('connected');
        text.innerText = "Desconectado";
        text.style.color = "#6b6b7a";
        label.innerText = "Offline";
        label.style.color = "#6b6b7a";
        if(state.isOn) document.getElementById('btn-power').click(); // Desliga se perder conexão
    }
});

// Power
document.getElementById('btn-power').addEventListener('click', () => {
    if(!state.isConnected) return alert("Conecte o Bluetooth!");
    
    state.isOn = !state.isOn;
    const pCard = document.getElementById('card-power');
    const fCard = document.getElementById('card-fan');
    const fIcon = document.getElementById('fan-icon');
    const status = document.getElementById('sys-status-text');

    if(state.isOn) {
        pCard.classList.add('on');
        fCard.classList.remove('disabled');
        fIcon.classList.add('spinning');
        status.innerText = "SISTEMA ON";
        status.style.color = "#fff";
        startSim();
    } else {
        pCard.classList.remove('on');
        fCard.classList.add('disabled');
        fIcon.classList.remove('spinning');
        status.innerText = "SISTEMA OFF";
        status.style.color = "#6b6b7a";
        clearInterval(state.interval);
    }
    updateVisuals();
});

// Velocidade
document.querySelectorAll('.s-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        state.speed = parseInt(btn.getAttribute('data-speed'));
        document.querySelectorAll('.s-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        updateVisuals();
    });
});

function updateVisuals() {
    const rpm = state.speed * 450;
    const watts = state.speed * 14;
    document.getElementById('rpm-display').innerText = state.isOn ? `${rpm} RPM` : "0 RPM";
    document.getElementById('watt-usage').innerText = state.isOn ? `${watts}W` : "0W";
    
    const icon = document.getElementById('fan-icon');
    if(state.isOn) icon.style.animationDuration = `${1.5 - (state.speed * 0.2)}s`;
}

function startSim() {
    if(state.interval) clearInterval(state.interval);
    state.interval = setInterval(() => {
        // Bateria
        if(state.battery > 0) {
            state.battery -= (0.01 * state.speed);
            document.getElementById('battery-fill').style.width = state.battery + "%";
            document.getElementById('battery-text').innerText = Math.floor(state.battery) + "%";
        }
        // Água
        if(state.water < 100) {
            state.water += (0.02 * state.speed);
            document.getElementById('water-level-el').style.height = state.water + "%";
            document.getElementById('water-percent').innerText = Math.floor(state.water) + "%";
            document.getElementById('water-volume').innerText = Math.round((state.water/100)*3000) + " ml";
            document.getElementById('temp-fill').innerText = "Enchendo...";
        }
    }, 1000);
}

// --- POPULAR DADOS ---
function renderStats() {
    const container = document.getElementById('forecast-container');
    const data = [
        {d: "Segunda", t: "28°C", h: "75%"},
        {d: "Terça", t: "26°C", h: "82%"},
        {d: "Quarta", t: "24°C", h: "90%"}
    ];
    data.forEach(d => {
        container.innerHTML += `
            <div class="forecast-item">
                <div style="font-weight:bold; width:80px">${d.d}</div>
                <div><i class="fa-solid fa-cloud"></i> ${d.t}</div>
                <div style="color:#56ccf2"><i class="fa-solid fa-droplet"></i> ${d.h}</div>
            </div>`;
    });
}

function renderSchedule() {
    const container = document.getElementById('schedule-container');
    const tasks = [
        {t: "06:00 - 08:00", l: "Modo Econômico"},
        {t: "18:00 - 22:00", l: "Modo Turbo"}
    ];
    tasks.forEach(t => {
        container.innerHTML += `
            <div class="schedule-item">
                <div><strong>${t.t}</strong><br><small style="color:#6b6b7a">${t.l}</small></div>
                <div style="width:30px; height:15px; background:#333; border-radius:15px; position:relative">
                    <div style="width:15px; height:15px; background:#fff; border-radius:50%; position:absolute; right:0"></div>
                </div>
            </div>`;
    });
}