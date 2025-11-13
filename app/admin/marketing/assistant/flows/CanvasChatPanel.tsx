'use client';

import * as React from 'react';
import { Panel } from '@xyflow/react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

type ConversationMessage = {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
};

type CanvasChatPanelProps = {
  messages: ConversationMessage[];
  prompt: string;
  setPrompt: (value: string) => void;
  onSubmit: () => void;
  busy: boolean;
  textareaRef?: React.Ref<HTMLTextAreaElement>;
};

export function CanvasChatPanel({
  messages,
  prompt,
  setPrompt,
  onSubmit,
  busy,
  textareaRef,
}: CanvasChatPanelProps) {
  return (
    <Panel position="bottom-center">
      <div className="pointer-events-auto w-[780px] max-w-[92vw] rounded-2xl border border-white/10 bg-zinc-950/70 shadow-2xl backdrop-blur-xl">
        <div className="max-h-[28vh] space-y-2 overflow-auto px-4 pt-3">
          {messages.map((message, index) => (
            <div
              key={`${message.timestamp}-${index}`}
              className={message.role === 'user' ? 'text-white' : 'text-white/70'}
            >
              <div className="text-[11px] uppercase tracking-wide opacity-60">{message.role}</div>
              <div className="whitespace-pre-wrap text-sm leading-5">{message.content}</div>
            </div>
          ))}
          {messages.length === 0 && (
            <div className="py-6 text-center text-sm text-white/50">
              Describe the automation you want, or use commands like <code className="rounded bg-white/10 px-1">/set label &quot;Order Confirmed&quot;</code>.
            </div>
          )}
        </div>

        <div className="border-t border-white/10 p-3">
          <Textarea
            ref={textareaRef}
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                event.preventDefault();
                onSubmit();
              }
              if (event.key === '/' && !event.metaKey && !event.ctrlKey && !event.altKey) {
                event.stopPropagation();
              }
            }}
            placeholder="Describe the flow or type a command (e.g., /guard consent, /set label 'Order Confirmed')."
            className="min-h-[84px] border-white/10 bg-white/5 text-white placeholder:text-white/40 focus-visible:ring-white/40"
          />
          <div className="mt-2 flex items-center justify-between text-[11px] text-white/50">
            <span>Tip: Press ⌘⏎ to submit</span>
            <Button onClick={onSubmit} disabled={busy} className="rounded-xl">
              {busy ? 'Thinking…' : 'Generate / Apply'}
            </Button>
          </div>
        </div>
      </div>
    </Panel>
  );
}

