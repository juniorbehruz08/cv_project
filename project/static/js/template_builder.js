(function () {
  const STORAGE_KEY = "cv-maker-language";
  const DEFAULT_PROFILE_IMAGE = "/static/images/default-profile.png";
  const HEADING_SELECTOR = "h2, .side-title, .title, .rtitle, .bar-title";

  const TEXT = {
    en: {
      add: "Add",
      back: "Back",
      builder: "CV Builder",
      personal: "Personal",
      fullName: "Full name",
      jobTitle: "Job title",
      phone: "Phone",
      email: "Email",
      location: "Location",
      link: "Link",
      picture: "Picture",
      profilePicture: "Profile picture",
      summary: "Summary",
      experience: "Experience",
      role: "Role",
      company: "Company",
      date: "Date",
      place: "Place",
      details: "Details",
      education: "Education",
      degree: "Degree",
      school: "School",
      skills: "Skills",
      skill: "Skill",
      level: "Level",
      languages: "Languages",
      language: "Language",
      certifications: "Certifications",
      certification: "Certification",
      achievements: "Achievements",
      achievement: "Achievement",
      remove: "Remove",
    },
    uz: {
      add: "Qo'shish",
      back: "Orqaga",
      builder: "CV yaratish",
      personal: "Shaxsiy",
      fullName: "To'liq ism",
      jobTitle: "Kasb",
      phone: "Telefon",
      email: "Email",
      location: "Manzil",
      link: "Havola",
      picture: "Rasm",
      profilePicture: "Profil rasmi",
      summary: "Xulosa",
      experience: "Tajriba",
      role: "Lavozim",
      company: "Kompaniya",
      date: "Sana",
      place: "Joy",
      details: "Tafsilot",
      education: "Ta'lim",
      degree: "Daraja",
      school: "O'quv joyi",
      skills: "Ko'nikmalar",
      skill: "Ko'nikma",
      level: "Daraja",
      languages: "Tillar",
      language: "Til",
      certifications: "Sertifikatlar",
      certification: "Sertifikat",
      achievements: "Yutuqlar",
      achievement: "Yutuq",
      remove: "O'chirish",
    },
    ru: {
      add: "Добавить",
      back: "Назад",
      builder: "Конструктор CV",
      personal: "Личные данные",
      fullName: "ФИО",
      jobTitle: "Должность",
      phone: "Телефон",
      email: "Эл. почта",
      location: "Город",
      link: "Ссылка",
      picture: "Фото",
      profilePicture: "Фото профиля",
      summary: "О себе",
      experience: "Опыт",
      role: "Роль",
      company: "Компания",
      date: "Дата",
      place: "Место",
      details: "Детали",
      education: "Образование",
      degree: "Степень",
      school: "Учебное место",
      skills: "Навыки",
      skill: "Навык",
      level: "Уровень",
      languages: "Языки",
      language: "Язык",
      certifications: "Сертификаты",
      certification: "Сертификат",
      achievements: "Достижения",
      achievement: "Достижение",
      remove: "Удалить",
    },
  };

  const state = {
    fields: {
      fullName: "",
      jobTitle: "",
      phone: "",
      email: "",
      location: "",
      link: "",
      photo: DEFAULT_PROFILE_IMAGE,
      summary: "",
    },
    photoObjectUrl: "",
    collections: {
      experience: [blankExperience()],
      education: [blankEducation()],
      skills: [blankRatedItem()],
      languages: [blankRatedItem()],
      certifications: [blankTextItem()],
      achievements: [blankTextItem()],
    },
  };

  const dom = {
    resume: null,
    panel: null,
    captures: null,
  };

  let language = getSavedLanguage();

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    const resume = document.querySelector(".resume");

    if (!resume || document.querySelector(".builder-workspace")) {
      return;
    }

    dom.resume = resume;
    dom.captures = captureResume(resume);
    dom.panel = wrapResume(resume);

    bindPanel();
    renderPanel();
    renderResume();
  }

  function blankExperience() {
    return { role: "", company: "", date: "", place: "", details: "" };
  }

  function blankEducation() {
    return { degree: "", school: "", date: "", place: "", details: "" };
  }

  function blankRatedItem() {
    return { name: "", level: "" };
  }

  function blankTextItem() {
    return { value: "" };
  }

  function getSavedLanguage() {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return Object.prototype.hasOwnProperty.call(TEXT, saved) ? saved : "uz";
  }

  function t(key) {
    return (TEXT[language] && TEXT[language][key]) || TEXT.en[key] || key;
  }

  function wrapResume(resume) {
    const workspace = document.createElement("main");
    workspace.className = "builder-workspace";

    const preview = document.createElement("div");
    preview.className = "builder-preview";

    const panel = document.createElement("aside");
    panel.className = "builder-panel";

    resume.parentNode.insertBefore(workspace, resume);
    preview.appendChild(resume);
    workspace.appendChild(preview);
    workspace.appendChild(panel);
    document.body.classList.add("template-builder-ready");

    return panel;
  }

  function bindPanel() {
    dom.panel.addEventListener("input", function (event) {
      const input = event.target;

      if (input.matches("[data-field]")) {
        state.fields[input.dataset.field] = input.value;
        renderResume();
      }

      if (input.matches("[data-collection]")) {
        const collection = state.collections[input.dataset.collection];
        const entry = collection[Number(input.dataset.index)];

        if (entry) {
          entry[input.dataset.key] = input.value;
          renderResume();
        }
      }
    });

    dom.panel.addEventListener("change", function (event) {
      const control = event.target;

      if (control.matches("[data-photo-input]")) {
        updatePhoto(control.files && control.files[0]);
      }

      if (control.matches("[data-builder-language]")) {
        language = control.value;
        window.localStorage.setItem(STORAGE_KEY, language);
        renderPanel();
      }
    });

    dom.panel.addEventListener("click", function (event) {
      const addButton = event.target.closest("[data-add]");
      const removeButton = event.target.closest("[data-remove]");
      const backLink = event.target.closest("[data-builder-back]");

      if (backLink && window.history.length > 1) {
        event.preventDefault();
        window.history.back();
        return;
      }

      if (addButton) {
        state.collections[addButton.dataset.add].push(blankFor(addButton.dataset.add));
        renderPanel();
        renderResume();
      }

      if (removeButton) {
        const collection = state.collections[removeButton.dataset.remove];
        const index = Number(removeButton.dataset.index);

        if (collection.length > 1) {
          collection.splice(index, 1);
          renderPanel();
          renderResume();
        }
      }
    });
  }

  function blankFor(type) {
    if (type === "experience") return blankExperience();
    if (type === "education") return blankEducation();
    if (type === "skills" || type === "languages") return blankRatedItem();
    return blankTextItem();
  }

  function renderPanel() {
    dom.panel.innerHTML = [
      renderPanelHeader(),
      renderPersonalSection(),
      renderPhotoSection(),
      renderSummarySection(),
      renderExperienceSection(),
      renderEducationSection(),
      renderRatedSection("skills", t("skills"), t("skill")),
      renderRatedSection("languages", t("languages"), t("language")),
      renderTextCollectionSection("certifications", t("certifications"), t("certification")),
      renderTextCollectionSection("achievements", t("achievements"), t("achievement")),
    ].join("");
  }

  function renderPanelHeader() {
    return `
      <header class="builder-panel-header">
        <div class="builder-panel-top">
          <a class="builder-back" href="/" data-builder-back>${t("back")}</a>
          <select class="builder-lang" data-builder-language aria-label="Language">
            <option value="en"${language === "en" ? " selected" : ""}>EN</option>
            <option value="uz"${language === "uz" ? " selected" : ""}>UZ</option>
            <option value="ru"${language === "ru" ? " selected" : ""}>RU</option>
          </select>
        </div>
        <h2>${t("builder")}</h2>
      </header>
    `;
  }

  function renderPersonalSection() {
    return `
      <section class="builder-section">
        <div class="builder-section-title"><h3>${t("personal")}</h3></div>
        <div class="builder-grid">
          ${fieldHtml(t("fullName"), "fullName", state.fields.fullName)}
          ${fieldHtml(t("jobTitle"), "jobTitle", state.fields.jobTitle)}
          ${fieldHtml(t("phone"), "phone", state.fields.phone)}
          ${fieldHtml(t("email"), "email", state.fields.email)}
          ${fieldHtml(t("location"), "location", state.fields.location)}
          ${fieldHtml(t("link"), "link", state.fields.link)}
        </div>
      </section>
    `;
  }

  function renderPhotoSection() {
    if (!dom.captures.photo || dom.captures.photo.images.length === 0) {
      return "";
    }

    return `
      <section class="builder-section">
        <div class="builder-section-title"><h3>${t("picture")}</h3></div>
        <label class="builder-field builder-wide">
          <span>${t("profilePicture")}</span>
          <input type="file" accept="image/*" data-photo-input />
        </label>
        <div class="builder-photo-preview">
          <img src="${escapeAttribute(state.fields.photo || DEFAULT_PROFILE_IMAGE)}" alt="${t("profilePicture")}" data-photo-preview />
        </div>
      </section>
    `;
  }

  function renderSummarySection() {
    return `
      <section class="builder-section">
        <div class="builder-section-title"><h3>${t("summary")}</h3></div>
        ${fieldHtml(t("summary"), "summary", state.fields.summary, true, "textarea")}
      </section>
    `;
  }

  function renderExperienceSection() {
    return collectionSectionHtml(
      "experience",
      t("experience"),
      state.collections.experience
        .map(function (entry, index) {
          return `
            <div class="builder-entry">
              <div class="builder-grid">
                ${collectionFieldHtml(t("role"), "experience", index, "role", entry.role)}
                ${collectionFieldHtml(t("company"), "experience", index, "company", entry.company)}
                ${collectionFieldHtml(t("date"), "experience", index, "date", entry.date)}
                ${collectionFieldHtml(t("place"), "experience", index, "place", entry.place)}
                ${collectionFieldHtml(t("details"), "experience", index, "details", entry.details, true, "textarea")}
              </div>
              ${removeButtonHtml("experience", index)}
            </div>
          `;
        })
        .join("")
    );
  }

  function renderEducationSection() {
    return collectionSectionHtml(
      "education",
      t("education"),
      state.collections.education
        .map(function (entry, index) {
          return `
            <div class="builder-entry">
              <div class="builder-grid">
                ${collectionFieldHtml(t("degree"), "education", index, "degree", entry.degree)}
                ${collectionFieldHtml(t("school"), "education", index, "school", entry.school)}
                ${collectionFieldHtml(t("date"), "education", index, "date", entry.date)}
                ${collectionFieldHtml(t("place"), "education", index, "place", entry.place)}
                ${collectionFieldHtml(t("details"), "education", index, "details", entry.details, true, "textarea")}
              </div>
              ${removeButtonHtml("education", index)}
            </div>
          `;
        })
        .join("")
    );
  }

  function renderRatedSection(type, title, fieldLabel) {
    return collectionSectionHtml(
      type,
      title,
      state.collections[type]
        .map(function (entry, index) {
          return `
            <div class="builder-entry">
              <div class="builder-grid">
                ${collectionFieldHtml(fieldLabel, type, index, "name", entry.name)}
                ${collectionFieldHtml(t("level"), type, index, "level", entry.level)}
              </div>
              ${removeButtonHtml(type, index)}
            </div>
          `;
        })
        .join("")
    );
  }

  function renderTextCollectionSection(type, title, fieldLabel) {
    return collectionSectionHtml(
      type,
      title,
      state.collections[type]
        .map(function (entry, index) {
          return `
            <div class="builder-entry">
              ${collectionFieldHtml(fieldLabel, type, index, "value", entry.value, true, "textarea")}
              ${removeButtonHtml(type, index)}
            </div>
          `;
        })
        .join("")
    );
  }

  function collectionSectionHtml(type, title, body) {
    return `
      <section class="builder-section">
        <div class="builder-section-title">
          <h3>${title}</h3>
          <button class="builder-button" type="button" data-add="${type}">${t("add")}</button>
        </div>
        ${body}
      </section>
    `;
  }

  function fieldHtml(label, field, value, wide, element) {
    const control =
      element === "textarea"
        ? `<textarea data-field="${field}">${escapeHtml(value)}</textarea>`
        : `<input data-field="${field}" value="${escapeAttribute(value)}" />`;

    return `<label class="builder-field${wide ? " builder-wide" : ""}"><span>${label}</span>${control}</label>`;
  }

  function collectionFieldHtml(label, collection, index, key, value, wide, element) {
    const attrs = `data-collection="${collection}" data-index="${index}" data-key="${key}"`;
    const control =
      element === "textarea"
        ? `<textarea ${attrs}>${escapeHtml(value)}</textarea>`
        : `<input ${attrs} value="${escapeAttribute(value)}" />`;

    return `<label class="builder-field${wide ? " builder-wide" : ""}"><span>${label}</span>${control}</label>`;
  }

  function removeButtonHtml(collection, index) {
    const disabled = state.collections[collection].length <= 1 ? " disabled" : "";
    return `
      <div class="builder-entry-actions">
        <button class="builder-button builder-secondary" type="button" data-remove="${collection}" data-index="${index}"${disabled}>${t("remove")}</button>
      </div>
    `;
  }

  function captureResume(resume) {
    return {
      fullName: findNameTarget(resume),
      jobTitle: findJobTitleTarget(resume),
      photo: capturePhoto(resume),
      contactBoxes: findContactBoxes(resume),
      summary: captureSummary(resume),
      experience: captureCollection(resume, ["experience"], ".item, .job, .experience-item, article", "experience", "Experience"),
      education: captureCollection(resume, ["education"], ".item, .edu, .edu-item, .education-item, p", "education", "Education"),
      skills: captureCollection(resume, ["skills"], ".skill, .pill, li", "skills", "Skills"),
      languages: captureCollection(resume, ["languages"], ".language-row, .lang-row, .language:not(section), .skill.language, li", "languages", "Languages"),
      certifications: captureCollection(resume, ["certifications", "certification"], "li, .certification, p", "certifications", "Certifications"),
      achievements: captureCollection(resume, ["achievements", "achievement"], "li, .ach, .achievement", "achievements", "Achievements"),
    };
  }

  function capturePhoto(resume) {
    const images = Array.from(resume.querySelectorAll("img")).filter(function (image) {
      return !image.closest(".builder-panel");
    });

    images.forEach(function (image) {
      image.alt = image.alt || "Profile photo";
    });

    return images.length ? { images: images } : null;
  }

  function findNameTarget(resume) {
    const heading = resume.querySelector("h1");
    if (heading) return heading;

    return (
      Array.from(resume.querySelectorAll(".name")).find(function (element) {
        return !element.querySelector("h1");
      }) || null
    );
  }

  function findJobTitleTarget(resume) {
    const nameTarget = findNameTarget(resume);
    const searchRoot = (nameTarget && nameTarget.closest("header")) || resume.querySelector("header") || resume;
    const candidates = Array.from(searchRoot.querySelectorAll(".role, .headline, .subtitle, p, [class*='role']"));

    return (
      candidates.find(function (element) {
        return element !== nameTarget && !element.contains(nameTarget) && !element.closest(".contact");
      }) || null
    );
  }

  function findContactBoxes(resume) {
    const boxes = new Set();
    const contactBlock = findBlock(resume, ["contact info", "contact"]);

    resume.querySelectorAll(".contact, .contact-info, .contact-row").forEach(function (element) {
      boxes.add(element);
    });

    if (contactBlock) {
      const contactTarget = findContactTarget(contactBlock);
      if (contactTarget) {
        boxes.add(contactTarget);
      }
    }

    return Array.from(boxes).filter(function (element) {
      return element && element !== resume && !element.matches(HEADING_SELECTOR);
    });
  }

  function findContactTarget(block) {
    if (block.sectionLike) {
      return block.container.querySelector(".contact, .contact-info, .contact-row") || block.container;
    }

    let sibling = block.heading.nextElementSibling;

    while (sibling && !sibling.matches(HEADING_SELECTOR)) {
      if (sibling.matches(".contact, .contact-info, .contact-row")) {
        return sibling;
      }

      const nested = sibling.querySelector(".contact, .contact-info, .contact-row");
      if (nested) {
        return nested;
      }

      sibling = sibling.nextElementSibling;
    }

    return null;
  }

  function captureSummary(resume) {
    const block = findBlock(resume, ["summary"]);

    if (!block) {
      const summary = resume.querySelector(".summary");
      return summary ? { target: summary } : null;
    }

    if (block.sectionLike) {
      const sectionTarget =
        block.container.querySelector("p") ||
        Array.from(block.container.children).find(function (child) {
          return child !== block.heading && !child.matches(HEADING_SELECTOR);
        });

      return sectionTarget ? { target: sectionTarget } : null;
    }

    let sibling = block.heading.nextElementSibling;

    while (sibling && !sibling.matches(HEADING_SELECTOR)) {
      if (!sibling.matches(HEADING_SELECTOR)) {
        return { target: sibling };
      }

      sibling = sibling.nextElementSibling;
    }

    return null;
  }

  function captureCollection(resume, aliases, selector, type, title) {
    const block = findBlock(resume, aliases) || createBlock(resume, type, title);

    const items = findItems(block, selector);
    const template = items[0] ? items[0].cloneNode(true) : createGenericItem(type);
    const parent = items[0] ? items[0].parentElement : block.generatedParent || block.container;

    return {
      block: block,
      parent: parent,
      selector: selector,
      template: template,
      type: type,
    };
  }

  function findBlock(root, aliases) {
    const heading = Array.from(root.querySelectorAll(HEADING_SELECTOR)).find(function (element) {
      return headingMatches(element.textContent, aliases);
    });

    if (!heading) {
      return null;
    }

    const sectionLike = heading.closest("section") || heading.closest(".section") || heading.closest(".side-section");
    const container = sectionLike || heading.parentElement;

    return {
      heading: heading,
      container: container,
      sectionLike: Boolean(sectionLike),
    };
  }

  function createBlock(root, type, title) {
    const host = findGeneratedSectionHost(root, type);
    const sideTitle = host.querySelector(".side-title");
    const rightTitle = host.querySelector(".rtitle");
    const listTypes = ["certifications", "achievements"];
    const needsList = listTypes.indexOf(type) !== -1;

    if (rightTitle) {
      const heading = document.createElement("div");
      const parent = needsList ? document.createElement("ul") : document.createElement("div");

      heading.className = "rtitle";
      heading.textContent = title;
      parent.className = "builder-generated-items " + type;
      host.appendChild(heading);
      host.appendChild(parent);

      return {
        heading: heading,
        container: host,
        sectionLike: false,
        generatedParent: parent,
      };
    }

    const section = document.createElement("section");
    const heading = document.createElement(sideTitle ? "div" : "h2");
    const parent = needsList ? document.createElement("ul") : section;

    section.className = sideTitle ? "side-section builder-generated-section" : "section builder-generated-section " + type;
    heading.className = sideTitle ? "side-title" : "";
    heading.textContent = title;
    section.appendChild(heading);

    if (needsList) {
      section.appendChild(parent);
    }

    host.appendChild(section);

    return {
      heading: heading,
      container: section,
      sectionLike: true,
      generatedParent: parent,
    };
  }

  function findGeneratedSectionHost(root, type) {
    const sideTypes = ["summary", "skills", "languages", "certifications", "achievements"];
    const prefersSide = sideTypes.indexOf(type) !== -1;
    const side = findSideColumn(root);
    const main = root.querySelector("main, .main, .content, .left") || root;

    return prefersSide && side ? side : main;
  }

  function findSideColumn(root) {
    const candidates = Array.from(root.querySelectorAll("aside, .right, .sidebar, .side"));

    return (
      candidates.find(function (element) {
        return (
          element.closest(".resume") === root &&
          !element.classList.contains("date") &&
          !element.classList.contains("date-location") &&
          !element.classList.contains("date-place") &&
          !element.classList.contains("rating")
        );
      }) || null
    );
  }

  function headingMatches(text, aliases) {
    const normalized = normalize(text);

    return aliases.some(function (alias) {
      return normalized === alias || normalized.indexOf(alias) !== -1;
    });
  }

  function normalize(text) {
    return String(text || "")
      .toLowerCase()
      .replace(/[^a-z]+/g, " ")
      .trim();
  }

  function findItems(block, selector) {
    if (block.sectionLike) {
      return Array.from(block.container.querySelectorAll(selector)).filter(function (element) {
        return element !== block.heading && !element.contains(block.heading);
      });
    }

    const items = [];
    let sibling = block.heading.nextElementSibling;

    while (sibling && !sibling.matches(HEADING_SELECTOR)) {
      if (sibling.matches(selector)) {
        items.push(sibling);
      } else {
        sibling.querySelectorAll(selector).forEach(function (element) {
          items.push(element);
        });
      }

      sibling = sibling.nextElementSibling;
    }

    return items;
  }

  function renderResume() {
    if (!dom.captures) return;

    setElementText(dom.captures.fullName, state.fields.fullName);
    setElementText(dom.captures.jobTitle, state.fields.jobTitle);
    renderPhoto();
    renderContacts();
    renderSummary();
    renderCollection("experience", fillExperienceItem);
    renderCollection("education", fillEducationItem);
    renderCollection("skills", fillRatedItem);
    renderCollection("languages", fillRatedItem);
    renderCollection("certifications", fillTextItem);
    renderCollection("achievements", fillTextItem);
  }

  function updatePhoto(file) {
    if (state.photoObjectUrl) {
      URL.revokeObjectURL(state.photoObjectUrl);
      state.photoObjectUrl = "";
    }

    if (file) {
      state.photoObjectUrl = URL.createObjectURL(file);
      state.fields.photo = state.photoObjectUrl;
    } else {
      state.fields.photo = DEFAULT_PROFILE_IMAGE;
    }

    const preview = dom.panel.querySelector("[data-photo-preview]");
    if (preview) {
      preview.src = state.fields.photo;
    }

    renderPhoto();
  }

  function renderPhoto() {
    if (!dom.captures.photo) {
      return;
    }

    dom.captures.photo.images.forEach(function (image) {
      image.src = state.fields.photo || DEFAULT_PROFILE_IMAGE;
      image.style.display = "";
    });
  }

  function renderContacts() {
    const values = [state.fields.phone, state.fields.email, state.fields.location, state.fields.link];

    dom.captures.contactBoxes.forEach(function (box) {
      const children = Array.from(box.querySelectorAll(":scope > .contact-item, :scope > span, :scope > p, :scope > div")).filter(function (child) {
        return !child.matches(HEADING_SELECTOR);
      });

      if (children.length > 0) {
        while (children.length < values.length) {
          const extra = children[children.length - 1] ? children[children.length - 1].cloneNode(true) : document.createElement("span");
          extra.textContent = "";
          box.appendChild(extra);
          children.push(extra);
        }

        children.forEach(function (child, index) {
          setContactChild(child, values[index] || "");
        });
        return;
      }

      box.innerHTML = values.filter(Boolean).map(escapeHtml).join("<br>");
    });
  }

  function setContactChild(child, value) {
    if (!value) {
      child.textContent = "";
      child.style.display = "none";
      return;
    }

    child.style.display = "";

    const spans = Array.from(child.querySelectorAll(":scope > span"));
    if (spans.length > 1) {
      spans[spans.length - 1].textContent = value;
    } else {
      child.textContent = value;
    }
  }

  function renderSummary() {
    if (!dom.captures.summary || !dom.captures.summary.target) {
      return;
    }

    dom.captures.summary.target.textContent = state.fields.summary;
  }

  function renderCollection(type, fillItem) {
    const capture = dom.captures[type];
    if (!capture) return;

    clearCollection(capture);

    state.collections[type].filter(hasAnyValue).forEach(function (entry) {
      const item = capture.template.cloneNode(true);
      item.dataset.builderLive = "true";
      item.style.display = "";
      clearTextNodes(item);
      fillItem(item, entry);
      appendCollectionItem(capture, item);
    });
  }

  function clearCollection(capture) {
    const items = getCurrentCollectionItems(capture);

    items.forEach(function (item) {
      item.remove();
    });
  }

  function getCurrentCollectionItems(capture) {
    if (capture.block.sectionLike && capture.parent) {
      return Array.from(capture.parent.children).filter(function (child) {
        return child.dataset.builderLive === "true" || child.matches(capture.selector);
      });
    }

    return findItems(capture.block, capture.selector);
  }

  function appendCollectionItem(capture, item) {
    if (capture.block.sectionLike) {
      capture.parent.appendChild(item);
      return;
    }

    let reference = capture.block.heading;
    while (reference.nextElementSibling && reference.nextElementSibling.dataset.builderLive === "true") {
      reference = reference.nextElementSibling;
    }
    reference.insertAdjacentElement("afterend", item);
  }

  function fillExperienceItem(item, entry) {
    setFirstText(item, "h3, .jobtitle, .position, .role-title", entry.role);
    setFirstText(item, ".company, .employer", entry.company);

    const hasPlace = setFirstText(item, ".place, .loc", entry.place);
    const combinedDate = [entry.date, entry.place].filter(Boolean);
    const combinedTarget = findFirst(item, ".date-location, .date-place");

    if (combinedTarget) {
      setMultilineText(combinedTarget, combinedDate);
    } else {
      const dateTarget = findFirst(item, ".date, .period");
      if (dateTarget) {
        setMultilineText(dateTarget, !hasPlace && entry.place ? combinedDate : [entry.date].filter(Boolean));
      }
      if (!hasPlace) setFirstText(item, ".location", entry.place);
    }

    fillBulletList(item, entry.details);
  }

  function fillEducationItem(item, entry) {
    const degreeTarget = setFirstText(item, "h3, .degree, b", entry.degree);
    setFirstText(item, ".school, .company", entry.school);

    const metaTarget = findFirst(item, ".edu-meta, .meta");
    if (metaTarget) {
      const spans = Array.from(metaTarget.querySelectorAll(":scope > span"));

      if (spans.length > 1) {
        spans[0].textContent = entry.date;
        spans[1].textContent = entry.place;
      } else {
        setMultilineText(metaTarget, [entry.date, entry.place].filter(Boolean));
      }
    } else {
      const dateTarget = findFirst(item, ".date");
      const placeTarget = findFirst(item, ".place, .loc");

      if (dateTarget) {
        setFirstText(item, ".date", entry.date);
      }

      if (placeTarget) {
        if (!dateTarget && entry.date) {
          setMultilineText(placeTarget, [entry.date, entry.place].filter(Boolean));
        } else {
          setFirstText(item, ".place, .loc", entry.place);
        }
      }
    }

    setFirstText(item, ".field", entry.details);

    if (!degreeTarget && item.matches("p")) {
      setMultilineText(item, [entry.degree, entry.school, entry.date, entry.place, entry.details].filter(Boolean));
    }
  }

  function fillRatedItem(item, entry) {
    if (item.matches("li") || item.matches(".pill")) {
      item.textContent = [entry.name, entry.level].filter(Boolean).join(" - ");
      return;
    }

    const nameTarget = setFirstText(
      item,
      ".skill-name, .language-name, .lang-name, .skill-top > span:first-child, .language-top > span:first-child, .language-row > span:first-child, .lang-row > span:first-child, .skill-row > span:first-child",
      entry.name
    );

    setFirstText(item, ".level, .lang-level, .skill-top > span:nth-child(2), .language-top > span:nth-child(2)", entry.level);

    if (!nameTarget && entry.name) {
      item.insertBefore(document.createTextNode(entry.name + (entry.level ? " " : "")), item.firstChild);
    }
  }

  function fillTextItem(item, entry) {
    const lines = splitLines(entry.value);

    if (item.matches("li")) {
      item.textContent = entry.value;
      return;
    }

    if (item.querySelector("li")) {
      fillBulletList(item, entry.value);
      return;
    }

    setMultilineText(item, lines);
  }

  function fillBulletList(item, value) {
    const list = item.querySelector("ul");
    if (!list) return;

    list.innerHTML = "";
    splitLines(value).forEach(function (line) {
      const bullet = document.createElement("li");
      bullet.textContent = line;
      list.appendChild(bullet);
    });
  }

  function splitLines(value) {
    return String(value || "")
      .split(/\n+/)
      .map(function (line) {
        return line.trim();
      })
      .filter(Boolean);
  }

  function hasAnyValue(entry) {
    return Object.keys(entry).some(function (key) {
      return String(entry[key] || "").trim() !== "";
    });
  }

  function setElementText(element, value) {
    if (element) {
      element.textContent = value;
    }
  }

  function setFirstText(root, selector, value) {
    const element = findFirst(root, selector);

    if (element) {
      element.textContent = value;
    }

    return element;
  }

  function findFirst(root, selector) {
    try {
      return root.querySelector(selector);
    } catch (error) {
      return null;
    }
  }

  function setMultilineText(element, lines) {
    element.textContent = "";
    lines.forEach(function (line, index) {
      if (index > 0) {
        element.appendChild(document.createElement("br"));
      }
      element.appendChild(document.createTextNode(line));
    });
  }

  function clearTextNodes(element) {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    const nodes = [];

    while (walker.nextNode()) {
      nodes.push(walker.currentNode);
    }

    nodes.forEach(function (node) {
      node.nodeValue = "";
    });
  }

  function createGenericItem(type) {
    if (type === "experience") {
      const item = document.createElement("div");
      item.className = "item";
      item.innerHTML = "<h3></h3><div class=\"company\"></div><div class=\"date-location\"></div><ul></ul>";
      return item;
    }

    if (type === "education") {
      const item = document.createElement("div");
      item.className = "item";
      item.innerHTML = "<h3></h3><div class=\"school\"></div><div class=\"edu-meta\"></div>";
      return item;
    }

    if (type === "skills" || type === "languages") {
      const item = document.createElement("div");
      item.className = type === "skills" ? "skill" : "language-row";
      item.innerHTML = "<span></span><span class=\"level\"></span>";
      return item;
    }

    const item = document.createElement("li");
    item.className = type.slice(0, -1);
    return item;
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function escapeAttribute(value) {
    return escapeHtml(value).replace(/"/g, "&quot;");
  }
})();
