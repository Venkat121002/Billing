import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import {
  X,
  Send,
  ShieldCheck,
  Bot,
  RotateCcw,
  Info,
  Database,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { resolveIndustryProfile } from "../../config/industryProfiles";
import { resolveDepartment } from "./knowledge/departmentKnowledge";
import { generateSwordNexiResponse } from "./engine/swordNexiEngine";

export default function SwordNexi() {
  const { currentUser } = useAuth();
  const location = useLocation();

  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const profile = resolveIndustryProfile(currentUser);
  const department = resolveDepartment(location.pathname);

  // Suggested prompts customized by current industry and screen
  const getSuggestedPrompts = () => {
    const base = [
      `Check live stock for items 📦`,
      `Show products running low on stock ⚠️`,
      `What can I do on the ${department.name} screen? 📍`,
    ];

    if (profile.key === "clothing") {
      base.push("What is our alteration & fitting policy? 👗");
    } else if (profile.key === "pharmacy") {
      base.push("How do expiry alerts and batches work? 💊");
    } else if (profile.key === "mobile_shop") {
      base.push("Check repair tickets and IMEIs 📱");
    } else if (profile.key === "petshop") {
      base.push("Check grooming appointments & pet passports 🐾");
    } else {
      base.push("How do I create a bill? 🧾");
    }

    return base.slice(0, 3);
  };

  // Initialize greeting
  useEffect(() => {
    if (messages.length === 0) {
      const initialGreeting = {
        id: "init",
        sender: "bot",
        text: `Hi there! 👋 I am SwordNexi, your intelligent assistant for ${profile.label}. Right now you are in ${department.name}. I am connected to your live inventory, billing records, and catalog. What can I answer for you today? 😊`,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages([initialGreeting]);
    }
  }, [profile.label, department.name]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isTyping, isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  const handleSendMessage = async (textToSend) => {
    const query = (textToSend || inputMessage).trim();
    if (!query) return;

    const userMsg = {
      id: Date.now().toString(),
      sender: "user",
      text: query,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage("");
    setIsTyping(true);

    try {
      const response = await generateSwordNexiResponse(
        query,
        currentUser,
        location.pathname
      );

      const botMsg = {
        id: (Date.now() + 1).toString(),
        sender: "bot",
        text: response.reply,
        sources: response.sources,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      const errorMsg = {
        id: (Date.now() + 1).toString(),
        sender: "bot",
        text: "I ran into a temporary hiccup processing that. Please try asking again! 😊",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: Date.now().toString(),
        sender: "bot",
        text: `Chat cleared! 🧹 I am connected to your ${profile.label} records and ready for any question on ${department.name}. ✨`,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 print:hidden font-sans">
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-full shadow-lg hover:shadow-emerald-500/25 hover:scale-105 active:scale-95 transition-all duration-200 border border-emerald-400/30"
          aria-label="Open SwordNexi Chatbot"
        >
          <div className="relative">
            <Bot className="w-5 h-5 text-white animate-pulse" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-300 rounded-full ring-2 ring-emerald-600" />
          </div>
          <span className="font-semibold text-sm tracking-wide">SwordNexi</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-700/60 text-emerald-100 hidden sm:inline-block">
            {profile.label}
          </span>
        </button>
      )}

      {/* Expandable Chat Window */}
      {isOpen && (
        <div className="w-[370px] sm:w-[430px] h-[580px] max-h-[85vh] bg-white rounded-2xl shadow-2xl border border-gray-200/80 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-700 p-3.5 text-white flex items-center justify-between select-none">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/20">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-sm tracking-tight">SwordNexi</h3>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.2 bg-emerald-900/60 text-emerald-200 rounded">
                    AI Assistant
                  </span>
                </div>
                <p className="text-xs text-emerald-100/90 font-medium flex items-center gap-1">
                  <span>{profile.label}</span>
                  <span>•</span>
                  <span>{department.name}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleClearChat}
                title="Clear conversation"
                className="p-1.5 text-emerald-100 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Close chat"
                className="p-1.5 text-emerald-100 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Department & Isolation Status Strip */}
          <div className="bg-emerald-50/90 border-b border-emerald-100 px-3.5 py-1.5 flex items-center justify-between text-[11px] text-emerald-900">
            <div className="flex items-center gap-1.5 font-medium truncate">
              <span>{department.emoji}</span>
              <span className="truncate">{department.name}</span>
            </div>
            <div className="flex items-center gap-2 text-[10px] shrink-0 font-semibold">
              <span className="flex items-center gap-1 text-emerald-700">
                <Database className="w-3 h-3 text-emerald-600" />
                Live Data
              </span>
              <span className="flex items-center gap-1 text-teal-700">
                <ShieldCheck className="w-3 h-3 text-teal-600" />
                Isolated
              </span>
            </div>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/50">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.sender === "user" ? "items-end" : "items-start"
                }`}
              >
                <div
                  className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-line ${
                    msg.sender === "user"
                      ? "bg-emerald-600 text-white rounded-br-none shadow-sm"
                      : "bg-white text-gray-800 rounded-bl-none border border-gray-200/80 shadow-sm"
                  }`}
                >
                  {msg.text}

                  {/* Source Grounding Badges */}
                  {msg.sources && (
                    <div className="mt-2.5 pt-2 border-t border-gray-100 flex flex-wrap gap-1 items-center">
                      {msg.sources.productsFound > 0 && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 text-[10px] text-emerald-700 font-medium border border-emerald-200/60">
                          📦 {msg.sources.productsFound} Products Verified
                        </span>
                      )}
                      {msg.sources.billsFound > 0 && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 text-[10px] text-amber-700 font-medium border border-amber-200/60">
                          🧾 Billing Records Checked
                        </span>
                      )}
                      <span className="text-[9px] text-gray-400 ml-auto">
                        {msg.sources.engine || "SwordNex AI"}
                      </span>
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-gray-400 mt-1 px-1">
                  {msg.time}
                </span>
              </div>
            ))}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex items-center gap-1.5 bg-white border border-gray-200/80 px-3.5 py-2 rounded-2xl rounded-bl-none w-fit shadow-sm">
                <span className="text-xs text-gray-500 font-medium">
                  Checking your store data & reasoning
                </span>
                <span className="inline-block w-1.5 h-1.5 bg-emerald-600 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="inline-block w-1.5 h-1.5 bg-emerald-600 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="inline-block w-1.5 h-1.5 bg-emerald-600 rounded-full animate-bounce" />
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Suggested Quick Prompts */}
          <div className="p-2 bg-white border-t border-gray-100 flex gap-1.5 overflow-x-auto no-scrollbar">
            {getSuggestedPrompts().map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(prompt)}
                disabled={isTyping}
                className="shrink-0 text-[11px] bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/60 px-2.5 py-1 rounded-full transition-colors active:scale-95 disabled:opacity-50"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Input Box */}
          <div className="p-3 bg-white border-t border-gray-200">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                ref={inputRef}
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder={`Ask about any product, stock, price, or bill...`}
                disabled={isTyping}
                className="flex-1 text-sm bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-gray-800 placeholder-gray-400"
              />
              <button
                type="submit"
                disabled={!inputMessage.trim() || isTyping}
                className="p-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl disabled:opacity-40 disabled:hover:bg-emerald-600 transition-colors shadow-sm"
                title="Send question"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
            <div className="flex items-center justify-between mt-2 px-1 text-[10px] text-gray-400">
              <span className="flex items-center gap-1">
                <Info className="w-3 h-3 text-gray-400" />
                Store isolated ({profile.label})
              </span>
              <span>🔒 Zero data leakage</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
