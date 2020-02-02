//Primary file

//Dependancies
const express = require('express');
const http = require('http');
const config = require("./config");

//Get the express app
const app = express();
//create a server
const server = http.Server(app);

app.get('/', (req, res) => {
    res.send("Hello Web");
})

server.listen(config.port);
console.log("Server is listening on port " + config.port);