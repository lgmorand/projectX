/* Publication de data/conferences.json directement dans le dépôt GitHub,
 * via l'API Contents. Permet d'éditer la "base" depuis le site statique.
 */
(function (global) {
  "use strict";

  var API = "https://api.github.com";
  var TOKEN_KEY = "conf-catalog.gh.token";
  var REPO_KEY = "conf-catalog.gh.repo";
  var DEFAULTS = {
    owner: "lgmorand",
    repo: "projectX",
    branch: "master",
    path: "data/conferences.json"
  };

  /** Déduit owner/repo depuis l'URL GitHub Pages (ex. lgmorand.github.io/projectX/). */
  function detectRepo() {
    var saved = global.localStorage.getItem(REPO_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (err) {
        /* configuration illisible : on retombe sur la détection */
      }
    }

    var host = global.location.hostname;
    var match = /^([^.]+)\.github\.io$/i.exec(host);
    if (match) {
      var segment = global.location.pathname.split("/").filter(Boolean)[0];
      return {
        owner: match[1],
        repo: segment && !/\.html?$/i.test(segment) ? segment : match[1] + ".github.io",
        branch: DEFAULTS.branch,
        path: DEFAULTS.path
      };
    }

    return {
      owner: DEFAULTS.owner,
      repo: DEFAULTS.repo,
      branch: DEFAULTS.branch,
      path: DEFAULTS.path
    };
  }

  function saveRepo(config) {
    global.localStorage.setItem(REPO_KEY, JSON.stringify(config));
  }

  function getToken() {
    return (
      global.localStorage.getItem(TOKEN_KEY) || global.sessionStorage.getItem(TOKEN_KEY) || ""
    );
  }

  /** persist = true : conservé dans le navigateur ; sinon limité à l'onglet courant. */
  function setToken(token, persist) {
    global.localStorage.removeItem(TOKEN_KEY);
    global.sessionStorage.removeItem(TOKEN_KEY);
    if (!token) {
      return;
    }
    if (persist === false) {
      global.sessionStorage.setItem(TOKEN_KEY, token);
    } else {
      global.localStorage.setItem(TOKEN_KEY, token);
    }
  }

  function toBase64(text) {
    var bytes = new TextEncoder().encode(text);
    var binary = "";
    for (var i = 0; i < bytes.length; i += 1) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  function fromBase64(b64) {
    var binary = atob(String(b64).replace(/\s/g, ""));
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
  }

  function request(url, options) {
    var opts = options || {};
    var headers = {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28"
    };
    var token = getToken();
    if (token) {
      headers.Authorization = "Bearer " + token;
    }
    if (opts.body) {
      headers["Content-Type"] = "application/json";
    }

    return fetch(url, {
      method: opts.method || "GET",
      headers: headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      cache: "no-store"
    }).then(function (res) {
      if (res.status === 404) {
        return { status: 404, data: null };
      }
      return res.json().then(
        function (data) {
          if (!res.ok) {
            var message = (data && data.message) || res.statusText;
            if (res.status === 401) {
              message = "Jeton invalide ou expiré (401).";
            } else if (res.status === 403) {
              message = "Accès refusé (403) : vérifiez la permission « Contents: write ».";
            } else if (res.status === 409) {
              message = "Conflit (409) : le fichier a changé entre-temps, rechargez puis réessayez.";
            }
            throw new Error(message);
          }
          return { status: res.status, data: data };
        },
        function () {
          throw new Error("Réponse GitHub illisible (" + res.status + ").");
        }
      );
    });
  }

  function contentsUrl(config) {
    return API + "/repos/" + encodeURIComponent(config.owner) + "/" +
      encodeURIComponent(config.repo) + "/contents/" +
      config.path.split("/").map(encodeURIComponent).join("/");
  }

  /** Vérifie le jeton et les droits d'écriture sur le dépôt. */
  function checkAccess(config) {
    return request(
      API + "/repos/" + encodeURIComponent(config.owner) + "/" + encodeURIComponent(config.repo)
    ).then(function (res) {
      if (res.status === 404 || !res.data) {
        throw new Error("Dépôt introuvable ou jeton sans accès : " + config.owner + "/" + config.repo);
      }
      if (!res.data.permissions || !res.data.permissions.push) {
        throw new Error("Le jeton n'a pas les droits d'écriture sur ce dépôt.");
      }
      return res.data;
    });
  }

  /** Lit le fichier distant : { sha, db } (sha null si le fichier n'existe pas). */
  function readRemote(config) {
    return request(contentsUrl(config) + "?ref=" + encodeURIComponent(config.branch)).then(
      function (res) {
        if (res.status === 404 || !res.data) {
          return { sha: null, db: null };
        }
        return {
          sha: res.data.sha,
          db: global.ConferenceStore.normalize(JSON.parse(fromBase64(res.data.content)))
        };
      }
    );
  }

  /** Commit le fichier JSON sur la branche configurée. */
  function publish(config, db, message) {
    var payload = global.ConferenceStore.normalize(db);
    payload.updatedAt = new Date().toISOString().slice(0, 10);
    var content = JSON.stringify(payload, null, 2) + "\n";

    return readRemote(config).then(function (remote) {
      var body = {
        message: message || "chore(catalogue): mise à jour des sessions depuis l'admin",
        content: toBase64(content),
        branch: config.branch
      };
      if (remote.sha) {
        body.sha = remote.sha;
      }
      return request(contentsUrl(config), { method: "PUT", body: body });
    }).then(function (res) {
      return {
        commitUrl: res.data && res.data.commit ? res.data.commit.html_url : null,
        db: payload
      };
    });
  }

  global.GitHubPublisher = {
    TOKEN_KEY: TOKEN_KEY,
    detectRepo: detectRepo,
    saveRepo: saveRepo,
    getToken: getToken,
    setToken: setToken,
    checkAccess: checkAccess,
    readRemote: readRemote,
    publish: publish
  };
})(window);
