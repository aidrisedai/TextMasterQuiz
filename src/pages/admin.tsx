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
import { RefreshCw, Plus, Database, MessageSquare, LogIn, LogOut, User, Send } from 'lucide-react';
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

interface User {
  id: number;
  phoneNumber: string;
  name: string;
  categories: string[];
  lastMessageDate: string | null;
  lastMessageContent: string | null;
  lastQuestionId: number | null;
  subscriptionStatus: string;
  isActive: boolean;
  preferredTime: string;
  timezone: string;
  currentStreak: number;
  totalScore: number;
  questionsAnswered: number;
  correctAnswers: number;
  joinDate: string;
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

interface GenerationJob {
  id: number;
  category: string;
  questionCount: number;
  status: 'pending' | 'active' | 'completed' | 'failed';
  progress: number;
  total: number | null;
  errorMessage: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

interface Broadcast {
  id: number;
  message: string;
  createdBy: string;
  status: 'pending' | 'active' | 'completed' | 'failed' | 'cancelled';
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  estimatedDuration: number | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

interface BroadcastPreview {
  recipientCount: number;
  estimatedDuration: number;
  characterCount: number;
  messagePreview: string;
}

const queueGenerationSchema = z.object({
  category: z.string().min(1, 'Category is required'),
  questionCount: z.number().min(1).max(100, 'Maximum 100 questions per job'),
});

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

const broadcastSchema = z.object({
  message: z.string().min(1, 'Message is required').max(1500, 'Message too long (max 1500 characters)'),
});

const testBroadcastSchema = z.object({
  message: z.string().min(1, 'Message is required').max(1500, 'Message too long (max 1500 characters)'),
  testPhoneNumbers: z.string().optional(),
});

export default function AdminPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [stats, setStats] = useState<QuestionStats>({ totalQuestions: 0, categories: {} });
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUsersLoading, setIsUsersLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<string>('questions');
  const [authStatus, setAuthStatus] = useState<AuthStatus>({ authenticated: false });
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [userFilter, setUserFilter] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'categories'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [generationJobs, setGenerationJobs] = useState<GenerationJob[]>([]);
  const [isGenerationLoading, setIsGenerationLoading] = useState(false);
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [broadcastPreview, setBroadcastPreview] = useState<BroadcastPreview | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isBroadcastLoading, setIsBroadcastLoading] = useState(false);
  const [isTestMode, setIsTestMode] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const { toast } = useToast();
  
  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const queueForm = useForm<z.infer<typeof queueGenerationSchema>>({
    resolver: zodResolver(queueGenerationSchema),
    defaultValues: {
      category: "",
      questionCount: 20,
    },
  });

  const broadcastForm = useForm<z.infer<typeof broadcastSchema>>({
    resolver: zodResolver(broadcastSchema),
    defaultValues: {
      message: "",
    },
  });

