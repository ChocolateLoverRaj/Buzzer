//Primary file

//Dependancies
const express = require('express');
const http = require('http');
const path = require('path');
const config = require("./config");

//Get the express app
const app = express();

//create a server
const server = http.Server(app);

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

server.listen(config.port);
console.log("Server is listening on port " + config.port);