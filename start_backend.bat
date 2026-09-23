@echo off
echo Creating virtual environment...
python -m venv venv
call venv\Scripts\activate.bat

echo Installing dependencies...
pip install -r backend\requirements.txt

echo Starting backend and bot...
python backend\run.py
pause
