// --- IMPORTAÇÕES ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getDatabase, ref, set, onValue, update } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// --- CHAVES ---
const firebaseConfig = {
    apiKey: "AIzaSyBzUUPtwq5G79A1JA-uveg7Z_CTwTKgk34",
    authDomain: "hydrogen-a780b.firebaseapp.com",
    projectId: "hydrogen-a780b",
    storageBucket: "hydrogen-a780b.firebasestorage.app",
    messagingSenderId: "672217055272",
    appId: "1:672217055272:web:315e777003136f75da351d",
    measurementId: "G-GNYBV5T5ZC"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

let localState = {
    bluetoothConnected: false,
    simulationInterval: null,
    systemData: { isOn: false, speed: 1, battery: 100, water: 0 }
};

// --- AUTENTICAÇÃO ---
onAuthStateChanged(auth, (user) => {
    const overlay = document.getElementById('auth-overlay');
    const connStatus = document.getElementById('connection-status');
    
    if (user) {
        overlay.classList.add('hidden');
        if(connStatus) {
            connStatus.innerText = "Online (Cloud)";
            connStatus.style.color = "#00e05e";
        }
        startApp(user.uid);
        initWeatherSystem();
    } else {
        overlay.classList.remove('hidden');
        if(connStatus) {
            connStatus.innerText = "Offline";
            connStatus.style.color = "#6b6b7a";
        }
        clearInterval(localState.simulationInterval);
    }
});

// Eventos de Form
document.getElementById('login-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    signInWithEmailAndPassword(auth, 
        document.getElementById('login-email').value, 
        document.getElementById('login-pass').value
    ).catch(err => alert(err.message));
});

document.getElementById('register-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('reg-email').value;
    const pass = document.getElementById('reg-pass').value;
    const name = document.getElementById('reg-name').value;

    createUserWithEmailAndPassword(auth, email, pass).then((cred) => {
        set(ref(db, 'users/' + cred.user.uid), {
            name: name, email: email,
            system: { isOn: false, speed: 1, battery: 100, water: 0 },
            schedule: { morning: false, night: false }
        });
    }).catch(err => alert(err.message));
});

document.getElementById('btn-logout')?.addEventListener('click', () => signOut(auth));
document.getElementById('link-register')?.addEventListener('click', () => {
    document.getElementById('login-form').classList.remove('active');
    document.getElementById('register-form').classList.add('active');
});
document.getElementById('link-login')?.addEventListener('click', () => {
    document.getElementById('register-form').classList.remove('active');
    document.getElementById('login-form').classList.add('active');
});


