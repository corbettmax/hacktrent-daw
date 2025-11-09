import { useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Send, Sparkles } from 'lucide-react';

interface AiMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  parameters?: any;
}

interface AIHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  messages: AiMessage[];
  currentPrompt: string;
  setCurrentPrompt: (value: string) => void;
  isGenerating: boolean;
  onGenerate: () => void;
}

export default function AIHistoryModal({
  isOpen,
  onClose,
  messages,
  currentPrompt,
  setCurrentPrompt,
  isGenerating,
  onGenerate,
}: AIHistoryModalProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Generation History
          </DialogTitle>
          <DialogDescription>
            View your conversation history and generate new sounds
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-4 min-h-[300px]">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-2">
                <Sparkles className="h-12 w-12 text-muted-foreground mx-auto" />
                <p className="text-sm text-muted-foreground">
                  No conversation history yet
                </p>
                <p className="text-xs text-muted-foreground">
                  Start by entering a prompt below
                </p>
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`p-4 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-primary/10 ml-8'
                    : 'bg-muted mr-8'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium mb-1">
                      {message.role === 'user' ? 'You' : 'AI Assistant'}
                    </p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {message.content}
                    </p>
                    {message.parameters && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        <details>
                          <summary className="cursor-pointer hover:text-foreground">
                            View Parameters
                          </summary>
                          <pre className="mt-2 p-2 bg-background/50 rounded overflow-x-auto">
                            {JSON.stringify(message.parameters, null, 2)}
                          </pre>
                        </details>
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {message.timestamp.toLocaleTimeString()}
                </p>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="border-t pt-4 mt-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={currentPrompt}
              onChange={(e) => setCurrentPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && currentPrompt.trim() && !isGenerating) {
                  onGenerate();
                }
              }}
              placeholder="Describe the sound you want to generate..."
              className="flex-1 px-4 py-2 rounded-lg bg-background border border-input text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={isGenerating}
            />
            <Button
              onClick={onGenerate}
              disabled={isGenerating || !currentPrompt.trim()}
              size="lg"
            >
              {isGenerating ? (
                <>
                  <Sparkles className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Generate
                </>
              )}
            </Button>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <Sparkles className="h-3 w-3" />
            <span className="font-medium">Try:</span> "deep bass kick for techno"
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
