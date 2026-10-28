const ENEMY_STRIDE = 6
const BULLET_STRIDE = 5
const PARTICLE_STRIDE = 7

const MAX_ENEMIES = 4_800
const MAX_BULLETS = 900
const MAX_PARTICLES = 3_000

const PLAYER_RADIUS = 10
const PLAYER_SPEED = 430
const PLAYER_HP = 100
const FIRE_INTERVAL = 0.075
const BULLET_SPEED = 860
const BULLET_LIFE = 1.15
const PULSE_RADIUS = 150
const PULSE_COOLDOWN = 1.1
const PULSE_DURATION = 0.35
const ENEMY_SEPARATION = 26
const SPAWN_RATE = 58

export const ARENA_WIDTH = 960
export const ARENA_HEIGHT = 540

export type ArenaState = {
  readonly enemies: Float32Array
  enemyCount: number
  readonly bullets: Float32Array
  bulletCount: number
  readonly particles: Float32Array
  particleCount: number
  playerX: number
  playerY: number
  playerVx: number
  playerVy: number
  playerHp: number
  playerInvuln: number
  fireCooldown: number
  pulseCooldown: number
  pulseTimer: number
  pulseX: number
  pulseY: number
  aimX: number
  aimY: number
  score: number
  kills: number
  time: number
  spawnAccumulator: number
  spawnTarget: number
  deadTimer: number
}

function enemySpeed(kind: number): number {
  if (kind === 2) return 28
  if (kind === 1) return 74
  return 46
}

function enemyRadius(kind: number): number {
  if (kind === 2) return 9
  if (kind === 1) return 4.5
  return 6.5
}

function enemyDamage(kind: number): number {
  if (kind === 2) return 7
  if (kind === 1) return 4
  return 2.5
}

function enemyKind(): number {
  const roll = Math.random()
  if (roll < 0.07) return 2
  if (roll < 0.28) return 1
  return 0
}

function spawnEnemy(state: ArenaState, x: number, y: number, kind: number): void {
  if (state.enemyCount >= state.enemies.length / ENEMY_STRIDE) return

  const offset = state.enemyCount * ENEMY_STRIDE
  state.enemies[offset] = x
  state.enemies[offset + 1] = y
  state.enemies[offset + 2] = 0
  state.enemies[offset + 3] = 0
  state.enemies[offset + 4] = kind === 2 ? 3 : 1
  state.enemies[offset + 5] = kind
  state.enemyCount += 1
}

function spawnEdgeEnemy(state: ArenaState): void {
  const side = Math.floor(Math.random() * 4)
  const inset = 12

  if (side === 0) {
    spawnEnemy(state, Math.random() * ARENA_WIDTH, inset, enemyKind())
    return
  }

  if (side === 1) {
    spawnEnemy(state, ARENA_WIDTH - inset, Math.random() * ARENA_HEIGHT, enemyKind())
    return
  }

  if (side === 2) {
    spawnEnemy(state, Math.random() * ARENA_WIDTH, ARENA_HEIGHT - inset, enemyKind())
    return
  }

  spawnEnemy(state, inset, Math.random() * ARENA_HEIGHT, enemyKind())
}

function nearestEnemy(state: ArenaState): number {
  let nearest = -1
  let nearestDistance = Number.POSITIVE_INFINITY

  for (let index = 0; index < state.enemyCount; index += 1) {
    const offset = index * ENEMY_STRIDE
    if (state.enemies[offset + 4]! <= 0) continue

    const dx = state.enemies[offset]! - state.playerX
    const dy = state.enemies[offset + 1]! - state.playerY
    const distance = dx * dx + dy * dy

    if (distance < nearestDistance) {
      nearestDistance = distance
      nearest = index
    }
  }

  return nearest
}

function spawnParticles(
  state: ArenaState,
  x: number,
  y: number,
  count: number,
  kind: number,
): void {
  const available = MAX_PARTICLES - state.particleCount
  const total = Math.min(count, available)

  for (let index = 0; index < total; index += 1) {
    const offset = state.particleCount * PARTICLE_STRIDE
    const angle = Math.random() * Math.PI * 2
    const speed = 35 + Math.random() * 230
    const life = 0.25 + Math.random() * 0.6

    state.particles[offset] = x
    state.particles[offset + 1] = y
    state.particles[offset + 2] = Math.cos(angle) * speed
    state.particles[offset + 3] = Math.sin(angle) * speed
    state.particles[offset + 4] = life
    state.particles[offset + 5] = life
    state.particles[offset + 6] = kind
    state.particleCount += 1
  }
}

