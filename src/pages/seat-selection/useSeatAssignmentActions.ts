import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { bookingService } from '../../services/booking.service';
import type { SeatAssignmentResponse } from '../../types/booking.types';
import type { BookingSession } from '../../stores/useBookingStore';

type AssignmentVars = {
  bookingId: string | number;
  passengerId: number;
  seatId: number;
  passengerName: string;
};

type ChangeVars = {
  bookingId: string | number;
  passengerId: number;
  fromSeatId: number;
  toSeatId: number;
  passengerName: string;
};

type ActionOptions = {
  onSettled?: () => void;
};

export function useSeatAssignmentActions(params: {
  bookingResponse: BookingSession | null;
  isManageBookingFlow: boolean;
  applySeatAssignmentResult: (
    data: SeatAssignmentResponse,
    replacedPassengerIds?: number[],
    flightId?: number | null
  ) => void;
  currentFlightId?: number | null;
  refetchSeatMap: () => Promise<unknown>;
  refetchManageOptions: () => Promise<unknown>;
  onCancelSuccess?: () => void;
  getSeatAssignmentErrorMessage: (error: unknown, fallback: string) => string;
}) {
  const {
    applySeatAssignmentResult,
    bookingResponse,
    getSeatAssignmentErrorMessage,
    isManageBookingFlow,
    onCancelSuccess,
    currentFlightId,
    refetchManageOptions,
    refetchSeatMap,
  } = params;

  const syncAfterSeatMutation = async (data: SeatAssignmentResponse, passengerId: number) => {
    if (bookingResponse) {
      applySeatAssignmentResult(data, [passengerId], currentFlightId);
    }
    await refetchSeatMap();
    if (isManageBookingFlow) {
      await refetchManageOptions();
    }
  };

  const assignSeatMutation = useMutation({
    mutationFn: (vars: AssignmentVars) =>
      bookingService.putSeatAssignments(vars.bookingId, {
        assignments: [{ passengerId: vars.passengerId, seatId: vars.seatId }],
      }),
    onSuccess: async (data, variables) => {
      await syncAfterSeatMutation(data, variables.passengerId);
      toast.success(`Seat confirmed for ${variables.passengerName}.`);
    },
    onError: (error, variables) => {
      toast.error(
        getSeatAssignmentErrorMessage(
          error,
          `Unable to assign a seat for ${variables.passengerName}. Please try again.`
        )
      );
    },
  });

  const changeSeatMutation = useMutation({
    mutationFn: (vars: ChangeVars) =>
      bookingService.patchSeatAssignment(vars.bookingId, {
        passengerId: vars.passengerId,
        fromSeatId: vars.fromSeatId,
        toSeatId: vars.toSeatId,
      }),
    onSuccess: async (data, variables) => {
      await syncAfterSeatMutation(data, variables.passengerId);
      toast.success(`Seat changed for ${variables.passengerName}.`);
    },
    onError: (error, variables) => {
      toast.error(
        getSeatAssignmentErrorMessage(
          error,
          `Unable to change the seat for ${variables.passengerName}. Please try again.`
        )
      );
    },
  });

  const cancelSeatMutation = useMutation({
    mutationFn: (vars: AssignmentVars) =>
      bookingService.deleteSeatAssignments(vars.bookingId, {
        assignments: [{ passengerId: vars.passengerId, seatId: vars.seatId }],
      }),
    onSuccess: async (data, variables) => {
      await syncAfterSeatMutation(data, variables.passengerId);
      onCancelSuccess?.();
      toast.success(`Seat selection cancelled for ${variables.passengerName}.`);
    },
    onError: (error, variables) => {
      toast.error(
        getSeatAssignmentErrorMessage(
          error,
          `Unable to cancel the seat for ${variables.passengerName}. Please try again.`
        )
      );
    },
  });

  return {
    assignSeat: (vars: AssignmentVars, options?: ActionOptions) =>
      assignSeatMutation.mutate(vars, { onSettled: options?.onSettled }),
    changeSeat: (vars: ChangeVars, options?: ActionOptions) =>
      changeSeatMutation.mutate(vars, { onSettled: options?.onSettled }),
    cancelSeat: (vars: AssignmentVars, options?: ActionOptions) =>
      cancelSeatMutation.mutate(vars, { onSettled: options?.onSettled }),
    assignSeatMutation,
    changeSeatMutation,
    cancelSeatMutation,
    isSeatMutationPending:
      assignSeatMutation.isPending || changeSeatMutation.isPending || cancelSeatMutation.isPending,
  };
}
