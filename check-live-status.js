#!/usr/bin/env node

// Quick check of live system status for the test user
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function checkLiveStatus() {
    console.log('🔍 CHECKING LIVE SYSTEM STATUS');
    console.log('=================================');
    
    const BASE_URL = 'https://text4quiz.onrender.com';
    const TEST_PHONE = '+15153570454';
    
    try {
        // Check pending answers for the user
        console.log('\n📋 Checking pending answers...');
        const pendingResponse = await fetch(`${BASE_URL}/admin/pending-answers`);
        const pendingData = await pendingResponse.json();
        
        const userPending = pendingData.filter(answer => 
            answer.user_phone === TEST_PHONE
        );
        
        console.log(`   Found ${userPending.length} pending answers for ${TEST_PHONE}`);
        
        if (userPending.length > 0) {
            console.log('   📱 Active question found:');
            userPending.forEach((answer, index) => {
                console.log(`   ${index + 1}. Question ID: ${answer.question_id}`);
                console.log(`      Created: ${new Date(answer.created_at).toLocaleString()}`);
                console.log(`      Expires: ${new Date(answer.expires_at).toLocaleString()}`);
            });
        }
        
        // Check user stats
        console.log('\n📊 User stats...');
        const userResponse = await fetch(`${BASE_URL}/admin/users`);
        const users = await userResponse.json();
        
        const testUser = users.find(user => user.phone_number === TEST_PHONE);
        if (testUser) {
            console.log(`   ✅ User exists: ${testUser.name || 'Anonymous'}`);
            console.log(`   📈 Questions answered: ${testUser.questions_answered}`);
            console.log(`   🎯 Current score: ${testUser.score}`);
            console.log(`   📅 Last active: ${new Date(testUser.updated_at).toLocaleString()}`);
            console.log(`   🔔 Notifications: ${testUser.notifications_enabled ? 'ON' : 'OFF'}`);
        }
        
        // Test server health
        console.log('\n💚 Server health...');
        const healthResponse = await fetch(`${BASE_URL}/health`);
        const healthData = await healthResponse.json();
        console.log(`   Status: ${healthData.status}`);
        console.log(`   Database: ${healthData.database}`);
        console.log(`   Uptime: ${Math.round(healthData.uptime / 60)} minutes`);
        
    } catch (error) {
        console.error('❌ Error checking live status:', error.message);
    }
}

checkLiveStatus();