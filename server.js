// server.js (RENDER UYUMLU FİNAL)
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path'); // Yol bulucu eklendi
const OpenAI = require('openai');

const app = express();

// RENDER İÇİN KRİTİK AYAR: Portu otomatik al
const port = process.env.PORT || 3000; 

app.use(cors());
app.use(express.json());

// Frontend dosyalarını "public" klasöründen sun (Garanti Yöntem)
app.use(express.static(path.join(__dirname, 'public')));

// Ana sayfaya girince index.html'i zorla aç
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Groq Bağlantısı
const openai = new OpenAI({
    apiKey: process.env.GROQ_API_KEY, 
    baseURL: "https://api.groq.com/openai/v1" 
});

app.post('/api/analyze', async (req, res) => {
    try {
        const { idea, language } = req.body;

        if (!idea) return res.status(400).json({ error: "Fikir boş olamaz." });

        const systemPrompt = language === 'tr' 
            ? `GÖREV: Sen dünyanın en iyi Girişim Stratejisti ve Ürün Yöneticisisin.

               🚨 1. BAĞLAM ANALİZİ (MANTIK):
               - SENARYO A (YÜKSEK TEKNOLOJİ): Fikir AI, SaaS, App ise -> Stack: Python, React, AWS. Süre: 3-9 Ay.
               - SENARYO B (FİZİKSEL/BASİT): Fikir Kafe, Al-Sat, Stand ise -> Stack: Instagram, WhatsApp, Excel (Kodlama önerme!). Süre: Günler/Haftalar.

               🚨 2. DİL VE ÜSLUP:
               - Çıktı %100 AKICI ve DOĞAL TÜRKÇE olmalı.
               - "Necessary", "Features" gibi İngilizce kelimeleri kullanma.

               ÇIKTI FORMATI (Markdown):
               # 📊 İnovasyon ve Pazar Analizi (1-10)
               # 📉 Zorluk ve Maliyet Gerçeği (Bütçe & Süre)
               # ✨ Kritik İyileştirme Önerileri
               # 🎯 Hedef Kitle
               # ⚔️ Rekabet Analizi
               # 💰 Gelir Modeli ve Fiyatlandırma
               # 🛠 Teknik ve Operasyonel Araçlar
               # ⚖️ Etik ve Yasal Riskler
               # 🚀 Gerçekçi Yol Haritası
               # 💡 Son Karar`
            
            : `ROLE: World-class Startup Strategist.
               RULES: Classify idea (High Tech vs. Simple). Use realistic timeline.
               OUTPUT: Detailed Markdown in English.`;

        console.log(`Groq çalışıyor... Port: ${port}`);

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
        
        // Temizlik
        analysis = analysis.replace(/[\u4E00-\u9FFF\u3040-\u30FF\uAC00-\uD7AF\u0400-\u04FF]/g, "");

        res.json({ result: analysis });

    } catch (error) {
        console.error("HATA:", error);
        res.status(500).json({ error: "Yapay zeka hatası.", details: error.message });
    }
});

app.listen(port, () => {
    console.log(`🚀 Sunucu çalışıyor! Port: ${port}`);
});