function damageEnemy(state: ArenaState, index: number, damage: number): void {
  const offset = index * ENEMY_STRIDE
  const hp = state.enemies[offset + 4]! - damage
  const x = state.enemies[offset]!
  const y = state.enemies[offset + 1]!
  const kind = state.enemies[offset + 5]!

  state.enemies[offset + 4] = hp

  if (hp <= 0) {
    state.score += 10
    state.kills += 1
    spawnParticles(state, x, y, 7, kind)
    return
  }

  spawnParticles(state, x, y, 2, kind)
}

function spawnBullet(state: ArenaState, angle: number): void {
  if (state.bulletCount >= MAX_BULLETS) return

  const offset = state.bulletCount * BULLET_STRIDE
  state.bullets[offset] = state.playerX
  state.bullets[offset + 1] = state.playerY
  state.bullets[offset + 2] = Math.cos(angle) * BULLET_SPEED
  state.bullets[offset + 3] = Math.sin(angle) * BULLET_SPEED
  state.bullets[offset + 4] = BULLET_LIFE
  state.bulletCount += 1
}

function fire(state: ArenaState, targetIndex: number): void {
  const targetOffset = targetIndex * ENEMY_STRIDE
  const dx = state.enemies[targetOffset]! - state.playerX
  const dy = state.enemies[targetOffset + 1]! - state.playerY
  const angle = Math.atan2(dy, dx)

  spawnBullet(state, angle - 0.085)
  spawnBullet(state, angle)
  spawnBullet(state, angle + 0.085)
}

function triggerPulse(state: ArenaState): void {
  if (state.pulseCooldown > 0 || state.playerHp <= 0) return

  state.pulseCooldown = PULSE_COOLDOWN
  state.pulseTimer = PULSE_DURATION
  state.pulseX = state.playerX
  state.pulseY = state.playerY

  for (let index = 0; index < state.enemyCount; index += 1) {
    const offset = index * ENEMY_STRIDE
    if (state.enemies[offset + 4]! <= 0) continue

    const dx = state.enemies[offset]! - state.playerX
    const dy = state.enemies[offset + 1]! - state.playerY

    if (dx * dx + dy * dy <= PULSE_RADIUS * PULSE_RADIUS) {
      damageEnemy(state, index, 5)
    }
  }
}

function updatePlayer(state: ArenaState, targetX: number, targetY: number, dt: number): void {
  const dx = targetX - state.playerX
  const dy = targetY - state.playerY
  const distance = Math.hypot(dx, dy)
  const desiredSpeed = distance > 6 ? PLAYER_SPEED : 0
  const desiredX = distance > 0 ? (dx / distance) * desiredSpeed : 0
  const desiredY = distance > 0 ? (dy / distance) * desiredSpeed : 0
  const steer = Math.min(1, dt * 14)

  state.playerVx += (desiredX - state.playerVx) * steer
  state.playerVy += (desiredY - state.playerVy) * steer
  state.playerX = Math.max(
    PLAYER_RADIUS,
    Math.min(ARENA_WIDTH - PLAYER_RADIUS, state.playerX + state.playerVx * dt),
  )
  state.playerY = Math.max(
    PLAYER_RADIUS,
    Math.min(ARENA_HEIGHT - PLAYER_RADIUS, state.playerY + state.playerVy * dt),
  )
}

function updateSpawn(state: ArenaState, dt: number): void {
  if (state.enemyCount >= state.spawnTarget) return

  state.spawnAccumulator += SPAWN_RATE * dt

  while (state.spawnAccumulator >= 1 && state.enemyCount < state.spawnTarget) {
    state.spawnAccumulator -= 1
    spawnEdgeEnemy(state)
  }
}

function updateParticles(state: ArenaState, dt: number): void {
  for (let index = 0; index < state.particleCount; index += 1) {
    const offset = index * PARTICLE_STRIDE
    const life = state.particles[offset + 4]! - dt

    if (life <= 0) {
      const lastOffset = (state.particleCount - 1) * PARTICLE_STRIDE
      for (let field = 0; field < PARTICLE_STRIDE; field += 1) {
        state.particles[offset + field] = state.particles[lastOffset + field]!
      }
      state.particleCount -= 1
      index -= 1
      continue
    }

    state.particles[offset + 4] = life
    state.particles[offset + 2] = state.particles[offset + 2]! * 0.985
    state.particles[offset + 3] = state.particles[offset + 3]! * 0.985
    state.particles[offset] = state.particles[offset]! + state.particles[offset + 2]! * dt
    state.particles[offset + 1] = state.particles[offset + 1]! + state.particles[offset + 3]! * dt
  }
}

