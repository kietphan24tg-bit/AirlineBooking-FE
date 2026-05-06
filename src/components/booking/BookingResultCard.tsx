import { TripRecord, PassengerProfile, PassengerBookingDetails } from '../../types/booking.types';
import {
  Plane,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  SquareCheckBig,
  PlaneTakeoff,
  CircleX,
} from 'lucide-react';
import { useState } from 'react';

export interface BookingResultCardProps {
  trip: TripRecord;
  passenger: PassengerProfile;
}
const mock_passenger: PassengerBookingDetails = {
  firstName: 'Vu',
  lastName: 'Hoang Kim',
  dateOfBirth: '12/1/2002',
  gender: 'Nam',
  nationality: 'Vietnam',
  passengerType: 'ADULT',
  identifyType: 'ID_CARD',
  identifyNumber: '1029381239',
  expiryDate: '',
  email: 'lmao@gmail.com',
  phone: '0123123123',
};

function PassengerCard({ passenger }: { passenger: PassengerBookingDetails }) {
  const [detail, setDetail] = useState(false);
  return (
    <div className="flex flex-col border rounded-md border-cabin-silver p-3">
      <button
        className="flex flex-row items-center w-full justify-between"
        onClick={() => setDetail(!detail)}
      >
        <div className="flex flex-row items-center gap-x-10">
          <p className="uppercase font-bold">
            {passenger.firstName} {passenger.lastName}
          </p>
          <p className="text-[10pt]">Giới tính: {passenger.gender}</p>
          <p className="text-[10pt]">Type: {passenger.passengerType}</p>
        </div>

        {!detail && (
          <div className="flex flex-row items-center">
            <p>Chi tiết</p> <ChevronDown />
          </div>
        )}
        {detail && (
          <div className="flex flex-row items-center">
            <p>Ẩn</p> <ChevronUp />
          </div>
        )}
      </button>
      {detail && (
        <div className="flex flex-row justify-between border-t border-t-gray-200 mt-2 pt-2">
          <p className="text-[10pt]">
            {passenger.identifyType}:<br />
            <p className="font-bold text-lg">{passenger.identifyNumber}</p>
          </p>
          <p className="text-[10pt]">
            Quốc tịch:
            <br />
            <p className="font-bold text-lg">{passenger.nationality}</p>
          </p>
          <p className="text-[10pt]">
            Điện thoại:
            <br />
            <p className="font-bold text-lg">{passenger.phone || '-'}</p>
          </p>
          <p className="text-[10pt]">
            Ngày sinh:
            <br />
            <p className="font-bold text-lg">{passenger.dateOfBirth}</p>
          </p>
          <p className="text-[10pt]">
            Email:
            <br />
            <p className="font-bold text-lg">{passenger.email || '-'}</p>
          </p>
        </div>
      )}
    </div>
  );
}

