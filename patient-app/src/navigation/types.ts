export type RootTabParamList = {
  Home: undefined;
  Health: { screen?: keyof HealthStackParamList } | undefined;
  Wallet: { screen?: keyof WalletStackParamList } | undefined;
  Messages: undefined;
  Menu: { screen?: keyof MenuStackParamList } | undefined;
};

export type HealthStackParamList = {
  HealthHub: undefined;
  Appointments: undefined;
  Visits: undefined;
  Results: undefined;
  Medications: undefined;
  Vitals: undefined;
  Messages: undefined;
};

export type WalletStackParamList = {
  WalletHub: undefined;
  Coverage: undefined;
  Contributions: undefined;
  Bills: undefined;
  Pay: undefined;
};

export type MenuStackParamList = {
  MenuHub: undefined;
  Consent: undefined;
  Profile: undefined;
  Records: undefined;
  Documents: undefined;
  LegalSign: undefined;
};
