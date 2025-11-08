'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { renderEmail } from '@/emails/design-system-v1';
import type { TemplateManifest } from '@/lib/schemas/marketing';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  data?: any;
}

export default function FlowsAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewSubject, setPreviewSubject] = useState<string | null>(null);
  const [intent, setIntent] = useState<'generate_email' | 'create_flow'>('generate_email');

  const router = useRouter();

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setLoading(true);

    const newMessages: Message[] = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);

    try {
      const response = await fetch('/api/ai/assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          intent,
        }),
      });

      const result = await response.json();

      if (result.success) {
        let assistantMessage = '';

        if (result.intent === 'generate_email') {
          assistantMessage = `✅ Email template generated!\n\nSubject: ${result.data.subject}\n\nTemplate ID: ${result.data.templateId}`;

          if (result.data.manifest) {
            const html = await renderEmail(
              result.data.manifest as TemplateManifest,
              result.data.subject
            );
            setPreviewHtml(html);
            setPreviewSubject(result.data.subject);
          }
        } else if (result.intent === 'create_flow') {
          assistantMessage = `✅ Marketing flow created!\n\nName: ${result.data.flow.name}\n\nFlow ID: ${result.data.flowId}\n\nStatus: ${result.data.flow.active ? 'Active' : 'Inactive (requires activation)'}`;
        } else if (result.intent === 'query_metrics') {
          assistantMessage = 'ℹ️ For metrics, switch to the Quick Metrics assistant.';
        } else {
          assistantMessage = result.error || 'Request processed';
        }

        setMessages([...newMessages, { role: 'assistant', content: assistantMessage, data: result.data }]);
      } else {
        setMessages([
          ...newMessages,
          { role: 'assistant', content: `❌ Error: ${result.error || 'Unknown error'}` },
        ]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages([
        ...newMessages,
        {
          role: 'assistant',
          content: `❌ Error: ${error instanceof Error ? error.message : 'Failed to send message'}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 pb-10 pt-8 sm:px-6 lg:px-10">
        <header className="flex flex-col gap-6 border-b border-white/10 pb-6 lg:flex-row lg:items-center lg:justify-between lg:border-none">
          <button
            onClick={() => router.push('/admin/marketing')}
            className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-sm font-medium text-white transition hover:border-white hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to marketing
          </button>

          <div className="flex items-center gap-3 lg:ml-auto">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold tracking-[0.35em] text-white/60">ALYRA</p>
              <h2 className="text-xl font-semibold">Flows & Emails Assistant</h2>
            </div>
          </div>
        </header>

        <main className="flex-1 pt-8">
          <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
            <Card className="flex flex-col bg-white/10 text-white shadow-lg lg:min-h-[560px]">
              <CardHeader className="border-b border-white/10 pb-4">
                <CardTitle className="text-white">Conversation</CardTitle>
                <p className="text-sm text-white/70">
                  Give the assistant a goal—flows, automations, or brand-perfect emails.
                </p>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col space-y-4 pt-6">
                <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                  {messages.length === 0 && (
                    <div className="rounded-xl border border-white/15 bg-white/5 p-6 text-center text-white/70">
                      <p className="text-base font-medium">Start a conversation with the Flows & Emails assistant</p>
                      <p className="mt-2 text-sm">Try prompts like:</p>
                      <ul className="mt-3 space-y-1 text-sm">
                        <li>• “When a customer places an order, send a confirmation email.”</li>
                        <li>• “Create a 3-step winback flow for dormant buyers.”</li>
                        <li>• “Draft a launch announcement in Alyra’s brand voice.”</li>
                      </ul>
                    </div>
                  )}

                  {messages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                          msg.role === 'user'
                            ? 'bg-white text-slate-900'
                            : 'bg-white/10 text-white backdrop-blur'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    </div>
                  ))}

                  {loading && (
                    <div className="flex justify-start">
                      <div className="rounded-2xl bg-white/10 px-4 py-3 text-sm text-white/70">Thinking...</div>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-white/60">
                      Mode: {intent === 'generate_email' ? 'Generate Email' : 'Create Flow'}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={intent === 'generate_email' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setIntent('generate_email')}
                        className="text-xs font-semibold uppercase tracking-[0.2em]"
                      >
                        Generate Email
                      </Button>
                      <Button
                        type="button"
                        variant={intent === 'create_flow' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setIntent('create_flow')}
                        className="text-xs font-semibold uppercase tracking-[0.2em]"
                      >
                        Build Flow
                      </Button>
                    </div>
                  </div>
                  <Textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder="Ask the assistant... (Press Enter to send, Shift+Enter for a new line)"
                    rows={3}
                    disabled={loading}
                    className="border-white/20 bg-white/5 text-white placeholder:text-white/40 focus-visible:ring-white/40"
                  />
                  <Button
                    onClick={handleSend}
                    disabled={loading || !input.trim()}
                    className="w-full bg-white text-slate-900 hover:bg-slate-200"
                  >
                    {loading ? 'Sending...' : 'Send'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="flex flex-col bg-white text-slate-900 shadow-lg lg:min-h-[560px]">
              <CardHeader className="border-b border-slate-100 pb-4">
                <CardTitle>Email Preview</CardTitle>
                <p className="text-sm text-slate-500">
                  Live render of the manifest generated in real time. Update the conversation to refresh the preview.
                </p>
                {previewSubject && (
                  <p className="text-sm font-medium text-slate-700">Subject: {previewSubject}</p>
                )}
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto bg-slate-50 p-6">
                {previewHtml ? (
                  <div
                    className="mx-auto w-full max-w-xl rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
                    dangerouslySetInnerHTML={{ __html: previewHtml }}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-center text-slate-500">
                    <div>
                      <p className="text-base font-medium">Generate an email to see the preview here</p>
                      <p className="mt-2 text-sm">
                        Email templates follow Alyra’s design system, tone, and legal guidance automatically.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
