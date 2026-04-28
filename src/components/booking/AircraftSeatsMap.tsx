import { Armchair, Check, Info, List, Loader2 } from 'lucide-react';
import type { ReactElement, ReactNode } from 'react';
import { toast } from 'sonner';
import type {
  SeatMapCell,
  SeatMapDisplayItem,
  SeatMapDisplayPrice,
  SeatMapResponse,
  SeatMapSeatClass,
} from '../../types/flight.types';

export type SeatSelectionValue = {
  seatId: number;
  seatNumber: string;
  seatCategory: string;
  extraPrice: number | null;
  currency: string | null;
  displayPrice?: SeatMapDisplayPrice;
  seatTypeDisplay?: SeatMapDisplayItem;
  seatCategoryDisplay?: SeatMapDisplayItem;
};

export interface AircraftSeatsMapProps {
  seatMap: SeatMapResponse | null;
  loading?: boolean;
  error?: string | null;
  selectedSeat?: SeatSelectionValue | null;
  onSeatSelect?: (seat: SeatSelectionValue | null) => void;
  onClose?: () => void;
}

type SeatVisualState = 'free' | 'paid' | 'unavailable' | 'not_allowed' | 'selected';

type SeatCellViewModel = {
  title: string;
  subtitle: string;
  appearance: SeatVisualState;
  disabled: boolean;
};

type SeatDetailViewModel = {
  heading: string;
  priceText: string;
  seatType: string;
  seatCategory: string;
  description: string;
  status: string;
  includedInFare: string;
  surchargeText: string;
  farePolicy: string;
  canSelect: boolean;
};

function normalizeSeatPriceText(value: string): string {
  return value.trim().replace(/^\+\s*/, '');
}

function fallbackDisplayItem(code: string | null | undefined): SeatMapDisplayItem {
  const normalized = code ?? '';
  return {
    code: normalized,
    label: normalized ? normalized.replace(/_/g, ' ') : 'N/A',
    description: '',
  };
}

function getDisplayPriceText(cell: SeatMapCell): string {
  const text = cell.displayPrice?.text?.trim();
  if (text) return normalizeSeatPriceText(text);

  const badgeLabel = cell.pricingBadge?.label?.trim();
  if (badgeLabel) return normalizeSeatPriceText(badgeLabel);

  if (!cell.selectable) {
    return cell.pricingBadge?.code === 'NOT_ALLOWED' || cell.reason === 'SEAT_NOT_ALLOWED_FOR_FARE'
      ? 'Not allowed'
      : 'Unavailable';
  }

  if (cell.displayPrice?.type === 'FREE' || cell.pricingBadge?.code === 'FREE') return 'Free';
  if (cell.extraPrice != null && cell.extraPrice > 0) {
    return `${cell.extraPrice.toLocaleString('vi-VN')} ${cell.currency ?? ''}`.trim();
  }
  return 'Free';
}

function getSeatCellViewModel(cell: SeatMapCell, isSelected: boolean): SeatCellViewModel {
  const subtitle = getDisplayPriceText(cell);
  if (isSelected) {
    return {
      title: cell.seatNumber,
      subtitle,
      appearance: 'selected',
      disabled: false,
    };
  }

  if (!cell.selectable) {
    const unavailable =
      cell.pricingBadge?.code === 'UNAVAILABLE' || cell.displayPrice?.type === 'UNAVAILABLE';
    return {
      title: cell.seatNumber,
      subtitle,
      appearance: unavailable ? 'unavailable' : 'not_allowed',
      disabled: true,
    };
  }

  if (cell.displayPrice?.type === 'FREE') {
    return {
      title: cell.seatNumber,
      subtitle,
      appearance: 'free',
      disabled: !cell.selectable,
    };
  }

  return {
    title: cell.seatNumber,
    subtitle,
    appearance: 'paid',
    disabled: false,
  };
}

