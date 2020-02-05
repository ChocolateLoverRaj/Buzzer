//Primary file

//Dependancies
const express = require('express');
const favicon = require('express-favicon');
const socketIO = require('socket.io');
const http = require('http');
const path = require('path');
const config = require("./config");
const helpers = require("./lib/helpers");

//Get the express app
const app = express();

//create a server
const server = http.Server(app);

//Get the socket io
const io = socketIO(server);

//Buzzers
const buzzers = {
    games: {},
    hosts: {},
    players: {}
};

//Game classes
class Game {
    constructor() {
        this.id;
        this.host;
        this.players = {};
        this.animals = {};
        this.animalCount = 0;
        this.joiningAllowed = true;
        this.buzzes = [];
    }
    delete() {
        //Boot host from socket
        if (this.host.socket.disconnect) {
            this.host.socket.disconnect();
        }

        //Notify players
        for (let animal in this.players) {
            if (this.players[animal].socket.emit) {
                this.players[animal].socket.emit("disbanded");
            }
        }

        //Delete all outside references
        for (var animalName in this.players) {
            this.players[animalName].delete();
        }
        delete buzzers.games[this.id];

        //Delete self references
        delete buzzers.hosts[this.host.password];
        clearTimeout(this.host.disconnectTimeout);
        delete this.host;
    }
    onBuzz(animal, endTime) {
        //Make sure that the time hasn't expired
        if (Date.now() < endTime) {
            //Echo back
            this.players[animal].socket.emit("buzzed");
            //Add to list of animals
            this.buzzes.push(animal);
            //Send the list to the host
            if (this.host.socket.emit) {
                this.host.socket.emit("results", this.buzzes);
            }
        }
    }
    enableBuzzing() {
        //Reset the buzzes
        this.buzzes = [];
        //Start time
        var startTime = Date.now() + 1000;
        for (let animal in this.players) {
            if (this.players[animal].socket.once) {
                this.players[animal].socket.emit("canBuzz", startTime);
                //Start checking for the buzz at start time
                setTimeout(() => {
                    this.players[animal].socket.once("buzz", this.onBuzz.bind(this, animal, startTime + 5000));
                }, startTime - Date.now());
            }
        }
        //End after 5 seconds after start time
        setTimeout(() => {
            //Send done
            if (this.host.socket.emit) {
                this.host.socket.emit("done");
            }
        }, (startTime + 1000 * 5) - Date.now());
    }
}

class Host {
    constructor() {
        this.game = new Game();
        this.password;
        this.socket = {};
        this.disconnectTimeout;
        this.startTimeout();
    }
    disconnection() {
        this.game.delete();
    }
    cancelTimeout() {
        //Clear the old timeout
        clearTimeout(this.disconnectTimeout);
    }
    startTimeout() {
        //Start new timeout
        this.disconnectTimeout = setTimeout(this.disconnection.bind(this), config.timeout);
    }
}

class Player {
    constructor() {
        this.password;
        this.animal;
        this.game = {};
        this.socket = {};
        this.startTimeout();
    }
    delete() {
        //Boot player from socket
        if (this.socket.disconnect) {
            this.socket.disconnect();
        }

        //Delete all outside references
        delete buzzers.games[this.game.id].players[this.animal.name];

        //Notify the host
        var game = this.game;
        if (game.host.socket.emit) {
            var players = [];
            for (var animal in game.players) {
                players.push(animal);
            }
            game.host.socket.emit("players", players);
        }

        //Continue deleting all outside references
        delete buzzers.games[this.game.id].animals[this.animal.name];
        buzzers.games[this.game.id].animalCount--;
        delete buzzers.players[this.password];

        //Delete self references
        delete this.socket;
        delete this.game;
        delete this.animal;
        clearTimeout(this.disconnectTimeout);
    }
    disconnection() {
        this.delete();
    }
    cancelTimeout() {
        //Clear the old timeout
        clearTimeout(this.disconnectTimeout);
    }
    startTimeout() {
        //Start new timeout
        this.disconnectTimeout = setTimeout(this.disconnection.bind(this), config.timeout);
    }
}

