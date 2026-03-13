@echo off
echo 🚀 启动 Web Terminal 服务...
echo.

REM 检查是否已经安装依赖
if not exist "node_modules" (
    echo 📦 安装前端依赖...
    call npm install
)

if not exist "server\node_modules" (
    echo 📦 安装后端依赖...
    cd server
    call npm install
    cd ..
)

echo.
echo ✅ 依赖检查完成
echo.
echo 🔧 启动服务...
echo.

REM 启动后端服务
echo 1️⃣  启动后端服务 (端口 3001)...
start "Web Terminal Server" cmd /k "cd server && npm run dev"

REM 等待后端启动
timeout /t 3 /nobreak >nul

REM 启动前端服务
echo 2️⃣  启动前端服务 (端口 3000)...
start "Web Terminal Client" cmd /k "npm run dev"

echo.
echo ✅ 服务启动完成！
echo.
echo 📱 访问地址：
echo    前端: http://localhost:3000
echo    后端: http://localhost:3001
echo.
echo 🔐 登录信息：
echo    用户名: admin
echo    密码: admin123
echo.
echo 📖 查看完整文档: README.md
echo.
pause
