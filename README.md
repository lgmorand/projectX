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
  protégée par mot de passe, avec **publication directe du JSON dans le dépôt via l'API GitHub**.

## Base de données

La « base » est le fichier JSON versionné [`data/conferences.json`](data/conferences.json) :

```json
{
  "version": 1,
  "updatedAt": "2026-10-07",
  "sessions": [{ "id": "token-optimization", "title": "Token Optimization", "keywords": ["..."] }]
}
```

### Édition « côté serveur » depuis l'admin

GitHub Pages est un hébergement **100 % statique** : aucun code serveur ne peut écrire un fichier.
L'admin contourne cette limite en committant directement `data/conferences.json` **via l'API GitHub
Contents**. Le fichier du dépôt reste donc la source de vérité, partagée par tous les visiteurs et
versionnée dans Git.

Mise en place (une seule fois, par administrateur) :

1. Créer un [jeton fine-grained](https://github.com/settings/personal-access-tokens/new) limité à ce
   dépôt, avec la permission **Repository permissions → Contents : Read and write**.
2. Ouvrir `admin.html`, saisir le mot de passe, déplier **⚙️ Connexion GitHub**, coller le jeton et
   cliquer sur **Tester l'accès**.
3. Modifier les sessions puis cliquer sur **🚀 Publier sur GitHub** → un commit est créé et le
   workflow redéploie le site.

Boutons disponibles :

| Bouton | Effet |
| --- | --- |
| **🚀 Publier sur GitHub** | Commit `data/conferences.json` dans le dépôt (visible par tous) |
| **Recharger depuis GitHub** | Relit le fichier distant via l'API |
| **Enregistrer le brouillon** | Sauvegarde locale (`localStorage`), visible seulement dans ce navigateur |
| **Exporter / Importer le JSON** | Repli manuel, sans jeton |
| **Réinitialiser** | Supprime le brouillon local et recharge la version publiée |

⚠️ Le jeton reste dans le navigateur de l'administrateur (`localStorage`, ou `sessionStorage` si la
case « Mémoriser » est décochée) et n'est **jamais** committé. Utilisez un jeton fine-grained limité
à ce seul dépôt, et révoquez-le en cas de doute.

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
