import { TicketsPlaneIcon } from 'lucide-react';

export interface TicketCardProps {
  passengerName: string;
  from?: string;
  to?: string;
  airline?: string;
  flightNumber?: string;
  date?: string;
  time?: string;
  gate?: string;
  seat?: string;
  bookingCode?: string;
}

export function TicketCard({
  passengerName,
  from,
  to,
  airline,
  flightNumber,
  date,
  time,
  gate,
  seat,
  bookingCode,
}: TicketCardProps) {
  return (
    <div className="flex flex-col h-65 w-full bg-luxury-gold/5 rounded-xl overflow-hidden">
      <div className="col-span-3 h-15 bg-midnight-burgundy flex flex-col justify-center">
        <p className="text-luxury-gold text-4xl font-bold pl-5">TICKET</p>
      </div>
      <div className="grid grid-cols-3 flex-1">
        <div className="flex flex-row justify-between col-span-2 pl-5 pb-3 pt-3">
          <TicketsPlaneIcon className="fixed w-50 h-40 opacity-6 stroke-luxury-gold" />
          <div className="flex flex-col justify-between">
            <div>
              <p>Hành khách: </p>
              <p className="text-2xl font-bold mb-3">{passengerName}</p>
            </div>
            <div>
              <div className="flex flex-row items-center">
                <p className="text-xl font-bold mr-2">Từ:</p>
                <p>{from ?? '—'}</p>
              </div>
              <div className="flex flex-row items-center">
                <p className="text-xl font-bold mr-2">Đến:</p>
                <p>{to ?? '—'}</p>
              </div>
            </div>
          </div>
          <div className="flex flex-row gap-5 w-80 self-center">
            <div className="flex flex-col items-start justify-between">
              <div className="flex flex-col justify-items-start">
                <p className="font-bold">Airline</p>
                <p>{airline ?? '—'}</p>
              </div>
              <div className="flex flex-col justify-items-start">
                <p className="font-bold">FLIGHT</p>
                <p>{flightNumber ?? '—'}</p>
              </div>
            </div>
            <div className="flex flex-col items-start justify-between">
              <div className="flex flex-col justify-items-start">
                <p className="font-bold">DATE</p>
                <p>{date ?? '—'}</p>
              </div>
              <div className="flex flex-col justify-items-start">
                <p className="font-bold">TIME</p>
                <p>{time ?? '—'}</p>
              </div>
            </div>
            <div className="flex flex-col items-start justify-between">
              <div className="flex flex-col justify-items-start">
                <p className="font-bold">GATE</p>
                <p>{gate ?? '—'}</p>
              </div>
              <div className="flex flex-col justify-items-start">
                <p className="font-bold">SEAT</p>
                <p>{seat ?? '—'}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="border-l flex flex-col justify-between items-center pb-3 pt-3">
          <div>
            <img
              alt=""
              src="https://cdn.pixabay.com/photo/2023/02/28/01/50/qr-code-7819652_1280.jpg"
              className="w-35 rounded-2xl"
            />
          </div>
          <p>{bookingCode ?? '—'}</p>
        </div>
      </div>
    </div>
  );
}
