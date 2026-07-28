$ErrorActionPreference = 'Stop'

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$manifestPath = Join-Path $projectRoot 'manifest.json'
$manifest = Get-Content -Raw -Encoding UTF8 -LiteralPath $manifestPath | ConvertFrom-Json
$releaseDirectory = Join-Path $projectRoot 'release'
$zipPath = Join-Path $releaseDirectory "KomeFlow-$($manifest.version).zip"

New-Item -ItemType Directory -Force -Path $releaseDirectory | Out-Null
if (Test-Path -LiteralPath $zipPath) {
  Remove-Item -LiteralPath $zipPath -Force
}

$runtimeFiles = @(
  'manifest.json',
  'background.js',
  'chat_observer.js',
  'content.js',
  'content.css',
  'popup.html',
  'popup.js',
  'popup.css'
)
$runtimeFiles += Get-ChildItem -LiteralPath (Join-Path $projectRoot '_locales') -Recurse -File |
  ForEach-Object { $_.FullName.Substring($projectRoot.Length + 1) }
$runtimeFiles += Get-ChildItem -LiteralPath (Join-Path $projectRoot 'icons') -File |
  ForEach-Object { $_.FullName.Substring($projectRoot.Length + 1) }

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$archive = [System.IO.Compression.ZipFile]::Open(
  $zipPath,
  [System.IO.Compression.ZipArchiveMode]::Create
)
try {
  foreach ($relativePath in $runtimeFiles) {
    $sourcePath = Join-Path $projectRoot $relativePath
    if (-not (Test-Path -LiteralPath $sourcePath -PathType Leaf)) {
      throw "Missing runtime file: $relativePath"
    }
    $entryName = $relativePath.Replace('\', '/')
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
      $archive,
      $sourcePath,
      $entryName,
      [System.IO.Compression.CompressionLevel]::Optimal
    ) | Out-Null
  }
}
finally {
  $archive.Dispose()
}

Write-Output $zipPath
