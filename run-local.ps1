$ErrorActionPreference = 'Stop'
$python = Join-Path $PSScriptRoot 'research\toolchains\emsdk\python\3.13.3_64bit\python.exe'
$emsdkEnv = Join-Path $PSScriptRoot 'research\toolchains\emsdk\emsdk_env.bat'
$release = Join-Path $PSScriptRoot 'build\port\release\gta2.js'
$buildScript = Join-Path $PSScriptRoot 'scripts\build_port.py'
$serverScript = Join-Path $PSScriptRoot 'scripts\serve_port.py'
if (-not (Test-Path -LiteralPath $python)) {
  throw 'Bundled Python was not found. Run the project setup/build first, or install Python 3 and run scripts/serve_port.py directly.'
}
if (-not (Test-Path -LiteralPath $release)) {
  if (-not (Test-Path -LiteralPath $emsdkEnv)) { throw 'Emscripten setup was not found; install the project toolchain before building.' }
  $buildCommand = 'call "{0}" >nul && "{1}" "{2}" --preset release --jobs 8' -f $emsdkEnv, $python, $buildScript
  & cmd.exe /d /s /c $buildCommand
  if ($LASTEXITCODE -ne 0) { throw 'The GTA2 browser build failed.' }
}
& $python $serverScript --preset release --dev-data --host 127.0.0.1 --port 8876
