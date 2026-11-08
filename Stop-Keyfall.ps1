$ErrorActionPreference = 'Stop'
$taskRoot = $PSScriptRoot
$expectedServer = Join-Path $taskRoot 'server.mjs'
$connection = Get-NetTCPConnection -LocalPort 5188 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
if ($connection) {
    $serverProcess = Get-CimInstance Win32_Process -Filter "ProcessId = $($connection.OwningProcess)"
    if ($serverProcess.Name -eq 'node.exe' -and $serverProcess.CommandLine.Contains($expectedServer)) {
        Stop-Process -Id $connection.OwningProcess
    } else {
        Write-Output 'The listener was not started by this Keyfall launcher; it was left running.'
    }
}
