export interface BoxCollider {
  center: [number, number, number]
  halfExtents: [number, number, number]
}

export const courtDimensions = { width: 9, length: 18, apron: 3, netHeight: 2.43 }
const halfWidth = courtDimensions.width / 2 + courtDimensions.apron
const halfLength = courtDimensions.length / 2 + courtDimensions.apron
export const courtScene = {
  id: 'court',
  model: '/assets/scenes/court.glb',
  spawn: { x: 0, y: 0.04, z: 6 },
  colliders: [
    { center: [0, -0.15, 0], halfExtents: [halfWidth, 0.15, halfLength] },
    { center: [-halfWidth, 1, 0], halfExtents: [0.05, 2, halfLength] },
    { center: [halfWidth, 1, 0], halfExtents: [0.05, 2, halfLength] },
    { center: [0, 1, -halfLength], halfExtents: [halfWidth, 2, 0.05] },
    { center: [0, 1, halfLength], halfExtents: [halfWidth, 2, 0.05] },
    ...[-5.2, 5.2].map((x) => ({ center: [x, 1.3, 0], halfExtents: [0.16, 1.3, 0.16] })),
  ] as BoxCollider[],
}

export class SceneManager {
  load(id: 'court') {
    if (id !== courtScene.id) throw new Error(`Unknown scene: ${id}`)
    return courtScene
  }
}
