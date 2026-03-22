/**
 * Enhanced Event Target Wrapper
 */

// A generic fallback listener type to prevent usage of 'any'
type GenericListener = (...args: unknown[]) => void;
type GenericOptions = unknown;

export type AddMethod<T> = T extends { addEventListener: infer M }
  ? M
  : T extends { addListener: infer M }
    ? M
    : (type: string, listener: GenericListener, options?: GenericOptions) => void;

export type RemoveMethod<T> = T extends { removeEventListener: infer M }
  ? M
  : T extends { removeListener: infer M }
    ? M
    : (type: string, listener: GenericListener, options?: GenericOptions) => void;

// Helper to extract parameters strictly from the inferred method
export type MethodParams<M> = M extends (...args: infer P) => unknown
  ? P
  : [string, GenericListener, GenericOptions?];

type EventTargetLike = {
  addEventListener?: (type: string, listener: GenericListener, options?: GenericOptions) => void;
  removeEventListener?: (type: string, listener: GenericListener, options?: GenericOptions) => void;
  addListener?: (type: string, listener: GenericListener) => void;
  removeListener?: (type: string, listener: GenericListener) => void;
};

export const target = <T>(__target: T) => {
  const add: AddMethod<T> = ((
    type: string,
    listener: GenericListener,
    options?: GenericOptions,
  ) => {
    const maybeTarget = __target as EventTargetLike;
    if (maybeTarget?.addEventListener) {
      maybeTarget.addEventListener(type, listener, options);
    } else if (maybeTarget?.addListener) {
      // FIX: Pass the original listener directly to prevent memory leaks
      maybeTarget.addListener(type, listener);
    }
  }) as AddMethod<T>;

  const remove: RemoveMethod<T> = ((
    type: string,
    listener: GenericListener,
    options?: GenericOptions,
  ) => {
    const maybeTarget = __target as EventTargetLike;
    if (maybeTarget?.removeEventListener) {
      maybeTarget.removeEventListener(type, listener, options);
    } else if (maybeTarget?.removeListener) {
      maybeTarget.removeListener(type, listener);
    }
  }) as RemoveMethod<T>;

  return { add, remove };
};

export const add = <T>(__target: T, ...args: MethodParams<AddMethod<T>>) => {
  const addFn = target(__target).add as (...params: MethodParams<AddMethod<T>>) => void;
  addFn(...args);
};

export const remove = <T>(
  __target: T,
  ...args: MethodParams<RemoveMethod<T>>
) => {
  const removeFn = target(__target).remove as (...params: MethodParams<RemoveMethod<T>>) => void;
  removeFn(...args);
};
