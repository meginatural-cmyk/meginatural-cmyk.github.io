/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Search, Barcode, ExternalLink, Package, Info, Loader2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';

// Initialize Gemini API
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

interface ProductDetails {
  name: string;
  description: string;
  brand: string;
  officialWebsite: string;
  category: string;
  additionalInfo: string;
  sourceUrls: string[];
}

export default function App() {
  const [barcode, setBarcode] = useState('');
  const [lastBarcode, setLastBarcode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ProductDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const focusInput = () => inputRef.current?.focus();
    focusInput();
    
    // Ensure input is always focused for continuous scanning
    window.addEventListener('click', focusInput);
    return () => window.removeEventListener('click', focusInput);
  }, []);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!barcode.trim() || loading) return;

    const currentBarcode = barcode.trim();
    setLastBarcode(currentBarcode);
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Barkod numarası ${currentBarcode} olan ürün hakkında detaylı bilgi bul. 
        Lütfen şu formatta JSON olarak yanıt ver:
        {
          "name": "Ürün Adı",
          "brand": "Marka Adı",
          "description": "Ürün hakkında kısa açıklama",
          "officialWebsite": "Ürünün veya markanın resmi web sitesi URL'si",
          "category": "Ürün kategorisi",
          "additionalInfo": "Varsa teknik özellikler veya diğer detaylar"
        }
        Eğer ürünü bulamazsan, bulamadığını belirten bir hata mesajı içeren bir JSON döndür.`,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
        },
      });

      const text = response.text;
      if (!text) throw new Error("Yapay zekadan yanıt alınamadı.");

      const data = JSON.parse(text);
      
      if (data.error || !data.name) {
        setError("Ürün bulunamadı. Lütfen barkod numarasını kontrol edin.");
      } else {
        // Extract grounding URLs
        const sourceUrls = response.candidates?.[0]?.groundingMetadata?.groundingChunks
          ?.map(chunk => chunk.web?.uri)
          .filter((uri): uri is string => !!uri) || [];

        setResult({
          ...data,
          sourceUrls: Array.from(new Set(sourceUrls)) // Unique URLs
        });
        // Clear barcode for next scan
        setBarcode('');
      }
    } catch (err) {
      console.error("Search error:", err);
      setError("Bir hata oluştu. Lütfen tekrar deneyin.");
    } finally {
      setLoading(false);
      // Always refocus input for the next scan
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  };

  // Auto-search for common barcode lengths (8 or 13 digits)
  useEffect(() => {
    if ((barcode.length === 8 || barcode.length === 13) && /^\d+$/.test(barcode)) {
      const timer = setTimeout(() => {
        handleSearch();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [barcode]);

  return (
    <div className="min-h-screen flex flex-col items-center p-4 md:p-8">
      {/* Header */}
      <header className="w-full max-w-2xl mb-12 text-center">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center gap-3 mb-4"
        >
          <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-200">
            <Barcode className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl font-display font-bold tracking-tight text-slate-900">
            Barkod Dedektifi
          </h1>
        </motion.div>
        <p className="text-slate-500 text-lg">
          Ürün barkodunu girin, detayları ve resmi sitesini anında öğrenin.
        </p>
      </header>

      {/* Search Bar */}
      <div className="w-full max-w-2xl">
        <form onSubmit={handleSearch} className="relative group">
          <input
            ref={inputRef}
            type="text"
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            placeholder="Barkod numarasını buraya yazın..."
            className="w-full px-6 py-5 pl-14 text-lg bg-white border-2 border-slate-200 rounded-2xl shadow-sm 
                     focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all
                     placeholder:text-slate-400 group-hover:border-slate-300"
          />
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
          <button
            type="submit"
            disabled={loading || !barcode.trim()}
            className="absolute right-3 top-1/2 -translate-y-1/2 px-6 py-2.5 bg-indigo-600 text-white font-semibold rounded-xl
                     hover:bg-indigo-700 active:scale-95 disabled:opacity-50 disabled:pointer-events-none transition-all shadow-md"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Ara'}
          </button>
        </form>
        
        <div className="mt-2 flex justify-end">
          <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-1 animate-pulse">
            <div className="w-1 h-1 bg-indigo-400 rounded-full" />
            Yeni tarama için hazır
          </span>
        </div>

        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-600"
            >
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p className="font-medium">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Results Section */}
      <main className="w-full max-w-4xl mt-12">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-20 text-slate-400"
            >
              <Loader2 className="w-12 h-12 animate-spin mb-4 text-indigo-500" />
              <p className="text-lg font-medium animate-pulse">Ürün bilgileri aranıyor...</p>
            </motion.div>
          ) : result ? (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-6"
            >
              {/* Main Info Card */}
              <div className="md:col-span-2 space-y-6">
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <span className="inline-block px-3 py-1 bg-indigo-50 text-indigo-600 text-xs font-bold rounded-full uppercase tracking-wider mb-2">
                        {result.category || 'Ürün'}
                      </span>
                      <h2 className="text-3xl font-display font-bold text-slate-900">{result.name}</h2>
                      <p className="text-lg text-slate-500 font-medium">{result.brand}</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl">
                      <Package className="w-8 h-8 text-slate-400" />
                    </div>
                  </div>

                  <div className="prose prose-slate max-w-none">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                      <Info className="w-4 h-4" /> Açıklama
                    </h3>
                    <div className="text-slate-600 leading-relaxed">
                      <Markdown>{result.description}</Markdown>
                    </div>
                  </div>

                  {result.additionalInfo && (
                    <div className="mt-8 pt-8 border-t border-slate-100">
                      <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">Ek Bilgiler</h3>
                      <div className="text-slate-600 text-sm bg-slate-50 p-4 rounded-xl">
                        <Markdown>{result.additionalInfo}</Markdown>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Sidebar / Links */}
              <div className="space-y-6">
                {/* Official Website Card */}
                <div className="bg-indigo-600 p-6 rounded-3xl text-white shadow-lg shadow-indigo-200">
                  <h3 className="text-indigo-100 text-sm font-bold uppercase tracking-widest mb-4">Resmi Web Sitesi</h3>
                  <a
                    href={result.officialWebsite}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between group bg-white/10 hover:bg-white/20 p-4 rounded-2xl transition-all"
                  >
                    <span className="font-semibold truncate mr-2">
                      {(() => {
                        try {
                          return result.officialWebsite ? new URL(result.officialWebsite).hostname : 'Siteye Git';
                        } catch {
                          return 'Siteye Git';
                        }
                      })()}
                    </span>
                    <ExternalLink className="w-5 h-5 shrink-0 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                  </a>
                </div>

                {/* Sources Card */}
                {result.sourceUrls.length > 0 && (
                  <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                    <h3 className="text-slate-400 text-sm font-bold uppercase tracking-widest mb-4">Kaynaklar</h3>
                    <ul className="space-y-3">
                      {result.sourceUrls.map((url, i) => (
                        <li key={i}>
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-slate-600 hover:text-indigo-600 flex items-center gap-2 transition-colors truncate"
                          >
                            <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full shrink-0" />
                            {(() => {
                              try {
                                return new URL(url).hostname;
                              } catch {
                                return 'Kaynak';
                              }
                            })()}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Barcode Display */}
                <div className="bg-slate-900 p-6 rounded-3xl text-white flex flex-col items-center justify-center text-center">
                  <Barcode className="w-12 h-12 mb-2 opacity-50" />
                  <p className="text-xs text-slate-400 font-mono uppercase tracking-widest mb-1">Sorgulanan Barkod</p>
                  <p className="text-xl font-mono font-bold tracking-[0.2em]">{lastBarcode}</p>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-20 opacity-20 grayscale"
            >
              <Barcode className="w-32 h-32 mb-4" />
              <p className="text-xl font-medium">Henüz bir arama yapılmadı</p>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="mt-auto py-8 text-slate-400 text-sm">
        &copy; {new Date().getFullYear()} Barkod Dedektifi • Google AI Studio ile Güçlendirilmiştir
      </footer>
    </div>
  );
}
