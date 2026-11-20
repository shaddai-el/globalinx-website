/* =========================================================
   GLOBALINX — Script principal (version sécurisée)
   ========================================================= */
(() => {
  "use strict";

  /* Tes coordonnées publiques.
     RÈGLE DE SÉCURITÉ : ce fichier est lisible par tous les visiteurs.
     N'y mets JAMAIS de clé API, de mot de passe ou de jeton secret. */
  const CONFIG = Object.freeze({
    emailUser: "globalinx.ssn",      // partie avant le @
    emailDomain: "gmail.com",        // partie après le @
    whatsappNumber: "8617614012814", // format international, chiffres uniquement
    whatsappDisplay: "+86 176 1401 2814",
    minFillTimeMs: 4000,             // anti-robot : délai minimum avant envoi
    cooldownMs: 60000,               // anti-spam : 1 envoi par minute maximum
    messageMax: 1500,
  });

  const POLES = ["sourcing", "education", "autre"];

  /* ---------- 1. Coordonnées (e-mail assemblé ici, invisible pour les robots du HTML) ---------- */
  const email = `${CONFIG.emailUser}@${CONFIG.emailDomain}`;
  document.querySelectorAll('[data-contact="email"]').forEach((el) => {
    el.textContent = email;
    el.setAttribute("href", `mailto:${email}`);
  });
  document.querySelectorAll('[data-contact="whatsapp"]').forEach((el) => {
    el.textContent = CONFIG.whatsappDisplay;
    el.setAttribute("href", `https://wa.me/${CONFIG.whatsappNumber}`);
    el.setAttribute("rel", "noopener noreferrer");
    el.setAttribute("target", "_blank");
  });

  /* ---------- 2. Menu mobile ---------- */
  const burger = document.querySelector(".burger");
  const menu = document.getElementById("menu");
  if (burger && menu) {
    const setOpen = (open) => {
      menu.classList.toggle("open", open);
      burger.setAttribute("aria-expanded", String(open));
      burger.setAttribute("aria-label", open ? "Fermer le menu" : "Ouvrir le menu");
    };
    burger.addEventListener("click", () => setOpen(!menu.classList.contains("open")));
    menu.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => setOpen(false)));
  }

  /* ---------- 3. Année du pied de page ---------- */
  document.querySelectorAll("[data-year]").forEach((el) => {
    el.textContent = String(new Date().getFullYear());
  });

  /* ---------- 4. Formulaire de demande ---------- */
  const form = document.getElementById("contact-form");
  if (form) setupForm(form);

  /* ---------- 5. Apparition au défilement (après l'affichage du formulaire) ---------- */
  const revealItems = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    revealItems.forEach((el) => observer.observe(el));
  } else {
    revealItems.forEach((el) => el.classList.add("visible"));
  }

  /* =========================================================
     Formulaire : nettoyage, validation stricte, anti-spam
     ========================================================= */
  function setupForm(form) {
    const loadedAt = Date.now();
    form.hidden = false; // le formulaire n'apparaît que si JavaScript fonctionne

    // Expressions autorisées (liste blanche)
    const RE = {
      name: /^[\p{L}\p{M}][\p{L}\p{M}'’ .-]*$/u,
      email: /^[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*\.[A-Za-z]{2,24}$/,
      phone: /^\+?[0-9 ().-]{6,20}$/,
      line: /^[\p{L}\p{M}\p{N} '’.,;:()&/+#%-]+$/u,
      place: /^[\p{L}\p{M} '’.-]+$/u,
      integer: /^[0-9]{1,8}$/,
    };
    const URL_RE = /(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|ru|xyz|top|info|biz|io)\b)/i;
    const HTML_RE = /<\s*\/?\s*[a-z][^>]*>|\[\s*\/?\s*url/i;

    // Règles de chaque champ
    const COMMON = {
      nom:       { required: true, min: 2, max: 80, pattern: RE.name, msg: "Lettres, espaces, apostrophes et tirets uniquement." },
      email:     { required: true, max: 254, pattern: RE.email, msg: "Adresse e-mail invalide.", allowUrl: true },
      telephone: { required: false, max: 20, pattern: RE.phone, msg: "Numéro invalide (chiffres, espaces, + ( ) - .).",
                   check: (v) => { const n = v.replace(/\D/g, "").length; return n < 6 || n > 15 ? "Le numéro doit contenir entre 6 et 15 chiffres." : ""; } },
      pole:      { required: true, oneOf: POLES },
    };
    const SOURCING = {
      produit:     { required: true, min: 2, max: 120, pattern: RE.line, msg: "Caractères non autorisés." },
      categorie:   { required: true, oneOf: ["vehicules", "electronique", "mode", "maison", "machines", "packaging", "controle-qualite", "logistique", "autre"] },
      quantite:    { required: true, pattern: RE.integer, msg: "Indiquez un nombre entier.",
                     check: (v) => { const n = Number(v); return n < 1 || n > 10000000 ? "Quantité entre 1 et 10 000 000." : ""; } },
      destination: { required: true, min: 2, max: 60, pattern: RE.place, msg: "Lettres, espaces et tirets uniquement." },
      budget:      { required: false, oneOf: ["", "moins-5k", "5k-20k", "20k-100k", "plus-100k"] },
    };
    const EDUCATION = {
      niveau:            { required: true, oneOf: ["lycee", "licence", "master", "autre"] },
      diplome:           { required: true, oneOf: ["langue", "licence", "master", "doctorat", "autre"] },
      domaine:           { required: true, min: 2, max: 80, pattern: RE.line, msg: "Caractères non autorisés." },
      rentree:           { required: true, oneOf: ["moins-6-mois", "6-12-mois", "plus-12-mois", "indecis"] },
    };
    const FINAL = {
      message:     { required: true, min: 20, max: CONFIG.messageMax, multiline: true,
                     check: (v) => {
                       if (HTML_RE.test(v)) return "Le code HTML ou BBCode n'est pas autorisé.";
                       if ((v.match(/https?:\/\/|www\./gi) || []).length > 2) return "Trop de liens dans le message (2 maximum).";
                       return "";
                     } },
      consentement: { type: "checkbox", required: true, msg: "Votre accord est nécessaire pour traiter la demande." },
    };

    const poleSelect = form.elements.namedItem("pole");
    const groups = {
      sourcing: document.getElementById("groupe-sourcing"),
      education: document.getElementById("groupe-education"),
    };
    const status = document.getElementById("form-status");

    // Pré-sélection via ?pole=… (liste blanche, jamais injecté tel quel)
    const fromUrl = new URLSearchParams(window.location.search).get("pole");
    if (POLES.includes(fromUrl)) poleSelect.value = fromUrl;

    // Affiche seulement les champs du pôle choisi (les autres sont désactivés = non envoyés, non validés)
    const updateGroups = () => {
      Object.entries(groups).forEach(([key, fs]) => {
        if (!fs) return;
        const active = key === poleSelect.value;
        fs.hidden = !active;
        fs.disabled = !active;
      });
    };
    poleSelect.addEventListener("change", updateGroups);
    updateGroups();

    // Compteur de caractères du message
    const msgField = form.elements.namedItem("message");
    const counter = document.getElementById("message-count");
    const updateCounter = () => {
      if (counter) counter.textContent = `${[...msgField.value].length} / ${CONFIG.messageMax}`;
    };
    msgField.addEventListener("input", updateCounter);
    updateCounter();

    /* Nettoyage : normalise l'Unicode, supprime les caractères de contrôle
       et les caractères invisibles d'inversion de texte (usurpation). */
    const INVISIBLE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F​-\u200F\u202A-\u202E⁠-\u2069﻿]/g;
    const clean = (value, multiline) => {
      let v = String(value ?? "").normalize("NFC").replace(INVISIBLE, "");
      if (multiline) {
        v = v.replace(/\r\n?/g, "\n").replace(/\t/g, " ").replace(/[ ]{2,}/g, " ").replace(/\n{3,}/g, "\n\n");
      } else {
        v = v.replace(/\s+/g, " ");
      }
      return v.trim();
    };

    const length = (s) => [...s].length; // compte correctement les accents et emojis

    const checkField = (name, rule) => {
      const el = form.elements.namedItem(name);
      if (!el) return { value: "", error: "" };

      if (rule.type === "checkbox") {
        return { value: el.checked, error: rule.required && !el.checked ? rule.msg : "" };
      }

      const value = clean(el.value, rule.multiline);
      let error = "";
      if (!value) {
        if (rule.required) error = "Ce champ est obligatoire.";
      } else if (rule.oneOf && !rule.oneOf.includes(value)) {
        error = "Choix invalide.";
      } else if (rule.min && length(value) < rule.min) {
        error = `Au moins ${rule.min} caractères.`;
      } else if (rule.max && length(value) > rule.max) {
        error = `${rule.max} caractères maximum.`;
      } else if (!rule.multiline && !rule.allowUrl && !rule.oneOf && URL_RE.test(value)) {
        error = "Les liens ne sont pas autorisés dans ce champ.";
      } else if (rule.pattern && !rule.pattern.test(value)) {
        error = rule.msg || "Format invalide.";
      } else if (rule.check) {
        error = rule.check(value) || "";
      }
      return { value, error };
    };

    const showError = (name, error) => {
      const el = form.elements.namedItem(name);
      const errEl = document.getElementById(`err-${name}`);
      if (el) el.setAttribute("aria-invalid", error ? "true" : "false");
      if (errEl) errEl.textContent = error; // textContent : jamais interprété comme du HTML
    };

    const activeRules = () => {
      const pole = poleSelect.value;
      return {
        ...COMMON,
        ...(pole === "sourcing" ? SOURCING : {}),
        ...(pole === "education" ? EDUCATION : {}),
        ...FINAL,
      };
    };

    const validateAll = () => {
      const rules = activeRules();
      const values = {};
      let firstInvalid = null;
      Object.entries(rules).forEach(([name, rule]) => {
        const { value, error } = checkField(name, rule);
        showError(name, error);
        values[name] = value;
        if (error && !firstInvalid) firstInvalid = form.elements.namedItem(name);
      });
      return { values, firstInvalid };
    };

    // Re-vérifie un champ en direct dès qu'il a été signalé en erreur
    form.addEventListener("input", (e) => {
      const name = e.target.name;
      const rule = activeRules()[name];
      if (rule && e.target.getAttribute("aria-invalid") === "true") showError(name, checkField(name, rule).error);
    });
    form.addEventListener("focusout", (e) => {
      const name = e.target.name;
      const rule = activeRules()[name];
      if (rule && rule.type !== "checkbox" && e.target.value) showError(name, checkField(name, rule).error);
    });

    const optionLabel = (name) => {
      const el = form.elements.namedItem(name);
      return el && el.selectedIndex >= 0 ? el.options[el.selectedIndex].text : "-";
    };

    const buildMessage = (v) => {
      const lines = [
        `Nom : ${v.nom}`,
        `E-mail : ${v.email}`,
        `Téléphone / WhatsApp : ${v.telephone || "-"}`,
        `Pôle : ${optionLabel("pole")}`,
      ];
      if (v.pole === "sourcing") {
        lines.push(
          "", "— Demande de sourcing —",
          `Produit : ${v.produit}`,
          `Catégorie : ${optionLabel("categorie")}`,
          `Quantité : ${v.quantite}`,
          `Pays de livraison : ${v.destination}`,
          `Budget : ${optionLabel("budget")}`
        );
      }
      if (v.pole === "education") {
        lines.push(
          "", "— Demande d'admission —",
          `Niveau actuel : ${optionLabel("niveau")}`,
          `Diplôme visé : ${optionLabel("diplome")}`,
          "Destination : Chine",
          `Domaine d'études : ${v.domaine}`,
          `Départ souhaité : ${optionLabel("rentree")}`
        );
      }
      lines.push("", "Message :", v.message);
      // Le sujet ne contient AUCUNE saisie utilisateur (évite toute injection d'en-tête)
      return { subject: `Demande Globalinx – ${optionLabel("pole")}`, body: lines.join("\n") };
    };

    const setStatus = (text, isError) => {
      status.textContent = text;
      status.classList.toggle("is-error", Boolean(isError));
    };

    // Limite d'envoi (stockage local : peut être indisponible, d'où le try/catch)
    const STORAGE_KEY = "glx_last_send";
    const lastSend = () => { try { return Number(localStorage.getItem(STORAGE_KEY)) || 0; } catch { return 0; } };
    const markSent = () => { try { localStorage.setItem(STORAGE_KEY, String(Date.now())); } catch { /* ignoré */ } };

    // Contrôles anti-robot communs aux deux boutons. Renvoie le message prêt ou null.
    const prepare = () => {
      // Pot de miel : un humain ne voit pas ce champ, un robot le remplit
      const honeypot = form.elements.namedItem("site_web");
      if (honeypot && honeypot.value !== "") {
        setStatus("Merci, votre demande a bien été préparée.", false); // faux succès silencieux
        return null;
      }
      if (Date.now() - loadedAt < CONFIG.minFillTimeMs) {
        setStatus("Envoi trop rapide : merci de vérifier votre demande puis de réessayer.", true);
        return null;
      }
      const wait = CONFIG.cooldownMs - (Date.now() - lastSend());
      if (wait > 0) {
        setStatus(`Vous venez d'envoyer une demande. Réessayez dans ${Math.ceil(wait / 1000)} s.`, true);
        return null;
      }
      const { values, firstInvalid } = validateAll();
      if (firstInvalid) {
        setStatus("Certains champs sont à corriger.", true);
        firstInvalid.focus();
        return null;
      }
      return buildMessage(values);
    };

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const msg = prepare();
      if (!msg) return;
      markSent();
      window.location.href =
        `mailto:${email}?subject=${encodeURIComponent(msg.subject)}&body=${encodeURIComponent(msg.body)}`;
      setStatus("Votre messagerie va s'ouvrir avec votre demande prête à être envoyée.", false);
    });

    const waBtn = document.getElementById("whatsapp-btn");
    if (waBtn) {
      waBtn.addEventListener("click", () => {
        const msg = prepare();
        if (!msg) return;
        markSent();
        const url = `https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(`${msg.subject}\n\n${msg.body}`)}`;
        const win = window.open(url, "_blank", "noopener,noreferrer");
        if (win) win.opener = null;
        setStatus("WhatsApp s'ouvre avec votre demande prête à être envoyée.", false);
      });
    }
  }
})();
