// Repository-level open-source compliance gate.
// It keeps copied source templates, packaged fonts, npm dependency licenses
// and tracked binary assets from silently escaping the documented inventory.

import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { access, readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const dashboardRoot = resolve(here, '..')
const repositoryRoot = resolve(dashboardRoot, '..')
const publicRoot = resolve(dashboardRoot, 'public')

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

async function exists(path) {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex')
}

function normalizedText(value) {
  return value.replace(/\r\n/g, '\n').trim()
}

function packageNameFromLockPath(packageKey) {
  const marker = 'node_modules/'
  const remainder = packageKey.slice(packageKey.lastIndexOf(marker) + marker.length)
  const parts = remainder.split('/')
  return parts[0].startsWith('@') ? `${parts[0]}/${parts[1]}` : parts[0]
}

const [rootLicense, thirdPartyNotices, licenseReadme, packageJson, packageLock, productionInventory, productionNotices, fontManifest, sourceComponents, projectAssets] =
  await Promise.all([
    readFile(resolve(repositoryRoot, 'LICENSE'), 'utf8'),
    readFile(resolve(repositoryRoot, 'THIRD_PARTY_NOTICES.md'), 'utf8'),
    readFile(resolve(publicRoot, 'licenses', 'README.txt'), 'utf8'),
    readFile(resolve(dashboardRoot, 'package.json'), 'utf8').then(JSON.parse),
    readFile(resolve(dashboardRoot, 'package-lock.json'), 'utf8').then(JSON.parse),
    readFile(resolve(publicRoot, 'licenses', 'dashboard-production-dependencies.json'), 'utf8').then(JSON.parse),
    readFile(resolve(publicRoot, 'licenses', 'dashboard-production-dependencies.txt'), 'utf8'),
    readFile(resolve(publicRoot, 'fonts', 'font-manifest.json'), 'utf8').then(JSON.parse),
    readFile(resolve(publicRoot, 'licenses', 'source-code', 'source-components.json'), 'utf8').then(JSON.parse),
    readFile(resolve(repositoryRoot, 'docs', 'assets', 'project-assets.json'), 'utf8').then(JSON.parse),
  ])

for (const marker of ['Apache License', 'Version 2.0, January 2004', 'END OF TERMS AND CONDITIONS']) {
  assert(rootLicense.includes(marker), `Root Apache-2.0 license is incomplete: ${marker}`)
}
assert(packageJson.license === 'Apache-2.0', 'Dashboard package metadata must use SPDX Apache-2.0.')

const reviewedLockLicenses = new Set(['MIT', 'Apache-2.0', 'ISC', '0BSD', 'BSD-3-Clause', 'MPL-2.0'])
const reviewedRuntimeLicenses = new Set(['MIT', 'Apache-2.0', 'ISC', '0BSD', 'BSD-3-Clause'])
const lockEntries = Object.entries(packageLock.packages ?? {}).filter(([key]) => key.includes('node_modules/'))
const lockLicenseCounts = {}
for (const [key, metadata] of lockEntries) {
  const license = typeof metadata.license === 'string' ? metadata.license.trim() : ''
  assert(license, `Lock entry has no SPDX license metadata: ${key}`)
  assert(reviewedLockLicenses.has(license), `Unreviewed dependency license ${license}: ${key}`)
  const scope = metadata.dev === true ? 'build' : 'runtime'
  lockLicenseCounts[`${scope}:${license}`] = (lockLicenseCounts[`${scope}:${license}`] ?? 0) + 1
}

const expectedProductionKeys = new Set(
  lockEntries
    .filter(([, metadata]) => metadata.dev !== true)
    .map(([key, metadata]) => `${packageNameFromLockPath(key)}@${metadata.version}`),
)
const inventoriedProductionKeys = new Set(
  productionInventory.packages.map((entry) => `${entry.name}@${entry.version}`),
)
assert(
  expectedProductionKeys.size === inventoriedProductionKeys.size &&
    [...expectedProductionKeys].every((key) => inventoriedProductionKeys.has(key)),
  'Production dependency inventory does not match the non-dev lock-file closure.',
)
for (const entry of productionInventory.packages) {
  assert(reviewedRuntimeLicenses.has(entry.license), `Unreviewed runtime license ${entry.license}: ${entry.name}@${entry.version}`)
  assert(entry.repository, `Production dependency has no upstream source: ${entry.name}@${entry.version}`)
  assert(Array.isArray(entry.licenseFiles) && entry.licenseFiles.length > 0, `Production dependency has no license text: ${entry.name}@${entry.version}`)
  assert(productionNotices.includes(`${entry.name}@${entry.version}`), `Production notice text omits ${entry.name}@${entry.version}`)
}

assert(sourceComponents.schemaVersion === 1, 'Unsupported source-component inventory schema.')
assert(Array.isArray(sourceComponents.components) && sourceComponents.components.length > 0, 'Source-component inventory is empty.')
for (const component of sourceComponents.components) {
  assert(component.name && component.license && component.copyright, 'Source-component identity is incomplete.')
  assert(/^[0-9a-f]{40}$/.test(component.upstreamCommit), `Source component is not pinned to a full commit: ${component.name}`)
  assert(component.upstreamLicense.includes(component.upstreamCommit), `License URL is not pinned to the reviewed commit: ${component.name}`)
  const licensePath = resolve(publicRoot, ...component.licenseFile.split('/'))
  const licenseText = normalizedText(await readFile(licensePath, 'utf8'))
  assert(sha256(licenseText) === component.licenseSha256, `Source-component license checksum mismatch: ${component.name}`)
  assert(licenseText.includes(component.copyright), `Source-component copyright is absent from its license: ${component.name}`)
  for (const mapping of component.adaptedFiles ?? []) {
    assert(await exists(resolve(repositoryRoot, ...mapping.local.split('/'))), `Attributed local source is missing: ${mapping.local}`)
    assert(mapping.upstream, `Attributed source has no upstream mapping: ${mapping.local}`)
  }
  for (const local of component.relatedScaffoldFiles ?? []) {
    assert(await exists(resolve(repositoryRoot, ...local.split('/'))), `Attributed scaffold is missing: ${local}`)
  }
  assert(thirdPartyNotices.includes(component.name), `THIRD_PARTY_NOTICES.md omits ${component.name}`)
}
assert(licenseReadme.includes('source-code/'), 'Offline license README does not explain copied source-component notices.')

assert(fontManifest.schemaVersion === 1, 'Unsupported font manifest schema.')
assert(Array.isArray(fontManifest.fonts) && fontManifest.fonts.length === 4, 'Font manifest must contain four packaged faces.')
const expectedFontAssets = new Set()
for (const font of fontManifest.fonts) {
  assert(font.licenseSpdx === 'OFL-1.1', `Font is not identified with SPDX OFL-1.1: ${font.file}`)
  assert(font.copyright, `Font copyright is missing: ${font.file}`)
  assert(Array.isArray(font.reservedFontNames), `Font RFN review is missing: ${font.file}`)
  assert(font.source?.repository && !font.source.repository.includes('/main/'), `Font source is not pinned: ${font.file}`)
  assert(font.source?.sha256 || font.source?.archiveSha256, `Font source checksum is missing: ${font.file}`)
  const fontBytes = await readFile(resolve(publicRoot, 'fonts', font.file))
  assert(sha256(fontBytes) === font.sha256, `Font checksum mismatch: ${font.file}`)
  const fontLicense = normalizedText(await readFile(resolve(publicRoot, 'fonts', font.licenseFile), 'utf8'))
  assert(sha256(fontLicense) === font.licenseSha256, `Font license checksum mismatch: ${font.file}`)
  assert(/SIL OPEN FONT LICENSE Version 1\.1/i.test(fontLicense), `OFL 1.1 text is absent: ${font.file}`)
  const validation = font.conversionValidation
  assert(validation?.nameTableMetadataMatched === true, `Font metadata preservation is unverified: ${font.file}`)
  assert(validation.sourceGlyphCount === validation.outputGlyphCount, `Font glyph count changed during conversion: ${font.file}`)
  assert(validation.sourceUnicodeMappingCount === validation.outputUnicodeMappingCount, `Font cmap changed during conversion: ${font.file}`)
  expectedFontAssets.add(`dashboard/public/fonts/${font.file}`)
  expectedFontAssets.add(`dashboard/dist/fonts/${font.file}`)
}

const tracked = execFileSync('git', ['ls-files', '-z'], { cwd: repositoryRoot })
  .toString('utf8')
  .split('\0')
  .filter(Boolean)
const trackedSet = new Set(tracked)

assert(projectAssets.schemaVersion === 1, 'Unsupported project-asset inventory schema.')
assert(Array.isArray(projectAssets.assets), 'Project-asset inventory is invalid.')
const expectedProjectAssets = new Set()
for (const asset of projectAssets.assets) {
  assert(asset.path && asset.sha256 && asset.origin, 'Project asset provenance is incomplete.')
  assert(asset.license === 'Apache-2.0', `Project-generated asset must use the project license: ${asset.path}`)
  const assetBytes = await readFile(resolve(repositoryRoot, ...asset.path.split('/')))
  assert(sha256(assetBytes) === asset.sha256, `Project-asset checksum mismatch: ${asset.path}`)
  expectedProjectAssets.add(asset.path)
}
for (const required of [
  'LICENSE',
  'THIRD_PARTY_NOTICES.md',
  'docs/open-source-compliance.md',
  'dashboard/public/fonts/font-manifest.json',
  'dashboard/public/licenses/source-code/source-components.json',
  'dashboard/public/licenses/source-code/shadcn-ui-MIT.txt',
  'dashboard/dist/licenses/source-code/source-components.json',
  'dashboard/dist/licenses/source-code/shadcn-ui-MIT.txt',
]) {
  assert(trackedSet.has(required), `Required compliance material is not tracked: ${required}`)
}
const reviewableAssetPattern = /\.(?:woff2?|ttf|otf|ttc|otc|eot|svg|png|jpe?g|gif|webp|avif|ico|pdf|zip|7z|tar|gz|mp3|wav|ogg|mp4|webm|mov|wasm|glb|gltf|obj|fbx|stl|ply|usdz|hdr|exr)$/i
const trackedReviewableAssets = tracked.filter((path) => reviewableAssetPattern.test(path))
const unregisteredAssets = trackedReviewableAssets.filter((path) => !expectedFontAssets.has(path) && !expectedProjectAssets.has(path))
assert(unregisteredAssets.length === 0, `Tracked assets need provenance review: ${unregisteredAssets.join(', ')}`)
assert(!tracked.some((path) => path.includes('/node_modules/')), 'node_modules must never be tracked or distributed.')

console.log(
  `Open-source compliance check passed: ${tracked.length} tracked files, ` +
    `${productionInventory.packages.length} runtime packages, ${lockEntries.length - productionInventory.packages.length} build-only lock entries, ` +
    `${fontManifest.fonts.length} font faces, ${sourceComponents.components.length} adapted source component set, ${projectAssets.assets.length} project-generated visual asset; ` +
    `reviewed licenses ${Object.keys(lockLicenseCounts).sort().join(', ')}.`,
)
