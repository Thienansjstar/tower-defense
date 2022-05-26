/**
MAP INFORMATION
* -1 - occupied
 * 0 - empty block
 * 1 - path right
 * 2 - path down
 * 3 - path left
 * 4 - path up
 * 5 - rock
 * 6 - disabled
 */

var map = [[0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
[0, 2, 0, 5, 0, 0, 0, 0, 0, 0, 0, 0],
[0, 1, 1, 1, 1, 1, 1, 1, 1, 2, 0, 5],
[0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0],
[0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0],
[0, 0, 0, 0, 0, 0, 5, 0, 0, 2, 0, 0],
[0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0],
[0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0],
[0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 5, 0],
[0, 5, 0, 0, 0, 0, 0, 0, 6, 2, 6, 0]];

// Starting and ending coordinates
var spawnDirection = "down";

var spawn = [0, 1];
var despawn = [9, 9];
var lastTurn = spawn.valueOf();

var lineStart = [-1, 1];
var lineEnd = [10, 9];

var config = {
    type: Phaser.AUTO,
    parent: 'phaser-example',
    width: 640,
    height: 360,
    backgroundColor: "#212121",
    scene: {
        key: "main",
        preload: preload,
        create: create,
        update: update
    },
    physics: {
        default: 'arcade',
        arcade: {
            debug: false
        }
    },
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    }
};

var game = new Phaser.Game(config);

// Method to draw grid
function drawGrid(game) {
    let direction = spawnDirection.valueOf(), key = "grass";
    for (let i = 0; i < map.length; i++) {
        for (let j = 0; j < map[i].length; j++) {
            let newDirection = "";
            let block = map[i][j];
            if (block == 0) {
                key = "grass";
                newDirection = direction;
            } else if (block == 1) {
                key = "path";
                newDirection = "right";
            } else if (block == 2) {
                key = "path2";
                newDirection = "down";
            } else if (block == 3) {
                key = "path";
                newDirection = "left";
            } else if (block == 4) {
                key = "path";
                newDirection = "up";
            }
            if (block == 6) {
                game.add.image(j * 36, i * 36, "grass").setOrigin(0, 0);
            } else if (block == 5) {
                game.add.image(j * 36, i * 36, "grass").setOrigin(0, 0);
                const rock = game.add.sprite(j * 36, i * 36, "rock").setOrigin(0, 0);
                game.anims.create({
                    key: 'rockAnim',
                    frames: game.anims.generateFrameNumbers("rock", { start: 0, end: 4 }),
                    frameRate: 10,
                    repeat: -1
                });
                rock.play("rockAnim");
            } else if (direction != newDirection) {
                let rotations = 0;
                if (newDirection == "right" && direction == "up") rotations = 1;
                if (newDirection == "left" && direction == "down") rotations = 1;
                if (newDirection == "down" && direction == "right") rotations = 2;
                if (newDirection == "up" && direction == "left") rotations = 2;
                if (newDirection == "up" && direction == "right") rotations = 3;
                if (newDirection == "left" && direction == "down") rotations = 3;
                game.add.image(j * 36 + 18, i * 36 + 18, "corner").setRotation(Math.PI / 2 * rotations);
                lastTurn = [j, i];
                path.lineTo(j * 36 + 18, i * 36 + 18);
                direction = newDirection;
            } else {
                let item = game.add.image(j * 36, i * 36, key).setOrigin(0, 0);
                if (block == 0) {
                    item.setInteractive();

                    let imgPreview, textPreview;
                    item.on("pointerover", () => {
                        if (map[i][j] == 6) return;
                        item.alpha = 0.7;
                        if (map[i][j] == -1) {
                            let cost = calcUpgradeCost(i, j);
                            if (cost > money) return;
                            textPreview = game.add.text(j * 36 + 18, i * 36, cost ? "Upgrade (" + cost + ")" : 'Maxed out')
                                .setFontSize(10)
                                .setBackgroundColor("#000")
                                .setOrigin(0.5, 0.5)
                                .setResolution(1.5);
                        } else {
                            imgPreview = game.add.sprite(j * 36, i * 36, selectedCharacter).setOrigin(0, 0);
                            imgPreview.alpha = 0.7;
                        }
                    });

                    item.on("pointerout", () => {
                        item.alpha = 1;
                        if (imgPreview) imgPreview.destroy();
                        if (textPreview) textPreview.destroy();
                    });

                    item.on("pointerdown", () => {
                        if (map[i][j] == 6) return;
                        let cost = calcUpgradeCost(i, j);
                        if (map[i][j] == -1) {
                            if (!cost) return;
                            upgradeTower(i, j);
                            cost = calcUpgradeCost(i, j);
                            if (cost > money || !cost) return;
                            if (textPreview) textPreview.destroy();
                            textPreview = game.add.text(j * 36 + 18, i * 36, cost ? "Upgrade (" + cost + ")" : 'Maxed out')
                                .setFontSize(10)
                                .setBackgroundColor("#000")
                                .setOrigin(0.5, 0.5)
                                .setResolution(1.5);
                        } else if (map[i][j] == 0) {
                            placeTower(i, j);
                            cost = calcUpgradeCost(i, j);
                            if (cost > money || !cost) return;
                            if (imgPreview) imgPreview.destroy();
                            textPreview = game.add.text(j * 36 + 18, i * 36, cost ? "Upgrade (" + cost + ")" : 'Maxed out')
                                .setFontSize(10)
                                .setBackgroundColor("#000")
                                .setOrigin(0.5, 0.5)
                                .setResolution(1.5);
                        }
                    });
                }
            }
            if (despawn[1] == j && despawn[0] == i) {
                path.lineTo(lineEnd[1] * 36 + 18, lineEnd[0] * 36 + 18);
                game.add.image(j * 36 - 36, i * 36 - 28, "fort").setOrigin(0, 0).setDepth(999);
            }
        }
    }
}

