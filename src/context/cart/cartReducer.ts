/**
 * Cart Optimistic Reducer
 *
 * Manages optimistic updates for cart operations. This reducer handles
 * the local state updates that appear instantly while the server mutation
 * is in progress.
 */

import { OptimisticState, OptimisticAction, CartItem } from "./types";

/**
 * Reducer for managing optimistic cart state
 *
 * The key insight here is that we track pending operations separately
 * from the optimistic items. When an operation completes or fails,
 * we can either confirm (remove the pending flag) or rollback
 * (restore the previous state).
 */
export function optimisticReducer(
  state: OptimisticState,
  action: OptimisticAction
): OptimisticState {
  switch (action.type) {
    case "ADD_ITEM": {
      const { item, operationId } = action;
      const existingIndex = state.optimisticItems.findIndex(
        (i) =>
          i.productId === item.productId &&
          i.size === item.size &&
          i.color === item.color
      );

      let newItems: CartItem[];
      if (existingIndex >= 0) {
        // Update quantity of existing item
        newItems = [...state.optimisticItems];
        newItems[existingIndex] = {
          ...newItems[existingIndex],
          quantity: newItems[existingIndex].quantity + (item.quantity || 1),
          _isOptimistic: true,
          _optimisticId: operationId,
        };
      } else {
        // Add new item
        newItems = [
          ...state.optimisticItems,
          { ...item, _isOptimistic: true, _optimisticId: operationId },
        ];
      }

      const newPendingOps = new Map(state.pendingOperations);
      newPendingOps.set(operationId, {
        id: operationId,
        type: "add",
        item,
        previousItems: state.optimisticItems,
        timestamp: Date.now(),
      });

      return {
        optimisticItems: newItems,
        pendingOperations: newPendingOps,
      };
    }

    case "UPDATE_QUANTITY": {
      const { productId, size, color, quantity, operationId } = action;
      const newItems = state.optimisticItems
        .map((item) => {
          if (
            item.productId === productId &&
            item.size === size &&
            item.color === color
          ) {
            return {
              ...item,
              quantity,
              _isOptimistic: true,
              _optimisticId: operationId,
            };
          }
          return item;
        })
        .filter((item) => item.quantity > 0); // Remove if quantity is 0

      const newPendingOps = new Map(state.pendingOperations);
      newPendingOps.set(operationId, {
        id: operationId,
        type: "update",
        previousItems: state.optimisticItems,
        timestamp: Date.now(),
      });

      return {
        optimisticItems: newItems,
        pendingOperations: newPendingOps,
      };
    }

    case "REMOVE_ITEM": {
      const { productId, size, color, operationId } = action;
      const newItems = state.optimisticItems.filter(
        (item) =>
          !(
            item.productId === productId &&
            item.size === size &&
            item.color === color
          )
      );

      const newPendingOps = new Map(state.pendingOperations);
      newPendingOps.set(operationId, {
        id: operationId,
        type: "remove",
        previousItems: state.optimisticItems,
        timestamp: Date.now(),
      });

      return {
        optimisticItems: newItems,
        pendingOperations: newPendingOps,
      };
    }

    case "CLEAR_CART": {
      const { operationId } = action;
      const newPendingOps = new Map(state.pendingOperations);
      newPendingOps.set(operationId, {
        id: operationId,
        type: "clear",
        previousItems: state.optimisticItems,
        timestamp: Date.now(),
      });

      return {
        optimisticItems: [],
        pendingOperations: newPendingOps,
      };
    }

    case "CONFIRM_OPERATION": {
      const newPendingOps = new Map(state.pendingOperations);
      newPendingOps.delete(action.operationId);

      // Clear optimistic flags from items that match this operation
      const newItems = state.optimisticItems.map((item) => {
        if (item._optimisticId === action.operationId) {
          const { _isOptimistic, _optimisticId, ...cleanItem } = item;
          return cleanItem as CartItem;
        }
        return item;
      });

      return {
        optimisticItems: newItems,
        pendingOperations: newPendingOps,
      };
    }

    case "ROLLBACK_OPERATION": {
      const operation = state.pendingOperations.get(action.operationId);
      if (!operation || !operation.previousItems) {
        const newPendingOps = new Map(state.pendingOperations);
        newPendingOps.delete(action.operationId);
        return { ...state, pendingOperations: newPendingOps };
      }

      const newPendingOps = new Map(state.pendingOperations);
      newPendingOps.delete(action.operationId);

      return {
        optimisticItems: operation.previousItems,
        pendingOperations: newPendingOps,
      };
    }

    case "SYNC_WITH_SERVER": {
      // Only sync if no pending operations
      if (state.pendingOperations.size === 0) {
        return {
          ...state,
          optimisticItems: action.serverItems,
        };
      }
      // If there are pending operations, keep optimistic state
      return state;
    }

    default:
      return state;
  }
}

/**
 * Initial state for the optimistic reducer
 */
export const initialOptimisticState: OptimisticState = {
  optimisticItems: [],
  pendingOperations: new Map(),
};
