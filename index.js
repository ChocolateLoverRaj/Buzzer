//Primary file

//Dependancies
const express = require('express');
const http = require('http');
const path = require('path');
const config = require("./config");
const helpers = require("./lib/helpers");

//Get the express app
const app = express();

//create a server
const server = http.Server(app);

//Buzzers
const buzzers = {
    games: {},
    hostPasswords: {},
    playerPasswords: {}
};

//Static html files
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "./pages/index.html"));
});
app.get("/create", (req, res) => {
    res.sendFile(path.join(__dirname, "./pages/create.html"));
});
app.get("/join", (req, res) => {
    res.sendFile(path.join(__dirname, "./pages/join.html"));
});

//Logic

//Create a host
app.post("/api/host", (req, res) => {
    //Assign a random id to the game, making sure it is unique
    var randomId;
    do {
        randomId = helpers.randomString(6);
    } while (randomId in buzzers.games);

    //Assign a random password to the person, making sure it is unique
    var password;
    do {
        password = helpers.randomString(config.passwordLength);
    } while (password in buzzers.hostPasswords);

    //Create a game, host, and password
    buzzers.games[randomId] = {
        password: password,
        animals: [],
        players: {}
    };
    buzzers.hostPasswords[password] = randomId;

    //Send the info to client
    res.json({
        id: randomId,
        password: password
    });

    //Send
    res.end();
});

//Get host info
app.get("/api/host", (req, res) => {
    //Check the password
    if (req.headers.password in buzzers.hostPasswords) {
        //Find the game associated with the password
        var game = buzzers.games[buzzers.hostPasswords[req.headers.password]];
        //Send details
        res.json({
            id: buzzers.hostPasswords[req.headers.password]
        });

        //Send
        res.end();
    }
    else {
        res.sendStatus(404);
    }
});

//Join a host
app.post("/api/join", (req, res) => {
    //Check if the host exists
    if (req.query.game in buzzers.games) {
        //Assign a random password to the person, making sure it is unique
        var password;
        do {
            password = helpers.randomString(config.passwordLength);
        } while (password in buzzers.playerPasswords);

        //Assign a random animal to the person, making sure it is unique
        var animal;
        if (buzzers.games[req.query.game].animals.length < config.animals.length) {
            do {
                animal = config.animals[Math.floor(Math.random() * config.animals.length)];
            } while (buzzers.games[req.query.game].animals.includes(animal));

            //Add the animal and the player to game
            buzzers.games[req.query.game].animals.push(animal);
            buzzers.games[req.query.game].players[password] = animal;
            buzzers.playerPasswords[password] = {
                game: req.query.game,
                animal: animal
            };

            //Send the info to client
            res.json({
                password: password
            });

            //Send
            res.end();
        }
        else {
            res.sendStatus(429);
        }
    }
    else {
        res.sendStatus(404);
    }
});

//Play a host
app.get("/api/join", (req, res) => {
    //Check password
    if (buzzers.playerPasswords[req.headers.password]) {
        //Send their info
        res.json(buzzers.playerPasswords[req.headers.password]);
    }
    else {
        res.sendStatus(404);
    }
});

server.listen(config.port);
console.log("Server is listening on port " + config.port);