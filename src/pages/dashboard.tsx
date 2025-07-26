import * as React from "react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { StatsCard } from "../components/stats-card";
import { Skeleton } from "../components/ui/skeleton";
import { api } from "../lib/api";
import { Flame, Trophy, Target, Percent, MessageCircle, Settings, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function Dashboard() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  const { data: userData, isLoading, error } = useQuery({
    queryKey: ['/api/user/stats', phoneNumber],
    enabled: hasSearched && phoneNumber.length > 0,
    queryFn: () => api.getUserStats(phoneNumber),
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (phoneNumber.trim()) {
      setHasSearched(true);
    }
  };

  if (!hasSearched) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="bg-background shadow-sm border-b border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <Link href="/">
                <div className="flex items-center space-x-2 cursor-pointer">
                  <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                    <MessageCircle className="text-primary-foreground text-sm" />
                  </div>
                  <h1 className="text-xl font-bold text-foreground">Text4Quiz</h1>
                </div>
              </Link>
              <Link href="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Home
                </Button>
              </Link>
            </div>
          </div>
        </header>

        {/* Search Form */}
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">View Your Dashboard</CardTitle>
              <CardDescription>
                Enter your phone number to view your Text4Quiz stats
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSearch} className="space-y-4">
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="+1 (555) 123-4567"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="text-base min-h-[44px]" // Prevents zoom on iOS, proper touch target
                    required
                  />
                </div>
                <Button type="submit" className="w-full min-h-[44px]">
                  View Dashboard
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="bg-background shadow-sm border-b border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <Link href="/">
                <div className="flex items-center space-x-2 cursor-pointer">
                  <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                    <MessageCircle className="text-primary-foreground text-sm" />
                  </div>
                  <h1 className="text-xl font-bold text-foreground">Text4Quiz</h1>
                </div>
              </Link>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-4 w-20 mb-2" />
                  <Skeleton className="h-8 w-16 mb-1" />
                  <Skeleton className="h-3 w-24" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !userData) {
    return (
      <div className="min-h-screen bg-background">
        <header className="bg-background shadow-sm border-b border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <Link href="/">
                <div className="flex items-center space-x-2 cursor-pointer">
                  <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                    <MessageCircle className="text-primary-foreground text-sm" />
                  </div>
                  <h1 className="text-xl font-bold text-foreground">Text4Quiz</h1>
                </div>
              </Link>
            </div>
          </div>
        </header>

        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <Card>
            <CardContent className="pt-6 text-center">
              <h2 className="text-xl font-semibold mb-2">User Not Found</h2>
              <p className="text-muted-foreground mb-4">
                We couldn't find a user with that phone number. Make sure you've signed up first.
              </p>
              <div className="space-y-2">
                <Button onClick={() => setHasSearched(false)} variant="outline">
                  Try Different Number
                </Button>
                <Link href="/#signup">
                  <Button className="w-full">
                    Sign Up for Text4Quiz
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const { user, stats, recentAnswers } = userData;

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Header */}
      <header className="bg-background shadow-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <Link href="/">
              <div className="flex items-center space-x-2 cursor-pointer">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <MessageCircle className="text-primary-foreground text-sm" />
                </div>
                <h1 className="text-xl font-bold text-foreground">Text4Quiz</h1>
              </div>
            </Link>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-muted-foreground hidden sm:inline">
                {user.phoneNumber}
              </span>
              <Link href="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Home
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Your Quiz Dashboard</h1>
          <p className="text-muted-foreground">Track your progress and manage your preferences</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <StatsCard
            title="Current Streak"
            value={stats.currentStreak}
            subtitle="days in a row"
            icon={Flame}
            gradient="gradient-stats border-secondary/20"
            iconColor="text-secondary"
          />
          
          <StatsCard
            title="Total Score"
            value={stats.totalScore.toLocaleString()}
            subtitle="points earned"
            icon={Trophy}
            gradient="gradient-primary border-primary/20"
            iconColor="text-primary"
          />
          
          <StatsCard
            title="Questions"
            value={stats.questionsAnswered}
            subtitle="answered"
            icon={Target}
            gradient="gradient-accent border-accent/20"
            iconColor="text-accent"
          />
          
          <StatsCard
            title="Accuracy"
            value={`${stats.accuracyRate}%`}
            subtitle="correct answers"
            icon={Percent}
            gradient="bg-purple-500/10 border-purple-500/20"
            iconColor="text-purple-500"
          />
        </div>

        {/* Recent Activity */}
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Recent Questions</CardTitle>
              </CardHeader>
              <CardContent>
                {recentAnswers.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No questions answered yet</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Wait for your next daily question or text "MORE" for a bonus question (Premium)
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentAnswers.map((answer) => (
                      <div key={answer.id} className="flex items-start space-x-4 p-4 bg-muted/50 rounded-lg">
                        <div className="flex-shrink-0">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            answer.isCorrect ? 'bg-secondary' : 'bg-destructive'
                          }`}>
                            {answer.isCorrect ? (
                              <Trophy className="h-4 w-4 text-white" />
                            ) : (
                              <Target className="h-4 w-4 text-white" />
                            )}
                          </div>
                        </div>
                        <div className="flex-grow">
                          <p className="text-sm font-medium text-foreground">
                            {answer.questionText}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            Your answer: {answer.userAnswer} {answer.isCorrect ? '✓' : '✗'} • 
                            Category: {answer.category} • 
                            +{answer.pointsEarned} points
                          </p>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(answer.answeredAt).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Settings and Commands */}
          <div className="space-y-6">
            {/* Settings Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="mr-2 h-5 w-5" />
                  Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Quiz Time</span>
                  <span className="text-sm text-muted-foreground">
                    {user.preferredTime ? 
                      new Date(`2000-01-01T${user.preferredTime}`).toLocaleTimeString([], { 
                        hour: 'numeric', 
                        minute: '2-digit',
                        hour12: true 
                      }) : 
                      'Not set'
                    }
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Categories</span>
                  <span className="text-sm text-muted-foreground">
                    {user.categoryPreferences?.length > 0 
                      ? user.categoryPreferences.slice(0, 2).join(', ') +
                        (user.categoryPreferences.length > 2 ? ` +${user.categoryPreferences.length - 2}` : '')
                      : 'All categories'
                    }
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Status</span>
                  <span className={`text-sm capitalize ${
                    user.subscriptionStatus === 'premium' ? 'text-accent' : 'text-muted-foreground'
                  }`}>
                    {user.subscriptionStatus}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* SMS Commands */}
            <Card>
              <CardHeader>
                <CardTitle>SMS Commands</CardTitle>
                <CardDescription>
                  Text these commands to control your experience
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <code className="text-sm bg-muted px-2 py-1 rounded">SCORE</code>
                  <span className="text-sm text-muted-foreground">View stats</span>
                </div>
                <div className="flex justify-between items-center">
                  <code className="text-sm bg-muted px-2 py-1 rounded">MORE</code>
                  <span className="text-sm text-muted-foreground">Bonus question</span>
                </div>
                <div className="flex justify-between items-center">
                  <code className="text-sm bg-muted px-2 py-1 rounded">HELP</code>
                  <span className="text-sm text-muted-foreground">Get help</span>
                </div>
                <div className="flex justify-between items-center">
                  <code className="text-sm bg-muted px-2 py-1 rounded">STOP</code>
                  <span className="text-sm text-muted-foreground">Unsubscribe</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
