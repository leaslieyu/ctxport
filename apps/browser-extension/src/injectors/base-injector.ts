export interface PlatformInjector {
  readonly platform: "chatgpt" | "claude";

  /** Inject copy button in conversation detail header */
  injectCopyButton(renderButton: (container: HTMLElement) => void): void;

  /** Inject copy icons in sidebar list items */
  injectListIcons(
    renderIcon: (container: HTMLElement, conversationId: string) => void,
  ): void;

  /** Inject batch checkboxes in sidebar list items */
  injectBatchCheckboxes(
    renderCheckbox: (container: HTMLElement, conversationId: string) => void,
  ): void;

  /** Remove batch checkboxes */
  removeBatchCheckboxes(): void;

  /** Clean up all injections and observers */
  cleanup(): void;
}

const CTXPORT_ATTR = "data-ctxport-injected";

export function markInjected(el: HTMLElement, type: string): void {
  el.setAttribute(CTXPORT_ATTR, type);
}

export function isInjected(el: HTMLElement, type: string): boolean {
  return el.getAttribute(CTXPORT_ATTR) === type;
}

export function createContainer(id: string): HTMLElement {
  const el = document.createElement("div");
  el.id = id;
  el.style.display = "inline-flex";
  el.style.alignItems = "center";
  return el;
}

export function removeAllByClass(className: string): void {
  document.querySelectorAll(`.${className}`).forEach((el) => el.remove());
}
