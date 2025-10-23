# E-Market-API

## 📋 Description

E-Market-API est une plateforme e-commerce complète et sécurisée permettant aux entreprises de créer leur marketplace en ligne. Cette API REST avancée offre une gestion complète des utilisateurs multi-rôles, produits, commandes, paiements et notifications avec une architecture moderne et performante basée sur Node.js et MongoDB.

## 🚀 Fonctionnalités

### 🔐 Authentification & Autorisation
- **Système JWT** : Authentification sécurisée avec tokens
- **Gestion des rôles** : user, seller, admin avec permissions spécifiques
- **Protection des routes** : Middleware d'autorisation par rôle

### 👥 Gestion des utilisateurs
- **Inscription/Connexion** : Système complet d'authentification
- **Profils utilisateurs** : Gestion et modification des profils
- **Promotion de rôles** : Admin peut promouvoir user → seller

### 🛍️ Espace vendeurs
- **Gestion des produits** : CRUD complet pour les sellers
- **Upload d'images** : Multer + Sharp pour compression/optimisation
- **Images multiples** : Support de plusieurs images par produit
- **Gestion du stock** : Suivi de disponibilité en temps réel

### 🔍 Catalogue & Recherche
- **Recherche avancée** : Par mots-clés, catégorie, prix
- **Filtrage & tri** : Prix, popularité, date
- **Pagination performante** : Navigation optimisée
- **Cache mémoire** : Optimisation des requêtes fréquentes

### 🛒 Panier & Commandes
- **Gestion du panier** : Ajout/modification/suppression d'articles
- **Validation de commandes** : Vérification stock + création commande
- **Suivi des statuts** : pending, paid, shipped, delivered, cancelled
- **Paiement simulé** : Système de paiement intégré

### 🎫 Système de coupons
- **Codes promo** : Création et gestion de coupons
- **Types de réduction** : Montant fixe ou pourcentage
- **Conditions d'usage** : Montant minimum, date d'expiration

### ⭐ Avis & Notations
- **Système d'avis** : Notes et commentaires sur produits
- **Modération** : Validation par administrateurs
- **Un avis par produit** : Limitation par utilisateur

### 🔔 Notifications (🆕)
- **Système asynchrone** : EventEmitter pour notifications temps réel
- **Types de notifications** : Nouveaux produits, commandes, statuts
- **Gestion des notifications** : Lecture/non-lu, historique

### 📊 Logging & Monitoring (🆕)
- **Winston** : Système de logs avancé
- **Rotation automatique** : Gestion des fichiers de logs
- **Logs admin** : Interface de consultation des logs

### 🧪 Tests & Qualité
- **Tests automatisés** : Mocha + Chai + Supertest
- **Couverture de code** : Rapport avec nyc
- **Tests d'intégration** : Validation complète des workflows

### 🔧 Outils & Automatisation (🆕)
- **Scripts de seed** : Génération de données de test avec Faker.js
- **Reset database** : Réinitialisation complète
- **Versioning API** : Support de versions multiples

## 🛠️ Technologies utilisées

### Core
- **Backend** : Node.js, Express.js
- **Base de données** : MongoDB avec Mongoose
- **Authentification** : JWT, bcrypt

### Sécurité
- **Protection** : helmet, cors, express-rate-limit
- **Validation** : Joi / express-validator
- **Variables d'environnement** : dotenv

### Upload & Media
- **Upload de fichiers** : Multer
- **Traitement d'images** : Sharp (compression/optimisation)

### Logging & Monitoring
- **Logs** : Winston
- **Rotation des logs** : winston-daily-rotate-file

### Tests
- **Framework de tests** : Mocha + Chai + Supertest
- **Couverture** : nyc

### Développement
- **Documentation** : Swagger UI
- **Données de test** : Faker.js
- **Développement** : Nodemon

## 📁 Structure du projet

