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

//Game classes
class Game {
    constructor() {
        this.id;
        this.host;
        this.players = {};
        this.animals = {};
        this.animalCount = 0;
    }
}

class Host {
    constructor() {
        this.game = {};
        this.password;
    }
}

class Player {
    constructor() {
        this.password;
        this.animal;
        this.game = {};
    }
}

class Animal {
    constructor() {
        this.name;
        this.player;
    }
}

//Buzzers
const buzzers = {
    games: {},
    hosts: {},
    players: {}
};

//Static files
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "./pages/index.html"));
});
app.get("/create", (req, res) => {
    res.sendFile(path.join(__dirname, "./pages/create.html"));
});
app.get("/host", (req, res) => {
    res.sendFile(path.join(__dirname, "./pages/host.html"));
});
app.get("/join", (req, res) => {
    res.sendFile(path.join(__dirname, "./pages/join.html"));
});
app.get("/app.js", (req, res) => {
    res.sendFile(path.join(__dirname, "./pages/app.js"));
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
    } while (password in buzzers.hosts);

    //Create a game and a host
    var game = buzzers.games[randomId] = new Game();
    var host = buzzers.hosts[password] = new Host();

    game.id = randomId,
        game.host = host;
    host.game = game;
    host.password = password;

    //Assign them to the buzzer object
    buzzers.games[randomId] = game;
    buzzers.hosts[password] = host;

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
    if (req.headers.password in buzzers.hosts) {
        //Send the host the game id
        res.json({
            id: buzzers.hosts[req.headers.password].game.id
        });

        //Send
        res.end();
    }
    else {
        res.sendStatus(404);
    }
});

//Join a game
app.post("/api/join", (req, res) => {
    //Check if the host exists
    if (req.query.game in buzzers.games) {
        //Assign a random password to the person, making sure it is unique
        var password;
        do {
            password = helpers.randomString(config.passwordLength);
        } while (password in buzzers.players);

        //Assign a random animalName to the person, making sure it is unique
        if (buzzers.games[req.query.game].animalCount < config.animals.length) {
            var animalName;
            do {
                animalName = config.animals[Math.floor(Math.random() * config.animals.length)];
            } while (animalName in buzzers.games[req.query.game].animals);

            //Add the animal and the player to game
            var player = new Player();
            var animal = new Animal();

            player.animal = animal;
            player.password = password;
            player.game = buzzers.games[req.query.game];
            animal.name = animalName;
            animal.player = player;

            buzzers.games[req.query.game].animalCount++;
            buzzers.games[req.query.game].animals[animalName] = animal;
            buzzers.games[req.query.game].players[animalName] = player;
            buzzers.players[password] = player;

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

//Play a game
app.get("/api/join", (req, res) => {
    //Check password
    if (buzzers.players[req.headers.password]) {
        //Send their info
        res.json({
            animal: buzzers.players[req.headers.password].animal.name,
            game: buzzers.players[req.headers.password].game.id
        });
    }
    else {
        res.sendStatus(404);
    }
});

server.listen(config.port);
console.log("Server is listening on port " + config.port);