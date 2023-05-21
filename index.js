const express = require('express');
const cors = require('cors');
const MongoClient = require('mongodb').MongoClient;
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

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
const bcrypt = require('bcrypt');

app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  
  // Save new player to the database
  const player = { username, password: hashedPassword };
  await client.db("game_db").collection("players").insertOne(player);
  
  // Generate a token and return it
  const token = jwt.sign({ username }, process.env.JWT_SECRET);
  res.json({ token });
});

const { v4: uuidv4 } = require('uuid');

app.post('/game', async (req, res) => {
  const token = req.headers['authorization'];
  const decoded = jwt.verify(token, process.env.JWT_SECRET);

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

