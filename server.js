// server.js (GROK ANALİZİNE GÖRE GÜÇLENDİRİLMİŞ VERSİYON)
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

        // --- MASTER PROMPT (GROK ELEŞTİRİLERİNE GÖRE GÜNCELLENDİ) ---
        const systemPrompt = language === 'tr' 
            ? `GÖREV: Sen dünyanın en iyi Girişim Stratejisti, Veri Analisti ve Ürün Yöneticisisin.

               🚨 KRİTİK MANTIK VE VERİ KURALLARI (BUNLARA UY):
               1. VERİ ODAKLI OL: Pazar analizi yaparken genel konuşma. Sektörün tahmini büyüklüğünü ($ Milyar) ve Büyüme Oranını (CAGR %) ver.
               2. TUTARLILIK: "Maliyet" bölümündeki süre tahmini ile "Yol Haritası" bölümündeki süre BİREBİR AYNI olmalı. (Örn: Maliyet 6 ay diyorsa, Roadmap 4 hafta olamaz, 24 hafta olmalı).
               3. BAKIM MALİYETİ: Sadece geliştirme ücretini değil, aylık "Sunucu, AI Token ve Bakım" giderlerini de hesapla.
               4. GERÇEKÇİ GELİR: "İlk yıl 1 Milyon Dolar" gibi uçuk tahminler yapma. Pazarlama bütçesi (CAC) düştükten sonraki gerçekçi kârı tahmin et.
               5. ÇOKLU PERSONA: Tek bir hedef kitle yazma. En az 2 farklı Persona (Birincil ve İkincil Müşteri) belirle.

               🚨 DİL: %100 Akıcı Türkçe. Yabancı karakter yok.

               ÇIKTI FORMATI (Markdown - Detaylı):
               
               # 📊 Veri Odaklı Pazar Analizi (1-10)
               *(Pazar Büyüklüğü $, CAGR % ve Trend Verileri ile)*
               
               # 📉 Teknik Zorluk, Bütçe ve Bakım Maliyeti
               *(Geliştirme Maliyeti + Aylık Bakım Gideri + Süre Tutarlılığı)*
               
               # ✨ Kritik İyileştirme Önerileri ve Maliyet Etkisi
               *(Özelliği öner ama bunun maliyeti/süreyi nasıl etkileyeceğini de yaz)*
               
               # 🎯 Hedef Kitle (Çoklu Persona)
               *(Persona 1: [Detay], Persona 2: [Detay])*
               
               # ⚔️ Rekabet Analizi (Metriklerle)
               *(Rakiplerin tahmini kullanıcı sayıları veya gelirleri ile kıyasla)*
               
               # 💰 Gerçekçi Gelir Modeli ve CAC Analizi
               *(Fiyatlandırma - Müşteri Edinme Maliyeti = Tahmini Net)*
               
               # 🛠 Teknik Stack ve Ölçeklenebilirlik
               *(Kullanıcı sayısı artınca sistem nasıl büyüyecek?)*
               
               # ⚖️ Etik Riskler ve Çözüm Stratejileri
               *(Sadece riski yazma, nasıl çözüleceğini de yaz. Örn: AI Bias için veri temizliği)*
               
               # 🚀 Gerçekçi Yol Haritası (Zaman Çizelgesi Uyumlu)
               *(Ar-Ge süresini uzun tut. Maliyet bölümündeki süreyle aynı uzunlukta olsun)*
               
               # 💡 Son Karar ve Başarı KPI'ları`
            
            : `ROLE: World-class Startup Strategist & Data Analyst.

               🚨 CRITICAL LOGIC & DATA RULES:
               1. BE DATA-DRIVEN: Include estimated Market Size ($ Billions) and Growth Rate (CAGR %).
               2. CONSISTENCY CHECK: The timeline in "Budget" MUST match the "Roadmap" length. (e.g., Don't say 6 months budget and 4 weeks roadmap).
               3. MAINTENANCE COST: Include monthly Server, AI Token, and Maintenance costs, not just dev costs.
               4. REALISTIC REVENUE: Deduct Customer Acquisition Cost (CAC) from revenue. Don't be overly optimistic.
               5. MULTI-PERSONA: Define at least 2 distinct Target Personas.

               🚨 LANGUAGE: 100% Fluent English.

               OUTPUT FORMAT (Markdown - Detailed): 
               
               # 📊 Data-Driven Market Analysis (1-10)
               *(Include Market Size $, CAGR %, Trends)*
               
               # 📉 Difficulty, Budget & Maintenance Costs
               *(Dev Cost + Monthly Running Costs + Consistent Timeline)*
               
               # ✨ Critical Suggestions & Cost Impact
               *(Feature suggestion + How it affects budget/time)*
               
               # 🎯 Target Audience (Multi-Persona)
               *(Persona 1 & Persona 2)*
               
               # ⚔️ Competitive Analysis (With Metrics)
               *(Compare using estimated user base or revenue)*
               
               # 💰 Realistic Revenue Model & CAC Analysis
               *(Pricing - CAC = Net Potential)*
               
               # 🛠 Tech Stack & Scalability
               *(How to handle 100k+ users?)*
               
               # ⚖️ Ethics & Mitigation Strategies
               *(Risk + Solution)*
               
               # 🚀 Realistic Roadmap (Time-Aligned)
               *(Must match the duration in the Budget section)*
               
               # 💡 Final Verdict & KPIs`;

        console.log(`Groq çalışıyor... (Grok Optimizasyonlu)`);

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