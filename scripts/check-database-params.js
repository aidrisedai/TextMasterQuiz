#!/usr/bin/env node

console.log('🔍 Checking PostgreSQL Database Parameters...\n');

const currentUrl = 'postgresql://text4quiz_user:EGywydGfuDz3iQyNEej4Ho4k1cuK3y4u@dpg-d3bib937mgec739o2p40-a/text4quiz';

console.log('📋 Current DATABASE_URL Analysis:');
console.log('URL:', currentUrl);
console.log('');

// Parse the URL
try {
  const url = new URL(currentUrl);
  
  console.log('🔧 Parsed Components:');
  console.log('  Protocol:', url.protocol);
  console.log('  Username:', url.username);
  console.log('  Password:', url.password ? url.password.substring(0, 8) + '...' : 'MISSING');
  console.log('  Hostname:', url.hostname);
  console.log('  Port:', url.port || 'DEFAULT (5432)');
  console.log('  Database:', url.pathname.substring(1));
  console.log('');
  
  // Check for common issues
  console.log('🚨 Issues Detected:');
  
  const issues = [];
  
  if (!url.hostname.includes('.')) {
    issues.push('❌ Hostname appears incomplete (missing domain suffix)');
  }
  
  if (!url.port) {
    issues.push('⚠️  Port not specified (will use default 5432)');
  }
  
  if (url.hostname === 'dpg-d3bib937mgec739o2p40-a') {
    issues.push('❌ Hostname missing .render.com or region suffix');
  }
  
  if (issues.length === 0) {
    console.log('✅ No obvious issues found');
  } else {
    issues.forEach(issue => console.log(`  ${issue}`));
  }
  
  console.log('');
  
  // Suggest corrections
  console.log('💡 Possible Correct Formats to Try:');
  console.log('');
  
  const baseHost = 'dpg-d3bib937mgec739o2p40-a';
  const possibleFormats = [
    `postgresql://text4quiz_user:EGywydGfuDz3iQyNEej4Ho4k1cuK3y4u@${baseHost}.render.com:5432/text4quiz`,
    `postgresql://text4quiz_user:EGywydGfuDz3iQyNEej4Ho4k1cuK3y4u@${baseHost}.oregon-postgres.render.com:5432/text4quiz`,
    `postgresql://text4quiz_user:EGywydGfuDz3iQyNEej4Ho4k1cuK3y4u@${baseHost}-pooler.render.com:5432/text4quiz`,
    `postgresql://text4quiz_user:EGywydGfuDz3iQyNEej4Ho4k1cuK3y4u@${baseHost}:5432/text4quiz`,
  ];
  
  possibleFormats.forEach((format, index) => {
    console.log(`${index + 1}. ${format}`);
  });
  
  console.log('');
  console.log('🎯 Recommended Actions:');
  console.log('1. Check your Render PostgreSQL database dashboard for:');
  console.log('   - Complete hostname with region');
  console.log('   - Connection pooling URL if available');
  console.log('   - External vs Internal URL options');
  console.log('');
  console.log('2. Look for these sections in your database dashboard:');
  console.log('   - "Connect" tab');
  console.log('   - "Connection Details"');
  console.log('   - "Internal Database URL"');
  console.log('   - "Connection Pooler URL"');
  console.log('');
  console.log('3. Alternative: Build URL from individual components:');
  console.log('   Host: [check database dashboard]');
  console.log('   Port: 5432');
  console.log('   Database: text4quiz');
  console.log('   User: text4quiz_user');
  console.log('   Password: EGywydGfuDz3iQyNEej4Ho4k1cuK3y4u');
  
} catch (error) {
  console.error('❌ Failed to parse DATABASE_URL:', error.message);
}

console.log('');
console.log('🔧 What to Check in Render Dashboard:');
console.log('1. Go to your PostgreSQL database service');
console.log('2. Look for multiple connection string options');
console.log('3. Check if there are "Internal" vs "External" URLs');
console.log('4. Look for connection pooling options');
console.log('5. Verify the database name, username match your setup');