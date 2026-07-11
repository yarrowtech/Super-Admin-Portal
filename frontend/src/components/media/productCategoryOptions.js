export const PRODUCT_CATEGORY_GROUPS = [
  {
    label: "Men's Fashion",
    subcategories: [
      'Formal Shirts', 'Casual Shirts', 'T-Shirts', 'Polo T-Shirts', 'Trousers', 'Jeans', 'Chinos',
      'Cargo Pants', 'Shorts', 'Blazers', 'Suits', 'Jackets', 'Hoodies', 'Sweatshirts', 'Track Pants',
      'Activewear', 'Ethnic Wear', 'Kurtas', 'Sherwanis', 'Innerwear', 'Nightwear', 'Socks',
    ],
  },
  {
    label: "Women's Fashion",
    subcategories: [
      'Kurtis', 'Kurta Sets', 'Western Dresses', 'Tops', 'Tunics', 'Co-ord Sets', 'Formal Shirts',
      'Casual Shirts', 'T-Shirts', 'Trousers', 'Jeans', 'Leggings', 'Palazzo', 'Skirts', 'Sarees',
      'Blouses', 'Salwar Suits', 'Dupattas', 'Jackets', 'Shrugs', 'Activewear', 'Nightwear',
      'Innerwear', 'Lingerie', 'Maternity Wear',
    ],
  },
  {
    label: 'Kids Fashion',
    subcategories: [
      'Boys - Shirts', 'Boys - T-Shirts', 'Boys - Jeans', 'Boys - Shorts', 'Boys - Trousers',
      'Boys - Ethnic Wear', 'Boys - Nightwear', 'Boys - Innerwear', 'Boys - School Uniforms',
      'Girls - Dresses', 'Girls - Tops', 'Girls - T-Shirts', 'Girls - Jeans', 'Girls - Leggings',
      'Girls - Skirts', 'Girls - Ethnic Wear', 'Girls - Nightwear', 'Girls - Innerwear',
      'Girls - School Uniforms',
    ],
  },
  {
    label: 'Infant & Baby Wear',
    subcategories: [
      'Rompers', 'Bodysuits', 'Baby Sets', 'Frocks', 'T-Shirts', 'Bottom Wear', 'Nightwear',
      'Caps', 'Socks', 'Mittens',
    ],
  },
  {
    label: 'Sports & Activewear',
    subcategories: [
      'Gym Wear', 'Running Wear', 'Yoga Wear', 'Sports T-Shirts', 'Sports Shorts', 'Track Pants',
      'Compression Wear', 'Jerseys',
    ],
  },
  {
    label: 'Innerwear & Sleepwear',
    subcategories: [
      "Men's - Briefs", "Men's - Trunks", "Men's - Boxers", "Men's - Vests", "Men's - Thermals",
      "Men's - Night Suits", "Women's - Bras", "Women's - Panties", "Women's - Shapewear",
      "Women's - Camisoles", "Women's - Nightwear", "Women's - Thermals", 'Kids - Innerwear',
      'Kids - Nightwear', 'Kids - Thermals',
    ],
  },
  {
    label: 'Winter Wear',
    subcategories: ['Sweaters', 'Hoodies', 'Sweatshirts', 'Jackets', 'Coats', 'Thermals', 'Mufflers', 'Gloves'],
  },
  {
    label: 'Footwear',
    subcategories: [
      'Casual Shoes', 'Formal Shoes', 'Sports Shoes', 'Sandals', 'Slippers', 'Heels', 'Flats',
      'Boots', 'Loafers',
    ],
  },
  {
    label: 'Fashion Accessories',
    subcategories: [
      'Belts', 'Wallets', 'Handbags', 'Backpacks', 'Caps', 'Hats', 'Scarves', 'Sunglasses',
      'Watches', 'Jewellery', 'Fashion Accessories',
    ],
  },
];

export const formatProductCategorySelection = (category, subcategory) => `${category}: ${subcategory}`;

export const parseProductCategorySelection = (value) => {
  const [category, ...rest] = String(value || '').split(':');
  return {
    category: category.trim(),
    subcategory: rest.join(':').trim(),
  };
};
