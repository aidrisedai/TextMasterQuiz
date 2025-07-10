import { GoogleGenAI } from "@google/genai";

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

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
  }

  async generateQuestion(category: string = 'general', difficulty: string = 'medium', existingQuestions: string[] = []): Promise<GeneratedQuestion | null> {
    try {
      // Create context-aware prompt to prevent duplicates
      const existingContext = existingQuestions.length > 0 
        ? `\n\nIMPORTANT: Avoid creating questions similar to these existing ones:\n${existingQuestions.slice(0, 5).map((q, i) => `${i+1}. ${q}`).join('\n')}`
        : '';

      const prompt = `Generate a ${difficulty} difficulty trivia question for the "${category}" category. 
        
Requirements:
- Create an engaging, educational question
- Provide 4 multiple choice options (A, B, C, D)
- Only one correct answer
- Include a detailed explanation (2-3 sentences)
- Make it challenging but fair
- Ensure factual accuracy
        
${existingContext}

Return the response in this exact JSON format:
{
  "questionText": "Your question here",
  "optionA": "First option",
  "optionB": "Second option", 
  "optionC": "Third option",
  "optionD": "Fourth option",
  "correctAnswer": "A",
  "explanation": "Detailed explanation here",
  "category": "${category}",
  "difficultyLevel": "${difficulty}"
}`;

      const response = await this.ai.models.generateContent({
        model: "gemini-2.5-flash",
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "object",
            properties: {
              questionText: { type: "string" },
              optionA: { type: "string" },
              optionB: { type: "string" },
              optionC: { type: "string" },
              optionD: { type: "string" },
              correctAnswer: { type: "string" },
              explanation: { type: "string" },
              category: { type: "string" },
              difficultyLevel: { type: "string" }
            },
            required: ["questionText", "optionA", "optionB", "optionC", "optionD", "correctAnswer", "explanation", "category", "difficultyLevel"]
          }
        },
        contents: prompt
      });

      const responseText = response.text;
      if (!responseText) {
        console.error('Empty response from Gemini');
        return this.getFallbackQuestion(category, difficulty);
      }

      const question = JSON.parse(responseText);
      
      if (!this.validateQuestion(question)) {
        console.error('Invalid question format from Gemini:', question);
        return this.getFallbackQuestion(category, difficulty);
      }

      return question;
    } catch (error) {
      console.error('Gemini API error:', error);
      return this.getFallbackQuestion(category, difficulty);
    }
  }

  private validateQuestion(question: any): boolean {
    const requiredFields = ['questionText', 'optionA', 'optionB', 'optionC', 'optionD', 'correctAnswer', 'explanation', 'category', 'difficultyLevel'];
    
    for (const field of requiredFields) {
      if (!question[field] || typeof question[field] !== 'string') {
        return false;
      }
    }

    // Validate correct answer is A, B, C, or D
    if (!['A', 'B', 'C', 'D'].includes(question.correctAnswer)) {
      return false;
    }

    return true;
  }

  private getFallbackQuestion(category: string, difficulty: string): GeneratedQuestion {
    const fallbackQuestions = {
      general: {
        questionText: "What is the capital of France?",
        optionA: "Paris",
        optionB: "London", 
        optionC: "Berlin",
        optionD: "Madrid",
        correctAnswer: "A",
        explanation: "Paris is the capital and largest city of France, known for its iconic landmarks like the Eiffel Tower and Louvre Museum."
      },
      science: {
        questionText: "What is the chemical symbol for water?",
        optionA: "H2O",
        optionB: "CO2",
        optionC: "NaCl", 
        optionD: "O2",
        correctAnswer: "A",
        explanation: "Water's chemical formula is H2O, representing two hydrogen atoms bonded to one oxygen atom."
      },
      history: {
        questionText: "In which year did World War II end?",
        optionA: "1945",
        optionB: "1944",
        optionC: "1946",
        optionD: "1943",
        correctAnswer: "A",
        explanation: "World War II ended in 1945 with the surrender of Japan in September, following the atomic bombings and Soviet invasion."
      }
    };

    const fallback = fallbackQuestions[category as keyof typeof fallbackQuestions] || fallbackQuestions.general;
    
    return {
      ...fallback,
      category,
      difficultyLevel: difficulty
    };
  }

  async generateBonusQuestion(userHistory: string[], categories: string[]): Promise<GeneratedQuestion | null> {
    const randomCategory = categories[Math.floor(Math.random() * categories.length)];
    return this.generateQuestion(randomCategory, 'hard', userHistory);
  }
}

export const geminiService = new GeminiService();