export default function BookingResultCard({ trip }: BookingResultCardProps) {
  return (
    <div className=" flex flex-row overflow-hidden bg-surface-container-lowest/90 gap-4">
      <div className="flex flex-1 flex-col gap-4">
        <div className="flex flex-row items-center justify-between bg-white rounded-xl p-7">
          <div className="text left">
            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
              Status
            </p>
            <h1
              className={`text-lg font-bold ${
                trip.status === 'completed'
                  ? 'text-green-600'
                  : trip.status === 'cancelled'
                    ? 'text-red-600'
                    : trip.status === 'confirmed'
                      ? 'text-yellow-600'
                      : 'text-on-surface'
              }`}
            >
              {trip.status === 'completed'
                ? 'Completed'
                : trip.status === 'cancelled'
                  ? 'Cancelled'
                  : trip.status === 'confirmed'
                    ? 'Confirmed'
                    : 'Pending'}
            </h1>
          </div>

          <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
              Booking Code
            </p>
            <h1 className="text-lg font-bold text-on-surface">{trip.id}</h1>
          </div>
        </div>

        <div className="flex flex-col bg-white rounded-xl p-7">
          <p className="text-sm font-bold text-on-surface-variant">Thông tin chuyến bay</p>
          <div className="flex flex-row mb-5">
            <div className="w-40 justify-center flex flex-col items-center">
              <div className="flex justify-center items-center bg-secondary-fixed w-23 rounded-sm">
                Chuyến đi
              </div>
              <p className="text-xs text-on-surface-variant">Date</p>
              <p className="font-bold text-on-surface">23/3/2026</p>
            </div>

            <div className="flex flex-row flex-1 border-l border-r border-gray-100 justify-between">
              <div className="flex flex-col p-3 text-left w-40">
                <p className="text-md font-bold text-on-surface">08:30</p>
                <p>SGN</p>
                <p className="text-[9pt] text-gray-500">TP. Hồ Chí Minh</p>
              </div>

              <div className="flex flex-col p-3 items-center justify-center">
                <p>VJ123</p>
                <div className="flex flex-row justify-center items-center">
                  <div className="w-30 border-t-2 border-dashed border-gray-400" />
                  <Plane className="rotate-45 stroke-midnight-burgundy fill-luxury-gold" />
                  <div className="w-30 border-t-2 border-dashed border-gray-400" />
                </div>
              </div>

              <div className="flex flex-col p-3 text-right w-40">
                <p className="text-md font-bold text-on-surface">10:30</p>
                <p>HAN</p>
                <p className="text-[9pt] text-gray-500">Hà Nội</p>
              </div>
            </div>

            <div className="flex flex-col items-start justify-center w-50 pl-3">
              <p>Hạng vé: Economy</p>
              <p>Tình trạng: Completed</p>
            </div>
          </div>

          <div className="border-t border-gray-100 mb-5" />

          <div className="flex flex-row">
            <div className="w-40  justify-center flex flex-col items-center">
              <div className="flex justify-center items-center bg-secondary-fixed w-23 rounded-sm">
                Chuyến về
              </div>
              <p className="text-xs text-on-surface-variant">Date</p>
              <p className="font-bold text-on-surface">1/4/2026</p>
            </div>

            <div className="flex flex-row flex-1 border-l border-r border-gray-100 justify-between">
              <div className="flex flex-col p-3 text-left w-40">
                <p className="text-md font-bold text-on-surface">12:40</p>
                <p>HAN</p>
                <p className="text-[9pt] text-gray-500">Hà Nội</p>
              </div>

              <div className="flex flex-col p-3 items-center justify-center">
                <p>VJ123</p>
                <div className="flex flex-row justify-center items-center">
                  <div className="w-30 border-t-2 border-dashed border-gray-400" />
                  <Plane className="rotate-45 stroke-midnight-burgundy fill-luxury-gold" />
                  <div className="w-30 border-t-2 border-dashed border-gray-400" />
                </div>
              </div>

              <div className="flex flex-col p-3 text-right w-40">
                <p className="text-md font-bold text-on-surface">14:50</p>
                <p>SGN</p>
                <p className="text-[9pt] text-gray-500">TP. Hồ Chí Minh</p>
              </div>
            </div>

            <div className="flex flex-col items-start justify-center w-50 pl-3">
              <p>Hạng vé: Economy</p>
              <p>Tình trạng: Completed</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col bg-white rounded-xl p-7">
          <p className="text-sm font-bold text-on-surface-variant mb-3">Danh sách hành khách</p>
          <PassengerCard passenger={mock_passenger} />
        </div>
      </div>

      <div className="flex flex-col p-7 rounded-xl w-full bg-white">
        <p className="font-bold text-xl mb-2">Quản lý đặt chỗ</p>
        <button className="flex flex-row justify-between items-center border-cabin-silver border-2 rounded-xl p-5 mb-4 shadow-sm backdrop-blur-sm transition-all duration-200 hover:shadow-xl">
          <div className="flex flex-row items-center">
            <SquareCheckBig className="size-12 bg-midnight-burgundy stroke-luxury-gold p-2 rounded-md" />
            <div className="flex flex-col items-start ml-3">
              <p className="text-md">Check-in trực tuyến</p>
              <p className="text-xs text-on-surface-variant">
                Làm thủ tục trực tuyến và nhận thẻ lên máy báy
              </p>
            </div>
          </div>
          <ChevronRight />
        </button>

        <button className="flex flex-row justify-between items-center border-cabin-silver border-2 rounded-xl p-5 mb-4 shadow-sm backdrop-blur-sm transition-all duration-200 hover:shadow-xl">
          <div className="flex flex-row items-center">
            <PlaneTakeoff className="size-12 bg-midnight-burgundy stroke-luxury-gold p-2 rounded-md" />
            <div className="flex flex-col items-start ml-3">
              <p className="text-md">Thay đổi chuyến bay</p>
              <p className="text-xs text-on-surface-variant">Thay đổi ngày giờ hoặc hành trình</p>
            </div>
          </div>
          <ChevronRight />
        </button>

        <button className="flex flex-row justify-between items-center border-cabin-silver border-2 rounded-xl p-5 mb-4 shadow-sm backdrop-blur-sm transition-all duration-200 hover:shadow-xl">
          <div className="flex flex-row items-center">
            <CircleX className="size-12 bg-midnight-burgundy stroke-luxury-gold p-2 rounded-md" />
            <div className="flex flex-col items-start ml-3">
              <p className="text-md">Hủy chuyến bay</p>
              <p className="text-xs text-on-surface-variant">Hủy chuyến và yêu cầu hoàn tiền</p>
            </div>
          </div>
          <ChevronRight />
        </button>
      </div>
    </div>
  );
}
