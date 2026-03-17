import type { AppConfig, DistrictPlan, Overlay } from '../types';
import type mapboxgl from 'mapbox-gl';

type SourceSpec = mapboxgl.SourceSpecification;
type LayerSpec = mapboxgl.LayerSpecification;

function stopsToStep(property: string, stops: [number, string][], defaultColor: string): any[] {
  const expr: any[] = ['step', ['get', property], defaultColor];
  for (const [val, color] of stops) {
    expr.push(val, color);
  }
  return expr;
}

/**
 * Generate all Mapbox sources from the app config.
 */
export function generateSources(config: AppConfig): Record<string, SourceSpec> {
  const sources: Record<string, SourceSpec> = {};

  // District plan GeoJSON sources
  for (const plan of config.districtPlans) {
    sources[`src_${plan.id}`] = {
      type: 'geojson',
      data: `/data/${plan.geojson}`,
    };
  }

  // Boundary sources
  sources['src_cities'] = {
    type: 'geojson',
    data: `/data/${config.boundaries.cities.geojson}`,
  };
  sources['src_counties'] = {
    type: 'geojson',
    data: `/data/${config.boundaries.counties.geojson}`,
  };

  // Vector tileset sources
  for (const [key, ts] of Object.entries(config.tilesets)) {
    sources[`src_${key}`] = {
      type: 'vector',
      url: ts.url,
    };
  }

  return sources;
}

/**
 * Generate 4 layers per district plan: line, fill, hover, popup.
 */
function districtLayers(plan: DistrictPlan): LayerSpec[] {
  const src = `src_${plan.id}`;
  const prop = plan.districtProp;

  return [
    {
      id: plan.id,
      source: src,
      type: 'line',
      layout: { visibility: 'none' },
      paint: { 'line-color': '#444444', 'line-width': 2 },
    } as LayerSpec,
    {
      id: `${plan.id}_fill`,
      source: src,
      type: 'fill',
      layout: { visibility: 'none' },
      paint: { 'fill-opacity': 1 },
    } as LayerSpec,
    {
      id: `${plan.id}_hover`,
      source: src,
      type: 'line',
      layout: {},
      paint: { 'line-color': '#c90000', 'line-width': 4 },
      filter: ['==', prop, ''],
    } as LayerSpec,
    {
      id: `${plan.id}_popup`,
      source: src,
      type: 'fill',
      layout: { visibility: 'visible' },
      paint: { 'fill-opacity': 0 },
    } as LayerSpec,
  ];
}

/**
 * Generate demographic overlay layers (tract, block, precinct).
 */
function overlayLayers(config: AppConfig): LayerSpec[] {
  const layers: LayerSpec[] = [];
  const ts = config.tilesets;

  for (const overlay of config.overlays) {
    if (!overlay.colorStops || !overlay.layers) continue;

    for (const layerId of overlay.layers) {
      let source: string;
      let sourceLayer: string;
      let minzoom: number | undefined;
      let maxzoom: number | undefined;

      if (layerId.startsWith('tract_')) {
        source = 'src_tract';
        sourceLayer = ts.tract.sourceLayer;
        maxzoom = 11;
      } else if (layerId.startsWith('block_')) {
        source = 'src_block';
        sourceLayer = ts.block.sourceLayer;
        minzoom = 11;
      } else if (layerId.startsWith('precinct_')) {
        source = 'src_precinct';
        sourceLayer = ts.precinct.sourceLayer;
      } else {
        continue;
      }

      const fillExpr = stopsToStep(overlay.property, overlay.colorStops.fill as [number, string][], 'rgba(0,0,0,0)');
      const outlineExpr = stopsToStep(overlay.property, overlay.colorStops.outline as [number, string][], 'rgba(0,0,0,0)');
      const layer: any = {
        id: layerId,
        type: 'fill',
        source,
        'source-layer': sourceLayer,
        layout: { visibility: 'none' },
        paint: {
          'fill-color': fillExpr,
          'fill-opacity': 0.75,
          'fill-outline-color': outlineExpr,
        },
      };

      if (minzoom !== undefined) layer.minzoom = minzoom;
      if (maxzoom !== undefined) layer.maxzoom = maxzoom;

      layers.push(layer as LayerSpec);
    }
  }

  return layers;
}

/**
 * Generate boundary layers (counties, cities).
 */
function boundaryLayers(config: AppConfig): LayerSpec[] {
  const b = config.boundaries;
  return [
    {
      id: 'county_borders',
      type: 'line',
      source: 'src_counties',
      layout: { visibility: 'none' },
      paint: { 'line-color': b.counties.lineColor, 'line-width': b.counties.lineWidth },
    } as LayerSpec,
    {
      id: 'county_fill',
      type: 'fill',
      source: 'src_counties',
      layout: { visibility: 'visible' },
      paint: { 'fill-opacity': 0 },
    } as LayerSpec,
    {
      id: 'city_borders',
      type: 'line',
      source: 'src_cities',
      layout: { visibility: 'none' },
      paint: { 'line-color': b.cities.lineColor, 'line-width': b.cities.lineWidth },
    } as LayerSpec,
    {
      id: 'city_borders_fill',
      type: 'fill',
      source: 'src_cities',
      minzoom: b.cities.fillMinZoom,
      layout: { visibility: 'none' },
      paint: {
        'fill-outline-color': b.cities.fillColor,
        'fill-color': b.cities.fillColor,
        'fill-opacity': b.cities.fillOpacity,
      },
    } as LayerSpec,
  ];
}

/**
 * Generate all layers in correct order (boundary, district, overlay).
 */
export function generateLayers(config: AppConfig): LayerSpec[] {
  const layers: LayerSpec[] = [];

  // Boundaries first (bottom)
  layers.push(...boundaryLayers(config));

  // District plans
  for (const plan of config.districtPlans) {
    layers.push(...districtLayers(plan));
  }

  // Demographic overlays on top
  layers.push(...overlayLayers(config));

  // Precinct boundary outlines — toggled independently of the data overlay
  layers.push({
    id: 'precinct_borders',
    type: 'line',
    source: 'src_precinct',
    'source-layer': config.tilesets.precinct.sourceLayer,
    layout: { visibility: 'none' },
    paint: { 'line-color': '#666666', 'line-width': 0.6, 'line-opacity': 0.7 },
  } as LayerSpec);

  return layers;
}
