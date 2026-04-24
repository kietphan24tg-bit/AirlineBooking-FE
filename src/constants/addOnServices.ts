import { BriefcaseBusiness, ShieldCheck, UtensilsCrossed, type LucideIcon } from 'lucide-react';

export type AddOnServiceOption = {
  id: string;
  categoryId: AddOnServiceCategoryId;
  name: string;
  description: string;
  price: number;
  priceLabel: string;
};

export type AddOnServiceCategoryId = 'baggage' | 'meals' | 'insurance';

export type AddOnServiceCategory = {
  id: AddOnServiceCategoryId;
  name: string;
  subtitle: string;
  panelTitle: string;
  panelDescription: string;
  icon: LucideIcon;
  options: AddOnServiceOption[];
};

export const ADD_ON_SERVICE_CATEGORIES: AddOnServiceCategory[] = [
  {
    id: 'baggage',
    name: 'Hanh ly ky gui',
    subtitle: 'Baggage Add-on',
    panelTitle: 'HANH LY KY GUI',
    panelDescription: 'Checked baggage for this passenger',
    icon: BriefcaseBusiness,
    options: [
      {
        id: 'baggage-15kg',
        categoryId: 'baggage',
        name: 'Extra 15kg',
        description: 'Add one checked baggage up to 15kg',
        price: 180000,
        priceLabel: '180,000 VND',
      },
      {
        id: 'baggage-20kg',
        categoryId: 'baggage',
        name: 'Extra 20kg',
        description: 'Add one checked baggage up to 20kg',
        price: 250000,
        priceLabel: '250,000 VND',
      },
      {
        id: 'baggage-25kg',
        categoryId: 'baggage',
        name: 'Extra 25kg',
        description: 'Add one checked baggage up to 25kg',
        price: 320000,
        priceLabel: '320,000 VND',
      },
      {
        id: 'baggage-30kg',
        categoryId: 'baggage',
        name: 'Extra 30kg',
        description: 'Add one checked baggage up to 30kg',
        price: 390000,
        priceLabel: '390,000 VND',
      },
      {
        id: 'baggage-40kg',
        categoryId: 'baggage',
        name: 'Extra 40kg',
        description: 'Add one checked baggage up to 40kg',
        price: 520000,
        priceLabel: '520,000 VND',
      },
    ],
  },
  {
    id: 'meals',
    name: 'Suat an',
    subtitle: 'Pre-order Meals',
    panelTitle: 'SUAT AN',
    panelDescription: 'Meal selection for this passenger',
    icon: UtensilsCrossed,
    options: [
      {
        id: 'meal-beef-pho',
        categoryId: 'meals',
        name: 'Beef Pho Meal',
        description: 'Hot Vietnamese beef pho served with beverage',
        price: 90000,
        priceLabel: '90,000 VND',
      },
      {
        id: 'meal-chicken-rice',
        categoryId: 'meals',
        name: 'Chicken Rice Meal',
        description: 'Hot chicken rice meal with seasonal side dish',
        price: 95000,
        priceLabel: '95,000 VND',
      },
      {
        id: 'meal-vegetarian',
        categoryId: 'meals',
        name: 'Vegetarian Delight',
        description: 'Vegetarian meal with fresh vegetables and rice',
        price: 95000,
        priceLabel: '95,000 VND',
      },
      {
        id: 'meal-halal',
        categoryId: 'meals',
        name: 'Halal Chicken Meal',
        description: 'Halal-certified chicken meal with vegetables',
        price: 110000,
        priceLabel: '110,000 VND',
      },
      {
        id: 'meal-kids-pasta',
        categoryId: 'meals',
        name: 'Kids Pasta Set',
        description: 'Child-friendly pasta set with juice and dessert',
        price: 85000,
        priceLabel: '85,000 VND',
      },
      {
        id: 'meal-premium-combo',
        categoryId: 'meals',
        name: 'Premium Combo Meal',
        description: 'Main course, dessert, and beverage',
        price: 150000,
        priceLabel: '150,000 VND',
      },
    ],
  },
  {
    id: 'insurance',
    name: 'Bao hiem chuyen bay',
    subtitle: 'Travel Insurance',
    panelTitle: 'BAO HIEM CHUYEN BAY',
    panelDescription: 'Protection plans for this passenger',
    icon: ShieldCheck,
    options: [
      {
        id: 'insurance-domestic-basic',
        categoryId: 'insurance',
        name: 'Domestic Basic Cover',
        description: 'Medical and trip protection for domestic itineraries',
        price: 65000,
        priceLabel: '65,000 VND',
      },
      {
        id: 'insurance-domestic-premium',
        categoryId: 'insurance',
        name: 'Domestic Premium Cover',
        description: 'Expanded protection for delays, baggage, and medical',
        price: 99000,
        priceLabel: '99,000 VND',
      },
      {
        id: 'insurance-international-basic',
        categoryId: 'insurance',
        name: 'International Basic Cover',
        description: 'Essential overseas medical and baggage protection',
        price: 160000,
        priceLabel: '160,000 VND',
      },
      {
        id: 'insurance-international-premium',
        categoryId: 'insurance',
        name: 'International Premium Cover',
        description: 'Comprehensive protection incl. delays and missed conn.',
        price: 245000,
        priceLabel: '245,000 VND',
      },
    ],
  },
];

export const ADD_ON_SERVICES = ADD_ON_SERVICE_CATEGORIES.flatMap((category) => category.options);

export const ADD_ON_SERVICE_BY_ID = new Map(
  ADD_ON_SERVICES.map((service) => [service.id, service] as const)
);
