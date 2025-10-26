$scriptFolder = "\\host.lan\Data"
$pythonScriptFile = "$scriptFolder\server\main.py"
$pythonServerPort = 5000
$logFile = "$scriptFolder\flask-server.log"

# Use absolute path to Python (works at startup before user logon)
$pythonPath = "C:\Users\Docker\AppData\Local\Programs\Python\Python310\python.exe"

# Start the flask computer use server with output logging
Write-Host "Running the server on port $pythonServerPort using $pythonPath"
Write-Host "Server output will be logged to: $logFile"

# Log startup time
"[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] Starting Flask server on port $pythonServerPort" | Out-File -FilePath $logFile -Encoding UTF8

# Start Python server and redirect all output to log file
# Use Start-Process to keep it running in background
Start-Process -FilePath $pythonPath `
    -ArgumentList $pythonScriptFile, "--port", $pythonServerPort `
    -NoNewWindow `
    -RedirectStandardOutput "$scriptFolder\flask-stdout.log" `
    -RedirectStandardError "$scriptFolder\flask-stderr.log"

Write-Host "Flask server started in background. Check logs for details."
