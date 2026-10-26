param([switch]$InstallSdk,[switch]$Build)
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$projectRoot = Split-Path -Parent $PSScriptRoot
$toolRoot = Join-Path $projectRoot '.tools'
New-Item -ItemType Directory -Path $toolRoot -Force | Out-Null
function Get-Archive([string]$Url,[string]$Name,[string]$Expected) {
    $dest = Join-Path $toolRoot $Name
    if (!(Test-Path -LiteralPath $dest)) { Invoke-WebRequest -UseBasicParsing -Uri $Url -OutFile $dest -TimeoutSec 600 }
    if ($Expected -and (Get-FileHash -LiteralPath $dest -Algorithm SHA256).Hash.ToLowerInvariant() -ne $Expected.ToLowerInvariant()) { throw "Checksum mismatch: $Name" }
    return $dest
}
$jdk = Get-ChildItem -LiteralPath $toolRoot -Directory | Where-Object Name -Like 'jdk-17*' | Select-Object -First 1
if (!$jdk) {
    $archive = Get-Archive 'https://aka.ms/download-jdk/microsoft-jdk-17-windows-x64.zip' 'jdk17.zip' ''
    Expand-Archive -LiteralPath $archive -DestinationPath $toolRoot -Force
    $jdk = Get-ChildItem -LiteralPath $toolRoot -Directory | Where-Object Name -Like 'jdk-17*' | Select-Object -First 1
}
if (!$jdk) { throw 'JDK extraction did not produce a JDK 17 directory' }
$env:JAVA_HOME = $jdk.FullName
$env:GRADLE_USER_HOME = Join-Path $toolRoot 'gradle-cache'
$env:ANDROID_HOME = Join-Path $toolRoot 'android-sdk'
$env:PATH = (Join-Path $env:JAVA_HOME 'bin') + ';' + $env:PATH
$gradlePath = Join-Path $toolRoot 'gradle-8.13'
if (!(Test-Path -LiteralPath $gradlePath)) {
    $checksumContent = (Invoke-WebRequest -UseBasicParsing -Uri 'https://services.gradle.org/distributions/gradle-8.13-bin.zip.sha256').Content
    $checksum = if ($checksumContent -is [byte[]]) { [Text.Encoding]::UTF8.GetString($checksumContent).Trim() } else { ([string]$checksumContent).Trim() }
    $archive = Get-Archive 'https://services.gradle.org/distributions/gradle-8.13-bin.zip' 'gradle-8.13.zip' $checksum
    Expand-Archive -LiteralPath $archive -DestinationPath $toolRoot -Force
}
if ($InstallSdk) {
    $sdkManager = Join-Path $env:ANDROID_HOME 'cmdline-tools/latest/bin/sdkmanager.bat'
    if (!(Test-Path -LiteralPath $sdkManager)) {
        $archive = Get-Archive 'https://dl.google.com/android/repository/commandlinetools-win-15859902_latest.zip' 'android-commandline.zip' '90ae805d20434428bffcb699c290860f19bb5f66a67e6b330067e3de801fb04a'
        $unpack = Join-Path $toolRoot 'android-commandline'
        Expand-Archive -LiteralPath $archive -DestinationPath $unpack -Force
        New-Item -ItemType Directory -Path (Split-Path -Parent (Split-Path -Parent $sdkManager)) -Force | Out-Null
        Copy-Item -LiteralPath (Join-Path $unpack 'cmdline-tools/bin'),(Join-Path $unpack 'cmdline-tools/lib'),(Join-Path $unpack 'cmdline-tools/source.properties'),(Join-Path $unpack 'cmdline-tools/NOTICE.txt') -Destination (Join-Path $env:ANDROID_HOME 'cmdline-tools/latest') -Recurse -Force
    }
    # SDK manager displays Google's license and requests acceptance interactively.
    & $sdkManager --sdk_root=$env:ANDROID_HOME 'platforms;android-36' 'build-tools;35.0.0'
    if ($LASTEXITCODE -ne 0) { throw 'SDK installation incomplete. Review and accept the SDK license in sdkmanager.' }
    if (!(Test-Path -LiteralPath (Join-Path $env:ANDROID_HOME 'platforms/android-36/android.jar')) -or !(Test-Path -LiteralPath (Join-Path $env:ANDROID_HOME 'build-tools/35.0.0/aapt2.exe'))) { throw 'SDK packages are missing. Review and accept the Android SDK license, then run this script again.' }
}
if ($Build) {
    Push-Location (Join-Path $projectRoot 'android')
    try { & (Join-Path $gradlePath 'bin/gradle.bat') assembleDebug bundleRelease; if ($LASTEXITCODE -ne 0) { throw 'Android build failed' } }
    finally { Pop-Location }
}