function compactBullets(state: ArenaState): void {
  for (let index = 0; index < state.bulletCount; index += 1) {
    const offset = index * BULLET_STRIDE
    const life = state.bullets[offset + 4]!
    const x = state.bullets[offset]!
    const y = state.bullets[offset + 1]!

    if (life > 0 && x >= 0 && x <= ARENA_WIDTH && y >= 0 && y <= ARENA_HEIGHT) continue

    const lastOffset = (state.bulletCount - 1) * BULLET_STRIDE
    for (let field = 0; field < BULLET_STRIDE; field += 1) {
      state.bullets[offset + field] = state.bullets[lastOffset + field]!
    }
    state.bulletCount -= 1
    index -= 1
  }
}

function compactEnemies(state: ArenaState): void {
  for (let index = 0; index < state.enemyCount; index += 1) {
    const offset = index * ENEMY_STRIDE
    if (state.enemies[offset + 4]! > 0) continue

    const lastOffset = (state.enemyCount - 1) * ENEMY_STRIDE
    for (let field = 0; field < ENEMY_STRIDE; field += 1) {
      state.enemies[offset + field] = state.enemies[lastOffset + field]!
    }
    state.enemyCount -= 1
    index -= 1
  }
}

export function resetArena(state: ArenaState, target: number): void {
  state.enemyCount = 0
  state.bulletCount = 0
  state.particleCount = 0
  state.playerX = ARENA_WIDTH / 2
  state.playerY = ARENA_HEIGHT / 2
  state.playerVx = 0
  state.playerVy = 0
  state.playerHp = PLAYER_HP
  state.playerInvuln = 1.4
  state.fireCooldown = 0
  state.pulseCooldown = 0
  state.pulseTimer = 0
  state.pulseX = state.playerX
  state.pulseY = state.playerY
  state.aimX = state.playerX + 1
  state.aimY = state.playerY
  state.score = 0
  state.kills = 0
  state.time = 0
  state.spawnAccumulator = 0
  state.spawnTarget = Math.min(target, MAX_ENEMIES)
  state.deadTimer = 0

  for (let index = 0; index < state.spawnTarget; index += 1) {
    const x = Math.random() * ARENA_WIDTH
    const y = Math.random() * ARENA_HEIGHT
    const dx = x - state.playerX
    const dy = y - state.playerY
    const distance = Math.hypot(dx, dy)

    if (distance < 110) {
      spawnEnemy(
        state,
        Math.max(12, Math.min(ARENA_WIDTH - 12, x + (dx >= 0 ? 130 : -130))),
        Math.max(12, Math.min(ARENA_HEIGHT - 12, y + (dy >= 0 ? 90 : -90))),
        enemyKind(),
      )
    } else {
      spawnEnemy(state, x, y, enemyKind())
    }
  }
}

export function createArena(target: number): ArenaState {
  const state: ArenaState = {
    enemies: new Float32Array(MAX_ENEMIES * ENEMY_STRIDE),
    enemyCount: 0,
    bullets: new Float32Array(MAX_BULLETS * BULLET_STRIDE),
    bulletCount: 0,
    particles: new Float32Array(MAX_PARTICLES * PARTICLE_STRIDE),
    particleCount: 0,
    playerX: ARENA_WIDTH / 2,
    playerY: ARENA_HEIGHT / 2,
    playerVx: 0,
    playerVy: 0,
    playerHp: PLAYER_HP,
    playerInvuln: 0,
    fireCooldown: 0,
    pulseCooldown: 0,
    pulseTimer: 0,
    pulseX: ARENA_WIDTH / 2,
    pulseY: ARENA_HEIGHT / 2,
    aimX: ARENA_WIDTH / 2 + 1,
    aimY: ARENA_HEIGHT / 2,
    score: 0,
    kills: 0,
    time: 0,
    spawnAccumulator: 0,
    spawnTarget: target,
    deadTimer: 0,
  }

  resetArena(state, target)
  return state
}

