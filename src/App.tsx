import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, Flame, Dumbbell, Info, RefreshCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { geminiService, Message } from './services/geminiService';
import { generateLogo } from './services/logoService';

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [showInitialMessage, setShowInitialMessage] = useState(false);
  const [stats, setStats] = useState<{ 
    calories: string | number, 
    protein: string | number,
    carbs: string | number,
    fat: string | number 
  }>({
    calories: 'unbekannt',
    protein: 'unbekannt',
    carbs: 'unbekannt',
    fat: 'unbekannt'
  });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchLogo = async () => {
      const url = await generateLogo();
      setLogoUrl(url);
    };
    fetchLogo();

    const timer = setTimeout(() => {
      setMessages([
        {
          role: 'model',
          text: 'Willkommen bei STATUR. Ich bin dein Mentor für biologische Architektur. Bevor wir in die Zahlen eintauchen: Was ist aktuell deine größte körperliche Herausforderung oder dein wichtigstes Anliegen?'
        }
      ]);
      setShowInitialMessage(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleReset = () => {
    setMessages([
      {
        role: 'model',
        text: 'Willkommen bei STATUR. Ich bin dein Mentor für biologische Architektur. Bevor wir in die Zahlen eintauchen: Was ist aktuell deine größte körperliche Herausforderung oder dein wichtigstes Anliegen?'
      }
    ]);
    setStats({
      calories: 'unbekannt',
      protein: 'unbekannt',
      carbs: 'unbekannt',
      fat: 'unbekannt'
    });
  };

  const handleSend = async (overrideInput?: string) => {
    const messageToSend = overrideInput || input;
    if (!messageToSend.trim() || isLoading) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: messageToSend.trim() }]);
    setIsLoading(true);

    try {
      let fullResponse = '';
      setMessages(prev => [...prev, { role: 'model', text: '' }]);
      
      const stream = geminiService.sendMessageStream(messageToSend.trim());
      
      for await (const chunk of stream) {
        fullResponse += chunk;
        
        // Stabilerer Regex für die Stats
        const statRegex = /\[STAT\s*\|\s*Kcal:\s*([\d.-]+|unbekannt)\s*\|\s*P:\s*([\d.-]+|unbekannt)\s*\|\s*KH:\s*([\d.-]+|unbekannt)\s*\|\s*F:\s*([\d.-]+|unbekannt)\]/i;
        const stateMatch = fullResponse.match(statRegex);
        
        const scenarioRegex = /\[\[SCENARIOS:(.*?)\]\]/s;
        const scenarioMatch = fullResponse.match(scenarioRegex);
        
        let displayText = fullResponse;
        let currentScenarios = null;
        
        if (stateMatch) {
          setStats({
            calories: stateMatch[1],
            protein: stateMatch[2],
            carbs: stateMatch[3],
            fat: stateMatch[4]
          });
          displayText = displayText.replace(statRegex, '').trim();
        }

        if (scenarioMatch) {
          try {
            currentScenarios = JSON.parse(scenarioMatch[1]);
            displayText = displayText.replace(scenarioRegex, '').trim();
          } catch (e) {
            // Ignorieren während des Streams
          }
        }

        displayText = displayText.replace(/\[Button:.*?\]/g, '').trim();

        setMessages(prev => {
          const newMessages = [...prev];
          const lastMsg = newMessages[newMessages.length - 1];
          lastMsg.text = displayText;
          if (currentScenarios) lastMsg.scenarios = currentScenarios;
          return [...newMessages];
        });
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      setMessages(prev => [...prev, { role: 'model', text: 'Entschuldige, die Verbindung zu STATUR wurde unterbrochen. Bitte versuche es erneut.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleScenarioSelect = (scenarios: any, type: string, label: string) => {
    if (!scenarios || !scenarios[type]) return;
    const selected = scenarios[type];
    setStats({
      calories: selected.kcal,
      protein: selected.protein,
      carbs: selected.carbs || 'unbekannt',
      fat: selected.fat || 'unbekannt'
    });
    handleSend(`Ich wähle: ${label}`);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#fcfcfc] text-zinc-900 font-sans selection:bg-sky-500/20">
      <header className="flex flex-col sm:flex-row items-center justify-between px-4 sm:px-6 py-3 sm:py-4 bg-white border-b border-zinc-100 shadow-sm sticky top-0 z-10 gap-3 sm:gap-0">
        <div className="flex items-center justify-between w-full sm:w-auto">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
            {logoUrl ? (
              <img src={logoUrl} alt="STATUR Logo" className="w-8 h-8 sm:w-10 sm:h-10 object-contain" />
            ) : (
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-sky-50 rounded-lg flex items-center justify-center border border-sky-100">
                <Dumbbell className="w-5 h-5 sm:w-6 sm:h-6 text-sky-500" />
              </div>
            )}
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900">STATUR</h1>
          </motion.div>
          <div className="flex items-center gap-2 sm:hidden">
            <button onClick={handleReset} className="p-2 text-zinc-400"><RefreshCcw className="w-5 h-5" /></button>
          </div>
        </div>
        
        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <StatBox icon={<Flame />} label="Kcal" value={stats.calories} delay={0.2} />
          <StatBox icon={<Dumbbell />} label="P" value={stats.protein} unit="g" delay={0.3} />
          <StatBox icon={<Info />} label="KH" value={stats.carbs} unit="g" delay={0.4} />
          <StatBox icon={null} label="F" value={stats.fat} unit="g" delay={0.5} />
        </div>

        <button onClick={handleReset} className="hidden sm:block p-2 text-zinc-400 hover:text-zinc-600"><RefreshCcw className="w-5 h-5" /></button>
      </header>

      <main className="flex-1 overflow-y-auto px-2 sm:px-4 py-4 sm:py-8 bg-zinc-50/30">
        <div className="max-w-3xl mx-auto space-y-8">
          <AnimatePresence>
            {messages.map((msg, index) => (
              <motion.div key={index} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${msg.role === 'user' ? 'bg-white border' : 'bg-sky-500 text-white'}`}>
                    {msg.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                  </div>
                  <div className={`px-5 py-3 rounded-2xl shadow-sm ${msg.role === 'user' ? 'bg-white border' : 'bg-sky-50/50 border border-sky-200/30'}`}>
                    <Markdown className="prose prose-sm">{msg.text}</Markdown>
                    {msg.role === 'model' && msg.scenarios && (
                      <div className="flex flex-wrap gap-2 mt-4">
                        <ScenarioButton label="Fett verlieren" onClick={() => handleScenarioSelect(msg.scenarios, 'fatLoss', 'Fett verlieren')} />
                        <ScenarioButton label="Muskeln aufbauen" onClick={() => handleScenarioSelect(msg.scenarios, 'muscleGain', 'Muskeln aufbauen')} />
                        <ScenarioButton label="Fett weg & Muskeln" onClick={() => handleScenarioSelect(msg.scenarios, 'recomposition', 'Fett weg & Muskeln')} highlight />
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>
      </main>

      <footer className="p-4 sm:p-8 bg-white border-t">
        <div className="max-w-3xl mx-auto relative flex items-center bg-zinc-50 border rounded-2xl overflow-hidden focus-within:border-sky-400">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Tracke dein Essen..."
            className="flex-1 bg-transparent px-4 py-3 focus:outline-none resize-none h-[52px]"
          />
          <button onClick={() => handleSend()} disabled={isLoading || !input.trim()} className="p-3 text-sky-500">
            {isLoading ? <RefreshCcw className="animate-spin" /> : <Send />}
          </button>
        </div>
      </footer>
    </div>
  );
}

// Hilfskomponenten für sauberen Code
function StatBox({ icon, label, value, unit = '', delay }: any) {
  return (
    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }} className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 rounded-xl border border-sky-100 shadow-sm">
      {icon ? React.cloneElement(icon, { className: "w-3 h-3 text-sky-500" }) : <div className="w-3 h-3 rounded-full border-2 border-sky-500" />}
      <span className="text-[10px] sm:text-xs font-semibold text-sky-700 whitespace-nowrap">
        {label}: {value === 'unbekannt' ? '--' : `${value}${unit}`}
      </span>
    </motion.div>
  );
}

function ScenarioButton({ label, onClick, highlight }: any) {
  return (
    <button onClick={onClick} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${highlight ? 'bg-sky-100 border-sky-300 text-sky-700 shadow-md' : 'bg-white border-sky-200 text-sky-600'}`}>
      {label}
    </button>
  );
}
