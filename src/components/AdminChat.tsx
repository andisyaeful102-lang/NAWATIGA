import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, AlertTriangle, Coffee, Bell, Utensils, ExternalLink, ArrowRight, Bot, User, Check, RefreshCw } from 'lucide-react';
import { playAdminChime } from '../utils/audio.ts';
import { MenuItem, MENU_ITEMS } from '../data/menu.ts';

export interface ChatMessage {
  id: string;
  sender: 'admin' | 'user';
  text: string;
  timestamp: string;
  suggestedAction?: 'open_menu' | 'call_waiter' | 'open_item' | 'switch_table';
  targetItemId?: string;
}

interface AdminChatProps {
  tableNumber: string;
  onOpenMenu: () => void;
  onSelectItem: (item: MenuItem) => void;
}

const QUICK_PROMPTS = [
  { label: '👨‍🍳 Gimana barista tahu ada pesanan?', query: 'Bagaimana agar barista tahu kalau ada pesanan masuk dari meja saya?' },
  { label: '🌟 Rekomendasi menu andalan apa ya?', query: 'Rekomendasi menu andalan apa ya, Kak?' },
  { label: '⚠️ Barcode di meja tidak bisa di-scan', query: 'Barcode di meja saya tidak bisa di-scan / error, gimana ya?' },
  { label: '🥛 Ada pilihan susu nabati (oat/soy)?', query: 'Apakah ada pilihan susu nabati seperti oat milk atau soy milk?' },
  { label: '🍬 Bisa atur tingkat kemanisan (sugar level)?', query: 'Apakah tingkat kemanisan kopi bisa diatur?' },
  { label: '☕ Pesan Signature Palm Sugar Latte 1 ya', query: 'Kak, saya mau pesan Signature Palm Sugar Latte 1 ya' },
];

