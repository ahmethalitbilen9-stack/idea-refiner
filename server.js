// server.js (GARANTİ ÇALIŞAN - GEMINI PRO VERSİYONU)
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Gemini Kurulumu
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// [DEĞİŞİKLİK BURADA]: En standart model olan "gemini-pro"yu seçtik.
// Bu model her yerde çalışır.
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

app.post('/api/analyze', async (req, res) => {
    try {
        const { idea, language } = req.body;

        if (!idea) return res.status(400).json({ error: "Fikir boş olamaz." });

        const currentYear = new Date().getFullYear(); 

        // --- MASTER PROMPT ---
        const systemPrompt = language === 'tr' 
            ? `GÖREV: Sen dünyanın en iyi Girişim Stratejisti ve Veri Analistisin. Yıl: ${currentYear}.

               🚨 ANALİZ KURALLARI:
               1. VERİLER GÜNCEL OLSUN: 2024-2025 verilerini ve trendlerini kullan.
               2. GERÇEKÇİ OL: Gelir tahminlerinde uçuk rakamlar verme, maliyetleri (sunucu, pazarlama) hesaba kat.
               3. RAKİPLER: Güncel rakipleri ve onların gerçek durumlarını analiz et.
               4. FORMAT: Aşağıdaki başlıkları kullanarak detaylı Markdown formatında yaz.

               ÇIKTI BAŞLIKLARI:
               # 📊 Veri Odaklı Pazar Analizi
               # 📉 Teknik Zorluk ve Gerçekçi Bütçe
               # ✨ Kritik İyileştirme Önerileri
               # 🎯 Hedef Kitle (Persona Analizi)
               # ⚔️ Rekabet Analizi
               # 💰 Gelir Modeli ve Kârlılık
               # 🛠 Teknik Stack
               # ⚖️ Etik Riskler
               # 🚀 Yol Haritası
               # 💡 Sonuç`
            
            : `ROLE: World-class Startup Strategist. Year: ${currentYear}.

               🚨 RULES:
               1. DATA FRESHNESS: Use 2024-2025 Market Data.
               2. BE REALISTIC: Include marketing/server costs in budget. Be conservative with revenue.
               3. COMPETITORS: Use real-world current competitors.
               4. FORMAT: Use the headers below in Markdown.

               OUTPUT HEADERS: 
               # 📊 Data-Driven Market Analysis
               # 📉 Difficulty & Budget
               # ✨ Critical Suggestions
               # 🎯 Target Audience
               # ⚔️ Competitive Analysis
               # 💰 Revenue Model
               # 🛠 Tech Stack
               # ⚖️ Ethics
               # 🚀 Roadmap
               # 💡 Verdict`;

        console.log(`Gemini çalışıyor... (Model: gemini-pro - Yıl: ${currentYear})`);

        // Promptları birleştirip gönderiyoruz (En güvenli yöntem)
        const finalPrompt = `${systemPrompt}\n\nANALİZ EDİLECEK FİKİR: ${idea}`;

        const result = await model.generateContent(finalPrompt);
        const response = await result.response;
        let analysis = response.text();

        // Temizlik
        analysis = analysis.replace(/[\u4E00-\u9FFF\u3040-\u30FF\uAC00-\uD7AF\u0400-\u04FF]/g, "");
        
        res.json({ result: analysis });

    } catch (error) {
        console.error("HATA:", error);
        // Hatanın detayını kullanıcıya da gösterelim ki anlayalım
        res.status(500).json({ error: "Yapay zeka hatası.", details: error.message });
    }
});

app.listen(port, () => {
    console.log(`🚀 Sunucu çalışıyor: http://localhost:${port}`);
});