document.addEventListener("DOMContentLoaded", () => {
  // #region Game settings
  const gameUpdateSpeedInMilliseconds = 10
  const gameDrawSpeedInMilliseconds = 30
  const defaultGameConsoleWidth = 410
  const defaultGameConsoleHeight = 700
  const defaultStageWidth = 400
  const defaultStageHeight = 600
  const platformStartingPosition = 100
  const platformAdvancingLine = 400
  const stageMoveSpeed = 1
  const jumperMaxHeight = 250
  const maxPlatformGap = Math.floor(jumperMaxHeight * 0.9)
  const mainVolume = 0.75
  const menuSoundVolume = 1
  const musicVolume = 0.1
  const gameOverSoundVolume = 0.6
  const jumpSoundVolume = 0.4
  const jumperJumpSpeed = 8
  const jumperFallSpeed = 5
  const jumperLeftRightSpeed = 6
  const scoreIncreaseRate = 0.1
  // #endregion Game settings

  // https://stackoverflow.com/questions/29325069/how-to-generate-random-numbers-biased-towards-one-value-in-a-range
  /**
   * Generates a random number between `min` and `max` favoring to the
   * degree of `influence` towards the `bias` 
   * @param min the minimum number that should be returned
   * @param max the maximum number that should be returned
   * @param bias the number within `min` and `max` that the result should
   * gravitate towards
   * @param influence a number from 0 to 1 to determine the amount of
   * influence towards the bias. 0 - least influence; 1 - most influence
   * @returns a randomly generated number
   */
  function getRandomNumberWithBias(min, max, bias, influence) {
    const n = randomNumber(min, max)
    const randomMixer = Math.random() * influence
    return n * (1 - randomMixer) + bias * randomMixer
  }

  /**
   * Generates a random number between `min` and `max`
   * @param min the minimum number that should be returned
   * @param max the maximum number that should be returned
   * @returns a randomly generated number
   */
  function randomNumber(min, max) {
    return (Math.random() * (max - min)) + min
  }

  /**
   * Generates a random integer between `min` and `max`
   * @param min the minimum number that should be returned
   * @param max the maximum number that should be returned
   * @returns a randomly generated number
   */
  function randomInt(min, max) {
    return Math.round((Math.random() * (max - min)) + min)
  }

  function registerServiceWorker() {
    navigator?.serviceWorker?.register(
      "/jumper.dev/serviceWorker.js",
      { scope: "/jumper.dev/" }
    )
  }

  class Game {
    gameConsoleWidth = defaultGameConsoleWidth
    gameConsoleHeight = defaultGameConsoleHeight
    stageWidth = defaultStageWidth
    stageHeight = defaultStageHeight
    controlsHeight = 85
    gameOptionsHeight = 160
    gameOverHeight = 150
    gameConsole
    stage
    scoreBoard
    jumper
    platforms
    gameOptions
    gameOver
    music
    gameOverSound
    menuSound
    isGameStarted = false
    score = 0
    backgroundY = 0
    gameConsoleTranslateX = 0
    scale = 1
    isTouchEnabled = false
    needsToAdjustGameToScreen = true
    needsToDraw = true

    constructor() {
      this.initialize = this.initialize.bind(this)
      this.isStageAdvancing = this.isStageAdvancing.bind(this)
      this.showGameOver = this.showGameOver.bind(this)
      this._beginGame = this._beginGame.bind(this)
      this._draw = this._draw.bind(this)
      this._hideGameOptions = this._hideGameOptions.bind(this)
      this._hideGameOver = this._hideGameOver.bind(this)
      this._initializeGameOptions = this._initializeGameOptions.bind(this)
      this._initializeSounds = this._initializeSounds.bind(this)
      this._keyPushedDown = this._keyPushedDown.bind(this)
      this._keyReleased = this._keyReleased.bind(this)
      this._playAgain = this._playAgain.bind(this)
      this._playGameOverSound = this._playGameOverSound.bind(this)
      this._playMenuSound = this._playMenuSound.bind(this)
      this._playMusic = this._playMusic.bind(this)
      this._prepareToStartGame = this._prepareToStartGame.bind(this)
      this._showGameOptions = this._showGameOptions.bind(this)
      this._startDrawLoop = this._startDrawLoop.bind(this)
      this._startUpdateLoop = this._startUpdateLoop.bind(this)
      this._stopMusic = this._stopMusic.bind(this)
      this._updateState = this._updateState.bind(this)
      this._watchUserActions = this._watchUserActions.bind(this)
      this._watchWindowResize = this._watchWindowResize.bind(this)
      this._windowResized = this._windowResized.bind(this)

      this.isTouchEnabled = "ontouchstart" in window ||
        navigator.maxTouchPoints > 0 ||
        navigator.msMaxTouchPoints > 0

      this.gameConsole = document.getElementById("gameConsole")
      this.stage = document.getElementById("stage")
      this.scoreBoard = document.getElementById("scoreBoard")
      this.gameOptions = document.getElementById("gameOptions")
      this.gameOver = document.getElementById("gameOver")

      this._watchWindowResize()
      setTimeout(this._windowResized, 10)
    }

    initialize() {
      this.jumper = new Jumper()
      this.platforms = new Platforms()
      this._initializeSounds()
      this._initializeGameOptions()
      this._prepareToStartGame()
      this._watchUserActions()
      this._startUpdateLoop()
      this._startDrawLoop()
      this._watchWindowResize()
      setTimeout(this._windowResized, 10)
      // wait till html settles before showing game options to center vertically
      setTimeout(this._showGameOptions, 20)
    }

    isStageAdvancing() {
      return this.jumper.bottom > platformAdvancingLine
    }

    showGameOver() {
      this._stopMusic()
      this._playGameOverSound()
      this.isGameStarted = false
      this.gameOver.style.top =
        `${(this.stageHeight - this.gameOverHeight) / 2}px`
      this.gameOver.style.display = "flex"
    }

    _beginGame() {
      this._playMenuSound()

      // wait a bit for the menu sound to play before starting the game
      setTimeout(() => {
        this._hideGameOptions()
        this._playMusic()
        this.isGameStarted = true
      }, 250)
    }

    _draw() {
      if (this.needsToAdjustGameToScreen) {
        this.stage.style.height = `${this.stageHeight}px`

        this.gameConsole.style.height = `${this.gameConsoleHeight}px`

        this.gameConsole.style.transform = `
          translate(${this.gameConsoleTranslateX}px, 0px)
          scale(${this.scale})
        `

        this.needsToAdjustGameToScreen = false
      }

      if (this.needsToDraw) {
        this.stage.style.backgroundPositionY = `${this.backgroundY}px`
        this.scoreBoard.innerHTML = Math.floor(this.score)
        this.needsToDraw = false
      }

      this.platforms.draw()
      this.jumper.draw()
    }

    _hideGameOptions() {
      this.gameOptions.style.display = "none"
    }

    _hideGameOver() {
      this.gameOver.style.display = "none"
    }

    _initializeGameOptions() {
      const radioElements = this.gameOptions.getElementsByTagName("input")
      const handleChange = (event) => {
        if (event.target.getAttribute("checked")) { return }

        this._playMenuSound()

        for (const radioElement of radioElements) {
          if (radioElement === event.target) { continue }
          radioElement.removeAttribute("checked")
        }

        const character = event.target.value
        const gameOverCharacter = document.querySelector("#gameOver div")

        event.target.setAttribute("checked", true)
        this.jumper.setCharacter(character)
        gameOverCharacter.setAttribute("data-character", character)
      }

      for (const radioElement of radioElements) {
        radioElement.addEventListener("change", handleChange)
      }
    }

    _initializeSounds() {
      this.music = new Audio("sounds/background-music.mp3")
      this.music.volume = musicVolume * mainVolume
      this.music.addEventListener("ended", () => {
        this.music.currentTime = 0
        this.music.play()
      }, false)

      this.gameOverSound = new Audio("sounds/game-over.mp3")
      this.gameOverSound.volume = gameOverSoundVolume * mainVolume
      this.gameOverSound.addEventListener("ended", () => {
        this.gameOverSound.currentTime = 0
      }, false)

      this.menuSound = new Audio("sounds/click.mp3")
      this.menuSound.volume = menuSoundVolume * mainVolume
      this.menuSound.addEventListener("ended", () => {
        this.menuSound.currentTime = 0
      }, false)
    }

    _keyPushedDown(e) {
      if (["ArrowLeft", "a", "A"].includes(e.key)) {
        this.jumper.moveLeft()
      } else if (["ArrowRight", "d", "D"].includes(e.key)) {
        this.jumper.moveRight()
      }
    }

    _keyReleased(e) {
      this.jumper.moveStraight()
    }

    _playAgain() {
      this._playMenuSound()
      this._hideGameOver()
      this._prepareToStartGame()
      this._showGameOptions()
    }

    _playGameOverSound() {
      this.gameOverSound.currentTime = 0
      this.gameOverSound.play()
    }

    _playMenuSound() {
      this.menuSound.currentTime = 0
      this.menuSound.play()
    }

    _playMusic() {
      this.music.currentTime = 0
      this.music.play()
    }

    _prepareToStartGame() {
      this.platforms.destroyPlatforms()
      this.platforms.createPlatforms()
      this.jumper.setStartingPlatform(this.platforms.getLowestPlatform())
      this.score = 0
      this.needsToDraw = true
    }

    _showGameOptions() {
      this.gameOptions.style.top =
        `${(this.stageHeight - this.gameOptionsHeight) / 2}px`
      this.gameOptions.style.display = "flex"
    }

    _startDrawLoop() {
      setInterval(this._draw, gameDrawSpeedInMilliseconds)
    }

    _startUpdateLoop() {
      setInterval(this._updateState, gameUpdateSpeedInMilliseconds)
    }

    _stopMusic() {
      if (this.music.ended) { return }
      this.music.pause()
      this.music.currentTime = 0
    }

    _updateState() {
      if (!this.isGameStarted) { return }

      if (this.isStageAdvancing()) {
        this.backgroundY += stageMoveSpeed
        this.score += scoreIncreaseRate
        this.needsToDraw = true
      }

      this.platforms.updateState()
      this.jumper.updateState()
    }

    _watchUserActions() {
      const playButton = document.getElementById("playButton")
      const playAgainButton = document.getElementById("playAgainButton")
      const leftButton = document.getElementById("leftButton")
      const rightButton = document.getElementById("rightButton")

      document.addEventListener("keydown", this._keyPushedDown)
      document.addEventListener("keyup", this._keyReleased)

      playButton.addEventListener("click", this._beginGame)
      playAgainButton.addEventListener("click", this._playAgain)

      leftButton.addEventListener(
        "mousedown",
        this.jumper.moveLeft,
        { passive: true }
      )
      leftButton.addEventListener(
        "mouseup",
        this.jumper.moveStraight,
        { passive: true }
      )
      leftButton.addEventListener(
        "touchstart",
        this.jumper.moveLeft,
        { passive: true }
      )
      leftButton.addEventListener(
        "touchend",
        this.jumper.moveStraight,
        { passive: true }
      )

      rightButton.addEventListener(
        "mousedown",
        this.jumper.moveRight,
        { passive: true }
      )
      rightButton.addEventListener(
        "mouseup",
        this.jumper.moveStraight,
        { passive: true }
      )
      rightButton.addEventListener(
        "touchstart",
        this.jumper.moveRight,
        { passive: true }
      )
      rightButton.addEventListener(
        "touchend",
        this.jumper.moveStraight,
        { passive: true }
      )
    }

    _watchWindowResize() {
      window.addEventListener("resize", this._windowResized)
    }

    _windowResized() {
      const screenWidth = window.innerWidth
      const screenHeight = window.innerHeight
      const bodyWidth = document.body.clientWidth
      const screenRation = screenWidth / screenHeight
      const maxRatioNeedingHeightIncrease = 0.62

      if (screenRation <= maxRatioNeedingHeightIncrease) {
        const newGameConsoleHeight =
          this.gameConsoleWidth / (screenWidth / screenHeight)
        const newStageHeight =
          this.stageWidth / (screenWidth / (screenHeight - this.controlsHeight))

        this.gameConsoleHeight = newGameConsoleHeight
        this.stageHeight = newStageHeight
      } else {
        this.gameConsoleHeight = defaultGameConsoleHeight
        this.stageHeight = defaultStageHeight
      }

      const needsABitMoreWidth = 6
      this.gameConsoleTranslateX =
        (bodyWidth - this.gameConsoleWidth + needsABitMoreWidth) / 2
      this.scale = Math.min(
        screenWidth / this.gameConsoleWidth,
        screenHeight / this.gameConsoleHeight
      )

      this.needsToAdjustGameToScreen = true
    }
  }

  class Jumper {
    element
    jumpSounds = []
    width = 60
    height = 85
    left = 50
    bottom = 150
    right = this.left + this.width
    top = this.bottom + this.height
    isJumping = false
    isFacingRight = true
    jumpHeight = 0
    isMovingLeft = false
    isMovingRight = false
    needsToDraw = true
    needsToUpdateFlipCssClass = true
    needsToUpdateJumpingCssClass = false

    constructor() {
      this.draw = this.draw.bind(this)
      this.updateState = this.updateState.bind(this)
      this.moveLeft = this.moveLeft.bind(this)
      this.moveRight = this.moveRight.bind(this)
      this.moveStraight = this.moveStraight.bind(this)
      this.setCharacter = this.setCharacter.bind(this)
      this.setStartingPlatform = this.setStartingPlatform.bind(this)
      this._fall = this._fall.bind(this)
      this._incrementJumpHeight = this._incrementJumpHeight.bind(this)
      this._initializeSounds = this._initializeSounds.bind(this)
      this._jump = this._jump.bind(this)
      this._playJumpSound = this._playJumpSound.bind(this)
      this._stopJumpSound = this._stopJumpSound.bind(this)
      this._updateContainerBox = this._updateContainerBox.bind(this)

      this.element = document.createElement("div")
      this.element.id = "jumper"
      game.stage.appendChild(this.element)

      this._initializeSounds()
    }

    draw() {
      if (!this.needsToDraw) { return }

      if (this.needsToUpdateFlipCssClass) {
        if (this.isFacingRight) {
          this.element.classList.add("flip")
        } else {
          this.element.classList.remove("flip")
        }

        this.needsToUpdateFlipCssClass = false
      }

      if (this.needsToUpdateJumpingCssClass) {
        if (this.isJumping) {
          this.element.classList.add("jumping")
        } else {
          this.element.classList.remove("jumping")
        }

        this.needsToUpdateJumpingCssClass = false
      }

      this.element.style.left = `${this.left}px`
      this.element.style.bottom = `${this.bottom}px`
      this.needsToDraw = false
    }

    moveLeft() {
      if (this.isFacingRight) { this.needsToUpdateFlipCssClass = true }

      this.isFacingRight = false
      this.isMovingLeft = true
      this.isMovingRight = false
    }

    moveRight() {
      if (!this.isFacingRight) { this.needsToUpdateFlipCssClass = true }

      this.isFacingRight = true
      this.isMovingLeft = false
      this.isMovingRight = true
    }

    moveStraight() {
      this.isMovingLeft = false
      this.isMovingRight = false
    }

    updateState() {
      // update vertical position
      if (this.isJumping) {
        this._incrementJumpHeight()

        // Move jumper but only if the stage isn't advancing. Once jumper
        //   gets to a certain stage height, we move the stage down instead
        //   to simulate the jumper moving up.
        if (!game.isStageAdvancing()) { this.bottom += jumperJumpSpeed }
      } else {
        this.bottom -= jumperFallSpeed
      }

      // update horizontal position
      if (this.isMovingLeft && this.left > 0) {
        this.left = Math.max(this.left - jumperLeftRightSpeed, 0)
      } else if (this.isMovingRight && this.right < game.stageWidth) {
        this.left = Math.min(this.left + jumperLeftRightSpeed, game.stageWidth)
      }

      this._updateContainerBox()

      // hit bottom of stage
      if (this.top <= 0) {
        game.showGameOver()
      }

      // reached max jump height; start falling
      if (this.isJumping && this.jumpHeight >= jumperMaxHeight) {
        this._fall()
      }

      // landed on platform; jump again
      if (!this.isJumping && game.platforms.isOnAPlatform(this)) {
        this.jumpHeight = 0
        this._jump()
      }

      this.needsToDraw = true
    }

    setCharacter(character) {
      this.element.setAttribute("data-character", character)
    }

    setStartingPlatform(platform) {
      this.left = platform.left
      this.bottom = platform.top
      this._updateContainerBox()
      this.needsToDraw = true
    }

    _fall() {
      if (this.isJumping) { this.needsToUpdateJumpingCssClass = true }
      this.isJumping = false
    }

    _incrementJumpHeight() {
      this.jumpHeight += jumperJumpSpeed
    }

    _initializeSounds() {
      [1, 2, 3, 4].forEach((i) => {
        const sound = new Audio(`sounds/jump-${i}.mp3`)
        sound.volume = jumpSoundVolume * mainVolume
        this.jumpSounds.push(sound)
      })
    }

    _jump() {
      if (!this.isJumping) { this.needsToUpdateJumpingCssClass = true }
      this.isJumping = true
      this._stopJumpSound()
      this._playJumpSound()
    }

    _playJumpSound() {
      const sound = this.jumpSounds[randomInt(0, 3)]
      sound.currentTime = 0
      sound.play()
    }

    _updateContainerBox() {
      this.right = this.left + this.width
      this.top = this.bottom + this.height
    }

    _stopJumpSound() {
      this.jumpSounds.forEach((sound) => {
        if (sound.ended) { return }
        sound.pause()
        sound.currentTime = 0
      })
    }
  }

  class Platform {
    element
    width = 85
    height = 15
    left = 0
    right = 0
    top = 0
    bottom = 0
    needsToDraw = true

    constructor(newPlatformBottom) {
      this.destroy = this.destroy.bind(this)
      this.draw = this.draw.bind(this)
      this.updateState = this.updateState.bind(this)
      this._placeAtRandomLeft = this._placeAtRandomLeft.bind(this)
      this._updateContainerBox = this._updateContainerBox.bind(this)

      this.bottom = newPlatformBottom
      this._placeAtRandomLeft()
      this._updateContainerBox()
      this.element = document.createElement("div")
      this.element.classList.add("platform-basic")
      game.stage.appendChild(this.element)
    }

    destroy() {
      this.element?.remove()
    }

    draw() {
      if (!this.needsToDraw) { return }
      this.element.style.left = `${this.left}px`
      this.element.style.bottom = `${this.bottom}px`
      this.needsToDraw = false
    }

    updateState() {
      if (!game.isStageAdvancing()) { return }

      this.bottom -= jumperJumpSpeed
      this._updateContainerBox()
      this.needsToDraw = true
    }

    _placeAtRandomLeft() {
      this.left = randomNumber(0, game.stageWidth - this.width)
    }

    _updateContainerBox() {
      this.right = this.left + this.width
      this.top = this.bottom + this.height
    }
  }

  class Platforms {
    listOfPlatforms = []

    constructor() {
      this.createPlatforms = this.createPlatforms.bind(this)
      this.destroyPlatforms = this.destroyPlatforms.bind(this)
      this.draw = this.draw.bind(this)
      this.getLowestPlatform = this.getLowestPlatform.bind(this)
      this.isOnAPlatform = this.isOnAPlatform.bind(this)
      this.updateState = this.updateState.bind(this)
      this._destroyPlatformsBelowStage = this._destroyPlatformsBelowStage.bind(this)
      this._getHighestPlatform = this._getHighestPlatform.bind(this)
      this._getNextPlatformPosition = this._getNextPlatformPosition.bind(this)
    }

    createPlatforms() {
      let highestPlatform = this._getHighestPlatform()

      if (highestPlatform?.top > game.stageHeight) { return }

      let nextPlatformBottom = this._getNextPlatformPosition()

      while (nextPlatformBottom <= game.stageHeight + maxPlatformGap) {
        const newPlatform = new Platform(nextPlatformBottom)
        this.listOfPlatforms.push(newPlatform)
        nextPlatformBottom = this._getNextPlatformPosition()
      }
    }

    destroyPlatforms() {
      for (const platform of this.listOfPlatforms) { platform.destroy() }
      this.listOfPlatforms.splice(0, this.listOfPlatforms.length)
    }

    draw() {
      this.listOfPlatforms.forEach((platform) => { platform.draw() })
    }

    getLowestPlatform() {
      return this.listOfPlatforms[0]
    }

    isOnAPlatform(jumper) {
      return this.listOfPlatforms.some((platform) => {
        const isHorizontallyOnPlatform = jumper.bottom >= platform.bottom &&
          jumper.bottom <= platform.top
        const isVerticallyOnPlatform = jumper.right >= platform.left &&
          jumper.left <= platform.right
        return isHorizontallyOnPlatform && isVerticallyOnPlatform
      })
    }

    updateState() {
      this.listOfPlatforms.forEach((platform) => { platform.updateState() })

      if (game.isStageAdvancing()) {
        this.createPlatforms()
        this._destroyPlatformsBelowStage()
      }
    }

    _destroyPlatformsBelowStage() {
      for (let i = 0; i < this.listOfPlatforms.length; i++) {
        if (this.listOfPlatforms[i].top < 0) {
          this.listOfPlatforms.shift().destroy()
          continue
        }

        break
      }
    }

    _getHighestPlatform() {
      return this.listOfPlatforms[this.listOfPlatforms.length - 1]
    }

    _getNextPlatformPosition() {
      const highestPlatform = this._getHighestPlatform()
      return highestPlatform ?
        getRandomNumberWithBias(
          highestPlatform.top,
          highestPlatform.top + maxPlatformGap,
          highestPlatform.top + maxPlatformGap,
          1
        ) :
        platformStartingPosition
    }
  }

  registerServiceWorker()

  const game = new Game()
  game.initialize()
})