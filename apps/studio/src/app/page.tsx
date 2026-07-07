"use client";

import { EditorKernelProvider } from "../components/editor-kernel-provider";
import { EditorShell } from "../components/editor-shell";

export default function HomePage(): JSX.Element {
  return (
    <EditorKernelProvider>
      <EditorShell />
    </EditorKernelProvider>
  );
}
