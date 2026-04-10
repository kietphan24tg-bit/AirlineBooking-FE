export type BookingStep = 'search' | 'select' | 'details' | 'pay';

export interface BookingStepperProps {
  current: BookingStep;
}

const steps: { id: BookingStep; label: string; step: number }[] = [
  { id: 'search', label: 'Search', step: 1 },
  { id: 'select', label: 'Select', step: 2 },
  { id: 'details', label: 'Details', step: 3 },
  { id: 'pay', label: 'Pay', step: 4 },
];

export default function BookingStepper({ current }: BookingStepperProps) {
  const activeIdx = steps.findIndex((s) => s.id === current);

  return (
    <div className="mb-12 flex justify-center">
      <div className="flex w-full max-w-3xl items-start">
        {steps.map((s, i) => {
          const state = i < activeIdx ? 'done' : i === activeIdx ? 'current' : 'todo';
          return (
            <div key={s.id} className="flex flex-1 items-start">
              <div className="flex w-full flex-col items-center">
                <div
                  className={`mb-2 flex h-10 w-10 items-center justify-center rounded-full font-bold shadow-lg ${
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
                  className={`text-[10px] font-bold uppercase tracking-widest ${
                    state === 'todo' ? 'text-on-surface-variant' : 'text-primary'
                  }`}
                >
                  {s.label}
                </span>
              </div>
              {i < steps.length - 1 ? (
                <div
                  className={`-mx-2.5 mt-5 hidden h-0.5 w-12 shrink-0 md:block md:w-20 ${
                    i < activeIdx ? 'bg-primary opacity-30' : 'bg-surface-container-high'
                  }`}
                />
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
