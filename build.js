#!/usr/bin/env node

// Simple build script using Vite API
const { build } = require('vite');

async function buildApp() {
  try {
    console.log('🚀 Starting Vite build...');
    
    await build({
      // Vite config options
      base: process.env.NODE_ENV === 'production' ? '/random-mtg-commander/' : '/',
      build: {
        outDir: 'dist',
        assetsDir: 'assets'
      }
    });
    
    console.log('✅ Build completed successfully!');
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

buildApp();