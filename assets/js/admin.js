(function () {
  "use strict";

  /* --- Contrôle d'accès (obfusqué côté client, non sécurisé par nature) --- */
  var _0x1 = "Z2gtcGFnZXMtY29uZi0yMDI2Ojo=";
  var _0x2 = [
    "101fdffeb07c", "99a87d64a7eb", "ce35293d2a06",
    "e4a8fda16b02", "175a127f4088", "8245"
  ].join("");
  var _0x3 = "LlkTQwNDGwVEQABN";
  var _0x4 = "c0p1l0t";
  var SESSION_FLAG = "conf-catalog.admin.unlocked";

  function _dec(b64, key) {
    var raw = atob(b64);
    var out = "";
    for (var i = 0; i < raw.length; i += 1) {
      out += String.fromCharCode(raw.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return out;
  }

  function _sha256Hex(text) {
    if (!(window.crypto && window.crypto.subtle)) {
      return Promise.reject(new Error("no-subtle"));
    }
    return window.crypto.subtle
      .digest("SHA-256", new TextEncoder().encode(text))
      .then(function (buf) {
        return Array.prototype.map
          .call(new Uint8Array(buf), function (b) {
            return ("00" + b.toString(16)).slice(-2);
          })
          .join("");
      });
  }

  function checkPassword(candidate) {
    return _sha256Hex(atob(_0x1) + candidate)
      .then(function (hex) {
        return hex === _0x2;
      })
      .catch(function () {
        return candidate === _dec(_0x3, _0x4);
      });
  }

  /* --- Éléments --- */
  var gate = document.getElementById("gate");
  var panel = document.getElementById("admin-panel");
  var gateForm = document.getElementById("gate-form");
  var gateError = document.getElementById("gate-error");
  var rows = document.getElementById("admin-rows");
  var toastEl = document.getElementById("toast");
  var sourceLabel = document.getElementById("source-label");

  var db = { version: 1, updatedAt: "", sessions: [] };
  var toastTimer = null;

  function toast(message) {
    toastEl.textContent = message;
    toastEl.classList.add("is-visible");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      toastEl.classList.remove("is-visible");
    }, 3000);
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }

  function render() {
    if (!db.sessions.length) {
      rows.innerHTML = '<p class="muted">Aucune session. Cliquez sur « Ajouter une session ».</p>';
      return;
    }

    rows.innerHTML = db.sessions
      .map(function (session, index) {
        return (
          '<div class="admin-row" data-index="' + index + '">' +
          "<div>" +
          '<label for="title-' + index + '">Titre de la session</label>' +
          '<input id="title-' + index + '" type="text" data-field="title" value="' +
          escapeHtml(session.title) + '" />' +
          "</div>" +
          "<div>" +
          '<label for="kw-' + index + '">Mots-clés (séparés par des virgules)</label>' +
          '<input id="kw-' + index + '" type="text" data-field="keywords" value="' +
          escapeHtml(session.keywords.join(", ")) + '" />' +
          "</div>" +
          '<div class="admin-row__actions">' +
          '<button type="button" class="btn btn--small" data-action="up" ' +
          (index === 0 ? "disabled" : "") + ">↑</button>" +
          '<button type="button" class="btn btn--small" data-action="down" ' +
          (index === db.sessions.length - 1 ? "disabled" : "") + ">↓</button>" +
          '<button type="button" class="btn btn--small btn--danger" data-action="delete">Supprimer</button>' +
          "</div>" +
          "</div>"
        );
      })
      .join("");
  }

  function collect() {
    var inputs = rows.querySelectorAll(".admin-row");
    var sessions = [];
    var used = {};
    Array.prototype.forEach.call(inputs, function (row, index) {
      var title = row.querySelector('[data-field="title"]').value.trim();
      var keywords = row.querySelector('[data-field="keywords"]').value
        .split(",")
        .map(function (k) {
          return k.trim();
        })
        .filter(Boolean);
      if (!title) {
        return;
      }
      var previous = db.sessions[index];
      var id = previous && previous.id ? previous.id : window.ConferenceStore.slugify(title);
      if (!id || used[id]) {
        id = (window.ConferenceStore.slugify(title) || "session") + "-" + (index + 1);
      }
      used[id] = true;
      sessions.push({ id: id, title: title, keywords: keywords });
    });
    db.sessions = sessions;
    return db;
  }

  function unlock() {
    gate.classList.add("hidden");
    panel.classList.remove("hidden");
    initGitHubPanel();
    window.ConferenceStore.load().then(function (result) {
      db = result.db;
      sourceLabel.textContent =
        result.source === "local"
          ? "Brouillon local (non publié) — cliquez sur « Publier sur GitHub » pour le diffuser."
          : "Source : data/conferences.json (version publiée).";
      render();
    });
  }

  gateForm.addEventListener("submit", function (event) {
    event.preventDefault();
    var value = document.getElementById("password").value;
    checkPassword(value).then(function (ok) {
      if (ok) {
        window.sessionStorage.setItem(SESSION_FLAG, "1");
        gateError.textContent = "";
        unlock();
      } else {
        gateError.textContent = "Mot de passe incorrect.";
      }
    });
  });

  rows.addEventListener("click", function (event) {
    var button = event.target.closest("[data-action]");
    if (!button) {
      return;
    }
    collect();
    var index = Number(button.closest(".admin-row").getAttribute("data-index"));
    var action = button.getAttribute("data-action");

    if (action === "delete") {
      db.sessions.splice(index, 1);
    } else if (action === "up" && index > 0) {
      var tmp = db.sessions[index - 1];
      db.sessions[index - 1] = db.sessions[index];
      db.sessions[index] = tmp;
    } else if (action === "down" && index < db.sessions.length - 1) {
      var swap = db.sessions[index + 1];
      db.sessions[index + 1] = db.sessions[index];
      db.sessions[index] = swap;
    }
    render();
  });

  document.getElementById("add-session").addEventListener("click", function () {
    collect();
    db.sessions.push({ id: "", title: "Nouvelle session", keywords: [] });
    render();
    var last = rows.querySelector(".admin-row:last-child input");
    if (last) {
      last.focus();
      last.select();
    }
  });

  document.getElementById("save").addEventListener("click", function () {
    db = window.ConferenceStore.saveLocal(collect());
    sourceLabel.textContent = "Brouillon local (non publié) — pensez à publier sur GitHub.";
    toast("Brouillon enregistré localement ✅");
  });

  /* --- Publication GitHub --- */
  var ghFields = {
    owner: document.getElementById("gh-owner"),
    repo: document.getElementById("gh-repo"),
    branch: document.getElementById("gh-branch"),
    path: document.getElementById("gh-path"),
    token: document.getElementById("gh-token"),
    remember: document.getElementById("gh-remember"),
    status: document.getElementById("gh-status"),
    settings: document.getElementById("gh-settings")
  };

  function ghStatus(message, ok) {
    ghFields.status.textContent = message;
    ghFields.status.classList.toggle("is-ok", Boolean(ok));
  }

  function ghConfig() {
    return {
      owner: ghFields.owner.value.trim(),
      repo: ghFields.repo.value.trim(),
      branch: ghFields.branch.value.trim() || "master",
      path: ghFields.path.value.trim() || "data/conferences.json"
    };
  }

  function applyToken() {
    var token = ghFields.token.value.trim();
    if (token) {
      window.GitHubPublisher.setToken(token, ghFields.remember.checked);
    }
    return token || window.GitHubPublisher.getToken();
  }

  function requireGitHub() {
    var config = ghConfig();
    if (!config.owner || !config.repo) {
      ghFields.settings.open = true;
      ghStatus("Renseignez le propriétaire et le dépôt.");
      return null;
    }
    if (!applyToken()) {
      ghFields.settings.open = true;
      ghStatus("Renseignez un jeton d'accès avec la permission « Contents: write ».");
      return null;
    }
    window.GitHubPublisher.saveRepo(config);
    return config;
  }

  function initGitHubPanel() {
    var detected = window.GitHubPublisher.detectRepo();
    ghFields.owner.value = detected.owner;
    ghFields.repo.value = detected.repo;
    ghFields.branch.value = detected.branch;
    ghFields.path.value = detected.path;

    var token = window.GitHubPublisher.getToken();
    if (token) {
      ghFields.token.value = token;
      ghStatus("Jeton mémorisé dans ce navigateur.", true);
    } else {
      ghFields.settings.open = !detected.owner;
    }
  }

  ghFields.remember.addEventListener("change", function () {
    var token = ghFields.token.value.trim();
    window.GitHubPublisher.setToken(token, ghFields.remember.checked);
    ghStatus(
      ghFields.remember.checked
        ? "Le jeton sera conservé dans ce navigateur."
        : "Le jeton ne sera pas conservé après fermeture de l'onglet.",
      ghFields.remember.checked
    );
  });

  document.getElementById("gh-test").addEventListener("click", function () {
    var config = requireGitHub();
    if (!config) {
      return;
    }
    ghStatus("Vérification…");
    window.GitHubPublisher.checkAccess(config)
      .then(function (repo) {
        ghStatus("Accès en écriture confirmé sur " + repo.full_name + " ✅", true);
      })
      .catch(function (err) {
        ghStatus(err.message);
      });
  });

  document.getElementById("gh-forget").addEventListener("click", function () {
    window.GitHubPublisher.setToken("");
    ghFields.token.value = "";
    ghStatus("Jeton supprimé de ce navigateur.", true);
  });

  document.getElementById("publish").addEventListener("click", function () {
    var config = requireGitHub();
    if (!config) {
      return;
    }
    var button = this;
    button.disabled = true;
    ghStatus("Publication en cours…");

    window.GitHubPublisher.publish(config, collect())
      .then(function (result) {
        db = result.db;
        window.ConferenceStore.clearLocal();
        sourceLabel.textContent =
          "Publié sur " + config.owner + "/" + config.repo + " (" + config.branch + ").";
        ghStatus("Commit créé ✅ — le déploiement GitHub Pages démarre.", true);
        toast("Catalogue publié sur GitHub 🚀");
        if (result.commitUrl) {
          window.open(result.commitUrl, "_blank", "noopener");
        }
      })
      .catch(function (err) {
        ghStatus(err.message);
        toast("Échec de la publication.");
      })
      .then(function () {
        button.disabled = false;
      });
  });

  document.getElementById("pull").addEventListener("click", function () {
    var config = ghConfig();
    if (!config.owner || !config.repo) {
      ghFields.settings.open = true;
      ghStatus("Renseignez le propriétaire et le dépôt.");
      return;
    }
    applyToken();
    ghStatus("Lecture du fichier distant…");
    window.GitHubPublisher.readRemote(config)
      .then(function (remote) {
        if (!remote.db) {
          ghStatus("Le fichier n'existe pas encore sur cette branche.");
          return;
        }
        window.ConferenceStore.clearLocal();
        db = remote.db;
        render();
        sourceLabel.textContent =
          "Chargé depuis " + config.owner + "/" + config.repo + " (" + config.branch + ").";
        ghStatus("Catalogue rechargé depuis GitHub ✅", true);
      })
      .catch(function (err) {
        ghStatus(err.message);
      });
  });

  document.getElementById("export").addEventListener("click", function () {
    var payload = window.ConferenceStore.normalize(collect());
    payload.updatedAt = new Date().toISOString().slice(0, 10);
    var blob = new Blob([JSON.stringify(payload, null, 2) + "\n"], {
      type: "application/json"
    });
    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");
    link.href = url;
    link.download = "conferences.json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast("Fichier conferences.json téléchargé — remplacez data/conferences.json puis committez.");
  });

  document.getElementById("import").addEventListener("change", function (event) {
    var file = event.target.files && event.target.files[0];
    if (!file) {
      return;
    }
    var reader = new FileReader();
    reader.onload = function () {
      try {
        db = window.ConferenceStore.normalize(JSON.parse(String(reader.result)));
        render();
        toast("Fichier importé.");
      } catch (err) {
        toast("Fichier JSON invalide.");
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  });

  document.getElementById("reset").addEventListener("click", function () {
    if (!window.confirm("Abandonner le brouillon local et recharger data/conferences.json ?")) {
      return;
    }
    window.ConferenceStore.clearLocal();
    window.ConferenceStore.loadFile().then(function (fresh) {
      db = fresh;
      sourceLabel.textContent = "Source : data/conferences.json (version publiée).";
      render();
      toast("Catalogue rechargé depuis le fichier.");
    });
  });

  document.getElementById("logout").addEventListener("click", function () {
    window.sessionStorage.removeItem(SESSION_FLAG);
    window.location.reload();
  });

  if (window.sessionStorage.getItem(SESSION_FLAG) === "1") {
    unlock();
  }
})();
