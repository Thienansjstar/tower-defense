const path = require('path');
const jsdom = require('jsdom');

const express = require('express');
const app = express();
const server = require('http').Server(app);

const DatauriParser = require("datauri/parser");
const { Socket } = require('engine.io');


const myServer = server.listen(process.env.PORT || 3000, function () {
    console.log(`Listening on ${server.address().port}`);
});;

const { Server } = require("socket.io");
const io = new Server(myServer);

const parser = new DatauriParser();

const questions = require("./questions.json");
const store = require("./store.json");
const crates = require("./crates.json");

const { all } = require("proxy-addr");

function shuffle(array) {
    let currentIndex = array.length, randomIndex;
    while (currentIndex != 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [array[currentIndex], array[randomIndex]] = [
            array[randomIndex], array[currentIndex]];
    }
    return array;
}

const { JSDOM } = jsdom;

app.use(express.static(__dirname + '/public'));

app.get('/play', function (req, res) {
    res.sendFile(__dirname + '/public/play.html');
});

app.get('/game', function (req, res) {
    res.sendFile(__dirname + '/public/game.html');
});

function makePurchase(socket, item) {
    if (!item) return false;
    if (socket.money >= item.price) {
        socket.money -= item.price;
        socket.emit("money update", socket.money);
        return true;
    } else {
        return false;
    }
}

