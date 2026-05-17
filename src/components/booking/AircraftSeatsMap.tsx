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

export type AssignedSeatMeta = {
  label: string;
  isYours: boolean;
  surchargeAmount?: number | null;
  currency?: string | null;
};

export interface AircraftSeatsMapProps {
  seatMap: SeatMapResponse | null;
  loading?: boolean;
  error?: string | null;
  selectedSeat?: SeatSelectionValue | null;
  headerSubtitle?: string | null;
  /** Click a seat on the map â€” update preview only; no API. */
  onSeatPreview?: (seat: SeatSelectionValue) => void;
  /** "Select seat" in the side panel / bottom bar â€” parent commits and may call the API. */
  onSeatConfirm?: (seat: SeatSelectionValue) => void;
  onSeatCancel?: (seat: SeatSelectionValue) => void;
  onClose?: () => void;
  /** From last successful seat-assignment API â€” key is `seatId`. */
  assignedSeatBySeatId?: ReadonlyMap<number, AssignedSeatMeta> | null;
  seatConfirmLoading?: boolean;
  showDetailPanel?: boolean;
  showSeatLegend?: boolean;
}

type SeatVisualState = 'free' | 'paid' | 'unavailable' | 'not_allowed' | 'selected' | 'assigned';

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
  canCancel: boolean;
};

const ROW_LABEL_WIDTH = 56;
const SEAT_COLUMN_WIDTH = 88;
const AISLE_COLUMN_WIDTH = 28;

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

function getDisplayPriceText(
  cell: SeatMapCell,
  assigned?: AssignedSeatMeta | null
): string {
  if (assigned?.label?.trim()) return assigned.label.trim();
  if (assigned?.isYours) return 'Đã chọn';
  if (assigned && !assigned.isYours) return 'Đã giữ';

  const text = cell.displayPrice?.text?.trim();
  if (text) return normalizeSeatPriceText(text);

  const badgeLabel = cell.pricingBadge?.label?.trim();
  if (badgeLabel) return normalizeSeatPriceText(badgeLabel);

  if (!cell.selectable) {
    return cell.pricingBadge?.code === 'NOT_ALLOWED' || cell.reason === 'SEAT_NOT_ALLOWED_FOR_FARE'
      ? 'Không được phép'
      : 'Không khả dụng';
  }

  if (cell.displayPrice?.type === 'FREE' || cell.pricingBadge?.code === 'FREE') return 'Miễn phí';
  if (cell.extraPrice != null && cell.extraPrice > 0) {
    return `${cell.extraPrice.toLocaleString('vi-VN')} ${cell.currency ?? ''}`.trim();
  }
  return 'Miễn phí';
}

