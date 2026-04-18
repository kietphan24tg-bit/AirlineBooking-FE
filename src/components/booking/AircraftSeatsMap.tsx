import { useEffect, useState } from "react";
import Button from "../ui/Button";
import { List } from "lucide-react";
function SeatCell({
  row,
  num,
  taken,
  selected,
  onSelect,
}: {
  row: string;
  num: number;
  taken?: boolean;
  selected?: boolean;
  onSelect?: () => void;
}) {
  if (row === '' || num === 0) {
    return <div className="w-10" />;
  }
  return (
    <button
      type="button"
      disabled={taken}
      onClick={() => onSelect?.()}
      className={`flex h-10 w-10 items-center justify-center rounded-md text-[10px] font-bold transition-all ${
        taken
          ? 'cursor-not-allowed bg-surface-container-high/20 text-on-surface-variant/50'
          : selected
            ? 'border-2 border-midnight-burgundy bg-midnight-burgundy text-white'
            : num >= 1 && num <= 5 ? 'bg-cabin-burgundy/20 text-on-surface' // First section
              : num >= 6 && num <= 10 ? 'bg-luxury-gold/40 text-on-surface' // Business section
                : num >= 11 && num <= 26 ? 'bg-cabin-silver/30 text-on-surface' // Premium section
                    : 'bg-emerald-100 text-on-surface' // Economy section
      }`}
    >
      {num}-{row}
    </button>
  );
}

const SEAT_ROWS = ['A', 'B', 'C', '', 'D', 'E', 'F'] as const;
const SEAT_NUMS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40] as const;

export interface AircraftSeatsMapProps {
    onSeatSelect?: (seatId: string) => void;
    crSeatId?: string | null;
}

export default function AircraftSeatsMap({ onSeatSelect, crSeatId }: AircraftSeatsMapProps) {
    const [selectedSeat, setSelectedSeat] = useState<string | null>(null);

    const handleSeatSelect = (seatId: string) => {
        setSelectedSeat(seatId === selectedSeat ? null : seatId);
    };

    useEffect(() => {
        if (crSeatId) {
            setSelectedSeat(crSeatId);
        }   else {
            setSelectedSeat(null);
        }
    }, [crSeatId]);

    return (
        <div className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-6 shadow-sm gap-2 flex flex-col">
            <h1 className="mb-4 flex items-center gap-2 font-headline text-lg font-black text-midnight-burgundy">
                <List className="h-5 w-5" />
                Sơ đồ chỗ ngồi
            </h1>
            <div className="h-130 overflow-auto">
                <div className="flex items-center justify-center gap-4 mb-2">
                    <span className="w-6" />
                    {SEAT_ROWS.map((col, i) => (
                        col ? (
                        <div
                            key={i}
                            className="w-10 text-center text-xs font-bold text-on-surface"
                        >
                            {col}
                        </div>
                        ) : (
                        <div key={i} className="w-10" /> // lối đi
                        )
                    ))}
                </div>
                {SEAT_NUMS.map((row) => (
                    <div key={row} className={`flex items-center justify-center gap-4 ${row === 10 || row === 26 ? 'border-b border-outline-variant pb-10' : ''}`}>
                        <span className="w-6 text-center text-xs text-on-surface-variant">{row}</span>
                        {SEAT_ROWS.map((col, i) => {
                            const label = col ? `${row}-${col}` : '';
                            const taken = label === '1A' || label === '1B';
                            return (
                            <SeatCell
                                key={`${row}-${i}`}
                                row={col}
                                num={row}
                                taken={taken || false}
                                selected={selectedSeat === label}
                                onSelect={() => handleSeatSelect(label)}
                            />
                            );
                        })}
                    </div>
                ))}
            </div>
            <Button variant="primary" onClick={() => onSeatSelect?.(selectedSeat ?? '')}>
                Đặt chỗ
            </Button>
        </div>
    );
}