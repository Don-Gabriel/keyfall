$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$stagingRoot = Join-Path $PSScriptRoot 'staging'
$runtimeRoot = Join-Path $stagingRoot 'runtime'
New-Item -ItemType Directory -Path $runtimeRoot -Force | Out-Null
$nodePath = (Get-Command node -ErrorAction Stop).Source
$version = (& $nodePath --version).Trim()
Copy-Item -LiteralPath $nodePath -Destination (Join-Path $runtimeRoot 'node.exe') -Force
$licensePath = Join-Path $runtimeRoot 'LICENSE.txt'
if (-not (Test-Path -LiteralPath $licensePath)) {
    Invoke-WebRequest -Uri "https://raw.githubusercontent.com/nodejs/node/$version/LICENSE" -OutFile $licensePath
}
$compiler = Join-Path $env:WINDIR 'Microsoft.NET/Framework64/v4.0.30319/csc.exe'
& $compiler /nologo /target:winexe /platform:anycpu /optimize+ /reference:System.Windows.Forms.dll "/win32icon:$(Join-Path $projectRoot 'keyfall.ico')" "/out:$(Join-Path $stagingRoot 'Keyfall.exe')" (Join-Path $PSScriptRoot 'KeyfallLauncher.cs')
if ($LASTEXITCODE -ne 0) { throw 'The Windows launcher did not compile.' }
$innoCompiler = @(
    'C:/Program Files (x86)/Inno Setup 6/ISCC.exe',
    'C:/Program Files/Inno Setup 6/ISCC.exe',
    'C:/Program Files (x86)/Inno Setup 7/ISCC.exe',
    'C:/Program Files/Inno Setup 7/ISCC.exe'
) | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
if (-not $innoCompiler) { throw 'Install Inno Setup 6 or 7 before building the installer.' }
& $innoCompiler (Join-Path $PSScriptRoot 'Keyfall.iss')
if ($LASTEXITCODE -ne 0) { throw 'Inno Setup did not complete successfully.' }
