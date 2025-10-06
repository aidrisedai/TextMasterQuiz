// This script shows the changes needed to fix the SMS recovery issue
// The problem is in server/routes.ts lines 1072-1122

console.log(`
🔧 FIX FOR SMS RECOVERY ISSUE
============================

PROBLEM: Users get "I sent you a fresh question! Please answer it above." 
instead of proper trivia feedback.

ROOT CAUSE: The recovery mechanism triggers when no pending answers are found,
assuming something went wrong. This creates a bad user experience.

SOLUTION: Replace the problematic recovery logic with proper handling.

CHANGES NEEDED:
==============

1. REMOVE the aggressive recovery mechanism (lines 1075-1115)
2. REPLACE with logic to find their most recent question
3. PROVIDE proper "too late" or "no recent question" feedback
4. OPTIONALLY offer to send a new question instead of assuming they want one

CURRENT PROBLEMATIC CODE (lines 1075-1115):
-------------------------------------------
// SIMPLE RECOVERY: Send them a new question immediately
console.log('🔄 No pending answer found - sending new question as recovery...');

try {
  // ... recovery code that sends new question ...
  await twilioService.sendSMS({
    to: phoneNumber,
    body: "I sent you a fresh question! Please answer it above. 🚀"
  });
} catch (error) {
  // ...
}

PROPOSED FIX:
-------------
Instead of aggressive recovery, check if they have a recent unanswered question
and provide appropriate feedback:

1. If they have a recent question (last 2 hours): Let them answer it late
2. If question is old (>2 hours): Polite "too late" message 
3. If no recent question: Standard "no recent question" message
4. NO automatic question sending without user request

This preserves user experience and eliminates the confusing "fresh question" message.
`);

// Show the exact line numbers and code that needs to be changed
console.log(`
EXACT CODE TO REPLACE:
=====================

FILE: server/routes.ts
LINES: 1072-1122 (the entire recovery block)

REPLACE LINES 1075-1115 WITH:
-----------------------------

      if (pendingAnswers.length === 0) {
        console.log(\`❌ No pending questions found for user \${user.phoneNumber}\`);
        
        // Instead of recovery, check their most recent question
        try {
          const recentAnswers = await storage.getUserAnswers(user.id, 1);
          
          if (recentAnswers.length > 0) {
            const lastAnswer = recentAnswers[0];
            const hoursSinceQuestion = (Date.now() - new Date(lastAnswer.answeredAt || lastAnswer.createdAt).getTime()) / (1000 * 60 * 60);
            
            if (hoursSinceQuestion < 2) {
              // Recent question - let them answer late
              console.log('📝 Allowing late answer to recent question');
              
              // Create a new pending answer for their recent question
              const created = await storage.createPendingAnswerIfNone(user.id, lastAnswer.questionId);
              if (created) {
                // Process their answer against the recent question
                await processAnswer(user, answer, phoneNumber);
                return;
              }
            }
            
            // Question too old or couldn't create pending answer
            await twilioService.sendSMS({
              to: phoneNumber,
              body: "Thanks for your response! That question has expired. You'll get your next daily question at your scheduled time, or text HELP for commands."
            });
          } else {
            // No recent questions at all
            await twilioService.sendSMS({
              to: phoneNumber,
              body: "No recent question found. You'll receive your next daily question at your scheduled time, or text HELP for commands."
            });
          }
        } catch (error) {
          console.log('⚠️ Error checking recent questions:', error);
          await twilioService.sendSMS({
            to: phoneNumber,
            body: "Thanks for your response! Text HELP for available commands or wait for your next daily question."
          });
        }
        
        return;
      }

This fix:
- Removes the problematic "I sent you a fresh question" message
- Allows users to answer recent questions late (within 2 hours)
- Provides clear, helpful feedback for expired or missing questions
- Does NOT send unwanted new questions automatically
- Maintains professional tone and user experience
`);

console.log(`
DEPLOYMENT STEPS:
================
1. Update server/routes.ts with the fix above
2. Test locally with a user scenario
3. Commit and push to production
4. Monitor for the elimination of "fresh question" complaints
5. Verify users now get proper trivia feedback

TESTING:
========
After deploying the fix, test these scenarios:
1. User replies to recent question (should work normally)  
2. User replies to old question (should get "expired" message)
3. User replies with no recent questions (should get "no recent question")
4. User should NEVER get "I sent you a fresh question" message again
`);