@echo off
title AC Financial App
cd /d "%~dp0"
echo Starting AC Server on http://localhost:4000 ...
node server.js
pause


