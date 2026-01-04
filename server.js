// server.js (GROQ LLAMA 3.3 - GÜÇLENDİRİLMİŞ FİNAL SÜRÜM)
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');
const crypto = require('crypto');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// === ANALYSIS ENHANCEMENT #3: CACHING SYSTEM ===
// In-memory cache for analysis results (24 hour TTL)
const analysisCache = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

function getCacheKey(idea, language) {
    const normalized = idea.toLowerCase().trim().replace(/\s+/g, ' ');
    return crypto.createHash('md5').update(`${normalized}_${language}`).digest('hex');
}

function getCachedAnalysis(cacheKey) {
    const cached = analysisCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data;
    }
    // Remove expired cache
    if (cached) {
        analysisCache.delete(cacheKey);
    }
    return null;
}

function setCachedAnalysis(cacheKey, data) {
    analysisCache.set(cacheKey, {
        data,
        timestamp: Date.now()
    });

    // Auto-cleanup: remove oldest entries if cache is too large (max 1000 entries)
    if (analysisCache.size > 1000) {
        const firstKey = analysisCache.keys().next().value;
        analysisCache.delete(firstKey);
    }
}

// Groq Bağlantısı
const openai = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: "https://api.groq.com/openai/v1"
});

app.post('/api/analyze', async (req, res) => {
    try {
        const { idea, language } = req.body;

        if (!idea) return res.status(400).json({ error: "Fikir boş olamaz." });

        // Check cache first (Analysis Enhancement #3)
        const cacheKey = getCacheKey(idea, language);
        const cachedResult = getCachedAnalysis(cacheKey);

        if (cachedResult) {
            console.log('✅ Returning cached analysis');
            return res.json({
                ...cachedResult,
                cached: true,
                cache_timestamp: analysisCache.get(cacheKey).timestamp
            });
        }

        // Tarihi dinamik alıyoruz
        const currentYear = new Date().getFullYear();

        // --- MASTER PROMPT (GROQ İÇİN OPTİMİZE EDİLDİ) ---
        const systemPrompt = language === 'tr'
            ? `GÖREV: Sen dünyanın en iyi Girişim Stratejisti, Veri Analisti ve Ürün Yöneticisisin. Şu an ${currentYear} yılındayız.

               🚨 KRİTİK MANTIK VE VERİ KURALLARI (KESİN UY):
               1. VERİ GÜNCELLİĞİ: Asla 2020-2021 verisi kullanma. Analizlerini 2024-2025 pazar verilerine dayandır.
               2. RAKİP METRİKLERİ: Rakiplerin (Woebot, Wysa vb.) güncel indirme/kullanıcı sayılarını kullan.
               3. TUTARLILIK: "Maliyet" bölümündeki süre tahmini ile "Yol Haritası" süresi BİREBİR AYNI olmalı.
               4. BAKIM MALİYETİ: Geliştirme + Aylık Sunucu + AI Token + Pazarlama giderlerini hesapla.
               5. GERÇEKÇİ GELİR: "İlk yıl 1 Milyon Dolar" gibi uçuk tahminler yapma. CAC düştükten sonraki net kârı hesapla.
               6. ÇOKLU PERSONA: En az 2 farklı Persona belirle.

               🚨 DİL: %100 Akıcı Türkçe.

               ÇIKTI FORMATI (Markdown - Detaylı):
               # 📊 Veri Odaklı Pazar Analizi (1-10)
               *(2024-2025 Pazar Büyüklüğü $, CAGR %)*
               # 📉 Teknik Zorluk, Bütçe ve Bakım Maliyeti
               *(Geliştirme + Aylık Giderler + Süre)*
               # ✨ Kritik İyileştirme Önerileri ve Maliyet Etkisi
               # 🎯 Hedef Kitle (Çoklu Persona)
               # ⚔️ Rekabet Analizi (Gerçekçi Metriklerle)
               # 💰 Gerçekçi Gelir Modeli ve CAC Analizi
               # 🛠 Teknik Stack ve Ölçeklenebilirlik
               # ⚖️ Etik Riskler ve Çözüm Stratejileri
               # 🚀 Gerçekçi Yol Haritası (Zaman Çizelgesi Uyumlu)
               # 💡 Son Karar ve Başarı KPI'ları`

            : `ROLE: World-class Startup Strategist. Current Year is ${currentYear}.

               🚨 CRITICAL RULES:
               1. DATA FRESHNESS: Use 2024-2025 Market Data.
               2. COMPETITOR ACCURACY: Use real-world, current user metrics.
               3. CONSISTENCY: Budget timeline MUST match Roadmap timeline.
               4. RUNNING COSTS: Include Server, AI Token, and Marketing costs.
               5. REALISTIC REVENUE: Deduct CAC from revenue. Be conservative.
               6. MULTI-PERSONA: Define at least 2 distinct Personas.

               🚨 LANGUAGE: 100% Fluent English.

               OUTPUT FORMAT (Markdown): 
               # 📊 Data-Driven Market Analysis (1-10)
               # 📉 Difficulty, Budget & Maintenance Costs
               # ✨ Critical Suggestions & Cost Impact
               # 🎯 Target Audience (Multi-Persona)
               # ⚔️ Competitive Analysis (With Real Metrics)
               # 💰 Realistic Revenue Model & CAC Analysis
               # 🛠 Tech Stack & Scalability
               # ⚖️ Ethics & Mitigation Strategies
               # 🚀 Realistic Roadmap (Time-Aligned)
               # 💡 Final Verdict & KPIs`;

        console.log(`Groq çalışıyor... (Model: llama-3.3-70b - Yıl: ${currentYear})`);

        // First get the detailed analysis
        const completion = await openai.chat.completions.create({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: `IDEA: ${idea}` }
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0.6,
            max_tokens: 4096
        });

        let analysis = completion.choices[0].message.content;

        // Get structured scoring (separate request for better accuracy)
        const scoringPrompt = language === 'tr'
            ? `Aşağıdaki startup fikri için detaylı skorlama yap. SADECE JSON formatında cevap ver, başka hiçbir metin ekleme.

Fikir: ${idea}

JSON formatı (SADECE bu formatı kullan):
{
  "overall_score": 7.5,
  "breakdown": {
    "market_size": 8,
    "competition": 6,
    "feasibility": 7,
    "profitability": 8,
    "innovation": 9,
    "timing": 7
  },
  "risk_level": "medium"
}`
            : `Score this startup idea in detail. Respond ONLY in JSON format, no other text.

Idea: ${idea}

JSON format (USE ONLY this format):
{
  "overall_score": 7.5,
  "breakdown": {
    "market_size": 8,
    "competition": 6,
    "feasibility": 7,
    "profitability": 8,
    "innovation": 9,
    "timing": 7
  },
  "risk_level": "medium"
}`;

        const scoringCompletion = await openai.chat.completions.create({
            messages: [
                { role: "user", content: scoringPrompt }
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0.3,
            max_tokens: 500
        });

        let scoringData = {};
        try {
            const scoringText = scoringCompletion.choices[0].message.content.trim();
            // Extract JSON from response (in case AI adds extra text)
            const jsonMatch = scoringText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                scoringData = JSON.parse(jsonMatch[0]);
            }
        } catch (err) {
            console.error('Scoring parse error:', err);
            // Fallback to basic scoring
            scoringData = {
                overall_score: 7.0,
                breakdown: {
                    market_size: 7,
                    competition: 7,
                    feasibility: 7,
                    profitability: 7,
                    innovation: 7,
                    timing: 7
                },
                risk_level: "medium"
            };
        }

        // Temizlik
        analysis = analysis.replace(/[\u4E00-\u9FFF\u3040-\u30FF\uAC00-\uD7AF\u0400-\u04FF]/g, "");

        const responseData = {
            result: analysis,
            scoring: scoringData
        };

        // Save to cache (Analysis Enhancement #3)
        setCachedAnalysis(cacheKey, responseData);
        console.log(`💾 Cached analysis for: ${idea.substring(0, 50)}...`);

        res.json(responseData);

    } catch (error) {
        console.error("HATA:", error);
        res.status(500).json({ error: "Yapay zeka hatası.", details: error.message });
    }
});

app.listen(port, () => {
    console.log(`🚀 Sunucu çalışıyor: http://localhost:${port}`);
});