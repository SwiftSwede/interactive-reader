/** Replay a centered dialog enter. Modals stay centered. They do not scale from the button. */
export function replayCenterPop(layer: HTMLElement) {
  layer.classList.add("trigger-pop-modal");
  layer.style.transformOrigin = "center";
  layer.style.animation = "none";
  void layer.offsetWidth;
  layer.style.animation = "";
}

export function openCenteredDialog(
  dialog: HTMLDialogElement,
  afterOpen?: () => void,
) {
  if (!dialog.open) dialog.showModal();
  afterOpen?.();
  replayCenterPop(dialog);
}
