// ============== Packages ==============================

const express = require('express');
const cors = require('cors');
const superagent = require('superagent');
require('dotenv').config();
const pg = require('pg');




// =================== App ===================================

const app = express(); // express() will return a fully ready to run server object
app.use(cors()); // enables local processes to talk to the server // Cross Origin Resource Sharing
const PORT = process.env.PORT || 3434; // process.env is boilerplace the variable name is potato

const client = new pg.Client(process.env.DATABASE_URL);
client.on('error', err => console.log(err));



// ============== Routes ================================
const parkKey = process.env.PARKS_API_KEY;
const yelpKey = process.env.YELP_API_KEY;
const movieKey = process.env.MOVIE_API_KEY;


app.get('/location', locationCallBack);
app.get('/weather', weatherCallBack);
app.get('/movies', moviesCallBack);
app.get('/parks', parkCallBack);
app.get('/yelp', yelpCallBack);


function locationCallBack(req, res) {
  const sqlString = 'SELECT * FROM city_explorer_table WHERE search_query = $1';
  const sqlArray = [req.query.city];
  client.query(sqlString, sqlArray)
    .then(dataFromDatabase => {
      if (dataFromDatabase.rows.length > 0) {
        res.send(dataFromDatabase.rows[0]);
        console.log(dataFromDatabase);
      } else {
        const city = req.query.city;
        const url = `https://us1.locationiq.com/v1/search.php?key=${process.env.GEOCODE_API_KEY}&q=${city}&format=json`;
        superagent.get(url)
          .then(whatComesBack => {
            let locationOne = new Location(whatComesBack.body, req.query.city);
            res.send(locationOne);
            //save info in database
            const sqlInsert = 'INSERT INTO city_explorer_table (search_query, formatted_query, latitude, longitude) VALUES ($1, $2, $3, $4)';
            const savedValues = [locationOne.search_query, locationOne.formatted_query, locationOne.latitude, locationOne.longitude];
            console.log(locationOne);
            client.query(sqlInsert, savedValues);
          })
          .catch(error => {
            'Not functioning properly', error;
          });
      }
    });
}
function Location(dataFromFile, cityName) {
  this.search_query = cityName;
  this.formatted_query = dataFromFile[0].display_name;
  this.latitude = dataFromFile[0].lat;
  this.longitude = dataFromFile[0].lon;
}

function weatherCallBack(req, res) {
  const url = `https://api.weatherbit.io/v2.0/forecast/daily?lat=${req.query.latitude}&lon=${req.query.longitude}&key=${process.env.WEATHER_API_KEY}&days=8
  `;
  superagent.get(url)
    .then(whatComesBack => {
      let weeklyForecast = new GetForecast(whatComesBack.body);
      res.send(weeklyForecast);
    })
    .catch(error => {
      'Not functioning properly', error;
    });
}
function GetForecast(weatherData) {
  function parseWeather(weatherItem) {
    let description = weatherItem.weather.description;
    let time = weatherItem.datetime;
    return new Weather(description, time);
  }
  return weatherData.data.map(parseWeather);
}

function Weather(description, time) {
  this.forecast = description;
  this.time = time;
}


function parkCallBack(req, res) {
  const url = `https://developer.nps.gov/api/v1/parks?q=${req.query.search_query}&api_key=${parkKey}`;
  superagent.get(url)
    .then((result => {
      let nearestParks = new ParkList(result.body.data);
      res.send(nearestParks);
    }))
    .catch(error => {
      res.send('Broken! Try again later!', error);
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

function yelpCallBack(req, res) {
  const setPage = (req.query.page - 1) * 5;
  const url = `https://api.yelp.com/v3/businesses/search?term=restaurant&location=${req.query.search_query}&limit=5&offset=${setPage}`;
  superagent.get(url)
    .set('Authorization', `Bearer ${yelpKey}`)
    .then(yelpData => {
      const output = yelpData.body.businesses.map(restaurant => new RestaurantList(restaurant));
      res.send(output);
    })
    .catch(error => {
      res.send('Broken! Try again later!', error);
    });
}
function RestaurantList(object) {
  this.name = object.name;
  this.image_url = object.image_url;
  this.price = object.price;
  this.rating = object.rating;
  this.url = object.url;
}

function moviesCallBack(req, res) {
  const url = `https://api.themoviedb.org/3/search/movie?api_key=${movieKey}&query=${req.query.search_query}`;
  superagent.get(url)
    .then(movieData => {
      const movieOutput = movieData.body.results.map(movie => new Movie(movie));
      res.send(movieOutput);
    })
    .catch(error => {
      res.send('Broken! Try again later!', error);
    });
}

function Movie(object){
  this.title = object.original_title;
  this.overview = object.overview;
  this.average_votes = object.vote_average;
  this.total_votes = object.vote_count;
  this.image_url = `https://image.tmdb.org/t/p/w500/${object.poster_path}`;
  this.popularity = object.popularity;
  this.released_on = object.release_date;
}


// ============== Initialization ========================


client.connect()// I can visit this server athttp://localhost:3434 
  .then(() => {
    app.listen(PORT, () => console.log(`app is up on port http://localhost:${PORT}`));
  });