var ENEMY_SPEED = 1 / 10000;

var selectedCharacter = "mort1";

var money = 2500;

var towerPlacements = [];

var getFrames = {
    "merd1": 4,
    "merd2": 5,
    "merd3": 4,
    "red1": 4,
    "red2": 5,
    "red3": 4,
    "green1": 4,
    "green2": 5,
    "green3": 4
}

var towerTypes = [
    {
        "name": "MORT",
        "levels": [
            {
                "level": 1,
                "sprite": "mort1",
                "frames": 3,
                "price": 500,
                "nextPrice": 1000,
                "nextTower": "mort2",
                "fireDistance": 100,
                "fireSpeed": 1000,
                "targets": 1,
                "damageType": 0,
                "damage": 25
            },
            {
                "level": 2,
                "sprite": "mort2",
                "frames": 6,
                "price": 1000,
                "nextPrice": 2500,
                "nextTower": "mort3",
                "fireDistance": 100,
                "fireSpeed": 1500,
                "targets": 1,
                "damageType": 0,
                "damage": 40
            },
            {
                "level": 3,
                "sprite": "mort3",
                "frames": 3,
                "price": 2500,
                "nextPrice": 5000,
                "nextTower": "mort4",
                "fireDistance": 100,
                "fireSpeed": 900,
                "targets": 1,
                "damageType": 0,
                "damage": 80
            },
            {
                "level": 4,
                "sprite": "mort4",
                "frames": 4,
                "price": 5000,
                "nextPrice": null,
                "fireDistance": 100,
                "fireSpeed": 1500,
                "targets": 1,
                "damageType": 0,
                "damage": 120
            }
        ]
    },
    {
        "name": "Tower 2",
        "levels": [
            {
                "level": 1,
                "sprite": "tower2",
                "frames": 4,
                "price": 1000,
                "nextPrice": 2500,
                "nextTower": "tower3",
                "fireDistance": 125,
                "fireSpeed": 500,
                "targets": 3,
                "damageType": 0,
                "damage": 10
            },
            {
                "level": 2,
                "sprite": "tower3",
                "frames": 3,
                "price": 2500,
                "nextPrice": 10000,
                "nextTower": "tower4",
                "fireDistance": 250,
                "fireSpeed": 750,
                "targets": 3,
                "damageType": 0,
                "damage": 30
            },
            {
                "level": 3,
                "sprite": "tower4",
                "frames": 4,
                "price": 10000,
                "nextPrice": null,
                "fireDistance": 500,
                "fireSpeed": 500,
                "targets": 3,
                "damageType": 0,
                "damage": 50
            }
        ]
    },
    {
        "name": "Bomb",
        "levels": [
            {
                "level": 1,
                "sprite": "bomb1",
                "frames": 3,
                "price": 2500,
                "nextPrice": 5000,
                "nextTower": "bomb2",
                "fireDistance": 500,
                "fireSpeed": 5000,
                "targets": 1,
                "damageType": 1,
                "damage": 100
            },
            {
                "level": 2,
                "sprite": "bomb2",
                "frames": 3,
                "price": 5000,
                "nextPrice": 25000,
                "nextTower": "bomb3",
                "fireDistance": 500,
                "fireSpeed": 2500,
                "targets": 1,
                "damageType": 1,
                "damage": 250
            },
            {
                "level": 3,
                "sprite": "bomb3",
                "frames": 4,
                "price": 25000,
                "nextPrice": null,
                "fireDistance": 500,
                "fireSpeed": 1500,
                "targets": 1,
                "damageType": 1,
                "damage": 250
            }
        ]
    }
]

