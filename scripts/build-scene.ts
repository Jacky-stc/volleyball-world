import { writeFile } from 'node:fs/promises'
import { BoxGeometry, Group, Mesh, MeshStandardMaterial } from 'three'
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js'
import { courtDimensions } from '../apps/client/src/game/scenes/SceneManager'

class BinaryFileReader {
  result: ArrayBuffer | null = null
  onloadend?: () => void
  readAsArrayBuffer(blob: Blob) {
    blob.arrayBuffer().then((buffer) => {
      this.result = buffer
      this.onloadend?.()
    })
  }
}
Object.assign(globalThis, { FileReader: BinaryFileReader })

async function main() {
  const scene = new Group()
  scene.name = 'Orange and turquoise volleyball court'
  const palette = new Map<string, MeshStandardMaterial>()
  function box(size: [number, number, number], position: [number, number, number], color: string) {
    if (!palette.has(color)) palette.set(color, new MeshStandardMaterial({ color, roughness: 0.82 }))
    const mesh = new Mesh(new BoxGeometry(...size), palette.get(color))
    mesh.position.set(...position)
    scene.add(mesh)
  }
  const { width, length, apron, netHeight } = courtDimensions
  const white = '#fff8ec'
  box([width + apron * 2, 0.3, length + apron * 2], [0, -0.15, 0], '#008fa6')
  box([width, 0.008, length], [0, 0.004, 0], '#ed642f')
  box([width, 0.008, 6], [0, 0.009, 0], '#e99078')
  // Painted lines have no raised collision geometry.
  for (const x of [-width / 2 + 0.025, width / 2 - 0.025]) box([0.05, 0.006, length], [x, 0.017, 0], white)
  for (const z of [-length / 2 + 0.025, length / 2 - 0.025, -3, 0, 3]) box([width, 0.006, 0.05], [0, 0.017, z], white)
  for (const x of [-width / 2, width / 2]) {
    for (const z of [-9.25, 9.25]) box([0.05, 0.006, 0.15], [x, 0.017, z], white)
  }
  // Static visual net only: ball response and match rules remain out of scope.
  const bottom = netHeight - 1
  for (let x = -5; x <= 5.001; x += 0.125) box([0.009, 1, 0.009], [x, bottom + 0.5, 0], '#273e43')
  for (let y = bottom; y <= netHeight + 0.001; y += 0.125) box([10, 0.009, 0.009], [0, y, 0], '#273e43')
  box([10, 0.07, 0.045], [0, netHeight, 0], white)
  box([10, 0.05, 0.035], [0, bottom, 0], white)
  for (const x of [-5.2, 5.2]) {
    box([0.15, 2.65, 0.15], [x, 1.325, 0], '#dbe7e4')
    box([0.32, 1.8, 0.32], [x, 0.9, 0], '#006e89')
    box([0.2, 0.025, 0.025], [Math.sign(x) * 5.1, netHeight, 0], '#dde9e5')
  }
  for (const x of [-4.5, 4.5]) {
    box([0.045, 1, 0.045], [x, bottom + 0.5, 0], white)
    for (let i = 0; i < 8; i++) box([0.025, 0.1, 0.025], [x, netHeight + 0.05 + i * 0.1, 0], i % 2 ? white : '#d84c38')
  }
  const binary = await new GLTFExporter().parseAsync(scene, { binary: true })
  await writeFile('apps/client/public/assets/scenes/court.glb', Buffer.from(binary as ArrayBuffer))
  console.log('Created court.glb (9 × 18 court, 15 × 24 total floor).')
}
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
