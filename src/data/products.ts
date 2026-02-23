export interface Variant {
  id: string;
  label: string;
  price: number;
  unit: string;
  inStock: boolean;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  emoji: string;
  image: string;
  basePrice: number;
  unit: string;
  rating: number;
  reviewCount: number;
  variants: Variant[];
  tags: string[];
  popular?: boolean;
}

export interface Category {
  id: string;
  label: string;
  emoji: string;
}

export const CATEGORIES: Category[] = [
  { id: 'all',      label: 'All',      emoji: '🛍️' },
  { id: 'water',    label: 'Water',    emoji: '💧' },
  { id: 'gas',      label: 'Gas',      emoji: '🔥' },
  { id: 'food',     label: 'Food',     emoji: '🍱' },
  { id: 'grocery',  label: 'Grocery',  emoji: '🥦' },
  { id: 'services', label: 'Services', emoji: '🔧' },
];

export const PRODUCTS: Product[] = [
  {
    id: 'p1',
    name: 'Drinking Water Can',
    description: 'Pure mineral water — refillable sealed cans, perfect for home & office.',
    category: 'water',
    emoji: '💧',
    image: 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=400&q=80',
    basePrice: 50,
    unit: 'can',
    rating: 4.8,
    reviewCount: 320,
    popular: true,
    tags: ['mineral', 'purified', 'home delivery'],
    variants: [
      { id: 'v1a', label: '10 L',  price: 50,  unit: 'can', inStock: true  },
      { id: 'v1b', label: '20 L',  price: 90,  unit: 'can', inStock: true  },
      { id: 'v1c', label: '25 L',  price: 110, unit: 'can', inStock: false },
    ],
  },
  {
    id: 'p2',
    name: 'LPG Gas Cylinder',
    description: 'Certified domestic LPG refills delivered safely to your door.',
    category: 'gas',
    emoji: '🔥',
    image: 'https://images.unsplash.com/photo-1585435421671-0c16764628f1?w=400&q=80',
    basePrice: 850,
    unit: 'cylinder',
    rating: 4.6,
    reviewCount: 180,
    popular: true,
    tags: ['LPG', 'domestic', 'refill'],
    variants: [
      { id: 'v2a', label: '5 kg',  price: 450,  unit: 'cylinder', inStock: true  },
      { id: 'v2b', label: '12 kg', price: 850,  unit: 'cylinder', inStock: true  },
      { id: 'v2c', label: '19 kg', price: 1350, unit: 'cylinder', inStock: true  },
    ],
  },
  {
    id: 'p3',
    name: 'Meal Box (Lunch)',
    description: 'Fresh, home-style meals prepared by local kitchens — delivered hot.',
    category: 'food',
    emoji: '🍱',
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80',
    basePrice: 120,
    unit: 'box',
    rating: 4.7,
    reviewCount: 540,
    popular: true,
    tags: ['fresh', 'homestyle', 'veg', 'non-veg'],
    variants: [
      { id: 'v3a', label: 'Veg (1 person)',     price: 120, unit: 'box', inStock: true },
      { id: 'v3b', label: 'Non-Veg (1 person)', price: 150, unit: 'box', inStock: true },
      { id: 'v3c', label: 'Family Pack (4)',     price: 450, unit: 'box', inStock: true },
    ],
  },
  {
    id: 'p4',
    name: 'Mineral Water Pouch',
    description: 'Convenient sealed pouches, great for events and daily use.',
    category: 'water',
    emoji: '💦',
    image: 'https://images.unsplash.com/photo-1594737625785-a6cbdabd333c?w=400&q=80',
    basePrice: 30,
    unit: 'pack',
    rating: 4.5,
    reviewCount: 210,
    tags: ['pouch', 'events', 'bulk'],
    variants: [
      { id: 'v4a', label: '200 ml × 20',  price: 30,  unit: 'pack', inStock: true },
      { id: 'v4b', label: '500 ml × 12',  price: 60,  unit: 'pack', inStock: true },
      { id: 'v4c', label: '1 L × 12',     price: 120, unit: 'pack', inStock: true },
    ],
  },
  {
    id: 'p5',
    name: 'Weekly Grocery Box',
    description: 'Essential vegetables, fruits, and staples curated for a week.',
    category: 'grocery',
    emoji: '🥦',
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&q=80',
    basePrice: 599,
    unit: 'box',
    rating: 4.4,
    reviewCount: 95,
    tags: ['weekly', 'vegetables', 'organic'],
    variants: [
      { id: 'v5a', label: 'Small (1–2 persons)',  price: 599,  unit: 'box', inStock: true },
      { id: 'v5b', label: 'Medium (3–4 persons)', price: 1099, unit: 'box', inStock: true },
      { id: 'v5c', label: 'Large (5+ persons)',   price: 1799, unit: 'box', inStock: false },
    ],
  },
  {
    id: 'p6',
    name: 'Home Cleaning Service',
    description: 'Professional deep-clean of your home by trained staff.',
    category: 'services',
    emoji: '🧹',
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80',
    basePrice: 799,
    unit: 'session',
    rating: 4.9,
    reviewCount: 430,
    popular: true,
    tags: ['cleaning', 'professional', 'deep clean'],
    variants: [
      { id: 'v6a', label: '1 BHK (2 hrs)',   price: 799,  unit: 'session', inStock: true },
      { id: 'v6b', label: '2 BHK (3 hrs)',   price: 1199, unit: 'session', inStock: true },
      { id: 'v6c', label: '3+ BHK (5 hrs)',  price: 1799, unit: 'session', inStock: true },
    ],
  },
  {
    id: 'p7',
    name: 'Fresh Bread Loaf',
    description: 'Freshly baked whole-wheat and multigrain breads, delivered by morning.',
    category: 'food',
    emoji: '🍞',
    image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&q=80',
    basePrice: 45,
    unit: 'loaf',
    rating: 4.6,
    reviewCount: 280,
    tags: ['bakery', 'morning', 'multigrain'],
    variants: [
      { id: 'v7a', label: 'White (400 g)',      price: 45, unit: 'loaf', inStock: true },
      { id: 'v7b', label: 'Whole Wheat (400 g)', price: 55, unit: 'loaf', inStock: true },
      { id: 'v7c', label: 'Multigrain (400 g)',  price: 65, unit: 'loaf', inStock: true },
    ],
  },
  {
    id: 'p8',
    name: 'AC / Appliance Repair',
    description: 'Same-day repair service for ACs, washing machines, and refrigerators.',
    category: 'services',
    emoji: '🔧',
    image: 'https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?w=400&q=80',
    basePrice: 399,
    unit: 'visit',
    rating: 4.7,
    reviewCount: 175,
    tags: ['repair', 'AC', 'same-day'],
    variants: [
      { id: 'v8a', label: 'AC Service',          price: 599,  unit: 'visit', inStock: true },
      { id: 'v8b', label: 'Washing Machine',      price: 499,  unit: 'visit', inStock: true },
      { id: 'v8c', label: 'Refrigerator',         price: 399,  unit: 'visit', inStock: true },
    ],
  },
];
