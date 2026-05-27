/* ═══════════════════════════════════════════════════════════
   CYVEX XDR  —  i18n.js
   AR / EN translations — no external library
═══════════════════════════════════════════════════════════ */

const TRANSLATIONS = {
  en: {
    block1_label:     "SOC OVERVIEW",
    block2_label:     "AI PIPELINE",
    block3_label:     "THREAT INTEL",
    click_enter:      "CLICK TO ENTER",
    coming_soon:      "COMING SOON",
    soc_title_span:   "OVERVIEW",
    soc_sub:          "REAL-TIME GLOBAL CYBER DEFENSE COMMAND CENTER",
    threats_blocked:  "THREATS BLOCKED",
    active_incidents: "ACTIVE INCIDENTS",
    packets_sec:      "PACKETS / SEC",
    ai_confidence:    "AI CONFIDENCE",
    live_stream:      "live stream",
    critical:         "critical",
    inbound:          "inbound",
    attack_map:       "REAL-TIME GLOBAL ATTACK MAP",
    threat_feed:      "LIVE THREAT FEED",
    neural_corr:      "NEURAL CORRELATION",
    threat_radar:     "THREAT RADAR",
    ai_feed:          "AI DECISION FEED",
    cs_full_sub:      "Module under active development — launching soon",
  },
  ar: {
    block1_label:     "نظرة SOC",
    block2_label:     "خط الذكاء الاصطناعي",
    block3_label:     "استخبارات التهديد",
    click_enter:      "انقر للدخول",
    coming_soon:      "قريباً",
    soc_title_span:   "نظرة عامة",
    soc_sub:          "مركز الدفاع السيبراني العالمي — مباشر",
    threats_blocked:  "تهديدات محجوبة",
    active_incidents: "حوادث نشطة",
    packets_sec:      "حزمة / ثانية",
    ai_confidence:    "دقة الذكاء",
    live_stream:      "بث مباشر",
    critical:         "حرج",
    inbound:          "وارد",
    attack_map:       "خريطة الهجمات العالمية — مباشر",
    threat_feed:      "تغذية التهديدات المباشرة",
    neural_corr:      "الارتباط العصبي",
    threat_radar:     "رادار التهديدات",
    ai_feed:          "قرارات الذكاء الاصطناعي",
    cs_full_sub:      "الوحدة قيد التطوير — ستُطلق قريباً",
  }
};

let currentLang = 'en';

function setLang(lang) {
  currentLang = lang;
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';

  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    if (TRANSLATIONS[lang] && TRANSLATIONS[lang][key]) {
      el.textContent = TRANSLATIONS[lang][key];
    }
  });

  // Update active button
  document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById('btn-' + lang);
  if (btn) btn.classList.add('active');
}
