import api from '../api/axios';
import { FARE_FAMILY_POLICIES } from '../data/fareBenefits';
import type { FareFamilyCatalogResponseDto, FareFamilyDto } from '../types/fareFamily.types';

type BusinessClassSummaryOptions = {
  countryCode?: string;
  currency?: string;
  signal?: AbortSignal;
};

const USE_MOCK_BUSINESS_CLASS = import.meta.env.VITE_MOCK_BUSINESS_CLASS !== 'false';

function unwrapData(body: unknown): unknown {
  if (!body || typeof body !== 'object') return body;
  const record = body as Record<string, unknown>;
  if ('data' in record && record.data != null) return record.data;
  return body;
}

function normalizeFareFamilies(raw: unknown): FareFamilyDto[] {
  const body = unwrapData(raw);
  if (!Array.isArray(body)) return [];
  return body.filter((item): item is FareFamilyDto => !!item && typeof item === 'object');
}

function getMockBusinessFare(): FareFamilyDto {
  return (
    FARE_FAMILY_POLICIES.find((fare) => fare.fareClassCode === 'BUSINESS') ??
    FARE_FAMILY_POLICIES[0]
  );
}

export async function getBusinessClassSummary(
  options?: BusinessClassSummaryOptions
): Promise<FareFamilyDto> {
  if (USE_MOCK_BUSINESS_CLASS) {
    return getMockBusinessFare();
  }

  try {
    const response = await api.get<FareFamilyCatalogResponseDto | FareFamilyDto[]>(
      '/api/flights/fare-families',
      {
        params: {
          countryCode: options?.countryCode,
          currency: options?.currency,
        },
        signal: options?.signal,
      }
    );
    const businessFare = normalizeFareFamilies(response.data).find(
      (fare) => fare.fareClassCode === 'BUSINESS'
    );
    return businessFare ?? getMockBusinessFare();
  } catch {
    return getMockBusinessFare();
  }
}

export const experienceService = {
  getBusinessClassSummary,
};
