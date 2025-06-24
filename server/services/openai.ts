import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_KEY || process.env.AI_API_KEY
});

export interface GeneratedQuestion {
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  explanation: string;
  category: string;
  difficultyLevel: string;
}

export class OpenAIService {
  async generateQuestion(category: string = 'general', difficulty: string = 'medium', existingQuestions: string[] = []): Promise<GeneratedQuestion | null> {
    if (!process.env.OPENAI_API_KEY && !process.env.OPENAI_KEY && !process.env.AI_API_KEY) {
      console.log('OpenAI API key not found. Using fallback question generation.');
      return this.getFallbackQuestion(category, difficulty);
    }

    try {
      let prompt = `Generate a ${difficulty} difficulty trivia question for the category "${category}". 
      
Requirements:
- Question should be educational and engaging
- Provide 4 multiple choice options (A, B, C, D)
- Include a detailed explanation for the correct answer
- Make sure the question is factually accurate
- Avoid overly obscure or controversial topics`;

      // Add existing questions context to prevent duplicates
      if (existingQuestions.length > 0) {
        prompt += `\\n\\nIMPORTANT: Do NOT generate questions similar to these existing ones:\\n`;
        existingQuestions.forEach((q, i) => {
          prompt += `${i + 1}. ${q}\\n`;
        });
        prompt += `\\nGenerate a completely different question that doesn't overlap with the topics above.`;
      }

      prompt += `

Respond with JSON in this exact format:
{
  "questionText": "Your question here?",
  "optionA": "First option",
  "optionB": "Second option", 
  "optionC": "Third option",
  "optionD": "Fourth option",
  "correctAnswer": "A|B|C|D",
  "explanation": "Detailed explanation of why this is correct and additional context",
  "category": "${category}",
  "difficultyLevel": "${difficulty}"
}`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.7,
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error('No content received from OpenAI');
      }

      const question = JSON.parse(content) as GeneratedQuestion;
      
      // Validate the response
      if (!this.validateQuestion(question)) {
        throw new Error('Invalid question format received from OpenAI');
      }

      return question;
    } catch (error) {
      console.error('Failed to generate question with OpenAI:', error);
      return this.getFallbackQuestion(category, difficulty);
    }
  }

  private validateQuestion(question: any): boolean {
    return (
      question &&
      typeof question.questionText === 'string' &&
      typeof question.optionA === 'string' &&
      typeof question.optionB === 'string' &&
      typeof question.optionC === 'string' &&
      typeof question.optionD === 'string' &&
      ['A', 'B', 'C', 'D'].includes(question.correctAnswer) &&
      typeof question.explanation === 'string' &&
      typeof question.category === 'string' &&
      typeof question.difficultyLevel === 'string'
    );
  }

  private getFallbackQuestion(category: string, difficulty: string): GeneratedQuestion {
    const fallbackQuestions: Record<string, GeneratedQuestion[]> = {
      science: [
        {
          questionText: "What is the chemical symbol for gold?",
          optionA: "Go",
          optionB: "Au", 
          optionC: "Ag",
          optionD: "Gd",
          correctAnswer: "B",
          explanation: "The chemical symbol for gold is Au, which comes from its Latin name 'aurum'. Gold is a precious metal with atomic number 79.",
          category,
          difficultyLevel: difficulty
        }
      ],
      history: [
        {
          questionText: "In which year did World War II end?",
          optionA: "1944",
          optionB: "1945",
          optionC: "1946", 
          optionD: "1947",
          correctAnswer: "B",
          explanation: "World War II ended in 1945. The war in Europe ended on May 8, 1945 (VE Day), and the war in the Pacific ended on September 2, 1945 (VJ Day) after Japan's surrender.",
          category,
          difficultyLevel: difficulty
        }
      ],
      general: [
        {
          questionText: "Which planet is known as the 'Red Planet'?",
          optionA: "Venus",
          optionB: "Mars",
          optionC: "Jupiter",
          optionD: "Saturn",
          correctAnswer: "B",
          explanation: "Mars is known as the 'Red Planet' because of its reddish appearance, which is due to iron oxide (rust) on its surface.",
          category,
          difficultyLevel: difficulty
        }
      ]
    };

    const categoryQuestions = fallbackQuestions[category.toLowerCase()] || fallbackQuestions.general;
    return categoryQuestions[Math.floor(Math.random() * categoryQuestions.length)];
  }

  async generateBonusQuestion(userHistory: string[], categories: string[]): Promise<GeneratedQuestion | null> {
    const randomCategory = categories[Math.floor(Math.random() * categories.length)] || 'general';
    return this.generateQuestion(randomCategory, 'medium');
  }
}

export const openaiService = new OpenAIService();
