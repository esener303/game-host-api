const express = require('express');
const cors = require('cors');
const MongoClient = require('mongodb').MongoClient;
require('dotenv').config();
const port = process.env.PORT || 3000;

const app = express();
app.use(cors());
app.use(express.json());

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true});

client.connect(err => {
  if (err) throw err;
  console.log("Connected to MongoDB");
});

const gameSchema = {
  gameId: String,
  randomNumber: Number,
  status: String, // 'active' or 'finished'
  playerId: String,
};

const jwt = require('jsonwebtoken');

app.get('/', (req, res) => {
  res.send('This site its being left as its is with purpose of testing the game. Call the /register endpoint to create a new user and then /game to create a new game.')
})

app.post('/register', async (req, res) => {
  const username = req.body.username;
  const password = req.body.password;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  
  // Save new player to the database
  const player = { username, password };
  await client.db("game_db").collection("players").insertOne(player);
  
  // Generate a token and return it
  const token = jwt.sign({ username }, process.env.JWT_SECRET);
  res.json({ token });
});

const { v4: uuidv4 } = require('uuid');

app.post('/game', async (req, res) => {
  const token = req.headers['authorization'];
  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  console.log(decoded);

  if (!decoded || !decoded.username) {
    res.status(401).json({ error: 'Invalid token' });
    return;
  }

  console.log(decoded.username);

  const game = {
    gameId: uuidv4(),
    randomNumber: Math.floor(Math.random() * 10000) + 1,
    status: 'active',
    playerId: decoded.username
  };

  await client.db("game_db").collection("games").insertOne(game);

  res.json({ gameId: game.gameId });
});

app.post('/guess', async (req, res) => {
  const { gameId, guess } = req.body;
  const game = await client.db("game_db").collection("games").findOne({ gameId });

  if (!game) {
    res.status(404).send("Game not found");
    return;
  }

  if (guess === game.randomNumber) {
    game.status = 'finished';
    await client.db("game_db").collection("games").updateOne({ gameId }, game);
    res.send("Equal");
  } else if (guess > game.randomNumber) {
    res.send("Smaller");
  } else {
    res.send("Larger");
  }
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})