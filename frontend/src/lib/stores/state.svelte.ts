import type mapboxgl from 'mapbox-gl';
import type {
  AppConfig,
  ChamberDemographics,
  DemographicsTotals,
  DistrictProperties,
  LocationPrecinct,
  MapState,
  StateTotals,
} from '../types';

// App configuration (loaded from backend)
let appConfig = $state<AppConfig | null>(null);

// Map UI state
let mapState = $state<MapState>({
  level: 'congress_r1',
  measure: 'bvap',
  showDistrict: true,
  showCity: false,
  showCounty: false,
  showPrecinct: false,
});

// State-wide totals for the active district plan (used in tooltip shares)
let stateTotals = $state<StateTotals | null>(null);

// Census ACS demographics for the active chamber
let chamberDemographics = $state<ChamberDemographics | null>(null);
let demographicsTotals  = $state<DemographicsTotals | null>(null);

// Map instance — plain var (not reactive) for imperative map calls
let mapInstance: mapboxgl.Map | null = null;

export function getMapInstance() { return mapInstance; }
export function setMapInstance(m: mapboxgl.Map | null) { mapInstance = m; }

// Hovered district feature properties
let hoveredDistrict = $state<{
  properties: DistrictProperties;
  tooltipTitle: string;
} | null>(null);

export function getAppConfig() {
  return appConfig;
}

export function setAppConfig(config: AppConfig) {
  appConfig = config;
}

export function getMapState() {
  return mapState;
}

export function setLevel(level: string) {
  mapState.level = level;
}

export function setMeasure(measure: string) {
  mapState.measure = measure;
}

export function setShowDistrict(show: boolean) {
  mapState.showDistrict = show;
}

export function setShowCity(show: boolean) {
  mapState.showCity = show;
}

export function setShowCounty(show: boolean) {
  mapState.showCounty = show;
}

export function setShowPrecinct(show: boolean) {
  mapState.showPrecinct = show;
}

export function getStateTotals() { return stateTotals; }
export function setStateTotals(totals: StateTotals) { stateTotals = totals; }

export function getChamberDemographics() { return chamberDemographics; }
export function getDemographicsTotals()  { return demographicsTotals; }

export function setDemographics(data: ChamberDemographics | null) {
  chamberDemographics = data;
  if (!data) { demographicsTotals = null; return; }

  const t: DemographicsTotals = {
    poverty_count: 0, bachelors_plus_count: 0,
    married_hh_count: 0, single_parent_count: 0,
    no_vehicle_count: 0, uninsured_count: 0,
    unemployed_count: 0, labor_force_count: 0,
    maxMedianIncome: 0, maxPctPoverty: 0,
    maxPctBachelors: 0, maxPctMarried: 0, maxPctSingleParent: 0,
    maxPctNoVehicle: 0, maxPctUninsured: 0, maxPctUnemployed: 0,
  };
  for (const d of Object.values(data)) {
    t.poverty_count        += d.poverty_count        ?? 0;
    t.bachelors_plus_count += d.bachelors_plus_count ?? 0;
    t.married_hh_count     += d.married_hh_count     ?? 0;
    t.single_parent_count  += d.single_parent_count  ?? 0;
    t.no_vehicle_count     += d.no_vehicle_count     ?? 0;
    t.uninsured_count      += d.uninsured_count      ?? 0;
    t.unemployed_count     += d.unemployed_count     ?? 0;
    t.labor_force_count    += d.labor_force_count    ?? 0;
    if ((d.median_income      ?? 0) > t.maxMedianIncome)    t.maxMedianIncome    = d.median_income      ?? 0;
    if ((d.pct_poverty        ?? 0) > t.maxPctPoverty)      t.maxPctPoverty      = d.pct_poverty        ?? 0;
    if ((d.pct_bachelors_plus ?? 0) > t.maxPctBachelors)    t.maxPctBachelors    = d.pct_bachelors_plus ?? 0;
    if ((d.pct_married_family ?? 0) > t.maxPctMarried)      t.maxPctMarried      = d.pct_married_family ?? 0;
    if ((d.pct_single_parent  ?? 0) > t.maxPctSingleParent) t.maxPctSingleParent = d.pct_single_parent  ?? 0;
    if ((d.pct_no_vehicle     ?? 0) > t.maxPctNoVehicle)    t.maxPctNoVehicle    = d.pct_no_vehicle     ?? 0;
    if ((d.pct_uninsured      ?? 0) > t.maxPctUninsured)    t.maxPctUninsured    = d.pct_uninsured      ?? 0;
    if ((d.pct_unemployed     ?? 0) > t.maxPctUnemployed)   t.maxPctUnemployed   = d.pct_unemployed     ?? 0;
  }
  demographicsTotals = t;
}

export function getHoveredDistrict() {
  return hoveredDistrict;
}

export function setHoveredDistrict(
  data: { properties: DistrictProperties; tooltipTitle: string } | null,
) {
  hoveredDistrict = data;
}

let locationCounty = $state<string | null>(null);
let locationPrecinct = $state<LocationPrecinct | null>(null);

export function getLocationCounty()           { return locationCounty; }
export function setLocationCounty(v: string | null) { locationCounty = v; }
export function getLocationPrecinct()         { return locationPrecinct; }
export function setLocationPrecinct(v: LocationPrecinct | null) { locationPrecinct = v; }

let isPinned = $state(false);
export function getIsPinned()           { return isPinned; }
export function setIsPinned(v: boolean) { isPinned = v; }
