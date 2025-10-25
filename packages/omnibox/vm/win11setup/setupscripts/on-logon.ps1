$scriptFolder = "\\host.lan\Data"
$pythonScriptFile = "$scriptFolder\server\main.py"
$pythonServerPort = 5000

# Use absolute path to Python (works at startup before user logon)
$pythonPath = "C:\Users\Docker\AppData\Local\Programs\Python\Python310\python.exe"

# Start the flask computer use server
Write-Host "Running the server on port $pythonServerPort using $pythonPath"
& $pythonPath $pythonScriptFile --port $pythonServerPort
