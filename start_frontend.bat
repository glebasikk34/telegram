@echo off
cd frontend
echo Installing frontend dependencies (this might take a minute)...
call "C:\Program Files\nodejs\npm.cmd" install
echo Starting React dev server...
call "C:\Program Files\nodejs\npm.cmd" run dev
pause
