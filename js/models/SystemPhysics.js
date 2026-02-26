// js/models/SystemPhysics.js
export class SystemPhysics {
    constructor() {
        this.interval = null;
    }

    calculateNextState(currentBattery, currentWater, speed) {
        let bat = parseFloat(currentBattery) || 0;
        let wat = parseFloat(currentWater) || 0;
        
        let newBat = bat - (0.015 * speed);
        let newWat = wat + (0.025 * speed);

        if (newBat < 0) newBat = 0;
        if (newWat > 100) newWat = 100;

        return { battery: newBat, water: newWat };
    }

    startSimulation(isOn, speed, currentData, updateCallback) {
        if (this.interval) clearInterval(this.interval);
        
        if (isOn) {
            this.interval = setInterval(() => {
                const newState = this.calculateNextState(currentData.battery, currentData.water, speed);
                currentData.battery = newState.battery;
                currentData.water = newState.water;
                updateCallback(newState);
            }, 1000);
        }
    }

    stopSimulation() {
        if (this.interval) clearInterval(this.interval);
    }
}