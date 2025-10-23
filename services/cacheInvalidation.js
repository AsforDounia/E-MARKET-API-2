import redisCacheService from './redisCacheService.js';

class CacheInvalidation {
    // Products invalidation
    async invalidateProducts() {
        await redisCacheService.deleteByPattern('products:*');
        console.log('Products cache invalidated');
    }

    async invalidateSpecificProduct(productId) {
        await redisCacheService.delete(`products:/products/${productId}`);
        await redisCacheService.deleteByPattern('products:*');
        console.log(`Product ${productId} cache invalidated`);
    }

    // Categories invalidation
    async invalidateCategories() {
        await redisCacheService.deleteByPattern('categories:*');
        await redisCacheService.deleteByPattern('products:*'); // Products linked to categories
        console.log('Categories cache invalidated');
    }

    async invalidateSpecificCategory(categoryId) {
        await redisCacheService.delete(`categories:/categories/${categoryId}`);
        await redisCacheService.deleteByPattern('categories:*');
        await redisCacheService.deleteByPattern('products:*');
        console.log(`Category ${categoryId} cache invalidated`);
    }

    // Users invalidation
    async invalidateUsers() {
        await redisCacheService.deleteByPattern('users:*');
        await redisCacheService.deleteByPattern('userProfile:*');
        await redisCacheService.deleteByPattern('user:*');
        console.log('Users cache invalidated');
    }

    async invalidateSpecificUser(userId) {
        await redisCacheService.delete(`user:/users/${userId}`);
        await redisCacheService.deleteByPattern(`userProfile:/users/profile`);
        await redisCacheService.deleteByPattern('users:*');
        console.log(`User ${userId} cache invalidated`);
    }

    // Orders invalidation
    async invalidateOrders() {
        await redisCacheService.deleteByPattern('orders:*');
        console.log('Orders cache invalidated');
    }

    async invalidateUserOrders(userId) {
        await redisCacheService.deleteByPattern(`orders:*user=${userId}*`);
        console.log(`Orders for user ${userId} cache invalidated`);
    }

    // Coupons invalidation
    async invalidateCoupons() {
        await redisCacheService.deleteByPattern('coupons:*');
        console.log('Coupons cache invalidated');
    }

    // Notifications invalidation
    async invalidateNotifications(userId) {
        await redisCacheService.deleteByPattern(`notifications:*user=${userId}*`);
        console.log(`Notifications for user ${userId} cache invalidated`);
    }

    // Reviews invalidation
    async invalidateProductReviews(productId) {
        await redisCacheService.deleteByPattern(`productReviews:*${productId}*`);
        console.log(`Reviews for product ${productId} cache invalidated`);
    }

    // Cart invalidation
    async invalidateUserCart(userId) {
        await redisCacheService.deleteByPattern(`cart:*user=${userId}*`);
        await redisCacheService.deleteByPattern(`cart:*`);
        console.log(`Cart for user ${userId} cache invalidated`);
    }

    // Global invalidation
    async invalidateAll() {
        await redisCacheService.clear();
        console.log('All cache cleared');
    }

    // Relational invalidation (when a product changes category)
    async invalidateProductRelations(productId) {
        await this.invalidateProducts();
        await this.invalidateCategories();
        console.log(`Product ${productId} relations cache invalidated`);
    }
}

export default new CacheInvalidation();
