import { createRandomName } from "@shared/utils/testing";
// @vitest-environment happy-dom
import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "jotai";
import { describe, expect, test, vi } from "vitest";

import type { DisplayVertex, EntityProperties } from "@/core";

import { TooltipProvider } from "@/components";
import { createVertex, getAppStore } from "@/core";
import { createQueryClient } from "@/core/queryClient";
import { DbState, FakeExplorer } from "@/utils/testing";

import { EditVertexPropertiesDialog } from "./EditVertexPropertiesDialog";

/**
 * Builds a minimal DisplayVertex for the dialog. The display attributes list is
 * left empty so the dialog falls back to the raw property names as labels,
 * which keeps the label lookup in tests simple.
 */
function createDisplayVertexWithAttributes(
  attributes: EntityProperties,
): DisplayVertex {
  const vertex = createVertex({
    id: createRandomName("VertexId"),
    types: ["notion"],
    attributes,
  });
  return {
    entityType: "vertex",
    id: vertex.id,
    primaryType: vertex.type,
    types: vertex.types,
    displayId: String(vertex.id),
    displayTypes: "notion",
    displayName: String(vertex.id),
    displayDescription: "",
    attributes: [],
    isBlankNode: false,
    original: vertex,
  };
}

function renderDialog(props: Parameters<typeof EditVertexPropertiesDialog>[0]) {
  const store = getAppStore();
  const dbState = new DbState(new FakeExplorer());
  dbState.applyTo(store);

  const queryClient = createQueryClient();

  return render(<EditVertexPropertiesDialog {...props} />, {
    wrapper: ({ children }) => (
      <QueryClientProvider client={queryClient}>
        <Provider store={store}>
          <TooltipProvider>{children}</TooltipProvider>
        </Provider>
      </QueryClientProvider>
    ),
  });
}

describe("EditVertexPropertiesDialog", () => {
  test("shows the properties of the given vertex", () => {
    const caption = createRandomName("caption");
    const vertex = createDisplayVertexWithAttributes({ caption });

    renderDialog({ vertex, open: true, onOpenChange: vi.fn() });

    expect(screen.getByLabelText("caption")).toHaveValue(caption);
  });

  test("shows the properties of the newly selected vertex after reopening", () => {
    const firstCaption = createRandomName("first");
    const secondCaption = createRandomName("second");
    const firstVertex = createDisplayVertexWithAttributes({
      caption: firstCaption,
    });
    const secondVertex = createDisplayVertexWithAttributes({
      caption: secondCaption,
    });
    const onOpenChange = vi.fn();

    const { rerender } = renderDialog({
      vertex: firstVertex,
      open: true,
      onOpenChange,
    });
    expect(screen.getByLabelText("caption")).toHaveValue(firstCaption);

    // Close the dialog, select another vertex, then open the dialog again
    rerender(
      <EditVertexPropertiesDialog
        vertex={firstVertex}
        open={false}
        onOpenChange={onOpenChange}
      />,
    );
    rerender(
      <EditVertexPropertiesDialog
        vertex={secondVertex}
        open={true}
        onOpenChange={onOpenChange}
      />,
    );

    expect(screen.getByLabelText("caption")).toHaveValue(secondCaption);
  });

  test("discards unsaved edits when the dialog is closed and reopened", async () => {
    const caption = createRandomName("caption");
    const vertex = createDisplayVertexWithAttributes({ caption });
    const onOpenChange = vi.fn();
    const user = userEvent.setup();

    const { rerender } = renderDialog({ vertex, open: true, onOpenChange });

    const input = screen.getByLabelText("caption");
    await user.clear(input);
    await user.type(input, "unsaved edit");

    // Close without saving, then open the dialog again for the same vertex
    rerender(
      <EditVertexPropertiesDialog
        vertex={vertex}
        open={false}
        onOpenChange={onOpenChange}
      />,
    );
    rerender(
      <EditVertexPropertiesDialog
        vertex={vertex}
        open={true}
        onOpenChange={onOpenChange}
      />,
    );

    expect(screen.getByLabelText("caption")).toHaveValue(caption);
  });
});
