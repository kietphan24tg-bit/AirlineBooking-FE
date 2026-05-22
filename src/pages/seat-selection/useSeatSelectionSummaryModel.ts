import { useMemo } from 'react';
import type {
  BookingLookupResponse,
  BookingManageOptionsResponse,
} from '../../types/booking.types';
import type { SeatMapCell } from '../../types/flight.types';
import type { BookingPersistedDraft, BookingSession } from '../../stores/useBookingStore';
import type { PassengerLike, ResolvedSeatAssignment, SeatContext } from './seatSelectionResolvers';
import { pickNumericId, resolveStorePassengerId } from './seatSelectionResolvers';

function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount.toLocaleString('vi-VN')} ${currency}`;
  }
}

function formatItineraryRouteLabel(itinerary: {
  departureCity: string;
  departureAirportCode: string;
  arrivalCity: string;
  arrivalAirportCode: string;
}): string {
  return `${itinerary.departureCity} (${itinerary.departureAirportCode})  ->  ${itinerary.arrivalCity} (${itinerary.arrivalAirportCode})`;
}

function formatItineraryMetaLabel(itinerary: {
  departureTime: string;
  arrivalTime: string;
  flightNumber: string;
  cabinClass: string | null;
}): string {
  const departureDate = new Date(itinerary.departureTime);
  const arrivalDate = new Date(itinerary.arrivalTime);
  const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const weekday = Number.isFinite(departureDate.getTime())
    ? weekdayLabels[departureDate.getDay()]
    : '--';
  const dateLabel = Number.isFinite(departureDate.getTime())
    ? `${String(departureDate.getDate()).padStart(2, '0')}/${String(
        departureDate.getMonth() + 1
      ).padStart(2, '0')}/${departureDate.getFullYear()}`
    : '--/--/----';
  const departureTimeLabel = Number.isFinite(departureDate.getTime())
    ? departureDate.toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
    : '--:--';
  const arrivalTimeLabel = Number.isFinite(arrivalDate.getTime())
    ? arrivalDate.toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
    : '--:--';
  const cabinLabel =
    itinerary.cabinClass?.trim().toUpperCase() === 'ECONOMY'
      ? 'Eco'
      : (itinerary.cabinClass?.trim() ?? '--');

  return `${weekday}, ${dateLabel} | ${departureTimeLabel} - ${arrivalTimeLabel} | ${itinerary.flightNumber} | ${cabinLabel}`;
}

function buildSummaryHeaderFromRawBooking(
  bookingResponse: BookingSession | null,
  seatContext: SeatContext
): { itineraryLabel: string | null; flightMetaLabel: string | null } {
  const rawFlight =
    bookingResponse?.raw?.flight && typeof bookingResponse.raw.flight === 'object'
      ? (bookingResponse.raw.flight as Record<string, unknown>)
      : null;
  const rawFare =
    bookingResponse?.raw?.fare && typeof bookingResponse.raw.fare === 'object'
      ? (bookingResponse.raw.fare as Record<string, unknown>)
      : null;
  const departure =
    rawFlight?.departure && typeof rawFlight.departure === 'object'
      ? (rawFlight.departure as Record<string, unknown>)
      : null;
  const arrival =
    rawFlight?.arrival && typeof rawFlight.arrival === 'object'
      ? (rawFlight.arrival as Record<string, unknown>)
      : null;

  const departureCity = typeof departure?.city === 'string' ? departure.city : null;
  const departureCode =
    typeof departure?.airportCode === 'string'
      ? departure.airportCode
      : typeof departure?.code === 'string'
        ? departure.code
        : null;
  const arrivalCity = typeof arrival?.city === 'string' ? arrival.city : null;
  const arrivalCode =
    typeof arrival?.airportCode === 'string'
      ? arrival.airportCode
      : typeof arrival?.code === 'string'
        ? arrival.code
        : null;
  const departureTime = typeof departure?.time === 'string' ? departure.time : null;
  const arrivalTime = typeof arrival?.time === 'string' ? arrival.time : null;
  const flightNumber = typeof rawFlight?.flightNumber === 'string' ? rawFlight.flightNumber : null;
  const cabinClass =
    typeof rawFare?.cabinClass === 'string'
      ? rawFare.cabinClass
      : typeof rawFare?.name === 'string'
        ? rawFare.name
        : seatContext.fareCode;

  const itineraryLabel =
    departureCity && departureCode && arrivalCity && arrivalCode
      ? `${departureCity} (${departureCode})  ->  ${arrivalCity} (${arrivalCode})`
      : null;

  let flightMetaLabel: string | null = null;
  if (departureTime && arrivalTime && flightNumber) {
    flightMetaLabel = formatItineraryMetaLabel({
      departureTime,
      arrivalTime,
      flightNumber,
      cabinClass: cabinClass ?? null,
    });
  } else if (flightNumber) {
    flightMetaLabel = `${flightNumber} | ${cabinClass ?? '--'}`;
  }

  return {
    itineraryLabel,
    flightMetaLabel:
      flightMetaLabel ??
      `Flight #${seatContext.flightId ?? '--'}${seatContext.fareCode ? ` | ${seatContext.fareCode}` : ''}`,
  };
}

