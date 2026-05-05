// ─── Translations ────────────────────────────────────────────────────────────
const translations = {
  en: {
    // Nav
    "nav.home":    "Home",
    "nav.about":   "About",
    "nav.contact": "Contact",
    "nav.login":   "Login",
    "nav.signup":  "Sign Up",

    // Hero
    "hero.tagline":     "Your future starts here",
    "hero.title":       "Manage your academic life ",
    "hero.title.span":  "effortlessly",
    "hero.desc":        "An integrated platform for students and teachers to organize schedules, track grades, and communicate effectively — all in one place. We give you the tools you need to succeed.",
    "hero.cta.primary":   "Get Started",
    "hero.cta.secondary": "Explore Features",
    "hero.join":          "Join ECCAT students",

    // Features
    "features.heading":  "Our Smart Features",
    "features.subtext":  "Advanced tech solutions designed specifically to simplify learning and boost academic performance.",

    "card1.title": "Smart Attendance",
    "card1.desc":  "An advanced automated system for recording attendance using modern technologies that ensure accuracy and save lecture time.",
    "card1.read":  "Read more",

    "card2.title": "Grade Tracking",
    "card2.desc":  "Comprehensive and analytical display of your GPA and test results with instant notifications when new results are published.",
    "card2.read":  "Read more",

    "card3.title": "Study Materials",
    "card3.desc":  "An organized digital library for quick access to all lectures, study files, and interactive books at any time.",
    "card3.read":  "Read more",

    // Footer
    "footer.desc":          "The leading educational platform in the region, striving to provide the best digital learning experience through innovative and smart tools.",
    "footer.quicklinks":    "Quick Links",
    "footer.link.home":     "Home",
    "footer.link.features": "Features",
    "footer.link.about":    "About",
    "footer.link.contact":  "Contact us",
    "footer.support":       "Support",
    "footer.faq":           "FAQ",
    "footer.privacy":       "Privacy Policy",
    "footer.terms":         "Terms of Service",
    "footer.help":          "Help Center",
    "footer.stay":          "Stay Connected",
    "footer.newsletter":    "Join our newsletter to get the latest updates.",
    "footer.email.placeholder": "Email address",
    "footer.subscribe":     "Subscribe",
    "footer.copy":          "© 2024 All rights reserved to Eccat One. Built with love.",

    // Lang switcher label
    "lang.switch": "عربي",
  },

  ar: {
    // Nav
    "nav.home":    "الرئيسية",
    "nav.about":   "حول المنصة",
    "nav.contact": "من نحن",
    "nav.login":   "تسجيل الدخول",
    "nav.signup":  "إنشاء حساب",

    // Hero
    "hero.tagline":     "مستقبلك يبدأ من هنا",
    "hero.title":       "إدارة حياتك الأكاديمية ",
    "hero.title.span":  "بسلاسة",
    "hero.desc":        "منصة متكاملة للطلاب والمدرسين لتنظيم الجداول، تتبع الدرجات، والتواصل الفعال في مكان واحد. نوفر لك الأدوات اللازمة للنجاح في مسيرتك التعليمية.",
    "hero.cta.primary":   "ابدأ الآن",
    "hero.cta.secondary": "اكتشف الميزات",
    "hero.join":          "انضم الي طلاب ECCAT",

    // Features
    "features.heading":  "مميزاتنا الذكيه",
    "features.subtext":  "نقدم حلولاً تقنية متطورة صممت خصيصاً لتسهيل العملية التعليمية ورفع كفاءة التحصيل الدراسي",

    "card1.title": "التحضير الذكي",
    "card1.desc":  "نظام آلي متطور لتسجيل الحضور والغياب باستخدام تقنيات حديثة تضمن الدقة وتوفر وقت المحاضرة.",
    "card1.read":  "اقرأ المزيد",

    "card2.title": "تتبع الدرجات",
    "card2.desc":  "عرض شامل وتحليلي لمعدلك التراكمي ونتائج الاختبارات مع تنبيهات فورية عند صدور أي نتائج جديدة.",
    "card2.read":  "اقرأ المزيد",

    "card3.title": "المواد الدراسية",
    "card3.desc":  "مكتبة رقمية منظمة تتيح الوصول السريع لجميع المحاضرات والملفات الدراسية والكتب التفاعلية في أي وقت.",
    "card3.read":  "اقرأ المزيد",

    // Footer
    "footer.desc":          "المنصة التعليمية الرائدة في المنطقة، نسعى لتوفير أفضل تجربة تعليمية رقمية لطلابنا ومدرسينا من خلال أدوات مبتكرة وذكية.",
    "footer.quicklinks":    "روابط سريعة",
    "footer.link.home":     "الرئيسية",
    "footer.link.features": "الميزات",
    "footer.link.about":    "عن المنصة",
    "footer.link.contact":  "تواصل معنا",
    "footer.support":       "الدعم",
    "footer.faq":           "الأسئلة الشائعة",
    "footer.privacy":       "سياسة الخصوصية",
    "footer.terms":         "شروط الخدمة",
    "footer.help":          "مركز المساعدة",
    "footer.stay":          "ابقى على تواصل",
    "footer.newsletter":    "انضم إلى نشرتنا الإخبارية للحصول على آخر التحديثات.",
    "footer.email.placeholder": "البريد الإلكتروني",
    "footer.subscribe":     "اشترك",
    "footer.copy":          "© 2024 جميع الحقوق محفوظة لمنصة Eccat One. تم التطوير بكل حب.",

    // Lang switcher label
    "lang.switch": "English",
  },
};

