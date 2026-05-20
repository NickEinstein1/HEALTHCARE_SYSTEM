/** Sentinel for nav/UI slots that should render the UniHealth SVG mark instead of an emoji. */
export const BRAND_ICON = "@unihealth";

export function isBrandIcon(icon: string): boolean {
  return icon === BRAND_ICON;
}
