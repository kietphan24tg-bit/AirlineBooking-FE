export type BookingStep = 'search' | 'select' | 'details' | 'pay';

export interface BookingStepperProps {
  current: BookingStep;
}

const steps: { id: BookingStep; label: string; step: number }[] = [
  { id: 'search', label: 'Search', step: 1 },
  { id: 'details', label: 'Details', step: 2 },
  { id: 'select', label: 'Select', step: 3 },
  { id: 'pay', label: 'Pay', step: 4 },
];

export default function BookingStepper({ current }: BookingStepperProps) {
  const activeIdx = steps.findIndex((s) => s.id === current);

  return (
    <div className="mb-8 flex justify-center sm:mb-10 lg:mb-12">
      <div className="grid w-full max-w-3xl grid-cols-4 gap-2 sm:gap-4">
        {steps.map((s, i) => {
          const state = i < activeIdx ? 'done' : i === activeIdx ? 'current' : 'todo';
          return (
            <div key={s.id} className="relative flex flex-col items-center">
              {i < steps.length - 1 ? (
                <div
                  className={`absolute left-[calc(50%+1.25rem)] top-5 hidden h-0.5 w-[calc(100%-2.5rem)] sm:block ${
                    i < activeIdx ? 'bg-primary/30' : 'bg-surface-container-high'
                  }`}
                />
              ) : null}

              <div
                className={`relative z-10 mb-2 flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold shadow-lg sm:h-11 sm:w-11 ${
                  state === 'todo'
                    ? 'bg-surface-container-high text-on-surface-variant'
                    : state === 'current'
                      ? 'bg-primary text-on-primary ring-4 ring-secondary-fixed'
                      : 'bg-primary text-on-primary'
                }`}
              >
                {s.step}
              </div>

              <span
                className={`text-center text-[9px] font-bold uppercase tracking-[0.24em] sm:text-[10px] ${
                  state === 'todo' ? 'text-on-surface-variant' : 'text-primary'
                }`}
              >
                {s.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
