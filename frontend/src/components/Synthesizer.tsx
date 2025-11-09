import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Wand2, Sparkles, Send } from 'lucide-react';
import OscillatorSection from './OscillatorSection';
import EnvelopeSection from './EnvelopeSection';
import FilterSection from './FilterSection';
import EffectsSection from './EffectsSection';
import WaveformDisplay from './WaveformDisplay';
import VirtualKeyboard from './VirtualKeyboard';
import PresetManager from './PresetManager';
import { SynthEngine } from '../lib/synthEngine';
import { toast } from 'sonner';

interface SynthSettings {
  oscillators: Array<{ waveform: string; detune: number; volume: number }>;
  envelope: { attack: number; decay: number; sustain: number; release: number };
  filter: { filterType: string; cutoff: number; resonance: number };
  effects: { delayTime: number; delayFeedback: number; reverbAmount: number };
}

interface AiMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  settings?: SynthSettings;
}

export default function Synthesizer() {
  const synthEngineRef = useRef<SynthEngine | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [aiMessages, setAiMessages] = useState<AiMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAiGenerated, setIsAiGenerated] = useState(false);
  const [aiPrompt, setAiPrompt] = useState<string>('');
  const [settings, setSettings] = useState<SynthSettings>({
    oscillators: [
      { waveform: 'sine', detune: 0, volume: 0.5 },
      { waveform: 'sawtooth', detune: 0, volume: 0.3 }
    ],
    envelope: { attack: 0.1, decay: 0.2, sustain: 0.7, release: 0.3 },
    filter: { filterType: 'lowpass', cutoff: 2000, resonance: 1 },
    effects: { delayTime: 0.3, delayFeedback: 0.3, reverbAmount: 0.2 }
  });

  useEffect(() => {
    const initSynth = async () => {
      try {
        const engine = new SynthEngine();
        await engine.initialize();
        synthEngineRef.current = engine;
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize synthesizer:', error);
        toast.error('Failed to initialize audio system');
      }
    };

    initSynth();

    // Load AI conversation history from localStorage
    const savedHistory = localStorage.getItem('synthAiConversationHistory');
    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory);
        setAiMessages(parsed.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        })));
      } catch (error) {
        console.error('Failed to load conversation history:', error);
      }
    }

    return () => {
      if (synthEngineRef.current) {
        synthEngineRef.current.dispose();
      }
    };
  }, []);

  useEffect(() => {
    if (synthEngineRef.current && isInitialized) {
      synthEngineRef.current.updateSettings(settings);
    }
  }, [settings, isInitialized]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiMessages]);

  const handleNoteOn = (frequency: number) => {
    if (synthEngineRef.current) {
      synthEngineRef.current.noteOn(frequency);
    }
  };

  const handleNoteOff = () => {
    if (synthEngineRef.current) {
      synthEngineRef.current.noteOff();
    }
  };

  const handleLoadPreset = (newSettings: SynthSettings) => {
    setSettings(newSettings);
    setIsAiGenerated(false);
    setAiPrompt('');
    toast.success('Preset loaded successfully');
  };

  const handleGenerateAI = async () => {
    if (!currentPrompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }

    setIsGenerating(true);

    // Add user message to conversation
    const userMessage: AiMessage = {
      id: `msg-${Date.now()}-user`,
      role: 'user',
      content: currentPrompt.trim(),
      timestamp: new Date(),
    };

    setAiMessages((prev) => [...prev, userMessage]);

    try {
      // Call Python API endpoint for synth settings
      const response = await fetch('/api/generate-synth-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: currentPrompt.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      // Map the response to SynthSettings format
      const newSettings: SynthSettings = {
        oscillators: data.oscillators || settings.oscillators,
        envelope: data.envelope || settings.envelope,
        filter: data.filter || settings.filter,
        effects: data.effects || settings.effects,
      };

      // Update synth settings with AI-generated values
      setSettings(newSettings);

      // Mark as AI-generated and store the prompt
      setIsAiGenerated(true);
      setAiPrompt(currentPrompt.trim());

      // Add assistant response to conversation
      const assistantMessage: AiMessage = {
        id: `msg-${Date.now()}-assistant`,
        role: 'assistant',
        content: `Generated synth settings for "${currentPrompt.trim()}"`,
        timestamp: new Date(),
        settings: newSettings,
      };

      const updatedMessages = [...aiMessages, userMessage, assistantMessage];
      setAiMessages(updatedMessages);

      // Save conversation history to localStorage
      localStorage.setItem('synthAiConversationHistory', JSON.stringify(updatedMessages));

      // Clear input
      setCurrentPrompt('');

      toast.success('AI settings applied!', {
        description: 'New synth settings are now active',
        duration: 5000,
      });
    } catch (error) {
      console.error('Failed to generate AI settings:', error);
      
      // Add error message to conversation
      const errorMessage: AiMessage = {
        id: `msg-${Date.now()}-error`,
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
      };

      const updatedMessages = [...aiMessages, userMessage, errorMessage];
      setAiMessages(updatedMessages);
      localStorage.setItem('synthAiConversationHistory', JSON.stringify(updatedMessages));

      toast.error('Failed to generate AI settings', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const clearAiHistory = () => {
    setAiMessages([]);
    localStorage.removeItem('synthAiConversationHistory');
    toast.success('Conversation history cleared');
  };

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Initializing audio engine...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* AI Generated Indicator */}
      {isAiGenerated && aiPrompt && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">AI Generated:</span>
                <span className="text-sm text-muted-foreground">"{aiPrompt}"</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsAiGenerated(false);
                  setAiPrompt('');
                }}
              >
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-border/50 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                Waveform Display
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAiModalOpen(true)}
              >
                <Wand2 className="mr-2 h-4 w-4" />
                Generate with AI
              </Button>
            </CardHeader>
            <CardContent>
              <WaveformDisplay synthEngine={synthEngineRef.current} />
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-lg">
            <CardHeader>
              <CardTitle>Virtual Keyboard</CardTitle>
            </CardHeader>
            <CardContent>
              <VirtualKeyboard onNoteOn={handleNoteOn} onNoteOff={handleNoteOff} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <PresetManager currentSettings={settings} onLoadPreset={handleLoadPreset} />
        </div>
      </div>

      <Card className="border-border/50 shadow-lg">
        <CardHeader>
          <CardTitle>Sound Controls</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="oscillators" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="oscillators">Oscillators</TabsTrigger>
              <TabsTrigger value="envelope">Envelope</TabsTrigger>
              <TabsTrigger value="filter">Filter</TabsTrigger>
              <TabsTrigger value="effects">Effects</TabsTrigger>
            </TabsList>

            <TabsContent value="oscillators" className="space-y-4 mt-6">
              <OscillatorSection
                oscillators={settings.oscillators}
                onChange={(oscillators) => setSettings({ ...settings, oscillators })}
              />
            </TabsContent>

            <TabsContent value="envelope" className="space-y-4 mt-6">
              <EnvelopeSection
                envelope={settings.envelope}
                onChange={(envelope) => setSettings({ ...settings, envelope })}
              />
            </TabsContent>

            <TabsContent value="filter" className="space-y-4 mt-6">
              <FilterSection
                filter={settings.filter}
                onChange={(filter) => setSettings({ ...settings, filter })}
              />
            </TabsContent>

            <TabsContent value="effects" className="space-y-4 mt-6">
              <EffectsSection
                effects={settings.effects}
                onChange={(effects) => setSettings({ ...settings, effects })}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* AI Generation Modal */}
      <Dialog open={isAiModalOpen} onOpenChange={setIsAiModalOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <Sparkles className="h-6 w-6 text-primary" />
              AI Synth Generator
            </DialogTitle>
            <DialogDescription>
              Describe the synthesizer sound you want and AI will generate the settings
            </DialogDescription>
          </DialogHeader>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 min-h-[300px] max-h-[50vh]">
            {aiMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-4 text-muted-foreground">
                <Sparkles className="h-12 w-12 opacity-50" />
                <div>
                  <p className="text-lg font-medium">Start a conversation</p>
                  <p className="text-sm">Describe the synth sound you want to create</p>
                </div>
                <div className="grid grid-cols-1 gap-2 text-xs max-w-md">
                  <div className="p-3 bg-muted rounded-lg text-left">
                    <span className="font-medium">Try:</span> "warm analog pad with slow attack"
                  </div>
                  <div className="p-3 bg-muted rounded-lg text-left">
                    <span className="font-medium">Try:</span> "aggressive sawtooth lead with filter sweep"
                  </div>
                  <div className="p-3 bg-muted rounded-lg text-left">
                    <span className="font-medium">Try:</span> "dreamy ambient texture with reverb"
                  </div>
                </div>
              </div>
            ) : (
              <>
                {aiMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-4 py-3 ${
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {message.role === 'assistant' && (
                          <Sparkles className="h-4 w-4 mt-1 flex-shrink-0" />
                        )}
                        <div className="flex-1">
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                          {message.settings && (
                            <div className="mt-2 pt-2 border-t border-border/50 text-xs space-y-1 opacity-80">
                              <div>Oscillators: {message.settings.oscillators.length}</div>
                              <div>Filter: {message.settings.filter.filterType} @ {message.settings.filter.cutoff}Hz</div>
                              <div>Attack: {message.settings.envelope.attack}s, Release: {message.settings.envelope.release}s</div>
                            </div>
                          )}
                          <p className="text-xs opacity-60 mt-1">
                            {message.timestamp.toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input Area */}
          <div className="px-6 py-4 border-t space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={currentPrompt}
                onChange={(e) => setCurrentPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleGenerateAI();
                  }
                }}
                placeholder="Describe the synth sound you want (e.g., 'warm analog pad with slow attack')..."
                className="flex-1 px-4 py-2 rounded-lg bg-background border border-input focus:outline-none focus:ring-2 focus:ring-ring"
                disabled={isGenerating}
              />
              <Button
                onClick={handleGenerateAI}
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
            {aiMessages.length > 0 && (
              <div className="flex justify-between items-center text-xs text-muted-foreground">
                <span>{aiMessages.length} message{aiMessages.length !== 1 ? 's' : ''} in history</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearAiHistory}
                  className="h-7 text-xs"
                >
                  Clear History
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
