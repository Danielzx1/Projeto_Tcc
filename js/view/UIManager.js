export class UIManager {
    constructor() {
        // Elementos do DOM
        this.els = {
            authOverlay: document.getElementById('auth-overlay'),
            connStatus: document.getElementById('connection-status'),
            pCard: document.getElementById('card-power'),
            fCard: document.getElementById('card-fan'),
            fIcon: document.getElementById('fan-icon'),
            statusText: document.getElementById('sys-status-text'),
            rpm: document.getElementById('rpm-display'),
            watts: document.getElementById('watt-usage'),
            batFill: document.getElementById('battery-fill'),
            batText: document.getElementById('battery-text'),
            waterLevel: document.getElementById('water-level-el'),
            waterPercent: document.getElementById('water-percent'),
            waterVol: document.getElementById('water-volume'),
            tempFill: document.getElementById('temp-fill'),
            forecastContainer: document.getElementById('forecast-container'),
            scheduleContainer: document.getElementById('schedule-container'), // Novo
            sidebarName: document.getElementById('sidebar-username'),
            settingsEmail: document.getElementById('settings-email'),
            avatar: document.querySelector('.avatar'),
            editName: document.getElementById('edit-name'),
            editPhoto: document.getElementById('edit-photo'),
            btnReset: document.getElementById('btn-reset-metrics')
        };
    }

    toggleAuthScreen(show) {
        if (show) this.els.authOverlay.classList.remove('hidden');
        else this.els.authOverlay.classList.add('hidden');
    }

    updateConnectionStatus(isOnline) {
        this.els.connStatus.innerText = isOnline ? "Online (Cloud)" : "Offline";
        this.els.connStatus.style.color = isOnline ? "#00e05e" : "#6b6b7a";
    }

renderDashboard(sys, bluetoothConnected) {
        if (sys.isOn) {
            this.els.pCard.classList.add('on');
            this.els.fCard.classList.remove('disabled');
            this.els.fIcon.classList.add('spinning');
            this.els.statusText.innerText = "SISTEMA ON";
            
            // CORREÇÃO AQUI: Usar variável, não cor fixa
            this.els.statusText.style.color = "var(--text)"; 
            this.els.statusText.style.fontWeight = "bold";

            this.els.fIcon.style.animationDuration = `${1.6 - (sys.speed * 0.25)}s`;
        } else {
            this.els.pCard.classList.remove('on');
            this.els.fCard.classList.add('disabled');
            this.els.fIcon.classList.remove('spinning');
            this.els.statusText.innerText = "SISTEMA OFF";
            
            // CORREÇÃO AQUI TAMBÉM
            this.els.statusText.style.color = "var(--text-dim)";
        }
        
        // ... (o resto da função continua igual)
        document.querySelectorAll('.s-btn').forEach(btn => {
            const s = parseInt(btn.getAttribute('data-speed'));
            if (s === sys.speed) btn.classList.add('active');
            else btn.classList.remove('active');
        });

        const rpmVal = sys.speed * 450;
        const wattsVal = sys.speed * 14;
        this.els.rpm.innerText = sys.isOn ? `${rpmVal} RPM` : "0 RPM";
        this.els.watts.innerText = sys.isOn ? `${wattsVal}W` : "0W";
        
        this.els.batFill.style.width = sys.battery + "%";
        this.els.batText.innerText = Math.floor(sys.battery) + "%";
        
        this.els.waterLevel.style.height = sys.water + "%";
        this.els.waterPercent.innerText = Math.floor(sys.water) + "%";
        this.els.waterVol.innerText = Math.round((sys.water/100)*3000) + " ml";

        if(bluetoothConnected && sys.isOn) {
            this.els.tempFill.innerText = "Produzindo água...";
            this.els.tempFill.style.color = "#00e05e";
        } else if (!bluetoothConnected) {
            this.els.tempFill.innerText = "Bluetooth desconectado";
            this.els.tempFill.style.color = "#e74c3c";
        } else {
            this.els.tempFill.innerText = "Sistema em espera";
            this.els.tempFill.style.color = "#6b6b7a";
        }
    }

    updateProfile(data) {
        if (data.name) {
            this.els.sidebarName.innerText = data.name;
            if(document.activeElement !== this.els.editName) this.els.editName.value = data.name;
        }
        if (data.email) this.els.settingsEmail.value = data.email;

        if (data.photo && data.photo.trim() !== "") {
            this.els.avatar.innerHTML = `<img src="${data.photo}" alt="Perfil">`;
            if(document.activeElement !== this.els.editPhoto) this.els.editPhoto.value = data.photo;
        } else if (data.name) {
            this.els.avatar.innerHTML = data.name.substring(0, 2).toUpperCase();
        }
    }

    renderForecast(daily) {
        if(!this.els.forecastContainer) return;
        this.els.forecastContainer.innerHTML = '';
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
            const dayName = new Date(date.getTime() + date.getTimezoneOffset() * 60000).toLocaleDateString('pt-BR', { weekday: 'long' });
            const temp = Math.round(daily.temperature_2m_max[i]);
            const hum = Math.round(daily.relative_humidity_2m_mean[i]);
            
            this.els.forecastContainer.innerHTML += `
                <div class="forecast-item">
                    <div class="f-day">${dayName}</div>
                    <div class="f-temp"><i class="fa-solid ${getIcon(daily.weather_code[i])}"></i> ${temp}°C</div>
                    <div class="f-hum"><i class="fa-solid fa-droplet"></i> ${hum}%</div>
                </div>`;
        }
    }

    // --- NOVA LÓGICA DE AGENDAMENTO ---