var enemySkin = "merd1";

var hp = 5000;

var Enemy = new Phaser.Class({
    Extends: Phaser.GameObjects.Sprite,
    initialize:
        function Enemy(scene) {
            Phaser.GameObjects.Sprite.call(this, scene, 0, 0, enemySkin);
            this.scene.anims.create({
                key: 'animateEnemy_'+enemySkin,
                frames: this.scene.anims.generateFrameNumbers(enemySkin, { start: 0, end: getFrames[enemySkin] }),
                frameRate: 10,
                repeat: -1
            });
            this.play("animateEnemy_"+enemySkin);
            this.follower = { t: 0, vec: new Phaser.Math.Vector2() };
            this.hp = 100;
            this.maxHp = 100;
            this.id = "";
        },
    startOnPath: function () {
        // set the t parameter at the start of the path
        this.follower.t = 0;

        // get x and y of the given t point            
        path.getPoint(this.follower.t, this.follower.vec);

        // set the x and y of our enemy to the received from the previous step
        this.setPosition(this.follower.vec.x, this.follower.vec.y);

    },
    setHP: function(hp) {
        this.hp = hp;
        this.maxHp = hp;
    },
    setID: function(id) {
        this.id = id;
    },
    receiveDamage: function (damage) {
        this.hp -= damage;

        // if hp drops below 0 we deactivate this enemy
        if (this.hp <= 0) {
            money += Math.round(this.maxHp / 5) * 2;
            this.destroy();
        }
    },
    update: function (time, delta) {
        // move the t point along the path, 0 is the start and 1 is the end
        this.follower.t += ENEMY_SPEED * delta;

        // get the new x and y coordinates in vec
        path.getPoint(this.follower.t, this.follower.vec);

        /*
        let direction = path.getTangent(this.follower.t, this.follower.vec);
        if (direction) {
            if (direction.x == 1 && direction.y == 0) this.setRotation(0);
            if (direction.x == 0 && direction.y == 1) this.setRotation(-Math.PI / 2);
            if (direction.x == 0 && direction.y == -1) this.setRotation(Math.PI / 2);
            if (direction.x == -1 && direction.y == 0) this.setRotation(Math.PI);
        }
        */

        // update enemy x and y to the newly obtained x and y
        this.setPosition(this.follower.vec.x, this.follower.vec.y);
        // if we have reached the end of the path, remove the enemy
        if (this.follower.t >= 1) {
            socket.emit("enemy reached", { id: this.id, hpRatio: this.hp / this.maxHp });
            hp -= this.hp;
            this.destroy();
        }
    }
});

