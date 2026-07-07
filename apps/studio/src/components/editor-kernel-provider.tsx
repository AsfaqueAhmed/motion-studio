"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { AppEventType } from "@motion-studio/shared";
import { createEditorKernel } from "../editor-kernel/create-editor-kernel";
import type { EditorKernel } from "../editor-kernel/editor-kernel";
import { useEngineRevisionStore } from "../state/use-engine-revision-store";

const EditorKernelContext = createContext<EditorKernel | null>(null);

/** Every event whose real effect is "something a panel reads via selectors just changed." */
const REVISION_EVENTS: readonly AppEventType[] = [
  "CommandExecuted",
  "CommandUndone",
  "CommandRedone",
  "AssetImported",
  "AssetDeleted",
  "PluginActivated",
];

/**
 * Constructs the `EditorKernel` once per mount — browser-only (opens real
 * IndexedDB/OPFS), so this must run client-side, never during SSR. Bumps
 * `useEngineRevisionStore` on every project-mutating event so panels
 * re-read the engines; project data itself never gets copied into React
 * state (PLAN.md 15.7).
 */
export function EditorKernelProvider({ children }: { children: ReactNode }): JSX.Element {
  const [kernel, setKernel] = useState<EditorKernel | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    let createdKernel: EditorKernel | undefined;

    createEditorKernel()
      .then((newKernel) => {
        if (cancelled) {
          void newKernel.shutdown();
          return;
        }
        createdKernel = newKernel;
        setKernel(newKernel);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      });

    return () => {
      cancelled = true;
      void createdKernel?.shutdown();
    };
  }, []);

  useEffect(() => {
    if (!kernel) {
      return;
    }
    const bump = useEngineRevisionStore.getState().bump;
    const unsubscribers = REVISION_EVENTS.map((type) =>
      kernel.appEngine.events.on(type, () => bump()),
    );
    return () => {
      for (const unsubscribe of unsubscribers) {
        unsubscribe();
      }
    };
  }, [kernel]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-editor-bg text-red-400">
        Failed to start Motion Studio: {error.message}
      </div>
    );
  }

  if (!kernel) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-editor-bg text-editor-text-muted">
        Loading Motion Studio…
      </div>
    );
  }

  return <EditorKernelContext.Provider value={kernel}>{children}</EditorKernelContext.Provider>;
}

export function useEditorKernel(): EditorKernel {
  const kernel = useContext(EditorKernelContext);
  if (!kernel) {
    throw new Error(
      "useEditorKernel: no EditorKernel in context — wrap with <EditorKernelProvider>",
    );
  }
  return kernel;
}