function getSeatClasses(variant: SeatVisualState): string {
  if (variant === 'selected') {
    return 'border-midnight-burgundy bg-midnight-burgundy text-white shadow-md ring-2 ring-midnight-burgundy/20';
  }
  if (variant === 'free') {
    return 'border-emerald-300 bg-emerald-50 text-emerald-950 hover:border-emerald-500 hover:bg-emerald-100';
  }
  if (variant === 'paid') {
    return 'border-amber-300 bg-amber-50 text-amber-950 hover:border-amber-500 hover:bg-amber-100';
  }
  if (variant === 'not_allowed') {
    return 'cursor-not-allowed border-rose-200 bg-rose-50 text-rose-900/70';
  }
  return 'cursor-not-allowed border-outline-variant/30 bg-surface-container-high text-on-surface-variant/70';
}

function handleSeatClick({
  seat,
  isSelected,
  onSelect,
  showSeatHint,
}: {
  seat: SeatMapCell;
  isSelected: boolean;
  onSelect: (seat: SeatMapCell | null) => void;
  showSeatHint: (message: string) => void;
}) {
  if (!seat.selectable) {
    showSeatHint(getDisplayPriceText(seat));
    return;
  }

  onSelect(isSelected ? null : seat);
}

function buildTooltip(cell: SeatMapCell): string {
  const status = cell.statusDisplay?.label ?? fallbackDisplayItem(cell.status).label;
  const seatType = cell.seatTypeDisplay?.label ?? fallbackDisplayItem(cell.seatType).label;
  const category = cell.seatCategoryDisplay?.label ?? fallbackDisplayItem(cell.seatCategory).label;
  return `${cell.seatNumber} - ${seatType} - ${category} - ${status} - ${getDisplayPriceText(cell)}`;
}

function buildSelection(cell: SeatMapCell): SeatSelectionValue {
  return {
    seatId: cell.seatId,
    seatNumber: cell.seatNumber,
    seatCategory: cell.seatCategory,
    extraPrice: cell.extraPrice,
    currency: cell.currency,
    displayPrice: cell.displayPrice,
    seatTypeDisplay: cell.seatTypeDisplay,
    seatCategoryDisplay: cell.seatCategoryDisplay,
  };
}

function getSeatDetailViewModel(
  seat: SeatMapCell,
  policyDisplay: SeatMapDisplayItem | undefined,
  fallbackPolicy: string
): SeatDetailViewModel {
  const typeDisplay = seat.seatTypeDisplay ?? fallbackDisplayItem(seat.seatType);
  const categoryDisplay = seat.seatCategoryDisplay ?? fallbackDisplayItem(seat.seatCategory);
  const statusDisplay = seat.statusDisplay ?? fallbackDisplayItem(seat.status);

  return {
    heading: `Seat ${seat.seatNumber}`,
    priceText: getDisplayPriceText(seat),
    seatType: typeDisplay.label,
    seatCategory: categoryDisplay.label,
    description: categoryDisplay.description || typeDisplay.description || '',
    status: statusDisplay.label,
    includedInFare: seat.included ? 'Yes' : 'No',
    surchargeText:
      seat.extraPrice == null || seat.currency == null
        ? '-'
        : `${seat.extraPrice.toLocaleString('vi-VN')} ${seat.currency}`,
    farePolicy: policyDisplay?.label ?? fallbackPolicy,
    canSelect: seat.selectable,
  };
}

function renderSeatCell(key: string, content: ReactNode, className: string): ReactElement {
  return (
    <div key={key} className={className}>
      {content}
    </div>
  );
}

function seatClassLabel(seatClass: SeatMapSeatClass, zoneLabel?: string): string {
  if (zoneLabel) return zoneLabel;
  return seatClass.replace(/_/g, ' ');
}

function findSeatCellById(seatMap: SeatMapResponse | null, seatId: number | null | undefined) {
  if (!seatMap || !seatId) return null;
  for (const row of seatMap.rows) {
    const seat = row.cells.find((cell) => cell.seatId === seatId);
    if (seat) return seat;
  }
  return null;
}