io.on('connection', function (socket) {
    console.log('a user connected');
    socket.qs = questions;
    socket.store = store;
    socket.money = 0;
    socket.canAnswer = true;
    socket.purchases = [];
    socket.protectionLevel = 1;
    socket.incomeLevel = 1;
    socket.incomeBoost = 1;
    socket.crateLevel = 1;

    socket.on('disconnect', function () {
        if (socket == io.gameBoard) {
            io.gameBoard = null;
        }
        console.log('user disconnected');
    });

    socket.on('enemy reached', function ({id, hpRatio}) {
        if (socket == io.gameBoard) {
            const socketAchieved = io.sockets.sockets.get(id);
            if (!socketAchieved) return;
            const earned = Math.round(hpRatio * 1000) * socketAchieved.incomeLevel * socketAchieved.incomeBoost;
            socketAchieved.money += earned;
            socketAchieved.emit("game message", {
                type: "positive",
                msg: "You earned " + earned + " coins since one of your balloons reached the fort!"
            });
            socketAchieved.emit("money update", socketAchieved.money);
        }
    });

    socket.on("authenticate", function(key) {
        if (key == "phaserGameKey****39" && !io.gameBoard) {
            io.gameBoard = socket;
        }
    });

    socket.on("game action", function ([action, cooldown, btn]) {
        if (!io.gameBoard) return socket.emit("game message", {
            type: "error",
            msg: "The host is not connected."
        });
        if (action == "spawn balloon") {
            const attempt = makePurchase(socket, socket.store["Spawn Balloon"]);
            if (!attempt) return socket.emit("game message", {
                type: "error",
                msg: "You do not have enough money!"
            });
            socket.emit("cooldown", [cooldown, btn]);
            io.gameBoard.emit("spawn balloon", {
                level: socket.protectionLevel,
                hp: socket.store["Upgrade Protection"].levels[socket.protectionLevel - 1].hp,
                id: socket.id
            });
            socket.emit("game message", {
                type: "positive",
                msg: "Balloon sent to battle!"
            });
        } else if (action == "sabotage") {
            const attempt = makePurchase(socket, socket.store["Sabotage Tower"]);
            if (!attempt) return socket.emit("game message", {
                type: "error",
                msg: "You do not have enough money!"
            });
            socket.emit("cooldown", [cooldown, btn]);
            io.gameBoard.emit("sabotage");
            socket.emit("game message", {
                type: "positive",
                msg: "A tower was successfully sabotaged!"
            });
        } else if (action == "freeze") {
            const attempt = makePurchase(socket, socket.store["Freeze Screen"]);
            if (!attempt) return socket.emit("game message", {
                type: "error",
                msg: "You do not have enough money!"
            });
            io.gameBoard.emit("freeze");
            for (const [_, socketB] of io.of("/").sockets) {
                socketB.emit("cooldown", [cooldown, btn]);
                socketB.emit("game message", {
                    type: "positive",
                    msg: `The enemy's screen was frozen by ${socket.username}!`
                });
            }
        } else if (action == "open crate") {
            const crateTypes = [...crates].map(crate => [crate.name, crate.chances[socket.crateLevel-1]]);
            const guess = Math.random() * 100;
            let count = 0, selected;
            for (const crateType of crateTypes) {
                count += crateType[1];
                if (guess < count) {
                    selected = crateType[0];
                    break;
                }
            }
            const match = crates.find(crate => crate.name == selected);
            if (!match) return;
            if (match.subchances) {
                const crateTypes = match.subchances;
                const guess = Math.random() * 100;
                let count = 0, selected;
                for (const crateType of crateTypes) {
                    count += crateType.chances[socket.crateLevel-1];
                    if (guess < count) {
                        selected = crateType;
                        break;
                    }
                }
                if (match.name == "Free Money") {
                    socket.money += selected.amount;
                    socket.emit("money update", socket.money);
                    selected.name = "Free Money ("+selected.amount+" coins)";
                } else if (match.name == "Income Multiplier") {
                    socket.incomeBoost *= selected.magnitude;
                    selected.name = selected.time+"s Income Multiplier (x"+selected.magnitude+")";
                    setTimeout(function() {
                        socket.incomeBoost /= selected.magnitude;
                    }, selected.time * 1000);
                }
                socket.emit("crate opened", {
                    name: selected.name,
                    texture: selected.texture
                });
            } else {
                if (match.name == "Free Sabotage") {
                    io.gameBoard.emit("sabotage");
                } else if (match.name == "Free Freeze") {
                    io.gameBoard.emit("freeze");
                } else if (match.name == "Millionaire") {
                    socket.money += 1000000;
                    socket.emit("money update", socket.money);
                }
                socket.emit("crate opened", match);
            }
        } else if (action == "buy prot") {
            const attempt = makePurchase(socket, socket.store["Upgrade Protection"].levels[socket.protectionLevel]);
            if (!attempt) return socket.emit("game message", {
                type: "error",
                msg: "You do not have enough money!"
            });
            socket.emit("cooldown", [cooldown, btn]);
            socket.emit("game message", {
                type: "positive",
                msg: "Upgrade purchased!"
            });
            socket.emit("level update", {
                type: "prot",
                level: ++socket.protectionLevel,
                price: socket.store["Upgrade Protection"].levels[socket.protectionLevel] ? socket.store["Upgrade Protection"].levels[socket.protectionLevel].price : "Maxed out"
            });
        } else if (action == "buy boost") {
            const attempt = makePurchase(socket, socket.store["Boost Income"].levels[socket.incomeLevel]);
            if (!attempt) return socket.emit("game message", {
                type: "error",
                msg: "You do not have enough money!"
            });
            socket.emit("cooldown", [cooldown, btn]);
            socket.emit("game message", {
                type: "positive",
                msg: "Upgrade purchased!"
            });
            socket.emit("level update", {
                type: "boost",
                level: ++socket.incomeLevel,
                price: socket.store["Boost Income"].levels[socket.incomeLevel] ? socket.store["Boost Income"].levels[socket.incomeLevel].price : "Maxed out"
            });
        } else if (action == "buy luck") {
            const attempt = makePurchase(socket, socket.store["Increase Crate Luck"].levels[socket.crateLevel]);
            if (!attempt) return socket.emit("game message", {
                type: "error",
                msg: "You do not have enough money!"
            });
            socket.emit("cooldown", [cooldown, btn]);
            socket.emit("game message", {
                type: "positive",
                msg: "Upgrade purchased!"
            });
            socket.emit("level update", {
                type: "crate",
                level: ++socket.crateLevel,
                price: socket.store["Increase Crate Luck"].levels[socket.crateLevel] ? socket.store["Increase Crate Luck"].levels[socket.crateLevel].price : "Maxed out"
            });
        }
    });

    socket.on("request question", function (difficulty) {
        if (!socket.canAnswer) return;
        const qList = socket.qs.filter(q => q.difficulty == difficulty);
        if (qList.length == 0) return socket.emit("finished");
        let q = qList[Math.floor(Math.random() * qList.length)];
        let { task } = q;
        let choices = [...q.incorrect];
        choices.push(q.correct);
        choices = shuffle(choices);
        socket.emit("send question", { task, choices });
        socket.canAnswer = true;
    });

    socket.on("check answer", function ({ task, choice }) {
        console.log("User selected " + choice + " for " + task);
        const match = socket.qs.find(q => q.task.id == task);
        if (!match) return socket.emit("question score", false);
        const accuracy = match.correct.id == choice;
        let money = accuracy ? match.money : 0;
        socket.money += money * socket.incomeLevel * socket.incomeBoost;
        socket.emit("money update", socket.money);
        socket.canAnswer = true;
        socket.qs = socket.qs.filter(qu => qu.task.id != match.task.id);
        return socket.emit("question score", money * socket.incomeLevel * socket.incomeBoost);
    });

    socket.on("username", username => {
        socket.username = username;
    });
});