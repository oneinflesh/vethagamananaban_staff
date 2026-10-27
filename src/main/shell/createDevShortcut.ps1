param(
  [Parameter(Mandatory = $true)]
  [string]$LauncherPath
)

$appRoot = Split-Path -Parent $LauncherPath
$desktop = [Environment]::GetFolderPath('Desktop')
if (-not $desktop -or -not (Test-Path -LiteralPath $desktop)) {
  throw 'Desktop folder could not be found.'
}

$shortcutPath = Join-Path $desktop 'Vethagama Nanban Admin Dev.lnk'
if (Test-Path -LiteralPath $shortcutPath) {
  exit 0
}

$iconPath = Join-Path $appRoot 'resources\app.ico'
if (-not (Test-Path -LiteralPath $iconPath)) {
  throw "Application icon is missing: $iconPath"
}

$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $LauncherPath
$shortcut.WorkingDirectory = $appRoot
$shortcut.IconLocation = "$iconPath,0"
$shortcut.Description = 'Update and start Vethagama Nanban Admin Dev'
$shortcut.Save()
Write-Output "Desktop shortcut created: $shortcutPath"
