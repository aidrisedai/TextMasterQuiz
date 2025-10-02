import * as React from "react";
import { useState } from "react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { SignupForm } from "../components/signup-form";
import {
  MessageCircle,
  Users,
  Target,
  Trophy,
  Flame,
  Check,
  Phone,
  HelpCircle,
  StopCircle,
  MoreHorizontal,
  Share2,
  Menu,
  X,
} from "lucide-react";
import { useToast } from "../hooks/use-toast";

export default function Home() {
  const [showSignup, setShowSignup] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { toast } = useToast();

  // Close mobile menu on scroll
  React.useEffect(() => {
    const handleScroll = () => {
      if (mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [mobileMenuOpen]);

  const scrollToSignup = () => {
    const signupSection = document.getElementById("signup");
    if (signupSection) {
      signupSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleShare = async () => {
    try {
      const url = window.location.href;
      await navigator.clipboard.writeText(url);
      toast({
        title: "Link copied!",
        description: "Share this link with friends to get them started with Text4Quiz.",
      });
    } catch (error) {
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement("textarea");
      textArea.value = window.location.href;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      toast({
        title: "Link copied!",
        description: "Share this link with friends to get them started with Text4Quiz.",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background shadow-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <MessageCircle className="text-primary-foreground text-sm" />
              </div>
              <h1 className="text-xl font-bold text-foreground">Text4Quiz</h1>
            </div>
            <nav className="hidden md:flex space-x-6 items-center">
              <a
                href="#features"
                className="text-muted-foreground hover:text-primary transition-colors"
                onClick={(e) => {
                  e.preventDefault();
                  const element = document.getElementById("features");
                  if (element) {
                    const offset = 80; // Account for fixed header
                    const elementPosition = element.offsetTop - offset;
                    window.scrollTo({
                      top: elementPosition,
                      behavior: "smooth",
                    });
                  }
                }}
              >
                Features
              </a>
              <a
                href="#demo"
                className="text-muted-foreground hover:text-primary transition-colors"
                onClick={(e) => {
                  e.preventDefault();
                  const element = document.getElementById("demo");
                  if (element) {
                    const offset = 80;
                    const elementPosition = element.offsetTop - offset;
                    window.scrollTo({
                      top: elementPosition,
                      behavior: "smooth",
                    });
                  }
                }}
              >
                Demo
              </a>
              <a
                href="/leaderboard"
                className="text-muted-foreground hover:text-primary transition-colors flex items-center"
              >
                <Trophy className="mr-1 h-4 w-4" />
                Leaderboard
              </a>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleShare}
                className="text-muted-foreground hover:text-primary"
              >
                <Share2 className="mr-2 h-4 w-4" />
                Share
              </Button>
            </nav>
            
            {/* Mobile Hamburger Menu */}
            <div className="md:hidden">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="min-h-[44px] min-w-[44px] p-2"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </Button>
            </div>
          </div>
        </div>
        
        {/* Mobile Menu Overlay */}
        {mobileMenuOpen && (
          <>
            {/* Backdrop */}
            <div 
              className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
              onClick={() => setMobileMenuOpen(false)}
            />
            
            {/* Mobile Menu */}
            <div className="md:hidden fixed top-[73px] left-0 right-0 bg-background/95 backdrop-blur-sm border-b border-border shadow-lg z-50">
              <nav className="px-4 py-4 space-y-1">
                <a
                  href="#features"
                  className="flex items-center space-x-3 px-4 py-3 text-gray-900 dark:text-white font-semibold hover:text-primary hover:bg-muted rounded-lg transition-colors min-h-[44px]"
                  onClick={(e) => {
                    e.preventDefault();
                    setMobileMenuOpen(false);
                    const element = document.getElementById("features");
                    if (element) {
                      const offset = 80;
                      const elementPosition = element.offsetTop - offset;
                      window.scrollTo({
                        top: elementPosition,
                        behavior: "smooth",
                      });
                    }
                  }}
                >
                  <Target className="h-5 w-5" />
                  <span>Features</span>
                </a>
                
                <a
                  href="#demo"
                  className="flex items-center space-x-3 px-4 py-3 text-gray-900 dark:text-white font-semibold hover:text-primary hover:bg-muted rounded-lg transition-colors min-h-[44px]"
                  onClick={(e) => {
                    e.preventDefault();
                    setMobileMenuOpen(false);
                    const element = document.getElementById("demo");
                    if (element) {
                      const offset = 80;
                      const elementPosition = element.offsetTop - offset;
                      window.scrollTo({
                        top: elementPosition,
                        behavior: "smooth",
                      });
                    }
                  }}
                >
                  <MessageCircle className="h-5 w-5" />
                  <span>Demo</span>
                </a>
                
                <a
                  href="/leaderboard"
                  className="flex items-center space-x-3 px-4 py-3 text-gray-900 dark:text-white font-semibold hover:text-primary hover:bg-muted rounded-lg transition-colors min-h-[44px]"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Trophy className="h-5 w-5" />
                  <span>Leaderboard</span>
                </a>
                
                <button
                  onClick={() => {
                    handleShare();
                    setMobileMenuOpen(false);
                  }}
                  className="flex items-center space-x-3 px-4 py-3 text-gray-900 dark:text-white font-semibold hover:text-primary hover:bg-muted rounded-lg transition-colors w-full text-left min-h-[44px]"
                >
                  <Share2 className="h-5 w-5" />
                  <span>Share</span>
                </button>
              </nav>
            </div>
          </>
        )}
      </header>

      {/* Hero Section */}
      <section className="gradient-hero py-16 sm:py-24 pt-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-6">
              Daily Trivia
              <br />
              <span className="text-primary">Via SMS</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              One engaging trivia question,
              <br />
              delivered to your phone daily.
              <br />
              Just reply A, B, C, or D!
              <br />
              No app required.
            </p>
          </div>

          {/* Signup Form directly in hero */}
          <div className="max-w-2xl mx-auto">
            <SignupForm />

            {/* See How It Works button below the form */}
            <div className="text-center mt-8">
              <Button
                variant="outline"
                size="lg"
                onClick={() => {
                  const element = document.getElementById("demo");
                  if (element) {
                    const offset = 80;
                    const elementPosition = element.offsetTop - offset;
                    window.scrollTo({
                      top: elementPosition,
                      behavior: "smooth",
                    });
                  }
                }}
              >
                <Trophy className="mr-2 h-4 w-4" />
                See How It Works
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 bg-background" id="features">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              How Text4Quiz Works
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Simple, engaging, and educational - delivered right to your phone
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="text-primary text-xl" />
              </div>
              <h3 className="text-xl font-semibold mb-2">1. Sign Up</h3>
              <p className="text-muted-foreground">
                Enter your phone number and choose your favorite trivia
                categories
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 gradient-stats rounded-full flex items-center justify-center mx-auto mb-4">
                <HelpCircle className="text-secondary text-xl" />
              </div>
              <h3 className="text-xl font-semibold mb-2">2. Get Questions</h3>
              <p className="text-muted-foreground">
                Receive one trivia question daily at your preferred time
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 gradient-accent rounded-full flex items-center justify-center mx-auto mb-4">
                <Trophy className="text-accent text-xl" />
              </div>
              <h3 className="text-xl font-semibold mb-2">3. Build Streaks</h3>
              <p className="text-muted-foreground">
                Answer correctly to build streaks and earn points
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive SMS Demo Section */}
      <section className="py-16 bg-background" id="demo">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              See It In Action
            </h2>
            <p className="text-muted-foreground">
              Experience the full Text4Quiz conversation flow
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Phone Mockup */}
            <div className="max-w-sm mx-auto lg:mx-0">
              <div className="phone-mockup rounded-3xl p-3 shadow-2xl">
                {/* Phone Header */}
                <div className="bg-gray-900 rounded-t-2xl px-4 py-2 flex items-center justify-between">
                  <div className="text-white text-sm font-medium">Messages</div>
                  <div className="flex space-x-1">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  </div>
                </div>

                {/* Message Thread */}
                <div className="bg-gray-100 rounded-b-2xl p-4 h-96 flex flex-col overflow-hidden">
                  <div className="flex-grow space-y-3 overflow-y-auto">
                    {/* Contact Header */}
                    <div className="text-center border-b pb-2 mb-4">
                      <div className="text-sm font-semibold text-gray-800">
                        Text4Quiz
                      </div>
                      <div className="text-xs text-gray-500">
                        +1 (555) 123-QUIZ
                      </div>
                    </div>

                    {/* Daily Question */}
                    <div className="flex items-start space-x-2">
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                        T4Q
                      </div>
                      <div className="bg-white rounded-2xl rounded-tl-sm p-3 max-w-xs shadow-sm">
                        <div className="text-xs text-gray-600 mb-1">
                          Today 9:00 AM
                        </div>
                        <div className="text-sm text-gray-800">
                          🧠 <strong>Question #47:</strong> Which planet in our
                          solar system has the most moons?
                          <br />
                          <br />
                          <strong>A)</strong> Jupiter
                          <br />
                          <strong>B)</strong> Saturn
                          <br />
                          <strong>C)</strong> Uranus
                          <br />
                          <strong>D)</strong> Neptune
                          <br />
                          <br />
                          Reply with A, B, C, or D
                        </div>
                      </div>
                    </div>

                    {/* User Response */}
                    <div className="flex justify-end">
                      <div className="bg-blue-500 text-white rounded-2xl rounded-br-sm p-3 max-w-xs">
                        <div className="text-sm font-medium">B</div>
                        <div className="text-xs text-blue-100 mt-1">
                          9:02 AM
                        </div>
                      </div>
                    </div>

                    {/* Response Feedback */}
                    <div className="flex items-start space-x-2">
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                        T4Q
                      </div>
                      <div className="bg-white rounded-2xl rounded-tl-sm p-3 max-w-xs shadow-sm">
                        <div className="text-xs text-gray-600 mb-1">
                          9:02 AM
                        </div>
                        <div className="text-sm text-gray-800">
                          🎉 <strong>Correct!</strong> Saturn has 146 known
                          moons, making it the planet with the most moons in our
                          solar system.
                          <br />
                          <br />
                          <div className="bg-green-50 border border-green-200 rounded-lg p-2 mt-2">
                            <div className="flex items-center justify-between text-xs">
                              <span>
                                🔥 Streak: <strong>13 days</strong>
                              </span>
                              <span>
                                ⭐ Score: <strong>+10 points</strong>
                              </span>
                            </div>
                          </div>
                          <br />
                          Text "SCORE" for stats or "MORE" for bonus questions!
                        </div>
                      </div>
                    </div>

                    {/* Commands Demo */}
                    <div className="flex justify-end">
                      <div className="bg-blue-500 text-white rounded-2xl rounded-br-sm p-3 max-w-xs">
                        <div className="text-sm font-medium">SCORE</div>
                        <div className="text-xs text-blue-100 mt-1">
                          9:05 AM
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start space-x-2">
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                        T4Q
                      </div>
                      <div className="bg-white rounded-2xl rounded-tl-sm p-3 max-w-xs shadow-sm">
                        <div className="text-xs text-gray-600 mb-1">
                          9:05 AM
                        </div>
                        <div className="text-sm text-gray-800">
                          📊 <strong>Your Text4Quiz Stats</strong>
                          <br />
                          <br />
                          Current Streak: <strong>13 days</strong> 🔥
                          <br />
                          Total Score: <strong>1,247 points</strong>
                          <br />
                          Questions Answered: <strong>47</strong>
                          <br />
                          Accuracy Rate: <strong>87%</strong>
                          <br />
                          <br />
                          Keep up the great work! 🌟
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-3 mt-3">
                    <div className="bg-gray-200 rounded-full px-4 py-2 text-sm text-gray-600 text-center">
                      Type a message...
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Features List */}
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-foreground mb-4">
                  What makes it special?
                </h3>
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center mt-1">
                      <Check className="h-3 w-3 text-primary-foreground" />
                    </div>
                    <div>
                      <div className="font-medium text-foreground">
                        No app Required
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Works with any phone that can receive text messages
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-secondary rounded-full flex items-center justify-center mt-1">
                      <Flame className="h-3 w-3 text-white" />
                    </div>
                    <div>
                      <div className="font-medium text-foreground">
                        Streak Building
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Get addicted to learning with daily streaks and points
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-accent rounded-full flex items-center justify-center mt-1">
                      <Target className="h-3 w-3 text-white" />
                    </div>
                    <div>
                      <div className="font-medium text-foreground">
                        Instant Learning
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Get detailed explanations and learn something new every
                        day
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center mt-1">
                      <MessageCircle className="h-3 w-3 text-white" />
                    </div>
                    <div>
                      <div className="font-medium text-foreground">
                        Simple Commands
                      </div>
                      <div className="text-sm text-muted-foreground">
                        SCORE, MORE, HELP, STOP - control everything with text
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-muted/50 rounded-lg p-6">
                <h4 className="font-semibold text-foreground mb-2">
                  Ready to start?
                </h4>
                <p className="text-sm text-muted-foreground">
                  The signup form is right at the top of the page - just scroll
                  up to get started!
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Signup Form Section (now in hero) */}
      <section className="py-16 bg-muted/30" id="signup">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Ready to Play?
          </h2>
          <p className="text-muted-foreground mb-8">
            The signup form is at the top of the page - scroll up to get started
            with your daily trivia journey!
          </p>
          <Button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            size="lg"
            className="btn-primary"
          >
            <Phone className="mr-2 h-4 w-4" />
            Back to Top
          </Button>
        </div>
      </section>

      {/* Pricing Section 
      <section className="py-16 bg-background" id="pricing">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Simple Pricing
            </h2>
            <p className="text-muted-foreground">
              Always free, with optional premium features
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-2xl mx-auto">
            
            <Card>
              <CardContent className="p-8">
                <div className="text-center mb-6">
                  <h3 className="text-xl font-semibold mb-2">Free Forever</h3>
                  <div className="text-3xl font-bold">$0</div>
                  <p className="text-muted-foreground">always free</p>
                </div>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-center space-x-3">
                    <Check className="text-secondary h-4 w-4" />
                    <span>Daily trivia questions</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <Check className="text-secondary h-4 w-4" />
                    <span>Instant feedback</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <Check className="text-secondary h-4 w-4" />
                    <span>Basic scoring</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <Check className="text-secondary h-4 w-4" />
                    <span>Category selection</span>
                  </li>
                </ul>
                <Button variant="outline" className="w-full" disabled>
                  Already Included
                </Button>
              </CardContent>
            </Card>

            
            <Card className="border-2 border-primary relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium">
                  Most Popular
                </span>
              </div>
              <CardContent className="p-8">
                <div className="text-center mb-6">
                  <h3 className="text-xl font-semibold mb-2">Premium</h3>
                  <div className="text-3xl font-bold">$9.99</div>
                  <p className="text-muted-foreground">per month</p>
                </div>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-center space-x-3">
                    <Check className="text-secondary h-4 w-4" />
                    <span>Everything in Free</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <Check className="text-secondary h-4 w-4" />
                    <span>Bonus questions on demand</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <Check className="text-secondary h-4 w-4" />
                    <span>Detailed explanations</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <Check className="text-secondary h-4 w-4" />
                    <span>Custom categories</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <Check className="text-secondary h-4 w-4" />
                    <span>Weekly summaries</span>
                  </li>
                </ul>
                <Button className="w-full btn-primary">
                  Upgrade to Premium
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="text-center mt-8">
            <p className="text-sm text-muted-foreground">
              Cancel anytime by texting "STOP" • No contracts or commitments
            </p>
          </div>
        </div>
      </section>
      */}

      {/* SMS Commands Section */}
      <section className="py-16 bg-muted/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              SMS Commands
            </h2>
            <p className="text-muted-foreground">
              Control your experience with simple text commands
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">Basic Commands</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <code className="text-sm bg-muted px-2 py-1 rounded">
                      SCORE
                    </code>
                    <span className="text-sm text-muted-foreground">
                      View stats
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <code className="text-sm bg-muted px-2 py-1 rounded">
                      HELP
                    </code>
                    <span className="text-sm text-muted-foreground">
                      Get help
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <code className="text-sm bg-muted px-2 py-1 rounded">
                      STOP
                    </code>
                    <span className="text-sm text-muted-foreground">
                      Unsubscribe
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <code className="text-sm bg-muted px-2 py-1 rounded">
                      RESTART
                    </code>
                    <span className="text-sm text-muted-foreground">
                      Resume service
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">Premium Commands</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <code className="text-sm bg-muted px-2 py-1 rounded">
                      MORE
                    </code>
                    <span className="text-sm text-muted-foreground">
                      Bonus question
                    </span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-4">
                  More premium commands coming soon!
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-foreground text-background py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="col-span-2">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <MessageCircle className="text-primary-foreground text-sm" />
                </div>
                <h3 className="text-xl font-bold">Text4Quiz</h3>
              </div>
              <p className="text-background/70 mb-4 max-w-md">
                Daily trivia delivered to your phone. Learn something new every
                day with our engaging SMS quiz game.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-background/70">
                <li>
                  <a
                    href="#features"
                    className="hover:text-background transition-colors"
                  >
                    How it Works
                  </a>
                </li>
                <li>
                  <a
                    href="#demo"
                    className="hover:text-background transition-colors"
                  >
                    Demo
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-background/70">
                <li>
                  <a
                    href="#"
                    className="hover:text-background transition-colors"
                  >
                    email@text4quiz.com
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-background transition-colors"
                  >
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-background transition-colors"
                  >
                    Terms of Service
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-background/20 mt-8 pt-8 text-center text-background/70">
            <p>&copy; 2025 Text4Quiz. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