// ─── i18n Core ───────────────────────────────────────────────────────────────

/**
 * Apply the given language to all [data-i18n] elements, set RTL/LTR,
 * update the <html> lang attribute, and persist the choice.
 * @param {string} lang - "en" | "ar"
 */
function updateContent(lang) {
  const dict = translations[lang];
  if (!dict) return;

  // Update every element that carries a data-i18n key
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (dict[key] !== undefined) {
      el.textContent = dict[key];
    }
  });

  // Handle placeholder-only elements (inputs)
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = el.getAttribute("data-i18n-placeholder");
    if (dict[key] !== undefined) {
      el.placeholder = dict[key];
    }
  });

  // RTL / LTR
  document.documentElement.lang = lang;
  document.body.dir = lang === "ar" ? "rtl" : "ltr";

  // Persist
  localStorage.setItem("eccat-lang", lang);

  // Keep the switcher label accurate
  const switcher = document.getElementById("lang-switcher");
  const langLabel = document.getElementById("lang-label");
  if (switcher) {
    switcher.setAttribute("data-current-lang", lang);
  }
  if (langLabel) {
    // Show the opposite language as the action label (what you'll switch TO)
    langLabel.textContent = lang === "ar" ? "EN" : "AR";
  }
}

// ─── Language Switcher ───────────────────────────────────────────────────────

function initLangSwitcher() {
  const switcher = document.getElementById("lang-switcher");
  if (!switcher) return;

  switcher.addEventListener("click", () => {
    const current = switcher.getAttribute("data-current-lang") || "ar";
    const next = current === "ar" ? "en" : "ar";
    updateContent(next);
  });
}

// ─── Mobile Menu (existing logic — untouched) ────────────────────────────────

function initMobileMenu() {
  const menuToggle = document.getElementById("mobile-menu");
  const navLinks   = document.querySelector(".nav-links");

  if (menuToggle && navLinks) {
    menuToggle.addEventListener("click", () => {
      navLinks.classList.toggle("active");
      menuToggle.classList.toggle("is-active");
    });

    // Close menu when clicking a link or button inside the menu
    navLinks.querySelectorAll("a, button").forEach((item) => {
      item.addEventListener("click", () => {
        navLinks.classList.remove("active");
        menuToggle.classList.remove("is-active");
      });
    });
  }
}

// ─── Animations & Scroll ─────────────────────────────────────────────────────

function initScrollReveal() {
  const reveals = document.querySelectorAll('.reveal');
  
  const revealOnScroll = () => {
    for (let i = 0; i < reveals.length; i++) {
      const windowHeight = window.innerHeight;
      const elementTop = reveals[i].getBoundingClientRect().top;
      const elementVisible = 150;
      if (elementTop < windowHeight - elementVisible) {
        reveals[i].classList.add('active');
      }
    }
  };

  window.addEventListener('scroll', revealOnScroll);
  revealOnScroll(); // Initial check
}

function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  });
}

// ─── Boot ────────────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  initMobileMenu();
  initLangSwitcher();
  initScrollReveal();
  initSmoothScroll();

  // Load saved language (default → Arabic since the site was AR-first)
  const savedLang = localStorage.getItem("eccat-lang") || "ar";
  updateContent(savedLang);
});
