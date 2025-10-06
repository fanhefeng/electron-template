#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * 部署更新脚本
 * electron-builder 会自动生成 latest.yml，此脚本只需复制文件到更新服务器
 */

const DIST_DIR = path.join(__dirname, '..', 'dist_electron');
const UPDATE_SERVER_PUBLIC = path.join(__dirname, '..', 'updater-server', 'public');

function deployUpdate() {
  console.log('Deploying update files to update server...\n');
  
  // 确保目录存在
  if (!fs.existsSync(UPDATE_SERVER_PUBLIC)) {
    fs.mkdirSync(UPDATE_SERVER_PUBLIC, { recursive: true });
  }
  
  // 检查 dist_electron 目录
  if (!fs.existsSync(DIST_DIR)) {
    console.error('Error: dist_electron directory not found!');
    console.error('Please run "npm run package" first.');
    process.exit(1);
  }
  
  // 复制平台特定的 latest 文件 (electron-builder 自动生成)
  const latestFiles = ['latest.yml', 'latest-mac.yml', 'latest-linux.yml'];
  latestFiles.forEach(file => {
    const srcPath = path.join(DIST_DIR, file);
    if (fs.existsSync(srcPath)) {
      fs.copyFileSync(srcPath, path.join(UPDATE_SERVER_PUBLIC, file));
      console.log(`✓ Copied ${file}`);
    }
  });
  
  // 查找并复制所有构建文件
  const files = fs.readdirSync(DIST_DIR);
  let copiedCount = 0;
  
  files.forEach(file => {
    // 复制安装包文件
    if (file.endsWith('.dmg') || 
        file.endsWith('.exe') || 
        file.endsWith('.AppImage') ||
        file.endsWith('.zip') ||
        file.endsWith('.blockmap')) {
      const srcPath = path.join(DIST_DIR, file);
      const destPath = path.join(UPDATE_SERVER_PUBLIC, file);
      
      if (fs.statSync(srcPath).isFile()) {
        fs.copyFileSync(srcPath, destPath);
        const size = fs.statSync(srcPath).size;
        console.log(`✓ Copied ${file} (${(size / 1024 / 1024).toFixed(2)} MB)`);
        copiedCount++;
      }
    }
  });
  
  if (copiedCount === 0) {
    console.error('\nError: No build files found!');
    console.error('Please run "npm run package" first.');
    process.exit(1);
  }
  
  console.log(`\n✓ Deployment complete! ${copiedCount} file(s) copied.`);
  console.log('\nStart the update server with:');
  console.log('  npm run start-update-server');
  console.log('\nOr manually:');
  console.log('  cd updater-server && npm start');
}

if (require.main === module) {
  deployUpdate();
}

module.exports = { deployUpdate };