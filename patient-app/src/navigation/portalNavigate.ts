import type { NavigationProp } from "@react-navigation/native";
import type { RootTabParamList } from "./types";
import type { PortalNotification, SearchItem } from "../lib/patientPortalData";

type RootNav = NavigationProp<RootTabParamList>;

export function navigateFromSearch(nav: RootNav, item: SearchItem) {
  if (item.tab === "Home") {
    nav.navigate("Home");
    return;
  }
  if (item.tab === "Messages") {
    nav.navigate("Messages");
    return;
  }
  if (item.tab === "Health") {
    nav.navigate("Health", { screen: (item.screen as keyof import("./types").HealthStackParamList) ?? "HealthHub" });
    return;
  }
  if (item.tab === "Wallet") {
    nav.navigate("Wallet", { screen: (item.screen as keyof import("./types").WalletStackParamList) ?? "WalletHub" });
    return;
  }
  nav.navigate("Menu", { screen: (item.screen as keyof import("./types").MenuStackParamList) ?? "MenuHub" });
}

export function navigateFromNotification(nav: RootNav, n: PortalNotification) {
  const { tab, screen } = n.route;
  if (tab === "Home") {
    nav.navigate("Home");
    return;
  }
  if (tab === "Health") {
    nav.navigate("Health", { screen: (screen as keyof import("./types").HealthStackParamList) ?? "HealthHub" });
    return;
  }
  nav.navigate("Wallet", { screen: (screen as keyof import("./types").WalletStackParamList) ?? "WalletHub" });
}
