/* Accès à la "base" de données des sessions.
 * Source de vérité versionnée : data/conferences.json
 * Surcouche d'édition locale (admin) : localStorage.
 */
(function (global) {
  "use strict";

  var DATA_URL = "data/conferences.json";
  var STORAGE_KEY = "conf-catalog.db.v1";

  function slugify(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60);
  }

  function normalize(db) {
    var sessions = (db && Array.isArray(db.sessions) ? db.sessions : []).map(function (item, index) {
      return {
        id: item.id || slugify(item.title) || "session-" + (index + 1),
        title: String(item.title || "").trim(),
        description: String(item.description || "").trim(),
        keywords: Array.isArray(item.keywords)
          ? item.keywords.map(function (k) {
              return String(k).trim();
            }).filter(Boolean)
          : []
      };
    }).filter(function (item) {
      return item.title.length > 0;
    });

    return {
      version: (db && db.version) || 1,
      updatedAt: (db && db.updatedAt) || new Date().toISOString().slice(0, 10),
      sessions: sessions
    };
  }

  function readLocal() {
    try {
      var raw = global.localStorage.getItem(STORAGE_KEY);
      return raw ? normalize(JSON.parse(raw)) : null;
    } catch (err) {
      return null;
    }
  }

  function saveLocal(db) {
    var payload = normalize(db);
    payload.updatedAt = new Date().toISOString().slice(0, 10);
    global.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload, null, 2));
    return payload;
  }

  function clearLocal() {
    global.localStorage.removeItem(STORAGE_KEY);
  }

  function fetchFile() {
    return fetch(DATA_URL, { cache: "no-store" }).then(function (res) {
      if (!res.ok) {
        throw new Error("Impossible de charger " + DATA_URL + " (" + res.status + ")");
      }
      return res.json();
    }).then(normalize);
  }

  /** Retourne la base effective : édition locale si présente, sinon le fichier JSON. */
  function load() {
    var local = readLocal();
    if (local) {
      return Promise.resolve({ db: local, source: "local" });
    }
    return fetchFile().then(function (db) {
      return { db: db, source: "file" };
    });
  }

  global.ConferenceStore = {
    DATA_URL: DATA_URL,
    STORAGE_KEY: STORAGE_KEY,
    slugify: slugify,
    normalize: normalize,
    load: load,
    loadFile: fetchFile,
    readLocal: readLocal,
    saveLocal: saveLocal,
    clearLocal: clearLocal
  };
})(window);
