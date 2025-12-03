// public/script.js (GÖRÜNÜRLÜK GARANTİLİ VERSİYON)

document.addEventListener('DOMContentLoaded', () => {
    console.log("Sayfa yüklendi.");

    const els = {
        input: document.getElementById('idea-input'),
        btn: document.getElementById('analyze-btn'),
        btnText: document.getElementById('btn-text'),
        spinner: document.getElementById('loading-spinner'),
        resultArea: document.getElementById('result-area'),
        resultText: document.getElementById('result-text'),
        langSelect: document.getElementById('lang-select'),
        themeBtn: document.getElementById('theme-toggle'),
        pdfBtn: document.getElementById('download-pdf-btn')
    };

    // Dil Ayarı
    let currentLang = 'tr';

    // Analiz Butonu
    if (els.btn) {
        els.btn.addEventListener('click', async () => {
            const text = els.input.value.trim();
            if (!text) return alert("Lütfen fikir girin.");

            // 1. Yükleniyor Modu
            els.btn.disabled = true;
            if(els.btnText) els.btnText.classList.add('hidden');
            if(els.spinner) els.spinner.classList.remove('hidden');
            
            // Sonuç alanını şimdilik gizle
            if(els.resultArea) els.resultArea.style.display = 'none';

            try {
                console.log("İstek gönderiliyor...");
                const response = await fetch('/api/analyze', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        idea: text, 
                        language: els.langSelect ? els.langSelect.value : 'tr' 
                    })
                });

                const data = await response.json();
                console.log("Cevap:", data); // Konsolda bunu görüyorsan sorun yok

                if (data.error) throw new Error(data.error);

                // 2. SONUCU EKRANA BAS (ZORLA GÖSTERME KISMI)
                if (els.resultText) {
                    // Marked kütüphanesi varsa kullan, yoksa düz bas
                    const htmlContent = (typeof marked !== 'undefined') ? marked.parse(data.result) : data.result;
                    els.resultText.innerHTML = htmlContent;
                }

                // GÖRÜNÜRLÜK AYARINI ZORLA AÇIYORUZ:
                if (els.resultArea) {
                    els.resultArea.classList.remove('hidden', 'opacity-0'); // Gizleyen classları sil
                    els.resultArea.style.display = 'block'; // CSS Display aç
                    els.resultArea.style.opacity = '1';     // Opaklığı aç
                    els.resultArea.style.visibility = 'visible'; // Görünürlüğü aç
                    
                    // Kaydır
                    setTimeout(() => {
                        els.resultArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }, 100);
                }

                // Geçmişe Kaydet
                saveToHistory(text);

            } catch (error) {
                console.error(error);
                alert("Hata: " + error.message);
            } finally {
                // Normale Dön
                els.btn.disabled = false;
                if(els.btnText) els.btnText.classList.remove('hidden');
                if(els.spinner) els.spinner.classList.add('hidden');
            }
        });
    }

    // PDF Butonu
    if (els.pdfBtn) {
        els.pdfBtn.addEventListener('click', () => {
            const element = document.getElementById('printable-content') || els.resultArea;
            const opt = {
                margin: 0.5,
                filename: 'Analiz.pdf',
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, backgroundColor: "#1f2937" },
                jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
            };
            if(typeof html2pdf !== 'undefined') html2pdf().set(opt).from(element).save();
        });
    }
    
    // Dark Mode
    if(els.themeBtn) {
        els.themeBtn.addEventListener('click', () => {
            document.documentElement.classList.toggle('dark');
        });
    }
});

// Geçmiş Fonksiyonları
function saveToHistory(idea) {
    let history = JSON.parse(localStorage.getItem('aiHistory') || '[]');
    const title = idea.length > 30 ? idea.substring(0, 30) + '...' : idea;
    if(!history.some(h=>h.title===title)) {
        history.unshift({title, date: new Date().toLocaleDateString()});
        localStorage.setItem('aiHistory', JSON.stringify(history));
        loadHistory();
    }
}

function loadHistory() {
    const list = document.getElementById('history-list');
    if(!list) return;
    const history = JSON.parse(localStorage.getItem('aiHistory') || '[]');
    list.innerHTML = history.map((h, i) => `
        <div class="p-2 border-b dark:border-gray-700 flex justify-between">
            <span class="text-sm dark:text-white">${h.title}</span>
            <button onclick="deleteH(${i})" class="text-red-500"><i class="fas fa-trash"></i></button>
        </div>
    `).join('');
}
window.deleteH = (i) => {
    let h = JSON.parse(localStorage.getItem('aiHistory'));
    h.splice(i, 1);
    localStorage.setItem('aiHistory', JSON.stringify(h));
    loadHistory();
};
// Sayfa açılınca geçmişi yükle
loadHistory();