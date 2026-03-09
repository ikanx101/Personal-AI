/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Settings, Send, Trash2, X, AlertTriangle, MessageSquare, BrainCircuit } from 'lucide-react';
import { loadState, saveState, AppState, Message } from './lib/storage';
import { callDeepSeek } from './lib/api';

export default function App() {
  const [state, setState] = useState<AppState>(loadState());
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    saveState(state);
  }, [state]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    if (!state.apiKey) {
      alert('Silakan masukkan DeepSeek API Key di menu Settings terlebih dahulu.');
      setShowSettings(true);
      return;
    }

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: Date.now()
    };

    setState(prev => ({ ...prev, messages: [...prev.messages, userMsg] }));
    setInput('');
    setIsLoading(true);

    try {
      const chatHistory = state.messages.slice(-5).map(m => ({ role: m.role, content: m.content }));
      const result = await callDeepSeek(state.apiKey, state.memories, userMsg.content, chatHistory);
      
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: result.response,
        timestamp: Date.now()
      };

      setState(prev => ({
        ...prev,
        memories: [...prev.memories, ...(result.new_memories || [])],
        messages: [...prev.messages, assistantMsg]
      }));
    } catch (error: any) {
      console.error(error);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Error: ${error.message}`,
        timestamp: Date.now()
      };
      setState(prev => ({ ...prev, messages: [...prev.messages, errorMsg] }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setState(prev => ({ ...prev, memories: [], messages: [] }));
    setShowResetConfirm(false);
    setShowSettings(false);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 text-gray-900 font-sans">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 bg-white border-b shadow-sm">
        <div className="flex items-center gap-2">
          <BrainCircuit className="w-6 h-6 text-indigo-600" />
          <h1 className="text-xl font-semibold text-gray-800">My Personal Assistant Bot</h1>
        </div>
        <button 
          onClick={() => setShowSettings(true)}
          className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
        >
          <Settings className="w-5 h-5" />
        </button>
      </header>

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {state.messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-4">
            <MessageSquare className="w-12 h-12 opacity-20" />
            <p className="text-center max-w-sm">
              Halo! Saya adalah My Personal Assistant Bot. Ceritakan sesuatu tentang Anda, dan saya akan mengingatnya.
            </p>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-6">
            {state.messages.map((msg) => (
              <div 
                key={msg.id} 
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`max-w-[80%] rounded-2xl px-5 py-3 ${
                    msg.role === 'user' 
                      ? 'bg-indigo-600 text-white rounded-tr-sm' 
                      : 'bg-white border text-gray-800 shadow-sm rounded-tl-sm'
                  }`}
                >
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white border text-gray-800 shadow-sm rounded-2xl rounded-tl-sm px-5 py-4 flex items-center gap-2">
                  <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </main>

      {/* Input Area */}
      <footer className="bg-white border-t p-4">
        <div className="max-w-3xl mx-auto flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ketik pesan Anda di sini..."
            className="flex-1 bg-gray-100 border-transparent focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 rounded-full px-6 py-3 outline-none transition-all"
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-full p-3 transition-colors flex items-center justify-center"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </footer>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-800">Pengaturan</h2>
              <button 
                onClick={() => setShowSettings(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {/* API Key Section */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  DeepSeek API Key
                </label>
                <input
                  type="password"
                  value={state.apiKey}
                  onChange={(e) => setState(prev => ({ ...prev, apiKey: e.target.value }))}
                  placeholder="sk-..."
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
                <p className="text-xs text-gray-500">
                  API Key disimpan secara lokal di browser Anda.
                </p>
              </div>

              {/* Memories Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-700">
                    Memori Tersimpan ({state.memories.length})
                  </label>
                </div>
                <div className="bg-gray-50 border rounded-lg p-3 max-h-40 overflow-y-auto text-sm text-gray-600 space-y-2">
                  {state.memories.length === 0 ? (
                    <p className="text-center italic text-gray-400">Belum ada memori.</p>
                  ) : (
                    <ul className="list-disc pl-4 space-y-1">
                      {state.memories.map((mem, i) => (
                        <li key={i}>{mem}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* Reset Section */}
              <div className="pt-4 border-t space-y-4">
                <button
                  onClick={() => setShowResetConfirm(true)}
                  className="w-full flex items-center justify-center gap-2 text-red-600 bg-red-50 hover:bg-red-100 px-4 py-2 rounded-lg transition-colors font-medium"
                >
                  <Trash2 className="w-4 h-4" />
                  Hapus Semua Memori & Chat
                </button>
                <div className="text-center text-xs text-gray-400">
                  Created by <a href="https://ikanx101.com" target="_blank" rel="noopener noreferrer" className="hover:text-indigo-500 transition-colors">ikanx101.com</a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-lg font-semibold">Konfirmasi Hapus</h3>
            </div>
            <p className="text-gray-600 text-sm">
              Apakah Anda yakin ingin menghapus semua memori dan riwayat chat? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg font-medium transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleReset}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

