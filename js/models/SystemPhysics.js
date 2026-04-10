export class SystemPhysics {
    constructor() {
        this.interval = null;

        // ==========================================
        // ESPECIFICAÇÕES REAIS DO HARDWARE (FÍSICO)
        // ==========================================
        this.batteryCapacityWh = 120; // Bateria 12V 10Ah (120 Watts/Hora)
        this.tankCapacityMl = 500;    // Reservatório de 500ml

        // Consumo em Watts de cada velocidade (ESP32 + Cooler + Bomba + Peltier)
        this.wattValues = [0, 15, 25, 45, 70, 100];

        // Gasto de Água em ml por HORA em cada velocidade (ex: evaporação/névoa)
        this.waterUsagePerHour = [0, 5, 20, 50, 100, 200];

        // ⚠️ MULTIPLICADOR DE TEMPO (Para testes)
        // No mundo real, 1% de bateria demora minutos pra cair.
        // Mude para 60 se quiser que 1 minuto passe em 1 segundo durante uma apresentação!
        this.timeMultiplier = 1; 
    }

    startSimulation(isOn, speed, currentState, onUpdate) {
        this.stopSimulation();

        let { battery, water } = currentState;
        // Previne erros se vier valores vazios do banco
        battery = typeof battery === 'number' ? battery : 100;
        water = typeof water === 'number' ? water : 0;

        // Loop principal que roda a cada 1 segundo
        this.interval = setInterval(() => {
            if (!isOn) return;

            const currentWatts = this.wattValues[speed];
            const currentWaterRate = this.waterUsagePerHour[speed];

            // 🔋 FÍSICA DA BATERIA
            // Total de energia na bateria = 120Wh * 3600 segundos = 432.000 Joules
            const totalJoules = this.batteryCapacityWh * 3600;
            // Energia gasta no último 1 segundo
            const joulesConsumed = currentWatts * this.timeMultiplier;
            // Quanto % isso representa da bateria inteira
            const batteryDropPercent = (joulesConsumed / totalJoules) * 100;

            // 💧 FÍSICA DA ÁGUA
            // Converte ml/hora para ml/segundo
            const mlConsumed = (currentWaterRate / 3600) * this.timeMultiplier;
            // Quanto % isso representa do tanque de 500ml
            const waterDropPercent = (mlConsumed / this.tankCapacityMl) * 100;

            // Atualiza os valores (garantindo que não passem de 0)
            battery = Math.max(0, battery - batteryDropPercent);
            water = Math.max(0, water - waterDropPercent);

            // Se a bateria zerar, desliga o sistema automaticamente (Proteção BMS)
            let autoPowerOff = isOn;
            if (battery <= 0) {
                battery = 0;
                autoPowerOff = false;
            }

            // Envia os dados com 4 casas decimais para o gráfico não dar saltos bruscos
            onUpdate({
                battery: Number(battery.toFixed(4)),
                water: Number(water.toFixed(4)),
                isOn: autoPowerOff
            });

            // Para o loop interno se a bateria cortou o sistema
            if (!autoPowerOff) this.stopSimulation();

        }, 1000); // 1000ms = 1 segundo real
    }

    stopSimulation() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }
}