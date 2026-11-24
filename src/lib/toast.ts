/* Static import would put Sonner back in the capture route's first-load bundle. */
export async function loadToast() {
  return import("sonner").then(({ toast }) => toast).catch(() => null)
}
