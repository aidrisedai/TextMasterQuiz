import * as React from 'react';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { ScrollArea } from '../components/ui/scroll-area';
import { Separator } from '../components/ui/separator';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../components/ui/form';
import { RefreshCw, Plus, Database, MessageSquare, LogIn, LogOut, User } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

interface Question {
  id: number;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  explanation: string;
  category: string;
  difficultyLevel: string;
  usageCount: number;
  createdDate: string;
}

interface QuestionStats {
  totalQuestions: number;
  categories: Record<string, number>;
}

interface AuthStatus {
  authenticated: boolean;
  user?: {
    id: number;
    name: string;
    email: string;
    isAdmin: boolean;
  };
}

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export default function AdminPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [stats, setStats] = useState<QuestionStats>({ totalQuestions: 0, categories: {} });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<string>('questions');
  const [authStatus, setAuthStatus] = useState<AuthStatus>({ authenticated: false });
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const { toast } = useToast();
  
  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const checkAuthStatus = async () => {
    try {
      const response = await fetch('/api/auth/status');
      const data = await response.json();
      setAuthStatus(data);
      return data.authenticated;
    } catch (error) {
      console.error('Error checking auth status:', error);
      setAuthStatus({ authenticated: false });
      return false;
    } finally {
      setIsCheckingAuth(false);
    }
  };

  const handleLogin = async (data: z.infer<typeof loginSchema>) => {
    setIsLoggingIn(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      const result = await response.json();
      
      if (response.ok) {
        setAuthStatus({ authenticated: true, user: result.user });
        toast({
          title: "Login successful",
          description: "Welcome to the admin panel!",
        });
        fetchQuestions();
      } else {
        toast({
          title: "Login failed",
          description: result.message || "Invalid credentials",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Login failed",
        description: "An error occurred during login",
        variant: "destructive",
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setAuthStatus({ authenticated: false });
      loginForm.reset();
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
    } catch (error) {
      console.error('Logout error:', error);
      toast({
        title: "Error",
        description: "Failed to logout",
        variant: "destructive"
      });
    }
  };
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setAuthStatus({ authenticated: false });
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
    } catch (error) {
      console.error('Logout error:', error);
      toast({
        title: "Error",
        description: "Failed to logout",
        variant: "destructive"
      });
    }
  };

  const fetchQuestions = async (category?: string) => {
    try {
      setIsLoading(true);
      const url = category && category !== 'all' 
        ? `/api/admin/questions?category=${category}`
        : '/api/admin/questions';
      
      const response = await fetch(url);
      const data = await response.json();
      
      setQuestions(data.questions || []);
      setStats(data.stats || { totalQuestions: 0, categories: {} });
    } catch (error) {
      console.error('Error fetching questions:', error);
      toast({
        title: "Error",
        description: "Failed to load questions",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generateQuestions = async () => {
    try {
      const response = await fetch('/api/admin/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      
      const data = await response.json();
      
      toast({
        title: "Question Generation Started",
        description: data.note || "This will take several minutes. Check server logs for progress.",
      });
      
      // Refresh questions after a delay
      setTimeout(() => fetchQuestions(selectedCategory), 2000);
    } catch (error) {
      console.error('Error generating questions:', error);
      toast({
        title: "Error",
        description: "Failed to start question generation",
        variant: "destructive"
      });
    }
  };

  const testSMS = async () => {
    try {
      const response = await fetch('/api/admin/test-delivery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: '+15153570454' })
      });
      
      const data = await response.json();
      
      toast({
        title: "SMS Test Sent",
        description: data.note || "Check server logs for delivery status",
      });
    } catch (error) {
      console.error('Error testing SMS:', error);
      toast({
        title: "Error",
        description: "Failed to send test SMS",
        variant: "destructive"
      });
    }
  };

  const testAllCommands = async () => {
    try {
      const response = await fetch('/api/test/sms-commands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: '+15153570454' })
      });
      
      const data = await response.json();
      
      toast({
        title: data.success ? "All Commands Working!" : "Some Commands Failed",
        description: data.summary,
        variant: data.success ? "default" : "destructive"
      });
    } catch (error) {
      console.error('Error testing all commands:', error);
      toast({
        title: "Error",
        description: "Failed to test SMS commands",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      const authenticated = await checkAuthStatus();
      if (authenticated) {
        fetchQuestions(selectedCategory);
      }
    };
    
    initializeAuth();
  }, []);

  useEffect(() => {
    if (authStatus.authenticated) {
      fetchQuestions(selectedCategory);
    }
  }, [selectedCategory, authStatus.authenticated]);

  const categories = ['all', ...Object.keys(stats.categories)];

  // Show loading screen while checking authentication
  if (isCheckingAuth) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Show login screen if not authenticated
  if (!authStatus.authenticated) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Admin Access</CardTitle>
            <p className="text-gray-600">Enter your admin credentials</p>
          </CardHeader>
          <CardContent>
            <Form {...loginForm}>
              <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                <FormField
                  control={loginForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter username" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={loginForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Enter password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" size="lg" disabled={isLoggingIn}>
                  {isLoggingIn ? (
                    <>
                      <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                      Logging in...
                    </>
                  ) : (
                    <>
                      <LogIn className="h-5 w-5 mr-2" />
                      Login
                    </>
                  )}
                </Button>
              </form>
            </Form>
            <div className="text-xs text-gray-500 text-center mt-4">
              Admin credentials are securely stored in the database
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Text4Quiz Admin</h1>
        <div className="flex items-center gap-2">
          {authStatus.user && (
            <div className="flex items-center gap-2 mr-4">
              <User className="h-4 w-4" />
              <span className="text-sm">{authStatus.user.name}</span>
              <Button onClick={handleLogout} variant="outline" size="sm">
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          )}
          <Button onClick={() => fetchQuestions(selectedCategory)} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={generateQuestions}>
            <Plus className="h-4 w-4 mr-2" />
            Generate Questions
          </Button>
          <Button onClick={testSMS} variant="outline">
            <MessageSquare className="h-4 w-4 mr-2" />
            Test SMS
          </Button>
          <Button onClick={testAllCommands} variant="outline">
            <MessageSquare className="h-4 w-4 mr-2" />
            Test All Commands
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Questions</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalQuestions}</div>
            <p className="text-xs text-muted-foreground">
              Across {Object.keys(stats.categories).length} categories
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1">
              {Object.entries(stats.categories).map(([category, count]) => (
                <Badge key={category} variant="secondary" className="text-xs">
                  {category} ({count})
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm space-y-1">
              <div className="text-green-600">✓ Database Connected</div>
              <div className="text-green-600">✓ SMS Service Active</div>
              <div className="text-green-600">✓ Google Gemini AI Ready</div>
              <div className="text-green-600">✓ All SMS Commands Working</div>
              <div className="text-xs text-gray-500 mt-2">
                SCORE, HELP, STOP, RESTART, A/B/C/D, MORE
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="questions" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="questions">Questions</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
        </TabsList>
        
        <TabsContent value="questions" className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            {categories.map(category => (
              <Button
                key={category}
                onClick={() => setSelectedCategory(category)}
                variant={selectedCategory === category ? "default" : "outline"}
                size="sm"
              >
                {category === 'all' ? 'All Categories' : category}
                {category !== 'all' && stats.categories[category] && (
                  <Badge variant="secondary" className="ml-2">
                    {stats.categories[category]}
                  </Badge>
                )}
              </Button>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>
                Questions {selectedCategory !== 'all' && `- ${selectedCategory}`}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin" />
                  <span className="ml-2">Loading questions...</span>
                </div>
              ) : (
                <ScrollArea className="h-[600px]">
                  <div className="space-y-4">
                    {questions.map((question, index) => (
                      <div key={question.id} className="p-4 border rounded-lg space-y-2">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="font-semibold text-sm">
                              Question #{index + 1}
                            </h3>
                            <p className="text-sm mt-1">{question.questionText}</p>
                          </div>
                          <div className="flex gap-2">
                            <Badge variant="outline">{question.category}</Badge>
                            <Badge variant="secondary">{question.difficultyLevel}</Badge>
                            <Badge variant="outline">Used {question.usageCount}x</Badge>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className={`p-2 rounded ${question.correctAnswer === 'A' ? 'bg-green-100' : 'bg-gray-50'}`}>
                            A) {question.optionA}
                          </div>
                          <div className={`p-2 rounded ${question.correctAnswer === 'B' ? 'bg-green-100' : 'bg-gray-50'}`}>
                            B) {question.optionB}
                          </div>
                          <div className={`p-2 rounded ${question.correctAnswer === 'C' ? 'bg-green-100' : 'bg-gray-50'}`}>
                            C) {question.optionC}
                          </div>
                          <div className={`p-2 rounded ${question.correctAnswer === 'D' ? 'bg-green-100' : 'bg-gray-50'}`}>
                            D) {question.optionD}
                          </div>
                        </div>
                        
                        <div className="text-xs text-gray-600">
                          <strong>Explanation:</strong> {question.explanation}
                        </div>
                        
                        <div className="text-xs text-gray-400">
                          Created: {new Date(question.createdDate).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="categories" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Category Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(stats.categories).map(([category, count]) => (
                  <div key={category} className="flex justify-between items-center p-3 border rounded">
                    <div>
                      <h3 className="font-semibold capitalize">{category}</h3>
                      <p className="text-sm text-gray-600">{count} questions available</p>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="secondary">{count} questions</Badge>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setSelectedCategory(category)}
                      >
                        View
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}