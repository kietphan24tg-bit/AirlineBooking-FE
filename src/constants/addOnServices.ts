import { Luggage, Utensils, Wifi, PackageOpen, type LucideIcon } from 'lucide-react';

export type AddOnServiceItem = {
  id: string;
  name: string;
  description: string;
  price: string;
  icon: LucideIcon;
};

export const ADD_ON_SERVICES: AddOnServiceItem[] = [
  {
    id: 'extra-baggage',
    name: 'Hành lý thêm',
    description: '20kg hành lý ký gửi',
    price: '£45',
    icon: Luggage,
  },
  {
    id: 'meal-upgrade',
    name: 'Nâng cấp bữa ăn',
    description: 'Premium meal service',
    price: '£35',
    icon: Utensils,
  },
  {
    id: 'wifi-pass',
    name: 'Wifi không giới hạn',
    description: 'Internet suốt chuyến bay',
    price: '£12',
    icon: Wifi,
  },
  {
    id: 'lounge-access',
    name: 'Truy cập Lounge VIP',
    description: 'Sovereign Platinum Lounge',
    price: '£99',
    icon: PackageOpen,
  },
];