var Tower = new Phaser.Class({
    Extends: Phaser.GameObjects.Sprite,
    initialize:
        function Tower(scene) {
            Phaser.GameObjects.Sprite.call(this, scene, 0, 0, selectedCharacter);
            this.info = towerTypes.find(t => t.levels.find(l => l.sprite == selectedCharacter)).levels.find(l => l.sprite == selectedCharacter);
            this.towerId = selectedCharacter;
            this.scene.anims.create({
                key: 'animateTower_' + selectedCharacter,
                frames: this.scene.anims.generateFrameNumbers(selectedCharacter, { start: 0, end: this.info.frames }),
                frameRate: 10,
                repeat: -1
            });
            this.play("animateTower_" + selectedCharacter);
            this.nextTic = 0;
            this.level = 1;
            this.coordinates = [];
            this.towerActive = true;
        },
    // we will place the turret according to the grid
    place: function (i, j) {
        this.y = i * 36 + 18;
        this.x = j * 36 + 18;
        map[i][j] = -1;
        if (!towerPlacements[i]) towerPlacements[i] = [];
        towerPlacements[i][j] = this;
        this.coordinates = [i, j];
    },
    fire: function () {
        var enemy = getEnemy(this.x, this.y, this.info.fireDistance);
        if (enemy) {
            var angle = Phaser.Math.Angle.Between(this.x, this.y, enemy.x, enemy.y);
            addBullet(this.x, this.y, angle, this.info.fireDistance, this.info.damage);
        }
    },
    annihilate: function() {
        this.towerActive = false;
        map[this.coordinates[0]][this.coordinates[1]] = 6;
        this.texture = "destroyed";
        this.scene.anims.create({
            key: 'destroyed',
            frames: this.scene.anims.generateFrameNumbers('destroyed', { start: 0, end: 4 }),
            frameRate: 10,
            repeat: -1
        });
        this.play("destroyed");
        const self = this;
        setTimeout(function() {
            map[self.coordinates[0]][self.coordinates[1]] = 0;
            self.destroy();
        }, 10000);
    },
    update: function (time, delta) {
        if (time > this.nextTic && this.towerActive) {
            this.fire();
            this.nextTic = time + this.info.fireSpeed;
        }
    }
});

var Bullet = new Phaser.Class({
    Extends: Phaser.GameObjects.Image,
    initialize: function Bullet(scene) {
        Phaser.GameObjects.Image.call(this, scene, 0, 0, "bullet");
        this.dx = 0;
        this.dy = 0;
        this.lifespan = 0;
        this.speed = Phaser.Math.GetSpeed(600, 1);
        this.damage = 25;
    },
    setDamage: function(dmg) {
        this.damage = dmg;
    },
    fire: function (x, y, angle, range) {
        this.setActive(true);
        this.setVisible(true);

        this.setPosition(x, y);
        this.setRotation(angle);

        this.dx = Math.cos(angle);
        this.dy = Math.sin(angle);

        this.lifespan = range;
    },
    update: function (time, delta) {
        this.lifespan -= delta;

        this.x += this.dx * (this.speed * delta);
        this.y += this.dy * (this.speed * delta);

        if (this.lifespan <= 0) {
            this.destroy();
        }
    }
});

function addBullet(x, y, angle, range, dmg) {
    var bullet = bullets.get();
    bullet.setDamage(dmg);
    if (bullet) bullet.fire(x, y, angle, range);
}

function makePurchase(id, level) {
    const towerMatch = towerTypes.find(t => t.levels.find(l => l.sprite == id));
    if (!towerMatch) return false;
    const levelMatch = towerMatch.levels.find(l => l.level == level);
    if (!levelMatch) return false;
    if (money < levelMatch.price) {
        return false;
    } else {
        money -= levelMatch.price;
        return true;
    }
}

