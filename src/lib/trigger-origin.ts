export type Box = {
  left: number;
  top: number;
  width: number;
  height: number;
};

/** Point on `layer` that sits on the trigger's center. Can fall outside the layer. */
export function triggerOrigin(trigger: Box, layer: Box): { x: number; y: number } {
  return {
    x: trigger.left + trigger.width / 2 - layer.left,
    y: trigger.top + trigger.height / 2 - layer.top,
  };
}

function readTrigger(layer: HTMLElement): HTMLElement | null {
  installTriggerMemory();
  const candidates = [focusedControl(layer), lastTrigger];
  for (const candidate of candidates) {
    if (!candidate || !candidate.isConnected) continue;
    if (layer.contains(candidate)) continue;
    if (!usableTrigger(candidate)) continue;
    return candidate;
  }
  return null;
}

let lastTrigger: HTMLElement | null = null;
let listening = false;

function usableTrigger(el: HTMLElement): boolean {
  const box = el.getBoundingClientRect();
  if (box.width <= 0 || box.height <= 0) return false;
  if (box.width > window.innerWidth * 0.9 && box.height > window.innerHeight * 0.9) {
    return false;
  }
  return true;
}

function focusedControl(layer: HTMLElement): HTMLElement | null {
  const active = document.activeElement;
  if (!(active instanceof HTMLElement)) return null;
  if (active === document.body || active === document.documentElement) return null;
  if (layer.contains(active)) return null;
  return active;
}

function installTriggerMemory() {
  if (listening || typeof document === "undefined") return;
  listening = true;
  document.addEventListener(
    "pointerdown",
    (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const control = target.closest("button, a, summary, [role='button']");
      if (control instanceof HTMLElement && usableTrigger(control)) {
        lastTrigger = control;
      }
    },
    true,
  );
}

function place(layer: HTMLElement, trigger: HTMLElement | null, modal: boolean) {
  layer.classList.add("trigger-pop");
  if (modal) layer.classList.add("trigger-pop-modal");
  if (!trigger) {
    delete layer.dataset.origin;
    layer.style.transformOrigin = "";
    return;
  }
  const origin = triggerOrigin(
    trigger.getBoundingClientRect(),
    layer.getBoundingClientRect(),
  );
  layer.style.transformOrigin = `${origin.x}px ${origin.y}px`;
  layer.style.animation = "none";
  void layer.offsetWidth;
  layer.style.animation = "";
  layer.dataset.origin = "ready";
}

/** Scale the open layer from the control that still has focus. */
export function playFromTrigger(layer: HTMLElement, modal = false) {
  place(layer, readTrigger(layer), modal);
}

/** Open a dialog, then scale it from the control that opened it. */
export function openDialogFromTrigger(
  dialog: HTMLDialogElement,
  afterOpen?: () => void,
) {
  const trigger = readTrigger(dialog);
  if (!dialog.open) dialog.showModal();
  afterOpen?.();
  place(dialog, trigger, true);
}
