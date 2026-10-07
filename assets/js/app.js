(function () {
  "use strict";

  var CONTACT_EMAIL = "julien@microsoft.com";
  var MAIL_SUBJECT = "Organisation d'une journée de conférence";
  var CART_KEY = "conf-catalog.cart.v1";

  var state = {
    sessions: [],
    cart: [],
    filter: ""
  };

  var el = {
    catalog: document.getElementById("catalog"),
    search: document.getElementById("search"),
    cartList: document.getElementById("cart-list"),
    cartCount: document.getElementById("cart-count"),
    cartEmpty: document.getElementById("cart-empty"),
    clearCart: document.getElementById("clear-cart"),
    wantBtn: document.getElementById("want-btn"),
    dialog: document.getElementById("request-dialog"),
    form: document.getElementById("request-form"),
    cancel: document.getElementById("cancel-request"),
    mailto: document.getElementById("mailto-btn"),
    toast: document.getElementById("toast")
  };

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }

  var toastTimer = null;

  function toast(message) {
    el.toast.textContent = message;
    el.toast.classList.add("is-visible");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      el.toast.classList.remove("is-visible");
    }, 3200);
  }

  function loadCart() {
    try {
      var raw = window.localStorage.getItem(CART_KEY);
      state.cart = raw ? JSON.parse(raw) : [];
    } catch (err) {
      state.cart = [];
    }
    if (!Array.isArray(state.cart)) {
      state.cart = [];
    }
  }

  function saveCart() {
    window.localStorage.setItem(CART_KEY, JSON.stringify(state.cart));
  }

  function inCart(id) {
    return state.cart.indexOf(id) !== -1;
  }

  function cartSessions() {
    return state.cart
      .map(function (id) {
        return state.sessions.filter(function (s) {
          return s.id === id;
        })[0];
      })
      .filter(Boolean);
  }

  function toggle(id) {
    if (inCart(id)) {
      state.cart = state.cart.filter(function (item) {
        return item !== id;
      });
    } else {
      state.cart.push(id);
    }
    saveCart();
    render();
  }

  function matchesFilter(session) {
    if (!state.filter) {
      return true;
    }
    var haystack = (session.title + " " + session.description + " " + session.keywords.join(" ")).toLowerCase();
    return haystack.indexOf(state.filter) !== -1;
  }

  function renderCatalog() {
    var visible = state.sessions.filter(matchesFilter);

    if (!visible.length) {
      el.catalog.innerHTML = '<p class="muted">Aucune session ne correspond à votre recherche.</p>';
      return;
    }

    el.catalog.innerHTML = visible
      .map(function (session) {
        var selected = inCart(session.id);
        var tags = session.keywords
          .map(function (keyword) {
            return '<li class="tag">' + escapeHtml(keyword) + "</li>";
          })
          .join("");

        return (
          '<article class="card">' +
          "<h3>" + escapeHtml(session.title) + "</h3>" +
          (session.description
            ? '<p class="card__description">' + escapeHtml(session.description) + "</p>"
            : "") +
          (tags ? '<ul class="tags">' + tags + "</ul>" : "") +
          '<div class="card__footer">' +
          '<button type="button" class="btn ' + (selected ? "btn--ghost" : "btn--primary") +
          '" data-toggle="' + escapeHtml(session.id) + '">' +
          (selected ? "Retirer du panier" : "Ajouter au panier") +
          "</button>" +
          "</div>" +
          "</article>"
        );
      })
      .join("");
  }

  function renderCart() {
    var sessions = cartSessions();
    el.cartCount.textContent = String(sessions.length);
    el.cartEmpty.classList.toggle("hidden", sessions.length > 0);
    el.wantBtn.disabled = sessions.length === 0;
    el.clearCart.disabled = sessions.length === 0;

    el.cartList.innerHTML = sessions
      .map(function (session) {
        return (
          '<li class="cart__item">' +
          "<span>" + escapeHtml(session.title) + "</span>" +
          '<button type="button" class="btn btn--small btn--danger" data-remove="' +
          escapeHtml(session.id) + '" aria-label="Retirer cette session">✕</button>' +
          "</li>"
        );
      })
      .join("");
  }

  function render() {
    renderCatalog();
    renderCart();
  }

  function formatDate(value) {
    if (!value) {
      return "à définir ensemble";
    }
    var parts = value.split("-");
    if (parts.length !== 3) {
      return value;
    }
    return parts[2] + "/" + parts[1] + "/" + parts[0];
  }

  function buildEmailBody(data) {
    var lines = [];
    lines.push("Bonjour,");
    lines.push("");
    lines.push(
      "Je souhaiterais organiser une journée de conférence le " + formatDate(data.date) + "."
    );
    lines.push("");
    lines.push("Voici mes coordonnées :");
    lines.push("- Nom : " + data.nom);
    lines.push("- Prénom : " + data.prenom);
    lines.push("- E-mail : " + data.email);
    lines.push("- Téléphone : " + data.telephone);
    if (data.societe) {
      lines.push("- Société : " + data.societe);
    }
    lines.push("");
    lines.push("Je suis intéressé(e) par le fait de rejouer chez moi les sessions suivantes :");
    cartSessions().forEach(function (session, index) {
      lines.push(index + 1 + ". " + session.title +
        (session.keywords.length ? " (" + session.keywords.join(", ") + ")" : ""));
    });
    if (data.message) {
      lines.push("");
      lines.push("Informations complémentaires :");
      lines.push(data.message);
    }
    lines.push("");
    lines.push("Merci d'avance pour votre retour.");
    lines.push("");
    lines.push("Bien cordialement,");
    lines.push(data.prenom + " " + data.nom);
    return lines.join("\n");
  }

  function readForm() {
    var fd = new FormData(el.form);
    return {
      nom: String(fd.get("nom") || "").trim(),
      prenom: String(fd.get("prenom") || "").trim(),
      email: String(fd.get("email") || "").trim(),
      telephone: String(fd.get("telephone") || "").trim(),
      societe: String(fd.get("societe") || "").trim(),
      date: String(fd.get("date") || "").trim(),
      message: String(fd.get("message") || "").trim()
    };
  }

  /* Messages de validation en français, quelle que soit la langue du navigateur. */
  var VALIDATION_MESSAGES = {
    email: "Veuillez saisir une adresse e-mail valide, par exemple nom@exemple.fr.",
    telephone: "Veuillez saisir un numéro de téléphone valide (chiffres, espaces, + ou -)."
  };

  function validationMessage(field) {
    var v = field.validity;
    if (v.valueMissing) {
      return "Ce champ est obligatoire.";
    }
    if (v.typeMismatch || v.patternMismatch) {
      return VALIDATION_MESSAGES[field.id] || "Le format saisi n'est pas valide.";
    }
    if (v.tooShort) {
      return "Veuillez saisir au moins " + field.minLength + " caractères.";
    }
    if (v.badInput) {
      return "La valeur saisie n'est pas valide.";
    }
    return "";
  }

  function refreshValidity(field) {
    field.setCustomValidity("");
    field.setCustomValidity(validationMessage(field));
  }

  function refreshAllValidity() {
    Array.prototype.forEach.call(el.form.elements, function (field) {
      if (field.willValidate) {
        refreshValidity(field);
      }
    });
  }

  function setupFrenchValidation() {
    Array.prototype.forEach.call(el.form.elements, function (field) {
      if (!field.willValidate) {
        return;
      }
      var refresh = function () {
        refreshValidity(field);
      };
      field.addEventListener("input", refresh);
      field.addEventListener("blur", refresh);
      field.addEventListener("invalid", refresh);
    });
  }

  function updateMailto() {
    var data = readForm();
    var href =
      "mailto:" + CONTACT_EMAIL +
      "?subject=" + encodeURIComponent(MAIL_SUBJECT) +
      "&body=" + encodeURIComponent(buildEmailBody(data));
    el.mailto.setAttribute("href", href);
  }

  el.catalog.addEventListener("click", function (event) {
    var button = event.target.closest("[data-toggle]");
    if (button) {
      toggle(button.getAttribute("data-toggle"));
    }
  });

  el.cartList.addEventListener("click", function (event) {
    var button = event.target.closest("[data-remove]");
    if (button) {
      toggle(button.getAttribute("data-remove"));
    }
  });

  el.search.addEventListener("input", function (event) {
    state.filter = event.target.value.trim().toLowerCase();
    renderCatalog();
  });

  el.clearCart.addEventListener("click", function () {
    state.cart = [];
    saveCart();
    render();
  });

  el.wantBtn.addEventListener("click", function () {
    updateMailto();
    el.dialog.showModal();
  });

  el.cancel.addEventListener("click", function () {
    el.dialog.close();
  });

  el.form.addEventListener("input", updateMailto);

  el.mailto.addEventListener("click", function (event) {
    refreshAllValidity();
    if (!el.form.reportValidity()) {
      event.preventDefault();
      return;
    }
    updateMailto();
    el.dialog.close();
    toast("Votre messagerie s'ouvre avec la demande pré-remplie ✉️");
  });

  loadCart();
  setupFrenchValidation();

  window.ConferenceStore.load()
    .then(function (result) {
      state.sessions = result.db.sessions;
      state.cart = state.cart.filter(function (id) {
        return state.sessions.some(function (s) {
          return s.id === id;
        });
      });
      saveCart();
      render();
    })
    .catch(function (err) {
      el.catalog.innerHTML = '<p class="muted">Erreur de chargement du catalogue : ' +
        escapeHtml(err.message) + "</p>";
    });
})();
