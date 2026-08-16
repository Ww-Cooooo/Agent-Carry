// Optional cross-platform helper for Agents maintaining the dashboard snapshot.
// It copies one already-generated snapshot into development and offline runtime
// locations. It does not scan formal memory and never writes back to sources.

import { copyFile, mkdir, stat } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..', '..')
const source = process.argv[2]
  ? resolve(process.cwd(), process.argv[2])
  : resolve(root, '.assistant-local', 'dashboard', 'snapshot.js')
const targets = [
  resolve(root, 'dashboard', 'public', 'snapshot.js'),
  resolve(root, 'dashboard', 'dist', 'snapshot.js'),
]

await stat(source)
for (const target of targets) {
  await mkdir(dirname(target), { recursive: true })
  await copyFile(source, target)
}

console.log(`Snapshot synchronized from ${source}`)
