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

    // Delay initial message by 1 second
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
    // We would need to recreate the chat session in geminiService to truly reset history
    // For now, this resets the UI state.
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
        
        const statRegex = /\[STAT\s*\|\s*Kcal:\s*(.*?)\s*\|\s*P:\s*(.*?)\s*\|\s*KH:\s*(.*?)\s*\|\s*F:\s*(.*?)\]/;
        const stateMatch = fullResponse.match(statRegex);
        
        // Parse scenarios if present: [[SCENARIOS:{...}]]
        const scenarioRegex = /\[\[SCENARIOS:(.*?)\]\]/;
        const scenarioMatch = fullResponse.match(scenarioRegex);
        
        let displayText = fullResponse;
        let currentScenarios = null;
        
        if (stateMatch) {
          const kcalVal = stateMatch[1].trim();
          const pVal = stateMatch[2].trim();
          const khVal = stateMatch[3].trim();
          const fVal = stateMatch[4].trim();
          
          setStats({
            calories: kcalVal,
            protein: pVal,
            carbs: khVal,
            fat: fVal
          });
          
          displayText = displayText.replace(statRegex, '').trim();
        }

        if (scenarioMatch) {
          try {
            currentScenarios = JSON.parse(scenarioMatch[1]);
            displayText = displayText.replace(scenarioRegex, '').trim();
          } catch (e) {
            // JSON might be incomplete during streaming
          }
        }

        // Clean up button text from display
        displayText = displayText.replace(/\[Button:.*?\]/g, '').trim();

        setMessages(prev => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1].text = displayText;
          if (currentScenarios) {
            newMessages[newMessages.length - 1].scenarios = currentScenarios;
          }
          return newMessages;
        });
      }
    } catch (error) {
      console.error('Failed to send message:', error);
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
    
    // Send choice to AI
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
      {/* Status Bar */}
      <header className="flex flex-col sm:flex-row items-center justify-between px-4 sm:px-6 py-3 sm:py-4 bg-white border-b border-zinc-100 shadow-sm sticky top-0 z-10 gap-3 sm:gap-0">
        <div className="flex items-center justify-between w-full sm:w-auto">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="flex items-center gap-3"
          >
            {logoUrl ? (
              <img src={logoUrl} alt="STATUR Logo" className="w-8 h-8 sm:w-10 sm:h-10 object-contain" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-sky-50 rounded-lg flex items-center justify-center border border-sky-100">
                <Dumbbell className="w-5 h-5 sm:w-6 sm:h-6 text-sky-500" />
              </div>
            )}
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900">STATUR</h1>
          </motion.div>

          <div className="flex items-center gap-2 sm:hidden">
            <button 
              onClick={handleReset}
              className="p-2 hover:bg-zinc-100 rounded-lg text-zinc-400 hover:text-zinc-600 transition-colors"
              title="Chat zurücksetzen"
            >
              <RefreshCcw className="w-5 h-5" />
            </button>
            <div className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
          </div>
        </div>
        
       <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
  {/* Kcal Anzeige */}
  <motion.div 
    initial={{ opacity: 0, y: -20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
    className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 bg-sky-50 rounded-xl border border-sky-100 shadow-sm justify-center sm:justify-start"
  >
    <Flame className="w-3 h-3 sm:w-4 sm:h-4 text-sky-500" />
    <span className="text-[10px] sm:text-xs font-semibold text-sky-700 whitespace-nowrap">
      Kcal: {stats.calories === 'unbekannt' ? '--' : `${stats.calories} ${Number(stats.calories) < 0 ? 'Limit überschritten' : 'verbleibend'}`}
    </span>
  </motion.div>

  {/* Protein Anzeige */}
<motion.div ...>
  <Dumbbell className="..." />
  <span className="text-[10px] sm:text-xs font-semibold text-sky-700 whitespace-nowrap">
    P: {stats.protein === 'unbekannt' ? '--' : `${stats.protein}g`}
  </span>
</motion.div>

{/* KH Anzeige */}
<motion.div ...>
  <Info className="..." />
  <span className="text-[10px] sm:text-xs font-semibold text-sky-700 whitespace-nowrap">
    KH: {stats.carbs === 'unbekannt' ? '--' : `${stats.carbs}g`}
  </span>
</motion.div>

{/* Fett Anzeige */}
<motion.div ...>
  <div className="..." />
  <span className="text-[10px] sm:text-xs font-semibold text-sky-700 whitespace-nowrap">
    F: {stats.fat === 'unbekannt' ? '--' : `${stats.fat}g`}
  </span>
</motion.div>
</div>

        <div className="hidden sm:flex items-center gap-2">
          <button 
            onClick={handleReset}
            className="p-2 hover:bg-zinc-100 rounded-lg text-zinc-400 hover:text-zinc-600 transition-colors"
            title="Chat zurücksetzen"
          >
            <RefreshCcw className="w-5 h-5" />
          </button>
          <div className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
        </div>
      </header>

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto px-2 sm:px-4 py-4 sm:py-8 space-y-6 scrollbar-hide bg-zinc-50/30">
        <div className="max-w-3xl mx-auto space-y-8">
          <AnimatePresence initial={false}>
            {messages.map((msg, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex gap-3 sm:gap-4 w-full sm:max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`flex-shrink-0 w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center shadow-sm overflow-hidden ${
                    msg.role === 'user' ? 'bg-white border border-zinc-200' : 'bg-sky-500 text-white'
                  }`}>
                    {msg.role === 'user' ? (
                      <User className="w-5 h-5 text-zinc-600" />
                    ) : (
                      logoUrl ? (
                        <img src={logoUrl} alt="Coach" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <Bot className="w-5 h-5" />
                      )
                    )}
                  </div>
                  <div className={`space-y-2 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                    <div className={`inline-block px-5 py-3.5 rounded-2xl text-[15px] leading-relaxed shadow-sm ${
                      msg.role === 'user' 
                        ? 'bg-white text-zinc-800 rounded-tr-none border border-zinc-200' 
                        : 'bg-sky-50/50 text-zinc-900 rounded-tl-none border border-sky-200/30'
                    }`}>
                      <div className="markdown-body prose prose-sm max-w-none prose-slate">
                        <Markdown>{msg.text}</Markdown>
                      </div>
                    </div>
                    
                    {/* Dynamic Scenario Buttons */}
                    {msg.role === 'model' && msg.scenarios && (
                      <motion.div 
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="!flex !flex-wrap !justify-start !gap-2 !mt-4 !max-w-full !overflow-visible"
                      >
                        <motion.button
                          whileHover={{ scale: 1.02, backgroundColor: '#e0f2fe' }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleScenarioSelect(msg.scenarios, 'fatLoss', 'Fett verlieren')}
                          className="flex-[1_1_auto] px-4 sm:px-5 py-2 sm:py-2.5 bg-white border border-sky-200 text-sky-600 text-[11px] sm:text-sm font-semibold rounded-xl shadow-sm transition-all text-center"
                        >
                          Fett verlieren
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.02, backgroundColor: '#e0f2fe' }}
                         whileTap={{ scale: 0.98 }}
                          onClick={() => handleScenarioSelect(msg.scenarios, 'muscleGain', 'Muskeln aufbauen')}
                          className="flex-[1_1_auto] px-4 sm:px-5 py-2 sm:py-2.5 bg-white border border-sky-200 text-sky-600 text-[11px] sm:text-sm font-semibold rounded-xl shadow-sm transition-all text-center"
                        >
                          Muskeln aufbauen
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.02, backgroundColor: '#e0f2fe' }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleScenarioSelect(msg.scenarios, 'recomposition', 'Fett weg & Muskeln')}
                          className="flex-[1_1_auto] px-4 sm:px-5 py-2 sm:py-2.5 bg-white border-2 border-sky-300/50 text-sky-600 text-[11px] sm:text-sm font-bold rounded-xl shadow-sm transition-all text-center ring-2 ring-sky-100 ring-offset-1"
                        >
                          Fett weg & Muskeln
                        </motion.button>
                      </motion.div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input Area */}
      <footer className="p-4 sm:p-8 bg-white border-t border-zinc-100 sticky bottom-0 z-10">
        <div className="max-w-3xl mx-auto">
          <div className="relative flex items-center bg-zinc-50 border border-zinc-200 rounded-2xl overflow-hidden focus-within:border-sky-400 focus-within:ring-4 focus-within:ring-sky-500/5 transition-all shadow-sm">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Tracke dein Essen oder entlarve einen Mythos..."
              className="flex-1 bg-transparent px-4 sm:px-6 py-3 sm:py-4 text-sm sm:text-base focus:outline-none resize-none placeholder:text-zinc-400 h-[52px] sm:h-[58px] max-h-32 text-zinc-800"
              rows={1}
            />
            <button
              onClick={() => handleSend()}
              disabled={isLoading || !input.trim()}
              title="Senden"
              className="p-3 sm:p-4 mr-1 sm:mr-2 text-sky-500 hover:bg-sky-50 rounded-xl disabled:text-zinc-300 disabled:hover:bg-transparent transition-all"
            >
              {isLoading ? <RefreshCcw className="w-5 h-5 sm:w-6 sm:h-6 animate-spin" /> : <Send className="w-5 h-5 sm:w-6 sm:h-6" />}
            </button>
          </div>
          <p className="text-[10px] sm:text-[11px] text-zinc-400 text-center mt-3 sm:mt-4 font-medium tracking-wide">
            STATUR: Logik gewinnt. Dein Körper lügt nicht.
          </p>
        </div>
      </footer>
    </div>
  );
}
