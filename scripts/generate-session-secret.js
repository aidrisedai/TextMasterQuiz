#!/usr/bin/env node
import { randomBytes } from 'crypto';

// Generate a cryptographically secure random session secret
const sessionSecret = randomBytes(32).toString('hex');

console.log('🔐 Generated Session Secret:');
console.log('');
console.log(sessionSecret);
console.log('');
console.log('💡 Use this value for your SESSION_SECRET environment variable');
console.log('📋 Copy and paste it into your Render dashboard');