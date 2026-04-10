export class WeatherService {
    async getLocalWeather() {
        return new Promise(async (resolve) => {
            // Plano B de ferro: Aracaju
            const fallbackAracaju = async () => {
                console.log("📍 GPS falhou ou negado. Usando Aracaju.");
                resolve(await this.fetchFromAPI(-10.9472, -37.0731));
            };

            if ("geolocation" in navigator) {
                navigator.geolocation.getCurrentPosition(
                    async (position) => {
                        try {
                            resolve(await this.fetchFromAPI(position.coords.latitude, position.coords.longitude));
                        } catch (e) { fallbackAracaju(); }
                    },
                    (error) => {
                        console.warn("Permissão de localização negada/falhou.");
                        fallbackAracaju();
                    },
                    { timeout: 5000 } // Se demorar 5 seg, ele desiste e vai pra Aracaju
                );
            } else {
                fallbackAracaju();
            }
        });
    }

    async fetchFromAPI(lat, lon) {
        try {
            // MÁGICA AQUI: timezone=auto nunca dá erro de formatação na API
            const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto`;
            const response = await fetch(url);
            
            if (!response.ok) throw new Error("API rejeitou a conexão");
            
            const data = await response.json();
            
            // Verifica se a API mandou uma mensagem de erro disfarçada
            if (data.error || !data.daily) throw new Error("Dados corrompidos recebidos da API.");

            return data.daily;
        } catch (e) {
            console.error("☁️ Erro na API de Clima:", e);
            return null; // O UIManager vai pegar esse null e avisar na tela
        }
    }
}