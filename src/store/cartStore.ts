import { create } from 'zustand';

export type Modifier = {
    id: string;
    name: string;
    price_delta: number;
    is_meat?: boolean;
};

export type ModifierGroup = {
    id: string;
    name: string;
    is_required: boolean;
    max_selections: number;
    modifiers: Modifier[];
    applies_to_vegetarian?: boolean;
    applies_to_meat?: boolean;
    applies_to_drinks?: boolean;
    is_global?: boolean;
};

export type Product = {
    id: string;
    name: string;
    description: string;
    base_price: number;
    modifier_groups: ModifierGroup[];
    category?: { id: string; name: string; sort_order: number };
    allergens?: string | null;
    additives?: string | null;
    deposit_amount?: number | null;
    is_vegetarian: boolean;
    is_drink: boolean;
};

export type CartItem = {
    id: string;
    product: Product;
    product_id: string;
    quantity: number;
    price: number;
    modifiers: Record<string, string[]>; // { groupId: [modifierId, ...] }
};

export type DiningOption = 'takeaway' | 'dine-in' | 'delivery' | null;

interface CartState {
    items: CartItem[];
    addItem: (item: Omit<CartItem, 'id'>) => void;
    removeItem: (id: string) => void;
    updateItem: (id: string, modifiers: Record<string, string[]>, price: number) => void;
    setItemQuantity: (id: string, quantity: number) => void;
    clearCart: () => void;
    getTotal: () => number;
    isTestMode: boolean;
    toggleTestMode: () => void;
    diningOption: DiningOption;
    setDiningOption: (option: DiningOption) => void;
}

export const useCartStore = create<CartState>((set, get) => ({
    items: [],
    isTestMode: false,
    diningOption: null,
    toggleTestMode: () => set((state) => ({ isTestMode: !state.isTestMode })),
    setDiningOption: (option) => set({ diningOption: option }),
    addItem: (item) => {
        set((state) => ({
            items: [...state.items, { ...item, id: Math.random().toString(36).substring(7) }]
        }));
    },
    removeItem: (id) => {
        set((state) => ({ items: state.items.filter(i => i.id !== id) }));
    },
    updateItem: (id, modifiers, price) => {
        set((state) => ({
            items: state.items.map((item) => item.id === id ? { ...item, modifiers, price } : item)
        }));
    },
    setItemQuantity: (id, quantity) => {
        set((state) => {
            if (quantity <= 0) {
                return { items: state.items.filter(i => i.id !== id) };
            }
            return {
                items: state.items.map((item) => item.id === id ? { ...item, quantity } : item)
            };
        });
    },
    clearCart: () => set({ items: [], diningOption: null }),
    getTotal: () => {
        return get().items.reduce((total, item) => total + (item.price * item.quantity), 0);
    }
}));
