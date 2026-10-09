Start-Process powershell -ArgumentList '-NoExit cd C:\Empresas\TheoriaM\src\backend; C:\Empresas\TheoriaM\src\.venv\Scripts\python.exe backend.py'
Start-Process powershell -ArgumentList '-NoExit cd C:\Empresas\TheoriaM\src\frontend; npm start'
