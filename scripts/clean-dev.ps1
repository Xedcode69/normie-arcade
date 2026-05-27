$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$nextPath = Join-Path $root ".next"

Get-CimInstance Win32_Process |
  Where-Object {
    ($_.CommandLine -like "*next dev*" -or $_.CommandLine -like "*normie-arcade*node_modules*next*") -and
    $_.CommandLine -like "*$root*"
  } |
  ForEach-Object {
    Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
  }

if ((Test-Path $nextPath) -and (Resolve-Path $nextPath).Path.StartsWith((Resolve-Path $root).Path)) {
  Remove-Item -LiteralPath $nextPath -Recurse -Force
}

npm run dev