function calcUpgradeCost(i, j) {
    let tower = towerPlacements[i];
    if (!tower) return null;
    tower = tower[j];
    if (!tower) return null;
    const match = towerTypes.find(t => t.levels.find(l => l.sprite == tower.towerId));
    if (!match) return null;
    return match.levels.find(l => l.sprite == tower.towerId).nextPrice;
}

function placeTower(i, j) {
    var tower = towers.get();
    const transaction = makePurchase(tower.towerId, 1);
    if (!transaction) return tower.destroy();
    if (tower) {
        tower.setActive(true);
        tower.setVisible(true);
        tower.place(i, j);
    }
}

function upgradeTower(i, j) {
    var tower = towerPlacements[i];
    if (!tower) return;
    tower = tower[j];
    if (!tower) return;
    let newLevel = tower.level + 1;
    const transaction = makePurchase(tower.towerId, newLevel);
    if (!transaction) return;
    if (tower) {
        const match = towerTypes.find(t => t.levels.find(l => l.sprite == tower.towerId)).levels.find(l => l.sprite == tower.towerId);
        let oldSel = selectedCharacter.slice();
        selectedCharacter = match.nextTower;
        tower.destroy();
        let newTower = towers.get();
        newTower.setActive(true);
        newTower.setVisible(true);
        newTower.place(i, j);
        newTower.level = newLevel;
        selectedCharacter = oldSel;
    }
}

function generateSkin(level) {
    const possibilities = ["merd", "red", "green"];
    return possibilities[Math.floor(Math.random() * possibilities.length)] + level;
}

function spawnEnemy(level, hp, id) {
    enemySkin = generateSkin(level);
    var enemy = enemies.get();
    if (enemy) {
        enemy.setActive(true);
        enemy.setVisible(true);
        enemy.startOnPath();
        enemy.setHP(hp);
        enemy.setID(id);
        enemySkin = "merd1";
    }
}

function getEnemy(x, y, distance) {
    var enemyUnits = enemies.getChildren();
    let indexWithMaxDistance = 0;
    let maxDistanceRecorded = 0;
    for (var i = enemyUnits.length - 1; i >= 0; i--) {
        if (enemyUnits[i].active) {
            const dist = Phaser.Math.Distance.Between(x, y, enemyUnits[i].x, enemyUnits[i].y);
            if (dist > maxDistanceRecorded && dist <= distance) {
                maxDistanceRecorded = dist;
                indexWithMaxDistance = i;
            }
        }
    }
    if (maxDistanceRecorded > 0) return enemyUnits[indexWithMaxDistance];
    return false;
}

function damageEnemy(enemy, bullet) {
    // only if both enemy and bullet are alive
    if (enemy.active === true && bullet.active === true) {
        // we remove the bullet right away
        bullet.setActive(false);
        bullet.setVisible(false);

        // decrease the enemy hp with BULLET_DAMAGE
        enemy.receiveDamage(bullet.damage);
    }
}

