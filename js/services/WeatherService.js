export class WeatherService {
    async getLocalWeather() {
        // Coordenadas padrão (Aracaju - SE) para caso de erro/bloqueio
        const defaultLat = -10.9472;
        const defaultLon = -37.0731;

        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                // Se o navegador não suportar, usa padrão
                return this.fetchWeather(defaultLat, defaultLon).then(resolve).catch(reject);
            }

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    // Sucesso: usa GPS real
                    this.fetchWeather(position.coords.latitude, position.coords.longitude)
                        .then(resolve).catch(reject);
                },
                (err) => {
                    // Erro/Bloqueio: usa Aracaju e avisa no console (amarelo, não vermelho)
                    console.warn("GPS bloqueado. Usando localização padrão: Aracaju.");
                    this.fetchWeather(defaultLat, defaultLon).then(resolve).catch(reject);
                }
            );
        });
    }

    async fetchWeather(lat, lon) {
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,relative_humidity_2m_mean,weather_code&timezone=auto&forecast_days=7`);
        const data = await res.json();
        return data.daily;
    }
}