import { create } from 'zustand';
import { Invoice, Merchant, mockInvoices, mockMerchant, generateSubaddress, usdToXmr } from './mock-data';

interface AppState {
  isAuthenticated: boolean;
  merchant: Merchant;
  invoices: Invoice[];
  login: () => void;
  logout: () => void;
  createInvoice: (description: string, fiatAmount: number) => Invoice;
  simulatePayment: (invoiceId: string) => void;
  updateMerchant: (updates: Partial<Merchant>) => void;
}

export const useStore = create<AppState>((set, get) => ({
  isAuthenticated: false,
  merchant: mockMerchant,
  invoices: mockInvoices,

  login: () => set({ isAuthenticated: true }),
  logout: () => set({ isAuthenticated: false }),

  createInvoice: (description: string, fiatAmount: number) => {
    const invoice: Invoice = {
      id: 'inv_' + Math.random().toString(36).slice(2, 8),
      fiatAmount,
      fiatCurrency: 'USD',
      xmrAmount: usdToXmr(fiatAmount),
      subaddress: generateSubaddress(),
      status: 'pending',
      createdAt: new Date().toISOString(),
      description,
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
    };
    set(state => ({ invoices: [invoice, ...state.invoices] }));
    return invoice;
  },

  simulatePayment: (invoiceId: string) => {
    set(state => ({
      invoices: state.invoices.map(inv =>
        inv.id === invoiceId
          ? { ...inv, status: 'paid' as const, paidAt: new Date().toISOString() }
          : inv
      ),
    }));
  },

  updateMerchant: (updates: Partial<Merchant>) => {
    set(state => ({ merchant: { ...state.merchant, ...updates } }));
  },
}));