function preload() {
    //Pahts
    this.load.image("path", "assets/tile1.png");
    this.load.image("grass", "assets/tile2.png");
    this.load.image("path2", "assets/tile3.png");
    this.load.image("corner", "assets/tile5.png");

    //Towers
    this.load.spritesheet("tower", "assets/tower1.png", { frameWidth: 36, frameHeight: 36 });
    this.load.spritesheet("tower2", "assets/tower2.png", { frameWidth: 36, frameHeight: 36 });
    this.load.spritesheet("tower3", "assets/tower3.png", { frameWidth: 36, frameHeight: 36 });
    this.load.spritesheet("tower4", "assets/tower4.png", { frameWidth: 36, frameHeight: 36 });
    this.load.spritesheet("mort1", "assets/mort1.png", { frameWidth: 36, frameHeight: 36 });
    this.load.spritesheet("mort2", "assets/mort2.png", { frameWidth: 36, frameHeight: 36 });
    this.load.spritesheet("mort3", "assets/mort3.png", { frameWidth: 36, frameHeight: 36 });
    this.load.spritesheet("mort4", "assets/mort4.png", { frameWidth: 36, frameHeight: 36 });
    this.load.spritesheet("bomb1", "assets/bomb1.png", { frameWidth: 36, frameHeight: 36 });
    this.load.spritesheet("bomb2", "assets/bomb2.png", { frameWidth: 36, frameHeight: 36 });
    this.load.spritesheet("bomb3", "assets/bomb3.png", { frameWidth: 36, frameHeight: 36 });

    //Enemies
    this.load.spritesheet("merd1", "assets/merd1.png", { frameWidth: 36, frameHeight: 36 });
    this.load.spritesheet("merd2", "assets/merd2.png", { frameWidth: 36, frameHeight: 36 });
    this.load.spritesheet("merd3", "assets/merd3.png", { frameWidth: 36, frameHeight: 36 });
    this.load.spritesheet("red1", "assets/red1.png", { frameWidth: 36, frameHeight: 36 });
    this.load.spritesheet("red2", "assets/red2.png", { frameWidth: 36, frameHeight: 36 });
    this.load.spritesheet("red3", "assets/red3.png", { frameWidth: 36, frameHeight: 36 });
    this.load.spritesheet("green1", "assets/green1.png", { frameWidth: 36, frameHeight: 36 });
    this.load.spritesheet("green2", "assets/green2.png", { frameWidth: 36, frameHeight: 36 });
    this.load.spritesheet("green3", "assets/green3.png", { frameWidth: 36, frameHeight: 36 });

    //Others
    this.load.image("fort", "assets/fort.png");
    this.load.image("bullet", "assets/bullet.png");
    this.load.spritesheet("rock", "assets/rock.png", { frameWidth: 36, frameHeight: 36 });
    this.load.spritesheet("destroyed", "assets/destroyed.png", { frameWidth: 36, frameHeight: 36 });
}

function sabotageRandomTower() {
    const towerUnits = towers.getChildren();
    const randomTower = towerUnits[Math.floor(Math.random() * towerUnits.length)];
    if (!randomTower) return;
    randomTower.annihilate();
}