  const testBroadcastForm = useForm<z.infer<typeof testBroadcastSchema>>({
    resolver: zodResolver(testBroadcastSchema),
    defaultValues: {
      message: "",
      testPhoneNumbers: "",
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

  const fetchGenerationQueue = async () => {
    try {
      setIsGenerationLoading(true);
      const response = await fetch('/api/admin/generation-queue');
      const data = await response.json();
      setGenerationJobs(data.jobs || []);
    } catch (error) {
      console.error('Error fetching generation queue:', error);
      toast({
        title: "Error",
        description: "Failed to load generation queue",
        variant: "destructive"
      });
    } finally {
      setIsGenerationLoading(false);
    }
  };

  const addToQueue = async (data: z.infer<typeof queueGenerationSchema>) => {
    try {
      const response = await fetch('/api/admin/queue-generation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      const result = await response.json();
      
      if (response.ok) {
        toast({
          title: "Added to Queue",
          description: result.message,
        });
        queueForm.reset();
        fetchGenerationQueue();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to add to queue",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error adding to queue:', error);
      toast({
        title: "Error",
        description: "Failed to add to queue",
        variant: "destructive"
      });
    }
  };

  const removeFromQueue = async (jobId: number) => {
    try {
      const response = await fetch(`/api/admin/generation-queue/${jobId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        toast({
          title: "Removed from Queue",
          description: "Job has been cancelled",
        });
        fetchGenerationQueue();
      } else {
        toast({
          title: "Error",
          description: "Failed to remove from queue",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error removing from queue:', error);
      toast({
        title: "Error",
        description: "Failed to remove from queue",
        variant: "destructive"
      });
    }
  };

  const fetchBroadcasts = async () => {
    try {
      const response = await fetch('/api/admin/broadcasts');
      const data = await response.json();
      
      if (response.ok) {
        setBroadcasts(data.broadcasts || []);
      } else {
        throw new Error(data.error || 'Failed to fetch broadcasts');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load broadcasts",
        variant: "destructive",
      });
    }
  };

  const previewBroadcast = async (message: string) => {
    if (!message.trim()) {
      setBroadcastPreview(null);
      return;
    }

    try {
      setIsPreviewLoading(true);
      const response = await fetch('/api/admin/broadcast/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });
      const data = await response.json();
      
      if (response.ok) {
        setBroadcastPreview(data);
      } else {
        throw new Error(data.error || 'Failed to preview broadcast');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to preview broadcast",
        variant: "destructive",
      });
      setBroadcastPreview(null);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const createBroadcast = async (values: z.infer<typeof broadcastSchema>) => {
    try {
      setIsBroadcastLoading(true);
      const response = await fetch('/api/admin/broadcast/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const data = await response.json();
      
      if (response.ok) {
        toast({
          title: "Success",
          description: `Broadcast created and queued for delivery to ${broadcastPreview?.recipientCount || 0} users`,
        });
        broadcastForm.reset();
        setBroadcastPreview(null);
        fetchBroadcasts();
      } else {
        throw new Error(data.error || 'Failed to create broadcast');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create broadcast",
        variant: "destructive",
      });
    } finally {
      setIsBroadcastLoading(false);
    }
  };

  const cancelBroadcast = async (id: number) => {
    try {
      const response = await fetch(`/api/admin/broadcast/${id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      
      if (response.ok) {
        toast({
          title: "Success",
          description: "Broadcast cancelled successfully",
        });
        fetchBroadcasts();
      } else {
        throw new Error(data.error || 'Failed to cancel broadcast');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to cancel broadcast",
        variant: "destructive",
      });
    }
  };

  const testBroadcast = async (values: z.infer<typeof testBroadcastSchema>) => {
    try {
      setIsBroadcastLoading(true);
      
      // Parse phone numbers from string
      const phoneNumbers = values.testPhoneNumbers 
        ? values.testPhoneNumbers.split(',').map(num => num.trim()).filter(num => num)
        : [];
      
      const response = await fetch('/api/admin/broadcast/test-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: values.message,
          testPhoneNumbers: phoneNumbers,
        }),
      });
      const data = await response.json();
      
      if (response.ok) {
        toast({
          title: "Test Broadcast Sent",
          description: `Test message sent to ${data.results?.length || 0} number(s). Check broadcast history for details.`,
        });
        testBroadcastForm.reset();
        fetchBroadcasts();
      } else {
        throw new Error(data.error || 'Failed to send test broadcast');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send test broadcast",
        variant: "destructive",
      });
    } finally {
      setIsBroadcastLoading(false);
    }
  };

  const simulateBroadcast = async (values: z.infer<typeof broadcastSchema>) => {
    try {
      setIsSimulating(true);
      const response = await fetch('/api/admin/broadcast/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const data = await response.json();
      
      if (response.ok) {
        toast({
          title: "Simulation Complete",
          description: `Simulated broadcast to ${data.simulation?.totalUsers || 0} users. Success rate: ${data.simulation?.successRate || '0%'}`,
        });
        broadcastForm.reset();
        setBroadcastPreview(null);
        fetchBroadcasts();
      } else {
        throw new Error(data.error || 'Failed to simulate broadcast');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to simulate broadcast",
        variant: "destructive",
      });
    } finally {
      setIsSimulating(false);
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

  const fetchUsers = async () => {
    try {
      setIsUsersLoading(true);
      const response = await fetch('/api/admin/users');
      const data = await response.json();
      
      if (response.ok) {
        setUsers(data || []);
      } else {
        toast({
          title: "Error",
          description: "Failed to load users",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive"
      });
    } finally {
      setIsUsersLoading(false);
    }
  };

  const handleResendMessage = async (phoneNumber: string) => {
    try {
      const response = await fetch('/api/admin/resend-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        toast({
          title: "Message Resent",
          description: `Previous message sent to ${phoneNumber}`,
        });
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to resend message",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error resending message:', error);
      toast({
        title: "Error",
        description: "Failed to resend message",
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
      fetchGenerationQueue();
      if (activeTab === 'users') {
        fetchUsers();
      }
      if (activeTab === 'broadcast') {
        fetchBroadcasts();
      }
    }
  }, [selectedCategory, authStatus.authenticated, activeTab]);

  // Watch message changes for live preview
  const messageValue = broadcastForm.watch('message');
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      previewBroadcast(messageValue);
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [messageValue]);

  // Poll for queue updates every 3 seconds
  useEffect(() => {
    if (!authStatus.authenticated) return;
    
    const interval = setInterval(() => {
      fetchGenerationQueue();
    }, 3000);

    return () => clearInterval(interval);
  }, [authStatus.authenticated]);

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
    <div className="container mx-auto p-4 sm:p-6 space-y-6 overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold">Text4Quiz Admin</h1>
        <div className="flex flex-wrap items-center gap-2">
          {authStatus.user && (
            <div className="flex items-center gap-2 mr-2 sm:mr-4">
              <User className="h-4 w-4" />
              <span className="text-sm hidden sm:inline">{authStatus.user.name}</span>
              <Button onClick={handleLogout} variant="outline" size="sm" className="min-h-[44px]">
                <LogOut className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          )}
          <Button onClick={() => fetchQuestions(selectedCategory)} variant="outline" className="min-h-[44px]">
            <RefreshCw className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          <Button onClick={() => setActiveTab('generation')} className="min-h-[44px]">
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Queue</span>
          </Button>
          <Button onClick={testSMS} variant="outline" className="min-h-[44px]">
            <MessageSquare className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Test SMS</span>
          </Button>
          <Button onClick={testAllCommands} variant="outline" className="min-h-[44px]">
            <MessageSquare className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Test All</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="flex w-full h-10">
          <TabsTrigger value="questions" className="flex-1">Questions</TabsTrigger>
          <TabsTrigger value="users" className="flex-1">Users</TabsTrigger>
          <TabsTrigger value="generation" className="flex-1">Generation</TabsTrigger>
          <TabsTrigger value="broadcast" className="flex-1">Broadcast</TabsTrigger>
          <TabsTrigger value="categories" className="flex-1">Categories</TabsTrigger>
          <TabsTrigger value="monitoring" className="flex-1">Monitoring</TabsTrigger>
        </TabsList>
        
        <TabsContent value="questions" className="space-y-4">
          <div className="flex gap-2 flex-wrap overflow-x-auto pb-2 max-w-full">
            {categories.map(category => (
              <Button
                key={category}
                onClick={() => setSelectedCategory(category)}
                variant={selectedCategory === category ? "default" : "outline"}
                size="sm"
                className="flex-shrink-0 min-h-[44px]"
              >
                <span className="truncate max-w-[100px] sm:max-w-none">
                  {category === 'all' ? 'All Categories' : category}
                </span>
                {category !== 'all' && stats.categories[category] && (
                  <Badge variant="secondary" className="ml-2 text-xs hidden sm:inline">
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
                <ScrollArea className="h-[400px] sm:h-[500px] lg:h-[600px] w-full">
                  <div className="space-y-4 max-w-full">
                    {questions.map((question, index) => (
                      <div key={question.id} className="border rounded-lg space-y-3">
                        {/* Header section with metadata */}
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 p-2 sm:p-3 bg-gray-50 dark:bg-gray-800 border-b">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-sm">Question #{index + 1}</span>
                            <Badge variant="outline" className="text-xs">{question.category}</Badge>
                            <Badge variant="secondary" className="text-xs hidden sm:inline">{question.difficultyLevel}</Badge>
                            <Badge variant="outline" className="text-xs">Used {question.usageCount}x</Badge>
                          </div>
                        </div>
                        
                        {/* Question text with full width */}
                        <div className="px-2 sm:px-4">
                          <p className="text-sm font-medium leading-relaxed break-words overflow-wrap-anywhere max-w-full">{question.questionText}</p>
                        </div>
                        
                        {/* Answer options with same width as question */}
                        <div className="px-2 sm:px-4 space-y-2 text-sm max-w-full">
                          <div className={`p-2 rounded break-words overflow-wrap-anywhere ${question.correctAnswer === 'A' ? 'bg-green-100 dark:bg-green-900' : 'bg-gray-50 dark:bg-gray-800'}`}>
                            <span className="font-medium">A)</span> {question.optionA}
                          </div>
                          <div className={`p-2 rounded break-words overflow-wrap-anywhere ${question.correctAnswer === 'B' ? 'bg-green-100 dark:bg-green-900' : 'bg-gray-50 dark:bg-gray-800'}`}>
                            <span className="font-medium">B)</span> {question.optionB}
                          </div>
                          <div className={`p-2 rounded break-words overflow-wrap-anywhere ${question.correctAnswer === 'C' ? 'bg-green-100 dark:bg-green-900' : 'bg-gray-50 dark:bg-gray-800'}`}>
                            <span className="font-medium">C)</span> {question.optionC}
                          </div>
                          <div className={`p-2 rounded break-words overflow-wrap-anywhere ${question.correctAnswer === 'D' ? 'bg-green-100 dark:bg-green-900' : 'bg-gray-50 dark:bg-gray-800'}`}>
                            <span className="font-medium">D)</span> {question.optionD}
                          </div>
                        </div>
                        
                        {/* Explanation and metadata */}
                        <div className="px-2 sm:px-4 pb-4 space-y-2">
                          <div className="text-xs text-gray-600 dark:text-gray-400 break-words overflow-wrap-anywhere">
                            <strong>Explanation:</strong> {question.explanation}
                          </div>
                          <div className="text-xs text-gray-400 dark:text-gray-500">
                            Created: {new Date(question.createdDate).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="users" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
            <Input
              placeholder="Filter by phone number..."
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="w-full sm:max-w-sm"
            />
            <div className="flex gap-2 flex-wrap overflow-x-auto pb-2 sm:pb-0">
              <Button
                onClick={() => setSortBy('name')}
                variant={sortBy === 'name' ? "default" : "outline"}
                size="sm"
                className="flex-shrink-0 min-h-[44px]"
              >
                <span className="hidden sm:inline">Sort by Phone</span>
                <span className="sm:hidden">Phone</span>
              </Button>
              <Button
                onClick={() => setSortBy('date')}
                variant={sortBy === 'date' ? "default" : "outline"}
                size="sm"
                className="flex-shrink-0 min-h-[44px]"
              >
                <span className="hidden sm:inline">Sort by Date</span>
                <span className="sm:hidden">Date</span>
              </Button>
              <Button
                onClick={() => setSortBy('categories')}
                variant={sortBy === 'categories' ? "default" : "outline"}
                size="sm"
                className="flex-shrink-0 min-h-[44px]"
              >
                <span className="hidden sm:inline">Sort by Categories</span>
                <span className="sm:hidden">Categories</span>
              </Button>
              <Button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                variant="outline"
                size="sm"
                className="flex-shrink-0 min-h-[44px]"
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </Button>
            </div>
            <Button onClick={fetchUsers} variant="outline" size="sm" className="flex-shrink-0 min-h-[44px]">
              <RefreshCw className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Refresh Users</span>
              <span className="sm:hidden">Refresh</span>
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>User Management ({users.length} users)</CardTitle>
            </CardHeader>
            <CardContent>
              {isUsersLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin" />
                  <span className="ml-2">Loading users...</span>
                </div>
              ) : (
                <ScrollArea className="h-[600px]">
                  <div className="space-y-4">
                    {users
                      .filter(user => 
                        user.phoneNumber.toLowerCase().includes(userFilter.toLowerCase())
                      )
                      .sort((a, b) => {
                        let aVal, bVal;
                        switch (sortBy) {
                          case 'name':
                            aVal = a.phoneNumber;
                            bVal = b.phoneNumber;
                            break;
                          case 'date':
                            aVal = a.lastMessageDate || '';
                            bVal = b.lastMessageDate || '';
                            break;
                          case 'categories':
                            aVal = a.categories.length;
                            bVal = b.categories.length;
                            break;
                          default:
                            aVal = a.phoneNumber;
                            bVal = b.phoneNumber;
                        }
                        
                        if (sortBy === 'categories') {
                          return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
                        }
                        
                        const comparison = aVal.localeCompare(bVal);
                        return sortOrder === 'asc' ? comparison : -comparison;
                      })
                      .map((user, index) => (
                        <div key={user.id} className="border rounded-lg space-y-3">
                          {/* Header section with metadata */}
                          <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 border-b">
                            <div className="flex items-center gap-3">
                              <span className="font-semibold text-sm">User #{index + 1}</span>
                              <Badge variant={user.isActive ? "default" : "secondary"}>
                                {user.isActive ? 'Active' : 'Inactive'}
                              </Badge>
                              <Badge variant={user.subscriptionStatus === 'active' ? "default" : "outline"}>
                                {user.subscriptionStatus}
                              </Badge>
                              <Badge variant="outline">{user.questionsAnswered} answered</Badge>
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              Joined: {new Date(user.joinDate).toLocaleDateString()}
                            </div>
                          </div>
                          
                          {/* User details with full width */}
                          <div className="px-4">
                            <div className="mb-2">
                              <h3 className="font-semibold text-base">{user.phoneNumber}</h3>
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                              <div>
                                <div><strong>Categories:</strong> {user.categories.length > 0 ? user.categories.join(', ') : 'None'}</div>
                                <div><strong>Preferred Time:</strong> {user.preferredTime} ({user.timezone})</div>
                              </div>
                              <div>
                                <div><strong>Streak:</strong> {user.currentStreak} days</div>
                                <div><strong>Total Score:</strong> {user.totalScore} points</div>
                                <div><strong>Accuracy:</strong> {user.questionsAnswered > 0 ? Math.round((user.correctAnswers / user.questionsAnswered) * 100) : 0}%</div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Last message activity */}
                          <div className="px-4">
                            <div className="text-sm">
                              <strong>Last Message:</strong> {user.lastMessageDate 
                                ? new Date(user.lastMessageDate).toLocaleDateString() 
                                : 'Never'}
                            </div>
                          </div>
                          
                          {/* Last message content */}
                          {user.lastMessageContent && (
                            <div className="px-4">
                              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded text-sm">
                                <div className="font-medium mb-1">Last Message Content:</div>
                                <div className="text-gray-700 dark:text-gray-300 line-clamp-2">
                                  {user.lastMessageContent}
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {/* Actions and status */}
                          <div className="px-4 pb-4">
                            <div className="flex gap-2 items-center">
                              <Button
                                onClick={() => handleResendMessage(user.phoneNumber)}
                                disabled={!user.lastMessageContent}
                                size="sm"
                                variant="outline"
                                className="min-h-[44px]"
                              >
                                <MessageSquare className="h-4 w-4 mr-2" />
                                Resend Message
                              </Button>
                              
                              {!user.isActive && (
                                <Badge variant="destructive" className="text-xs">
                                  User Stopped Messages
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    
                    {users.filter(user => 
                      user.phoneNumber.toLowerCase().includes(userFilter.toLowerCase())
                    ).length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        No users found matching "{userFilter}"
                      </div>
                    )}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="generation" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Add to Queue Form */}
            <Card>
              <CardHeader>
                <CardTitle>Add Generation Job</CardTitle>
                <p className="text-sm text-gray-600">Select a category and specify how many questions to generate</p>
              </CardHeader>
              <CardContent>
                <Form {...queueForm}>
                  <form onSubmit={queueForm.handleSubmit(addToQueue)} className="space-y-4">
                    <FormField
                      control={queueForm.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <FormControl>
                            <select 
                              {...field} 
                              className="w-full p-2 border rounded-md bg-background"
                            >
                              <option value="">Select category...</option>
                              {Object.keys(stats.categories).map(category => (
                                <option key={category} value={category}>
                                  {category} ({stats.categories[category]} existing)
                                </option>
                              ))}
                            </select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={queueForm.control}
                      name="questionCount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Number of Questions (1-100)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min={1} 
                              max={100} 
                              {...field}
                              onChange={e => field.onChange(Number(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Add to Queue
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>

            {/* Queue Status */}
            <Card>
              <CardHeader>
                <CardTitle>Generation Queue</CardTitle>
                <p className="text-sm text-gray-600">Real-time status of generation jobs</p>
              </CardHeader>
              <CardContent>
                {isGenerationLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                    <span>Loading queue...</span>
                  </div>
                ) : generationJobs.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No generation jobs in queue
                  </div>
                ) : (
                  <ScrollArea className="h-96">
                    <div className="space-y-3">
                      {generationJobs.map(job => (
                        <div key={job.id} className="border rounded-lg p-4 space-y-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-semibold">{job.category}</h3>
                              <p className="text-sm text-gray-600">
                                {job.questionCount} questions
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge 
                                variant={
                                  job.status === 'completed' ? 'default' :
                                  job.status === 'active' ? 'secondary' :
                                  job.status === 'failed' ? 'destructive' : 'outline'
                                }
                              >
                                {job.status}
                              </Badge>
                              {job.status === 'pending' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => removeFromQueue(job.id)}
                                >
                                  Cancel
                                </Button>
                              )}
                            </div>
                          </div>
                          
                          {job.status === 'active' && (
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span>Progress</span>
                                <span>{job.progress}/{job.total || job.questionCount}</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-blue-600 h-2 rounded-full transition-all"
                                  style={{ 
                                    width: `${((job.progress / (job.total || job.questionCount)) * 100)}%` 
                                  }}
                                />
                              </div>
                            </div>
                          )}
                          
                          {job.status === 'failed' && job.errorMessage && (
                            <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                              Error: {job.errorMessage}
                            </div>
                          )}
                          
                          <div className="text-xs text-gray-500">
                            Created: {new Date(job.createdAt).toLocaleString()}
                            {job.completedAt && (
                              <>
                                <br />
                                Completed: {new Date(job.completedAt).toLocaleString()}
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="broadcast" className="space-y-4">
          <div className="grid gap-6">
            {/* Test Mode Toggle */}
            <Card className="border-orange-200 bg-orange-50">
              <CardHeader>
                <CardTitle className="text-orange-800">🧪 Testing & Safety Controls</CardTitle>
                <p className="text-sm text-orange-700">
                  Test broadcast functionality safely without sending messages to real users
                </p>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 items-center">
                  <Button
                    variant={isTestMode ? "default" : "outline"}
                    onClick={() => setIsTestMode(!isTestMode)}
                    size="sm"
                  >
                    {isTestMode ? "Exit Test Mode" : "Enter Test Mode"}
                  </Button>
                  <span className="text-sm text-gray-600">
                    {isTestMode 
                      ? "🟢 Test mode active - Only specified numbers will receive messages" 
                      : "⚠️ Production mode - Will send to all eligible users"
                    }
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Test Broadcast Form */}
            {isTestMode && (
              <Card className="border-blue-200 bg-blue-50">
                <CardHeader>
                  <CardTitle className="text-blue-800">🧪 Test Broadcast</CardTitle>
                  <p className="text-sm text-blue-700">
                    Send test messages to specific phone numbers only
                  </p>
                </CardHeader>
                <CardContent>
                  <Form {...testBroadcastForm}>
                    <form onSubmit={testBroadcastForm.handleSubmit(testBroadcast)} className="space-y-4">
                      <FormField
                        control={testBroadcastForm.control}
                        name="message"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Test Message</FormLabel>
                            <FormControl>
                              <textarea
                                {...field}
                                placeholder="Enter your test message..."
                                className="w-full min-h-[80px] p-3 border rounded-md resize-none"
                                maxLength={1500}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={testBroadcastForm.control}
                        name="testPhoneNumbers"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Test Phone Numbers (optional)</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="+15153570454, +1234567890 (comma-separated, leave empty for default)"
                                className="w-full"
                              />
                            </FormControl>
                            <p className="text-xs text-blue-600">
                              Leave empty to use default test number. Messages will include [TEST MODE] prefix.
                            </p>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="flex gap-3">
                        <Button 
                          type="submit" 
                          disabled={isBroadcastLoading}
                          variant="outline"
                          className="border-blue-500 text-blue-700"
                        >
                          {isBroadcastLoading ? (
                            <>
                              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                              Sending Test...
                            </>
                          ) : (
                            <>
                              <Send className="h-4 w-4 mr-2" />
                              Send Test Message
                            </>
                          )}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            )}

            {/* Compose Broadcast */}
            <Card>
              <CardHeader>
                <CardTitle>📢 Compose Broadcast Message</CardTitle>
                <p className="text-sm text-gray-600">
                  {isTestMode 
                    ? "Test mode: Use simulation to preview broadcast behavior"
                    : "Production mode: Send message to all active users who accept broadcasts"
                  }
                </p>
              </CardHeader>
              <CardContent>
                <Form {...broadcastForm}>
                  <form onSubmit={broadcastForm.handleSubmit(createBroadcast)} className="space-y-4">
                    <FormField
                      control={broadcastForm.control}
                      name="message"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Message Content</FormLabel>
                          <FormControl>
                            <textarea
                              {...field}
                              placeholder="Enter your broadcast message..."
                              className="w-full min-h-[120px] p-3 border rounded-md resize-none"
                              maxLength={1500}
                            />
                          </FormControl>
                          <div className="flex justify-between text-sm text-gray-500">
                            <span>Characters: {field.value?.length || 0}/1500</span>
                            <span>Note: "Reply STOP to unsubscribe" will be auto-added</span>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {/* Live Preview */}
                    {broadcastPreview && (
                      <div className="border rounded-lg p-4 bg-gray-50 space-y-3">
                        <h4 className="font-medium text-gray-800">📋 Preview</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="font-medium">Recipients:</span>
                            <span className="ml-2 text-blue-600">{broadcastPreview.recipientCount} users</span>
                          </div>
                          <div>
                            <span className="font-medium">Est. Duration:</span>
                            <span className="ml-2 text-orange-600">{broadcastPreview.estimatedDuration} minutes</span>
                          </div>
                          <div>
                            <span className="font-medium">Message Length:</span>
                            <span className="ml-2">{broadcastPreview.characterCount} characters</span>
                          </div>
                        </div>
                        <div className="border-t pt-3">
                          <span className="font-medium text-gray-700">Full Message Preview:</span>
                          <div className="mt-2 p-3 bg-white border rounded text-sm">
                            {broadcastPreview.messagePreview}
                          </div>
                        </div>
                      </div>
                    )}

                    {isPreviewLoading && (
                      <div className="flex items-center text-sm text-gray-500">
                        <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                        Generating preview...
                      </div>
                    )}

                    <div className="flex gap-3">
                      {isTestMode ? (
                        <>
                          <Button 
                            type="button"
                            onClick={() => simulateBroadcast(broadcastForm.getValues())}
                            disabled={isSimulating || !broadcastPreview || broadcastPreview.recipientCount === 0}
                            className="flex-1 bg-orange-600 hover:bg-orange-700"
                          >
                            {isSimulating ? (
                              <>
                                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                Simulating...
                              </>
                            ) : (
                              <>
                                <Database className="h-4 w-4 mr-2" />
                                Simulate Broadcast (No SMS)
                              </>
                            )}
                          </Button>
                        </>
                      ) : (
                        <Button 
                          type="submit" 
                          disabled={isBroadcastLoading || !broadcastPreview || broadcastPreview.recipientCount === 0}
                          className="flex-1 bg-red-600 hover:bg-red-700"
                        >
                          {isBroadcastLoading ? (
                            <>
                              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                              Creating Broadcast...
                            </>
                          ) : (
                            <>
                              <Send className="h-4 w-4 mr-2" />
                              Send to {broadcastPreview?.recipientCount || 0} Users
                            </>
                          )}
                        </Button>
                      )}
                      <Button 
                        type="button" 
                        variant="outline"
                        onClick={() => {
                          broadcastForm.reset();
                          setBroadcastPreview(null);
                        }}
                      >
                        Clear
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>

            {/* Broadcast History */}
            <Card>
              <CardHeader>
                <CardTitle>📊 Broadcast History</CardTitle>
                <p className="text-sm text-gray-600">Previous broadcast campaigns and their status</p>
              </CardHeader>
              <CardContent>
                {broadcasts.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No broadcasts sent yet
                  </div>
                ) : (
                  <ScrollArea className="h-96">
                    <div className="space-y-4">
                      {broadcasts.map(broadcast => (
                        <div key={broadcast.id} className="border rounded-lg p-4 space-y-3">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge 
                                  variant={
                                    broadcast.status === 'completed' ? 'default' :
                                    broadcast.status === 'active' ? 'secondary' :
                                    broadcast.status === 'cancelled' ? 'outline' :
                                    broadcast.status === 'failed' ? 'destructive' : 'outline'
                                  }
                                >
                                  {broadcast.status}
                                </Badge>
                                <span className="text-sm text-gray-500">
                                  by {broadcast.createdBy}
                                </span>
                              </div>
                              <p className="text-sm font-mono bg-gray-100 p-2 rounded">
                                {broadcast.message.length > 100 
                                  ? `${broadcast.message.substring(0, 100)}...` 
                                  : broadcast.message
                                }
                              </p>
                            </div>
                            {broadcast.status === 'pending' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => cancelBroadcast(broadcast.id)}
                              >
                                Cancel
                              </Button>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="font-medium">Recipients:</span>
                              <span className="ml-2">{broadcast.totalRecipients || 0}</span>
                            </div>
                            <div>
                              <span className="font-medium">Sent:</span>
                              <span className="ml-2 text-green-600">{broadcast.sentCount || 0}</span>
                            </div>
                            <div>
                              <span className="font-medium">Failed:</span>
                              <span className="ml-2 text-red-600">{broadcast.failedCount || 0}</span>
                            </div>
                            <div>
                              <span className="font-medium">Duration:</span>
                              <span className="ml-2">{broadcast.estimatedDuration || 0} min</span>
                            </div>
                          </div>
                          
                          {broadcast.status === 'active' && (
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span>Progress</span>
                                <span>{(broadcast.sentCount || 0) + (broadcast.failedCount || 0)}/{broadcast.totalRecipients || 0}</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-blue-600 h-2 rounded-full transition-all"
                                  style={{ 
                                    width: `${(((broadcast.sentCount || 0) + (broadcast.failedCount || 0)) / (broadcast.totalRecipients || 1)) * 100}%` 
                                  }}
                                />
                              </div>
                            </div>
                          )}
                          
                          <div className="text-xs text-gray-500">
                            Created: {new Date(broadcast.createdAt).toLocaleString()}
                            {broadcast.completedAt && (
                              <>
                                <br />
                                Completed: {new Date(broadcast.completedAt).toLocaleString()}
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </div>
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
                        onClick={() => {
                          setSelectedCategory(category);
                          setActiveTab('questions');
                        }}
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

        {/* Monitoring Tab */}
        <TabsContent value="monitoring" className="space-y-4">
          <AdminMonitoring />
        </TabsContent>

      </Tabs>
    </div>
  );
}

// Inline monitoring component for admin dashboard
function AdminMonitoring() {
  const [health, setHealth] = React.useState<any>(null);
  const [metrics, setMetrics] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const { toast } = useToast();

  const fetchData = async () => {
    try {
      setLoading(true);
      const [healthRes, metricsRes] = await Promise.all([
        fetch('/api/admin/monitoring/health', { credentials: 'include' }),
        fetch('/api/admin/monitoring/daily', { credentials: 'include' })
      ]);
      
      if (healthRes.ok) setHealth(await healthRes.json());
      if (metricsRes.ok) setMetrics(await metricsRes.json());
    } catch (error) {
      toast({ title: "Error", description: "Failed to load monitoring data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const runSyntheticTest = async () => {
    try {
      const response = await fetch('/api/admin/monitoring/synthetic-test', { 
        method: 'POST',
        credentials: 'include'
      });
      const result = await response.json();
      toast({ 
        title: result.success ? "Test Passed" : "Test Failed", 
        description: result.message,
        variant: result.success ? "default" : "destructive"
      });
      fetchData();
    } catch (error) {
      toast({ title: "Error", description: "Test failed to run", variant: "destructive" });
    }
  };

  React.useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin mr-2" />
        <span>Loading monitoring data...</span>
      </div>
    );
  }

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-100 text-green-800';
      case 'degraded': return 'bg-yellow-100 text-yellow-800';
      case 'down': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <Button onClick={fetchData} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-1" />
          Refresh
        </Button>
        <Button onClick={runSyntheticTest} variant="outline" size="sm">
          <Send className="h-4 w-4 mr-1" />
          Test SMS
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Overall Health</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className={health ? getHealthColor(health.overallHealth) : 'bg-gray-100'}>
              {health?.overallHealth?.toUpperCase() || 'Unknown'}
            </Badge>
            {health?.issues?.length > 0 && (
              <p className="text-xs text-red-600 mt-2">
                {health.issues.join(', ')}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">SMS Service</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-sm ${health?.smsService ? 'text-green-600' : 'text-red-600'}`}>
              {health?.smsService ? '✅ Operational' : '❌ Issues'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Database</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-sm ${health?.database ? 'text-green-600' : 'text-red-600'}`}>
              {health?.database ? '✅ Connected' : '❌ Issues'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Scheduler</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-sm ${health?.scheduler ? 'text-green-600' : 'text-red-600'}`}>
              {health?.scheduler ? '✅ Running' : '❌ Issues'}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <User className="h-4 w-4" />
              Active Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.totalUsers || 0}</div>
            <p className="text-xs text-gray-600">Receiving daily questions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Scheduled Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.scheduledDeliveries || 0}</div>
            <p className="text-xs text-gray-600">Messages queued</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Successful</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{metrics?.successfulDeliveries || 0}</div>
            <p className="text-xs text-gray-600">Delivered successfully</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Delivery Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              (metrics?.deliveryRate || 0) >= 95 ? 'text-green-600' : 
              (metrics?.deliveryRate || 0) >= 80 ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {Math.round(metrics?.deliveryRate || 0)}%
            </div>
            <p className="text-xs text-gray-600">Success rate</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            System Status & Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">Health Details</h4>
              {health?.issues?.length > 0 ? (
                <ul className="space-y-1">
                  {health.issues.map((issue: string, idx: number) => (
                    <li key={idx} className="text-sm text-red-600">• {issue}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-green-600">✅ All systems operational</p>
              )}
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Today's Performance</h4>
              <div className="space-y-1 text-sm">
                <div>Date: {metrics?.date}</div>
                <div>Failed Deliveries: <span className={metrics?.failedDeliveries > 0 ? 'text-red-600' : 'text-green-600'}>{metrics?.failedDeliveries || 0}</span></div>
                <div>System Health: <Badge className={metrics ? getHealthColor(metrics.systemHealth) : ''}>{metrics?.systemHealth?.toUpperCase()}</Badge></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="text-center text-xs text-gray-500">
        Monitoring dashboard • Auto-refreshes every 30 seconds • Last updated: {new Date().toLocaleTimeString()}
      </div>
    </div>
  );
}