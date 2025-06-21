import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SignupForm } from "@/components/signup-form";
import { MessageCircle, Users, Target, Trophy, Flame, Check, Phone, HelpCircle, StopCircle, MoreHorizontal } from "lucide-react";

export default function Home() {
  const [showSignup, setShowSignup] = useState(false);

  const scrollToSignup = () => {
    const signupSection = document.getElementById('signup');
    if (signupSection) {
      signupSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-background shadow-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <MessageCircle className="text-primary-foreground text-sm" />
              </div>
              <h1 className="text-xl font-bold text-foreground">Text4Quiz</h1>
            </div>
            <nav className="hidden md:flex space-x-6">
              <a href="#features" className="text-muted-foreground hover:text-primary transition-colors">Features</a>
              <a href="#pricing" className="text-muted-foreground hover:text-primary transition-colors">Pricing</a>
              <a href="#signup" className="text-muted-foreground hover:text-primary transition-colors">Sign Up</a>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="gradient-hero py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-6">
              Daily Trivia<br />
              <span className="text-primary">Via SMS</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              One engaging trivia question delivered to your phone every day. No app required - just text back A, B, C, or D!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg"
                className="btn-primary"
                onClick={scrollToSignup}
              >
                <Phone className="mr-2 h-4 w-4" />
                Start Playing Today
              </Button>
              <Button 
                variant="outline"
                size="lg"
                onClick={() => {
                  const demoSection = document.getElementById('demo');
                  if (demoSection) {
                    demoSection.scrollIntoView({ behavior: 'smooth' });
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
            <h2 className="text-3xl font-bold text-foreground mb-4">How Text4Quiz Works</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">Simple, engaging, and educational - delivered right to your phone</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="text-primary text-xl" />
              </div>
              <h3 className="text-xl font-semibold mb-2">1. Sign Up</h3>
              <p className="text-muted-foreground">Enter your phone number and choose your favorite trivia categories</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 gradient-stats rounded-full flex items-center justify-center mx-auto mb-4">
                <HelpCircle className="text-secondary text-xl" />
              </div>
              <h3 className="text-xl font-semibold mb-2">2. Get Questions</h3>
              <p className="text-muted-foreground">Receive one trivia question daily at your preferred time</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 gradient-accent rounded-full flex items-center justify-center mx-auto mb-4">
                <Trophy className="text-accent text-xl" />
              </div>
              <h3 className="text-xl font-semibold mb-2">3. Build Streaks</h3>
              <p className="text-muted-foreground">Answer correctly to build streaks and earn points</p>
            </div>
          </div>
        </div>
      </section>

      {/* SMS Preview Section */}
      <section className="py-16 bg-background" id="demo">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">See It In Action</h2>
            <p className="text-muted-foreground">Here's exactly what you'll receive on your phone</p>
          </div>
          
          <div className="max-w-sm mx-auto">
            <div className="phone-mockup rounded-3xl p-2 shadow-xl">
              <div className="bg-background rounded-2xl p-4 h-96 flex flex-col">
                <div className="flex-grow space-y-4">
                  {/* Daily Question */}
                  <div className="bg-muted rounded-2xl p-4 max-w-xs sms-bubble">
                    <div className="text-sm font-medium text-foreground mb-2">Text4Quiz Daily</div>
                    <div className="text-sm text-muted-foreground mb-3">
                      🧠 Question #47: Which planet in our solar system has the most moons?
                      <br /><br />
                      A) Jupiter<br />
                      B) Saturn<br />
                      C) Uranus<br />
                      D) Neptune
                      <br /><br />
                      Reply with A, B, C, or D
                    </div>
                    <div className="text-xs text-muted-foreground">9:00 AM</div>
                  </div>
                  
                  {/* User Response */}
                  <div className="flex justify-end">
                    <div className="bg-primary text-primary-foreground rounded-2xl p-4 max-w-xs sms-bubble">
                      <div className="text-sm">B</div>
                      <div className="text-xs text-primary-foreground/70 mt-1">9:02 AM</div>
                    </div>
                  </div>
                  
                  {/* Response Feedback */}
                  <div className="bg-muted rounded-2xl p-4 max-w-xs sms-bubble">
                    <div className="text-sm text-muted-foreground">
                      🎉 Correct! Saturn has 146 known moons, making it the planet with the most moons in our solar system.
                      <br /><br />
                      Streak: 13 days 🔥<br />
                      Score: +10 points
                    </div>
                    <div className="text-xs text-muted-foreground mt-2">9:02 AM</div>
                  </div>
                </div>
                
                <div className="border-t pt-4 mt-4">
                  <div className="bg-muted rounded-full px-4 py-2 text-sm text-muted-foreground">
                    Text "SCORE" for stats...
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Signup Form Section */}
      <section className="py-16 bg-muted/30" id="signup">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <SignupForm />
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-16 bg-background" id="pricing">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">Simple Pricing</h2>
            <p className="text-muted-foreground">Start free, upgrade when you're ready for more</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-2xl mx-auto">
            {/* Free Plan */}
            <Card>
              <CardContent className="p-8">
                <div className="text-center mb-6">
                  <h3 className="text-xl font-semibold mb-2">Free Trial</h3>
                  <div className="text-3xl font-bold">$0</div>
                  <p className="text-muted-foreground">for 7 days</p>
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
            
            {/* Premium Plan */}
            <Card className="border-2 border-primary relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium">Most Popular</span>
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

      {/* SMS Commands Section */}
      <section className="py-16 bg-muted/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">SMS Commands</h2>
            <p className="text-muted-foreground">Control your experience with simple text commands</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">Basic Commands</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <code className="text-sm bg-muted px-2 py-1 rounded">SCORE</code>
                    <span className="text-sm text-muted-foreground">View stats</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <code className="text-sm bg-muted px-2 py-1 rounded">HELP</code>
                    <span className="text-sm text-muted-foreground">Get help</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <code className="text-sm bg-muted px-2 py-1 rounded">STOP</code>
                    <span className="text-sm text-muted-foreground">Unsubscribe</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <code className="text-sm bg-muted px-2 py-1 rounded">RESTART</code>
                    <span className="text-sm text-muted-foreground">Resume service</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">Premium Commands</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <code className="text-sm bg-muted px-2 py-1 rounded">MORE</code>
                    <span className="text-sm text-muted-foreground">Bonus question</span>
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
                Daily trivia delivered to your phone. Learn something new every day with our engaging SMS quiz game.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-background/70">
                <li><a href="#features" className="hover:text-background transition-colors">How it Works</a></li>
                <li><a href="#pricing" className="hover:text-background transition-colors">Pricing</a></li>
                <li><a href="#signup" className="hover:text-background transition-colors">Sign Up</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-background/70">
                <li><a href="#" className="hover:text-background transition-colors">FAQ</a></li>
                <li><a href="#" className="hover:text-background transition-colors">Contact Us</a></li>
                <li><a href="#" className="hover:text-background transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-background transition-colors">Terms of Service</a></li>
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