function findSeatCellById(
  rows: { cells: SeatMapCell[] }[] | undefined,
  seatId: number | null
): SeatMapCell | null {
  if (!rows?.length || !seatId) return null;
  for (const row of rows) {
    const seat = row.cells.find((cell) => cell.seatId === seatId);
    if (seat) return seat;
  }
  return null;
}

type SummaryPassengerItem = {
  passengerId: number | null;
  fullName: string;
  passengerType: string | null;
};

type SummarySeatItem = {
  passengerId: number;
  passengerName: string;
  seatNumber: string;
  seatTypeLabel: string | null;
  seatCategoryLabel: string | null;
  surchargeAmount: number;
  currency: string;
  surchargeLabel: string;
};

type SummaryServiceItem = {
  passengerId: number;
  passengerName: string;
  serviceName: string;
  optionName: string;
  quantity: number;
  totalPriceLabel: string;
};

type SummaryTripSegment = {
  direction: 'OUTBOUND' | 'INBOUND' | null;
  itineraryLabel: string | null;
  flightMetaLabel: string | null;
};

function buildFallbackTripSegments(
  bookingDraft: BookingPersistedDraft,
  bookingResponse: BookingSession | null
): SummaryTripSegment[] {
  const raw = bookingResponse?.raw as Record<string, unknown> | undefined;
  const rawSegments = Array.isArray(raw?.segments)
    ? (raw.segments as Record<string, unknown>[])
    : [];

  if (rawSegments.length > 0) {
    const mapped = rawSegments
      .map((segment) => {
        const directionRaw = String(segment.direction ?? '')
          .trim()
          .toUpperCase();
        const direction =
          directionRaw === 'OUTBOUND' || directionRaw === 'INBOUND' ? directionRaw : null;
        const itineraryLabel =
          typeof segment.departureCity === 'string' &&
          typeof segment.departureAirportCode === 'string' &&
          typeof segment.arrivalCity === 'string' &&
          typeof segment.arrivalAirportCode === 'string'
            ? `${segment.departureCity} (${segment.departureAirportCode})  ->  ${segment.arrivalCity} (${segment.arrivalAirportCode})`
            : null;
        const flightMetaLabel =
          typeof segment.flightNumber === 'string'
            ? `${segment.flightNumber}${typeof segment.fareCode === 'string' ? ` | ${segment.fareCode}` : ''}`
            : typeof segment.flightId === 'number'
              ? `Flight #${segment.flightId}${typeof segment.fareCode === 'string' ? ` | ${segment.fareCode}` : ''}`
              : null;
        return {
          direction: direction as SummaryTripSegment['direction'],
          itineraryLabel,
          flightMetaLabel,
        };
      })
      .filter((segment) => segment.itineraryLabel || segment.flightMetaLabel);
    if (mapped.length > 0) return mapped;
  }

  return bookingDraft.segments.map((segment) => ({
    direction: segment.direction,
    itineraryLabel: segment.direction === 'OUTBOUND' ? 'Outbound flight' : 'Return flight',
    flightMetaLabel: `Flight #${segment.flightId}${segment.fareCode ? ` | ${segment.fareCode}` : ''}`,
  }));
}

