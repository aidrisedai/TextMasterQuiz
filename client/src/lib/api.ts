import { apiRequest } from "./queryClient";

export interface SignupData {
  phoneNumber: string;
  preferredTime: string;
  categoryPreferences: string[];
  timezone: string;
  terms: boolean;
}

export interface UserStats {
  currentStreak: number;
  totalScore: number;
  questionsAnswered: number;
  accuracyRate: number;
}

export interface RecentAnswer {
  id: number;
  questionText: string;
  userAnswer: string;
  isCorrect: boolean;
  answeredAt: string;
  category: string;
  pointsEarned: number;
}

export interface UserData {
  user: {
    id: number;
    phoneNumber: string;
    preferredTime: string;
    categoryPreferences: string[];
    subscriptionStatus: string;
    joinDate: string;
  };
  stats: UserStats;
  recentAnswers: RecentAnswer[];
}

export const api = {
  async signup(data: SignupData) {
    const response = await apiRequest("POST", "/api/signup", data);
    return response.json();
  },

  async getUserStats(phoneNumber: string): Promise<UserData> {
    const response = await apiRequest("GET", `/api/user/${phoneNumber}/stats`);
    return response.json();
  },

  async sendTestQuestion(phoneNumber: string) {
    const response = await apiRequest("POST", "/api/admin/send-question", { phoneNumber });
    return response.json();
  }
};
