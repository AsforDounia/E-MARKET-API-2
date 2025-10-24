# API Versioning Documentation

## Overview

The E-Market API supports multiple versions to ensure backward compatibility while introducing new features.

## Version Comparison

### API V1 (`/api/v1`)
- **Version**: 1.0.0
- **Base URL**: `/api/v1`
- **Total Routes**: 15
- **Modules**: products, users, categories
- **Authentication**: ❌ No authentication required
- **Cache**: ❌ No caching
- **Features**: Basic CRUD operations only

#### Available Endpoints V1:
```
GET /api/v1/products
GET /api/v1/products/:id
GET /api/v1/users
GET /api/v1/users/:id
GET /api/v1/categories
GET /api/v1/categories/:id
```

### API V2 (`/api/v2`)
- **Version**: 2.0.0
- **Base URL**: `/api/v2`
- **Total Routes**: 109
- **Modules**: auth, users, products, categories, cart, orders, coupons, reviews, notifications, admin, cache
- **Authentication**: ✅ JWT Authentication required
- **Cache**: ✅ Redis caching enabled
- **Features**: Full marketplace functionality

#### New Features in V2:
- ✅ JWT Authentication & Authorization
- ✅ Redis Cache for performance
- ✅ Async Notifications system
- ✅ Multi-image upload with Sharp optimization
- ✅ Winston Logging system
- ✅ Advanced pagination
- ✅ Role-based access control (user, seller, admin)
- ✅ Shopping cart functionality
- ✅ Order management
- ✅ Coupon system
- ✅ Product reviews
- ✅ Admin dashboard features

#### Available Endpoints V2:
```
# Authentication
POST /api/v2/auth/register
POST /api/v2/auth/login
POST /api/v2/auth/logout
GET  /api/v2/auth/profile
PUT  /api/v2/auth/profile

# Products (Enhanced)
GET    /api/v2/products
GET    /api/v2/products/pending
GET    /api/v2/products/:id
POST   /api/v2/products (with image upload)
PUT    /api/v2/products/:id
DELETE /api/v2/products/:id
PATCH  /api/v2/products/:id/visibility
PATCH  /api/v2/products/:id/validate
PATCH  /api/v2/products/:id/reject

# Users (Enhanced)
GET    /api/v2/users
GET    /api/v2/users/profile
GET    /api/v2/users/:id
POST   /api/v2/users
PUT    /api/v2/users/profile
PATCH  /api/v2/users/:id/role
DELETE /api/v2/users/:id

# Categories (Enhanced)
GET    /api/v2/categories
GET    /api/v2/categories/:id
POST   /api/v2/categories
PUT    /api/v2/categories/:id
DELETE /api/v2/categories/:id

# Cart (New in V2)
POST   /api/v2/cart/add
GET    /api/v2/cart
PUT    /api/v2/cart/item/:productId
DELETE /api/v2/cart/item/:productId
DELETE /api/v2/cart

# Orders (New in V2)
POST   /api/v2/orders
GET    /api/v2/orders
GET    /api/v2/orders/:id
PUT    /api/v2/orders/:id
DELETE /api/v2/orders/:id

# Coupons (New in V2)
POST   /api/v2/coupons
GET    /api/v2/coupons
GET    /api/v2/coupons/seller
GET    /api/v2/coupons/:id
PUT    /api/v2/coupons/:id
DELETE /api/v2/coupons/:id

# Reviews (New in V2)
POST   /api/v2/reviews
GET    /api/v2/reviews/:productId
PUT    /api/v2/reviews/:reviewId
DELETE /api/v2/reviews/:reviewId

# Notifications (New in V2)
GET    /api/v2/notifications
PATCH  /api/v2/notifications/:id/read

# Admin (New in V2)
GET    /api/v2/admin/logs
GET    /api/v2/admin/stats
```

## Migration Guide

### From V1 to V2

1. **Authentication Required**: All V2 endpoints require JWT authentication
2. **URL Changes**: Update base URL from `/api/v1` to `/api/v2`
3. **New Headers**: Include `Authorization: Bearer <token>` header
4. **Enhanced Responses**: V2 returns more detailed responses with metadata

### Example Migration:

**V1 Request:**
```bash
GET /api/v1/products
```

**V2 Request:**
```bash
GET /api/v2/products
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Backward Compatibility

- V1 endpoints remain available for existing integrations
- No breaking changes to V1 functionality
- V1 will be deprecated in future releases

## Performance Differences

| Feature | V1 | V2 |
|---------|----|----|
| Response Time | Standard | Optimized with Redis cache |
| Authentication | None | JWT with role-based access |
| File Upload | Not supported | Multi-image with optimization |
| Pagination | Basic | Advanced with metadata |
| Error Handling | Basic | Enhanced with detailed messages |

## Recommended Usage

- **New Projects**: Use V2 for full functionality
- **Existing Projects**: Migrate to V2 when ready
- **Simple Integrations**: V1 for basic read-only operations