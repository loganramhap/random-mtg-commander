#!/usr/bin/env node

// Simple build script using Vite API
import { build } from 'vite';

async function buildApp() {
  try {
    console.log('🚀 Starting Vite build...');
    
    await build({
      // Vite config options
      base: '/',  // Root path for custom domain
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