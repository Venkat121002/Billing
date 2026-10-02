import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import API_URL from "../../config/api";
import toast from "react-hot-toast";
import {
  Sparkles,
  Mic,
  MicOff,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Bot,
  Zap,
  Volume2,
  X
} from "lucide-react";

const SmartBillingAssistant = ({ onAddItems, isOpen, onClose }) => {
  const [inputText, setInputText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [parsedResults, setParsedResults] = useState(null);
  const [selectedItems, setSelectedItems] = useState({});
  const recognitionRef = useRef(null);

  // Initialize Web Speech API for voice billing
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-IN"; // English (India) with local pronunciation support

      recognition.onresult = (event) => {
        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setInputText((prev) => (prev ? `${prev} ${transcript}`.trim() : transcript));
      };

      recognition.onerror = (event) => {
        console.warn("Speech recognition error:", event.error);
        if (event.error === "not-allowed") {
          toast.error("Microphone access blocked. Please allow microphone permissions.");
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleVoice = () => {
    if (!recognitionRef.current) {
      toast.error("Voice recognition is not supported in this browser. Please use Chrome/Edge or type directly.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
        toast.success("Listening... Speak items clearly (e.g. '2 kg rice, 1 butter')");
      } catch (err) {
        console.error("Mic start error:", err);
      }
    }
  };

  const handleParse = async () => {
    const trimmed = inputText.trim();
    if (!trimmed) {
      toast.error("Please type or speak an order first.");
      return;
    }

    setIsLoading(true);
    setParsedResults(null);
    try {
      const token = sessionStorage.getItem("token");
      const res = await axios.post(
        `${API_URL}/automation/smart-billing`,
        { orderText: trimmed },
        { headers: { "x-auth-token": token } }
      );

      if (res.data && res.data.parsedItems) {
        setParsedResults(res.data);
        // Default select all matched items
        const initialSelection = {};
        res.data.parsedItems.forEach((_, idx) => {
          initialSelection[idx] = true;
        });
        setSelectedItems(initialSelection);

        if (res.data.parsedItems.length === 0) {
          toast("No matching items found in your catalog. Try adding or editing the query.", { icon: "ℹ️" });
        } else {
          toast.success(`Matched ${res.data.parsedItems.length} item(s)!`);
        }
      }
    } catch (err) {
      console.error("Smart billing parse error:", err);
      toast.error(err.response?.data?.msg || "Failed to parse items via AI.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyToCart = () => {
    if (!parsedResults || !parsedResults.parsedItems) return;
    const itemsToAdd = parsedResults.parsedItems.filter((_, idx) => selectedItems[idx]);

    if (itemsToAdd.length === 0) {
      toast.error("Please select at least one item to add.");
      return;
    }

    if (onAddItems) {
      onAddItems(itemsToAdd);
      toast.success(`Added ${itemsToAdd.length} items to current bill!`);
      // Reset
      setInputText("");
      setParsedResults(null);
      if (onClose) onClose();
    }
  };

  const toggleSelect = (idx) => {
    setSelectedItems((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center shadow-inner">
              <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                Smart Billing Assistant <span className="text-xs px-2 py-0.5 rounded-full bg-white/20 font-medium">Phase 2 AI</span>
              </h2>
              <p className="text-xs text-white/80">Speak or type customer orders in natural language</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Natural language input */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
              <span>Customer Order Text / Voice Input</span>
              {isListening && (
                <span className="flex items-center gap-1.5 text-xs text-rose-500 font-semibold animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span> Recording voice...
                </span>
              )}
            </label>
            <div className="relative rounded-xl border border-slate-200 bg-slate-50/50 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:bg-white transition-all">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="E.g. 2 kg Basmati Rice, 500g Sugar, 2 Amul Butter, 3 Colgate paste..."
                rows={3}
                className="w-full p-3.5 pr-24 bg-transparent outline-none text-slate-800 text-sm resize-none placeholder-slate-400"
              />
              <div className="absolute right-2.5 bottom-2.5 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={toggleVoice}
                  title={isListening ? "Stop Listening" : "Start Voice Input"}
                  className={`p-2.5 rounded-xl transition-all shadow-sm ${
                    isListening
                      ? "bg-rose-500 text-white animate-bounce shadow-rose-200"
                      : "bg-slate-200 hover:bg-indigo-100 text-slate-700 hover:text-indigo-600"
                  }`}
                >
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={handleParse}
                  disabled={isLoading || !inputText.trim()}
                  className="px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm shadow-indigo-200"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  <span>Parse</span>
                </button>
              </div>
            </div>
          </div>

          {/* Quick sample chips */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-slate-400 font-medium">Quick examples:</span>
            {[
              "2 kg rice, 1 butter",
              "500g sugar, 2 milk, 1 bread",
              "3 soaps, 1 shampoo"
            ].map((sample, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setInputText(sample)}
                className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg text-slate-600 border border-slate-200/60 transition-colors"
              >
                "{sample}"
              </button>
            ))}
          </div>

          {/* Parsed items preview */}
          {parsedResults && (
            <div className="mt-4 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  Matched Items ({parsedResults.parsedItems?.length || 0})
                </h3>
                <span className="text-xs text-slate-400">
                  Engine: <strong className="text-indigo-600">{parsedResults.method === 'gemini' ? 'Gemini 1.5' : 'Smart Heuristic'}</strong>
                </span>
              </div>

              {parsedResults.parsedItems?.length > 0 ? (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {parsedResults.parsedItems.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => toggleSelect(idx)}
                      className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                        selectedItems[idx]
                          ? "bg-indigo-50/60 border-indigo-200 shadow-sm"
                          : "bg-slate-50 border-slate-200 opacity-60"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={!!selectedItems[idx]}
                          onChange={() => {}}
                          className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                        />
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{item.productName}</p>
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <span>Qty: <strong className="text-slate-700">{item.quantity} {item.unit}</strong></span>
                            <span>•</span>
                            <span>Rate: ₹{item.price}</span>
                            {item.gstRate > 0 && <span className="text-[10px] px-1.5 py-0.2 bg-slate-200 rounded">GST {item.gstRate}%</span>}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-indigo-600">₹{item.total}</p>
                        <span className="text-[10px] text-slate-400">Stock: {item.availableStock}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center text-slate-400 bg-slate-50 rounded-xl border border-slate-200/60">
                  <AlertCircle className="w-6 h-6 mx-auto mb-1.5 text-amber-500" />
                  <p className="text-xs">No matching products found for this query.</p>
                </div>
              )}

              {/* Unmatched items */}
              {parsedResults.unmatched?.length > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs space-y-1">
                  <p className="font-semibold text-amber-800 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" /> Items not in catalog:
                  </p>
                  <ul className="list-disc list-inside text-amber-700 pl-1">
                    {parsedResults.unmatched.map((u, i) => (
                      <li key={i}>{u.requestedName} ({u.quantity} {u.unit})</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 transition-colors"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleApplyToCart}
            disabled={!parsedResults || !parsedResults.parsedItems || parsedResults.parsedItems.length === 0}
            className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-indigo-200 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Selected to Bill</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SmartBillingAssistant;
