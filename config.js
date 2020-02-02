//Configurations

const config = {
    port: process.env.PORT ? process.env.PORT : 2000,
    passwordLength: 10,
    animals: ["cat", "elephant", "zebra", "wolf", "shark", "snake", "dolphin", "eagle"]
};

//Export the module
module.exports = config;