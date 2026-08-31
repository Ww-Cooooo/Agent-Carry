param(
    [Parameter(Mandatory = $true)]
    [string]$Root,

    [Parameter(Mandatory = $true)]
    [string]$PathsBase64
)

$ErrorActionPreference = 'Stop'

$rootItem = Get-Item -LiteralPath $Root -Force
if (-not $rootItem.PSIsContainer -or ($rootItem.Attributes -band [IO.FileAttributes]::ReparsePoint)) {
    throw 'source root is not a direct physical directory'
}

$rootFull = [IO.Path]::GetFullPath($rootItem.FullName).TrimEnd([IO.Path]::DirectorySeparatorChar)
$json = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($PathsBase64))
$paths = @($json | ConvertFrom-Json)
$issues = [Collections.Generic.List[object]]::new()

foreach ($relative in $paths) {
    if ($relative -isnot [string] -or [string]::IsNullOrWhiteSpace($relative) -or $relative.Contains('\') -or $relative.Contains(':')) {
        throw 'preflight received an invalid relative path'
    }
    $segments = $relative.Split('/')
    if ($segments | Where-Object { $_ -eq '' -or $_ -eq '.' -or $_ -eq '..' }) {
        throw 'preflight received an unsafe relative path'
    }
    $full = [IO.Path]::GetFullPath([IO.Path]::Combine($rootFull, ($segments -join [IO.Path]::DirectorySeparatorChar)))
    if (-not $full.StartsWith($rootFull + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
        throw 'preflight path escaped the source root'
    }
    if (-not (Test-Path -LiteralPath $full -PathType Leaf)) {
        continue
    }

    $item = Get-Item -LiteralPath $full -Force
    if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) {
        $issues.Add([pscustomobject]@{ path = $relative; reason = 'reparse-point' })
        continue
    }
    $unsupportedAttributes = [IO.FileAttributes]::ReadOnly -bor [IO.FileAttributes]::System -bor [IO.FileAttributes]::Encrypted
    if ($item.Attributes -band $unsupportedAttributes) {
        $issues.Add([pscustomobject]@{ path = $relative; reason = 'unsupported-file-attributes' })
    }

    try {
        $hardLinks = @(& fsutil hardlink list $full 2>&1 | Where-Object { -not [string]::IsNullOrWhiteSpace([string]$_) })
        if ($LASTEXITCODE -ne 0) {
            $issues.Add([pscustomobject]@{ path = $relative; reason = 'hardlink-inspection-failed' })
        }
        elseif ($hardLinks.Count -gt 1) {
            $issues.Add([pscustomobject]@{ path = $relative; reason = 'hardlink' })
        }
    }
    catch {
        $issues.Add([pscustomobject]@{ path = $relative; reason = 'hardlink-inspection-failed' })
    }

    try {
        $namedStreams = @(Get-Item -LiteralPath $full -Stream * -ErrorAction Stop |
            Where-Object { $_.Stream -ne ':$DATA' })
        if ($namedStreams.Count -gt 0) {
            $issues.Add([pscustomobject]@{ path = $relative; reason = 'named-data-streams' })
        }
    }
    catch {
        $issues.Add([pscustomobject]@{ path = $relative; reason = 'named-stream-inspection-failed' })
    }

    $acl = Get-Acl -LiteralPath $full
    $explicitRules = @($acl.Access | Where-Object { -not $_.IsInherited })
    if ($acl.AreAccessRulesProtected -or $explicitRules.Count -gt 0) {
        $issues.Add([pscustomobject]@{ path = $relative; reason = 'protected-or-explicit-dacl' })
    }
    $parentAcl = Get-Acl -LiteralPath $item.Directory.FullName
    if ($acl.Owner -ne $parentAcl.Owner) {
        $issues.Add([pscustomobject]@{ path = $relative; reason = 'owner-differs-from-parent' })
    }
}

[pscustomobject]@{
    decision = if ($issues.Count -eq 0) { 'windows-upgrade-metadata-preflight-passed' } else { 'windows-upgrade-metadata-review-required' }
    inspected_path_count = $paths.Count
    issues = @($issues)
} | ConvertTo-Json -Depth 5 -Compress
