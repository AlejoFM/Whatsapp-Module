@echo off
echo ========================================
echo 🚀 SISTEMA DE WHATSAPP LOCAL
echo ========================================
echo.

echo 📋 Verificando servicios locales...
echo.

REM Verificar que RabbitMQ esté corriendo como servicio
echo 🔍 Verificando RabbitMQ...
C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe -Command "Get-Service -Name 'RabbitMQ' -ErrorAction SilentlyContinue | Out-Null; if ($?) { exit 0 } else { exit 1 }" >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ RabbitMQ no está instalado como servicio
    echo 💡 Instala RabbitMQ desde: https://www.rabbitmq.com/install-windows.html
    echo 💡 O ejecuta: choco install rabbitmq
    pause
    exit /b 1
) else (
    echo ✅ RabbitMQ está instalado
)

REM Verificar que el servicio esté corriendo
C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe -Command "$service = Get-Service -Name 'RabbitMQ' -ErrorAction SilentlyContinue; if ($service -and $service.Status -eq 'Running') { exit 0 } else { exit 1 }" >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ RabbitMQ no está corriendo. Iniciando servicio...
    C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe -Command "Start-Service -Name 'RabbitMQ'" >nul 2>&1
    C:\Windows\System32\timeout.exe /t 5 /nobreak >nul
) else (
    echo ✅ RabbitMQ está corriendo
)

REM Verificar que responda
echo 🔍 Verificando respuesta de RabbitMQ...
C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe -Command "$result = Test-NetConnection -ComputerName localhost -Port 15672 -InformationLevel Quiet; if ($result) { exit 0 } else { exit 1 }" >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Puerto 15672 no está abierto
    echo 💡 Ejecuta: rabbitmq-plugins enable rabbitmq_management
    echo 💡 O ejecuta como administrador: Restart-Service RabbitMQ
    pause
    exit /b 1
) else (
    echo ✅ RabbitMQ Management está disponible en puerto 15672
)

REM Verificar que Laravel esté corriendo
echo 🔍 Verificando Laravel...
curl -s http://localhost:8000 >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Laravel no está corriendo. Iniciando Laravel...
    start "Laravel" cmd /k "cd laravel-whatsapp-api && php artisan serve"
    C:\Windows\System32\timeout.exe /t 5 /nobreak >nul
) else (
    echo ✅ Laravel está corriendo
)

echo.
echo 🚀 Iniciando sistema de WhatsApp...
echo.

REM Laravel Echo Server deshabilitado - usando solo Socket.IO
echo 📡 Laravel Echo Server deshabilitado - usando solo Socket.IO...

REM Iniciar WhatsApp RabbitMQ Broker
echo 🐰 Iniciando WhatsApp RabbitMQ Broker...
start "WhatsApp Broker" cmd /k "cd laravel-whatsapp-api && php artisan whatsapp:broker"

REM Iniciar servicio de Node.js
echo 📱 Iniciando servicio de WhatsApp Node.js...
start "WhatsApp Node.js" cmd /k "cd node-whatsapp-service && npm start"

echo.
echo ⏳ Esperando que los servicios se inicien...
C:\Windows\System32\timeout.exe /t 10 /nobreak >nul

echo.
echo ========================================
echo ✅ SISTEMA INICIADO CORRECTAMENTE
echo ========================================
echo.
echo 📱 Servicios activos:
echo    - Laravel: http://localhost:8000
echo    - WhatsApp Node.js (Socket.IO): http://localhost:3000
echo    - RabbitMQ: localhost:5672
echo    - RabbitMQ Management: http://localhost:15672 (admin/admin123)
echo    - Laravel Echo: DESHABILITADO (usando solo Socket.IO)
echo.
echo 🔴 Para detener todos los servicios, cierra las ventanas de comando
echo.
echo 🧪 Para probar el sistema:
echo    - Frontend: http://localhost:8080
echo    - API: http://localhost:8000/api/whatsapp
echo    - RabbitMQ UI: http://localhost:15672
echo.
echo 📊 Monitoreo:
echo    - RabbitMQ Management: http://localhost:15672
echo    - Ver colas: whatsapp_messages_queue, whatsapp_connections_queue, whatsapp_sessions_queue
echo.
echo 💡 Comandos útiles:
echo    - Iniciar RabbitMQ: powershell "Start-Service RabbitMQ"
echo    - Detener RabbitMQ: powershell "Stop-Service RabbitMQ"
echo    - Estado RabbitMQ: powershell "Get-Service RabbitMQ"
echo    - Habilitar Management: "C:\Program Files\RabbitMQ Server\rabbitmq_server-4.1.0\sbin\rabbitmq-plugins.bat" enable rabbitmq_management
echo.
pause
