$ErrorActionPreference = "Stop"

$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $Root

if ($env:RUSTUP_TOOLCHAIN -and -not $env:RUSTUP_TOOLCHAIN.StartsWith("stable")) {
  Write-Host "Clearing RUSTUP_TOOLCHAIN=$($env:RUSTUP_TOOLCHAIN) (use stable toolchain for Tauri builds)" -ForegroundColor Yellow
  Remove-Item Env:RUSTUP_TOOLCHAIN
}

pnpm install --frozen-lockfile
pnpm tauri build @args
