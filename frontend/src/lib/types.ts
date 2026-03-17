export interface TilesetConfig {
  url: string;
  sourceLayer: string;
}

export interface DistrictPlan {
  id: string;
  label: string;
  geojson: string;
  chamber: 'senate' | 'house' | 'congress';
  districtProp: string;
  tooltipTitle: string;
  group: string;
  default?: boolean;
}

export interface LegendItem {
  label: string;
  color: string;
}

export interface OverlayLegend {
  title: string;
  items: LegendItem[];
}

export interface ColorStop {
  0: number;
  1: string;
}

export interface Overlay {
  id: string;
  label: string;
  property?: string;
  group: string | null;
  layers?: string[];
  colorStops?: {
    fill: [number, string][];
    outline: [number, string][];
  };
  legend?: OverlayLegend;
}

export interface BoundaryConfig {
  cities: {
    geojson: string;
    lineColor: string;
    lineWidth: number;
    fillColor: string;
    fillOpacity: number;
    fillMinZoom: number;
  };
  counties: {
    geojson: string;
    lineColor: string;
    lineWidth: number;
  };
}

export interface MapConfig {
  center: [number, number];
  zoom: { desktop: number; mobile: number };
  minZoom: number;
  maxZoom: number;
  style: string;
  geocoderBbox: [number, number, number, number];
  mobileBreakpoint: number;
}

export interface AppConfig {
  mapboxToken: string;
  map: MapConfig;
  tilesets: Record<string, TilesetConfig>;
  districtPlans: DistrictPlan[];
  overlays: Overlay[];
  boundaries: BoundaryConfig;
}

export interface DistrictProperties {
  district?: number | string;
  DISTRICT?: number | string;
  pop?: number;
  tvap?: number;
  pct_bvp?: number;
  pct_avp?: number;
  pct_hvp?: number;
  pct_bp_?: number;
  partisan?: number;
  [key: string]: unknown;
}

/** One district's Census ACS demographics record. */
export interface DistrictDemographics {
  median_income?: number | null;
  pct_poverty?: number | null;
  poverty_count?: number;
  pct_bachelors_plus?: number | null;
  bachelors_plus_count?: number;
  pct_male?: number | null;
  pct_female?: number | null;
  pct_married_family?: number | null;
  married_hh_count?: number;
  pct_single_parent?: number | null;
  single_parent_count?: number;
}

/** Keyed by district number as string ("1", "2", …). */
export type ChamberDemographics = Record<string, DistrictDemographics>;

/** State-wide totals + per-metric maxima derived from ChamberDemographics. */
export interface DemographicsTotals {
  poverty_count: number;
  bachelors_plus_count: number;
  married_hh_count: number;
  single_parent_count: number;
  maxMedianIncome: number;
  maxPctPoverty: number;
  maxPctBachelors: number;
  maxPctMarried: number;
  maxPctSingleParent: number;
}

export interface MapState {
  level: string;
  measure: string;
  showDistrict: boolean;
  showCity: boolean;
  showCounty: boolean;
  showPrecinct: boolean;
}

export interface LocationPrecinct {
  partisan?: number;
  [key: string]: unknown;
}

export interface StateTotals {
  pop: number;
  tvap: number;
  bvap: number;
  avap: number;
  hvap: number;
  bipocvap: number;
  // Maximum absolute value across all districts (for "largest" badge)
  maxPop: number;
  maxTvap: number;
  maxBvap: number;
  maxAvap: number;
  maxHvap: number;
  maxBipocvap: number;
}
