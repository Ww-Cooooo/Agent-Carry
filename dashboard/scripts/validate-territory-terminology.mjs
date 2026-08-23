import { lstat, readFile, readdir, stat } from 'node:fs/promises'
import { dirname, extname, isAbsolute, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const defaultRepositoryRoot = resolve(here, '..', '..')
const textExtensions = new Set(['.css', '.html', '.js', '.json', '.jsx', '.md', '.mjs', '.toml', '.ts', '.tsx', '.txt'])
const canonicalPolicy = 'core/protocols/TERRITORY_TERMINOLOGY.md'
const validatorPath = 'dashboard/scripts/validate-territory-terminology.mjs'

function valueAfter(flag) {
  const index = process.argv.indexOf(flag)
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : undefined
}

const repositoryRoot = resolve(valueAfter('--root') ?? defaultRepositoryRoot)
const includeDist = process.argv.includes('--include-dist')
const externalTarget = valueAfter('--target') ? resolve(valueAfter('--target')) : undefined

const productSurfaces = [
  'AGENTS.md',
  'BOOTSTRAP.md',
  'INSTALL.md',
  'INSTALL.en.md',
  'README.md',
  'README.en.md',
  'START-HERE.txt',
  'START-HERE.en.txt',
  'assistant.toml',
  'dashboard.html',
  'dashboard.en.html',
  'core',
  'docs',
  'dashboard/package.json',
  'dashboard/src',
  'dashboard/scripts',
]
if (includeDist) productSurfaces.push('dashboard/dist')

const exactExclusions = new Set([
  canonicalPolicy,
  validatorPath,
  'THIRD_PARTY_NOTICES.md',
])
const segmentExclusions = new Set([
  '.git',
  'node_modules',
  'licenses',
  'fonts',
  'instance',
  '_data',
  'validation',
])

function normalizePath(path) {
  return path.replaceAll('\\', '/')
}

async function exists(path) {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}

function excluded(relativePath) {
  const normalized = normalizePath(relativePath)
  if (exactExclusions.has(normalized)) return true
  const segments = normalized.split('/')
  if (segments.some((segment) => segmentExclusions.has(segment))) return true
  if (!includeDist && normalized.startsWith('dashboard/dist/')) return true
  return false
}

async function collectFiles(root, path, result) {
  const metadata = await lstat(path)
  if (metadata.isSymbolicLink()) return
  const relativePath = normalizePath(relative(root, path))
  if (relativePath && excluded(relativePath)) return
  if (metadata.isDirectory()) {
    for (const entry of await readdir(path)) await collectFiles(root, resolve(path, entry), result)
    return
  }
  if (metadata.isFile() && textExtensions.has(extname(path).toLowerCase())) result.push(path)
}

function lineIssues(text) {
  const issues = []
  const traditional = [
    ['台灣', '简体中文产品文案必须使用“中国台湾”。'],
    ['澳門', '简体中文产品文案必须使用“中国澳门”。'],
  ]
  for (const [term, message] of traditional) {
    if (text.includes(term)) issues.push(message)
  }

  for (const term of ['台湾', '香港', '澳门']) {
    let index = text.indexOf(term)
    while (index >= 0) {
      if (text.slice(Math.max(0, index - 2), index) !== '中国') {
        issues.push(`Agent Carry 自有中文称谓“${term}”缺少“中国”归属。`)
      }
      index = text.indexOf(term, index + term.length)
    }
  }

  const englishTerms = [
    ['Taiwan', ['Taiwan, China']],
    ['Hong Kong', ['Hong Kong SAR, China', 'Hong Kong Special Administrative Region of China']],
    ['Macao', ['Macao SAR, China', 'Macao Special Administrative Region of China']],
  ]
  for (const [term, accepted] of englishTerms) {
    const pattern = new RegExp(`\\b${term.replace(' ', '\\s+')}\\b`, 'g')
    for (const match of text.matchAll(pattern)) {
      const remainder = text.slice(match.index)
      if (!accepted.some((canonical) => remainder.startsWith(canonical))) {
        issues.push(`Agent Carry-owned English term “${term}” must use its reviewed China-qualified form.`)
      }
    }
  }
  if (/\bMacau\b/.test(text)) issues.push('Agent Carry-owned English copy must use “Macao”, not “Macau”.')
  return [...new Set(issues)]
}

function selfTest() {
  const accepted = [
    '中国台湾、中国香港、中国澳门',
    'Taiwan, China; Hong Kong SAR, China; Macao SAR, China',
    '中国香港特别行政区与中国澳门特别行政区',
    'Hong Kong Special Administrative Region of China',
  ]
  const rejected = [
    '台湾、香港、澳门',
    'Taiwan / Hong Kong / Macau',
    'Macao is listed here without the reviewed qualifier.',
  ]
  for (const sample of accepted) {
    if (lineIssues(sample).length) throw new Error(`Territory terminology validator rejected a canonical self-test: ${sample}`)
  }
  for (const sample of rejected) {
    if (!lineIssues(sample).length) throw new Error(`Territory terminology validator missed a noncanonical self-test: ${sample}`)
  }
}

async function validatePolicy() {
  const policyPath = resolve(repositoryRoot, canonicalPolicy)
  const policy = await readFile(policyPath, 'utf8')
  for (const fragment of [
    '中国台湾',
    '中国香港',
    '中国澳门',
    'Taiwan, China',
    'Hong Kong SAR, China',
    'Macao SAR, China',
    '用户写入的记忆、能力、SOP、经验',
    '普通启动、普通任务和不涉及地域表达的只读操作不加载本文',
  ]) {
    if (!policy.includes(fragment)) throw new Error(`Territory terminology policy is missing: ${fragment}`)
  }
}

async function requireContractFragments(path, fragments) {
  const absolutePath = resolve(repositoryRoot, path)
  if (!await exists(absolutePath)) throw new Error(`Territory terminology contract file is missing: ${path}`)
  const text = await readFile(absolutePath, 'utf8')
  for (const fragment of fragments) {
    if (!text.includes(fragment)) throw new Error(`${path} is missing territory terminology contract fragment: ${fragment}`)
  }
}

async function validateContractGraph() {
  await requireContractFragments('core/maps/root-map.toml', ['"地域称谓"', '"中国台湾"', '"中国香港"', '"中国澳门"'])
  await requireContractFragments('core/maps/assistant-maintenance.toml', [
    'id = "territory-terminology"',
    'target = "core/protocols/TERRITORY_TERMINOLOGY.md"',
    'minimum_level = 3',
  ])
  await requireContractFragments('core/maps/trigger-registry.toml', [
    'id = "territory-terminology-gate"',
    'startup_policy = "keep-only-root-map-trigger-terms-never-load-the-full-protocol-for-ordinary-startup-read-only-work-or-unrelated-tasks"',
    'map-flag-sovereignty-or-public-release-context',
  ])
  await requireContractFragments('assistant.toml', [
    'territory_terminology = "core/protocols/TERRITORY_TERMINOLOGY.md"',
    'territory_terminology_load_policy = "only-when-agent-carry-authored-content-or-publication-mentions-geography-jurisdiction-maps-flags-or-country-region-grouping; never-rewrite-user-or-source-text"',
  ])
  await requireContractFragments('core/manifest.toml', ['territory_terminology = "core/protocols/TERRITORY_TERMINOLOGY.md"'])
  await requireContractFragments('core/upgrade/release-manifest-1.2.1.toml', [
    '"chinese-and-english-territory-terminology-canonical"',
    '"user-authored-and-source-evidence-remain-verbatim-under-territory-gate"',
    '"compiled-dashboard-and-pages-projection-pass-territory-terminology-gate"',
  ])
  await requireContractFragments('docs/localization.md', [
    'Agent Carry-owned Chinese product copy uses `中国台湾`、`中国香港`、`中国澳门`',
    '`Taiwan, China`, `Hong Kong SAR, China`, and `Macao SAR, China`',
  ])
  await requireContractFragments('dashboard/package.json', [
    '"check:territory": "node scripts/validate-territory-terminology.mjs"',
    '"check:territory:dist": "node scripts/validate-territory-terminology.mjs --include-dist"',
  ])

}

async function main() {
  selfTest()
  await validatePolicy()
  await validateContractGraph()

  const files = []
  if (externalTarget) {
    if (!isAbsolute(externalTarget) || !await exists(externalTarget)) throw new Error('--target must be an existing absolute path.')
    await collectFiles(externalTarget, externalTarget, files)
  } else {
    for (const surface of productSurfaces) {
      const path = resolve(repositoryRoot, surface)
      if (await exists(path)) await collectFiles(repositoryRoot, path, files)
    }
  }

  const failures = []
  for (const file of [...new Set(files)].sort()) {
    const text = await readFile(file, 'utf8')
    const displayPath = externalTarget
      ? normalizePath(relative(externalTarget, file)) || normalizePath(file)
      : normalizePath(relative(repositoryRoot, file))
    for (const [index, line] of text.split(/\r?\n/).entries()) {
      for (const issue of lineIssues(line)) failures.push(`${displayPath}:${index + 1}: ${issue}`)
    }
  }

  if (failures.length) {
    throw new Error(`Territory terminology validation failed:\n${failures.join('\n')}`)
  }
  console.log(`Territory terminology contract passed: ${new Set(files).size} Agent Carry-owned text files checked${externalTarget ? ' in the supplied projection' : includeDist ? ', including compiled Dashboard files' : ''}; canonical Chinese/English naming and source-text boundary aligned.`)
}

await main()