function getSeatCellViewModel(
  cell: SeatMapCell,
  isSelected: boolean,
  assigned: AssignedSeatMeta | null
): SeatCellViewModel {
  if (assigned) {
    return {
      title: cell.seatNumber,
      subtitle: assigned.isYours ? 'Đã chọn' : 'Đã giữ',
      appearance: 'assigned',
      disabled: true,
    };
  }

  const subtitle = getDisplayPriceText(cell, assigned);
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
  if (variant === 'assigned') {
    return ' border-slate-500 bg-slate-200/95 text-slate-800 shadow-sm ring-1 ring-slate-400/40';
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
  isAssigned,
  isSelected,
  onSelect,
}: {
  seat: SeatMapCell;
  isAssigned: boolean;
  isSelected: boolean;
  onSelect: (seat: SeatMapCell | null) => void;
}) {
  if (isAssigned) {
    onSelect(seat);
    return;
  }
  if (!seat.selectable) {
    toast.info(getDisplayPriceText(seat));
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
  fallbackPolicy: string,
  assigned: AssignedSeatMeta | null
): SeatDetailViewModel {
  const typeDisplay = seat.seatTypeDisplay ?? fallbackDisplayItem(seat.seatType);
  const categoryDisplay = seat.seatCategoryDisplay ?? fallbackDisplayItem(seat.seatCategory);
  const statusDisplay = seat.statusDisplay ?? fallbackDisplayItem(seat.status);
  const effectiveSurchargeAmount =
    assigned?.isYours && assigned.surchargeAmount != null ? assigned.surchargeAmount : seat.extraPrice;
  const effectiveSurchargeCurrency =
    assigned?.isYours && assigned.currency != null ? assigned.currency : seat.currency;

  if (assigned) {
    return {
      heading: `Seat ${seat.seatNumber}`,
      priceText: getDisplayPriceText(seat, assigned),
      seatType: typeDisplay.label,
      seatCategory: categoryDisplay.label,
      description: categoryDisplay.description || typeDisplay.description || '',
      status: assigned.isYours ? 'Đã chọn' : 'Đã xác nhận (hành khách khác)',
      includedInFare: seat.included ? 'Có' : 'Không',
      surchargeText:
        effectiveSurchargeAmount == null || effectiveSurchargeCurrency == null
          ? '-'
          : `${effectiveSurchargeAmount.toLocaleString('vi-VN')} ${effectiveSurchargeCurrency}`,
      farePolicy: policyDisplay?.label ?? fallbackPolicy,
      canSelect: false,
      canCancel: assigned.isYours,
    };
  }

  return {
    heading: `Seat ${seat.seatNumber}`,
    priceText: getDisplayPriceText(seat),
    seatType: typeDisplay.label,
    seatCategory: categoryDisplay.label,
    description: categoryDisplay.description || typeDisplay.description || '',
    status: statusDisplay.label,
    includedInFare: seat.included ? 'Có' : 'Không',
    surchargeText:
      seat.extraPrice == null || seat.currency == null
        ? '-'
        : `${seat.extraPrice.toLocaleString('vi-VN')} ${seat.currency}`,
    farePolicy: policyDisplay?.label ?? fallbackPolicy,
    canSelect: seat.selectable,
    canCancel: false,
  };
}

function renderSeatCell(key: string, content: ReactNode, className: string): ReactElement {
  return (
    <div key={key} className={className}>
      {content}
    </div>
  );
}

function buildSeatGridTemplate(columns: string[], aisleAfter: Set<string>): string {
  const template = [`${ROW_LABEL_WIDTH}px`];

  for (const column of columns) {
    template.push(`minmax(${SEAT_COLUMN_WIDTH}px, ${SEAT_COLUMN_WIDTH}px)`);
    if (aisleAfter.has(column)) {
      template.push(`${AISLE_COLUMN_WIDTH}px`);
    }
  }

  return template.join(' ');
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
  onCancel,
  assigned,
  confirmLoading = false,
}: {
  seatMap: SeatMapResponse;
  seat: SeatMapCell | null;
  onConfirm?: (seat: SeatMapCell) => void;
  onClose?: () => void;
  onCancel?: (seat: SeatMapCell) => void;
  assigned: AssignedSeatMeta | null;
  confirmLoading?: boolean;
}) {
  if (!seat) {
    return (
      <div className="rounded-xl border border-outline-variant/20 bg-white/85 p-5 shadow-sm backdrop-blur-md w-82">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-midnight-burgundy">
          Select seat to view details
        </p>
        <p className="mt-2 text-sm text-on-surface-variant">
          Use the workspace controls above to switch to extra services or return to the overview.
        </p>

        <button
          type="button"
          onClick={onClose}
          className="auth-primary-btn mt-7 inline-flex h-12 w-full items-center justify-center gap-2 rounded-md px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          Back to overview
        </button>
      </div>
    );
  }

  const vm = getSeatDetailViewModel(
    seat,
    seatMap.policyDisplay,
    seatMap.seatSelectionPolicy,
    assigned
  );

  return (
    <div className="rounded-xl border border-outline-variant/20 bg-white/90 p-5 shadow-sm backdrop-blur-md w-82">
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

      {assigned ? (
        vm.canCancel ? (
          <button
            type="button"
            disabled={confirmLoading}
            onClick={() => onCancel?.(seat)}
            className="mt-7 inline-flex h-12 w-full items-center justify-center gap-2 rounded-md border border-rose-300 bg-rose-50 px-4 text-sm font-bold text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Check className="h-4 w-4" />
            {confirmLoading ? 'Dang xu ly...' : 'Cancel seat'}
          </button>
        ) : (
          <div className="mt-7 flex h-12 w-full items-center justify-center gap-2 rounded-md border border-slate-400/30 bg-slate-100/90 text-sm font-bold text-slate-800">
            <Check className="h-4 w-4" />
            Ghe da duoc giao
          </div>
        )
      ) : (
        <button
          type="button"
          disabled={!vm.canSelect || confirmLoading}
          onClick={() => onConfirm?.(seat)}
          className="auth-primary-btn mt-7 inline-flex h-12 w-full items-center justify-center gap-2 rounded-md px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Check className="h-4 w-4" />
          {confirmLoading ? 'Dang xu ly...' : 'Select seat'}
        </button>
      )}
      <button
        type="button"
        onClick={onClose}
        disabled={confirmLoading}
        className="mt-3 inline-flex h-12 w-full items-center justify-center gap-2 rounded-md border border-slate-400/30 bg-slate-100/90 text-sm font-bold text-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Back to overview
      </button>
    </div>
  );
}

