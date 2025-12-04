// server.js (EN & TR EŞİT KALİTE + BAĞLAM DUYARLI)
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Groq Bağlantısı
const openai = new OpenAI({
    apiKey: process.env.GROQ_API_KEY, 
    baseURL: "https://api.groq.com/openai/v1" 
});

app.post('/api/analyze', async (req, res) => {
    try {
        const { idea, language } = req.body;

        if (!idea) return res.status(400).json({ error: "Fikir boş olamaz." });

        // --- MASTER PROMPT (İKİ DİL İÇİN DE EŞİT DETAY) ---
        const trPrompt = `GÖREV: Sen dünyanın en iyi Girişim Stratejisti ve Ürün Yöneticisisin.

        🚨 1. BAĞLAM ANALİZİ (MANTIK):
        - SENARYO A (YÜKSEK TEKNOLOJİ): Fikir AI, SaaS, App ise -> Stack: Python, React, AWS. Süre: 3-9 Ay.
        - SENARYO B (FİZİKSEL/BASİT): Fikir Kafe, Al-Sat, Stand ise -> Stack: Instagram, WhatsApp, Excel (Kodlama önerme!). Süre: Günler/Haftalar.

        🚨 2. DİL VE ÜSLUP:
        - Çıktı %100 AKICI ve DOĞAL TÜRKÇE olmalı.
        - ASLA KISA CEVAP VERME. Her başlığı detaylı paragraflarla, neden-sonuç ilişkisi kurarak açıkla.

        ÇIKTI FORMATI (Markdown):
        # 📊 İnovasyon ve Pazar Analizi (1-10)
        # 📉 Zorluk ve Maliyet Gerçeği (Bütçe & Süre)
        # ✨ Kritik İyileştirme Önerileri (3 Somut Madde)
        # 🎯 Hedef Kitle (Detaylı Persona)
        # ⚔️ Rekabet Analizi (Gerçek Rakipler)
        # 💰 Gelir Modeli ve Fiyatlandırma (Rakamlı)
        # 🛠 Teknik ve Operasyonel Araçlar
        # ⚖️ Etik ve Yasal Riskler
        # 🚀 Gerçekçi Yol Haritası (Haftalık Plan)
        # 💡 Son Karar`;

        const enPrompt = `ROLE: You are the world's best Startup Strategist and Senior Product Manager.

        🚨 1. CONTEXT ANALYSIS (LOGIC):
        - SCENARIO A (HIGH TECH): If idea is AI, SaaS, App -> Stack: Python, React, AWS. Timeline: 3-9 Months.
        - SCENARIO B (PHYSICAL/SIMPLE): If idea is Cafe, Shop, Stand -> Stack: Instagram, WhatsApp, Excel (NO Coding!). Timeline: Days/Weeks.

        🚨 2. LANGUAGE & STYLE:
        - Output must be 100% FLUENT ENGLISH.
        - NEVER BE BRIEF. Explain every section with detailed paragraphs, just like a professional consultant report.

        OUTPUT FORMAT (Markdown): 
        # 📊 Innovation & Market Analysis (1-10)
        # 📉 Difficulty & Cost Reality (Budget & Time)
        # ✨ Critical Improvement Suggestions (3 Concrete Items)
        # 🎯 Target Audience (Detailed Persona)
        # ⚔️ Competitive Analysis (Real Rivals)
        # 💰 Revenue Model & Pricing (With Numbers)
        # 🛠 Technical & Operational Stack
        # ⚖️ Ethics & Legal Risks
        # 🚀 Realistic Roadmap (Weekly Plan)
        # 💡 Final Verdict`;

        // Dil Seçimine Göre Prompt Belirle
        const systemPrompt = language === 'tr' ? trPrompt : enPrompt;

        console.log(`Groq çalışıyor... Dil: ${language}`);

        const completion = await openai.chat.completions.create({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: `IDEA: ${idea}` }
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0.7, 
            max_tokens: 4096 
        });

        let analysis = completion.choices[0].message.content;

        // TEMİZLİK (Asya karakterleri vb.)
        analysis = analysis.replace(/[\u4E00-\u9FFF\u3040-\u30FF\uAC00-\uD7AF\u0400-\u04FF]/g, "");
        
        console.log("Cevap gönderildi.");
        res.json({ result: analysis });

    } catch (error) {
        console.error("HATA:", error);
        res.status(500).json({ error: "Yapay zeka hatası.", details: error.message });
    }
});

app.listen(port, () => {
    console.log(`🚀 Sunucu çalışıyor: http://localhost:${port}`);
});