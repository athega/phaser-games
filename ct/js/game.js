class Game extends Phaser.Scene {
  constructor() {
    super({ key: 'Game' });

    try {
      this.storage = JSON.parse(localStorage.getItem('ct')) || {};
    } catch {
      this.storage = {};
    }

    this.audioStarted = false;
    this.score = 0;
    this.highScore = 0;
    this.lives = 3;
    this.highScore = this.storage.highScore || 0;
  }

  preload() {
    this.load.atlas('assets', 'assets/breakout.png', 'assets/breakout.json');
    this.load.image('powerUp', 'assets/star.png');

    this.load.audioSprite('music', 'assets/music.json', [
      'assets/music.ogg',
      'assets/music.mp3',
    ]);

    this.load.audioSprite('sfx', 'assets/sfx.json', [
      'assets/sfx.ogg',
      'assets/sfx.mp3',
    ]);
  }

  create() {
    //  Enable world bounds, but disable the floor
    this.physics.world.setBoundsCollision(true, true, true, false);

    //  Create the bricks in a 10x6 grid
    this.bricks = this.physics.add.staticGroup({
      key: 'assets',
      frame: ['blue1', 'red1', 'green1', 'yellow1', 'silver1', 'purple1'],
      frameQuantity: 10,
      gridAlign: {
        width: 10,
        height: 6,
        cellWidth: 64,
        cellHeight: 32,
        x: 112,
        y: 100,
      },
    });

    this.ball = this.physics.add
      .image(400, 500, 'assets', 'ball1')
      .setCollideWorldBounds(true)
      .setBounce(1);
    this.ball.setData('onPaddle', true);

    this.paddle = this.physics.add
      .image(400, 550, 'assets', 'paddle1')
      .setImmovable();

    this.powerUps = this.physics.add.group();

    //  Our colliders
    this.physics.add.collider(
      this.ball,
      this.bricks,
      this.hitBrick,
      null,
      this,
    );
    this.physics.add.collider(
      this.ball,
      this.paddle,
      this.hitPaddle,
      null,
      this,
    );
    this.physics.add.collider(
      this.powerUps,
      this.paddle,
      this.hitPowerUp,
      null,
      this,
    );

    //  Game info
    this.scoreText = this.add.text(16, 16, `Score: ${this.score}`, {
      fontSize: '32px',
      fill: '#ff0',
    });
    this.highScoreText = this.add.text(
      470,
      16,
      `High score: ${this.highScore}`,
      {
        fontSize: '32px',
        fill: '#f00',
      },
    );
    this.livesText = this.add.text(16, 552, `Lives: ${this.lives}`, {
      fontSize: '32px',
      fill: '#0f0',
    });
    this.gameOverText = this.add.text(225, 300, '', {
      fontSize: '64px',
      fill: '#f00',
    });

    //  Input events
    this.input.on(
      'pointermove',
      (pointer) => {
        //  Keep the paddle within the game
        this.paddle.x = Phaser.Math.Clamp(pointer.x, 52, 748);

        if (this.ball.getData('onPaddle')) {
          this.ball.x = this.paddle.x;
        }
      },
      this,
    );

    this.input.on(
      'pointerup',
      () => {
        if (this.ball.getData('onPaddle')) {
          this.sound.playAudioSprite('sfx', 'start');
          this.ball.setVelocity(-75, -300);
          this.ball.setData('onPaddle', false);

          if (this.lives === 0) {
            this.updateScore(0);
            this.lives = 3;
            this.livesText.setText(`Lives: ${this.lives}`);
            this.gameOverText.setText('');
          }
        }

        // Audio
        if (!this.audioStarted) {
          this.sound.playAudioSprite('music', 'level-01', { volume: 0.2 });
          this.audioStarted = true;
        }
      },
      this,
    );

    // Use two fingers to pause
    this.input.addPointer(1);
  }

  update() {
    if (this.ball.y > 600) {
      this.resetBall();
      this.sound.playAudioSprite('sfx', 'drop');
      this.lives -= 1;
      this.livesText.setText(`Lives: ${this.lives}`);
      if (this.lives === 0) {
        this.sound.stopAll();
        this.audioStarted = false;

        this.sound.playAudioSprite('sfx', 'gameover');
        this.gameOverText.setText('GAME OVER');
      }
    }

    // Pause
    if (this.input.pointer1.isDown && this.input.pointer2.isDown) {
      this.scene.pause();
      this.scene.launch('Pause');
    }
  }

  hitBrick(ball, brick) {
    brick.disableBody(true, true);

    this.sound.playAudioSprite('sfx', 'beep');

    // Power up
    if (Math.round(Math.random() * 15) === 3) {
      const pu = this.powerUps.create(brick.x, brick.y, 'powerUp');
      pu.setVelocityY(Phaser.Math.Between(100, 200));
      this.sound.playAudioSprite('sfx', 'star');
    }

    this.updateScore(this.score + 270 - brick.y);

    if (this.bricks.countActive() === 0) {
      this.resetLevel();
    }
  }

  resetBall() {
    this.ball.setVelocity(0);
    this.ball.setPosition(this.paddle.x, 500);
    this.ball.setData('onPaddle', true);
  }

  resetLevel() {
    this.resetBall();

    this.bricks.children.each((brick) => {
      brick.enableBody(false, 0, 0, true, true);
    });
  }

  hitPaddle(ball, paddle) {
    let diff = 0;

    this.sound.playAudioSprite('sfx', 'bounce');

    if (ball.x < paddle.x) {
      //  Ball is on the left-hand side of the paddle
      diff = paddle.x - ball.x;
      ball.setVelocityX(-10 * diff);
    } else if (ball.x > paddle.x) {
      //  Ball is on the right-hand side of the paddle
      diff = ball.x - paddle.x;
      ball.setVelocityX(10 * diff);
    } else {
      //  Ball is perfectly in the middle
      //  Add a little random X to stop it bouncing straight up!
      ball.setVelocityX(2 + Math.random() * 8);
    }
  }

  hitPowerUp(paddle, powerUp) {
    powerUp.disableBody(true, true);

    this.sound.playAudioSprite('sfx', 'expand');
    this.tweens.add({
      targets: paddle,
      scaleX: 2,
      duration: 500,
    });
    this.updateScore(this.score + 500);

    clearTimeout(this.powerUpTimeout);
    this.powerUpTimeout = setTimeout(() => {
      this.sound.playAudioSprite('sfx', 'shrink');
      this.tweens.add({
        targets: paddle,
        scaleX: 1,
        duration: 500,
      });
    }, 10000);
  }

  updateScore(score) {
    this.score = score;
    this.scoreText.setText(`Score: ${score}`);
    if (score > this.highScore) {
      this.highScore = score;
      this.highScoreText.setText(`High score: ${this.highScore}`);
      this.storage.highScore = this.highScore;
      localStorage.setItem('ct', JSON.stringify(this.storage));
    }
  }
}

class Pause extends Phaser.Scene {
  constructor() {
    super({ key: 'Pause' });
  }

  create() {
    this.add.text(280, 300, 'PAUSED', { fontSize: '64px', fill: '#ccc' });

    // Use two fingers to resume
    this.input.addPointer(1);
  }

  update() {
    // Resume
    if (this.input.pointer1.isDown && this.input.pointer2.isDown) {
      this.scene.switch('Game');
    }
  }
}

const config = {
  renderType: Phaser.AUTO,
  width: 800,
  height: 600,
  scene: [Game, Pause],
  physics: {
    default: 'arcade',
  },
};

// eslint-disable-next-line no-new
new Phaser.Game(config);