function CompactSelectionBar({
  seatMap,
  seat,
  onConfirm,
  onCancel,
  assigned,
  confirmLoading = false,
}: {
  seatMap: SeatMapResponse;
  seat: SeatMapCell;
  onConfirm?: (seat: SeatMapCell) => void;
  onCancel?: (seat: SeatMapCell) => void;
  assigned: AssignedSeatMeta | null;
  confirmLoading?: boolean;
}) {
  const vm = getSeatDetailViewModel(
    seat,
    seatMap.policyDisplay,
    seatMap.seatSelectionPolicy,
    assigned
  );

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

      {assigned ? (
        vm.canCancel ? (
          <button
            type="button"
            disabled={confirmLoading}
            onClick={() => onCancel?.(seat)}
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-md border border-rose-300 bg-rose-50 px-5 text-sm font-bold text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Check className="h-4 w-4" />
            {confirmLoading ? 'Dang xu ly...' : 'Cancel seat'}
          </button>
        ) : (
          <div className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-md border border-slate-400/30 bg-slate-100/90 px-5 text-sm font-bold text-slate-800">
            <Check className="h-4 w-4" />
            Đã chọn
          </div>
        )
      ) : (
        <button
          type="button"
          disabled={!vm.canSelect || confirmLoading}
          onClick={() => onConfirm?.(seat)}
          className="auth-primary-btn inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-md px-5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Check className="h-4 w-4" />
          {confirmLoading ? 'Dang xu ly...' : 'Select seat'}
        </button>
      )}
    </div>
  );
}

