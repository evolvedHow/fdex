import type mapboxgl from 'mapbox-gl';
import type { DistrictPlan, Overlay } from '../types';
import {
  setHoveredDistrict,
  setLocationCounty,
  setLocationPrecinct,
  setIsPinned,
  getIsPinned,
} from '../stores/state.svelte';

/**
 * Register hover handlers for all district plans.
 * When a district is pinned (click-selected), hover no longer changes the
 * highlight or sidebar — but cursor still updates for visual feedback.
 */
export function registerHoverHandlers(map: mapboxgl.Map, plans: DistrictPlan[]) {
  for (const plan of plans) {
    const popupLayer = `${plan.id}_popup`;
    const hoverLayer = `${plan.id}_hover`;
    const prop = plan.districtProp;

    map.on('mousemove', popupLayer, (e) => {
      if (!e.features?.length) return;

      map.getCanvas().style.cursor = 'pointer';

      if (getIsPinned()) return; // pinned: keep highlight and sidebar on clicked district

      const feature = e.features[0];
      const districtVal = feature.properties?.[prop] ?? feature.properties?.['DISTRICT'] ?? '';

      map.setFilter(hoverLayer, ['==', prop, districtVal]);

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
      map.getCanvas().style.cursor = '';
      if (getIsPinned()) return; // pinned: keep highlight and sidebar data
      map.setFilter(hoverLayer, ['==', prop, '']);
      setHoveredDistrict(null);
      setLocationCounty(null);
      setLocationPrecinct(null);
    });
  }
}

/**
 * Register click handlers: clicking a district pins the sidebar and highlight;
 * clicking anywhere outside all districts unpins and shows statewide data.
 */
export function registerClickHandlers(map: mapboxgl.Map, plans: DistrictPlan[]) {
  // Click on a district → pin
  for (const plan of plans) {
    map.on('click', `${plan.id}_popup`, (e) => {
      if (!e.features?.length) return;
      const feature = e.features[0];
      const districtVal =
        feature.properties?.[plan.districtProp] ?? feature.properties?.['DISTRICT'] ?? '';

      // Clear any previously-pinned hover filter before setting the new one
      for (const p of plans) {
        try { map.setFilter(`${p.id}_hover`, ['==', p.districtProp, '']); } catch { /* ok */ }
      }
      map.setFilter(`${plan.id}_hover`, ['==', plan.districtProp, districtVal]);

      setHoveredDistrict({ properties: feature.properties as any, tooltipTitle: plan.tooltipTitle });
      const countyFeats = map.queryRenderedFeatures(e.point, { layers: ['county_fill'] });
      setLocationCounty(countyFeats[0]?.properties?.COUNTY ?? null);
      const precinctFeats = map.queryRenderedFeatures(e.point, { layers: ['precinct_plean', 'precinct_borders'] });
      const pProps = precinctFeats[0]?.properties ?? null;
      setLocationPrecinct(pProps ? { ...pProps } : null);
      setIsPinned(true);
    });
  }

  // Click on empty map space → unpin and show statewide data
  map.on('click', (e) => {
    const hits = map.queryRenderedFeatures(e.point, {
      layers: plans.map((p) => `${p.id}_popup`),
    });
    if (!hits.length) {
      clearPin(map, plans);
    }
  });
}

/**
 * Clear pin: reset all hover filters, unpin state, clear sidebar.
 */
export function clearPin(map: mapboxgl.Map, plans: DistrictPlan[]) {
  for (const plan of plans) {
    try { map.setFilter(`${plan.id}_hover`, ['==', plan.districtProp, '']); } catch { /* ok */ }
  }
  setIsPinned(false);
  setHoveredDistrict(null);
  setLocationCounty(null);
  setLocationPrecinct(null);
}

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
 *
 * For precinct-only overlays (partisan lean): the precinct tile layer
 * provides all the colour. We hide the district fill and re-raise the
 * tile layer plus the district line/hover layers above it so boundaries
 * and the hover outline remain visible.
 *
 * For census overlays (bvap, hvap, …): colour the district fill polygon
 * and raise fill → line → hover to the top.
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

  // Precinct-only overlays: rely entirely on the tile layer for colour.
  // Order: precinct tiles → district lines → hover outline (top).
  const isPrecinctOnly = overlay.layers?.every((l) => l.startsWith('precinct_'));
  if (isPrecinctOnly) {
    setVisibility(map, fillLayer, 'none');
    if (overlay.layers) {
      for (const l of overlay.layers) { try { map.moveLayer(l); } catch { /* ok */ } }
    }
    try { map.moveLayer(levelId); } catch { /* ok */ }
    try { map.moveLayer(hoverLayer); } catch { /* ok */ }
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