renderSchedule(schedulesData, onDelete, onToggle) {
        if(!this.els.scheduleContainer) return;
        this.els.scheduleContainer.innerHTML = ''; // Limpa lista

        if (!schedulesData) {
            this.els.scheduleContainer.innerHTML = '<small style="padding:20px; color:var(--text-dim)">Nenhuma automação ativa.</small>';
            return;
        }

        // Transforma objeto do Firebase em Array
        Object.entries(schedulesData).forEach(([key, task]) => {
            const item = document.createElement('div');
            item.className = 'schedule-item';
            
            // Define cor do texto (Turbo = Vermelho, Eco = Verde)
            const color = task.mode === 'Turbo' ? '#e74c3c' : '#2ecc71';

            item.innerHTML = `
                <div style="display:flex; align-items:center; gap:15px;">
                    <button class="btn-delete" style="background:none; border:none; color:#e74c3c; cursor:pointer;"><i class="fa-solid fa-trash"></i></button>
                    <div>
                        <b style="font-size:1.1rem">${task.time}</b><br>
                        <small style="color:${color}; font-weight:bold;">${task.mode}</small>
                    </div>
                </div>
                <div class="toggle-switch ${task.active ? 'active' : ''}" id="toggle-${key}"></div>
            `;

            // Evento Deletar
            item.querySelector('.btn-delete').addEventListener('click', () => onDelete(key));
            
            // Evento Ligar/Desligar
            item.querySelector('.toggle-switch').addEventListener('click', function() {
                onToggle(key, !this.classList.contains('active'));
            });

            this.els.scheduleContainer.appendChild(item);
        });
    }

    createScheduleItem(time, label, isActive, callback) {
        const item = document.createElement('div');
        item.className = 'schedule-item';
        item.innerHTML = `<div><b>${time}</b><br><small style="color:#6b6b7a">${label}</small></div><div class="toggle-switch ${isActive ? 'active' : ''}"></div>`;
        
        item.querySelector('.toggle-switch').addEventListener('click', function() {
            const newState = !this.classList.contains('active');
            if(newState) this.classList.add('active'); else this.classList.remove('active');
            callback(newState);
        });
        this.els.scheduleContainer.appendChild(item);
    }

    animateResetButton() {
        const icon = this.els.btnReset.querySelector('i');
        icon.classList.add('fa-spin');
        setTimeout(() => icon.classList.remove('fa-spin'), 600);
    }

    // ... (Métodos anteriores) ...

    renderLogs(logs) {
        const container = document.getElementById('logs-container');
        if (!container) return;
        
        if (logs.length === 0) {
            container.innerHTML = '<small style="text-align:center; padding: 20px; color: #666;">Nenhum evento registrado.</small>';
            return;
        }

        container.innerHTML = '';
        logs.forEach(log => {
            const div = document.createElement('div');
            // Define cor baseada no tipo
            let cssClass = 'log-item';
            if (log.type === 'alert') cssClass += ' alert';
            if (log.type === 'success') cssClass += ' success';

            div.className = cssClass;
            div.innerHTML = `
                <strong>${log.message}</strong>
                <span><i class="fa-regular fa-clock"></i> ${log.time}</span>
            `;
            container.appendChild(div);
        });
    }
}