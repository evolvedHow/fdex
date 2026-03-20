import type mapboxgl from 'mapbox-gl';
import type { AppConfig, DistrictPlan, Overlay } from '../types';
import { setHoveredDistrict, setLocationCounty, setLocationPrecinct } from '../stores/state.svelte';

/**
 * Register hover handlers for all district plans.
 * One mousemove + one mouseleave per plan — replaces 44 handlers from the original.
 */
export function registerHoverHandlers(map: mapboxgl.Map, plans: DistrictPlan[]) {
  for (const plan of plans) {
    const popupLayer = `${plan.id}_popup`;
    const hoverLayer = `${plan.id}_hover`;
    const prop = plan.districtProp;

    map.on('mousemove', popupLayer, (e) => {
      if (!e.features?.length) return;

      const feature = e.features[0];
      const districtVal = feature.properties?.[prop] ?? feature.properties?.['DISTRICT'] ?? '';

      map.setFilter(hoverLayer, ['==', prop, districtVal]);
      map.getCanvas().style.cursor = 'pointer';

      setHoveredDistrict({
        properties: feature.properties as any,
        tooltipTitle: plan.tooltipTitle,
      });

      // County
      const countyFeats = map.queryRenderedFeatures(e.point, { layers: ['county_fill'] });
      setLocationCounty(countyFeats[0]?.properties?.COUNTY ?? null);
      // Precinct
      const precinctFeats = map.queryRenderedFeatures(e.point, { layers: ['precinct_plean', 'precinct_borders'] });
      const pProps = precinctFeats[0]?.properties ?? null;
      setLocationPrecinct(pProps ? { ...pProps } : null);
    });

    map.on('mouseleave', popupLayer, () => {
      map.setFilter(hoverLayer, ['==', prop, '']);
      map.getCanvas().style.cursor = '';
      setHoveredDistrict(null);
      setLocationCounty(null);
      setLocationPrecinct(null);
    });
  }
}

/**
 * No-op: pin functionality removed. Called from MapView for compatibility.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function registerClickHandlers(_map: mapboxgl.Map, _plans: DistrictPlan[]) {}

/**
 * Show a specific district level, hiding all others.
 */
export function showLevel(map: mapboxgl.Map, levelId: string, plans: DistrictPlan[]) {
  // Hide all district line and popup layers
  for (const plan of plans) {
    setVisibility(map, plan.id, 'none');
    setVisibility(map, `${plan.id}_popup`, 'none');
    setVisibility(map, `${plan.id}_fill`, 'none');
  }

  // Show selected level
  setVisibility(map, levelId, 'visible');
  setVisibility(map, `${levelId}_popup`, 'visible');
}

/**
 * Show demographic overlay layers matching the selected measure.
 */
export function showMeasure(map: mapboxgl.Map, measure: string, overlays: Overlay[]) {
  // Hide all demo layers
  for (const overlay of overlays) {
    if (!overlay.layers) continue;
    for (const layerId of overlay.layers) {
      setVisibility(map, layerId, 'none');
    }
  }

  if (measure === 'streets') return;

  // Show matching layers and raise them to the top so they render above district fills/lines
  const overlay = overlays.find((o) => o.id === measure);
  if (!overlay?.layers) return;
  for (const layerId of overlay.layers) {
    setVisibility(map, layerId, 'visible');
    try { map.moveLayer(layerId); } catch { /* layer not yet added */ }
  }
}

/**
 * Convert [[value, color], ...] stops to a Mapbox GL JS v3 step expression.
 */
function stopsToStep(property: string, stops: [number, string][], defaultColor: string): any[] {
  const expr: any[] = ['step', ['get', property], defaultColor];
  for (const [val, color] of stops) {
    expr.push(val, color);
  }
  return expr;
}

/**
 * Apply district-level fill coloring based on the current measure.
 */
export function applyDistrictFill(
  map: mapboxgl.Map,
  levelId: string,
  measure: string,
  overlays: Overlay[],
) {
  const fillLayer = `${levelId}_fill`;
  const hoverLayer = `${levelId}_hover`;

  // Find the overlay for the current measure
  const overlay = overlays.find((o) => o.id === measure);
  if (!overlay?.colorStops || !overlay.property) {
    // For 'streets' or unknown, just hide the fill
    setVisibility(map, fillLayer, 'none');
    return;
  }

  map.setPaintProperty(
    fillLayer,
    'fill-color',
    stopsToStep(overlay.property, overlay.colorStops.fill as [number, string][], 'rgba(0,0,0,0)'),
  );

  map.setPaintProperty(
    fillLayer,
    'fill-outline-color',
    stopsToStep(overlay.property, overlay.colorStops.outline as [number, string][], 'rgba(200,200,200,1)'),
  );

  setVisibility(map, fillLayer, 'visible');

  // Raise fill → line → hover to the top so the entire state is coloured at any zoom.
  try { map.moveLayer(fillLayer); } catch { /* layer not yet ready */ }
  try { map.moveLayer(levelId); } catch { /* layer not yet ready */ }
  try { map.moveLayer(hoverLayer); } catch { /* layer not yet ready */ }

  // For precinct-based overlays, the district fill provides state-level fallback colour.
  // Re-raise the precinct tile layer(s) above the district stack so precinct detail
  // shows through when individual tiles are large enough to render (zoomed in).
  const isPrecinctOnly = overlay.layers?.every((l) => l.startsWith('precinct_'));
  if (isPrecinctOnly && overlay.layers) {
    for (const layerId of overlay.layers) {
      try { map.moveLayer(layerId); } catch { /* layer not yet ready */ }
    }
  }
}

/**
 * Hide district fill layer.
 */
export function hideDistrictFill(map: mapboxgl.Map, plans: DistrictPlan[]) {
  for (const plan of plans) {
    setVisibility(map, `${plan.id}_fill`, 'none');
  }
}

/**
 * Toggle city boundary layers.
 */
export function toggleCities(map: mapboxgl.Map, show: boolean) {
  const vis = show ? 'visible' : 'none';
  setVisibility(map, 'city_borders', vis);
  setVisibility(map, 'city_borders_fill', vis);
}

/**
 * Toggle county boundary layer.
 */
export function toggleCounties(map: mapboxgl.Map, show: boolean) {
  setVisibility(map, 'county_borders', show ? 'visible' : 'none');
}

/**
 * Toggle precinct boundary outlines.
 */
export function togglePrecincts(map: mapboxgl.Map, show: boolean) {
  setVisibility(map, 'precinct_borders', show ? 'visible' : 'none');
}

function setVisibility(map: mapboxgl.Map, layerId: string, visibility: 'visible' | 'none') {
  try {
    map.setLayoutProperty(layerId, 'visibility', visibility);
  } catch {
    // Layer may not exist yet
  }
}
