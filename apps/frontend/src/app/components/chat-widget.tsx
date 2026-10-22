'use client';

import { useState, useRef, useEffect } from 'react';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

export default function ChatWidget({ tenantId }: { tenantId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content:
        'Salamaik datang di RM Padang Sederhana! Ambo Rancak AI, siap mambantu Uni dan Uda mangarajoan reservasi meja, cek ketersediaan jam makan, ataupun rekomendasi lauk pangek & rendang hari ko. Ado nan bisa ambo bantu?',
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isQuickBookingOpen, setIsQuickBookingOpen] = useState(false);
  const [quickDate, setQuickDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [quickTime, setQuickTime] = useState('19:00');
  const [quickPartySize, setQuickPartySize] = useState(2);
  const [quickName, setQuickName] = useState('');
  const [quickPhone, setQuickPhone] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen, isTyping]);

  const sendMessage = async (userText: string) => {
    if (!userText || isTyping) return;
    setInput('');
    const newHistory = [...messages, { role: 'user' as const, content: userText }];
    setMessages(newHistory);
    setIsTyping(true);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
    try {
      const res = await fetch(`${apiUrl}/ai/chat/${encodeURIComponent(tenantId)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(sessionId ? { 'x-session-id': sessionId } : {}),
        },
        body: JSON.stringify({
          message: userText,
          history: messages.slice(1).map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const payload = await res.json();
      const json = payload.data ?? payload;
      if (!res.ok) {
        throw new Error(json.message || 'Gagal menghubungi asisten AI.');
      }

      if (json.sessionId && !sessionId) {
        setSessionId(json.sessionId);
      }

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: json.reply || 'Maaf, ambo balun dapek manjawab itu.',
        },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Maaf, tajadi gangguan koneksi ka server. Silakan hubungi nomor WhatsApp cabang kami.',
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    void sendMessage(input.trim());
  };

  const submitQuickBooking = (e: React.FormEvent) => {
    e.preventDefault();
    setIsQuickBookingOpen(false);
    void sendMessage(
      `Saya ingin reservasi ${quickPartySize} orang pada ${quickDate} pukul ${quickTime}. Nama ${quickName}, nomor telepon ${quickPhone}.`,
    );
  };

  return (
    <div className="fixed bottom-6 right-6 z-40 font-sans">
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group flex items-center gap-3 px-4 py-3 rounded-full bg-[#D98327] hover:bg-[#BF6F1C] text-[#16201D] font-bold shadow-2xl border border-[#ECE8AF]/30 transition-all transform hover:scale-105 active:scale-95"
        >
          <div className="w-8 h-8 rounded-full bg-[#16201D] text-[#ECE8AF] flex items-center justify-center font-mono text-xs font-bold border border-[#ECE8AF]/20">
            AI
          </div>
          <span className="text-sm font-semibold tracking-wide">Tanya Rancak AI</span>
          <span className="flex h-2.5 w-2.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#4A943E] opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#4A943E]" />
          </span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="w-[360px] sm:w-[400px] h-[520px] rounded-2xl border border-[#3d332a] bg-[#16201D] text-[#ECE8AF] shadow-2xl flex flex-col overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="px-4 py-3.5 border-b border-[#2d2924] bg-[#101614] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#186049] border border-[#4A943E]/40 flex items-center justify-center text-[#ECE8AF] font-bold text-xs">
                AI
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#ECE8AF] flex items-center gap-1.5">
                  Rancak AI
                  <span className="w-2 h-2 rounded-full bg-[#4A943E] inline-block" />
                </h3>
                <p className="text-[10px] text-[#ECE8AF]/60 font-mono">Pelayanan Tamu Khas Minang</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="w-7 h-7 rounded-full border border-[#3d332a] flex items-center justify-center text-[#ECE8AF]/60 hover:text-[#ECE8AF] hover:border-[#D98327] transition text-xs"
            >
              ✕
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-[#D98327] text-black font-medium rounded-br-none'
                      : 'bg-[#101614] border border-[#2d2924] text-[#ECE8AF] rounded-bl-none'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.content}</p>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-[#101614] border border-[#2d2924] rounded-2xl rounded-bl-none px-4 py-2.5 text-xs text-[#ECE8AF]/60 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#D98327] animate-bounce" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#D98327] animate-bounce [animation-delay:0.2s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#D98327] animate-bounce [animation-delay:0.4s]" />
                  <span className="text-[10px] ml-1 font-mono">Sedang mengecek...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {isQuickBookingOpen && (
            <form onSubmit={submitQuickBooking} className="border-t border-[#2d2924] bg-[#101614] p-3 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <input aria-label="Tanggal reservasi" type="date" value={quickDate} onChange={(e) => setQuickDate(e.target.value)} required className="rounded bg-[#16201D] border border-[#3d332a] px-2 py-1.5 text-xs text-[#ECE8AF]" />
                <input aria-label="Jam reservasi" type="time" value={quickTime} onChange={(e) => setQuickTime(e.target.value)} required className="rounded bg-[#16201D] border border-[#3d332a] px-2 py-1.5 text-xs text-[#ECE8AF]" />
                <input aria-label="Jumlah tamu" type="number" min={1} max={12} value={quickPartySize} onChange={(e) => setQuickPartySize(Number(e.target.value))} required className="rounded bg-[#16201D] border border-[#3d332a] px-2 py-1.5 text-xs text-[#ECE8AF]" />
                <input aria-label="Nama pemesan" placeholder="Nama pemesan" value={quickName} onChange={(e) => setQuickName(e.target.value)} required className="rounded bg-[#16201D] border border-[#3d332a] px-2 py-1.5 text-xs text-[#ECE8AF]" />
              </div>
              <input aria-label="Nomor telepon" type="tel" placeholder="Nomor WhatsApp" value={quickPhone} onChange={(e) => setQuickPhone(e.target.value)} required className="w-full rounded bg-[#16201D] border border-[#3d332a] px-2 py-1.5 text-xs text-[#ECE8AF]" />
              <button type="submit" disabled={isTyping} className="w-full rounded bg-[#D98327] py-2 text-xs font-semibold text-black disabled:opacity-40">Lanjut cek meja</button>
            </form>
          )}

          {/* Input Box */}
          <form onSubmit={handleSend} className="p-3 border-t border-[#2d2924] bg-[#101614] flex gap-2">
            <input
              type="text"
              placeholder="Tanya menu, cek meja, atau buat booking..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 rounded-xl bg-[#16201D] border border-[#3d332a] px-3.5 py-2 text-xs text-[#ECE8AF] placeholder-[#ECE8AF]/40 focus:border-[#D98327] focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setIsQuickBookingOpen((open) => !open)}
              className="rounded-xl border border-[#D98327] px-2 text-[#D98327] text-xs"
              aria-label="Buka booking cepat"
            >
              Pesan cepat
            </button>
            <button
              type="submit"
              disabled={isTyping || !input.trim()}
              className="px-3.5 py-2 rounded-xl bg-[#D98327] hover:bg-[#BF6F1C] text-black font-semibold text-xs transition disabled:opacity-40"
            >
              Kirim
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
