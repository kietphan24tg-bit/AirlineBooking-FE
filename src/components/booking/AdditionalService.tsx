import { Luggage, Utensils, Wifi, PackageOpen } from 'lucide-react';
import { useEffect, useState } from 'react';
import Button from '../ui/Button';

const ADD_ON_SERVICES = [
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

export interface AdditionalServiceProps {
    onSelectServices?: (serviceIds: string[]) => void;
    crServiceIds?: string[];
}

export default function AdditionalService({ onSelectServices, crServiceIds }: AdditionalServiceProps) {
    const [selectedServices, setSelectedServices] = useState<string[]>([]);
    const toggleService = (serviceId: string) => {
        setSelectedServices((prev) =>
        prev.includes(serviceId) ? prev.filter((id) => id !== serviceId) : [...prev, serviceId]
        );
    };

    useEffect(() => {
        if (crServiceIds) {
            setSelectedServices(crServiceIds);
        }   else {
            setSelectedServices([]);
        }
    }, [crServiceIds]);

    return (
        <div className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-6 shadow-sm gap-2 flex flex-col">
            <div className="grid gap-4 md:grid-cols-2">
                {ADD_ON_SERVICES.map((service) => {
                    const Icon = service.icon;
                    const isSelected = selectedServices.includes(service.id);
                    return (
                    <button
                        key={service.id}
                        type="button"
                        onClick={() => toggleService(service.id)}
                        className={`cursor-pointer rounded-lg border-2 p-4 transition-all text-left ${
                        isSelected
                            ? 'border-midnight-burgundy bg-midnight-burgundy/5'
                            : 'border-outline-variant/20 bg-surface-container-low hover:border-luxury-gold/30'
                        }`}
                    >
                        <div className="mb-3 flex items-start justify-between">
                        <div className="flex items-start gap-3">
                            <Icon className="mt-0.5 h-5 w-5 text-luxury-gold" strokeWidth={1.5} />
                            <div>
                            <h3 className="font-bold text-midnight-burgundy">{service.name}</h3>
                            <p className="mt-1 text-xs text-on-surface-variant">
                                {service.description}
                            </p>
                            </div>
                        </div>
                        <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleService(service.id)}
                            className="cursor-pointer"
                        />
                        </div>
                        <p className="text-right font-bold text-secondary">{service.price}</p>
                    </button>
                    );
                })}
                </div>
                <Button onClick={() => onSelectServices?.(selectedServices)} className="self-end mt-4">
                    Xác nhận
                </Button>
        </div>
    );
}