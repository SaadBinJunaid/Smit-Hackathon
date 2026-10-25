import React, { useState } from 'react';
import { X, Sparkles, Send, Bot, User, ShieldAlert, Clock, Info } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { AIService } from '../../services/aiService';
import { Badge } from '../common/Badge';

interface AIChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSmartLeave?: () => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  isError?: boolean;
}

export const AIChatDrawer: React.FC<AIChatDrawerProps> = ({
  isOpen,
  onClose,
  onOpenSmartLeave,
}) => {
  const { user, role } = useAuth();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: `Hello! I am HCM Lite's enterprise AI assistant. I have live access to verified Firestore records (Headcount, Today's Attendance, Late Comers, Leaves, Policy Rules, and Payroll summaries). How can I assist you?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  if (!isOpen) return null;

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || loading) return;

    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const responseText = await AIService.askAssistant(
        query,
        role || 'employee',
        user?.uid || 'guest',
        user?.employeeId
      );

      const botMsg: ChatMessage = {
        id: `bot_${Date.now()}`,
        sender: 'assistant',
        text: responseText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `bot_err_${Date.now()}`,
          sender: 'assistant',
          text: `Service notification: ${err.message || 'Unable to execute query.'}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isError: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const samplePrompts = [
    'What is our total headcount?',
    "Give me today's attendance summary",
    'Who is late today?',
    'What is the company office start & grace policy?',
    ...(role === 'employee'
      ? [
          'What is my remaining leave balance?',
          "What is my colleague's salary? (Test privacy refusal)",
        ]
      : ['Summarize the latest payroll draft']),
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden no-print">
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col border-l border-slate-200">
          {/* Header */}
          <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                <Sparkles className="w-4 h-4 text-indigo-200" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900">HCM AI Assistant</h3>
                  <Badge variant="indigo" size="sm">
                    {role}
                  </Badge>
                </div>
                <p className="text-[11px] text-slate-500">Live Tool Calling & Privacy Guarded</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Smart Leave Trigger */}
          {role === 'employee' && onOpenSmartLeave && (
            <div className="bg-indigo-50/70 border-b border-indigo-100 px-4 py-2 flex items-center justify-between">
              <span className="text-xs text-indigo-900 font-medium">Applying for leave?</span>
              <button
                onClick={() => {
                  onClose();
                  onOpenSmartLeave();
                }}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 underline cursor-pointer"
              >
                Use Smart Leave Form
              </button>
            </div>
          )}

          {/* Messages list */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-2.5 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.sender === 'assistant' && (
                  <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed shadow-xs ${
                    m.sender === 'user'
                      ? 'bg-indigo-600 text-white rounded-tr-xs'
                      : m.isError
                      ? 'bg-rose-50 text-rose-800 border border-rose-200 rounded-tl-xs'
                      : 'bg-slate-100 text-slate-800 border border-slate-200/60 rounded-tl-xs whitespace-pre-line'
                  }`}
                >
                  {m.text}
                  <div
                    className={`mt-1.5 text-[10px] ${
                      m.sender === 'user' ? 'text-indigo-200 text-right' : 'text-slate-400'
                    }`}
                  >
                    {m.timestamp}
                  </div>
                </div>

                {m.sender === 'user' && (
                  <div className="w-7 h-7 rounded-lg bg-slate-800 text-white flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 text-xs text-slate-500 py-2">
                <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                <span>Executing tools and querying records...</span>
              </div>
            )}
          </div>

          {/* Suggested Prompts */}
          <div className="px-4 py-2 border-t border-slate-100 bg-slate-50/40">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Suggested questions:
            </p>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
              {samplePrompts.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(p)}
                  className="text-[11px] bg-white hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 px-2.5 py-1 rounded-md border border-slate-200 transition-colors text-left cursor-pointer"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Input box */}
          <div className="p-3.5 border-t border-slate-200 bg-white">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about headcount, attendance, leaves, rules..."
                className="flex-1 px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="p-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl transition-colors shadow-xs cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
            <p className="text-[10px] text-slate-400 mt-1.5 text-center">
              AI assistant adheres to role scopes. 20 requests/hr max.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
