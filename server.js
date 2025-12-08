// server.js (DEBUG MODU - HATAYI BULAN VERSİYON)
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// --- DEDEKTİF KISMI ---
console.log("------------------------------------------------");
console.log("1. Sunucu Başlatılıyor...");
if (!process.env.GEMINI_API_KEY) {
    console.error("🚨 HATA: .env dosyası okunamadı veya GEMINI_API_KEY eksik!");
    console.error("   Lütfen .env dosyanı kontrol et.");
} else {
    console.log("✅ API Key başarıyla okundu. (İlk 5 hane):", process.env.GEMINI_API_KEY.substring(0, 5) + "...");
}
console.log("------------------------------------------------");

// Modeli 'flash' yapalım, en garantisi budur.
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

app.post('/api/analyze', async (req, res) => {
    console.log("📩 Site üzerinden yeni bir istek geldi!"); // Bunu görmelisin
    
    try {
        const { idea, language } = req.body;
        console.log("📝 Analiz edilecek fikir:", idea);

        const currentYear = new Date().getFullYear(); 
        
        const systemPrompt = `Sen bir girişim uzmanısın. Yıl: ${currentYear}. Fikri analiz et. Kısa ve net ol.`;

        console.log("🤖 Gemini'ye bağlanılıyor...");
        const result = await model.generateContent(systemPrompt + " Fikir: " + idea);
        const response = await result.response;
        const text = response.text();
        
        console.log("✅ Gemini cevap verdi!");
        res.json({ result: text });

    } catch (error) {
        console.error("🚨 KRİTİK HATA OLUŞTU:");
        console.error(error); // Buradaki hatayı bana kopyala
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, () => {
    console.log(`🚀 Sunucu çalışıyor: http://localhost:${port}`);
});;