const API_KEY = '724b221dd15447ec972c09a77d648292'

const axios = require('axios');
const ObjectsToCsv = require('objects-to-csv')

function getCitiesWeather() {
    const cities = ['Jerusalem', 'New York', 'Dubai', 'Lisbon', 'Oslo', 'Paris', 'Berlin', 'Athens', 'Seoul', 'Singapore']
    const latLonPrms = cities.map(cityName => getCityLatLon(cityName))
    Promise.all(latLonPrms).then(latLons => {
        const citiesWeatherPrms = latLons.map(latLon => getCityWeather(latLon))
        Promise.all(citiesWeatherPrms)
            .then(citiesWeather => {
                citiesWeather = citiesWeather.map(cityPrm => getFormattedDailyWeather(cityPrm))
                const citiesByDay = getForcastByDay(citiesWeather)
                // writeToCsv(citiesWeather)
                writeToCsv(citiesByDay)
            })
    })
        .catch(err => { console.log('Error =>', err); })
}

function getCityWeather({ data }) {
    let [latLon] = data
    const { lat, lon } = latLon
    return axios.get(`https://api.openweathermap.org/data/2.5/onecall?lat=${lat}&lon=${lon}&exclude=minutely,hourly&appid=${API_KEY}`)
}

function getCityLatLon(cityName) {
    return axios.get(`http://api.openweathermap.org/geo/1.0/direct?q=${cityName}&appid=${API_KEY}`)
}

function getFormattedDailyWeather({ data }) {
    return data.daily.slice(0, 5).map(
        daily => ({
            name: getCityName(data.timezone),
            date: daily.dt * 1000,
            temp: { min: daily.temp.min, max: daily.temp.max,day:daily.temp.day },
            isRain: daily.weather.some(w => w.main === 'Rain')
        })
    )
}

function getForcastByDay(cities) {
    if (!cities[0]) return
    const days = cities[0].map((d) => ({
        date: getFormattedDate(d.date),
        maxTempCity: { temp: d.temp.max, name: d.name },
        minTempCity: { temp: d.temp.min, name: d.name },
        citiesForecast:[],
        citiesWithRain: []
    }))
    cities.forEach(city => {
        city.forEach(({ temp, isRain, name }, idx) => {
            const currDay = days[idx]
            currDay.citiesForecast.push({name,temp:temp.day})
            if (temp.max > currDay.maxTempCity.temp) currDay.maxTempCity = { temp: temp.max, name }
            if (temp.min < currDay.minTempCity.temp) currDay.minTempCity = { temp: temp.min, name }
            if (isRain) currDay.citiesWithRain.push(name)
        })
    })
    return days
}

function getCityName(timezone) {
    const idx = timezone.indexOf('/')
    return timezone.slice(idx + 1).replace('_', ' ')
}

function getFormattedDate(timestamp) {
  return new Date(timestamp).toLocaleString('en-US',{weekday:'long',day:'numeric',month:'numeric',year:'numeric'})
}

async function writeToCsv(cities) {
    const csv = new ObjectsToCsv(cities)
    await csv.toDisk('./list.csv')
}

getCitiesWeather()