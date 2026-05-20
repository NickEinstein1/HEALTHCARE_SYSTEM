import { UniHealthLogo } from "./UniHealthLogo";

type Props = {
  idPrefix?: string;
  className?: string;
};

/** Small UniHealth mark for global and in-page search fields. */
export function SearchBarBrand({ idPrefix = "sbar", className = "search-bar-brand" }: Props) {
  return (
    <span className={className} aria-hidden>
      <UniHealthLogo idPrefix={idPrefix} className="unihealth-logo search-bar-brand__logo" />
    </span>
  );
}
