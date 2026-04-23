export const EMISSION_FACTORS = {
  electricity: 0.82, // kg CO2 per kWh
  car: 0.21,         // kg CO2 per km
  two_wheeler: 0.05, // kg CO2 per km
  bus: 0.089,        // kg CO2 per km
  plastic_item: 6,   // kg CO2e per item
  water: 0.0003,     // kg CO2 per litre
} as const;

export type ActivityType = keyof typeof EMISSION_FACTORS;
