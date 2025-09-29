import pkg from 'pg';
const { Client } = pkg;

async function previewQuestions() {
    console.log('🎵 **SAMPLE MUSIC QUESTIONS TO BE GENERATED:**');
    console.log('=' .repeat(60));
    
    const musicSamples = [
        {
            topic: "Classical composers and their famous works",
            question: "Which composer is famous for the 'Four Seasons' violin concertos?",
            options: ["Antonio Vivaldi", "Johann Bach", "Wolfgang Mozart", "Ludwig Beethoven"],
            correct: "A",
            explanation: "Antonio Vivaldi composed 'The Four Seasons' around 1720, a set of four violin concertos representing spring, summer, autumn, and winter."
        },
        {
            topic: "Rock bands and their hit songs", 
            question: "Which band released the album 'Dark Side of the Moon' in 1973?",
            options: ["Led Zeppelin", "Pink Floyd", "The Beatles", "Queen"],
            correct: "B",
            explanation: "Pink Floyd's 'Dark Side of the Moon' became one of the best-selling albums of all time, staying on the Billboard 200 for 14 years."
        },
        {
            topic: "Grammy Awards and music industry",
            question: "Which artist has won the most Grammy Awards in history?",
            options: ["Michael Jackson", "Beyoncé", "Alison Krauss", "Quincy Jones"],
            correct: "B", 
            explanation: "Beyoncé holds the record with 32 Grammy wins, including her solo career and time with Destiny's Child."
        },
        {
            topic: "Jazz musicians and instruments",
            question: "Which instrument was Louis Armstrong most famous for playing?",
            options: ["Saxophone", "Piano", "Trumpet", "Drums"],
            correct: "C",
            explanation: "Louis Armstrong was a legendary trumpet player and singer, considered one of the most influential figures in jazz history."
        },
        {
            topic: "Musical instruments and terminology", 
            question: "What is the term for gradually getting louder in music?",
            options: ["Crescendo", "Diminuendo", "Staccato", "Legato"],
            correct: "A",
            explanation: "Crescendo is an Italian term meaning 'growing' and indicates that the music should gradually increase in volume."
        }
    ];

    musicSamples.forEach((sample, index) => {
        console.log(`${index + 1}. Topic: ${sample.topic}`);
        console.log(`   Q: ${sample.question}`);
        console.log(`   A) ${sample.options[0]}`);
        console.log(`   B) ${sample.options[1]}`);
        console.log(`   C) ${sample.options[2]}`);
        console.log(`   D) ${sample.options[3]}`);
        console.log(`   ✓ Correct: ${sample.correct}`);
        console.log(`   💡 ${sample.explanation}`);
        console.log('');
    });

    console.log('🎬 **SAMPLE MOVIE QUESTIONS TO BE GENERATED:**');
    console.log('=' .repeat(60));
    
    const movieSamples = [
        {
            topic: "Academy Awards and Oscar winners",
            question: "Which film won the Academy Award for Best Picture in 2020?",
            options: ["1917", "Joker", "Parasite", "Once Upon a Time in Hollywood"],
            correct: "C",
            explanation: "Parasite made history as the first non-English language film to win Best Picture, also winning Best Director for Bong Joon-ho."
        },
        {
            topic: "Classic Hollywood golden age films",
            question: "Who directed the 1941 film 'Citizen Kane'?",
            options: ["Alfred Hitchcock", "Orson Welles", "John Ford", "Billy Wilder"], 
            correct: "B",
            explanation: "Orson Welles not only directed but also starred in 'Citizen Kane', which is often cited as one of the greatest films ever made."
        },
        {
            topic: "Animated movies and studios",
            question: "Which was the first fully computer-animated feature film?",
            options: ["Shrek", "A Bug's Life", "Toy Story", "The Lion King"],
            correct: "C",
            explanation: "Toy Story (1995) was Pixar's first feature film and the world's first entirely computer-animated feature-length film."
        },
        {
            topic: "Film directors and their styles",
            question: "Which director is known for films like 'Pulp Fiction' and 'Kill Bill'?",
            options: ["Martin Scorsese", "Quentin Tarantino", "Christopher Nolan", "Steven Spielberg"],
            correct: "B",
            explanation: "Quentin Tarantino is known for his distinctive style including nonlinear storylines, pop culture references, and stylized violence."
        },
        {
            topic: "Superhero and comic book movies",
            question: "In which year was the first Iron Man movie released, launching the Marvel Cinematic Universe?",
            options: ["2007", "2008", "2009", "2010"],
            correct: "B",
            explanation: "Iron Man was released in 2008, starring Robert Downey Jr. and marking the beginning of the hugely successful Marvel Cinematic Universe."
        }
    ];

    movieSamples.forEach((sample, index) => {
        console.log(`${index + 1}. Topic: ${sample.topic}`);
        console.log(`   Q: ${sample.question}`);
        console.log(`   A) ${sample.options[0]}`);
        console.log(`   B) ${sample.options[1]}`);
        console.log(`   C) ${sample.options[2]}`);
        console.log(`   D) ${sample.options[3]}`);
        console.log(`   ✓ Correct: ${sample.correct}`);
        console.log(`   💡 ${sample.explanation}`);
        console.log('');
    });

    console.log('🎯 **EXPANSION PLAN:**');
    console.log('=' .repeat(60));
    console.log('Current state:');
    console.log('  - Music: 204 questions');
    console.log('  - Movies: 218 questions');
    console.log('  - Arts: 8,077 questions (after merging Art category)');
    console.log('');
    console.log('Recommended targets:');
    console.log('  - Music: 1,000+ questions (expand by ~800)');
    console.log('  - Movies: 1,000+ questions (expand by ~780)');
    console.log('');
    console.log('This would bring both categories to roughly 1% each of your total database,');
    console.log('making them more balanced for regular trivia rotation.');
    console.log('');
    console.log('🚀 To proceed with AI generation:');
    console.log('1. Set your GOOGLE_GENERATIVE_AI_API_KEY in environment');
    console.log('2. Run: TARGET_MUSIC=1000 TARGET_MOVIES=1000 node scripts/expand-categories.js');
    console.log('3. Monitor progress and adjust batch sizes as needed');
}

previewQuestions();