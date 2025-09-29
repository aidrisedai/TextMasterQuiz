const fs = require('fs');

function analyzeUserData() {
  try {
    console.log('📊 Analyzing user data files...\n');
    
    // Read and parse JSON files
    const usersData = JSON.parse(fs.readFileSync('users.json', 'utf8'));
    const userAnswersData = JSON.parse(fs.readFileSync('user_answers.json', 'utf8'));
    
    console.log('📈 Dataset Overview:');
    console.log(`  - Users: ${usersData.length}`);
    console.log(`  - User Answers: ${userAnswersData.length}`);
    
    // Analyze users
    console.log('\n👥 User Analysis:');
    if (usersData.length > 0) {
      const sampleUser = usersData[0];
      console.log('Sample user structure:');
      console.log(JSON.stringify(sampleUser, null, 2));
      
      // User statistics
      const uniquePhones = new Set(usersData.map(u => u.phone)).size;
      const usersWithNames = usersData.filter(u => u.name && u.name.trim()).length;
      const activeUsers = usersData.filter(u => u.streak > 0).length;
      
      console.log(`\nUser Statistics:`);
      console.log(`  - Unique phone numbers: ${uniquePhones}`);
      console.log(`  - Users with names: ${usersWithNames} (${((usersWithNames/usersData.length)*100).toFixed(1)}%)`);
      console.log(`  - Users with active streaks: ${activeUsers} (${((activeUsers/usersData.length)*100).toFixed(1)}%)`);
      
      // Timezone distribution
      const timezones = {};
      usersData.forEach(u => {
        if (u.timezone) {
          timezones[u.timezone] = (timezones[u.timezone] || 0) + 1;
        }
      });
      console.log(`\nTop timezones:`);
      Object.entries(timezones)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .forEach(([tz, count]) => {
          console.log(`  - ${tz}: ${count} users`);
        });
      
      // Points distribution
      const totalPoints = usersData.reduce((sum, u) => sum + (u.total_points || 0), 0);
      const avgPoints = totalPoints / usersData.length;
      console.log(`\nPoints Statistics:`);
      console.log(`  - Total points: ${totalPoints}`);
      console.log(`  - Average points per user: ${avgPoints.toFixed(1)}`);
    }
    
    // Analyze user answers
    console.log('\n📝 User Answers Analysis:');
    if (userAnswersData.length > 0) {
      const sampleAnswer = userAnswersData[0];
      console.log('Sample answer structure:');
      console.log(JSON.stringify(sampleAnswer, null, 2));
      
      // Answer statistics
      const correctAnswers = userAnswersData.filter(a => a.is_correct).length;
      const totalPoints = userAnswersData.reduce((sum, a) => sum + (a.points_earned || 0), 0);
      const uniqueUsers = new Set(userAnswersData.map(a => a.user_id)).size;
      const uniqueQuestions = new Set(userAnswersData.map(a => a.question_id)).size;
      
      console.log(`\nAnswer Statistics:`);
      console.log(`  - Correct answers: ${correctAnswers} (${((correctAnswers/userAnswersData.length)*100).toFixed(1)}%)`);
      console.log(`  - Total points earned: ${totalPoints}`);
      console.log(`  - Unique users who answered: ${uniqueUsers}`);
      console.log(`  - Unique questions answered: ${uniqueQuestions}`);
      
      // Answer patterns
      const answerChoices = {};
      userAnswersData.forEach(a => {
        if (a.user_answer) {
          answerChoices[a.user_answer] = (answerChoices[a.user_answer] || 0) + 1;
        }
      });
      console.log(`\nAnswer choice distribution:`);
      Object.entries(answerChoices)
        .sort(([,a], [,b]) => b - a)
        .forEach(([choice, count]) => {
          console.log(`  - ${choice || 'null'}: ${count} times`);
        });
      
      // Date range
      const dates = userAnswersData
        .map(a => new Date(a.answered_at))
        .filter(d => !isNaN(d))
        .sort((a, b) => a - b);
      
      if (dates.length > 0) {
        console.log(`\nDate Range:`);
        console.log(`  - First answer: ${dates[0].toISOString().split('T')[0]}`);
        console.log(`  - Last answer: ${dates[dates.length - 1].toISOString().split('T')[0]}`);
      }
    }
    
    console.log('\n✅ Analysis complete!');
    console.log('\n🚀 Ready to run: node scripts/import-json-users.js');
    
  } catch (error) {
    console.error('❌ Analysis failed:', error);
  }
}

analyzeUserData();