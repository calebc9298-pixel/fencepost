Param(
  [string]$Path = (Join-Path (Get-Location) '.env.e2e')
)

$ErrorActionPreference = 'Stop'

function Read-Required([string]$Prompt) {
  while ($true) {
    $value = Read-Host $Prompt
    if (-not [string]::IsNullOrWhiteSpace($value)) { return $value }
    Write-Host 'Value is required.'
  }
}

function Read-Email([string]$Prompt) {
  while ($true) {
    $value = Read-Required $Prompt
    if ($value -match '^[^\s@]+@[^\s@]+\.[^\s@]+$') { return $value }
    Write-Host 'Please enter a valid email address.'
  }
}

function Read-RequiredSecure([string]$Prompt) {
  while ($true) {
    $secure = Read-Host -AsSecureString $Prompt
    if ($secure.Length -gt 0) { return $secure }
    Write-Host 'Value is required.'
  }
}

function SecureToPlain([securestring]$Secure) {
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Secure)
  try {
    return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
  } finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
  }
}

Write-Host "Creating E2E env file at: $Path" -ForegroundColor Cyan
Write-Host 'This writes passwords to a local file (gitignored). Do NOT commit it.' -ForegroundColor Yellow

$e2eEmail = Read-Email 'E2E_EMAIL (User A)'
$e2ePasswordSecure = Read-RequiredSecure 'E2E_PASSWORD (User A)'
$e2eEmail2 = Read-Email 'E2E_EMAIL_2 (User B)'
$e2ePassword2Secure = Read-RequiredSecure 'E2E_PASSWORD_2 (User B)'

$baseUrl = Read-Host 'E2E_BASE_URL (optional, press Enter to skip)'

$lines = @(
  '# Local Playwright E2E credentials (ignored by git)',
  "E2E_EMAIL=$e2eEmail",
  "E2E_PASSWORD=$(SecureToPlain $e2ePasswordSecure)",
  "E2E_EMAIL_2=$e2eEmail2",
  "E2E_PASSWORD_2=$(SecureToPlain $e2ePassword2Secure)"
)

if (-not [string]::IsNullOrWhiteSpace($baseUrl)) {
  $lines += "E2E_BASE_URL=$baseUrl"
}

$dir = Split-Path -Parent $Path
if ($dir -and -not (Test-Path $dir)) {
  New-Item -ItemType Directory -Path $dir | Out-Null
}

Set-Content -Path $Path -Value ($lines -join "`n") -Encoding UTF8
Write-Host 'Done.' -ForegroundColor Green
