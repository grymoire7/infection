#!/usr/bin/env node

const { spawn, exec } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8081;
const HOST = 'localhost';

function checkPort(port) {
    return new Promise((resolve) => {
        const server = http.createServer();

        server.listen(port, () => {
            server.once('close', () => resolve(true));
            server.close();
        });

        server.on('error', () => resolve(false));
    });
}

async function launchProduction() {
    console.log('🚀 Launching Infection! Production Version\n');

    // Check if dist directory exists
    if (!fs.existsSync('dist')) {
        console.log('📦 Building production version...');

        // Build the project
        await new Promise((resolve, reject) => {
            const build = spawn('npm', ['run', 'build-nolog'], {
                stdio: 'inherit',
                shell: true
            });

            build.on('close', (code) => {
                if (code === 0) {
                    console.log('✅ Build completed successfully\n');
                    resolve();
                } else {
                    console.error('❌ Build failed');
                    reject(new Error('Build failed'));
                }
            });
        });
    } else {
        console.log('📦 Using existing production build (run "npm run build-nolog" to rebuild)\n');
    }

    // Check if port is available
    const portAvailable = await checkPort(PORT);
    if (!portAvailable) {
        console.error(`❌ Port ${PORT} is already in use. Please stop the other server and try again.`);
        process.exit(1);
    }

    // Start the static server
    console.log(`🌐 Starting production server at http://${HOST}:${PORT}`);

    const server = spawn('python3', ['-m', 'http.server', PORT.toString()], {
        cwd: 'dist',
        stdio: ['pipe', 'pipe', 'pipe']
    });

    // Wait a moment for server to start
    setTimeout(async () => {
        console.log('🌐 Server started successfully!\n');

        // Open browser
        const start = process.platform === 'darwin' ? 'open' :
                     process.platform === 'win32' ? 'start' : 'xdg-open';

        exec(`${start} http://${HOST}:${PORT}`, (error) => {
            if (error) {
                console.log(`📱 Browser auto-launch failed. Please open http://${HOST}:${PORT} manually\n`);
            } else {
                console.log('📱 Browser opened automatically\n');
            }
        });

        console.log('🎮 Game is running in production mode!');
        console.log('   - Debug level sets should be HIDDEN');
        console.log('   - Press Ctrl+C to stop the server\n');

        // Handle server output
        server.stdout.on('data', (data) => {
            // Suppress normal server output, but show errors
            const output = data.toString();
            if (output.toLowerCase().includes('error') || output.toLowerCase().includes('exception')) {
                process.stderr.write(output);
            }
        });

        server.stderr.on('data', (data) => {
            process.stderr.write(data);
        });

    }, 1000);

    // Handle graceful shutdown
    process.on('SIGINT', () => {
        console.log('\n🛑 Shutting down production server...');
        server.kill('SIGTERM');

        // Force kill if it doesn't shut down gracefully
        setTimeout(() => {
            server.kill('SIGKILL');
            process.exit(0);
        }, 2000);
    });

    server.on('close', (code) => {
        if (code !== 0 && code !== null) {
            console.error(`Server exited with code ${code}`);
        }
        process.exit(code || 0);
    });
}

launchProduction().catch((error) => {
    console.error('❌ Failed to launch production version:', error.message);
    process.exit(1);
});