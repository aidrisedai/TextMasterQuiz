import * as React from "react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { MessageCircle, ArrowLeft, FileText, Phone, CreditCard, Users, AlertTriangle, Scale, BookOpen } from "lucide-react";

export default function Terms() {
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
              <FileText className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-4">Terms of Service</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Welcome to Text4Quiz! These terms govern your use of our SMS trivia service.
            Please read them carefully before using the service.
          </p>
          <p className="text-sm text-muted-foreground mt-4">
            <strong>Last updated:</strong> January 2025
          </p>
        </div>

        {/* Quick Summary */}
        <Card className="mb-8 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BookOpen className="h-5 w-5 text-blue-600" />
              <span>Terms Summary</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-2 text-blue-900 dark:text-blue-100">What You Get</h4>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                  <li>• Daily trivia questions via SMS</li>
                  <li>• Instant feedback and explanations</li>
                  <li>• Score tracking and streak building</li>
                  <li>• Simple text-based commands</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2 text-blue-900 dark:text-blue-100">Your Responsibilities</h4>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                  <li>• Use the service appropriately</li>
                  <li>• Pay applicable charges (if any)</li>
                  <li>• Respect other users</li>
                  <li>• Follow SMS etiquette</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Terms Sections */}
        <div className="space-y-8">
          {/* Service Agreement */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MessageCircle className="h-5 w-5 text-blue-600" />
                <span>1. Service Agreement</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Agreement to Terms</h4>
                <p className="text-muted-foreground mb-2">
                  By signing up for Text4Quiz or using our service, you agree to be bound by these Terms of Service. 
                  If you do not agree to these terms, please do not use our service.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Service Description</h4>
                <p className="text-muted-foreground mb-2">
                  Text4Quiz is an SMS-based trivia service that delivers:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                  <li>Daily trivia questions sent to your mobile phone</li>
                  <li>Multiple choice questions (A, B, C, or D format)</li>
                  <li>Instant feedback with explanations</li>
                  <li>Score tracking, streaks, and statistics</li>
                  <li>Category customization based on preferences</li>
                  <li>Simple SMS commands for service control</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Service Availability</h4>
                <p className="text-muted-foreground">
                  We strive to provide reliable service, but cannot guarantee 100% uptime. Service may be temporarily 
                  unavailable due to maintenance, technical issues, or circumstances beyond our control. We will make 
                  reasonable efforts to notify users of planned downtime.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* User Responsibilities */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-green-600" />
                <span>2. User Responsibilities</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Appropriate Use</h4>
                <p className="text-muted-foreground mb-2">
                  You agree to use Text4Quiz only for its intended purpose. You must not:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                  <li>Send inappropriate, offensive, or harmful messages</li>
                  <li>Attempt to disrupt or interfere with the service</li>
                  <li>Use automated systems to interact with the service</li>
                  <li>Share your account or phone number access with others</li>
                  <li>Reverse engineer or attempt to copy our questions</li>
                  <li>Use the service for commercial purposes without permission</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Account Responsibility</h4>
                <p className="text-muted-foreground mb-2">
                  You are responsible for:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                  <li>Maintaining the security of your phone number</li>
                  <li>All activity that occurs through your phone number</li>
                  <li>Notifying us if you believe your account has been compromised</li>
                  <li>Ensuring your phone number information is accurate and up-to-date</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Age Requirements</h4>
                <p className="text-muted-foreground">
                  You must be at least 13 years old to use Text4Quiz. If you are under 18, you must have permission 
                  from a parent or guardian. Users under 13 are not permitted to use the service.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* SMS Terms */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Phone className="h-5 w-5 text-purple-600" />
                <span>3. SMS Service Terms</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Message Frequency</h4>
                <p className="text-muted-foreground mb-2">
                  By subscribing to Text4Quiz, you consent to receive:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                  <li><strong>Daily Questions:</strong> One trivia question per day at your preferred time</li>
                  <li><strong>Response Messages:</strong> Feedback when you answer questions</li>
                  <li><strong>Command Responses:</strong> Replies to SCORE, HELP, and other commands</li>
                  <li><strong>Service Messages:</strong> Occasional service announcements (rare)</li>
                  <li><strong>Premium Features:</strong> Additional messages for premium subscribers</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Message and Data Rates</h4>
                <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                  <p className="text-yellow-800 dark:text-yellow-200 font-medium mb-2">
                    ⚠️ Important: Message and Data Rates May Apply
                  </p>
                  <ul className="list-disc list-inside text-yellow-700 dark:text-yellow-300 space-y-1 ml-4 text-sm">
                    <li>Your mobile carrier may charge for SMS messages</li>
                    <li>Text4Quiz service is free, but carrier charges are your responsibility</li>
                    <li>Contact your mobile carrier for information about your messaging plan</li>
                    <li>Charges vary by carrier and plan type</li>
                  </ul>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Opt-Out Instructions</h4>
                <p className="text-muted-foreground mb-2">
                  You can stop receiving messages at any time:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                  <li><strong>Text "STOP":</strong> Immediately unsubscribe from all messages</li>
                  <li><strong>Text "RESTART":</strong> Re-subscribe if you previously stopped</li>
                  <li><strong>Contact Support:</strong> Email or call us for assistance</li>
                </ul>
                <p className="text-muted-foreground text-sm mt-2">
                  After texting STOP, you will receive a confirmation message. You may still receive one final message confirming your opt-out.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Supported Carriers</h4>
                <p className="text-muted-foreground">
                  Text4Quiz works with major U.S. and Canadian carriers including Verizon, AT&T, T-Mobile, Sprint, and others. 
                  Service availability may vary by carrier and location.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Billing and Payments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CreditCard className="h-5 w-5 text-orange-600" />
                <span>4. Billing and Payments</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Free Service</h4>
                <p className="text-muted-foreground">
                  The basic Text4Quiz service is currently free to use. You will only pay your mobile carrier's 
                  standard messaging rates, if applicable.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Premium Features (Future)</h4>
                <p className="text-muted-foreground mb-2">
                  We may introduce premium features in the future. If we do:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                  <li>You will be clearly notified before any charges apply</li>
                  <li>Premium features will be entirely optional</li>
                  <li>You must explicitly opt-in to any paid services</li>
                  <li>Free service will always remain available</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Refunds</h4>
                <p className="text-muted-foreground">
                  Since the service is currently free, refunds do not apply. For any future paid features, 
                  refund policies will be clearly stated at the time of purchase.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Content and Intellectual Property */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BookOpen className="h-5 w-5 text-indigo-600" />
                <span>5. Content and Intellectual Property</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Our Content</h4>
                <p className="text-muted-foreground mb-2">
                  All trivia questions, explanations, and service content are owned by Text4Quiz or our licensors. This includes:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                  <li>Trivia questions and answer choices</li>
                  <li>Explanations and educational content</li>
                  <li>Scoring algorithms and game mechanics</li>
                  <li>Text4Quiz branding and design</li>
                </ul>
                <p className="text-muted-foreground mt-2">
                  You may not reproduce, distribute, or create derivative works from our content without permission.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Your Usage Rights</h4>
                <p className="text-muted-foreground">
                  You have the right to use our service for personal, non-commercial purposes. You may discuss 
                  questions and answers with friends and family, but you cannot republish or commercialize our content.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">User Feedback</h4>
                <p className="text-muted-foreground">
                  If you provide feedback, suggestions, or ideas about Text4Quiz, you grant us the right to use 
                  them to improve our service without compensation or attribution.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Privacy and Data */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Scale className="h-5 w-5 text-teal-600" />
                <span>6. Privacy and Data Protection</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Data Collection and Use</h4>
                <p className="text-muted-foreground">
                  Our collection and use of your personal information is governed by our Privacy Policy, which is 
                  incorporated into these Terms by reference. Please review our Privacy Policy to understand how 
                  we handle your information.
                </p>
                <Button variant="outline" size="sm" asChild className="mt-2">
                  <a href="/privacy">View Privacy Policy</a>
                </Button>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Data Security</h4>
                <p className="text-muted-foreground">
                  We implement reasonable security measures to protect your information, but no method of transmission 
                  or storage is 100% secure. You use the service at your own risk.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Limitations and Disclaimers */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <span>7. Limitations and Disclaimers</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Service "As Is"</h4>
                <p className="text-muted-foreground">
                  Text4Quiz is provided "as is" without warranties of any kind, express or implied. We do not guarantee 
                  that the service will be uninterrupted, error-free, or meet your specific requirements.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Educational Content Disclaimer</h4>
                <p className="text-muted-foreground">
                  Trivia questions and explanations are for entertainment and educational purposes. While we strive for accuracy, 
                  we cannot guarantee that all information is completely accurate or up-to-date. Do not rely on our content 
                  for critical decisions.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Limitation of Liability</h4>
                <p className="text-muted-foreground mb-2">
                  To the maximum extent permitted by law, Text4Quiz and its operators shall not be liable for:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                  <li>Indirect, incidental, or consequential damages</li>
                  <li>Loss of data, profits, or business opportunities</li>
                  <li>SMS charges from your mobile carrier</li>
                  <li>Service interruptions or technical issues</li>
                  <li>Reliance on trivia content for important decisions</li>
                </ul>
                <p className="text-muted-foreground mt-2">
                  Our total liability for any claims shall not exceed $50 or the amount you paid for premium features (if any), 
                  whichever is less.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Indemnification</h4>
                <p className="text-muted-foreground">
                  You agree to indemnify and hold harmless Text4Quiz from any claims, damages, or expenses arising from 
                  your use of the service or violation of these terms.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Service Changes and Termination */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <span>8. Service Changes and Termination</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Service Modifications</h4>
                <p className="text-muted-foreground">
                  We reserve the right to modify, suspend, or discontinue any aspect of Text4Quiz at any time. 
                  We will provide reasonable notice for significant changes that affect your use of the service.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Termination by You</h4>
                <p className="text-muted-foreground">
                  You can terminate your use of Text4Quiz at any time by texting "STOP" or contacting our support team. 
                  Termination is effective immediately.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Termination by Us</h4>
                <p className="text-muted-foreground mb-2">
                  We may terminate or suspend your access to Text4Quiz if you:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                  <li>Violate these Terms of Service</li>
                  <li>Use the service inappropriately or abusively</li>
                  <li>Engage in activities that harm other users or our service</li>
                  <li>Fail to pay applicable fees (for future paid features)</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Effect of Termination</h4>
                <p className="text-muted-foreground">
                  Upon termination, your right to use Text4Quiz ceases immediately. We may delete your account data, 
                  but some information may be retained as described in our Privacy Policy or as required by law.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Legal Terms */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Scale className="h-5 w-5 text-gray-600" />
                <span>9. Legal Terms</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Governing Law</h4>
                <p className="text-muted-foreground">
                  These Terms are governed by the laws of the United States and the state where Text4Quiz is 
                  headquartered, without regard to conflict of law principles.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Dispute Resolution</h4>
                <p className="text-muted-foreground">
                  Any disputes arising from these Terms or your use of Text4Quiz should first be addressed through 
                  informal negotiation. If informal resolution fails, disputes shall be resolved through binding 
                  arbitration in accordance with the rules of the American Arbitration Association.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Severability</h4>
                <p className="text-muted-foreground">
                  If any provision of these Terms is found to be invalid or unenforceable, the remaining provisions 
                  will continue to be valid and enforceable.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Entire Agreement</h4>
                <p className="text-muted-foreground">
                  These Terms, together with our Privacy Policy, constitute the entire agreement between you and 
                  Text4Quiz regarding your use of the service.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Changes to Terms</h4>
                <p className="text-muted-foreground">
                  We may update these Terms from time to time. We will notify users of significant changes via SMS 
                  or other communication methods. Your continued use of the service after changes take effect 
                  constitutes acceptance of the new terms.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Phone className="h-5 w-5 text-green-600" />
                <span>10. Contact Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <h4 className="font-semibold mb-2">Questions About These Terms?</h4>
                <p className="text-muted-foreground mb-4">
                  If you have questions about these Terms of Service, please contact us:
                </p>
                <div className="bg-muted p-4 rounded-lg">
                  <p className="font-medium mb-2">Text4Quiz Legal Team</p>
                  <p className="text-sm text-muted-foreground mb-1">
                    📧 Email: <a href="mailto:legal@text4quiz.com" className="text-primary hover:underline">legal@text4quiz.com</a>
                  </p>
                  <p className="text-sm text-muted-foreground mb-1">
                    📱 SMS Support: <a href="tel:+18885962752" className="text-primary hover:underline">+1 (888) 596-2752</a>
                  </p>
                  <p className="text-sm text-muted-foreground mb-1">
                    🌐 Website: <a href="https://text4quiz.com" className="text-primary hover:underline">https://text4quiz.com</a>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    ⏰ Response time: We respond to legal inquiries within 5 business days
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer CTA */}
        <div className="text-center mt-12 p-8 bg-muted/30 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Ready to Start Playing?</h3>
          <p className="text-muted-foreground mb-4">
            By using Text4Quiz, you agree to these terms. Questions? Contact us anytime!
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button asChild>
              <a href="/">Start Playing Text4Quiz</a>
            </Button>
            <Button variant="outline" onClick={() => window.history.back()}>
              Go Back
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}