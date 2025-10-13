import { ProductCategory } from '../models/Index.js';

/**
 * Récupère les catégories d'un produit
 * @param {String} productId - L'ID du produit
 * @returns {Promise<Array>} - Liste des catégories
 */
async function getProductCategories(productId) {
    const links = await ProductCategory.find({ product: productId }).populate({ path: 'category', strictPopulate: false });
    
    return links.map(link => link.category);
}

export { getProductCategories };
