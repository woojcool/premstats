const path = require("path");
const express = require("express");
const bodyParser = require("body-parser");
const readline = require("readline");
const request = require('request');


const app = express();

app.set("views", path.resolve(__dirname, "templates"));
app.set('view engine', 'ejs');



require('dotenv').config({ path: path.resolve(__dirname, 'credentials/.env') });
const { MongoClient } = require('mongodb');

const userName = process.env.MONGO_DB_USERNAME;
const password = process.env.MONGO_DB_PASSWORD;
const databaseAndCollection = { db: 'CMSC335_DB', collection: 'fixtures' };

const uri = `mongodb+srv://${userName}:${password}@cluster0.hwqtzca.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

async function connectToDB() {
    try {
      await client.connect();
      console.log('Connected successfully to MongoDB');
    } catch (e) {
      console.error('Connection to MongoDB failed:', e);
    }
  }
  
  connectToDB();

  async function addUserFavoriteTeam(email, favoriteTeam, team) {
    try {
        const db = client.db(databaseAndCollection.db);
        const collection = db.collection(databaseAndCollection.collection);
  
        const result = await collection.insertOne({ email, favoriteTeam, team: parseInt(team, 10) });
        console.log(`A document was inserted with the _id: ${result.insertedId}`);
    } catch (e) {
        console.error('Error adding user data:', e);
    }
  }
  

  
  
async function getUserFavoriteTeam(email) {
    try {
        const db = client.db(databaseAndCollection.db);
        const collection = db.collection(databaseAndCollection.collection);

        const user = await collection.findOne({ email });
        console.log('Retrieved user data:', user);
        return user ? { teamName: user.favoriteTeam, team: user.team } : null;
    } catch (e) {
        console.error('Error retrieving user data:', e);
        return null;
    }
}



  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  



  
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));
  

  app.use(express.static('public'));
  
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Server running on port http://localhost:${PORT}`));
  

  app.post('/submit-favorite-team', async (req, res) => {
    const { email, favoriteTeam } = req.body;
    const team = parseInt(req.body.team, 10);
    
    try {
      await addUserFavoriteTeam(email, favoriteTeam, team);
      res.status(200).send('Favorite team added successfully');
      
    } catch (e) {
      res.status(500).send('Error adding favorite team');
    }
  });
  
  
  

  app.get('/get-fixtures', async (req, res) => {
    const { email } = req.query;
  
    try {
      const favoriteTeam = await getUserFavoriteTeam(email);
      
      if (!favoriteTeam) {
        return res.status(404).send('User or favorite team not found');
      }
    } catch (e) {
      res.status(500).send('Error retrieving fixtures');
    }
  });

  app.get('/', (req, res) => {
    res.render('index');
});

app.get('/fixtures', (req, res) => {
    res.render('fixtures');
});


async function fetchTeamStatistics(team, season, league) {
  return new Promise((resolve, reject) => {
      const options = {
          method: 'GET',
          url: 'https://api-football-v1.p.rapidapi.com/v3/teams/statistics',
          qs: { team: team, season: season, league: league },
          headers: {
            'X-RapidAPI-Key': 'e37e44c65amshcf16d5d27a6ea00p10573djsn6b53f7223bba',
            'X-RapidAPI-Host': 'api-football-v1.p.rapidapi.com'
      }
    };

    request(options, function (error, response, body) {
      if (error) {
          console.error('API Request Error:', error);
          reject(new Error(error));
      } else {
          console.log('API Response:', body); 
          resolve(JSON.parse(body));
      }
  });
  });
}



app.post('/show-statistics', async (req, res) => {
  const { email } = req.body;
  const season = 2023; 
  const league = 39;  // premier league

  try {
      const user = await getUserFavoriteTeam(email);

      if (!user) {
          return res.status(404).send('User or favorite team not found');
      }

      const statisticsData = await fetchTeamStatistics(user.team, season, league);

      res.render('show-statistics', { stats: statisticsData.response });
  } catch (e) {
      res.status(500).send('Error retrieving team statistics');
  }
});
