/**
 * PANGEA CARBON — Sentinel-2 Satellite Verification Service
 * API RÉELLE: Copernicus Data Space Ecosystem (ESA)
 *   - https://dataspace.copernicus.eu/
 *   - Données Sentinel-2 L2A (12 bandes spectrales, résolution 10m)
 *   - NDVI: (NIR - RED) / (NIR + RED) = B08 - B04 / B08 + B04
 *   - Gratuit jusqu'à 100 requests/min avec compte
 *
 * Fallback: NASA POWER API (météo/irradiance, 100% public)
 * Production: Sentinel Hub API ($) pour accès programmatique complet
 */

const COPERNICUS_CATALOG_URL = 'https://catalogue.dataspace.copernicus.eu/odata/v1';
const SENTINEL_HUB_URL = 'https://services.sentinel-hub.com';
const NASA_POWER_URL = 'https://power.larc.nasa.gov/api/temporal/monthly/point';

/**
 * Rechercher des images Sentinel-2 disponibles pour une zone
 * API publique Copernicus - pas d'authentification requise pour la recherche
 */
async function searchSentinel2Images({ lat, lon, startDate, endDate, maxCloudCover = 30 }) {
  try {
    // Bouding box ~10km autour du point
    const delta = 0.05; // ~5.5km
    const bbox = `${lon-delta},${lat-delta},${lon+delta},${lat+delta}`;
    const url = `${COPERNICUS_CATALOG_URL}/Products?$filter=`
      + `Collection/Name eq 'SENTINEL-2' `
      + `and OData.CSC.Intersects(area=geography'SRID=4326;POINT(${lon} ${lat})') `
      + `and ContentDate/Start gt ${startDate}T00:00:00.000Z `
      + `and ContentDate/Start lt ${endDate}T23:59:59.000Z `
      + `and Attributes/OData.CSC.DoubleAttribute/any(att:att/Name eq 'cloudCover' `
      + `  and att/OData.CSC.DoubleAttribute/Value lt ${maxCloudCover})`
      + `&$top=10&$orderby=ContentDate/Start desc`;

    const res = await fetch(encodeURI(url), {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(12000),
    });

    if (!res.ok) return { products: [], source: 'copernicus_unavailable' };
    const data = await res.json();

    const products = (data.value || []).map(p => ({
      id:          p.Id,
      name:        p.Name,
      date:        p.ContentDate?.Start?.split('T')[0],
      cloudCover:  p.Attributes?.find(a => a.Name === 'cloudCover')?.Value,
      size:        p.ContentLength,
      thumbnail:   p.Assets?.find(a => a.Type === 'thumbnail')?.DownloadLink,
      downloadLink: p.Assets?.find(a => a.Type === 'product')?.DownloadLink,
      platform:   'Sentinel-2',
      resolution: '10m',
      bands:      ['B02','B03','B04','B08','B11','B12'],
    }));

    return {
      products,
      total: data['@odata.count'] || products.length,
      source: 'copernicus_dataspace_live',
      requestedArea: `${lat.toFixed(3)},${lon.toFixed(3)} ± 5km`,
      dateRange: `${startDate} → ${endDate}`,
    };
  } catch(e) {
    return { products: [], source: 'copernicus_error', error: e.message };
  }
}

/**
 * NASA POWER API - Irradiance solaire et météo
 * 100% public, pas d'auth, résolution 0.5°, historique depuis 1981
 * Paramètres: ALLSKY_SFC_SW_DWN (irradiance globale), T2M (température)
 */
async function fetchNASAPowerData({ lat, lon, year = new Date().getFullYear() - 1 }) {
  try {
    const params = new URLSearchParams({
      parameters: 'ALLSKY_SFC_SW_DWN,T2M,WS10M,PRECTOTCORR',
      community: 'RE',
      longitude: lon,
      latitude: lat,
      start: year,
      end: year,
      format: 'JSON',
    });

    const res = await fetch(`${NASA_POWER_URL}?${params}`, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) return null;
    const data = await res.json();
    const props = data?.properties?.parameter || {};

    const irradiance = props.ALLSKY_SFC_SW_DWN || {};
    const temp = props.T2M || {};

    // Agréger les données mensuelles
    const monthlyIrradiance = Object.entries(irradiance)
      .filter(([k]) => k.endsWith('01') || k.endsWith('02') || k.length === 6)
      .map(([month, val]) => ({
        month: month.slice(4,6),
        irradiance_kwh_m2_day: parseFloat((val || 0).toFixed(3)),
        temp_c: parseFloat((temp[month] || 0).toFixed(1)),
      }))
      .filter(m => m.month && parseInt(m.month) >= 1 && parseInt(m.month) <= 12);

    const annualIrradiance = monthlyIrradiance.reduce((s, m) => s + m.irradiance_kwh_m2_day * 30.4, 0);

    return {
      location: { lat, lon },
      year,
      monthlyData: monthlyIrradiance,
      annualIrradiance_kWh_m2: parseFloat(annualIrradiance.toFixed(1)),
      avgTemp_c: parseFloat((monthlyIrradiance.reduce((s,m)=>s+m.temp_c,0) / monthlyIrradiance.length).toFixed(1)),
      source: 'NASA_POWER_API',
      resolution: '0.5°',
      dataQuality: 'GEOS-5.12.4 reanalysis',
      note: 'Used for baseline irradiance verification and capacity factor validation',
    };
  } catch(e) {
    return { error: e.message, source: 'nasa_power_error' };
  }
}

