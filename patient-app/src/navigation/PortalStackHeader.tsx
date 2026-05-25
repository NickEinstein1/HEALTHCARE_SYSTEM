import { memo } from "react";
import type { NativeStackHeaderProps, NativeStackNavigationOptions } from "@react-navigation/native-stack";
import { usePortalChrome } from "./PortalChrome";

export type PortalHeaderMeta = { title: string; crumb: string; showSignOut?: boolean };

function PortalStackHeaderInner({ options }: NativeStackHeaderProps) {
  const { renderHeader } = usePortalChrome();
  const meta = (options as NativeStackNavigationOptions & { portalHeader?: PortalHeaderMeta }).portalHeader;
  if (!meta) return null;
  return <>{renderHeader(meta.title, meta.crumb, meta.showSignOut)}</>;
}

export const PortalStackHeader = memo(PortalStackHeaderInner);

/** Native stack requires `header` to be a function, not a component reference. */
export function renderPortalStackHeader(props: NativeStackHeaderProps) {
  return <PortalStackHeader {...props} />;
}

export function portalHeader(meta: PortalHeaderMeta): NativeStackNavigationOptions {
  return { portalHeader: meta } as NativeStackNavigationOptions;
}
