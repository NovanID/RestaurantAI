export type StaffRole = 'owner' | 'manager' | 'staff';

export type TableStatus = 'active' | 'inactive';

export type ReservationStatus =
  | 'pending'
  | 'confirmed'
  | 'rejected'
  | 'expired'
  | 'cancelled'
  | 'completed'
  | 'no_show';

export type ReservationSource = 'web' | 'ai' | 'admin';

export type ChatRole = 'user' | 'assistant' | 'tool';

export type ToolCallStatus = 'ok' | 'error';

export * from './evaluations/scenarios';

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}