export const AdminChat: React.FC<AdminChatProps> = ({
  tableNumber,
  onOpenMenu,
  onSelectItem,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-msg',
      sender: 'admin',
      text: `Halo Kak! Selamat datang di NAWATIGA ☕✨\n\nSaya ADMIN, asisten virtual Kakak. Untuk melihat daftar menu lengkap dan membuat pesanan, silakan scan barcode QR yang terpasang di meja Kakak menggunakan kamera HP ya.\n\nAda yang bisa ADMIN bantu atau butuh rekomendasi menu andalan hari ini?`,
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [inputValue, setInputValue] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend: string) => {
    const text = textToSend.trim();
    if (!text || isLoading) return;

    const userMessage: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Build conversation history for context
      const historyPayload = messages.slice(-5).map((m) => ({
        role: m.sender === 'admin' ? ('model' as const) : ('user' as const),
        parts: [{ text: m.text }],
      }));

      const res = await fetch('/api/admin/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: historyPayload,
          tableNumber,
        }),
      });

      const data = await res.json();
      const replyText = data.reply || 'Halo Kak, ada yang bisa ADMIN bantu lagi?';

      let suggestedAction: ChatMessage['suggestedAction'] = undefined;
      let targetItemId: string | undefined = undefined;

      const lowerReply = replyText.toLowerCase();
      if (lowerReply.includes('truffle') && lowerReply.includes('palm sugar')) {
        suggestedAction = 'open_menu';
      } else if (lowerReply.includes('palm sugar')) {
        suggestedAction = 'open_item';
        targetItemId = 'palm-sugar-latte';
      } else if (lowerReply.includes('truffle')) {
        suggestedAction = 'open_item';
        targetItemId = 'truffle-fries';
      } else if (lowerReply.includes('link') || lowerReply.includes('menu digital') || lowerReply.includes('barcode')) {
        suggestedAction = 'open_menu';
      } else if (lowerReply.includes('waiter') || lowerReply.includes('staf')) {
        suggestedAction = 'call_waiter';
      }

      const botMessage: ChatMessage = {
        id: `adm-${Date.now()}`,
        sender: 'admin',
        text: replyText,
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        suggestedAction,
        targetItemId,
      };

      setMessages((prev) => [...prev, botMessage]);
      playAdminChime();
    } catch (err) {
      console.error(err);
      const errorMessage: ChatMessage = {
        id: `adm-${Date.now()}`,
        sender: 'admin',
        text: `Halo Kak, koneksi sedang kami segarkan. Untuk melihat menu langsung atau memesan, Kakak bisa klik tombol Menu Digital di layar ini ya! 😊`,
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        suggestedAction: 'open_menu',
      };
      setMessages((prev) => [...prev, errorMessage]);
      playAdminChime();
    } finally {
      setIsLoading(false);
    }
  };

  const handleActionClick = (msg: ChatMessage) => {
    if (msg.suggestedAction === 'open_menu') {
      onOpenMenu();
    } else if (msg.suggestedAction === 'open_item' && msg.targetItemId) {
      const item = MENU_ITEMS.find((i) => i.id === msg.targetItemId);
      if (item) {
        onSelectItem(item);
      } else {
        onOpenMenu();
      }
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] min-h-[500px] max-w-3xl mx-auto bg-zinc-950 rounded-3xl border border-zinc-800 shadow-2xl overflow-hidden animate-in fade-in duration-300">
      {/* Concierge Info Header */}
      <div className="px-5 py-3.5 bg-zinc-950 text-white flex items-center justify-between border-b border-zinc-800 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-2xl bg-zinc-900 border border-zinc-700 flex items-center justify-center text-white shadow-inner">
              <Bot className="w-5 h-5" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 border-2 border-zinc-950 rounded-full" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-white">ADMIN NAWATIGA</h3>
              <span className="px-2 py-0.5 rounded bg-zinc-800 text-[10px] text-zinc-300 border border-zinc-700 font-mono">
                AI Concierge
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">
              Online & Siap Melayani Meja <strong className="text-white font-bold">#{tableNumber}</strong>
            </p>
          </div>
        </div>
      </div>

      {/* Messages Timeline */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-[#0c0c0e]">
        {messages.map((msg) => {
          const isAdmin = msg.sender === 'admin';
          return (
            <div
              key={msg.id}
              className={`flex items-start gap-2.5 ${isAdmin ? 'justify-start' : 'justify-end'}`}
            >
              {isAdmin && (
                <div className="w-7 h-7 rounded-xl bg-zinc-900 border border-zinc-700 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 shadow-sm">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div className="max-w-[85%] sm:max-w-[75%] space-y-2">
                <div
                  className={`p-4 rounded-2xl text-xs leading-relaxed whitespace-pre-line shadow-md ${
                    isAdmin
                      ? 'bg-zinc-900 text-zinc-100 border border-zinc-800 rounded-tl-xs'
                      : 'bg-white text-zinc-950 font-medium rounded-tr-xs'
                  }`}
                >
                  {msg.text}
                </div>

                {/* In-chat interactive action cards */}
                {isAdmin && msg.suggestedAction && (
                  <div className="animate-in fade-in zoom-in-95 duration-150 pt-1">
                    {msg.suggestedAction === 'open_menu' && (
                      <button
                        type="button"
                        onClick={onOpenMenu}
                        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-bold shadow-md transition-all active:scale-95"
                      >
                        <Utensils className="w-3.5 h-3.5" />
                        <span>Buka Menu Digital Meja {tableNumber}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-zinc-500" />
                      </button>
                    )}

                    {msg.suggestedAction === 'open_item' && msg.targetItemId && (
                      <button
                        type="button"
                        onClick={() => handleActionClick(msg)}
                        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-600 text-xs font-bold shadow-md transition-all active:scale-95"
                      >
                        <Coffee className="w-3.5 h-3.5" />
                        <span>Lihat & Atur Menu Ini</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}

                <div
                  className={`text-[10px] text-zinc-500 ${isAdmin ? 'text-left pl-1' : 'text-right pr-1'}`}
                >
                  {msg.timestamp}
                </div>
              </div>

              {!isAdmin && (
                <div className="w-7 h-7 rounded-xl bg-zinc-800 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 border border-zinc-700">
                  <User className="w-4 h-4 text-zinc-300" />
                </div>
              )}
            </div>
          );
        })}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex items-center gap-2.5 justify-start">
            <div className="w-7 h-7 rounded-xl bg-zinc-900 border border-zinc-700 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 shadow-sm">
              <Bot className="w-4 h-4" />
            </div>
            <div className="p-3.5 bg-zinc-900 rounded-2xl rounded-tl-xs border border-zinc-800 text-xs text-zinc-300 flex items-center gap-2.5 shadow-md">
              <span className="w-2 h-2 rounded-full bg-white animate-ping" />
              <span>ADMIN sedang membalas...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts Bar */}
      <div className="px-3 py-2 bg-zinc-950 border-t border-zinc-800/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar flex-shrink-0">
        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 whitespace-nowrap px-1">
          Pertanyaan:
        </span>
        {QUICK_PROMPTS.map((qp, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleSendMessage(qp.query)}
            disabled={isLoading}
            className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white text-[11px] font-medium whitespace-nowrap border border-zinc-800 hover:border-zinc-700 shadow-sm transition-colors flex-shrink-0 disabled:opacity-50"
          >
            {qp.label}
          </button>
        ))}
      </div>

      {/* Input area */}
      <div className="p-3 bg-zinc-950 border-t border-zinc-800 flex-shrink-0 space-y-1.5">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage(inputValue);
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Tanyakan rekomendasi kopi, susu oat, tingkat gula, atau cara pesan..."
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 text-xs rounded-xl border border-zinc-800 bg-zinc-900 text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-400"
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            className="px-4 py-2.5 rounded-xl bg-white hover:bg-zinc-200 disabled:bg-zinc-800 disabled:text-zinc-600 text-zinc-950 text-xs font-bold shadow-md transition-colors flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
          >
            <span>Kirim</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>

        <div className="flex items-center justify-between text-[10px] text-zinc-400 px-1">
          <span>*ADMIN tidak menerima pesanan langsung lewat chat. Pesan langsung melalui menu barcode meja.</span>
          <span className="hidden sm:inline font-mono">NAWATIGA Digital Concierge</span>
        </div>
      </div>
    </div>
  );
};
