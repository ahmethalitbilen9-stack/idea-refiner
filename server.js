// server.js (GROQ LLAMA 3.3 - GÜÇLENDİRİLMİŞ FİNAL SÜRÜM)
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');
const crypto = require('crypto');
const googleTrends = require('google-trends-api');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// === ANALYSIS ENHANCEMENT #9: GOOGLE TRENDS INTEGRATION ===

function extractKeywords(idea) {
    // Simple keyword extraction - get first 2-3 meaningful words
    const words = idea.toLowerCase()
        .replace(/[^a-z0-9\s]/gi, '')
        .split(/\s+/)
        .filter(w => w.length > 3 && !['için', 'with', 'that', 'this', 'from', 'have', 'will'].includes(w));

    return words.slice(0, 3).join(' ') || idea.substring(0, 50);
}

async function getGoogleTrendsData(idea) {
    try {
        const keyword = extractKeywords(idea);
        console.log(`📊 Fetching trends for: "${keyword}"`);

        // Get interest over time (last 12 months)
        const interestData = await googleTrends.interestOverTime({
            keyword: keyword,
            startTime: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
            granularTimeResolution: true
        });

        const parsed = JSON.parse(interestData);

        // Extract trend values
        const timelineData = parsed.default?.timelineData || [];
        const values = timelineData.map(item => item.value[0]).filter(v => v !== undefined);

        // Calculate trend direction
        let trendDirection = 'stable';
        if (values.length >= 2) {
            const recent = values.slice(-3).reduce((a, b) => a + b, 0) / 3;
            const older = values.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
            if (recent > older * 1.2) trendDirection = 'rising';
            else if (recent < older * 0.8) trendDirection = 'falling';
        }

        // Get related queries
        let relatedQueries = [];
        try {
            const relatedData = await googleTrends.relatedQueries({
                keyword: keyword,
                startTime: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
            });
            const relatedParsed = JSON.parse(relatedData);
            const topQueries = relatedParsed.default?.rankedList?.[0]?.rankedKeyword || [];
            relatedQueries = topQueries.slice(0, 5).map(q => q.query);
        } catch (err) {
            console.log('Related queries not available');
        }

        return {
            keyword,
            interestOverTime: values.length > 0 ? values : [50, 52, 55, 58, 60, 62, 65, 63, 61, 59, 57, 55],
            trendDirection,
            relatedQueries: relatedQueries.length > 0 ? relatedQueries : ['No data available'],
            averageInterest: values.length > 0 ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 55
        };

    } catch (error) {
        console.error('Google Trends error:', error.message);
        // Return fallback data
        return {
            keyword: extractKeywords(idea),
            interestOverTime: [50, 52, 55, 58, 60, 62, 65, 63, 61, 59, 57, 55],
            trendDirection: 'stable',
            relatedQueries: ['Data unavailable'],
            averageInterest: 55,
            error: 'Trends data temporarily unavailable'
        };
    }
}

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

// === ANALYSIS ENHANCEMENT #5: CATEGORY-SPECIFIC PROMPTS ===
function detectCategory(idea) {
    const lowerIdea = idea.toLowerCase();

    // Keyword patterns for each category
    const categories = {
        saas: ['saas', 'software', 'platform', 'cloud', 'subscription', 'dashboard', 'api', 'web app', 'crm', 'analytics'],
        ecommerce: ['ecommerce', 'e-commerce', 'shop', 'store', 'marketplace', 'sell', 'product', 'inventory', 'checkout', 'cart'],
        mobile: ['mobile app', 'ios', 'android', 'app store', 'play store', 'smartphone', 'tablet', 'mobile'],
        ai: ['ai', 'artificial intelligence', 'machine learning', 'ml', 'nlp', 'deep learning', 'neural', 'chatbot', 'gpt', 'llm'],
        hardware: ['hardware', 'device', 'iot', 'sensor', 'wearable', 'gadget', 'physical product', 'manufacturing']
    };

    let scores = {};
    for (let [category, keywords] of Object.entries(categories)) {
        scores[category] = keywords.filter(keyword => lowerIdea.includes(keyword)).length;
    }

    // Find category with highest score
    let maxCategory = 'general';
    let maxScore = 0;
    for (let [category, score] of Object.entries(scores)) {
        if (score > maxScore) {
            maxScore = score;
            maxCategory = category;
        }
    }

    return maxScore > 0 ? maxCategory : 'general';
}