export function stepEnemies(state: ArenaState, dt: number): void {
  const enemies = state.enemies
  const count = state.enemyCount
  const playerX = state.playerX
  const playerY = state.playerY

  for (let index = 0; index < count; index += 1) {
    const offset = index * ENEMY_STRIDE
    let x = enemies[offset]!
    let y = enemies[offset + 1]!
    let vx = enemies[offset + 2]!
    let vy = enemies[offset + 3]!
    const kind = enemies[offset + 5]!
    let separationX = 0
    let separationY = 0

    for (let otherIndex = 0; otherIndex < count; otherIndex += 1) {
      if (otherIndex === index) continue

      const otherOffset = otherIndex * ENEMY_STRIDE
      const dx = enemies[otherOffset]! - x
      const dy = enemies[otherOffset + 1]! - y
      const distanceSquared = dx * dx + dy * dy

      if (distanceSquared === 0 || distanceSquared > ENEMY_SEPARATION * ENEMY_SEPARATION) continue

      const inverseDistance = 1 / Math.sqrt(distanceSquared)
      separationX -= dx * inverseDistance
      separationY -= dy * inverseDistance
    }

    const dx = playerX - x
    const dy = playerY - y
    const distance = Math.hypot(dx, dy)
    const speed = enemySpeed(kind)
    const desiredX = (distance > 0 ? (dx / distance) * speed : 0) + separationX * 34
    const desiredY = (distance > 0 ? (dy / distance) * speed : 0) + separationY * 34
    const steer = Math.min(1, dt * 4.5)

    vx += (desiredX - vx) * steer
    vy += (desiredY - vy) * steer
    x = Math.max(0, Math.min(ARENA_WIDTH, x + vx * dt))
    y = Math.max(0, Math.min(ARENA_HEIGHT, y + vy * dt))

    enemies[offset] = x
    enemies[offset + 1] = y
    enemies[offset + 2] = vx
    enemies[offset + 3] = vy
  }
}

export function stepArenaControls(
  state: ArenaState,
  targetX: number,
  targetY: number,
  pulse: boolean,
  dt: number,
): void {
  state.playerInvuln = Math.max(0, state.playerInvuln - dt)
  state.fireCooldown = Math.max(0, state.fireCooldown - dt)
  state.pulseCooldown = Math.max(0, state.pulseCooldown - dt)
  state.pulseTimer = Math.max(0, state.pulseTimer - dt)

  if (state.playerHp <= 0) return

  updatePlayer(state, targetX, targetY, dt)

  if (pulse) triggerPulse(state)

  updateSpawn(state, dt)

  const target = nearestEnemy(state)

  if (target >= 0) {
    const offset = target * ENEMY_STRIDE
    state.aimX = state.enemies[offset]!
    state.aimY = state.enemies[offset + 1]!
  } else {
    state.aimX = targetX
    state.aimY = targetY
  }

  if (state.fireCooldown <= 0 && target >= 0) {
    state.fireCooldown += FIRE_INTERVAL
    fire(state, target)
  }
}

export function stepArenaProjectiles(state: ArenaState, dt: number): void {
  state.time += dt

  if (state.playerHp <= 0) {
    state.deadTimer += dt
    updateParticles(state, dt)

    if (state.deadTimer > 1.6) {
      resetArena(state, state.spawnTarget)
    }

    return
  }

  for (let index = 0; index < state.bulletCount; index += 1) {
    const offset = index * BULLET_STRIDE
    state.bullets[offset + 4] = state.bullets[offset + 4]! - dt
    state.bullets[offset] = state.bullets[offset]! + state.bullets[offset + 2]! * dt
    state.bullets[offset + 1] = state.bullets[offset + 1]! + state.bullets[offset + 3]! * dt
  }

  for (let bulletIndex = 0; bulletIndex < state.bulletCount; bulletIndex += 1) {
    const bulletOffset = bulletIndex * BULLET_STRIDE
    if (state.bullets[bulletOffset + 4]! <= 0) continue

    const x = state.bullets[bulletOffset]!
    const y = state.bullets[bulletOffset + 1]!

    for (let enemyIndex = 0; enemyIndex < state.enemyCount; enemyIndex += 1) {
      const enemyOffset = enemyIndex * ENEMY_STRIDE
      if (state.enemies[enemyOffset + 4]! <= 0) continue

      const dx = state.enemies[enemyOffset]! - x
      const dy = state.enemies[enemyOffset + 1]! - y
      const radius = enemyRadius(state.enemies[enemyOffset + 5]!) + 3

      if (dx * dx + dy * dy > radius * radius) continue

      state.bullets[bulletOffset + 4] = 0
      damageEnemy(state, enemyIndex, 1)
      break
    }
  }

  compactBullets(state)

  if (state.playerInvuln <= 0) {
    for (let enemyIndex = 0; enemyIndex < state.enemyCount; enemyIndex += 1) {
      const offset = enemyIndex * ENEMY_STRIDE
      if (state.enemies[offset + 4]! <= 0) continue

      const dx = state.enemies[offset]! - state.playerX
      const dy = state.enemies[offset + 1]! - state.playerY
      const radius = PLAYER_RADIUS + enemyRadius(state.enemies[offset + 5]!)

      if (dx * dx + dy * dy > radius * radius) continue

      state.playerHp = Math.max(
        0,
        state.playerHp - enemyDamage(state.enemies[offset + 5]!),
      )
      state.playerInvuln = 0.45
      state.enemies[offset + 4] = 0
      spawnParticles(state, state.enemies[offset]!, state.enemies[offset + 1]!, 9, 2)
      break
    }
  }

  compactEnemies(state)
  updateParticles(state, dt)
}

