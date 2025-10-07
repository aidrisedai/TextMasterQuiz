import * as React from "react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { MessageCircle, ArrowLeft, Shield, Phone, Database, Users, Clock, Globe } from "lucide-react";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-background border-b border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <MessageCircle className="text-primary-foreground text-sm" />
              </div>
              <h1 className="text-xl font-bold text-foreground">Text4Quiz</h1>
            </div>
            <Button
              variant="ghost"
              onClick={() => window.history.back()}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Title Section */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <Shield className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-4">Privacy Policy</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Your privacy is important to us. This policy explains how Text4Quiz collects,
            uses, and protects your personal information when you use our SMS trivia service.
          </p>
          <p className="text-sm text-muted-foreground mt-4">
            <strong>Last updated:</strong> January 2025
          </p>
        </div>

        {/* Quick Overview */}
        <Card className="mb-8 bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Globe className="h-5 w-5 text-primary" />
              <span>Privacy Quick Overview</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-2">What We Collect</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Phone number (for SMS delivery)</li>
                  <li>• Quiz preferences and responses</li>
                  <li>• Usage statistics and performance data</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">How We Use It</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Send daily trivia questions via SMS</li>
                  <li>• Track your progress and streaks</li>
                  <li>• Improve our service quality</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Privacy Sections */}
        <div className="space-y-8">
          {/* Information Collection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Database className="h-5 w-5 text-blue-600" />
                <span>1. Information We Collect</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Personal Information</h4>
                <p className="text-muted-foreground mb-2">
                  When you sign up for Text4Quiz, we collect:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                  <li><strong>Phone Number:</strong> Required to send SMS messages with trivia questions</li>
                  <li><strong>Category Preferences:</strong> Your chosen trivia categories (Science, History, etc.)</li>
                  <li><strong>Preferred Time:</strong> When you'd like to receive daily questions</li>
                  <li><strong>Timezone:</strong> To deliver questions at your local preferred time</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Usage Information</h4>
                <p className="text-muted-foreground mb-2">
                  As you use our service, we automatically collect:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                  <li><strong>Quiz Responses:</strong> Your answers (A, B, C, or D) and accuracy</li>
                  <li><strong>Performance Data:</strong> Streaks, scores, and question timing</li>
                  <li><strong>SMS Commands:</strong> Commands like SCORE, HELP, STOP, MORE</li>
                  <li><strong>Service Interactions:</strong> When you receive and respond to messages</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Technical Information</h4>
                <p className="text-muted-foreground mb-2">
                  We may collect basic technical information for service improvement:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                  <li><strong>Carrier Information:</strong> Your mobile carrier (automatically provided by SMS)</li>
                  <li><strong>Message Delivery Status:</strong> Whether messages are successfully delivered</li>
                  <li><strong>Response Times:</strong> How quickly you respond to questions (for analytics)</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* How We Use Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MessageCircle className="h-5 w-5 text-green-600" />
                <span>2. How We Use Your Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Primary Service Functions</h4>
                <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                  <li>Send daily trivia questions via SMS to your phone number</li>
                  <li>Process your quiz responses and provide instant feedback</li>
                  <li>Calculate and maintain your scores, streaks, and statistics</li>
                  <li>Customize question categories based on your preferences</li>
                  <li>Schedule message delivery at your preferred time and timezone</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Service Improvement</h4>
                <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                  <li>Analyze usage patterns to improve question quality and variety</li>
                  <li>Monitor service performance and message delivery success rates</li>
                  <li>Identify and fix technical issues or bugs</li>
                  <li>Develop new features based on user engagement data</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Communication</h4>
                <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                  <li>Send service-related SMS messages (questions, feedback, commands)</li>
                  <li>Provide customer support when you contact us</li>
                  <li>Send important service announcements or updates (rare)</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Third-Party Services */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-purple-600" />
                <span>3. Third-Party Services</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">SMS Service Provider</h4>
                <p className="text-muted-foreground mb-2">
                  We use <strong>Twilio</strong> to send and receive SMS messages. Twilio processes your phone number and message content solely to deliver our service. Twilio's privacy policy: <a href="https://www.twilio.com/legal/privacy" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">https://www.twilio.com/legal/privacy</a>
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Database Hosting</h4>
                <p className="text-muted-foreground mb-2">
                  We use <strong>Render.com</strong> for secure database hosting. Your data is stored in encrypted databases with industry-standard security measures.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">AI Question Generation</h4>
                <p className="text-muted-foreground mb-2">
                  We may use <strong>Google Gemini AI</strong> to generate trivia questions. No personal information is shared with AI services - only general category preferences for question generation.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Analytics</h4>
                <p className="text-muted-foreground mb-2">
                  We use basic analytics to understand service usage patterns. All analytics data is aggregated and does not include personally identifiable information.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Data Protection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5 text-red-600" />
                <span>4. Data Protection & Security</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Security Measures</h4>
                <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                  <li>All data transmission is encrypted using industry-standard SSL/TLS</li>
                  <li>Database access is restricted and requires authentication</li>
                  <li>Regular security updates and monitoring</li>
                  <li>Limited employee access to personal data on a need-to-know basis</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Data Retention</h4>
                <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                  <li><strong>Active Users:</strong> We retain your data while you're subscribed to the service</li>
                  <li><strong>Inactive Users:</strong> Data is deleted after 12 months of inactivity</li>
                  <li><strong>Deleted Accounts:</strong> Data is permanently deleted within 30 days of account deletion</li>
                  <li><strong>Legal Requirements:</strong> We may retain certain data longer if required by law</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Data Minimization</h4>
                <p className="text-muted-foreground">
                  We only collect and store data that is necessary for providing the Text4Quiz service. We don't collect unnecessary personal information, browse your other messages, or access unrelated phone features.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Your Rights */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Phone className="h-5 w-5 text-orange-600" />
                <span>5. Your Privacy Rights</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Control Your Data</h4>
                <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                  <li><strong>Access:</strong> Text "SCORE" to see your current statistics</li>
                  <li><strong>Stop Service:</strong> Text "STOP" to immediately unsubscribe and stop data collection</li>
                  <li><strong>Resume Service:</strong> Text "RESTART" to re-activate your account</li>
                  <li><strong>Data Deletion:</strong> Contact us to request complete data deletion</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">California Privacy Rights (CCPA)</h4>
                <p className="text-muted-foreground mb-2">
                  If you're a California resident, you have additional rights:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                  <li>Right to know what personal information is collected</li>
                  <li>Right to delete your personal information</li>
                  <li>Right to opt-out of sale of personal information (we don't sell data)</li>
                  <li>Right to non-discrimination for exercising privacy rights</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">European Privacy Rights (GDPR)</h4>
                <p className="text-muted-foreground mb-2">
                  If you're in the European Economic Area, you have rights under GDPR:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                  <li>Right to access and receive a copy of your personal data</li>
                  <li>Right to rectify inaccurate personal data</li>
                  <li>Right to erasure ("right to be forgotten")</li>
                  <li>Right to restrict processing of your personal data</li>
                  <li>Right to data portability</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Contact and Changes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-teal-600" />
                <span>6. Policy Changes & Contact</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Policy Updates</h4>
                <p className="text-muted-foreground mb-2">
                  We may update this privacy policy occasionally. When we do:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                  <li>We'll update the "Last Updated" date at the top of this page</li>
                  <li>For significant changes, we'll send an SMS notification</li>
                  <li>Your continued use of the service constitutes acceptance of changes</li>
                  <li>You can always text "STOP" if you disagree with policy changes</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Contact Us</h4>
                <p className="text-muted-foreground mb-2">
                  For privacy questions, data requests, or concerns, contact us:
                </p>
                <div className="bg-muted p-4 rounded-lg">
                  <p className="font-medium mb-2">Text4Quiz Privacy Team</p>
                  <p className="text-sm text-muted-foreground mb-1">
                    📧 Email: <a href="mailto:privacy@text4quiz.com" className="text-primary hover:underline">privacy@text4quiz.com</a>
                  </p>
                  <p className="text-sm text-muted-foreground mb-1">
                    📱 SMS Support: <a href="tel:+18885962752" className="text-primary hover:underline">+1 (888) 596-2752</a>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    ⏰ Response time: We respond to privacy requests within 48 hours
                  </p>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Children's Privacy</h4>
                <p className="text-muted-foreground">
                  Text4Quiz is not intended for children under 13. We do not knowingly collect personal information from children under 13. If you believe we have collected information from a child under 13, please contact us immediately.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer CTA */}
        <div className="text-center mt-12 p-8 bg-muted/30 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Questions About Privacy?</h3>
          <p className="text-muted-foreground mb-4">
            We're here to help. Contact us anytime about your privacy and data protection.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button variant="outline" asChild>
              <a href="mailto:privacy@text4quiz.com">Email Privacy Team</a>
            </Button>
            <Button variant="outline" onClick={() => window.history.back()}>
              Back to Text4Quiz
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}