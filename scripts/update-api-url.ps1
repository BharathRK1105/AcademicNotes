Param(
  [string]$EnvPath = "frontend/.env",
  [int]$Port = 5000,
  [string[]]$PreferredInterfaces = @("Wi-Fi", "Ethernet")
)

$ErrorActionPreference = "Stop"

function Get-PreferredIPv4 {
  param([string[]]$Preferred)

  foreach ($alias in $Preferred) {
    $ip = Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias $alias -ErrorAction SilentlyContinue |
      Where-Object { $_.IPAddress -and $_.IPAddress -notmatch "^169\.254\." -and $_.IPAddress -ne "127.0.0.1" } |
      Select-Object -First 1 -ExpandProperty IPAddress
    if ($ip) { return $ip }
  }

  return Get-NetIPAddress -AddressFamily IPv4 |
    Where-Object {
      $_.IPAddress -and
      $_.IPAddress -notmatch "^169\.254\." -and
      $_.IPAddress -ne "127.0.0.1"
    } |
    Sort-Object -Property InterfaceMetric, PrefixLength |
    Select-Object -First 1 -ExpandProperty IPAddress
}

$ipAddress = Get-PreferredIPv4 -Preferred $PreferredInterfaces
if (-not $ipAddress) {
  throw "Could not find a valid IPv4 address."
}

$apiUrl = "http://$ipAddress`:$Port/api"

if (-not (Test-Path -Path $EnvPath)) {
  throw "Env file not found: $EnvPath"
}

$lines = Get-Content -Path $EnvPath
$updated = $false
$newLines = @()

foreach ($line in $lines) {
  if ($line -match "^EXPO_PUBLIC_API_URL=") {
    $newLines += "EXPO_PUBLIC_API_URL=$apiUrl"
    $updated = $true
  } else {
    $newLines += $line
  }
}

if (-not $updated) {
  $newLines += "EXPO_PUBLIC_API_URL=$apiUrl"
}

$newLines | Set-Content -Path $EnvPath -Encoding utf8
Write-Host "Updated EXPO_PUBLIC_API_URL -> $apiUrl"
