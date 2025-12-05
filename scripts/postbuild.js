#!/usr/bin/env node
/**
 * Post-build script to fix Vite's HTML output for Electron compatibility.
 *
 * Vite outputs ES modules with type="module" and crossorigin attributes,
 * which don't work in Electron when loading from file:// protocol.
 * This script:
 * 1. Removes type="module" and crossorigin attributes
 * 2. Adds defer attribute so scripts run after DOM is ready
 */

const fs = require('fs');
const path = require('path');

const distPath = path.join(__dirname, '../dist/index.html');

try {
  let html = fs.readFileSync(distPath, 'utf-8');

  // Remove type="module" and crossorigin attributes from script tags
  // And add defer attribute
  html = html.replace(
    /<script\s+type="module"\s+crossorigin\s+src="([^"]+)">/g,
    '<script defer src="$1">'
  );

  // Also handle case where attributes might be in different order
  html = html.replace(
    /<script\s+crossorigin\s+type="module"\s+src="([^"]+)">/g,
    '<script defer src="$1">'
  );

  // Handle case with just type="module" (no crossorigin)
  html = html.replace(
    /<script\s+type="module"\s+src="([^"]+)">/g,
    '<script defer src="$1">'
  );

  fs.writeFileSync(distPath, html, 'utf-8');
  console.log('✓ Fixed dist/index.html for Electron compatibility');
} catch (error) {
  console.error('Error fixing index.html:', error.message);
  process.exit(1);
}
