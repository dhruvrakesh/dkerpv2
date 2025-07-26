import React from 'react';
import { InventoryLayout } from '@/components/layout/InventoryLayout';
import { AIChatInterface } from '@/components/ai/AIChatInterface';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Brain, MessageSquare, Zap, Shield } from 'lucide-react';

export default function AIAssistant() {
  return (
    <InventoryLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Assistant</h1>
          <p className="text-muted-foreground">
            Get intelligent insights and assistance for your ERP operations
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chat Interface */}
          <div className="lg:col-span-2">
            <AIChatInterface contextType="general" />
          </div>

          {/* Features Sidebar */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  AI Capabilities
                </CardTitle>
                <CardDescription>
                  Your intelligent ERP assistant can help with:
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <MessageSquare className="h-4 w-4 mt-1 text-primary" />
                  <div>
                    <h4 className="font-medium">Natural Conversations</h4>
                    <p className="text-sm text-muted-foreground">
                      Ask questions in plain English about your inventory, manufacturing, and analytics
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Zap className="h-4 w-4 mt-1 text-primary" />
                  <div>
                    <h4 className="font-medium">Real-time Insights</h4>
                    <p className="text-sm text-muted-foreground">
                      Get instant analysis of your ERP data and actionable recommendations
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Shield className="h-4 w-4 mt-1 text-primary" />
                  <div>
                    <h4 className="font-medium">Secure & Private</h4>
                    <p className="text-sm text-muted-foreground">
                      Your conversations are encrypted and stored securely within your organization
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-sm space-y-1">
                  <p className="font-medium">Try asking:</p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1">
                    <li>"Show me low stock items"</li>
                    <li>"What's our production status?"</li>
                    <li>"Analyze recent quality issues"</li>
                    <li>"Create a GRN report"</li>
                    <li>"Help me optimize inventory"</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </InventoryLayout>
  );
}