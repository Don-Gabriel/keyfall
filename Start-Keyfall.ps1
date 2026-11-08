$ErrorActionPreference = 'Stop'
try {
    $taskRoot = $PSScriptRoot
    $nodePath = (Get-Command node -ErrorAction Stop).Source
    if (-not (Test-Path -LiteralPath (Join-Path $taskRoot 'dist/index.html'))) {
        throw 'The app has not been built. In the Keyfall folder, run npm install and npm run build first.'
    }
    $ready = $false
    try {
        $probe = Invoke-WebRequest 'http://127.0.0.1:5188/__keyfall' -UseBasicParsing -TimeoutSec 2
        $ready = $probe.Content -eq 'keyfall-local-0.1'
        if (-not $ready) { throw 'Another application is using port 5188.' }
    } catch {
        $listener = Get-NetTCPConnection -LocalPort 5188 -State Listen -ErrorAction SilentlyContinue
        if ($listener) { throw 'Another application is using port 5188. Close it before opening Keyfall.' }
    }
    if (-not $ready) {
        Start-Process -FilePath $nodePath -ArgumentList ('"' + (Join-Path $taskRoot 'server.mjs') + '"') -WorkingDirectory $taskRoot -WindowStyle Hidden
        for ($attempt = 0; $attempt -lt 30; $attempt++) {
            Start-Sleep -Milliseconds 200
            try { $probe = Invoke-WebRequest 'http://127.0.0.1:5188/__keyfall' -UseBasicParsing -TimeoutSec 1; if ($probe.Content -eq 'keyfall-local-0.1') { $ready = $true; break } } catch {}
        }
        if (-not $ready) { throw 'Keyfall could not start its local server.' }
    }
    $browserPath = @(
        (Join-Path ${env:ProgramFiles} 'Google/Chrome/Application/chrome.exe'),
        (Join-Path ${env:ProgramFiles(x86)} 'Microsoft/Edge/Application/msedge.exe'),
        (Join-Path ${env:ProgramFiles} 'Microsoft/Edge/Application/msedge.exe')
    ) | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
    if ($browserPath) { Start-Process -FilePath $browserPath -ArgumentList '--app=http://127.0.0.1:5188', '--window-size=1450,950' }
    else { Start-Process 'http://127.0.0.1:5188' }
} catch {
    Add-Type -AssemblyName System.Windows.Forms
    [System.Windows.Forms.MessageBox]::Show($_.Exception.Message, 'Keyfall could not start') | Out-Null
}
