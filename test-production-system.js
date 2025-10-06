#!/usr/bin/env node

// Production SMS System Test
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testProductionSystem() {
    console.log('🚀 PRODUCTION SMS SYSTEM TEST');
    console.log('===============================');
    
    const BASE_URL = 'https://text4quiz.onrender.com';
    const TEST_PHONE = '+15153570454';
    
    let totalTests = 0;
    let passedTests = 0;
    
    function logTest(name, result, details = '') {
        totalTests++;
        if (result) {
            passedTests++;
            console.log(`✅ ${name}${details ? `: ${details}` : ''}`);
        } else {
            console.log(`❌ ${name}${details ? `: ${details}` : ''}`);
        }
    }
    
    try {
        // 1. Health Check
        console.log('\n🏥 HEALTH & CONNECTIVITY TESTS');
        console.log('-------------------------------');
        
        const healthResponse = await fetch(`${BASE_URL}/api/health`);
        const health = await healthResponse.json();
        
        logTest('Server Health', health.status === 'ok', `${health.status}, DB: ${health.database}`);
        logTest('Database Connection', health.database === 'connected');
        logTest('Server Uptime', health.uptime > 0, `${Math.round(health.uptime / 60)} minutes`);
        
        // 2. Public API Endpoints
        console.log('\n📊 PUBLIC API TESTS');
        console.log('--------------------');
        
        // Test leaderboard endpoints (public)
        try {
            const leaderboardResponse = await fetch(`${BASE_URL}/api/leaderboards/total-score?limit=3`);
            const leaderboard = await leaderboardResponse.json();
            
            logTest('Total Score Leaderboard', 
                leaderboardResponse.ok && Array.isArray(leaderboard.leaderboard),
                `${leaderboard.leaderboard?.length || 0} entries`
            );
        } catch (error) {
            logTest('Total Score Leaderboard', false, error.message);
        }
        
        // Test user stats endpoint (public)
        try {
            const statsResponse = await fetch(`${BASE_URL}/api/user/${encodeURIComponent(TEST_PHONE)}/stats`);
            const stats = await statsResponse.json();
            
            logTest('User Stats Retrieval', 
                statsResponse.ok && stats.user,
                `${stats.user?.id ? `User ID: ${stats.user.id}` : 'No user data'}`
            );
            
            if (stats.user) {
                console.log(`   📱 Phone: ${stats.user.phoneNumber}`);
                console.log(`   📈 Questions Answered: ${stats.stats?.questionsAnswered || 0}`);
                console.log(`   🎯 Total Score: ${stats.stats?.totalScore || 0}`);
                console.log(`   🔥 Current Streak: ${stats.stats?.currentStreak || 0}`);
            }
        } catch (error) {
            logTest('User Stats Retrieval', false, error.message);
        }
        
        // 3. SMS Functionality Test
        console.log('\n📱 SMS FUNCTIONALITY TEST');
        console.log('-------------------------');
        
        try {
            const smsResponse = await fetch(`${BASE_URL}/api/admin/send-question`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    phoneNumber: TEST_PHONE
                })
            });
            
            if (smsResponse.status === 401) {
                console.log('   ℹ️  Admin authentication required for question sending');
                console.log('   📝 This is expected behavior for security');
                logTest('SMS Security', true, 'Admin auth required (secure)');
                
                // Test the public test endpoint instead
                try {
                    const testSMSResponse = await fetch(`${BASE_URL}/api/test-sms`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            to: TEST_PHONE,
                            message: 'Test4Quiz Production Test - System is working! 🚀'
                        })
                    });
                    
                    logTest('Test SMS Endpoint', testSMSResponse.ok, 
                        testSMSResponse.ok ? 'SMS sent' : `Error: ${testSMSResponse.status}`);
                    
                    if (testSMSResponse.ok) {
                        console.log('   📱 Check your phone for the test message!');
                    }
                } catch (testError) {
                    logTest('Test SMS Endpoint', false, testError.message);
                }
            } else {
                const smsResult = await smsResponse.json();
                logTest('Admin SMS Question', smsResponse.ok, 
                    smsResponse.ok ? 'Question sent' : smsResult.message
                );
            }
        } catch (error) {
            logTest('SMS Functionality', false, error.message);
        }
        
        // 4. Test webhook endpoint (simulated)
        console.log('\n🔗 WEBHOOK ENDPOINT TEST');
        console.log('------------------------');
        
        try {
            const webhookResponse = await fetch(`${BASE_URL}/api/webhook/sms`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    'From': TEST_PHONE,
                    'Body': 'HELP'
                })
            });
            
            logTest('SMS Webhook Endpoint', webhookResponse.status === 200, 
                `Status: ${webhookResponse.status}`
            );
            
            if (webhookResponse.status === 200) {
                console.log('   📱 HELP command processed - check your phone!');
            }
        } catch (error) {
            logTest('SMS Webhook Endpoint', false, error.message);
        }
        
        // 5. Environment & Configuration
        console.log('\n⚙️  SYSTEM CONFIGURATION');
        console.log('------------------------');
        
        // Check if the server responds properly to different content types
        const jsonResponse = await fetch(`${BASE_URL}/api/health`, {
            headers: { 'Accept': 'application/json' }
        });
        logTest('JSON Response Support', jsonResponse.ok && 
            jsonResponse.headers.get('content-type')?.includes('application/json'));
        
        // Test CORS and security headers
        const corsTest = await fetch(`${BASE_URL}/api/health`, {
            method: 'OPTIONS'
        });
        logTest('CORS Options Support', corsTest.status < 500);
        
        // Final Results
        console.log('\n📊 TEST RESULTS SUMMARY');
        console.log('========================');
        console.log(`✅ Passed: ${passedTests}`);
        console.log(`❌ Failed: ${totalTests - passedTests}`);
        console.log(`📈 Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);
        
        if (passedTests === totalTests) {
            console.log('\n🎉 ALL TESTS PASSED - Production system is HEALTHY!');
        } else if (passedTests / totalTests > 0.8) {
            console.log('\n✅ MOSTLY HEALTHY - Minor issues detected');
        } else {
            console.log('\n⚠️  ISSUES DETECTED - Review failed tests above');
        }
        
        console.log('\n📱 MANUAL TEST STEPS:');
        console.log('1. Check your phone for any test messages sent');
        console.log('2. Reply with "SCORE" to test command processing');
        console.log('3. Reply with "HELP" to test help system');
        console.log('4. Reply with A/B/C/D if you have a pending question');
        
    } catch (error) {
        console.error('❌ Test suite failed:', error);
    }
}

testProductionSystem();