// --- CLIMA ---
function initWeatherSystem() {
    const container = document.getElementById('forecast-container');
    if(container) container.innerHTML = '<div style="padding:20px; text-align:center; color:#6b6b7a"><i class="fa-solid fa-spinner fa-spin"></i> Buscando localização...</div>';

    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,relative_humidity_2m_mean,weather_code&timezone=auto&forecast_days=7`)
                .then(res => res.json())
                .then(data => renderForecast(data.daily))
                .catch(err => {
                    console.error(err);
                    container.innerHTML = "Erro ao carregar dados do clima.";
                });
            },
            (error) => {
                console.error("Erro GPS:", error);
                if(container) container.innerHTML = '<div style="color:#e74c3c; text-align:center; padding:20px;">Permissão de localização negada.<br>Ative o GPS do navegador.</div>';
            }
        );
    } else {
        if(container) container.innerHTML = "Geolocalização não suportada.";
    }
}

function renderForecast(daily) {
    const container = document.getElementById('forecast-container');
    if(!container) return;
    container.innerHTML = ''; 

    const getIcon = (code) => {
        if (code === 0) return 'fa-sun';
        if (code >= 1 && code <= 3) return 'fa-cloud-sun';
        if (code >= 45 && code <= 48) return 'fa-smog';
        if (code >= 51 && code <= 67) return 'fa-cloud-rain';
        if (code >= 80 && code <= 99) return 'fa-cloud-showers-heavy';
        return 'fa-cloud';
    };

    for (let i = 0; i < daily.time.length; i++) {
        const date = new Date(daily.time[i]);
        const userTimezoneOffset = date.getTimezoneOffset() * 60000;
        const adjustedDate = new Date(date.getTime() + userTimezoneOffset);
        
        const dayName = adjustedDate.toLocaleDateString('pt-BR', { weekday: 'long' });
        const temp = Math.round(daily.temperature_2m_max[i]);
        const hum = Math.round(daily.relative_humidity_2m_mean[i]);
        const icon = getIcon(daily.weather_code[i]);

        container.innerHTML += `
            <div class="forecast-item">
                <div class="f-day">${dayName}</div>
                <div class="f-temp"><i class="fa-solid ${icon}"></i> ${temp}°C</div>
                <div class="f-hum"><i class="fa-solid fa-droplet"></i> ${hum}%</div>
            </div>
        `;
    }
}


// --- START APP & LOGICA PRINCIPAL ---
function startApp(userId) {
    onValue(ref(db, 'users/' + userId), (snapshot) => {
        const data = snapshot.val();
        if (!data) return;

        // --- ATUALIZA PERFIL ---
        
        // 1. Nome na Sidebar
        if (data.name) {
            const sidebarName = document.getElementById('sidebar-username');
            if(sidebarName) sidebarName.innerText = data.name;
            
            // Preenche o input do formulário se não estiver focado
            const nameInput = document.getElementById('edit-name');
            if(nameInput && document.activeElement !== nameInput) {
                nameInput.value = data.name;
            }
        }
        
        // 2. Foto de Perfil
        const avatarEl = document.querySelector('.avatar');
        if (avatarEl) {
            // Se tiver URL de foto válida
            if (data.photo && data.photo.trim() !== "") {
                avatarEl.innerHTML = `<img src="${data.photo}" alt="Perfil">`;
                
                const photoInput = document.getElementById('edit-photo');
                if(photoInput && document.activeElement !== photoInput) {
                    photoInput.value = data.photo;
                }
            } else if (data.name) {
                // Senão, usa a inicial
                avatarEl.innerHTML = data.name.substring(0, 2).toUpperCase();
            }
        }

        // 3. Email
        if(data.email) {
            const emailEl = document.getElementById('settings-email');
            if(emailEl) emailEl.value = data.email;
        }

        // --- SISTEMA E AGENDAMENTO ---
        if(data.system) {
            let safeSys = checkDataIntegrity(data.system, userId);
            localState.systemData = safeSys;
            renderInterface(safeSys);
            runPhysics(userId);
        }
        if(data.schedule) {
            renderSchedule(data.schedule, userId);
        }
    });

    // --- EVENTO: SALVAR PERFIL ---
    const btnSave = document.getElementById('btn-save-profile');
    if(btnSave) {
        const newBtnSave = btnSave.cloneNode(true); // Remove listeners antigos
        btnSave.parentNode.replaceChild(newBtnSave, btnSave);

        newBtnSave.addEventListener('click', () => {
            const newName = document.getElementById('edit-name').value;
            const newPhoto = document.getElementById('edit-photo').value;

            if(!newName) return alert("O nome não pode ser vazio!");

            update(ref(db, 'users/' + userId), {
                name: newName,
                photo: newPhoto
            })
            .then(() => alert("Perfil atualizado com sucesso! ✅"))
            .catch(err => alert("Erro ao salvar: " + err.message));
        });
    }
}

function checkDataIntegrity(sys, userId) {
    let fixNeeded = false;
    if (typeof sys.battery !== 'number' || isNaN(sys.battery)) { sys.battery = 100; fixNeeded = true; }
    if (typeof sys.water !== 'number' || isNaN(sys.water)) { sys.water = 0; fixNeeded = true; }
    if (typeof sys.speed !== 'number' || isNaN(sys.speed)) { sys.speed = 1; fixNeeded = true; }
    if (fixNeeded) update(ref(db, 'users/' + userId + '/system'), sys);
    return sys;
}

// --- RENDERIZAÇÃO DA UI ---
function renderInterface(sys) {
    const pCard = document.getElementById('card-power');
    const fCard = document.getElementById('card-fan');
    const fIcon = document.getElementById('fan-icon');
    const statusText = document.getElementById('sys-status-text');

    if (sys.isOn) {
        pCard.classList.add('on');
        fCard.classList.remove('disabled');
        fIcon.classList.add('spinning');
        statusText.innerText = "SISTEMA ON";
        statusText.style.color = "#fff";
        fIcon.style.animationDuration = `${1.6 - (sys.speed * 0.25)}s`;
    } else {
        pCard.classList.remove('on');
        fCard.classList.add('disabled');
        fIcon.classList.remove('spinning');
        statusText.innerText = "SISTEMA OFF";
        statusText.style.color = "#6b6b7a";
    }

    document.querySelectorAll('.s-btn').forEach(btn => {
        const s = parseInt(btn.getAttribute('data-speed'));
        if (s === sys.speed) btn.classList.add('active');
        else btn.classList.remove('active');
    });

    const rpm = sys.speed * 450;
    const watts = sys.speed * 14;
    document.getElementById('rpm-display').innerText = sys.isOn ? `${rpm} RPM` : "0 RPM";
    document.getElementById('watt-usage').innerText = sys.isOn ? `${watts}W` : "0W";

    document.getElementById('battery-fill').style.width = sys.battery + "%";
    document.getElementById('battery-text').innerText = Math.floor(sys.battery) + "%";
    document.getElementById('water-level-el').style.height = sys.water + "%";
    document.getElementById('water-percent').innerText = Math.floor(sys.water) + "%";
    document.getElementById('water-volume').innerText = Math.round((sys.water/100)*3000) + " ml";

    const statusFill = document.getElementById('temp-fill');
    if(localState.bluetoothConnected && sys.isOn) {
        statusFill.innerText = "Produzindo água...";
        statusFill.style.color = "#00e05e";
    } else if (!localState.bluetoothConnected) {
        statusFill.innerText = "Bluetooth desconectado";
        statusFill.style.color = "#e74c3c";
    } else {
        statusFill.innerText = "Sistema em espera";
        statusFill.style.color = "#6b6b7a";
    }
}

// --- CONTROLES ---
document.getElementById('btn-bluetooth').addEventListener('click', () => {
    localState.bluetoothConnected = !localState.bluetoothConnected;
    const dot = document.getElementById('bt-indicator');
    const text = document.getElementById('bt-status');

    if (localState.bluetoothConnected) {
        dot.classList.add('connected');
        text.innerText = "Conectado";
        text.style.color = "#00e05e";
    } else {
        dot.classList.remove('connected');
        text.innerText = "Desconectado";
        text.style.color = "#6b6b7a";
        if(auth.currentUser && localState.systemData.isOn) {
            update(ref(db, 'users/' + auth.currentUser.uid + '/system'), { isOn: false });
        }
    }
    renderInterface(localState.systemData);
});

document.getElementById('btn-power').addEventListener('click', () => {
    if (!localState.bluetoothConnected) return alert("Conecte o Bluetooth!");
    if (auth.currentUser) update(ref(db, 'users/' + auth.currentUser.uid + '/system'), { isOn: !localState.systemData.isOn });
});

document.querySelectorAll('.s-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        if (auth.currentUser) update(ref(db, 'users/' + auth.currentUser.uid + '/system'), { speed: parseInt(btn.getAttribute('data-speed')) });
    });
});

// --- BOTÃO RESET ---
document.getElementById('btn-reset-metrics')?.addEventListener('click', () => {
    if (!auth.currentUser) return;
    
    // Animação de giro
    const btn = document.getElementById('btn-reset-metrics');
    const icon = btn.querySelector('i');
    icon.classList.add('fa-spin');
    
    // Atualiza Firebase
    update(ref(db, 'users/' + auth.currentUser.uid + '/system'), {
        battery: 100,
        water: 0,
        speed: 1,
        isOn: false
    }).then(() => {
        setTimeout(() => icon.classList.remove('fa-spin'), 600);
    });
});

// --- SIMULAÇÃO E AGENDA ---
function runPhysics(userId) {
    if (localState.simulationInterval) clearInterval(localState.simulationInterval);
    if (localState.systemData.isOn) {
        localState.simulationInterval = setInterval(() => {
            let sys = localState.systemData;
            let currentBat = parseFloat(sys.battery) || 0;
            let currentWater = parseFloat(sys.water) || 0;
            let newBat = currentBat - (0.015 * sys.speed);
            let newWater = currentWater + (0.025 * sys.speed);
            if (newBat < 0) newBat = 0;
            if (newWater > 100) newWater = 100;

            if (Math.floor(Date.now() / 1000) % 2 === 0) {
                 update(ref(db, 'users/' + userId + '/system'), { battery: newBat, water: newWater });
            } else {
                localState.systemData.battery = newBat;
                localState.systemData.water = newWater;
                renderInterface(localState.systemData);
            }
        }, 1000);
    }
}

function renderSchedule(scheduleData, userId) {
    const container = document.getElementById('schedule-container');
    container.innerHTML = ''; 
    createScheduleItem(container, "06:00 - 08:00", "Econômico", scheduleData.morning, (newState) => update(ref(db, 'users/' + userId + '/schedule'), { morning: newState }));
    createScheduleItem(container, "18:00 - 22:00", "Turbo", scheduleData.night, (newState) => update(ref(db, 'users/' + userId + '/schedule'), { night: newState }));
}

function createScheduleItem(container, time, label, isActive, onToggle) {
    const item = document.createElement('div');
    item.className = 'schedule-item';
    item.innerHTML = `<div><b>${time}</b><br><small style="color:#6b6b7a">${label}</small></div><div class="toggle-switch ${isActive ? 'active' : ''}"></div>`;
    item.querySelector('.toggle-switch').addEventListener('click', function() {
        const newState = !this.classList.contains('active');
        if(newState) this.classList.add('active'); else this.classList.remove('active');
        onToggle(newState);
    });
    container.appendChild(item);
}

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