function create() {
    socket = io();
    path = this.add.path(lineStart[1] * 36 + 18, lineStart[0] * 36 + 18);
    graphics = this.add.graphics();
    drawGrid(this);
    enemies = this.physics.add.group({ classType: Enemy, runChildUpdate: true });
    towers = this.add.group({ classType: Tower, runChildUpdate: true });
    bullets = this.physics.add.group({ classType: Bullet, runChildUpdate: true });
    this.physics.add.overlap(enemies, bullets, damageEnemy);
    socket.emit("authenticate", "phaserGameKey****39");

    const mort_text = this.add.text(452, 60, 'Mort (Cost: 500)', { fontFamily: 'sans-serif' });
    mort_text.setFontSize(10);

    const mort_character = this.add.sprite(452, 80, "mort1").setOrigin(0, 0);
    mort_character.setScale(1.5);
    this.anims.create({
        key: 'animate',
        frames: this.anims.generateFrameNumbers("mort1", { start: 0, end: 3 }),
        frameRate: 10,
        repeat: -1
    });
    mort_character.play("animate");


    mort_character.setInteractive();

    let preview1, actualRect1 = this.add.rectangle(452, 80, 54, 54, 0x00BCD4).setOrigin(0, 0).setDepth(-1);
    mort_character.on("pointerover", () => {
        preview1 = this.add.rectangle(452, 80, 54, 54, 0x00BCD4, 0.1).setOrigin(0, 0).setDepth(-1);
    });

    mort_character.on("pointerout", () => {
        preview1.destroy();
    });

    mort_character.on("pointerdown", () => {
        if (selectedCharacter == "mort1") return;
        if (actualRect2) actualRect2.destroy();
        if (actualRect3) actualRect3.destroy();
        actualRect1 = this.add.rectangle(452, 80, 54, 54, 0x00BCD4).setOrigin(0, 0).setDepth(-1);
        selectedCharacter = "mort1";
    });

    //


    const tower2_text = this.add.text(452, 165, 'Tower 2 (Cost: 1000)', { fontFamily: 'sans-serif' });
    tower2_text.setFontSize(10);

    const tower2_character = this.add.sprite(452, 185, "tower2").setOrigin(0, 0);
    tower2_character.setScale(1.5);
    this.anims.create({
        key: 'animate2',
        frames: this.anims.generateFrameNumbers("tower2", { start: 0, end: 3 }),
        frameRate: 10,
        repeat: -1
    });
    tower2_character.play("animate2");


    tower2_character.setInteractive();

    let preview2, actualRect2;
    tower2_character.on("pointerover", () => {
        preview2 = this.add.rectangle(452, 185, 54, 54, 0x00BCD4, 0.1).setOrigin(0, 0).setDepth(-1);
    });

    tower2_character.on("pointerout", () => {
        preview2.destroy();
    });

    tower2_character.on("pointerdown", () => {
        if (selectedCharacter == "tower2") return;
        if (actualRect1) actualRect1.destroy();
        if (actualRect3) actualRect3.destroy();
        actualRect2 = this.add.rectangle(452, 185, 54, 54, 0x00BCD4).setOrigin(0, 0).setDepth(-1);
        selectedCharacter = "tower2";
    });

    //

    const bomb_text = this.add.text(452, 270, 'Bomb (Cost: 2500)', { fontFamily: 'sans-serif' });
    bomb_text.setFontSize(10);

    const bomb_character = this.add.sprite(456, 290, "bomb1").setOrigin(0, 0);
    bomb_character.setScale(1.3);
    this.anims.create({
        key: 'animate3',
        frames: this.anims.generateFrameNumbers("bomb1", { start: 0, end: 3 }),
        frameRate: 10,
        repeat: -1
    });
    bomb_character.play("animate3");


    bomb_character.setInteractive();

    let preview3, actualRect3;
    bomb_character.on("pointerover", () => {
        preview3 = this.add.rectangle(452, 290, 54, 54, 0x00BCD4, 0.1).setOrigin(0, 0).setDepth(-1);
    });

    bomb_character.on("pointerout", () => {
        preview3.destroy();
    });

    bomb_character.on("pointerdown", () => {
        if (selectedCharacter == "bomb1") return;
        if (actualRect1) actualRect1.destroy();
        if (actualRect2) actualRect2.destroy();
        actualRect3 = this.add.rectangle(452, 290, 54, 54, 0x00BCD4).setOrigin(0, 0).setDepth(-1);
        selectedCharacter = "bomb1";
    });


    socket.on("spawn balloon", function ({level, hp, id}) {
        spawnEnemy(level, hp, id);
    });

    socket.on("sabotage", function () {
        sabotageRandomTower();
    });

    socket.on("freeze", function () {
        document.getElementById('freezeScreen').style.visibility="visible";
        game.input.enabled = false;
        setTimeout(function() {
            document.getElementById('freezeScreen').style.visibility="hidden";
            game.input.enabled = true;
        }, 5000);
    });

    this.coinText = this.add.text(450, 15, "Coins: ").setFontSize(12);

    const endGame = this.add.text(570, 340, "END GAME").setFontSize(12);
    endGame.setInteractive();

    endGame.on("pointerdown", () => {
        socket.emit("end game", false);
        document.getElementById('endScreen').style.display="block";
    });

    socket.on("leaderboard", function(data) {
        gameGoing = false;
        console.log(data)
        developLeaderboard(data);
    });
    
    function developLeaderboard(data) {
        const randomEmoji = () => {
            const emojis = ['👏', '👍', '🙌', '🤩', '🔥', '⭐️', '🏆', '💯', '😏'];
            let randomNumber = Math.floor(Math.random() * emojis.length);
            return emojis[randomNumber];
        };
    
        data.forEach((member, i) => {
            let newRow = document.createElement('li');
            newRow.classList = 'c-list__item';
            newRow.innerHTML = `
    <div class="c-list__grid">
        <div class="c-flag c-place u-bg--transparent">${i+1}</div>
        <div class="c-media">
            
            <div class="c-media__content">
                <div class="c-media__title">${member.username}</div>
            
            </div>
        </div>
        <div class="u-text--right c-kudos">
            <div class="u-mt--8">
                <strong>${member.coins}</strong> ${randomEmoji()}
            </div>
        </div>
    </div>
    `;
            if (i === 0) {
                newRow.querySelector('.c-place').classList.add('u-text--dark');
                newRow.querySelector('.c-place').classList.add('u-bg--yellow');
                newRow.querySelector('.c-kudos').classList.add('u-text--yellow');
            } else if (i === 1) {
                newRow.querySelector('.c-place').classList.add('u-text--dark');
                newRow.querySelector('.c-place').classList.add('u-bg--teal');
                newRow.querySelector('.c-kudos').classList.add('u-text--teal');
            } else if (i === 2) {
                newRow.querySelector('.c-place').classList.add('u-text--dark');
                newRow.querySelector('.c-place').classList.add('u-bg--orange');
                newRow.querySelector('.c-kudos').classList.add('u-text--orange');
            }
            list.appendChild(newRow);
        });
    }

    socket.on("challenging", function(data) {
        importantData = data;
    });
}

