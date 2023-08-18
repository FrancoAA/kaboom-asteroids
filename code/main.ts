import kaboom from "kaboom"
import "kaboom/global"

// initialize context
kaboom({
  scale: 1.5
})

// load assets
loadRoot('sprites/');
loadSprite('space', 'space.jpg');
loadSprite('rocket1', 'rocket1.png');
loadSprite('rocket2', 'rocket2.png');
loadSprite('rocket3', 'rocket3.png');
loadSprite('rocket4', 'rocket4.png');
loadSprite('ship', 'ship.png');
loadSprite('bullet', 'bullet.png');
loadSprite('asteroid', 'asteroid.png');
loadSprite('asteroid_small1', 'asteroid_small1.png');
loadSprite('asteroid_small2', 'asteroid_small2.png');
loadSprite('asteroid_small3', 'asteroid_small3.png');
loadSprite('asteroid_small4', 'asteroid_small4.png');

loadRoot('sounds/');
loadSound('rocket_thrust', 'rocket_thrust.wav');
loadSound('laser', 'laser.wav');
loadSound('explosion', 'explosion.mp3');
loadSound('Steamtech-Mayhem_Looping', 'Steamtech-Mayhem_Looping.mp3');

function pointAt(distance, angle) {
  let radians = -1 * deg2rad(angle);
  return vec2(distance * Math.cos(radians), -distance * Math.sin(radians));
}

function asteroidSpawnPoint() {
  // spawn randomly at the edge of the scene
  return choose([
    rand(vec2(0), vec2(width(), 0)),
    rand(vec2(0), vec2(0, height())),
    rand(vec2(0, height()), vec2(width(), height())),
    rand(vec2(width(), 0), vec2(width(), height())),
  ]);
}

const thrustAnimation = ['rocket1', 'rocket2', 'rocket3', 'rocket4'];

scene('main', () => {
  let score = 0;

  // creates the ui & background layers
  const bg = add([
    fixed(),
    z(-100),
    sprite('space')
  ]);

  const ui = add([
    fixed(),
    z(100),
  ]);

  const scoreLabel = ui.add([
    text(`Score: ${score}`, {
      size: 14,
      pos: pos(8, 24)
    })
  ]);

  ui.add([
    text('Lives', {
      size: 12,
      pos: pos(8, 8)
    })
  ]);

  onDraw('ui', () => {
    for (let x = 64; x < 64 + 16 * player.lives; x += 16) {
      drawSprite({
        sprite: "ship",
        pos: vec2(x, 12),
        angle: -90,
        anchor: "center",
        scale: 0.5,
      });
    }
  });

  const player = add([
    sprite('ship'),
    pos(160, 120),
    rotate(0),
    anchor('center'),
    area(),
    body(),
    // object tags
    'player',
    'mobile',
    'wraps',
    {
      // initial state
      turnSpeed: 4.58,
      speed: 0,
      maxThrust: 48,
      acceleration: 2,
      deceleration: 4,
      lives: 3,
      canShoot: true,
      laserCooldown: 1,
      invulnerable: false,
      invulnerablityTime: 3,
      animationFrame: 0,
      thrusting: false,
    }
  ]);
  
  // player movement
  onKeyDown('left', () => {
    player.angle -= player.turnSpeed;
  });

  onKeyDown('right', () => {
    player.angle += player.turnSpeed;
  });

  onKeyDown('up', () => {
    player.speed = Math.min(
      player.speed + player.acceleration,
      player.maxThrust
    );
    play('rocket_thrust', {
      volume: 0.01,
      speed: 2.0
    });
  });

  onKeyDown('down', () => {
    player.speed = Math.max(
      player.speed - player.deceleration,
      -player.maxThrust
    );
    play('rocket_thrust', {
      volume: 0.01,
      speed: 2.0,
    });
  });

  // shooting
  onKeyDown('space', () => {
    if (!player.canShoot) return;

    add([
      sprite('bullet'),
      pos(player.pos.add(pointAt(player.width / 2, player.angle))),
      rotate(player.angle),
      anchor('center'),
      area(),
      offscreen({ destroy: true }),
      'bullet',
      'mobile',
      'destructs',
      {
        speed: 100
      }
    ]);

    play('laser');

    player.canShoot = false;

    console.log(player.laserCooldown);

    wait(player.laserCooldown, () => {
      player.canShoot = true;
    });
  });

  // thrust animation
  onKeyPress('up', () => {
    player.thrusting = true;
    player.animationFrame = 0;
  });
  onKeyRelease('up', () => {
    player.thrusting = false;
  });
  onDraw('player', (p) => {
    if (!player.thrusting) return;

    drawSprite({
      sprite: thrustAnimation[p.animationFrame],
      pos: vec2(-p.width / 2, 0),
      anchor: 'center'
    });
  });

  let timer = 0;
  let moveDelay = 0.1;

  onUpdate(() => {
    timer += dt();
    if (timer < moveDelay) return;
    timer = 0;

    if (!player.thrusting) return;

    player.animationFrame++;
    if (player.animationFrame >= thrustAnimation.length) {
      player.animationFrame = 0;
    }
  });

  onUpdate('mobile', (e) => {
    e.move(pointAt(e.speed, e.angle));
  });

  onUpdate('wraps', (ship) => {
    if (ship.pos.x > (width() + ship.width)) {
      ship.pos.x = 0;
    }
    if (ship.pos.x < -ship.width) {
      ship.pos.x = width();
    }
    if (ship.pos.y > (height() + ship.height)) {
      ship.pos.y = 0;
    }
    if (ship.pos.y < -ship.height) {
      ship.pos.y = height();
    }
  });

  // Asteroids
  const NUM_ASTERIODS = 5;

  for (let i = 0; i < NUM_ASTERIODS; i++) {
    var spawnPoint = asteroidSpawnPoint();
    var a = add([
      sprite("asteroid"),
      pos(spawnPoint),
      rotate(rand(1, 90)),
      anchor("center"),
      area(),
      body(),
      "asteroid",
      "mobile",
      "wraps",
      {
        speed: rand(5, 10),
        initializing: true,
      },
    ]);

    while (a.isColliding('mobile')) {
      spawnPoint = asteroidSpawnPoint();
      a.pos = spawnPoint;
    }

    a.initializing = false;
  }

  onCollide('player', 'asteroid', (p, a) => {
    if (a.initializing) return;
    p.lives--;
  });

  onCollide('bullet', 'asteroid', (b, a) => {
    if (a.initializing) return;

    destroy(b);
    destroy(a);

    play('explosion');
    score++;
  });

  onCollide('asteroid', 'asteroid', (a1, a2) => {
    if (a1.initializing || a2.initializing) return;

    a1.speed = -a1.speed;
    a2.speed = -a2.speed;
  });

  onCollide('player', 'asteroid', (p, a) => {
    if (a.initializing) return;
    p.trigger('damage');
  });

  // Take damage
  player.on("damage", () => {
    player.lives--;
  
    // destroy ship if lives finished
    if (player.lives <= 0) {
      destroy(player);
    }
  });

  // End game on player destruction
  player.on("destroy", () => {
    ui.add([
      text(`GAME OVER\n\nScore: ${score}\n\n[R]estart?`, { size: 20 }),
      pos(center()),
    ]);
  });

  // Restart game
  onKeyPress("r", () => {
    go("main");
  });
});

go('main');