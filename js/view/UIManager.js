export class UIManager {
    constructor() {
        this.els = {
            pCard: document.getElementById('card-power'), fCard: document.getElementById('card-fan'),
            fIcon: document.getElementById('fan-icon'), statusText: document.getElementById('sys-status-text'),
            rpm: document.getElementById('rpm-display'), watt: document.getElementById('watt-usage'),
            batFill: document.getElementById('battery-fill'), batText: document.getElementById('battery-text'),
            waterLevel: document.getElementById('water-level-el'), waterPercent: document.getElementById('water-percent'),
            waterVol: document.getElementById('water-volume'), scheduleContainer: document.getElementById('schedule-container')
        };
    }

    toggleAuthScreen(show) { document.getElementById('auth-overlay').classList.toggle('hidden', !show); }

    updateConnectionStatus(isConnected) {
        const statusEl = document.getElementById('connection-status');
        if (isConnected) { statusEl.innerText = "Online"; statusEl.style.color = "#00e05e"; } 
        else { statusEl.innerText = "Offline"; statusEl.style.color = "#e74c3c"; }
    }

    updateProfile(data) {
        document.getElementById('sidebar-username').innerText = data.name || "Usuário";
        document.getElementById('settings-email').value = data.email || "";
        document.getElementById('edit-name').value = data.name || "";
        document.getElementById('edit-photo').value = data.photo || "";
        const avatar = document.querySelector('.avatar');
        if (data.photo) avatar.innerHTML = `<img src="${data.photo}" alt="Avatar">`;
        else avatar.innerHTML = (data.name ? data.name.charAt(0).toUpperCase() : "U");
    }

    renderDashboard(sys, isConnected) {
        if (!isConnected) {
            this.els.pCard.classList.remove('on'); this.els.fCard.classList.add('disabled');
            this.els.fIcon.classList.remove('spinning'); this.els.statusText.innerText = "OFF";
            this.els.statusText.style.color = "var(--text-dim)"; this.els.rpm.innerText = "0 RPM";
            this.els.watt.innerText = "0W"; this.els.batFill.style.width = "0%";
            this.els.batText.innerText = "--%"; this.els.waterLevel.style.height = "0%";
            this.els.waterPercent.innerText = "0%"; this.els.waterVol.innerText = "0 ml";
            document.getElementById('temp-fill').innerText = "Aguardando Pareamento...";
            document.querySelectorAll('.s-btn').forEach(b => b.classList.remove('active'));
            return;
        }

        document.getElementById('temp-fill').innerText = "Sincronizado";
        if (sys.isOn) {
            this.els.pCard.classList.add('on'); this.els.fCard.classList.remove('disabled');
            this.els.fIcon.classList.add('spinning'); this.els.statusText.innerText = "SISTEMA ON";
            this.els.statusText.style.color = "var(--text)"; this.els.statusText.style.fontWeight = "bold";
            this.els.fIcon.style.animationDuration = `${1.6 - (sys.speed * 0.25)}s`;
        } else {
            this.els.pCard.classList.remove('on'); this.els.fCard.classList.add('disabled');
            this.els.fIcon.classList.remove('spinning'); this.els.statusText.innerText = "SISTEMA OFF";
            this.els.statusText.style.color = "var(--text-dim)";
        }

        document.querySelectorAll('.s-btn').forEach(b => { b.classList.remove('active'); if (parseInt(b.getAttribute('data-speed')) === sys.speed) b.classList.add('active'); });
        const rpmValues = [0, 800, 1200, 1800, 2400, 3200]; const wattValues = [0, 15, 25, 45, 70, 100];
        this.els.rpm.innerText = sys.isOn ? `${rpmValues[sys.speed]} RPM` : "0 RPM";
        this.els.watt.innerText = sys.isOn ? `${wattValues[sys.speed]}W` : "0W";
        this.els.batFill.style.width = `${sys.battery}%`; this.els.batText.innerText = `${Math.floor(sys.battery)}%`;
        this.els.batFill.style.background = sys.battery <= 20 ? "#e74c3c" : "linear-gradient(90deg, #00e05e, #2ecc71)";
        this.els.waterLevel.style.height = `${sys.water}%`; this.els.waterPercent.innerText = `${Math.floor(sys.water)}%`;
        this.els.waterVol.innerText = `${Math.floor(sys.water * 10)} ml`;
    }

    showForecastLoading() {
        const container = document.getElementById('forecast-container');
        if (container) container.innerHTML = '<small style="color:var(--primary); padding: 15px;"><i class="fa-solid fa-satellite-dish fa-fade"></i> Buscando clima local...</small>';
    }

    renderForecast(dailyData) {
        const container = document.getElementById('forecast-container');
        if (!container) return;
        
        // BLINDAGEM MÁXIMA: Se o AdBlock cortar um pedaço dos dados, a gente não crasha o app.
        if (!dailyData || !dailyData.time || !dailyData.temperature_2m_min || !dailyData.temperature_2m_max) {
            container.innerHTML = '<small style="color:var(--text-dim); padding: 15px;">📡 Dados de satélite bloqueados pelo navegador. Libere permissões.</small>';
            return;
        }

        container.innerHTML = '';
        const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
        
        for (let i = 0; i < 3; i++) {
            if (!dailyData.time[i]) break; // Evita erro se a API não mandar 3 dias

            const dateParts = dailyData.time[i].split('-');
            const date = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
            const dayName = i === 0 ? 'Hoje' : days[date.getDay()];
            
            const min = Math.round(dailyData.temperature_2m_min[i]);
            const max = Math.round(dailyData.temperature_2m_max[i]);
            
            // Tratamento extra para a chance de chuva (algumas APIs grátis omitem isso às vezes)
            let rain = 0;
            if (dailyData.precipitation_probability_max && dailyData.precipitation_probability_max[i] !== undefined) {
                rain = dailyData.precipitation_probability_max[i];
            }
            
            const div = document.createElement('div');
            div.className = 'forecast-item';
            div.innerHTML = `<div class="f-day">${dayName}</div><div class="f-temp"><i class="fa-solid fa-temperature-half"></i> ${min}°C - ${max}°C</div><div class="f-hum"><i class="fa-solid fa-cloud-rain"></i> ${rain}%</div>`;
            container.appendChild(div);
        }
    }

    renderSchedule(schedulesData, onDelete, onToggle) {
        if(!this.els.scheduleContainer) return;
        this.els.scheduleContainer.innerHTML = '';
        if (!schedulesData) { this.els.scheduleContainer.innerHTML = '<small style="padding:20px; color:var(--text-dim)">Nenhuma automação ativa.</small>'; return; }
        Object.entries(schedulesData).forEach(([key, task]) => {
            const item = document.createElement('div'); item.className = 'schedule-item';
            const color = task.mode === 'Turbo' ? '#e74c3c' : '#2ecc71';
            item.innerHTML = `<div style="display:flex; align-items:center; gap:15px;"><button class="btn-delete" style="background:none; border:none; color:#e74c3c; cursor:pointer;"><i class="fa-solid fa-trash"></i></button><div><b style="font-size:1.1rem">${task.time}</b><br><small style="color:${color}; font-weight:bold;">${task.mode}</small></div></div><div class="toggle-switch ${task.active ? 'active' : ''}" id="toggle-${key}"></div>`;
            item.querySelector('.btn-delete').addEventListener('click', () => onDelete(key));
            item.querySelector('.toggle-switch').addEventListener('click', function() { onToggle(key, !this.classList.contains('active')); });
            this.els.scheduleContainer.appendChild(item);
        });
    }

    renderLogs(logs) {
        const container = document.getElementById('logs-container');
        if (!container) return;
        if (logs.length === 0) { container.innerHTML = '<small style="text-align:center; padding: 20px; color: #666;">Nenhum evento registrado.</small>'; return; }
        container.innerHTML = '';
        logs.forEach(log => {
            const div = document.createElement('div');
            let cssClass = 'log-item';
            if (log.type === 'alert') cssClass += ' alert';
            if (log.type === 'success') cssClass += ' success';
            div.className = cssClass;
            div.innerHTML = `<strong>${log.message}</strong><span><i class="fa-regular fa-clock"></i> ${log.time}</span>`;
            container.appendChild(div);
        });
    }

    animateResetButton() {
        const icon = document.querySelector('#btn-reset-metrics i');
        icon.style.transition = 'transform 0.5s'; icon.style.transform = 'rotate(360deg)';
        setTimeout(() => { icon.style.transition = 'none'; icon.style.transform = 'rotate(0deg)'; }, 500);
    }
}