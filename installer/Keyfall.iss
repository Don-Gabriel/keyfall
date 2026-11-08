#define AppName "Keyfall"
#define AppVersion "0.5.0"
#define ProjectRoot AddBackslash(SourcePath) + ".."

[Setup]
AppId={{F39C53CE-F4BB-4883-98C3-463D2041EE5A}
AppName={#AppName}
AppVersion={#AppVersion}
AppVerName={#AppName} {#AppVersion}
AppPublisher=Keyfall
DefaultDirName={localappdata}\Programs\Keyfall
DefaultGroupName=Keyfall
DisableProgramGroupPage=yes
PrivilegesRequired=lowest
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
MinVersion=10.0
OutputDir={#ProjectRoot}\release
OutputBaseFilename=Keyfall-Setup-{#AppVersion}-x64
SetupIconFile={#ProjectRoot}\keyfall.ico
UninstallDisplayIcon={app}\Keyfall.exe
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
CloseApplications=yes
RestartApplications=no
SetupLogging=yes
InfoBeforeFile={#ProjectRoot}\installer\INSTALL-INFO.txt

[Tasks]
Name: "desktopicon"; Description: "Create a &desktop shortcut"; GroupDescription: "Shortcuts:"

[Files]
Source: "{#ProjectRoot}\installer\staging\Keyfall.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#ProjectRoot}\installer\staging\runtime\node.exe"; DestDir: "{app}\runtime"; Flags: ignoreversion
Source: "{#ProjectRoot}\installer\staging\runtime\LICENSE.txt"; DestDir: "{app}\runtime"; Flags: ignoreversion
Source: "{#ProjectRoot}\dist\*"; DestDir: "{app}\dist"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "{#ProjectRoot}\Start-Keyfall.mjs"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#ProjectRoot}\server.mjs"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#ProjectRoot}\keyfall.ico"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#ProjectRoot}\README.md"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#ProjectRoot}\THIRD-PARTY-NOTICES.md"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#ProjectRoot}\LICENSES.txt"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#ProjectRoot}\VERIFICATION.md"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#ProjectRoot}\FEATURE-COVERAGE.md"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\Keyfall"; Filename: "{app}\Keyfall.exe"; WorkingDir: "{app}"; IconFilename: "{app}\keyfall.ico"
Name: "{group}\Uninstall Keyfall"; Filename: "{uninstallexe}"
Name: "{autodesktop}\Keyfall Piano"; Filename: "{app}\Keyfall.exe"; WorkingDir: "{app}"; IconFilename: "{app}\keyfall.ico"; Tasks: desktopicon

[Run]
Filename: "{app}\Keyfall.exe"; Description: "Open Keyfall"; Flags: nowait postinstall skipifsilent


