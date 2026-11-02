import type { Colors } from './theme';

export type Role = 'student' | 'admin';

export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled';

export type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  stock: number;
  is_active: boolean;
};

export const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Recibido',
  preparing: 'En preparación',
  ready: 'Preparado',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
};

// Próximos estados que el admin puede elegir desde cada estado actual
export const NEXT_STATUSES: Record<OrderStatus, OrderStatus[]> = {
  pending: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['delivered'],
  delivered: [],
  cancelled: [],
};

export type OrderItemRow = {
  quantity: number;
  unit_price: number;
  products: { name: string } | null;
};

export type OrderRow = {
  id: string;
  total_amount: number;
  status: OrderStatus;
  created_at: string;
  profiles?: { full_name: string | null; email: string } | null;
  order_items: OrderItemRow[];
};

export function statusStyle(status: OrderStatus, colors: Colors): { color: string } {
  switch (status) {
    case 'ready':
    case 'delivered':
      return { color: colors.successText };
    case 'cancelled':
      return { color: colors.danger };
    default:
      return { color: colors.warning };
  }
}

export function formatPrice(value: number): string {
  return `$${Number(value).toLocaleString('es-AR', { maximumFractionDigits: 2 })}`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });
}
