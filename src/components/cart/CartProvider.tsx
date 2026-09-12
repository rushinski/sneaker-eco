// src/components/cart/CartProvider.tsx
"use client";

import type { ReactNode } from "react";
import {
  createContext,
  useContext,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  useSyncExternalStore,
} from "react";

import { CartService } from "@/services/cart-service";
import type { CartItem } from "@/types/domain/cart";
import { useSession } from "@/contexts/SessionContext";

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">) => void;
  removeItem: (productId: string, variantId: string) => void;
  updateQuantity: (productId: string, variantId: string, quantity: number) => void;
  setCartItems: (items: CartItem[]) => void;
  clearCart: () => void;
  itemCount: number;
  total: number;
  isReady: boolean;
}

const cartContext = createContext<CartContextType | null>(null);
const EMPTY_CART_SNAPSHOT = "[]";
const subscribeToHydration = () => () => {};

export function CartProvider({
  children,
  userId = null,
}: {
  children: ReactNode;
  userId?: string | null;
}) {
  const { user } = useSession();
  const resolvedUserId = userId ?? user?.id ?? null;
  const cart = useMemo(() => new CartService(resolvedUserId), [resolvedUserId]);
  const didInitialValidation = useRef(false);
  const isValidatingRef = useRef(false);
  const subscribeToCart = useCallback((onStoreChange: () => void) => {
    window.addEventListener("cartUpdated", onStoreChange);
    return () => window.removeEventListener("cartUpdated", onStoreChange);
  }, []);
  const getCartSnapshot = useCallback(() => JSON.stringify(cart.getCart()), [cart]);
  const cartSnapshot = useSyncExternalStore(
    subscribeToCart,
    getCartSnapshot,
    () => EMPTY_CART_SNAPSHOT,
  );
  const items = useMemo(() => JSON.parse(cartSnapshot) as CartItem[], [cartSnapshot]);
  const isReady = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false,
  );

  const refreshCart = useCallback(async () => {
    const current = cart.getCart();
    if (current.length === 0 || isValidatingRef.current) {
      return;
    }
    isValidatingRef.current = true;

    try {
      const response = await fetch("/api/cart/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: current.map((item) => ({
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity,
          })),
        }),
      });

      const data = await response.json().catch(() => null);
      if (response.ok && Array.isArray(data?.items)) {
        cart.setCart(data.items as CartItem[]);
      }
    } catch {
      // ignore validation failures
    } finally {
      isValidatingRef.current = false;
    }
  }, [cart]);

  useEffect(() => {
    didInitialValidation.current = false;
  }, [cart]);

  useEffect(() => {
    if (didInitialValidation.current || !isReady) {
      return;
    }
    didInitialValidation.current = true;
    if (items.length > 0) {
      void refreshCart();
    }
  }, [isReady, items.length, refreshCart]);

  useEffect(() => {
    const handleOpenCart = () => {
      void refreshCart();
    };

    window.addEventListener("openCart", handleOpenCart);
    return () => window.removeEventListener("openCart", handleOpenCart);
  }, [refreshCart]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        void refreshCart();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [refreshCart]);

  const addItem = useCallback(
    (item: Omit<CartItem, "quantity">) => {
      cart.addItem(item);
    },
    [cart],
  );

  const removeItem = useCallback(
    (productId: string, variantId: string) => {
      cart.removeItem(productId, variantId);
    },
    [cart],
  );

  const updateQuantity = useCallback(
    (productId: string, variantId: string, quantity: number) => {
      cart.updateQuantity(productId, variantId, quantity);
    },
    [cart],
  );

  const setCartItems = useCallback(
    (nextItems: CartItem[]) => {
      cart.setCart(nextItems);
    },
    [cart],
  );

  const clearCart = useCallback(() => {
    cart.clearCart();
  }, [cart]);

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const total = items.reduce((sum, item) => sum + item.priceCents * item.quantity, 0);

  return (
    <cartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        setCartItems,
        clearCart,
        itemCount,
        total,
        isReady,
      }}
    >
      {children}
    </cartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(cartContext);
  if (!context) {
    throw new Error("useCart must be used within CartProvider");
  }
  return context;
}