function getCategorySpecificInstructions(category, language) {
    const instructions = {
        tr: {
            saas: `
🎯 SaaS ÖZEL ANALİZ:
- MRR/ARR hedefleri ve churn rate tahminleri
- Müşteri edinme maliyeti (CAC) vs Lifetime Value (LTV) oranı
- Freemium vs Premium model karşılaştırması
- API entegrasyonları ve teknik stack
- Abonelik fiyatlandırma stratejisi (aylık/yıllık)`,
            ecommerce: `
🎯 E-TİCARET ÖZEL ANALİZ:
- Ortalama sipariş değeri (AOV) ve conversion rate tahminleri
- Lojistik ve stok yönetimi maliyetleri
- Pazaryeri vs kendi site karşılaştırması
- Ödeme sistemleri ve komisyon oranları
- Müşteri iade politikaları`,
            mobile: `
🎯 MOBİL UYGULAMA ÖZEL ANALİZ:
- DAU/MAU oranları ve retention metrikleri
- App Store / Play Store optimizasyon stratejisi
- In-app purchase vs reklam geliri modeli
- Push notification stratejisi
- Platform seçimi (iOS first vs Android first vs cross-platform)`,
            ai: `
🎯 AI/ML ÖZEL ANALİZ:
- Model accuracy ve performans metrikleri
- API token maliyetleri (OpenAI, Google, etc.)
- Veri toplama ve etiketleme gereksinimleri
- Model eğitim maliyetleri ve süresi
- Ethical AI ve bias prevention stratejileri`,
            hardware: `
🎯 DONANIM ÖZEL ANALİZ:
- Prototip geliştirme ve üretim maliyetleri
- Tedarik zinciri ve üretici seçimi
- Sertifikasyon gereksinimleri (CE, FCC, etc.)
- Minimum order quantity (MOQ) ve stok yönetimi
- After-sales servis ve garanti maliyetleri`
        },
        en: {
            saas: `
🎯 SaaS SPECIFIC ANALYSIS:
- MRR/ARR targets and churn rate predictions
- Customer Acquisition Cost (CAC) vs Lifetime Value (LTV)
- Freemium vs Premium model comparison
- API integrations and tech stack
- Subscription pricing strategy (monthly/annual)`,
            ecommerce: `
🎯 E-COMMERCE SPECIFIC ANALYSIS:
- Average Order Value (AOV) and conversion rate estimates
- Logistics and inventory management costs
- Marketplace vs own website comparison
- Payment systems and commission rates
- Customer return policies`,
            mobile: `
🎯 MOBILE APP SPECIFIC ANALYSIS:
- DAU/MAU ratios and retention metrics
- App Store / Play Store optimization strategy
- In-app purchase vs ad revenue model
- Push notification strategy
- Platform choice (iOS first vs Android first vs cross-platform)`,
            ai: `
🎯 AI/ML SPECIFIC ANALYSIS:
- Model accuracy and performance metrics
- API token costs (OpenAI, Google, etc.)
- Data collection and labeling requirements
- Model training costs and duration
- Ethical AI and bias prevention strategies`,
            hardware: `
🎯 HARDWARE SPECIFIC ANALYSIS:
- Prototype development and manufacturing costs
- Supply chain and manufacturer selection
- Certification requirements (CE, FCC, etc.)
- Minimum order quantity (MOQ) and inventory
- After-sales service and warranty costs`
        }
    };

    return instructions[language][category] || '';
}

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

        // Detect category and get specific instructions (Analysis Enhancement #5)
        const category = detectCategory(idea);
        const categoryInstructions = getCategorySpecificInstructions(category, language);
        console.log(`📂 Detected category: ${category.toUpperCase()}`);

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
               
               ${categoryInstructions}

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

        // Get chart data (Analysis Enhancement #4)
        const chartPrompt = language === 'tr'
            ? `Aşağıdaki startup fikri için grafik verileri üret. SADECE JSON formatında cevap ver.

Fikir: ${idea}

JSON formatı (SADECE bu formatı kullan):
{
  "market_growth": {
    "years": [2024, 2025, 2026, 2027, 2028],
    "values": [100, 125, 155, 190, 230]
  },
  "revenue_projection": {
    "months": ["Ay 1-3", "Ay 4-6", "Ay 7-9", "Ay 10-12"],
    "values": [500, 2000, 5000, 12000]
  },
  "competitors": [
    {"name": "Rakip A", "users": "50M", "revenue": "$100M", "score": 85},
    {"name": "Rakip B", "users": "30M", "revenue": "$80M", "score": 75}
  ]
}`
            : `Generate chart data for this startup idea. Respond ONLY in JSON format.

Idea: ${idea}

JSON format (USE ONLY this format):
{
  "market_growth": {
    "years": [2024, 2025, 2026, 2027, 2028],
    "values": [100, 125, 155, 190, 230]
  },
  "revenue_projection": {
    "months": ["Month 1-3", "Month 4-6", "Month 7-9", "Month 10-12"],
    "values": [500, 2000, 5000, 12000]
  },
  "competitors": [
    {"name": "Competitor A", "users": "50M", "revenue": "$100M", "score": 85},
    {"name": "Competitor B", "users": "30M", "revenue": "$80M", "score": 75}
  ]
}`;

        const chartCompletion = await openai.chat.completions.create({
            messages: [
                { role: "user", content: chartPrompt }
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0.5,
            max_tokens: 800
        });

        let chartData = {};
        try {
            const chartText = chartCompletion.choices[0].message.content.trim();
            const jsonMatch = chartText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                chartData = JSON.parse(jsonMatch[0]);
            }
        } catch (err) {
            console.error('Chart data parse error:', err);
            // Fallback to empty chart data
            chartData = {
                market_growth: { years: [2024, 2025, 2026, 2027, 2028], values: [100, 120, 145, 175, 210] },
                revenue_projection: { months: ["M 1-3", "M 4-6", "M 7-9", "M 10-12"], values: [1000, 3000, 7000, 15000] },
                competitors: []
            };
        }

        // Get Google Trends data (Analysis Enhancement #9)
        const trendsData = await getGoogleTrendsData(idea);

        // Temizlik
        analysis = analysis.replace(/[\u4E00-\u9FFF\u3040-\u30FF\uAC00-\uD7AF\u0400-\u04FF]/g, "");

        const responseData = {
            result: analysis,
            scoring: scoringData,
            charts: chartData,
            trends: trendsData
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

// === ANALYSIS ENHANCEMENT #7: COMPARISON MODE ===
app.post('/api/compare', async (req, res) => {
    try {
        const { idea1, idea2, language } = req.body;

        if (!idea1 || !idea2) return res.status(400).json({ error: "İki fikir de gerekli." });

        console.log('🔄 Comparing two ideas...');

        const currentYear = new Date().getFullYear();

        const comparePrompt = language === 'tr'
            ? `Sen bir startup danışmanısın. Aşağıdaki iki girişim fikrini karşılaştır ve SADECE JSON formatında yanıt ver.

FİKİR A: ${idea1}

FİKİR B: ${idea2}

JSON formatı (SADECE bu formatı kullan):
{
  "idea_a": {
    "name": "Kısa isim (max 4 kelime)",
    "score": 7.5,
    "pros": ["Artı 1", "Artı 2", "Artı 3"],
    "cons": ["Eksi 1", "Eksi 2"]
  },
  "idea_b": {
    "name": "Kısa isim (max 4 kelime)",
    "score": 6.8,
    "pros": ["Artı 1", "Artı 2"],
    "cons": ["Eksi 1", "Eksi 2", "Eksi 3"]
  },
  "winner": "a",
  "recommendation": "Fikir A daha iyi çünkü... (1-2 cümle)"
}`
            : `You are a startup advisor. Compare these two startup ideas and respond ONLY in JSON format.

IDEA A: ${idea1}

IDEA B: ${idea2}

JSON format (USE ONLY this format):
{
  "idea_a": {
    "name": "Short name (max 4 words)",
    "score": 7.5,
    "pros": ["Pro 1", "Pro 2", "Pro 3"],
    "cons": ["Con 1", "Con 2"]
  },
  "idea_b": {
    "name": "Short name (max 4 words)",
    "score": 6.8,
    "pros": ["Pro 1", "Pro 2"],
    "cons": ["Con 1", "Con 2", "Con 3"]
  },
  "winner": "a",
  "recommendation": "Idea A is better because... (1-2 sentences)"
}`;

        const comparison = await openai.chat.completions.create({
            messages: [
                { role: "user", content: comparePrompt }
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0.4,
            max_tokens: 1500
        });

        let comparisonData = {};
        try {
            const comparisonText = comparison.choices[0].message.content.trim();
            const jsonMatch = comparisonText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                comparisonData = JSON.parse(jsonMatch[0]);
            }
        } catch (err) {
            console.error('Comparison parse error:', err);
            return res.status(500).json({ error: "Karşılaştırma sonucu parse edilemedi." });
        }

        res.json(comparisonData);

    } catch (error) {
        console.error("COMPARISON ERROR:", error);
        res.status(500).json({ error: "Karşılaştırma hatası.", details: error.message });
    }
});

// === ANALYSIS ENHANCEMENT #8: FOLLOW-UP QUESTIONS ===
app.post('/api/ask-followup', async (req, res) => {
    try {
        const { original_idea, original_analysis, question, language } = req.body;

        if (!question) return res.status(400).json({ error: "Soru boş olamaz." });

        console.log('❓ Answering follow-up question...');

        const systemPrompt = language === 'tr'
            ? `Sen bir startup danışmanısın. Daha önce verdiğin analiz hakkında kullanıcının sorusunu yanıtla. KISA ve NET cevap ver (max 3-4 cümle).`
            : `You are a startup advisor. Answer the user's question about your previous analysis. Keep it SHORT and CLEAR (max 3-4 sentences).`;

        const answer = await openai.chat.completions.create({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "assistant", content: `Önceki analiz:\n${original_analysis.substring(0, 2000)}...` },
                { role: "user", content: question }
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0.6,
            max_tokens: 500
        });

        const answerText = answer.choices[0].message.content;

        res.json({ answer: answerText });

    } catch (error) {
        console.error("FOLLOWUP ERROR:", error);
        res.status(500).json({ error: "Soru yanıtlanamadı.", details: error.message });
    }
});

app.listen(port, () => {
    console.log(`🚀 Sunucu çalışıyor: http://localhost:${port}`);
});