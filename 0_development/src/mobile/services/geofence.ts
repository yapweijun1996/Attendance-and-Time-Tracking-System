import type { GeoStatus } from "../types";

export interface OfficeGeofencePolicy {
  lat: number;
  lng: number;
  radiusM: number;
}

export interface GeoCaptureResult {
  status: GeoStatus;
  lat: number | null;
  lng: number | null;
  accuracyM: number | null;
  distanceM: number | null;
}

export const defaultOfficeGeofencePolicy: OfficeGeofencePolicy = {
  lat: 1.3521,
  lng: 103.8198,
  radiusM: 120,
};

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

export function calculateDistanceMeters(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number
): number {
  const earthRadiusM = 6_371_000;
  const deltaLat = toRadians(toLat - fromLat);
  const deltaLng = toRadians(toLng - fromLng);
  const originLat = toRadians(fromLat);
  const destinationLat = toRadians(toLat);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2) * Math.cos(originLat) * Math.cos(destinationLat);
  return 2 * earthRadiusM * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function evaluateGeofence(
  lat: number,
  lng: number,
  policy: OfficeGeofencePolicy
): { status: GeoStatus; distanceM: number } {
  const distanceM = Math.round(calculateDistanceMeters(lat, lng, policy.lat, policy.lng));
  return {
    status: distanceM <= policy.radiusM ? "IN_RANGE" : "OUT_OF_RANGE",
    distanceM,
  };
}

export function captureGeolocation(
  policy: OfficeGeofencePolicy = defaultOfficeGeofencePolicy
): Promise<GeoCaptureResult> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({
        status: "LOCATION_UNAVAILABLE",
        lat: null,
        lng: null,
        accuracyM: null,
        distanceM: null,
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        const evaluation = evaluateGeofence(latitude, longitude, policy);
        resolve({
          status: evaluation.status,
          lat: latitude,
          lng: longitude,
          accuracyM: accuracy,
          distanceM: evaluation.distanceM,
        });
      },
      () => {
        resolve({
          status: "LOCATION_UNAVAILABLE",
          lat: null,
          lng: null,
          accuracyM: null,
          distanceM: null,
        });
      },
      {
        enableHighAccuracy: false,
        timeout: 5000,
        maximumAge: 10_000,
      }
    );
  });
}