export function stepArena(
  state: ArenaState,
  targetX: number,
  targetY: number,
  pulse: boolean,
  dt: number,
): void {
  stepArenaControls(state, targetX, targetY, pulse, dt)

  if (state.playerHp > 0) {
    stepEnemies(state, dt)
  }

  stepArenaProjectiles(state, dt)
}

function drawEnemyPaths(state: ArenaState): readonly Path2D[] {
  const paths = [new Path2D(), new Path2D(), new Path2D()]

  for (let index = 0; index < state.enemyCount; index += 1) {
    const offset = index * ENEMY_STRIDE
    const x = state.enemies[offset]!
    const y = state.enemies[offset + 1]!
    const vx = state.enemies[offset + 2]!
    const vy = state.enemies[offset + 3]!
    const kind = state.enemies[offset + 5]!
    const radius = enemyRadius(kind)
    const angle = Math.atan2(vy, vx)
    const path = paths[kind] ?? paths[0]!

    path.moveTo(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius)
    path.lineTo(
      x + Math.cos(angle + 2.45) * radius * 0.82,
      y + Math.sin(angle + 2.45) * radius * 0.82,
    )
    path.lineTo(
      x + Math.cos(angle - 2.45) * radius * 0.82,
      y + Math.sin(angle - 2.45) * radius * 0.82,
    )
    path.closePath()
  }

  return paths
}

function drawBullets(context: CanvasRenderingContext2D, state: ArenaState): void {
  const path = new Path2D()

  for (let index = 0; index < state.bulletCount; index += 1) {
    const offset = index * BULLET_STRIDE
    const x = state.bullets[offset]!
    const y = state.bullets[offset + 1]!
    const vx = state.bullets[offset + 2]!
    const vy = state.bullets[offset + 3]!

    path.moveTo(x, y)
    path.lineTo(x - vx * 0.016, y - vy * 0.016)
  }

  context.strokeStyle = 'rgba(255, 225, 132, 0.92)'
  context.lineWidth = 1.35
  context.stroke(path)
}

function drawParticles(context: CanvasRenderingContext2D, state: ArenaState): void {
  context.fillStyle = 'rgba(255, 188, 105, 0.82)'

  for (let index = 0; index < state.particleCount; index += 1) {
    const offset = index * PARTICLE_STRIDE
    const life = state.particles[offset + 4]!
    const maxLife = state.particles[offset + 5]!
    const size = 1 + (life / maxLife) * 2.2

    context.fillRect(
      state.particles[offset]! - size / 2,
      state.particles[offset + 1]! - size / 2,
      size,
      size,
    )
  }
}

function drawPlayer(context: CanvasRenderingContext2D, state: ArenaState): void {
  const angle = Math.atan2(state.aimY - state.playerY, state.aimX - state.playerX)
  const x = state.playerX
  const y = state.playerY

  context.save()
  context.translate(x, y)
  context.rotate(angle)
  context.shadowColor = 'rgba(126, 231, 255, 0.9)'
  context.shadowBlur = 16
  context.fillStyle = '#9af5ff'
  context.beginPath()
  context.moveTo(15, 0)
  context.lineTo(-10, 8)
  context.lineTo(-5, 0)
  context.lineTo(-10, -8)
  context.closePath()
  context.fill()
  context.restore()

  if (state.playerInvuln > 0) {
    context.beginPath()
    context.arc(x, y, PLAYER_RADIUS + 8, 0, Math.PI * 2)
    context.strokeStyle = 'rgba(126, 231, 255, 0.55)'
    context.lineWidth = 1
    context.stroke()
  }
}

