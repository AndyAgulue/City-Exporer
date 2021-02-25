// ============== Packages ==============================

const express = require('express');
const cors = require('cors');
const superagent = require('superagent');
require('dotenv').config(); 
const pg = require('pg');



// ============== App ===================================

const app = express(); // express() will return a fully ready to run server object
app.use(cors()); // enables local processes to talk to the server // Cross Origin Resource Sharing
const PORT = process.env.PORT || 3434; // process.env is boilerplace the variable name is potato

const client = new pg.Client(process.env.DATABASE_URL);
client.on('error', err => console.log(err));


// ============== Routes ================================
//const locationData = require('./data/location.json');
//const weatherData = require('./data/weather.json');
//const { response } = require('express');


app.get('/location', locationCallBack);
function locationCallBack(req, res) {
  const city = req.query.city;
  const url = `https://us1.locationiq.com/v1/search.php?key=${process.env.GEOCODE_API_KEY}&q=${city}&format=json`;
  superagent.get(url)
    .then(whatComesBack => {
      let locationOne = new Location(whatComesBack.body, req.query.city);
      res.send(locationOne);
    })
    .catch(error => {
      'Not functioning properly';
    });
}

// app.get('/movies', (req, res, next)=> {
//   console.log('moviesCallBack');
//   res.send({});
// });

app.get('/weather', weatherCallBack);
function weatherCallBack(req, res) {
  const url = `https://api.weatherbit.io/v2.0/forecast/daily?lat=${req.query.latitude}&lon=${req.query.longitude}&key=${process.env.WEATHER_API_KEY}&days=8
  `;
  superagent.get(url).then(whatComesBack => {
    let weeklyForecast = new getForecast(whatComesBack.body);
    res.send(weeklyForecast);
  })
    .catch(error => {
      'Not functioning properly';
    });
}

function getForecast(weatherData) {
  function parseWeather(weatherItem) {
    let description = weatherItem.weather.description;
    let time = weatherItem.datetime;
    return new Weather(description, time);
  }
  return weatherData.data.map(parseWeather);
}
// app.get('/yelp', (req, res, next)=> {
//   console.log('yelpCallBack');
//   res.send({});
// });
// app.get('/parks', (req, res, next)=> {
//   console.log('parksCallBack');
//   res.send({});
// });

function Location(dataFromFile, cityName) {
  this.search_query = cityName;
  this.formatted_query = dataFromFile[0].display_name;
  this.latitude = dataFromFile[0].lat;
  this.longitude = dataFromFile[0].lon;
}

function Weather(description, time) {
  this.forecast = description;
  this.time = time;
}


const parkKey = process.env.PARKS_API_KEY;
app.get('/parks', parkCallBack);
function parkCallBack(req, res) {
  const url = `https://developer.nps.gov/api/v1/parks?q=${req.query.search_query}&api_key=${parkKey}`;
  superagent.get(url)
    .then((result => {
      let nearestParks = new ParkList(result.body.data);
      res.send(nearestParks);
    }))
    .catch(error => {
      res.send("Broken! Try again later!");
    });
}

function ParkList(parkData) {
  return parkData.map(data => {
    return new Park(data.fullName,
      data.addresses[0].line1,
      data.entranceFees[0].cost,
      data.description,
      data.url);
  });
}

function Park(name, address, fee, description, url) {
  this.name = name;
  this.address = address;
  this.fee = fee;
  this.description = description;
  this.url = url;
}


// ============== Initialization ========================

// I can visit this server at http://localhost:3434
client.connect()
  .then(()=>{
    app.listen(PORT, () => console.log(`app is up on port http://localhost:${PORT}`));
  });


