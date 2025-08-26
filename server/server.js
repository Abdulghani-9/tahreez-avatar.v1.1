/** Node backend for Proto Avatar **/
const express = require('express');
const multer = require('multer');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));

const upload = multer({ storage: multer.memoryStorage() });
app.post('/api/stt', upload.single('audio'), async (req, res) => {
  try {
    const lang = (req.body.lang || 'en-US');
    // TODO: Wire a real STT service here (Google/Azure/Deepgram).
    const dummy = (lang.startsWith('ar') ? 'ما هي شركة تحريز؟' : 'What does Tahreez do?');
    return res.json({ text: dummy });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'stt_failed' });
  }
});

app.post('/api/ask', async (req, res) => {
  try {
    const { q, lang } = req.body;
    const L = (lang||'en').startsWith('ar') ? 'ar' : 'en';
    const ql = (q||'').toLowerCase();
    const KB = {
      en: {
        intro: "Tahreez is a security and digital solutions company focused on asset protection, AV/digital signage, and healthcare tech integrations across KSA.",
        gm: "The General Manager information comes from the Tahreez overview (please index the PDF for accuracy).",
        biz: "Business lines include asset protection solutions, AV & LED/signage systems, and digital health integrations."
      },
      ar: {
        intro: "تحريز شركة حلول أمنية ورقمية تركّز على حماية الأصول وأنظمة AV/الشاشات الرقمية والتكاملات الصحية الرقمية في المملكة.",
        gm: "بيانات المدير العام تؤخذ من مستند التعريف بالشركة (يُفضّل فهرسة الـPDF لضمان الدقة).",
        biz: "مجالات العمل تشمل حلول حماية الأصول، أنظمة الصوتيات والمرئيات والشاشات، والتكاملات الصحية الرقمية."
      }
    };
    let answer = L === 'ar' ? "عذرًا، أحتاج مزيدًا من المعلومات." : "Sorry, could you clarify?";
    if (ql.includes('what') || ql.includes('do') || ql.includes('about') || ql.includes('تحريز') || ql.includes('عن')) answer = KB[L].intro;
    if (ql.includes('manager') || ql.includes('gm') || ql.includes('general') || ql.includes('مدير')) answer = KB[L].gm;
    if (ql.includes('business') || ql.includes('lines') || ql.includes('fields') || ql.includes('مجالات') || ql.includes('الأعمال')) answer = KB[L].biz;
    return res.json({ text: answer });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'qa_failed' });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log('Server on http://localhost:' + PORT));
