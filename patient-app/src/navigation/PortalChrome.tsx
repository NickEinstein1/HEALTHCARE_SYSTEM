import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { useNavigation } from "@react-navigation/native";
import type { NavigationProp } from "@react-navigation/native";
import { AppHeader } from "../components/AppHeader";
import { NotificationsModal, SearchModal } from "../components/PortalModals";
import { navigateFromNotification, navigateFromSearch } from "./portalNavigate";
import type { RootTabParamList } from "./types";

type PortalChromeContextValue = {
  renderHeader: (title: string, crumb: string, showSignOut?: boolean) => ReactNode;
};

const PortalChromeContext = createContext<PortalChromeContextValue | null>(null);

export function usePortalChrome() {
  const ctx = useContext(PortalChromeContext);
  if (!ctx) throw new Error("usePortalChrome must be used within PortalChrome");
  return ctx;
}

type Props = {
  children: ReactNode;
  onSignOut?: () => void;
};

/** Single search/notifications layer for the whole signed-in app (avoids duplicate modals). */
export function PortalChrome({ children, onSignOut }: Props) {
  const rootNav = useNavigation<NavigationProp<RootTabParamList>>();
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const openSearch = useCallback(() => setSearchOpen(true), []);
  const openNotifications = useCallback(() => setNotifOpen(true), []);

  const renderHeader = useCallback(
    (title: string, crumb: string, showSignOut?: boolean) => (
      <AppHeader
        title={title}
        crumb={crumb}
        onSignOut={showSignOut ? onSignOut : undefined}
        onSearch={openSearch}
        onNotifications={openNotifications}
      />
    ),
    [onSignOut, openSearch, openNotifications],
  );

  const value = useMemo(() => ({ renderHeader }), [renderHeader]);

  return (
    <PortalChromeContext.Provider value={value}>
      {children}
      <SearchModal
        visible={searchOpen}
        query={searchQuery}
        onQueryChange={setSearchQuery}
        onClose={() => setSearchOpen(false)}
        onSelect={(item) => {
          setSearchOpen(false);
          navigateFromSearch(rootNav, item);
        }}
      />
      <NotificationsModal
        visible={notifOpen}
        onClose={() => setNotifOpen(false)}
        onSelect={(n) => {
          setNotifOpen(false);
          navigateFromNotification(rootNav, n);
        }}
      />
    </PortalChromeContext.Provider>
  );
}