/**
 * Calculer le NDVI théorique pour un site solaire (validation production)
 * NDVI ~ 0 sur panneaux solaires (réflectance NIR faible)
 * Permet de détecter: ombrage végétation, encrassement, déclassement
 */
async function calculateSiteNDVI({ lat, lon, startDate, endDate }) {
  const images = await searchSentinel2Images({ lat, lon, startDate, endDate, maxCloudCover: 20 });
  const nasaData = await fetchNASAPowerData({ lat, lon });

  // Sentinel Hub Eval Script pour NDVI (si configuré)
  const clientId = process.env.SENTINEL_HUB_CLIENT_ID;
  let ndviData = null;

  if (clientId) {
    try {
      // Auth avec Sentinel Hub
      const tokenRes = await fetch(`${SENTINEL_HUB_URL}/oauth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: clientId,
          client_secret: process.env.SENTINEL_HUB_CLIENT_SECRET || '',
        }),
        signal: AbortSignal.timeout(8000),
      });

      if (tokenRes.ok) {
        const { access_token } = await tokenRes.json();
        const delta = 0.03;

        const statsRes = await fetch(`${SENTINEL_HUB_URL}/api/v1/statistics`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            input: {
              bounds: {
                bbox: [lon-delta, lat-delta, lon+delta, lat+delta],
                properties: { crs: 'http://www.opengis.net/def/crs/EPSG/0/4326' }
              },
              data: [{ type: 'sentinel-2-l2a', dataFilter: { maxCloudCoverage: 20 } }],
              timeRange: { from: startDate + 'T00:00:00Z', to: endDate + 'T23:59:59Z' }
            },
            aggregation: {
              timeRange: { from: startDate + 'T00:00:00Z', to: endDate + 'T23:59:59Z' },
              aggregationInterval: { of: 'P30D' },
              evalscript: `
                //VERSION=3
                function setup() { return { input: ['B04','B08','dataMask'], output: { bands: 1 } }; }
                function evaluatePixel(s) {
                  let ndvi = (s.B08 - s.B04) / (s.B08 + s.B04);
                  return [ndvi * s.dataMask];
                }
              `,
              resx: 0.0001, resy: 0.0001,
            },
            calculations: { default: { statistics: { default: { percentiles: { k: [25,50,75] } } } } }
          }),
          signal: AbortSignal.timeout(20000),
        });

        if (statsRes.ok) {
          const stats = await statsRes.json();
          ndviData = stats?.data?.[0]?.outputs?.default?.bands?.B0;
        }
      }
    } catch(_e) {}
  }

  // Score dMRV basé sur les données disponibles
  const imageCount = images.products.length;
  const hasRecentData = imageCount > 0;
  const avgCloudCover = images.products.reduce((s, p) => s + (p.cloudCover || 50), 0) / Math.max(imageCount, 1);
  const dataCompleteness = Math.min(100, imageCount * 8.3); // 12 images/an = 100%

  const dMRVScore = Math.round(
    (hasRecentData ? 30 : 0) +
    (dataCompleteness * 0.4) +
    (ndviData ? 30 : 0) +
    (nasaData && !nasaData.error ? 20 : 0) -
    (avgCloudCover * 0.1)
  );

  return {
    location: { lat, lon },
    period: { start: startDate, end: endDate },
    sentinel2: {
      imagesFound: imageCount,
      products: images.products.slice(0, 5),
      avgCloudCover: parseFloat(avgCloudCover.toFixed(1)),
      source: images.source,
    },
    ndvi: ndviData ? {
      mean: parseFloat((ndviData.mean || 0).toFixed(4)),
      p25: parseFloat((ndviData.percentiles?.['25.0'] || 0).toFixed(4)),
      p75: parseFloat((ndviData.percentiles?.['75.0'] || 0).toFixed(4)),
      interpretation: ndviData.mean < 0.1 ? 'Bare soil / panels detected' : ndviData.mean < 0.3 ? 'Sparse vegetation' : 'Dense vegetation — possible shading',
      source: 'sentinel_hub_live',
    } : {
      source: 'sentinel_hub_not_configured',
      note: 'Configure SENTINEL_HUB_CLIENT_ID in Admin → Secrets for live NDVI',
    },
    nasa: nasaData,
    dMRVScore: Math.max(0, Math.min(100, dMRVScore)),
    dataCompleteness: parseFloat(dataCompleteness.toFixed(1)),
    certificationReady: dMRVScore >= 75,
    nextRecommendation: imageCount < 6
      ? `Need ${6 - imageCount} more clear-sky Sentinel-2 scenes for 6-month baseline`
      : 'Sufficient data for VVB verification — proceed to monitoring report',
  };
}

module.exports = { searchSentinel2Images, fetchNASAPowerData, calculateSiteNDVI };