class Animal {
    constructor() {
        this.name;
        this.player;
    }
}

//Favicon
app.use(favicon(__dirname + "/pages/favicon.ico"));

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
app.get("/play", (req, res) => {
    res.sendFile(path.join(__dirname, "./pages/play.html"));
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
            id: buzzers.hosts[req.headers.password].game.id,
            joiningAllowed: buzzers.hosts[req.headers.password].game.joiningAllowed
        });

        //Send
        res.end();
    }
    else {
        res.sendStatus(404);
    }
});

//Change settings
app.put("/api/host", (req, res) => {
    //Check the password
    if (req.headers.password in buzzers.hosts) {
        //Check the enabled
        if (req.query.enabled == "true") {
            buzzers.hosts[req.headers.password].game.joiningAllowed = true;
            res.sendStatus(200);
        }
        else if (req.query.enabled == "false") {
            buzzers.hosts[req.headers.password].game.joiningAllowed = false;
            res.sendStatus(200);
        }
        else {
            res.sendStatus(400);
        }
    }
    else {
        res.sendStatus(404);
    }
});

//Enable buzzing
app.post("/api/start", (req, res) => {
    //Check the password
    if (req.headers.password in buzzers.hosts) {
        //Start buzz
        buzzers.hosts[req.headers.password].game.enableBuzzing();

        //Send
        res.end();
    }
    else {
        res.sendStatus(404);
    }
});

//Disband a game
app.delete("/api/host", (req, res) => {
    //Check the password
    if (req.headers.password in buzzers.hosts) {
        //Delete the game, host, and all the players in the game
        buzzers.hosts[req.headers.password].game.delete();

        //Send
        res.sendStatus(200);
    }
    else {
        res.sendStatus(404);
    }
});

//Join a game
app.post("/api/join", (req, res) => {
    //Check if the host exists
    if (req.query.game in buzzers.games) {
        //Make sure joining is allowed
        if (buzzers.games[req.query.game].joiningAllowed) {
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
            res.sendStatus(403);
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

//Leave a game
app.delete("/api/join", (req, res) => {
    //Check password
    if (buzzers.players[req.headers.password]) {
        //Delete them and their animal
        var player = buzzers.players[req.headers.password];
        var game = player.game;
        player.delete();

        res.sendStatus(200);
    }
    else {
        res.sendStatus(404);
    }
});

//Handle sockets
io.sockets.on("connection", socket => {
    //Listen for password
    socket.once("password", data => {
        if (data.password) {
            if (data.type == "host") {
                //Try to find that host
                if (data.password in buzzers.hosts) {
                    //Connect the socket
                    buzzers.hosts[data.password].socket = socket;
                    //Cancel the timeout
                    buzzers.hosts[data.password].cancelTimeout();
                    //When they leave, start the timeout again
                    socket.once("disconnect", () => {
                        buzzers.hosts[data.password].startTimeout();
                    });
                    //Notify the host of players joined
                    var game = buzzers.hosts[data.password].game;
                    if (game.host.socket.emit) {
                        var players = [];
                        for (var animal in game.players) {
                            players.push(animal);
                        }
                        game.host.socket.emit("players", players);
                    }
                }
            }
            else if (data.type == "player") {
                //Try to find that player
                if (data.password in buzzers.players) {
                    //Connect the socket
                    buzzers.players[data.password].socket = socket;
                    //Cancel the timeout
                    buzzers.players[data.password].cancelTimeout();
                    //When they leave, start the timeout again
                    socket.once("disconnect", () => {
                        buzzers.players[data.password].startTimeout();
                    });
                    //Notify the host
                    var game = buzzers.players[data.password].game;
                    if (game.host.socket.emit) {
                        var players = [];
                        for (var animal in game.players) {
                            players.push(animal);
                        }
                        game.host.socket.emit("players", players);
                    }
                }
            }
        }
    });
});

server.listen(config.port);
console.log("Server is listening on port " + config.port);