```
E-Market-API/
├── config/
│   ├── database.js          # Configuration MongoDB
│   └── jwt.js               # Configuration JWT
├── controllers/
│   ├── authController.js    # Authentification
│   ├── categoryController.js # Logique métier catégories
│   ├── productController.js  # Logique métier produits
│   ├── userController.js     # Logique métier utilisateurs
│   ├── cartController.js     # Gestion du panier
│   ├── orderController.js    # Gestion des commandes
│   ├── couponController.js   # Gestion des coupons
│   ├── reviewController.js   # Gestion des avis
│   └── notificationController.js # Notifications
├── middlewares/
│   ├── auth/
│   │   ├── authenticate.js   # Middleware JWT
│   │   └── authorize.js      # Middleware rôles
│   ├── validation/
│   │   ├── schemas/          # Schémas de validation
│   │   └── validate.js       # Middleware de validation
│   ├── upload/
│   │   └── multer.js         # Configuration upload
│   ├── cache.js             # Middleware de cache
│   ├── rateLimiter.js       # Limitation de taux
│   ├── errorHandler.js       # Gestionnaire d'erreurs global
│   ├── logger.js            # Middleware de logging
│   └── notFound.js          # Middleware 404
├── models/
│   ├── User.js              # Modèle User (avec rôles)
│   ├── Product.js           # Modèle Product (avec seller)
│   ├── Category.js          # Modèle Category
│   ├── Cart.js              # Modèle Panier
│   ├── Order.js             # Modèle Commande
│   ├── Coupon.js            # Modèle Coupon
│   ├── Review.js            # Modèle Avis
│   └── Notification.js      # Modèle Notification
├── routes/
│   ├── api/
│   │   └── v1/              # Versioning API
│   │       ├── auth.js      # Routes authentification
│   │       ├── users.js     # Routes utilisateurs
│   │       ├── products.js  # Routes produits
│   │       ├── categories.js # Routes catégories
│   │       ├── cart.js      # Routes panier
│   │       ├── orders.js    # Routes commandes
│   │       ├── coupons.js   # Routes coupons
│   │       ├── reviews.js   # Routes avis
│   │       ├── notifications.js # Routes notifications
│   │       └── admin.js     # Routes admin
├── services/
│   ├── authService.js       # Services authentification
│   ├── productService.js    # Services produits
│   ├── orderService.js      # Services commandes
│   ├── couponService.js     # Services coupons
│   ├── notificationService.js # Services notifications
│   └── imageService.js      # Services images (Sharp)
├── events/
│   └── eventEmitter.js      # Gestionnaire d'événements
├── utils/
│   ├── logger.js            # Configuration Winston
│   ├── cache.js             # Utilitaires cache
│   └── helpers.js           # Fonctions utilitaires
├── tests/
│   ├── unit/                # Tests unitaires
│   ├── integration/         # Tests d'intégration
│   └── fixtures/            # Données de test
├── scripts/
│   ├── seed.js              # Script de seed
│   └── reset-db.js          # Reset database
├── uploads/                 # Dossier des images uploadées
├── logs/                    # Dossier des logs
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
   cp ".env.example" .env
   ```
   
   Modifier le fichier `.env` :
   ```env
   # Database
   MONGO_URI=mongodb://localhost:27017/emarket
   
   # Server
   PORT=3000
   NODE_ENV=development
   
   # JWT
   JWT_SECRET=your_super_secret_jwt_key
   JWT_EXPIRE=7d
   
   # Upload
   MAX_FILE_SIZE=5000000
   UPLOAD_PATH=./uploads
   
   # Rate Limiting
   RATE_LIMIT_WINDOW=15
   RATE_LIMIT_MAX_REQUESTS=100
   ```

4. **Créer les dossiers nécessaires**
   ```bash
   mkdir uploads logs
   ```

5. **Initialiser la base de données**
   ```bash
   # Réinitialiser la base (optionnel)
   npm run reset-db
   
   # Insérer les données de test
   npm run seed
   ```

6. **Démarrer l'application**
   ```bash
   # Mode développement
   npm run dev
   
   # Mode production
   npm start
   
   # Lancer les tests
   npm test
   
   # Rapport de couverture
   npm run coverage
   ```

## 📚 Documentation API

### Accès à la documentation

Une fois l'application démarrée, accédez à la documentation Swagger :
```
http://localhost:3000/api-docs
```

