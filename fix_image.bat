@echo off
copy "C:\Users\Bingu\.gemini\antigravity\brain\9c0d2e5b-e14b-4222-a760-ee427de786da\heritage_mining_1775633721612.png" "images\heritage-mining.png"
if %errorlevel% equ 0 (
    echo ✓ Image copied successfully!
) else (
    echo ✕ Failed to copy image. Please copy it manually from the path above.
)
pause
