import api from '../api/axios';

export interface Airport {
  id: number;
  code: string;
  name: string;
  city: string;
}

export const airportService = {
  fetchAirports: async (): Promise<Airport[]> => {
    const { data } = await api.get<{ data: Record<string, Airport[]> }>('/api/airports');
    return Object.values(data.data).flat() as Airport[];
  },
};
