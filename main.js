// инициализация
document.addEventListener("DOMContentLoaded", () => {
  setupContactFormValidation();
  setupMessageCounter();
  setupAnimalDetailPage();
  setupFaqAccordion();
  setupHomeHeaderScroll();
});

/** шапка сайта */
function setupHomeHeaderScroll() {
  if (!document.body.classList.contains("page-home")) return;
  const header = document.querySelector("header");
  if (!header) return;

  const scrollThresholdPx = 32;

  const update = () => {
    const y = window.scrollY || document.documentElement.scrollTop;
    header.classList.toggle("header-scrolled", y > scrollThresholdPx);
  };

  update();
  window.addEventListener("scroll", update, { passive: true });
}

/** форма */
function setupContactFormValidation() {
  const form = document.querySelector(".contact-form");
  if (!form) return;

  const formSubmitEmail = form.dataset.formsubmitEmail;
  if (!formSubmitEmail) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = form.querySelector("#name");
    const email = form.querySelector("#email");
    const phone = form.querySelector("#phone");
    const message = form.querySelector("#message");
    const submitBtn = form.querySelector('button[type="submit"]');

    const errors = [];
    if (!name.value.trim()) errors.push("Введите ваше имя.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) errors.push("Введите корректный email.");
    if (!/^\+?[\d\s()\-]{10,}$/.test(phone.value.trim())) errors.push("Введите корректный телефон.");
    if (!message.value.trim() || message.value.trim().length < 10) errors.push("Сообщение должно содержать минимум 10 символов.");
    if (message.value.trim().length > 500) errors.push("Сообщение не должно превышать 500 символов.");

    if (errors.length) {
      alert(errors.join("\n"));
      return;
    }

    const payload = {
      name: name.value.trim(),
      email: email.value.trim(),
      phone: phone.value.trim(),
      message: message.value.trim(),
      _subject: "Сообщение с сайта WildSphere (форма контактов)",
      _replyto: email.value.trim(),
    };

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.dataset.prevLabel = submitBtn.textContent;
      submitBtn.textContent = "Отправка…";
    }

    try {
      const res = await fetch(`https://formsubmit.co/ajax/${formSubmitEmail}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || data.error || "Ошибка отправки");
      }
      alert("Сообщение отправлено. Спасибо!");
      form.reset();
    } catch (err) {
      if (window.location.protocol === "file:") {
        form.submit();
        return;
      }
      alert(
        "Не удалось отправить сообщение. Проверьте подключение к интернету или попробуйте позже.\n\n" +
          (err.message || "")
      );
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        if (submitBtn.dataset.prevLabel) submitBtn.textContent = submitBtn.dataset.prevLabel;
      }
    }
  });
}

/** поле сообщения */
function setupMessageCounter() {
  const messageField = document.querySelector("#message");
  const counter = document.querySelector("#message-counter");
  if (!messageField || !counter) return;

  const maxLength = Number(messageField.getAttribute("maxlength")) || 500;
  const updateCounter = () => {
    counter.textContent = `${messageField.value.length}/${maxLength}`;
  };

  messageField.addEventListener("input", updateCounter);
  updateCounter();
}

/** животное */
async function setupAnimalDetailPage() {
  const detailContainer = document.querySelector("#animal-detail");
  if (!detailContainer) return;

  const params = new URLSearchParams(window.location.search);
  const animalId = params.get("id");

  if (!animalId) {
    renderAnimalError(detailContainer, "Животное не выбрано.");
    return;
  }

  try {
    const response = await fetch("animals.xml");
    if (!response.ok) {
      throw new Error("Не удалось загрузить animals.xml");
    }

    const xmlText = await response.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "application/xml");
    const parseError = xmlDoc.querySelector("parsererror");
    if (parseError) {
      throw new Error("Ошибка чтения XML.");
    }

    const animalNodes = Array.from(xmlDoc.querySelectorAll("animal"));
    const animalNode = animalNodes.find((node) => {
      const imagePath = node.querySelector("image")?.textContent?.trim() || "";
      return normalizeAnimalId(imagePath) === animalId;
    });

    if (!animalNode) {
      renderAnimalError(detailContainer, "Карточка животного не найдена.");
      return;
    }

    const name = animalNode.querySelector("name")?.textContent?.trim() || "Без названия";
    const latin = animalNode.querySelector("latin")?.textContent?.trim() || "";
    const description = (animalNode.querySelector("description")?.textContent || "").replace(/\s+$/, "");
    const image = animalNode.querySelector("image")?.textContent?.trim() || "";

    document.title = `${name} — WildSphere`;
    detailContainer.innerHTML = `
      <a href="animals.html" class="animal-back-link">← Назад к списку животных</a>
      <article class="animal-detail-card">
        <img src="${image}" alt="${name}" class="animal-detail-image">
        <div class="animal-detail-body">
          <h1 class="animal-detail-title">${name}</h1>
          <p class="animal-detail-latin">${latin}</p>
          <p class="animal-detail-description">${description}</p>
        </div>
      </article>
    `;
  } catch (error) {
    renderAnimalError(detailContainer, "Не удалось открыть карточку. Попробуйте позже.");
  }
}

/** животное: id */
function normalizeAnimalId(imagePath) {
  return imagePath
    .split("/")
    .pop()
    .replace(/\.[^.]+$/, "");
}

/** животное: ошибка */
function renderAnimalError(container, message) {
  container.innerHTML = `
    <p class="animal-error">${message}</p>
    <p><a href="animals.html" class="animal-back-link">Вернуться к списку животных</a></p>
  `;
}

/** FAQ */
function setupFaqAccordion() {
  const faqItems = Array.from(document.querySelectorAll(".faq-item"));
  if (!faqItems.length) return;

  faqItems.forEach((item) => {
    const summary = item.querySelector("summary");
    if (!summary) return;

    summary.addEventListener("click", (event) => {
      event.preventDefault();
      const isOpen = item.hasAttribute("open");

      faqItems.forEach((faqItem) => faqItem.removeAttribute("open"));
      if (!isOpen) item.setAttribute("open", "");
    });
  });
}
