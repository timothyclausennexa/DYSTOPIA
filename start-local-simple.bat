@echo off
echo 🔥 Starting DYSTOPIA: ETERNAL BATTLEGROUND (Local Mode) 🔥
echo.

echo Starting Game Server on port 8001...
start "DYSTOPIA Game Server" cmd /k "cd /d %~dp0server && pnpm dev:game"

timeout /t 3 /nobreak > nul

echo Starting Client on port 3000...
start "DYSTOPIA Client" cmd /k "cd /d %~dp0client && pnpm dev"

echo.
echo ✅ DYSTOPIA is starting!
echo.
echo 🎮 Game will be available at: http://localhost:3000
echo 🎮 Game Server: ws://localhost:8001
echo.
echo Close the terminal windows to stop the servers.
echo.
pause
