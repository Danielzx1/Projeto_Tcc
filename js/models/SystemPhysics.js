export class SystemPhysics {
    constructor() {
        this.interval = null;

        // ==========================================
        // ESPECIFICAÇÕES REAIS DO HARDWARE (FÍSICO)
        // ==========================================
        this.batteryCapacityWh = 120; // Bateria 12V 10Ah (120 Watts/Hora)
        this.tankCapacityMl = 500;    // Reservatório de 500ml

        // Consumo em Watts de cada velocidade
        this.wattValues = [0, 15, 25, 45, 70, 100];

        // Gasto de Água em ml por HORA em cada velocidade
        this.waterUsagePerHour = [0, 5, 20, 50, 100, 200];

        // Inicia no modo Demo
        this.isDemo = true; 
    }

    setDemoMode(isDemo) {
        this.isDemo = isDemo;
    }

    startSimulation(isOn, speed, currentState, onUpdate) {
        this.stopSimulation();

        let { battery, water } = currentState;
        battery = typeof battery === 'number' ? battery : 100;
        water = typeof water === 'number' ? water : 0;

        this.interval = setInterval(() => {
            if (!isOn) return;

            // ⏱️ AJUSTE DE VELOCIDADE: 120x (1s real = 2min simulados)
            const multiplier = this.isDemo ? 120 : 1;

            // 🔋 FÍSICA DA BATERIA (Sempre descarrega)
            const totalJoules = this.batteryCapacityWh * 3600;
            const joulesConsumed = this.wattValues[speed] * multiplier;
            const batteryDropPercent = (joulesConsumed / totalJoules) * 100;
            
            battery = Math.max(0, battery - batteryDropPercent);

            // 💧 FÍSICA DA ÁGUA
            const mlChange = (this.waterUsagePerHour[speed] / 3600) * multiplier;
            const waterChangePercent = (mlChange / this.tankCapacityMl) * 100;

            if (this.isDemo) {
                // MODO DEMO: Tanque ENCHE gradualmente
                water += waterChangePercent;
                if (water > 100) water = 0; 
            } else {
                // MODO REAL: Tanque ESVAZIA
                water = Math.max(0, water - waterChangePercent);
            }

            // Proteção BMS
            let autoPowerOff = isOn;
            if (battery <= 0) {
                battery = 0;
                autoPowerOff = false;
            }

            onUpdate({
                battery: Number(battery.toFixed(4)),
                water: Number(water.toFixed(4)),
                isOn: autoPowerOff
            });

            if (!autoPowerOff) this.stopSimulation();

        }, 1000); 
    }

    stopSimulation() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }
}