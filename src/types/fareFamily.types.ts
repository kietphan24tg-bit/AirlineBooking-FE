export interface FareFamilyReferencePriceDto {
  amount: number;
  currency: string;
  countryCode: string;
}

export interface FareFamilyDto {
  fareClassId: number;
  fareClassCode: string;
  fareClassName: string;
  cabinClass: string;
  baggageCheckinKg: number;
  baggageHandKg: number;
  changeFee: number;
  refundFee: number;
  refundable: boolean;
  changeable: boolean;
  priorityCheckin: boolean;
  priorityBoarding: boolean;
  mileageRate: number;
  loungeAccess: boolean;
  seatSelection: boolean;
  seatSelectionPolicy: 'NOT_ALLOWED' | 'PAID' | 'INCLUDED' | 'CHECKIN_ONLY';
  mealType: 'NONE' | 'STANDARD' | 'PREMIUM' | 'GOURMET';
  wifiIncluded: boolean;
  fastTrackSecurity: boolean;
  includedSeatCategoryCode?: string | null;
  referencePrice?: FareFamilyReferencePriceDto | null;
}

export interface FareFamilyCatalogResponseDto {
  data: FareFamilyDto[];
}
