// server.js (GROK GERİBİLDİRİMLERİ İLE GÜÇLENDİRİLMİŞ FİNAL VERSİYON)
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const openai = new OpenAI({
    apiKey: process.env.GROQ_API_KEY, 
    baseURL: "https://api.groq.com/openai/v1" 
});

app.post('/api/analyze', async (req, res) => {
    try {
        const { idea, language } = req.body;

        if (!idea) return res.status(400).json({ error: "Fikir boş olamaz." });

        // [GÜNCELLEME]: Dinamik tarih eklendi, böylece AI her zaman güncel yılı bilir.
        const currentYear = new Date().getFullYear(); 

        // --- MASTER PROMPT (GROK ELEŞTİRİLERİNE GÖRE GÜNCELLENDİ) ---
        const systemPrompt = language === 'tr' 
            ? `GÖREV: Sen dünyanın en iyi Girişim Stratejisti, Veri Analisti ve Ürün Yöneticisisin. Şu an ${currentYear} yılındayız.

               🚨 KRİTİK MANTIK VE VERİ KURALLARI (KESİN UY):
               1. VERİ GÜNCELLİĞİ (ÇOK ÖNEMLİ): Asla 2020-2021 verisi kullanma. Analizlerini 2024-2025 pazar verilerine dayandır. (Örn: AI pazarı 2020'de 62B$ değil, 2024'te çok daha büyüktür, bunu araştırarak yaz).
               2. RAKİP METRİKLERİ: Rakiplerin (Woebot, Wysa, Calm vb.) kullanıcı sayılarını tahmin ederken güncel verilere bak (Örn: Wysa 500K değil, 6M+ indirmeye sahip). Metrikleri düşük gösterme.
               3. TUTARLILIK: "Maliyet" bölümündeki süre tahmini ile "Yol Haritası" bölümündeki süre BİREBİR AYNI olmalı.
               4. BAKIM MALİYETİ: Sadece kodlama ücretini değil; Cloud (AWS/Google), LLM Token maliyetleri (OpenAI API vb.) ve Pazarlama giderlerini aylık olarak hesapla.
               5. GERÇEKÇİ GELİR (MUHAFAZAKAR OL): "İlk yıl 1 Milyon Dolar" gibi uçuk tahminler yapma. Yüksek CAC (Müşteri Edinme Maliyeti) düştükten sonraki net kârı hesapla.
               6. ÇOKLU PERSONA: Tek tip müşteri yok. En az 2 farklı Persona (Birincil ve İkincil Müşteri) için detay ver.

               🚨 DİL: %100 Akıcı Türkçe. Yabancı karakter yok.

               ÇIKTI FORMATI (Markdown - Detaylı):
               
               # 📊 Veri Odaklı Pazar Analizi (1-10)
               *(2024-2025 Pazar Büyüklüğü $, Güncel CAGR % ve Trend Verileri)*
               
               # 📉 Teknik Zorluk, Bütçe ve Bakım Maliyeti
               *(Geliştirme Maliyeti + Aylık Sunucu/API/Pazarlama Gideri + Süre Tutarlılığı)*
               
               # ✨ Kritik İyileştirme Önerileri ve Maliyet Etkisi
               *(Özelliği öner ama bunun maliyeti/süreyi nasıl artıracağını da belirt)*
               
               # 🎯 Hedef Kitle (Çoklu Persona)
               *(Persona 1: [Detaylı Profil], Persona 2: [Detaylı Profil])*
               
               # ⚔️ Rekabet Analizi (Gerçekçi Metriklerle)
               *(Rakiplerin GÜNCEL indirme/kullanıcı sayıları ve onlardan nasıl ayrışılacağı)*
               
               # 💰 Gerçekçi Gelir Modeli ve CAC Analizi
               *(Fiyatlandırma - (Yüksek Pazarlama Gideri + Operasyon) = Tahmini Net)*
               
               # 🛠 Teknik Stack ve Ölçeklenebilirlik
               *(100K+ kullanıcı için AWS/Docker/Kubernetes gibi somut teknolojiler)*
               
               # ⚖️ Etik Riskler ve Çözüm Stratejileri
               *(AI Bias, Veri Gizliliği ve Bağımlılık risklerine karşı somut çözümler)*
               
               # 🚀 Gerçekçi Yol Haritası (Zaman Çizelgesi Uyumlu)
               *(Ar-Ge, MVP ve Test süreçleri. Bütçe kısmındaki süreyle uyumlu olsun)*
               
               # 💡 Son Karar ve Başarı KPI'ları`
            
            : `ROLE: World-class Startup Strategist & Data Analyst. Current Year is ${currentYear}.

               🚨 CRITICAL LOGIC & DATA RULES:
               1. DATA FRESHNESS: Do NOT use data from 2020. Use 2024-2025 Market Data and CAGR projections.
               2. COMPETITOR ACCURACY: Use real-world, current user metrics for competitors (e.g., Don't underreport Wysa/Woebot user bases; use 2024 stats).
               3. CONSISTENCY CHECK: The timeline in "Budget" MUST match the "Roadmap" length completely.
               4. RUNNING COSTS: Include monthly Server, AI Token usage, and Marketing costs in the budget, not just development fees.
               5. REALISTIC REVENUE (BE CONSERVATIVE): Deduct high Customer Acquisition Cost (CAC) from revenue. Avoid over-optimistic "1M revenue in year 1" claims.
               6. MULTI-PERSONA: Define at least 2 distinct Target Personas.

               🚨 LANGUAGE: 100% Fluent English.

               OUTPUT FORMAT (Markdown - Detailed): 
               
               # 📊 Data-Driven Market Analysis (1-10)
               *(2024-2025 Market Size $, CAGR %, Trends)*
               
               # 📉 Difficulty, Budget & Maintenance Costs
               *(Dev Cost + Monthly Running Costs including API/Marketing + Consistent Timeline)*
               
               # ✨ Critical Suggestions & Cost Impact
               *(Feature suggestion + How it affects budget/time)*
               
               # 🎯 Target Audience (Multi-Persona)
               *(Persona 1 & Persona 2)*
               
               # ⚔️ Competitive Analysis (With Real Metrics)
               *(Compare using CURRENT estimated user base/downloads)*
               
               # 💰 Realistic Revenue Model & CAC Analysis
               *(Pricing - High CAC = Net Potential)*
               
               # 🛠 Tech Stack & Scalability
               *(Specific tools like AWS, K8s, Docker for 100k+ users)*
               
               # ⚖️ Ethics & Mitigation Strategies
               *(Risk + Concrete Solution)*
               
               # 🚀 Realistic Roadmap (Time-Aligned)
               *(Must match the duration in the Budget section exactly)*
               
               # 💡 Final Verdict & KPIs`;

        console.log(`Groq çalışıyor... (Grok Optimizasyonlu - Yıl: ${currentYear})`);

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

        // Temizlik
        analysis = analysis.replace(/[\u4E00-\u9FFF\u3040-\u30FF\uAC00-\uD7AF\u0400-\u04FF]/g, "");
        
        res.json({ result: analysis });

    } catch (error) {
        console.error("HATA:", error);
        res.status(500).json({ error: "Yapay zeka hatası.", details: error.message });
    }
});

app.listen(port, () => {
    console.log(`🚀 Sunucu çalışıyor: http://localhost:${port}`);
});