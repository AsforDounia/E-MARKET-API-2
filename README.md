# E-Market-API

## 📋 Description

E-Market-API est une solution e-commerce évolutive conçue pour permettre aux entreprises de vendre leurs produits en ligne de manière simple, sécurisée et performante. Cette API REST offre une gestion complète des produits, utilisateurs et catégories avec une architecture moderne basée sur Node.js et MongoDB.

## 🚀 Fonctionnalités

- **Gestion des produits** : CRUD complet avec filtrage par catégorie
- **Gestion des utilisateurs** : Création, consultation et suppression d'utilisateurs
- **Gestion des catégories** : Organisation des produits par catégories
- **Validation des données** : Validation robuste avec Yup
- **Documentation API** : Interface Swagger intégrée
- **Soft Delete** : Suppression logique des données
- **Logging** : Système de logs intégré

## 🛠️ Technologies utilisées

- **Backend** : Node.js, Express.js
- **Base de données** : MongoDB avec Mongoose
- **Validation** : Yup
- **Documentation** : Swagger UI
- **Développement** : Nodemon

## 📁 Structure du projet

```
E-Market-API/
├── config/
│   └── database.js          # Configuration MongoDB
├── controllers/
│   ├── categoryController.js # Logique métier catégories
│   ├── productController.js  # Logique métier produits
│   └── userController.js     # Logique métier utilisateurs
├── middlewares/
│   ├── validation/
│   │   ├── schemas/          # Schémas de validation Yup
│   │   ├── validate.js       # Middleware de validation
│   │   └── yupExtensions.js  # Extensions Yup personnalisées
│   ├── errorHandler.js       # Gestionnaire d'erreurs global
│   ├── logger.js            # Middleware de logging
│   └── notFound.js          # Middleware 404
├── migrations/
│   ├── migrate.js           # Scripts de migration
│   └── seed.js              # Données de test
├── models/
│   ├── Category.js          # Modèle Category
│   ├── Product.js           # Modèle Product
│   ├── ProductCategory.js   # Relation Product-Category
│   └── User.js              # Modèle User
├── routes/
│   ├── categoryRoutes.js    # Routes des catégories
│   ├── productRoutes.js     # Routes des produits
│   └── userRoutes.js        # Routes des utilisateurs
├── services/
│   └── productService.js    # Services métier produits
├── swagger/
│   └── swagger.js           # Configuration Swagger
└── server.js                # Point d'entrée de l'application
```

## ⚙️ Installation

### Prérequis

- Node.js (version 14 ou supérieure)
- MongoDB (local ou Atlas)
- npm ou yarn

### Étapes d'installation

1. **Cloner le repository**
   ```bash
   git clone https://github.com/AsforDounia/E-Market-API.git
   cd E-Market-API
   ```

2. **Installer les dépendances**
   ```bash
   npm install
   ```

3. **Configuration de l'environnement**
   ```bash
   cp ".env exemple" .env
   ```
   
   Modifier le fichier `.env` :
   ```env
   MONGO_URI=mongodb://localhost:27017/emarket
   PORT=3000
   ```

4. **Initialiser la base de données**
   ```bash
   npm run migrate
   npm run seed
   ```

5. **Démarrer l'application**
   ```bash
   # Mode développement
   npm run dev
   
   # Mode production
   npm start
   ```

## 📚 Documentation API

### Accès à la documentation

Une fois l'application démarrée, accédez à la documentation Swagger :
```
http://localhost:3000/api-docs
```

### Endpoints principaux

#### Produits
- `GET /products` - Liste tous les produits (avec filtrage par catégorie)
- `GET /products/:id` - Récupère un produit par ID
- `POST /products` - Crée un nouveau produit
- `PUT /products/:id` - Met à jour un produit
- `DELETE /products/:id` - Supprime un produit

#### Utilisateurs
- `GET /users` - Liste tous les utilisateurs
- `GET /users/:id` - Récupère un utilisateur par ID
- `POST /users` - Crée un nouvel utilisateur
- `DELETE /users/:id` - Supprime un utilisateur

#### Catégories
- `GET /categories` - Liste toutes les catégories
- `GET /categories/:id` - Récupère une catégorie par ID
- `POST /categories` - Crée une nouvelle catégorie
- `PUT /categories/:id` - Met à jour une catégorie
- `DELETE /categories/:id` - Supprime une catégorie

## 🧪 Tests avec Postman

Une collection Postman est disponible dans le dossier `postman collection/` pour tester tous les endpoints de l'API.

### Import de la collection
1. Ouvrir Postman
2. Importer le fichier `E-Market-API.postman_collection.json`
3. Configurer la variable d'environnement `{{api}}` avec `http://localhost:3000`

## 📊 Modèles de données

### Product
```javascript
{
  title: String (requis),
  description: String (requis),
  price: Number (requis, ≥ 0),
  stock: Number (requis, ≥ 0),
  imageUrl: String,
  categoryIds: [ObjectId],
  deletedAt: Date
}
```

### User
```javascript
{
  fullname: String (requis),
  email: String (requis, unique),
  password: String (requis, min 6 caractères),
  role: String (user|admin, défaut: user),
  deletedAt: Date
}
```

### Category
```javascript
{
  name: String (requis, unique),
  description: String,
  deletedAt: Date
}
```

## 🔧 Scripts disponibles

- `npm start` - Démarre l'application en mode production
- `npm run dev` - Démarre l'application en mode développement avec nodemon
- `npm run migrate` - Exécute les migrations de base de données
- `npm run seed` - Insère les données de test

## 🤝 Contribution

1. Fork le projet
2. Créer une branche pour votre fonctionnalité (`git checkout -b feature/AmazingFeature`)
3. Commit vos changements (`git commit -m 'Add some AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## 📝 Licence

Ce projet est sous licence ISC.

## 👥 Auteur

- **AsforDounia** - [GitHub](https://github.com/AsforDounia)

## 🐛 Signaler un bug

Pour signaler un bug, veuillez ouvrir une issue sur [GitHub Issues](https://github.com/AsforDounia/E-Market-API/issues).