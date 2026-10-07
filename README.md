# Catalogue de conférences

Application web statique (en français) permettant à un client de composer sa journée de
conférence : il choisit des sessions dans un catalogue, les ajoute à son panier, puis génère
automatiquement le texte de l'e-mail de demande.

👉 Publiée sur GitHub Pages via `.github/workflows/deploy.yml`.

## Fonctionnalités

- **Catalogue** : recherche par titre ou mot-clé, ajout/retrait au panier (persisté localement).
- **Panier + « Je veux ! »** : ouvre une popup demandant nom, prénom, e-mail, téléphone (société et
  date souhaitée en option). Le bouton **OK** copie dans le presse-papiers un e-mail prêt à l'emploi.
- **Bouton « Ouvrir dans ma messagerie »** : lien `mailto:julien@microsoft.com` avec l'objet
  « Organisation d'une journée de conférence » et le corps pré-rempli.
- **Confidentialité** : aucune donnée n'est envoyée ni stockée sur un serveur, tout reste dans le
  navigateur.
- **Administration** (`admin.html`) : ajout, édition, réordonnancement et suppression des sessions,
  protégée par mot de passe.

## Base de données

La « base » est le fichier JSON versionné [`data/conferences.json`](data/conferences.json) :

```json
{
  "version": 1,
  "updatedAt": "2026-10-07",
  "sessions": [{ "id": "token-optimization", "title": "Token Optimization", "keywords": ["..."] }]
}
```

GitHub Pages étant un hébergement **statique**, l'interface d'admin ne peut pas écrire directement
sur le serveur. Le flux est donc :

1. Ouvrir `admin.html`, saisir le mot de passe.
2. Modifier les sessions, puis **Enregistrer** (brouillon dans `localStorage`, visible immédiatement
   sur le catalogue de ce navigateur).
3. **Exporter le JSON** pour télécharger `conferences.json`.
4. Remplacer `data/conferences.json` dans le dépôt et committer → le workflow redéploie le site.
5. **Réinitialiser** supprime le brouillon local et recharge la version publiée.

## Mot de passe d'administration

Le mot de passe est vérifié côté JavaScript (empreinte SHA-256 salée, repli XOR/Base64 obfusqué).
⚠️ Il s'agit d'une simple barrière de confort : sur un site statique, toute protection côté client
est contournable. N'y placez aucune donnée sensible.

## Développement local

```bash
python -m http.server 8080
# puis ouvrir http://localhost:8080
```

Un serveur HTTP est nécessaire (le chargement de `data/conferences.json` via `fetch` ne fonctionne
pas en `file://`).

## Déploiement

Dans **Settings → Pages**, sélectionner la source **GitHub Actions**. Chaque push sur `master`
valide le JSON puis déploie le site.