### Endpoints principaux

#### 🔐 Authentification
- `POST /api/v1/auth/register` - Inscription utilisateur
- `POST /api/v1/auth/login` - Connexion utilisateur
- `GET /api/v1/auth/profile` - Profil utilisateur (protégé)
- `PUT /api/v1/auth/profile` - Modifier profil (protégé)

#### 👥 Utilisateurs
- `GET /api/v1/users` - Liste utilisateurs (admin)
- `GET /api/v1/users/:id` - Détails utilisateur
- `PUT /api/v1/users/:id/role` - Modifier rôle (admin)
- `DELETE /api/v1/users/:id` - Supprimer utilisateur (admin)

#### 🛍️ Produits
- `GET /api/v1/products` - Liste produits (pagination, filtres)
- `GET /api/v1/products/:id` - Détails produit
- `POST /api/v1/products` - Créer produit (seller)
- `PUT /api/v1/products/:id` - Modifier produit (seller/admin)
- `DELETE /api/v1/products/:id` - Supprimer produit (seller/admin)
- `POST /api/v1/products/:id/images` - Upload images (seller)

#### 📂 Catégories
- `GET /api/v1/categories` - Liste catégories
- `GET /api/v1/categories/:id` - Détails catégorie
- `POST /api/v1/categories` - Créer catégorie (admin)
- `PUT /api/v1/categories/:id` - Modifier catégorie (admin)
- `DELETE /api/v1/categories/:id` - Supprimer catégorie (admin)

#### 🛒 Panier & Commandes
- `GET /api/v1/cart` - Voir panier (protégé)
- `POST /api/v1/cart/items` - Ajouter au panier (protégé)
- `PUT /api/v1/cart/items/:id` - Modifier quantité (protégé)
- `DELETE /api/v1/cart/items/:id` - Retirer du panier (protégé)
- `POST /api/v1/orders` - Créer commande (protégé)
- `GET /api/v1/orders` - Mes commandes (protégé)
- `GET /api/v1/orders/:id` - Détails commande (protégé)
- `PUT /api/v1/orders/:id/status` - Modifier statut (seller/admin)

#### 🎫 Coupons
- `GET /api/v1/coupons` - Liste coupons (admin)
- `POST /api/v1/coupons` - Créer coupon (admin)
- `POST /api/v1/coupons/validate` - Valider coupon (protégé)
- `PUT /api/v1/coupons/:id` - Modifier coupon (admin)
- `DELETE /api/v1/coupons/:id` - Supprimer coupon (admin)

#### ⭐ Avis
- `GET /api/v1/products/:id/reviews` - Avis d'un produit
- `POST /api/v1/products/:id/reviews` - Créer avis (protégé)
- `PUT /api/v1/reviews/:id` - Modifier avis (protégé)
- `DELETE /api/v1/reviews/:id` - Supprimer avis (protégé/admin)

#### 🔔 Notifications
- `GET /api/v1/notifications` - Mes notifications (protégé)
- `PATCH /api/v1/notifications/:id/read` - Marquer comme lu (protégé)

#### 🔧 Administration
- `GET /api/v1/admin/logs` - Consulter logs (admin)
- `GET /api/v1/admin/stats` - Statistiques (admin)

## 🧪 Tests

### Tests automatisés
Le projet inclut une suite complète de tests :

```bash
# Lancer tous les tests
npm test

# Tests avec couverture
npm run coverage

# Tests en mode watch
npm run test:watch
```

### Tests avec Postman
Une collection Postman est disponible dans le dossier `postman/` :

1. **Import de la collection**
   - Ouvrir Postman
   - Importer `E-Market-API.postman_collection.json`
   - Importer `E-Market-API.postman_environment.json`

2. **Configuration**
   - Variable `{{api}}` : `http://localhost:3000/api/v1`
   - Variable `{{token}}` : Sera automatiquement définie après login

3. **Workflow de test**
   - Commencer par "Auth > Register" ou "Auth > Login"
   - Le token JWT sera automatiquement sauvegardé
   - Tester les autres endpoints protégés

