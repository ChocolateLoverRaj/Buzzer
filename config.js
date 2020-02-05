//Configurations

const config = {
    port: process.env.PORT ? process.env.PORT : 2000,
    passwordLength: 10,
    animals: ["Panther", "Zebra", "Elephant", "Racoon", "Cat", "Dog", "Lion", "Snake", "Dolphin", "Seahorse", "Narwhale", "Goldfish", "Polar Bear", "Penguin"],
    timeout: 1000 * 30
};

//Export the module
module.exports = config;