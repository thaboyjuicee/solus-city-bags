// Android emulator -> host machine localhost.
// For physical devices replace with your LAN IP: "http://192.168.1.x:3000"
// Local dev setup uses 10.0.2.2. Change only this value for a new environment.
export const API_BASE_URL = "https://solus-city-app-production.up.railway.app";

// Keep these in sync. The identity URI for wallet auth should use the same host.
export const APP_IDENTITY_URI = API_BASE_URL;
