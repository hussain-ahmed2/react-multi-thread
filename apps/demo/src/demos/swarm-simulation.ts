const STRIDE = 4
const VISION = 52
const VISION_SQUARED = VISION * VISION
const SEPARATION = 20
const SEPARATION_SQUARED = SEPARATION * SEPARATION
const MAX_SPEED = 132
const MAX_FORCE = 118
const EDGE = 44
const POINTER_RADIUS = 118
const POINTER_RADIUS_SQUARED = POINTER_RADIUS * POINTER_RADIUS

export const SWARM_WIDTH = 960
export const SWARM_HEIGHT = 540

export function createSwarm(count: number, width = SWARM_WIDTH, height = SWARM_HEIGHT): Float32Array {
  const boids = new Float32Array(count * STRIDE)

  for (let index = 0; index < count; index += 1) {
    const offset = index * STRIDE
    const angle = Math.random() * Math.PI * 2
    const speed = 45 + Math.random() * 75

    boids[offset] = Math.random() * width
    boids[offset + 1] = Math.random() * height
    boids[offset + 2] = Math.cos(angle) * speed
    boids[offset + 3] = Math.sin(angle) * speed
  }

  return boids
}

export function stepSwarm(
  boids: Float32Array,
  count: number,
  width: number,
  height: number,
  pointerX: number | null,
  pointerY: number | null,
  dt: number,
): number {
  let checks = 0

  for (let index = 0; index < count; index += 1) {
    const offset = index * STRIDE
    const x = boids[offset]!
    const y = boids[offset + 1]!
    const vx = boids[offset + 2]!
    const vy = boids[offset + 3]!

    let alignX = 0
    let alignY = 0
    let cohesionX = 0
    let cohesionY = 0
    let separationX = 0
    let separationY = 0
    let neighbors = 0

    for (let otherIndex = 0; otherIndex < count; otherIndex += 1) {
      if (otherIndex === index) continue

      const otherOffset = otherIndex * STRIDE
      const dx = boids[otherOffset]! - x
      const dy = boids[otherOffset + 1]! - y
      const distanceSquared = dx * dx + dy * dy

      checks += 1

      if (distanceSquared > VISION_SQUARED || distanceSquared === 0) continue

      alignX += boids[otherOffset + 2]!
      alignY += boids[otherOffset + 3]!
      cohesionX += dx
      cohesionY += dy
      neighbors += 1

      if (distanceSquared < SEPARATION_SQUARED) {
        const inverseDistance = 1 / Math.sqrt(distanceSquared)
        separationX -= dx * inverseDistance
        separationY -= dy * inverseDistance
      }
    }

    let accelerationX = 0
    let accelerationY = 0

    if (neighbors > 0) {
      accelerationX += (alignX / neighbors) * 1.15 + (cohesionX / neighbors) * 0.42
      accelerationY += (alignY / neighbors) * 1.15 + (cohesionY / neighbors) * 0.42
    }

    accelerationX += separationX * 1.8
    accelerationY += separationY * 1.8

    if (x < EDGE) accelerationX += (EDGE - x) * 3.4
    if (x > width - EDGE) accelerationX -= (x - (width - EDGE)) * 3.4
    if (y < EDGE) accelerationY += (EDGE - y) * 3.4
    if (y > height - EDGE) accelerationY -= (y - (height - EDGE)) * 3.4

    if (pointerX !== null && pointerY !== null) {
      const pointerDx = x - pointerX
      const pointerDy = y - pointerY
      const pointerDistanceSquared = pointerDx * pointerDx + pointerDy * pointerDy

      if (pointerDistanceSquared > 0 && pointerDistanceSquared < POINTER_RADIUS_SQUARED) {
        const inverseDistance = 1 / Math.sqrt(pointerDistanceSquared)
        const strength = (1 - pointerDistanceSquared / POINTER_RADIUS_SQUARED) * 620
        accelerationX += pointerDx * inverseDistance * strength
        accelerationY += pointerDy * inverseDistance * strength
      }
    }

    const force = Math.hypot(accelerationX, accelerationY)

    if (force > MAX_FORCE) {
      const scale = MAX_FORCE / force
      accelerationX *= scale
      accelerationY *= scale
    }

    let nextVx = vx + accelerationX * dt
    let nextVy = vy + accelerationY * dt
    const speed = Math.hypot(nextVx, nextVy)

    if (speed > MAX_SPEED) {
      const scale = MAX_SPEED / speed
      nextVx *= scale
      nextVy *= scale
    }

    let nextX = x + nextVx * dt
    let nextY = y + nextVy * dt

    if (nextX < 0) {
      nextX = 0
      nextVx = Math.abs(nextVx)
    } else if (nextX > width) {
      nextX = width
      nextVx = -Math.abs(nextVx)
    }

    if (nextY < 0) {
      nextY = 0
      nextVy = Math.abs(nextVy)
    } else if (nextY > height) {
      nextY = height
      nextVy = -Math.abs(nextVy)
    }

    boids[offset] = nextX
    boids[offset + 1] = nextY
    boids[offset + 2] = nextVx
    boids[offset + 3] = nextVy
  }

  return checks
}

export function drawSwarm(
  context: CanvasRenderingContext2D,
  boids: Float32Array,
  count: number,
  width: number,
  height: number,
  pointerX: number | null,
  pointerY: number | null,
  trailAlpha = 0.28,
): void {
  const canvas = context.canvas
  const scaleX = canvas.width / width
  const scaleY = canvas.height / height

  context.setTransform(scaleX, 0, 0, scaleY, 0, 0)
  context.fillStyle = `rgba(4, 6, 11, ${trailAlpha})`
  context.fillRect(0, 0, width, height)

  if (pointerX !== null && pointerY !== null) {
    context.beginPath()
    context.arc(pointerX, pointerY, 118, 0, Math.PI * 2)
    context.strokeStyle = 'rgba(126, 231, 255, 0.08)'
    context.lineWidth = 1
    context.stroke()

    context.beginPath()
    context.arc(pointerX, pointerY, 24, 0, Math.PI * 2)
    context.strokeStyle = 'rgba(126, 231, 255, 0.38)'
    context.stroke()
  }

  const slow = new Path2D()
  const fast = new Path2D()

  for (let index = 0; index < count; index += 1) {
    const offset = index * STRIDE
    const x = boids[offset]!
    const y = boids[offset + 1]!
    const vx = boids[offset + 2]!
    const vy = boids[offset + 3]!
    const path = Math.hypot(vx, vy) > 100 ? fast : slow

    path.moveTo(x, y)
    path.lineTo(x - vx * 0.055, y - vy * 0.055)
  }

  context.lineCap = 'round'
  context.lineWidth = 1.35
  context.strokeStyle = 'rgba(74, 164, 255, 0.44)'
  context.stroke(slow)
  context.strokeStyle = 'rgba(170, 255, 241, 0.88)'
  context.stroke(fast)
}
