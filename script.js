const API_KEY = "db0a7520d7e0488193e152245260509";

const LOCATION = "Durban, South Africa";

const weatherVideos = {

    sunny: "Sunny.mp4",

    cloudy: "Cloudy.mp4",

    rainy: "Rainy.mp4",

    windy: "Windy.mp4",

    thunder: "Thunder.mp4"

};

// CHANGE WEATHER VIDEO

function changeWeatherVideo(weatherType) {

    const background =
        document.getElementById("weatherBackground");

    const videoFile =
        weatherVideos[weatherType];


    if (!videoFile) {

        console.error(
            "Weather video not found:",
            weatherType
        );

        return;
    }


    const video =
        document.createElement("video");


    video.src = videoFile;

    video.autoplay = true;

    video.muted = true;

    video.loop = true;

    video.playsInline = true;


    // Remove previous video

    background.innerHTML = "";


    // Add new video

    background.appendChild(video);


    // Start video

    video.play().catch(error => {

        console.error(
            "Video could not play:",
            error
        );

    });

}

// GET WEATHER FROM WEATHERAPI

async function getWeather() {

    try {

        console.log("Getting weather...");


        const url =
            `https://api.weatherapi.com/v1/current.json?key=${API_KEY}&q=${encodeURIComponent(LOCATION)}&aqi=no`;


        const response =
            await fetch(url);


        // Check if API request failed

        if (!response.ok) {

            throw new Error(
                `Weather API error: ${response.status}`
            );

        }


        const data =
            await response.json();


        console.log(
            "Weather data received:",
            data
        );

        // GET WEATHER VALUES

        const temperature =
            Math.round(data.current.temp_c);


        const humidity =
            data.current.humidity;


        const windSpeed =
            Math.round(data.current.wind_kph);


        const rainfall =
            data.current.precip_mm;


        const condition =
            data.current.condition.text;


        const conditionLower =
            condition.toLowerCase();

        // UPDATE DASHBOARD
       
        document.getElementById(
            "temperature"
        ).textContent =
            `${temperature}°C`;


        document.getElementById(
            "humidity"
        ).textContent =
            `${humidity}%`;


        document.getElementById(
            "wind"
        ).textContent =
            `${windSpeed} km/h`;


        document.getElementById(
            "rainfall"
        ).textContent =
            `${rainfall} mm`;


        document.getElementById(
            "weatherCondition"
        ).textContent =
            condition;


        document.getElementById(
            "location"
        ).textContent =
            data.location.name;

        // WEATHER ICON

        let icon = "🌤️";


        if (
            conditionLower.includes("thunder")
        ) {

            icon = "⛈️";

        }

        else if (
            conditionLower.includes("rain") ||
            conditionLower.includes("drizzle") ||
            conditionLower.includes("shower")
        ) {

            icon = "🌧️";

        }

        else if (
            conditionLower.includes("sunny") ||
            conditionLower.includes("clear")
        ) {

            icon = "☀️";

        }

        else if (
            conditionLower.includes("cloud")
        ) {

            icon = "☁️";

        }

        else if (windSpeed >= 35) {

            icon = "💨";

        }


        document.getElementById(
            "weatherIcon"
        ).textContent = icon;

        // CHOOSE WEATHER VIDEO

        let weatherType = "cloudy";


        // Thunderstorm

        if (
            conditionLower.includes("thunder")
        ) {

            weatherType = "thunder";

        }


        // Rain

        else if (
            conditionLower.includes("rain") ||
            conditionLower.includes("drizzle") ||
            conditionLower.includes("shower")
        ) {

            weatherType = "rainy";

        }


        // Strong wind

        else if (
            windSpeed >= 35
        ) {

            weatherType = "windy";

        }


        // Sunny

        else if (
            conditionLower.includes("sunny") ||
            conditionLower.includes("clear")
        ) {

            weatherType = "sunny";

        }


        // Cloudy

        else {

            weatherType = "cloudy";

        }


        // Play the correct video

        changeWeatherVideo(weatherType);


        console.log(
            "Weather type:",
            weatherType
        );


        // UPDATE FLOOD RISK
        
        updateFloodRisk(
            rainfall,
            humidity
        );


        console.log(
            "Weather successfully updated."
        );

    }


    catch (error) {

        console.error(
            "Weather error:",
            error
        );


        document.getElementById(
            "weatherCondition"
        ).textContent =
            "Weather unavailable";


        console.log(
            "Check your API key and internet connection."
        );

    }

}


// FLOOD RISK

function updateFloodRisk(
    rainfall,
    humidity
) {

    const floodRisk =
        document.getElementById("floodRisk");


    const alertMessage =
        document.getElementById("alertMessage");


    let risk = "Low";


    // Heavy rainfall

    if (rainfall >= 20) {

        risk = "High";

    }

    else if (rainfall >= 10) {

        risk = "Moderate";

    }


    // Update dashboard

    floodRisk.textContent =
        risk;


    // Update alert

    if (risk === "High") {

        alertMessage.textContent =
            "Heavy rainfall detected. High flood risk. Monitor the bridge closely.";

    }

    else if (risk === "Moderate") {

        alertMessage.textContent =
            "Moderate rainfall detected. Continue monitoring the bridge.";

    }

    else {

        alertMessage.textContent =
            "No immediate flood warning. System is monitoring the bridge.";

    }

}

// START WEATHER

getWeather();

// REFRESH EVERY 10 MINUTES


setInterval(
    getWeather,
    10 * 60 * 1000
);
