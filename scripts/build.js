import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const clientDir = path.join(rootDir, 'client');
const clientDist = path.join(clientDir, 'dist');
const rootDist = path.join(rootDir, 'dist');

console.log('📦 Starting Build Process for Vercel/Production...');

try {
  // Ensure client node_modules are installed (crucial for Vercel cloud builds)
  const clientNodeModules = path.join(clientDir, 'node_modules');
  if (!fs.existsSync(clientNodeModules)) {
    console.log('📦 Installing client dependencies in', clientDir);
    execSync('npm install', { cwd: clientDir, stdio: 'inherit' });
  }

  // Build client with Vite
  console.log('🔨 Building Vite client application in', clientDir);
  execSync('npm run build', { cwd: clientDir, stdio: 'inherit' });

  // Copy client/dist to root dist for Vercel default output directory
  console.log('📋 Copying build output to root dist directory...');
  if (fs.existsSync(rootDist)) {
    fs.rmSync(rootDist, { recursive: true, force: true });
  }
  fs.cpSync(clientDist, rootDist, { recursive: true });

  console.log('✅ Build successful! Output available in client/dist and dist/');
} catch (err) {
  console.error('❌ Build failed:', err.message);
  process.exit(1);
}

