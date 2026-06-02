import { useEffect, useMemo, useState } from 'react';
import {
  BriefcaseBusiness,
  Check,
  ShieldCheck,
  Sparkles,
  UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react';
import Button from '../ui/Button';
import type {
  SelectedServiceOption,
  ServiceGroup,
  ServiceSelectionMode,
} from '../../types/flight.types';

export interface AdditionalServiceProps {
  services?: ServiceGroup[];
  loading?: boolean;
  error?: string | null;
  selectedServices?: SelectedServiceOption[];
  confirmLoading?: boolean;
  onSelectedServicesChange?: (services: SelectedServiceOption[]) => void;
  onConfirm?: () => void;
  onClose?: () => void;
}

function fallbackIconForServiceType(serviceType: string): LucideIcon {
  const normalized = serviceType.toUpperCase();
  if (normalized.includes('BAGGAGE')) return BriefcaseBusiness;
  if (normalized.includes('MEAL') || normalized.includes('FOOD')) return UtensilsCrossed;
  if (normalized.includes('INSURANCE')) return ShieldCheck;
  return Sparkles;
}

function ServiceIcon({
  iconUrl,
  icon: Icon,
  className,
  imageClassName,
}: {
  iconUrl: string | null;
  icon: LucideIcon;
  className: string;
  imageClassName: string;
}) {
  const [failed, setFailed] = useState(false);

  return (
    <span className={className}>
      <Icon className="h-5 w-5" strokeWidth={1.8} />
      {iconUrl && !failed ? (
        <img src={iconUrl} alt="" className={imageClassName} onError={() => setFailed(true)} />
      ) : null}
    </span>
  );
}

function getActiveServices(services: ServiceGroup[] | undefined): ServiceGroup[] {
  return (services ?? [])
    .map((service) => ({
      ...service,
      options: service.options.filter((option) => option.isActive),
    }))
    .filter((service) => service.options.length > 0);
}

function isSelected(
  selectedServices: SelectedServiceOption[],
  serviceId: number,
  optionId: number
): boolean {
  return selectedServices.some(
    (service) => service.serviceId === serviceId && service.optionId === optionId
  );
}

function selectOption(
  previous: SelectedServiceOption[],
  option: SelectedServiceOption,
  selectionMode: ServiceSelectionMode
): SelectedServiceOption[] {
  const alreadySelected = isSelected(previous, option.serviceId, option.optionId);
  if (selectionMode === 'MULTIPLE') {
    return alreadySelected
      ? previous.filter(
          (service) =>
            service.serviceId !== option.serviceId || service.optionId !== option.optionId
        )
      : [...previous, option];
  }

  const withoutCurrentService = previous.filter(
    (service) => service.serviceId !== option.serviceId
  );
  return alreadySelected ? withoutCurrentService : [...withoutCurrentService, option];
}

export default function AdditionalService({
  services,
  loading = false,
  error = null,
  selectedServices = [],
  confirmLoading = false,
  onSelectedServicesChange,
  onConfirm,
  onClose,
}: AdditionalServiceProps) {
  const activeServices = useMemo(() => getActiveServices(services), [services]);
  const [activeServiceId, setActiveServiceId] = useState<number | null>(
    activeServices[0]?.serviceId ?? null
  );

  useEffect(() => {
    if (activeServices.length === 0) {
      setActiveServiceId(null);
      return;
    }
    const selectedService = selectedServices.find((service) =>
      activeServices.some((activeService) => activeService.serviceId === service.serviceId)
    );
    const nextActiveId = selectedService?.serviceId ?? activeServices[0].serviceId;
    setActiveServiceId((current) =>
      current != null && activeServices.some((service) => service.serviceId === current)
        ? current
        : nextActiveId
    );
  }, [activeServices, selectedServices]);

  const activeService =
    activeServices.find((service) => service.serviceId === activeServiceId) ??
    activeServices[0] ??
    null;

  if (loading) {
    return (
      <div className="flex flex-col gap-5 rounded-[1.75rem] border border-luxury-gold/15 bg-surface-container-lowest p-5 shadow-[0_18px_45px_rgba(62,16,30,0.08)] md:p-6">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="h-24 animate-pulse rounded-2xl bg-surface-container-high/50"
            />
          ))}
        </div>
        <div className="h-72 animate-pulse rounded-3xl bg-white" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-[1.75rem] border border-error/30 bg-error/5 p-6 text-sm text-error">
        {error}
      </div>
    );
  }

  if (!activeService) {
    return (
      <div className="rounded-[1.75rem] border border-luxury-gold/15 bg-surface-container-lowest p-8 text-center shadow-[0_18px_45px_rgba(62,16,30,0.08)]">
        <p className="font-headline text-xl font-black text-midnight-burgundy">
          No additional services
        </p>
        <p className="mt-2 text-sm text-on-surface-variant">
          No additional services are available for this flight and fare.
        </p>
      </div>
    );
  }

  const ActiveIcon = fallbackIconForServiceType(activeService.serviceType);

  return (
    <div className="grid gap-5 rounded-[1.75rem] border border-luxury-gold/15 bg-surface-container-lowest p-5 shadow-[0_18px_45px_rgba(62,16,30,0.08)] md:p-6 xl:grid-cols-[20rem_minmax(0,1fr)] xl:items-start">
      <div className="flex min-w-0 flex-col gap-4 xl:sticky xl:top-28">
        <div className="rounded-2xl border border-luxury-gold/10 bg-white/80 p-4">
          <p className="text-[0.68rem] font-bold uppercase tracking-[0.22em] text-secondary/80">
            Service groups
          </p>
          <p className="mt-2 text-sm text-on-surface-variant">
            Review available add-ons and switch groups without leaving this workspace.
          </p>
        </div>

        <div className="flex max-h-[32rem] flex-col gap-y-4 overflow-y-auto pr-1">
          {activeServices.map((service) => {
            const Icon = fallbackIconForServiceType(service.serviceType);
            const hasSelection = selectedServices.some(
              (selectedService) => selectedService.serviceId === service.serviceId
            );
            const isActive = service.serviceId === activeService.serviceId;

            return (
              <button
                key={service.serviceId}
                type="button"
                onClick={() => setActiveServiceId(service.serviceId)}
                className={`group flex min-h-24 w-full items-start gap-4 rounded-2xl border p-4 text-left transition-all duration-200 ${
                  isActive
                    ? 'border-midnight-burgundy bg-midnight-burgundy/6'
                    : 'border-luxury-gold/15 bg-white hover:border-midnight-burgundy/30 hover:bg-surface-container-low'
                }`}
              >
                <ServiceIcon
                  iconUrl={service.iconUrl}
                  icon={Icon}
                  className={`relative mt-0.5 flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl ${
                    isActive
                      ? 'bg-midnight-burgundy text-luxury-gold'
                      : 'bg-luxury-gold/10 text-luxury-gold'
                  }`}
                  imageClassName="absolute h-7 w-7 object-contain"
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-start justify-between gap-3">
                    <span>
                      <span className="block font-headline text-[1.05rem] font-black text-midnight-burgundy">
                        {service.serviceName}
                      </span>
                      <span className="mt-1 block text-sm text-on-surface-variant">
                        {service.selectionMode === 'MULTIPLE'
                          ? 'Select multiple options'
                          : 'Select one option'}
                      </span>
                    </span>
                    <span
                      className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-sm border transition-colors ${
                        hasSelection
                          ? 'border-midnight-burgundy bg-midnight-burgundy text-white'
                          : 'border-outline/40 bg-white'
                      }`}
                    >
                      {hasSelection ? <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> : null}
                    </span>
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-2 flex flex-col gap-3 sm:flex-row xl:hidden">
          <button
            onClick={onClose}
            disabled={confirmLoading}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md border border-slate-400/30 bg-slate-100/90 text-sm font-bold text-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Back to overview
          </button>
          <Button onClick={onConfirm} disabled={confirmLoading} className="h-12 w-full">
            {confirmLoading ? 'Saving...' : 'Confirm'}
          </Button>
        </div>
      </div>

      <section className="flex min-w-0 min-h-[38rem] flex-col overflow-hidden rounded-2xl border border-luxury-gold/15 bg-white">
        <header className="border-b border-luxury-gold/10 bg-[linear-gradient(180deg,rgba(125,6,51,0.06),rgba(255,255,255,0.96))] px-5 py-4 md:px-6">
          <p className="text-[0.7rem] font-bold uppercase tracking-[0.24em] text-secondary/80">
            {activeService.serviceType.replace(/_/g, ' ')}
          </p>
          <div className="mt-3 flex items-start gap-3">
            <ServiceIcon
              iconUrl={activeService.iconUrl}
              icon={ActiveIcon}
              className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-luxury-gold/10 text-luxury-gold"
              imageClassName="absolute h-6 w-6 object-contain"
            />
            <div>
              <p className="font-headline text-xl font-black text-midnight-burgundy">
                {activeService.serviceName}
              </p>
              <p className="mt-1 text-sm text-on-surface-variant">
                {activeService.selectionMode === 'MULTIPLE'
                  ? 'You can select multiple services in this group.'
                  : 'You can select only one service in this group.'}
              </p>
            </div>
          </div>
        </header>

        <div className="grid flex-1 gap-4 overflow-y-auto px-5 py-5 md:grid-cols-2 md:px-6">
          {activeService.options.map((option) => {
            const selected = isSelected(selectedServices, option.serviceId, option.optionId);

            return (
              <button
                key={`${option.serviceId}-${option.optionId}`}
                type="button"
                onClick={() =>
                  onSelectedServicesChange?.(
                    selectOption(selectedServices, option, activeService.selectionMode)
                  )
                }
                className={`group flex h-full flex-col rounded-[1.35rem] border p-4 text-left transition-all duration-200 ${
                  selected
                    ? 'border-midnight-burgundy bg-midnight-burgundy/5 shadow-[0_14px_30px_rgba(125,6,51,0.08)]'
                    : 'border-outline-variant/20 bg-surface-container-lowest hover:border-luxury-gold/35 hover:shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="break-words pr-2 font-headline text-lg font-black text-midnight-burgundy">
                      {option.name}
                    </h3>
                    <p className="mt-2 text-sm font-bold text-secondary">{option.priceLabel}</p>
                  </div>
                  <span
                    className={`shrink-0 inline-flex rounded-full border px-3 py-1 text-[0.65rem] font-bold uppercase tracking-[0.18em] transition-colors ${
                      selected
                        ? 'border-midnight-burgundy bg-midnight-burgundy text-white'
                        : 'border-midnight-burgundy/15 text-midnight-burgundy/70 group-hover:border-midnight-burgundy/35'
                    }`}
                  >
                    {selected ? 'Selected' : 'Select'}
                  </span>
                </div>

                {option.imageUrl ? (
                  <img
                    src={option.imageUrl}
                    alt=""
                    className="mt-4 h-24 w-full rounded-xl object-cover"
                    onError={(event) => {
                      event.currentTarget.style.display = 'none';
                    }}
                  />
                ) : null}

                <p className="mt-4 max-w-64 text-sm leading-6 text-on-surface-variant">
                  {option.description}
                </p>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