### Couverture de tests
Objectif : > 70% de couverture de code
- Tests unitaires pour les services et utilitaires
- Tests d'intégration pour les endpoints API
- Tests de sécurité pour l'authentification et autorisation

## 📊 Modèles de données

### User
```javascript
{
  fullname: String (requis),
  email: String (requis, unique),
  password: String (requis, min 6 caractères, hashé),
  role: String (user|seller|admin, défaut: user),
  avatar: String,
  isActive: Boolean (défaut: true),
  deletedAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### Product
```javascript
{
  title: String (requis),
  description: String (requis),
  price: Number (requis, ≥ 0),
  stock: Number (requis, ≥ 0),
  images: [String], // URLs des images
  categoryIds: [ObjectId],
  sellerId: ObjectId (requis),
  isActive: Boolean (défaut: true),
  averageRating: Number (0-5),
  reviewCount: Number (défaut: 0),
  deletedAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### Category
```javascript
{
  name: String (requis, unique),
  description: String,
  image: String,
  isActive: Boolean (défaut: true),
  deletedAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### Cart
```javascript
{
  userId: ObjectId (requis),
  items: [{
    productId: ObjectId (requis),
    quantity: Number (requis, ≥ 1),
    price: Number (requis)
  }],
  totalAmount: Number,
  updatedAt: Date
}
```

### Order
```javascript
{
  userId: ObjectId (requis),
  items: [{
    productId: ObjectId,
    sellerId: ObjectId,
    title: String,
    price: Number,
    quantity: Number
  }],
  totalAmount: Number,
  couponId: ObjectId,
  discountAmount: Number,
  finalAmount: Number,
  status: String (pending|paid|shipped|delivered|cancelled),
  shippingAddress: Object,
  paymentMethod: String,
  createdAt: Date,
  updatedAt: Date
}
```

### Coupon
```javascript
{
  code: String (requis, unique),
  type: String (percentage|fixed),
  value: Number (requis),
  minAmount: Number,
  maxDiscount: Number,
  usageLimit: Number,
  usedCount: Number (défaut: 0),
  isActive: Boolean (défaut: true),
  expiresAt: Date,
  createdAt: Date
}
```

### Review
```javascript
{
  userId: ObjectId (requis),
  productId: ObjectId (requis),
  rating: Number (requis, 1-5),
  comment: String,
  isApproved: Boolean (défaut: false),
  createdAt: Date,
  updatedAt: Date
}
```

### Notification
```javascript
{
  userId: ObjectId (requis),
  type: String (product|order|system),
  title: String (requis),
  message: String (requis),
  data: Object, // Données additionnelles
  isRead: Boolean (défaut: false),
  createdAt: Date
}
```

## 🔧 Scripts disponibles

### Développement
- `npm start` - Démarre l'application en mode production
- `npm run dev` - Démarre l'application en mode développement avec nodemon

### Base de données
- `npm run seed` - Insère les données de test avec Faker.js
- `npm run reset-db` - Réinitialise complètement la base de données

### Tests
- `npm test` - Lance tous les tests
- `npm run test:unit` - Lance uniquement les tests unitaires
- `npm run test:integration` - Lance uniquement les tests d'intégration
- `npm run coverage` - Génère le rapport de couverture de code

### Utilitaires
- `npm run logs:clean` - Nettoie les anciens fichiers de logs
- `npm run docs:generate` - Génère la documentation API

## 🤝 Contribution

1. Fork le projet
2. Créer une branche pour votre fonctionnalité (`git checkout -b feature/AmazingFeature`)
3. Commit vos changements (`git commit -m 'Add some AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## 📝 Licence

Ce projet est sous licence ISC.

## 👥 Équipe de développement

- **Asfor Dounia** - [GitHub](https://github.com/AsforDounia)
- **Souad Arziki** - [GitHub](https://github.com/souadarz)
- **Mohammed Boukab** - [GitHub](https://github.com/Mo7amed-Boukab)

*Projet développé en squad dans le cadre de la formation*

## 🐛 Signaler un bug

Pour signaler un bug, veuillez ouvrir une issue sur [GitHub Issues](https://github.com/AsforDounia/E-Market-API/issues).