function LegendSwatch({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-xs font-semibold text-on-surface">
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
  headerSubtitle = null,
  assignedSeatBySeatId = null,
  seatConfirmLoading = false,
  showDetailPanel = true,
  showSeatLegend = true,
  onSeatPreview,
  onSeatConfirm,
  onSeatCancel,
  onClose,
}: AircraftSeatsMapProps) {
  const columns = seatMap?.layout.columns ?? [];
  const aisleAfter = new Set(seatMap?.layout.aisleAfterColumns ?? []);
  const zones = seatMap?.layout.seatClassZones ?? [];
  const activeSeatCell = findSeatCellById(seatMap, selectedSeat?.seatId);
  const activePanelAssigned =
    activeSeatCell && assignedSeatBySeatId
      ? (assignedSeatBySeatId.get(activeSeatCell.seatId) ?? null)
      : null;
  const containerClassName = showDetailPanel
    ? 'grid gap-4 rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-4 shadow-sm sm:p-5 xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-start'
    : 'grid gap-4 rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-4 shadow-sm sm:p-5';

  return (
    <div className={containerClassName}>
      <div className="flex min-w-0 flex-col gap-4">
        <div>
          <h1 className="mb-2 flex items-center gap-2 font-headline text-xl font-black text-midnight-burgundy">
            <List className="h-5 w-5" />
            Chọn ghế
          </h1>
          <p className="text-sm text-on-surface-variant">
            {headerSubtitle ??
              (seatMap ? `${seatMap.fareCode} seat map` : 'Chọn ghế phù hợp theo điều kiện hạng vé của bạn.')}
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
          <div className="flex min-h-[24rem] flex-col items-center justify-center rounded-xl border border-outline-variant/20 bg-surface-container-low px-4 py-10 text-center text-sm text-on-surface-variant">
            <Loader2 className="h-8 w-8 animate-spin text-midnight-burgundy mb-3" />
            Đang tải sơ đồ chỗ ngồi...
          </div>
        ) : null}

        {!loading && error ? (
          <div className="rounded-xl border border-error/30 bg-error/5 px-4 py-4 text-sm text-error">
            {error}
          </div>
        ) : null}

        {!loading && !error && !seatMap ? (
          <div className="rounded-xl border border-outline-variant/20 bg-surface-container-low px-4 py-10 text-center text-sm text-on-surface-variant">
            Không tìm thấy flightId hoặc fareId trong store để tải sơ đồ ghế.
          </div>
        ) : null}

        {!loading && !error && seatMap ? (
          <>
            {showSeatLegend ? (
              <div className="rounded-xl border border-luxury-gold/10 bg-white/60 p-3.5 shadow-sm">
                <div className="grid gap-4 text-sm lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                  <div>
                    <p className="mb-2 text-xs font-black uppercase tracking-[0.16em] text-on-surface-variant">
                      Trạng thái ghế
                    </p>
                    <div className="flex flex-wrap gap-4">
                      <LegendSwatch className="border-emerald-300 bg-emerald-50" label="Có thể chọn" />
                      <LegendSwatch
                        className="border-outline-variant/30 bg-surface-container-high"
                        label="Không khả dụng"
                      />
                      <LegendSwatch className="border-rose-200 bg-rose-50" label="Không được phép" />
                      <LegendSwatch className="border-slate-500 bg-slate-200" label="Ghế của bạn" />
                    </div>
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-black uppercase tracking-[0.16em] text-on-surface-variant">
                      Mức giá
                    </p>
                    <div className="flex flex-wrap gap-4">
                      <LegendSwatch className="border-emerald-300 bg-emerald-50" label="Miễn phí" />
                      <LegendSwatch className="border-amber-300 bg-amber-50" label="Có phí" />
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="grid gap-5">
              <div className="min-w-0 space-y-6">
                {zones.map((zone) => {
                  const rows = seatMap.rows.filter(
                    (row) => row.rowNumber >= zone.rowStart && row.rowNumber <= zone.rowEnd
                  );
                  if (rows.length === 0) return null;
                  const gridTemplateColumns = buildSeatGridTemplate(columns, aisleAfter);
                  return (
                    <section key={`${zone.seatClass}-${zone.rowStart}-${zone.rowEnd}`}>
                      <div className="mb-3">
                        <h2 className="text-sm font-black uppercase tracking-widest text-midnight-burgundy">
                          {seatClassLabel(zone.seatClass)} (Rows {zone.rowStart}-{zone.rowEnd})
                        </h2>
                      </div>

                      <div className="overflow-x-auto pb-4 pr-2">
                        <div className="min-w-max space-y-2.5 pr-5">
                          <div
                            className="grid items-center gap-2"
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
                                  'flex h-7 w-[88px] items-center justify-center'
                                ),
                              ];
                              if (aisleAfter.has(column)) {
                                headerCells.push(
                                  renderSeatCell(
                                    `header-aisle-${zone.seatClass}-${column}`,
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/70">
                                      Aisle
                                    </span>,
                                    'flex h-7 w-[28px] items-center justify-center'
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
                                className="grid items-center gap-2"
                                style={{ gridTemplateColumns }}
                              >
                                <div className="pr-2 text-right text-xs font-bold text-on-surface-variant">
                                  Row {row.rowNumber}
                                </div>
                                {columns.flatMap((column) => {
                                  const seat = cellByColumn.get(column);
                                  const parts: ReactElement[] = [];
                                  if (seat) {
                                    const assignedMeta =
                                      assignedSeatBySeatId?.get(seat.seatId) ?? null;
                                    const isSelected = selectedSeat?.seatId === seat.seatId;
                                    const viewModel = getSeatCellViewModel(
                                      seat,
                                      isSelected,
                                      assignedMeta
                                    );
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
                                            isAssigned: assignedMeta != null,
                                            onSelect: (nextSeat) =>
                                              nextSeat
                                                ? onSeatPreview?.(buildSelection(nextSeat))
                                                : null,
                                          });
                                        }}
                                        className={`flex h-[4.75rem] w-[88px] flex-col items-start justify-between overflow-hidden rounded-lg border px-2.5 py-2 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${getSeatClasses(
                                          viewModel.appearance
                                        )}`}
                                      >
                                        <span className="text-sm font-black leading-4">
                                          {viewModel.title}
                                        </span>
                                        <span className="block max-w-full truncate text-[0.625rem] font-black leading-3">
                                          {viewModel.subtitle}
                                        </span>
                                      </button>
                                    );
                                  } else {
                                    parts.push(
                                      <div
                                        key={`empty-${row.rowNumber}-${column}`}
                                        className="h-[4.75rem] w-[88px] rounded-lg border border-dashed border-outline-variant/10 bg-transparent"
                                      />
                                    );
                                  }
                                  if (aisleAfter.has(column)) {
                                    parts.push(
                                      <div
                                        key={`aisle-${row.rowNumber}-${column}`}
                                        className="flex h-[4.75rem] w-[28px] items-center justify-center"
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
                  assigned={activePanelAssigned}
                  confirmLoading={seatConfirmLoading}
                  onConfirm={(seat) => onSeatConfirm?.(buildSelection(seat))}
                  onCancel={(seat) => onSeatCancel?.(buildSelection(seat))}
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

      {seatMap && showDetailPanel ? (
        <aside className="hidden xl:min-w-0 xl:block">
          <div className="sticky top-28">
            <DetailPanel
              seatMap={seatMap}
              seat={activeSeatCell}
              assigned={activePanelAssigned}
              confirmLoading={seatConfirmLoading}
              onConfirm={(seat) => onSeatConfirm?.(buildSelection(seat))}
              onCancel={(seat) => onSeatCancel?.(buildSelection(seat))}
              onClose={onClose}
            />
          </div>
        </aside>
      ) : null}
    </div>
  );
}