var importantData, currIndex = -1;

function mostMissed() {
    document.getElementById('leaderboard').style.display="none";
    document.getElementById('mostMissed').style.display="block";
    mostMissed2("+");
}
function mostMissed2(dirr) {
    if (dirr == "+") currIndex++;
    else currIndex--;
    if (currIndex >= importantData.length) currIndex = importantData.length - 1;
    else if (currIndex < 0) currIndex = 0;
    const currProblem = importantData[currIndex];
    if (!currProblem) return;
    document.getElementById("corrects").innerText = currProblem.corrects;
    document.getElementById("attempts").innerText = currProblem.attempts;
    document.getElementById("difficulty").innerText = currProblem.difficulty.toUpperCase();
    document.getElementById("challenge_problem").innerHTML = currProblem.task.html;
    document.getElementById("challenge_ans1").innerHTML = currProblem.correct.html;
    document.getElementById("challenge_ans2").innerHTML = currProblem.incorrect[0].html;
    document.getElementById("challenge_ans3").innerHTML = currProblem.incorrect[1].html;
    document.getElementById("challenge_ans4").innerHTML = currProblem.incorrect[2].html;
}

function restartGame() {
    socket.emit("restart");
    window.location.reload();
}

var moneyTic = 5000, spawnTic = 0;

var minB = 2500;
var maxB = 5000;

var gameGoing = false;

function beginGame() {
    document.getElementById('startScreen').style.display="none";
    gameGoing = true;
    socket.emit('start playing');
}

function update(time, delta) {
    this.coinText.setText("Coins: " + money + ", HP: " + hp);
    
    if (time > moneyTic && gameGoing) {
        money += 50;
        moneyTic = time + 5000;
        maxB = Math.round(maxB * 0.9);
        minB = Math.round(maxB * 0.7);
        if (minB < 900) minB = 900;
        if (maxB < 1100) maxB = 1100;
    }

    if (time > spawnTic && gameGoing) {
        spawnEnemy(1, 100, null);
        spawnTic = time + Math.floor(Math.random() * (maxB - minB + 1) + minB);
    }

    if (gameGoing && hp <= 0) {
        socket.emit("end game", true);
        document.getElementById('endScreen').style.display="block";
        gameGoing = false;
    }
}