function DetailPanel({
  seatMap,
  seat,
  onConfirm,
  onClose,
}: {
  seatMap: SeatMapResponse;
  seat: SeatMapCell | null;
  onConfirm?: (seat: SeatMapCell) => void;
  onClose?: () => void;
}) {
  if (!seat) {
    return (
      <div className="rounded-xl border border-outline-variant/20 bg-white/85 p-5 shadow-sm backdrop-blur-md">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-midnight-burgundy">
          Select seat to view details
        </p>

        <button
          type="button"
          onClick={onClose}
          className="auth-primary-btn mt-7 inline-flex h-12 w-full items-center justify-center gap-2 rounded-md px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          Maybe later
        </button>
      </div>
    );
  }

  const vm = getSeatDetailViewModel(seat, seatMap.policyDisplay, seatMap.seatSelectionPolicy);

  return (
    <div className="rounded-xl border border-outline-variant/20 bg-white/90 p-5 shadow-sm backdrop-blur-md">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-midnight-burgundy">
        Selected seat
      </p>
      <div className="rounded-lg bg-surface-container-lowest p-4 flex flex-row items-center gap-2">
        <Armchair className="h-23 w-23 text-luxury-gold" strokeWidth={1} />
        <div className="flex flex-col">
          <h3 className="font-headline text-2xl font-black text-midnight-burgundy">{vm.heading}</h3>
          <p className="mt-2 inline-flex min-h-8 items-center rounded-full bg-luxury-gold/15 px-3 text-sm font-black text-secondary">
            {vm.priceText}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 text-sm">
        <div className="space-y-2">
          <p className="font-bold text-on-surface">
            Seat type: <span className="font-normal">{vm.seatType}</span>
          </p>
          <p className="font-bold text-on-surface">
            Seat category: <span className="font-normal">{vm.seatCategory}</span>
          </p>
          {vm.description ? (
            <p className="font-bold text-on-surface">
              Description: <span className="font-normal">{vm.description}</span>
            </p>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-3 border-t border-outline-variant/20 pt-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
              Status
            </p>
            <p className="mt-1 font-bold text-midnight-burgundy">{vm.status}</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
              Included in fare
            </p>
            <p className="mt-1 font-bold text-midnight-burgundy">{vm.includedInFare}</p>
          </div>
          <div className="col-span-2">
            <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
              Additional surcharge
            </p>
            <p className="mt-1 inline-flex rounded-full bg-midnight-burgundy/10 px-2.5 py-1 text-sm font-black text-midnight-burgundy">
              {vm.surchargeText}
            </p>
          </div>
        </div>

        <div className="border-t border-outline-variant/20 pt-4">
          <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
            Fare policy
          </p>
          <p className="mt-1 font-bold text-midnight-burgundy">{vm.farePolicy}</p>
        </div>
      </div>

      <button
        type="button"
        disabled={!vm.canSelect}
        onClick={() => onConfirm?.(seat)}
        className="auth-primary-btn mt-7 inline-flex h-12 w-full items-center justify-center gap-2 rounded-md px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Check className="h-4 w-4" />
        Select seat
      </button>
    </div>
  );
}

function CompactSelectionBar({
  seatMap,
  seat,
  onConfirm,
}: {
  seatMap: SeatMapResponse;
  seat: SeatMapCell;
  onConfirm?: (seat: SeatMapCell) => void;
}) {
  const vm = getSeatDetailViewModel(seat, seatMap.policyDisplay, seatMap.seatSelectionPolicy);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 rounded-xl border border-outline-variant/20 bg-white/95 p-4 shadow-2xl backdrop-blur-md sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-[0.6875rem] font-black uppercase tracking-[0.14em] text-midnight-burgundy">
          Selected seat
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
          <h3 className="font-headline text-xl font-black text-midnight-burgundy">{vm.heading}</h3>
          <span className="rounded-full bg-luxury-gold/15 px-2.5 py-1 text-xs font-black text-secondary">
            {vm.priceText}
          </span>
        </div>
        <p className="mt-1 truncate text-sm font-semibold text-on-surface">
          {vm.seatType} | {vm.seatCategory}
        </p>
      </div>

      <button
        type="button"
        disabled={!vm.canSelect}
        onClick={() => onConfirm?.(seat)}
        className="auth-primary-btn inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-md px-5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Check className="h-4 w-4" />
        Select seat
      </button>
    </div>
  );
}

function LegendSwatch({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-xs font-bold text-on-surface">
      <span className={`h-3 w-3 rounded-sm border ${className}`} />
      {label}
    </span>
  );
}

export default function AircraftSeatsMap({
  seatMap,
  loading = false,
  error = null,
  selectedSeat = null,
  onSeatSelect,
  onClose,
}: AircraftSeatsMapProps) {
  const columns = seatMap?.layout.columns ?? [];
  const aisleAfter = new Set(seatMap?.layout.aisleAfterColumns ?? []);
  const zones = seatMap?.layout.seatClassZones ?? [];
  const activeSeatCell = findSeatCellById(seatMap, selectedSeat?.seatId);

  return (
    <div className="flex flex-row gap-4 rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-4 flex-1">
        <div>
          <h1 className="mb-2 flex items-center gap-2 font-headline text-xl font-black text-midnight-burgundy">
            <List className="h-5 w-5" />
            Chon ghe
          </h1>
          <p className="text-sm text-on-surface-variant">
            {seatMap
              ? `Flight #${seatMap.flightId} - ${seatMap.fareCode}`
              : 'Chon ghe phu hop theo dieu kien hang ve cua ban.'}
          </p>
          {seatMap?.policyDisplay ? (
            <div className="mt-3 max-w-3xl">
              <p className="text-sm font-bold text-midnight-burgundy">
                {seatMap.policyDisplay.label}
              </p>
              <p className="mt-1 text-sm leading-6 text-on-surface-variant">
                {seatMap.policyDisplay.description}
              </p>
            </div>
          ) : null}
        </div>

        {loading ? (
          <div className="rounded-xl border border-outline-variant/20 bg-surface-container-low px-4 py-10 text-center text-sm text-on-surface-variant flex flex-col items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-midnight-burgundy mb-3" />
            Dang tai so do cho ngoi...
          </div>
        ) : null}

        {!loading && error ? (
          <div className="rounded-xl border border-error/30 bg-error/5 px-4 py-4 text-sm text-error">
            {error}
          </div>
        ) : null}

        {!loading && !error && !seatMap ? (
          <div className="rounded-xl border border-outline-variant/20 bg-surface-container-low px-4 py-10 text-center text-sm text-on-surface-variant">
            Khong tim thay flightId hoac fareId trong store de tai so do ghe.
          </div>
        ) : null}

        {!loading && !error && seatMap ? (
          <>
            <div className="rounded-xl border border-luxury-gold/10 bg-white/60 p-3.5 shadow-sm">
              <div className="grid gap-4 text-sm md:grid-cols-2">
                <div>
                  <p className="mb-2 text-xs font-black uppercase tracking-[0.16em] text-on-surface-variant">
                    Availability
                  </p>
                  <div className="flex flex-wrap gap-4">
                    <LegendSwatch className="border-emerald-300 bg-emerald-50" label="Available" />
                    <LegendSwatch
                      className="border-outline-variant/30 bg-surface-container-high"
                      label="Unavailable"
                    />
                    <LegendSwatch className="border-rose-200 bg-rose-50" label="Not allowed" />
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-xs font-black uppercase tracking-[0.16em] text-on-surface-variant">
                    Pricing
                  </p>
                  <div className="flex flex-wrap gap-4">
                    <LegendSwatch className="border-emerald-300 bg-emerald-50" label="Free" />
                    <LegendSwatch className="border-amber-300 bg-amber-50" label="Paid" />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-5 ">
              <div className="min-w-0 space-y-6">
                {zones.map((zone) => {
                  const rows = seatMap.rows.filter(
                    (row) => row.rowNumber >= zone.rowStart && row.rowNumber <= zone.rowEnd
                  );
                  if (rows.length === 0) return null;
                  const gridTemplateColumns = `56px repeat(${columns.length + aisleAfter.size}, 104px)`;
                  return (
                    <section key={`${zone.seatClass}-${zone.rowStart}-${zone.rowEnd}`}>
                      <div className="mb-3">
                        <h2 className="text-sm font-black uppercase tracking-widest text-midnight-burgundy">
                          {seatClassLabel(zone.seatClass)} (Rows {zone.rowStart}-{zone.rowEnd})
                        </h2>
                      </div>

                      <div className="overflow-x-clip pb-3 ">
                        <div className="min-w-max space-y-2.5 pr-4">
                          <div
                            className="grid items-center gap-1.5"
                            style={{ gridTemplateColumns }}
                          >
                            {renderSeatCell(
                              'zone-header-label',
                              <span className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">
                                Row
                              </span>,
                              ''
                            )}
                            {columns.flatMap((column) => {
                              const headerCells: ReactElement[] = [
                                renderSeatCell(
                                  `header-${zone.seatClass}-${column}`,
                                  <span className="text-center text-xs font-bold text-on-surface">
                                    {column}
                                  </span>,
                                  'flex h-7 items-center justify-center'
                                ),
                              ];
                              if (aisleAfter.has(column)) {
                                headerCells.push(
                                  renderSeatCell(
                                    `header-aisle-${zone.seatClass}-${column}`,
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/70">
                                      Aisle
                                    </span>,
                                    'flex h-7 items-center justify-center'
                                  )
                                );
                              }
                              return headerCells;
                            })}
                          </div>

                          {rows.map((row) => {
                            const cellByColumn = new Map(
                              row.cells.map((cell) => [cell.columnLetter, cell] as const)
                            );
                            return (
                              <div
                                key={`${zone.seatClass}-${row.rowNumber}`}
                                className="grid items-center gap-1.5"
                                style={{ gridTemplateColumns }}
                              >
                                <div className="pr-2 text-right text-xs font-bold text-on-surface-variant">
                                  Row {row.rowNumber}
                                </div>
                                {columns.flatMap((column) => {
                                  const seat = cellByColumn.get(column);
                                  const parts: ReactElement[] = [];
                                  if (seat) {
                                    const isSelected = selectedSeat?.seatId === seat.seatId;
                                    const viewModel = getSeatCellViewModel(seat, isSelected);
                                    parts.push(
                                      <button
                                        key={`seat-${row.rowNumber}-${column}`}
                                        type="button"
                                        aria-disabled={viewModel.disabled}
                                        title={buildTooltip(seat)}
                                        onClick={() => {
                                          handleSeatClick({
                                            seat,
                                            isSelected,
                                            onSelect: (nextSeat) =>
                                              onSeatSelect?.(
                                                nextSeat ? buildSelection(nextSeat) : null
                                              ),
                                            showSeatHint: (message) => toast.info(message),
                                          });
                                        }}
                                        className={`flex h-18.5 w-26 flex-col items-start justify-center rounded-lg border px-2.5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${getSeatClasses(
                                          viewModel.appearance
                                        )}`}
                                      >
                                        <span className="text-sm font-black leading-4">
                                          {viewModel.title}
                                        </span>
                                        <span className="mt-1.5 inline-flex max-w-full rounded-full bg-white/60 px-2 py-1 text-[0.625rem] font-black leading-3 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.04)]">
                                          {viewModel.subtitle}
                                        </span>
                                      </button>
                                    );
                                  } else {
                                    parts.push(
                                      <div
                                        key={`empty-${row.rowNumber}-${column}`}
                                        className="h-18.5 w-26 rounded-lg border border-dashed border-outline-variant/10 bg-transparent"
                                      />
                                    );
                                  }
                                  if (aisleAfter.has(column)) {
                                    parts.push(
                                      <div
                                        key={`aisle-${row.rowNumber}-${column}`}
                                        className="flex h-18.5 w-26 items-center justify-center"
                                      >
                                        <span className="h-full w-px bg-outline-variant/10" />
                                      </div>
                                    );
                                  }
                                  return parts;
                                })}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </section>
                  );
                })}
              </div>
            </div>

            {activeSeatCell ? (
              <div className="fixed inset-x-0 bottom-0 z-40 p-3 xl:hidden">
                <CompactSelectionBar
                  seatMap={seatMap}
                  seat={activeSeatCell}
                  onConfirm={(seat) => onSeatSelect?.(buildSelection(seat))}
                />
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-lg bg-surface-container-low p-3 text-xs text-on-surface-variant xl:hidden">
                <Info className="h-4 w-4" />
                Select a seat to view details.
              </div>
            )}
          </>
        ) : null}
      </div>

      {seatMap && (
        <aside className="hidden xl:block w-80">
          <div className="sticky top-28">
            <DetailPanel
              seatMap={seatMap}
              seat={activeSeatCell}
              onConfirm={(seat) => {
                onSeatSelect?.(buildSelection(seat));
                onClose?.();
              }}
              onClose={onClose}
            />
          </div>
        </aside>
      )}
    </div>
  );
}