function drawPulse(context: CanvasRenderingContext2D, state: ArenaState): void {
  if (state.pulseTimer <= 0) return

  const progress = 1 - state.pulseTimer / PULSE_DURATION
  const radius = 20 + progress * PULSE_RADIUS
  const alpha = Math.max(0, state.pulseTimer / PULSE_DURATION)

  context.beginPath()
  context.arc(state.pulseX, state.pulseY, radius, 0, Math.PI * 2)
  context.strokeStyle = `rgba(126, 231, 255, ${alpha * 0.8})`
  context.lineWidth = 2
  context.stroke()
}

function drawHud(context: CanvasRenderingContext2D, state: ArenaState): void {
  const healthRatio = Math.max(0, state.playerHp / PLAYER_HP)
  const barWidth = 190
  const barHeight = 7
  const barX = 18
  const barY = ARENA_HEIGHT - 26

  context.font = '600 13px ui-monospace, SFMono-Regular, Menlo, monospace'
  context.textBaseline = 'top'
  context.fillStyle = 'rgba(240, 247, 255, 0.88)'
  context.fillText(`SCORE ${state.score}`, 18, 18)
  context.fillText(`KILLS ${state.kills}`, 18, 38)

  context.textAlign = 'right'
  context.fillText(`ENEMIES ${state.enemyCount}`, ARENA_WIDTH - 18, 18)
  context.fillText(`T+${state.time.toFixed(1)}s`, ARENA_WIDTH - 18, 38)
  context.textAlign = 'left'

  context.fillStyle = 'rgba(255, 255, 255, 0.14)'
  context.fillRect(barX, barY, barWidth, barHeight)
  context.fillStyle = healthRatio > 0.35 ? '#7ee7ff' : '#ff6b5e'
  context.fillRect(barX, barY, barWidth * healthRatio, barHeight)
  context.fillStyle = 'rgba(240, 247, 255, 0.6)'
  context.font = '600 10px ui-monospace, SFMono-Regular, Menlo, monospace'
  context.fillText('HULL', barX, barY - 15)

  if (state.playerHp <= 0) {
    context.textAlign = 'center'
    context.fillStyle = 'rgba(255, 107, 94, 0.92)'
    context.font = '700 28px ui-monospace, SFMono-Regular, Menlo, monospace'
    context.fillText('SYSTEM FAILURE', ARENA_WIDTH / 2, ARENA_HEIGHT / 2 - 20)
    context.fillStyle = 'rgba(240, 247, 255, 0.65)'
    context.font = '600 12px ui-monospace, SFMono-Regular, Menlo, monospace'
    context.fillText('rebooting arena...', ARENA_WIDTH / 2, ARENA_HEIGHT / 2 + 22)
    context.textAlign = 'left'
  }
}

export function drawArena(context: CanvasRenderingContext2D, state: ArenaState): void {
  const canvas = context.canvas
  const scaleX = canvas.width / ARENA_WIDTH
  const scaleY = canvas.height / ARENA_HEIGHT

  context.setTransform(scaleX, 0, 0, scaleY, 0, 0)
  context.fillStyle = '#05070c'
  context.fillRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT)

  context.strokeStyle = 'rgba(126, 231, 255, 0.055)'
  context.lineWidth = 1
  context.beginPath()

  for (let x = 0; x <= ARENA_WIDTH; x += 60) {
    context.moveTo(x, 0)
    context.lineTo(x, ARENA_HEIGHT)
  }

  for (let y = 0; y <= ARENA_HEIGHT; y += 60) {
    context.moveTo(0, y)
    context.lineTo(ARENA_WIDTH, y)
  }

  context.stroke()

  drawParticles(context, state)
  const paths = drawEnemyPaths(state)
  context.fillStyle = '#ff8a4c'
  context.fill(paths[0] ?? new Path2D())
  context.fillStyle = '#ff5c8a'
  context.fill(paths[1] ?? new Path2D())
  context.fillStyle = '#ff3b30'
  context.fill(paths[2] ?? new Path2D())
  drawBullets(context, state)
  drawPulse(context, state)
  drawPlayer(context, state)
  drawHud(context, state)
}
