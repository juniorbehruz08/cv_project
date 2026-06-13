/*
 * cv-extra-sections.js
 * ---------------------------------------------------------------------------
 * Adds an "Add new section" feature to the CV builder on every resume template.
 *
 * Design goals:
 *  - Fully self-contained. It does NOT depend on any function/variable defined
 *    by a template's own inline builder script.
 *  - Non-invasive. It uses unique data-x-* attributes and its own delegated
 *    listeners, so it never collides with each template's existing handlers.
 *  - Style-consistent. New sections are created by cloning the template's own
 *    Certifications / Achievements section, so they inherit that template's
 *    look automatically. New entries always render as dotted bullet (<li>) items.
 *  - Resilient. A MutationObserver re-applies the panel UI and the resume
 *    sections whenever a template re-renders its panel or a column.
 *
 * If the section type already exists in the template, it is hidden from the
 * dropdown (no duplicates are ever created).
 * ---------------------------------------------------------------------------
 */
(function () {
  "use strict";

  // ---- UI strings (en / uz / ru) -------------------------------------------
  var UI = {
    en: {
      newSection: "Add new section",
      sectionType: "Section type",
      select: "Select",
      addSection: "Add section",
      removeSection: "Remove section",
      add: "Add",
      remove: "Remove",
      item: "Item"
    },
    uz: {
      newSection: "Yangi bo'lim qo'shish",
      sectionType: "Bo'lim turi",
      select: "Tanlang",
      addSection: "Bo'lim qo'shish",
      removeSection: "Bo'limni o'chirish",
      add: "Qo'shish",
      remove: "O'chirish",
      item: "Element"
    },
    ru: {
      newSection: "Добавить раздел",
      sectionType: "Тип раздела",
      select: "Выберите",
      addSection: "Добавить",
      removeSection: "Удалить раздел",
      add: "Добавить",
      remove: "Удалить",
      item: "Пункт"
    }
  };

  // ---- Section types offered in the dropdown -------------------------------
  // aliases are normalized (lowercase, no punctuation) words used to detect
  // whether a section already exists in the template.
  var SECTION_TYPES = [
    {
      key: "certifications",
      label: { en: "Certifications", uz: "Sertifikatlar", ru: "Сертификаты" },
      aliases: ["certifications", "certification", "sertifikatlar", "sertifikat", "сертификаты", "сертификат"]
    },
    {
      key: "conferences",
      label: { en: "Conferences and seminars", uz: "Konferensiya va seminarlar", ru: "Конференции и семинары" },
      aliases: ["conferences", "seminars", "conference", "seminar", "konferensiya", "seminarlar", "конференции", "семинары"]
    },
    {
      key: "creative",
      label: { en: "Creative works", uz: "Ijodiy ishlar", ru: "Творческие работы" },
      aliases: ["creative works", "creative", "ijodiy ishlar", "ijodiy", "творческие работы", "творческие"]
    },
    {
      key: "driving",
      label: { en: "Driving licence", uz: "Haydovchilik guvohnomasi", ru: "Водительские права" },
      aliases: ["driving licence", "driving license", "driving", "haydovchilik", "guvohnomasi", "водительские права", "водительское"]
    },
    {
      key: "hobbies",
      label: { en: "Hobbies and interests", uz: "Qiziqishlar", ru: "Хобби и интересы" },
      aliases: ["hobbies", "interests", "hobby", "qiziqishlar", "qiziqish", "хобби", "интересы"]
    },
    {
      key: "honours",
      label: { en: "Honours and awards", uz: "Mukofotlar", ru: "Награды" },
      aliases: ["honours", "honors", "awards", "award", "mukofotlar", "mukofot", "награды", "награда"]
    },
    {
      key: "networks",
      label: { en: "Networks and memberships", uz: "Tarmoq va a'zoliklar", ru: "Сети и членство" },
      aliases: ["networks", "memberships", "membership", "tarmoqlar", "azoliklar", "сети", "членство"]
    },
    {
      key: "projects",
      label: { en: "Projects", uz: "Loyihalar", ru: "Проекты" },
      aliases: ["projects", "project", "loyihalar", "loyiha", "проекты", "проект"]
    },
    {
      key: "publications",
      label: { en: "Publications", uz: "Nashrlar", ru: "Публикации" },
      aliases: ["publications", "publication", "nashrlar", "nashr", "публикации", "публикация"]
    },
    {
      key: "recommendations",
      label: { en: "Recommendations", uz: "Tavsiyalar", ru: "Рекомендации" },
      aliases: ["recommendations", "recommendation", "references", "tavsiyalar", "tavsiya", "рекомендации", "рекомендация"]
    },
    {
      key: "social",
      label: { en: "Social and political activities", uz: "Ijtimoiy va siyosiy faoliyat", ru: "Общественная и политическая деятельность" },
      aliases: ["social and political", "social", "political", "ijtimoiy", "siyosiy", "общественная", "политическая"]
    },
    {
      key: "volunteering",
      label: { en: "Volunteering", uz: "Volontyorlik", ru: "Волонтёрство" },
      aliases: ["volunteering", "volunteer", "kongillilik", "волонтёрство", "волонтерство"]
    },
    {
      key: "other",
      label: { en: "Other", uz: "Boshqa", ru: "Другое" },
      aliases: ["other", "boshqa", "другое"]
    },
    {
      key: "closing",
      label: { en: "Closing statement", uz: "Yakuniy so'z", ru: "Заключение" },
      aliases: ["closing statement", "closing", "yakuniy soz", "yakuniy", "заключение"]
    }
  ];

  // ---- Persistence ---------------------------------------------------------
  var parts = location.pathname.split("/").filter(Boolean);
  var SLUG = parts[1] || parts[parts.length - 1] || "default";
  var STORE_KEY = "cv-extra-sections-" + SLUG;

  var data = { sections: [] };
  try {
    var raw = JSON.parse(localStorage.getItem(STORE_KEY));
    if (raw && Array.isArray(raw.sections)) {
      data.sections = raw.sections
        .filter(function (s) { return s && byKey(s.key); })
        .map(function (s) {
          return {
            key: s.key,
            entries: Array.isArray(s.entries) && s.entries.length ? s.entries.slice() : [""]
          };
        });
    }
  } catch (err) { /* ignore corrupt storage */ }

  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(data)); } catch (err) { /* ignore */ }
  }

  // liProtos[key] = a clone of an <li> from the cloned reference section,
  // so new bullets match the template's own list-item styling.
  var liProtos = {};
  var applying = false;

  // ---- Helpers -------------------------------------------------------------
  function getLang() {
    var l = localStorage.getItem("cv-maker-language");
    return UI[l] ? l : (UI[document.documentElement.lang] ? document.documentElement.lang : "uz");
  }

  function T(key) {
    var l = getLang();
    return (UI[l] && UI[l][key]) || UI.en[key] || key;
  }

  function byKey(key) {
    for (var i = 0; i < SECTION_TYPES.length; i++) {
      if (SECTION_TYPES[i].key === key) return SECTION_TYPES[i];
    }
    return null;
  }

  function labelFor(def) {
    var l = getLang();
    return (def.label && (def.label[l] || def.label.en)) || def.key;
  }

  function titleFor(key) {
    var def = byKey(key);
    return def ? labelFor(def) : key;
  }

  function norm(text) {
    return String(text || "")
      .toLowerCase()
      .replace(/[^a-zа-яё ]+/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function aliasMatches(headingText, alias) {
    if (!headingText) return false;
    if (alias.indexOf(" ") !== -1) {
      return headingText.indexOf(alias) !== -1;
    }
    if (headingText === alias) return true;
    return (" " + headingText + " ").indexOf(" " + alias + " ") !== -1;
  }

  var HEAD_SEL = "h1,h2,h3,h4,h5,.side-title,.title,.rtitle,.bar-title,.section-title,.sec-title";

  function isPresentInTemplate(def) {
    var resume = document.querySelector(".resume");
    if (!resume) return false;
    var heads = resume.querySelectorAll(HEAD_SEL);
    for (var i = 0; i < heads.length; i++) {
      var el = heads[i];
      if (el.closest("[data-extra]")) continue; // skip our own sections
      var tx = norm(el.textContent);
      for (var j = 0; j < def.aliases.length; j++) {
        if (aliasMatches(tx, def.aliases[j])) return true;
      }
    }
    return false;
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function findSection(key) {
    for (var i = 0; i < data.sections.length; i++) {
      if (data.sections[i].key === key) return data.sections[i];
    }
    return null;
  }

  // ---- Resume DOM injection ------------------------------------------------
  function stripWords(className) {
    return String(className || "")
      .replace(/\b(certifications?|achievements?|skills?|summary|experience|education|languages?|projects?|contact|contact-info|contact-section)\b/gi, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  // Find a section to clone (for styling) and the host to append into.
  function findReference() {
    var resume = document.querySelector(".resume");
    if (!resume) return { host: null, ref: null };

    var prefer = [
      "certifications", "sertifikatlar", "сертификаты",
      "achievements", "yutuqlar", "достижения"
    ];
    var heads = resume.querySelectorAll(HEAD_SEL);

    for (var p = 0; p < prefer.length; p++) {
      for (var i = 0; i < heads.length; i++) {
        var el = heads[i];
        if (el.closest("[data-extra]")) continue;
        if (norm(el.textContent) !== prefer[p]) continue;
        var block = el.closest("section, .section, .side-section, .block, .card") || el.parentElement;
        if (block && block !== resume && block.querySelector("ul")) {
          return { host: block.parentNode, ref: block };
        }
      }
    }

    // Any section-like block that contains a <ul>.
    var blocks = resume.querySelectorAll("section, .section, .side-section");
    for (var b = 0; b < blocks.length; b++) {
      if (blocks[b] !== resume && blocks[b].querySelector("ul")) {
        return { host: blocks[b].parentNode, ref: blocks[b] };
      }
    }

    var host = resume.querySelector(".right, .left, main, .main, .content, .body") || resume;
    return { host: host, ref: null };
  }

  function buildSectionEl(key) {
    var found = findReference();
    var ref = found.ref;
    var host = found.host || document.querySelector(".resume");
    var sec, heading, ul;

    if (ref) {
      sec = ref.cloneNode(true);
      sec.removeAttribute("id");
      sec.className = stripWords(ref.className) || "section";

      heading = sec.querySelector(HEAD_SEL) || sec.firstElementChild;
      if (!heading) {
        heading = document.createElement("h2");
        sec.insertBefore(heading, sec.firstChild);
      }
      heading.setAttribute("data-extra-title", "");

      ul = sec.querySelector("ul");
      if (!ul) {
        ul = document.createElement("ul");
        sec.appendChild(ul);
      }
      // capture a sample <li> for styling, then clear the list
      var sample = ul.querySelector("li");
      liProtos[key] = sample ? sample.cloneNode(false) : null;
      ul.setAttribute("data-extra-list", "");
      ul.innerHTML = "";

      // drop any leftover children that are neither the heading nor the list
      Array.prototype.slice.call(sec.children).forEach(function (child) {
        if (child !== heading && child !== ul) child.remove();
      });
    } else {
      sec = document.createElement("section");
      sec.className = "section";
      heading = document.createElement("h2");
      heading.setAttribute("data-extra-title", "");
      sec.appendChild(heading);
      ul = document.createElement("ul");
      ul.setAttribute("data-extra-list", "");
      sec.appendChild(ul);
      liProtos[key] = null;
    }

    sec.setAttribute("data-extra", key);
    host.appendChild(sec);
    return sec;
  }

  function makeLi(key, text) {
    var proto = liProtos[key];
    var li = proto ? proto.cloneNode(false) : document.createElement("li");
    li.removeAttribute("data-builder-live");
    li.textContent = text;
    return li;
  }

  function renderSectionResume(section) {
    var sec = document.querySelector('.resume [data-extra="' + cssEscape(section.key) + '"]');
    if (!sec) sec = buildSectionEl(section.key);
    if (!sec) return;

    var titleEl = sec.querySelector("[data-extra-title]");
    if (titleEl) titleEl.textContent = titleFor(section.key);

    var ul = sec.querySelector("[data-extra-list]") || sec.querySelector("ul");
    if (!ul) return;
    ul.innerHTML = "";
    section.entries
      .filter(function (v) { return String(v || "").trim() !== ""; })
      .forEach(function (v) { ul.appendChild(makeLi(section.key, v)); });
  }

  function cssEscape(value) {
    return String(value).replace(/["\\]/g, "\\$&");
  }

  function removeSectionDom(key) {
    var sec = document.querySelector('.resume [data-extra="' + cssEscape(key) + '"]');
    if (sec) sec.remove();
    delete liProtos[key];
  }

  // ---- Panel UI ------------------------------------------------------------
  function availableTypes() {
    return SECTION_TYPES.filter(function (def) {
      if (findSection(def.key)) return false;        // already added
      if (isPresentInTemplate(def)) return false;    // already in template
      return true;
    });
  }

  function renderRoot(root) {
    var html = "";

    data.sections.forEach(function (section) {
      var title = titleFor(section.key);
      var entriesHtml = section.entries.map(function (value, index) {
        var disabled = section.entries.length <= 1 ? " disabled" : "";
        return (
          '<div class="builder-entry">' +
            '<label class="builder-field builder-wide">' +
              "<span>" + escapeHtml(T("item")) + " " + (index + 1) + "</span>" +
              '<textarea data-x-field="' + escapeHtml(section.key) + '" data-x-index="' + index + '">' +
                escapeHtml(value) +
              "</textarea>" +
            "</label>" +
            '<div class="builder-entry-actions">' +
              '<button class="builder-button builder-secondary" type="button" ' +
                'data-x-remove="' + escapeHtml(section.key) + '" data-x-index="' + index + '"' + disabled + ">" +
                escapeHtml(T("remove")) +
              "</button>" +
            "</div>" +
          "</div>"
        );
      }).join("");

      html +=
        '<section class="builder-section">' +
          '<div class="builder-section-title">' +
            "<h3>" + escapeHtml(title) + "</h3>" +
            '<div class="cv-extra-actions">' +
              '<button class="builder-button" type="button" data-x-add="' + escapeHtml(section.key) + '">' +
                escapeHtml(T("add")) +
              "</button>" +
              '<button class="builder-button builder-secondary" type="button" data-x-remove-section="' + escapeHtml(section.key) + '">' +
                escapeHtml(T("removeSection")) +
              "</button>" +
            "</div>" +
          "</div>" +
          entriesHtml +
        "</section>";
    });

    var options = availableTypes();
    if (options.length) {
      var optionsHtml = '<option value="">' + escapeHtml(T("select")) + "</option>" +
        options.map(function (def) {
          return '<option value="' + escapeHtml(def.key) + '">' + escapeHtml(labelFor(def)) + "</option>";
        }).join("");

      html +=
        '<section class="builder-section cv-extra-add">' +
          '<div class="builder-section-title"><h3>' + escapeHtml(T("newSection")) + "</h3></div>" +
          '<label class="builder-field builder-wide">' +
            "<span>" + escapeHtml(T("sectionType")) + "</span>" +
            '<select class="cv-extra-select" data-x-select>' + optionsHtml + "</select>" +
          "</label>" +
          '<div class="builder-entry-actions" style="justify-content:flex-start;margin-top:10px;">' +
            '<button class="builder-button" type="button" data-x-add-section>' + escapeHtml(T("addSection")) + "</button>" +
          "</div>" +
        "</section>";
    }

    root.innerHTML = html;
  }

  // ---- Reconcile (idempotent) ----------------------------------------------
  function reconcile() {
    var panel = document.querySelector(".builder-panel");
    if (!panel) return;

    applying = true;
    try {
      var root = panel.querySelector(".cv-extra-root");
      if (!root) {
        root = document.createElement("div");
        root.className = "cv-extra-root";
        panel.appendChild(root);
      } else if (root !== panel.lastElementChild) {
        panel.appendChild(root); // keep our UI at the bottom
      }
      renderRoot(root);

      data.sections.forEach(function (section) { renderSectionResume(section); });
    } catch (err) {
      if (window.console) console.error("[cv-extra-sections]", err);
    } finally {
      applying = false;
    }
  }

  // ---- Actions -------------------------------------------------------------
  function addSection(key) {
    if (!byKey(key) || findSection(key)) return;
    data.sections.push({ key: key, entries: [""] });
    save();
    reconcile();
  }

  function removeSection(key) {
    var idx = -1;
    for (var i = 0; i < data.sections.length; i++) {
      if (data.sections[i].key === key) { idx = i; break; }
    }
    if (idx === -1) return;
    data.sections.splice(idx, 1);
    removeSectionDom(key);
    save();
    reconcile();
  }

  function addEntry(key) {
    var section = findSection(key);
    if (!section) return;
    section.entries.push("");
    save();
    reconcile();
  }

  function removeEntry(key, index) {
    var section = findSection(key);
    if (!section || section.entries.length <= 1) return;
    section.entries.splice(index, 1);
    save();
    reconcile();
  }

  // ---- Delegated listeners (attached once) ---------------------------------
  document.addEventListener("input", function (event) {
    var ta = event.target.closest && event.target.closest("[data-x-field]");
    if (!ta) return;
    try {
      var key = ta.getAttribute("data-x-field");
      var index = Number(ta.getAttribute("data-x-index"));
      var section = findSection(key);
      if (section && index >= 0 && index < section.entries.length) {
        section.entries[index] = ta.value;
        renderSectionResume(section); // update preview only, keep textarea focus
        save();
      }
    } catch (err) {
      if (window.console) console.error("[cv-extra-sections]", err);
    }
  });

  document.addEventListener("click", function (event) {
    var t = event.target;
    if (!t || !t.closest) return;
    try {
      var addEntryBtn = t.closest("[data-x-add]");
      var removeEntryBtn = t.closest("[data-x-remove]");
      var addSectionBtn = t.closest("[data-x-add-section]");
      var removeSectionBtn = t.closest("[data-x-remove-section]");

      if (addSectionBtn) {
        event.preventDefault();
        var select = document.querySelector("[data-x-select]");
        if (select && select.value) addSection(select.value);
        return;
      }
      if (removeSectionBtn) {
        event.preventDefault();
        removeSection(removeSectionBtn.getAttribute("data-x-remove-section"));
        return;
      }
      if (addEntryBtn) {
        event.preventDefault();
        addEntry(addEntryBtn.getAttribute("data-x-add"));
        return;
      }
      if (removeEntryBtn) {
        event.preventDefault();
        removeEntry(removeEntryBtn.getAttribute("data-x-remove"), Number(removeEntryBtn.getAttribute("data-x-index")));
        return;
      }
    } catch (err) {
      if (window.console) console.error("[cv-extra-sections]", err);
    }
  });

  // ---- Inject minimal styling ----------------------------------------------
  function injectStyle() {
    if (document.getElementById("cv-extra-style")) return;
    var style = document.createElement("style");
    style.id = "cv-extra-style";
    style.textContent = [
      ".resume [data-extra-list]{list-style: disc outside !important; margin: 6px 0 0 18px !important; padding-left: 4px !important;}",
      ".resume [data-extra-list] li{list-style: disc outside !important; display: list-item !important; margin: 3px 0 !important; text-align: left !important;}",
      ".cv-extra-select{width:100%;height:auto;border:1px solid #cfd9e5;border-radius:6px;background:#fbfdff;color:#172033;font:inherit;font-size:14px;line-height:1.35;padding:10px 11px;outline:none;}",
      ".cv-extra-select:focus{border-color:#176c72;box-shadow:0 0 0 3px rgba(23,108,114,.14);}",
      ".cv-extra-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap;}",
      "@media print{.cv-extra-root{display:none !important;}}"
    ].join("\n");
    (document.head || document.documentElement).appendChild(style);
  }

  // ---- Boot ----------------------------------------------------------------
  function start() {
    if (!document.querySelector(".resume")) return; // not a builder page
    injectStyle();

    var tries = 0;
    (function waitForPanel() {
      if (document.querySelector(".builder-panel")) {
        reconcile();
        var observer = new MutationObserver(function () {
          if (applying) return;
          var panel = document.querySelector(".builder-panel");
          if (!panel) return;
          var needPanel = !panel.querySelector(".cv-extra-root");
          var needResume = data.sections.some(function (s) {
            return !document.querySelector('.resume [data-extra="' + cssEscape(s.key) + '"]');
          });
          if (needPanel || needResume) reconcile();
        });
        observer.observe(document.body, { childList: true, subtree: true });
        return;
      }
      if (tries++ < 80) setTimeout(waitForPanel, 80);
    })();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { setTimeout(start, 0); });
  } else {
    setTimeout(start, 0);
  }
})();