export function useSeatSelectionSummaryModel(params: {
  bookingDraft: BookingPersistedDraft;
  bookingResponse: BookingSession | null;
  bookingLookup: BookingLookupResponse | null;
  manageOptions: BookingManageOptionsResponse | null;
  passengers: Array<{ fullName: string }>;
  passengerSource: PassengerLike[];
  seatContext: SeatContext;
  seatMapRows: { cells: SeatMapCell[] }[] | undefined;
  confirmedSeatAssignments: ResolvedSeatAssignment[];
  serviceCurrency: string;
}) {
  const {
    bookingDraft,
    bookingLookup,
    bookingResponse,
    manageOptions,
    passengerSource,
    passengers,
    seatContext,
    seatMapRows,
    confirmedSeatAssignments,
    serviceCurrency,
  } = params;

  const pricing = bookingResponse?.pricing ?? bookingDraft.pricing;
  const totalPriceLabel = useMemo(
    () =>
      pricing
        ? formatMoney(pricing.discountedTotalPrice, pricing.currency || 'VND')
        : manageOptions && bookingLookup
          ? formatMoney(
              bookingLookup.booking.totalAmount,
              bookingLookup.booking.currency || manageOptions.currency
            )
          : null,
    [bookingLookup, manageOptions, pricing]
  );

  const summaryHeader = useMemo(() => {
    const summaryItinerary = manageOptions?.itineraries?.[0] ?? null;
    return summaryItinerary
      ? {
          itineraryLabel: formatItineraryRouteLabel(summaryItinerary),
          flightMetaLabel: formatItineraryMetaLabel(summaryItinerary),
        }
      : buildSummaryHeaderFromRawBooking(bookingResponse, seatContext);
  }, [bookingResponse, manageOptions, seatContext]);

  const summaryTripSegments = useMemo<SummaryTripSegment[]>(() => {
    if (manageOptions?.itineraries?.length) {
      return manageOptions.itineraries.map((itinerary, index) => {
        const journeyType = String(itinerary.journeyType ?? '')
          .trim()
          .toUpperCase();
        const direction =
          journeyType === 'OUTBOUND'
            ? 'OUTBOUND'
            : journeyType === 'INBOUND'
              ? 'INBOUND'
              : index === 0
                ? 'OUTBOUND'
                : 'INBOUND';
        return {
          direction,
          itineraryLabel: formatItineraryRouteLabel(itinerary),
          flightMetaLabel: formatItineraryMetaLabel(itinerary),
        };
      });
    }

    const fallbackSegments = buildFallbackTripSegments(bookingDraft, bookingResponse);
    if (fallbackSegments.length > 0) return fallbackSegments;

    return [
      {
        direction: null,
        itineraryLabel: summaryHeader.itineraryLabel,
        flightMetaLabel: summaryHeader.flightMetaLabel,
      },
    ].filter((segment) => segment.itineraryLabel || segment.flightMetaLabel);
  }, [bookingDraft, bookingResponse, manageOptions?.itineraries, summaryHeader]);

  const summaryPassengerItems = useMemo<SummaryPassengerItem[]>(
    () =>
      passengers.map((passenger, index) => ({
        passengerId: resolveStorePassengerId(passengerSource[index]),
        fullName: passenger.fullName,
        passengerType:
          passengerSource[index] &&
          typeof passengerSource[index] === 'object' &&
          'passengerType' in passengerSource[index]
            ? String(passengerSource[index].passengerType ?? '')
            : null,
      })),
    [passengerSource, passengers]
  );

  const summaryFareAmountLabel =
    pricing != null
      ? formatMoney(
          Math.max(0, (pricing.baseFare ?? 0) - (pricing.discountAmount ?? 0)),
          pricing.currency || 'VND'
        )
      : null;
  const summaryDiscountAmountLabel =
    pricing != null && (pricing.discountAmount ?? 0) > 0
      ? formatMoney(pricing.discountAmount, pricing.currency || 'VND')
      : null;
  const summaryTaxFeeItems = pricing
    ? [
        { label: 'Taxes', value: formatMoney(pricing.taxes, pricing.currency || 'VND') },
        { label: 'Fees', value: formatMoney(pricing.fees, pricing.currency || 'VND') },
      ]
    : [];
  const summaryTaxFeeTotalLabel =
    pricing != null
      ? formatMoney((pricing.taxes ?? 0) + (pricing.fees ?? 0), pricing.currency || 'VND')
      : null;

  const summarySeatItems = useMemo<SummarySeatItem[]>(
    () =>
      confirmedSeatAssignments
        .map((assignment) => {
          const passengerId = pickNumericId(assignment.passengerId);
          const seatId = pickNumericId(assignment.seatId);
          if (passengerId == null || seatId == null) return null;
          const seatCell = findSeatCellById(seatMapRows, seatId);
          const passengerName =
            summaryPassengerItems.find((item) => item.passengerId === passengerId)?.fullName ??
            `Passenger ${passengerId}`;
          const seatNumber = seatCell?.seatNumber ?? assignment.seatNumber ?? `Seat ${seatId}`;
          const currency =
            assignment.currency || pricing?.currency || manageOptions?.currency || 'VND';

          return {
            passengerId,
            passengerName,
            seatNumber,
            seatTypeLabel: seatCell?.seatTypeDisplay?.label ?? null,
            seatCategoryLabel: seatCell?.seatCategoryDisplay?.label ?? null,
            surchargeAmount: assignment.surchargeAmount ?? 0,
            currency,
            surchargeLabel: formatMoney(assignment.surchargeAmount ?? 0, currency),
          };
        })
        .filter((item): item is SummarySeatItem => item != null),
    [
      confirmedSeatAssignments,
      manageOptions?.currency,
      pricing?.currency,
      seatMapRows,
      summaryPassengerItems,
    ]
  );

  const summarySeatTotalLabel =
    summarySeatItems.length > 0
      ? formatMoney(
          summarySeatItems.reduce((total, seat) => total + seat.surchargeAmount, 0),
          summarySeatItems[0]?.currency ?? pricing?.currency ?? manageOptions?.currency ?? 'VND'
        )
      : null;

  const summaryServiceItems = useMemo<SummaryServiceItem[]>(() => {
    const next: SummaryServiceItem[] = [];
    const confirmedServiceEntries = Object.entries(
      bookingResponse?.confirmedServicesByPassengerId ?? {}
    );

    if (confirmedServiceEntries.length > 0) {
      for (const [passengerIdText, selections] of confirmedServiceEntries) {
        const passengerId = Number(passengerIdText);
        if (!Number.isFinite(passengerId)) continue;
        const passengerName =
          summaryPassengerItems.find((item) => item.passengerId === passengerId)?.fullName ??
          `Passenger ${passengerId}`;

        for (const selection of selections) {
          next.push({
            passengerId,
            passengerName,
            serviceName: selection.serviceName,
            optionName: selection.optionName,
            quantity:
              Number.isFinite(selection.quantity) && selection.quantity > 0
                ? selection.quantity
                : 1,
            totalPriceLabel: formatMoney(
              selection.price *
                (Number.isFinite(selection.quantity) && selection.quantity > 0
                  ? selection.quantity
                  : 1),
              serviceCurrency
            ),
          });
        }
      }

      return next;
    }

    for (const selection of manageOptions?.serviceSelections ?? []) {
      const passengerId = pickNumericId(selection.passengerId);
      if (passengerId == null || (selection.optionId ?? 0) <= 0) continue;
      const quantity =
        Number.isFinite(selection.quantity) && selection.quantity > 0 ? selection.quantity : 1;
      const passengerName =
        summaryPassengerItems.find((item) => item.passengerId === passengerId)?.fullName ??
        `Passenger ${passengerId}`;
      next.push({
        passengerId,
        passengerName,
        serviceName: selection.serviceName ?? 'Additional service',
        optionName: selection.optionName ?? `Option ${selection.optionId}`,
        quantity,
        totalPriceLabel: formatMoney(
          selection.price * quantity,
          manageOptions?.currency ?? serviceCurrency
        ),
      });
    }

    return next;
  }, [
    bookingResponse?.confirmedServicesByPassengerId,
    manageOptions?.currency,
    manageOptions?.serviceSelections,
    serviceCurrency,
    summaryPassengerItems,
  ]);

  const summaryServiceTotalAmount = useMemo(
    () =>
      summaryServiceItems.reduce((total, item) => {
        const match = item.totalPriceLabel.replace(/[^\d]/g, '');
        const numeric = Number(match);
        return total + (Number.isFinite(numeric) ? numeric : 0);
      }, 0),
    [summaryServiceItems]
  );

  const summaryServiceTotalLabel =
    summaryServiceItems.length > 0 ? formatMoney(summaryServiceTotalAmount, serviceCurrency) : null;

  return {
    pricing,
    totalPriceLabel,
    summaryHeader,
    summaryTripSegments,
    summaryPassengerItems,
    summaryFareAmountLabel,
    summaryDiscountAmountLabel,
    summaryTaxFeeItems,
    summaryTaxFeeTotalLabel,
    summarySeatItems,
    summarySeatTotalLabel,
    summaryServiceItems,
    summaryServiceTotalLabel,
  };
}
