import React, { useState, useEffect, useRef } from "react";

// Radius of the Earth in meters
const R = 6371e3;

// Haversine formula to get exact distance in meters
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const toRad = (value) => (value * Math.PI) / 180;
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δφ = toRad(lat2 - lat1);
  const Δλ = toRad(lon2 - lon1);

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

// Flat-surface approximation to get X/Y offset in meters
const getOffsets = (lat1, lon1, lat2, lon2) => {
  const dy = (lat2 - lat1) * 111320; // Rough meters per degree lat
  const dx = (lon2 - lon1) * (111320 * Math.cos(lat1 * (Math.PI / 180)));
  return { dx, dy };
};

export default function GeofenceRadar() {
  const [targetLat, setTargetLat] = useState("");
  const [targetLng, setTargetLng] = useState("");

  const [tracking, setTracking] = useState(false);
  const [deviceLoc, setDeviceLoc] = useState(null);
  const [statusMsg, setStatusMsg] = useState("Idle. Enter target coordinates.");

  const watchIdRef = useRef(null);
  const RADAR_RANGE_M = 100; // How many meters from center to edge of radar
  const GEOFENCE_RADIUS_M = 50;

  const startTracking = () => {
    if (!targetLat || !targetLng || isNaN(targetLat) || isNaN(targetLng)) {
      setStatusMsg("Error: Invalid target coordinates.");
      return;
    }

    if (!navigator.geolocation) {
      setStatusMsg("Error: Geolocation not supported by this browser.");
      return;
    }

    setTracking(true);
    setStatusMsg("Waking up GPS hardware... waiting for lock.");

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;

        // Strategy: Filter out garbage signals
        if (accuracy > 50) {
          setStatusMsg(
            `GPS too weak. Accuracy: ${Math.round(accuracy)}m. Move outside.`,
          );
          // We still update state to show the massive margin of error on radar
          setDeviceLoc({ lat: latitude, lng: longitude, accuracy });
          return;
        }

        const distance = calculateDistance(
          parseFloat(targetLat),
          parseFloat(targetLng),
          latitude,
          longitude,
        );

        setDeviceLoc({ lat: latitude, lng: longitude, accuracy, distance });

        if (distance <= GEOFENCE_RADIUS_M) {
          setStatusMsg("Geofence Success: Target Acquired.");
        } else {
          setStatusMsg(`Tracking: ${Math.round(distance)}m away.`);
        }
      },
      (error) => {
        setTracking(false);
        setStatusMsg(`Error: ${error.message}`);
      },
      {
        enableHighAccuracy: true, // Non-negotiable
        maximumAge: 0,
        timeout: 15000,
      },
    );
  };

  const stopTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setTracking(false);
    setDeviceLoc(null);
    setStatusMsg("Tracking stopped.");
  };

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null)
        navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, []);

  // Calculate UI positions
  let deviceX = 50; // Center %
  let deviceY = 50; // Center %

  if (deviceLoc && targetLat && targetLng) {
    const { dx, dy } = getOffsets(
      parseFloat(targetLat),
      parseFloat(targetLng),
      deviceLoc.lat,
      deviceLoc.lng,
    );

    // Map offsets to percentages (50% is center, +/- 50% is edge)
    deviceX = 50 + (dx / RADAR_RANGE_M) * 50;
    deviceY = 50 - (dy / RADAR_RANGE_M) * 50; // Subtract because Y is inverted in CSS

    // Clamp to UI bounds so it doesn't fly off screen
    deviceX = Math.max(0, Math.min(100, deviceX));
    deviceY = Math.max(0, Math.min(100, deviceY));
  }

  const isSuccess = deviceLoc?.distance <= GEOFENCE_RADIUS_M;

  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto p-6 bg-gray-900 text-green-400 font-mono rounded-xl shadow-2xl">
      <h2 className="text-xl font-bold mb-4 text-white">Geofence Uplink</h2>

      {/* Input Section */}
      <div className="w-full space-y-3 mb-6">
        <div>
          <label className="block text-xs mb-1 text-gray-400">
            Target Latitude
          </label>
          <input
            type="number"
            value={targetLat}
            onChange={(e) => setTargetLat(e.target.value)}
            disabled={tracking}
            className="w-full bg-gray-800 text-white p-2 rounded border border-gray-700 focus:border-green-500 outline-none"
            placeholder="e.g. 20.2960"
          />
        </div>
        <div>
          <label className="block text-xs mb-1 text-gray-400">
            Target Longitude
          </label>
          <input
            type="number"
            value={targetLng}
            onChange={(e) => setTargetLng(e.target.value)}
            disabled={tracking}
            className="w-full bg-gray-800 text-white p-2 rounded border border-gray-700 focus:border-green-500 outline-none"
            placeholder="e.g. 85.8245"
          />
        </div>
      </div>

      {/* Controls */}
      <div className="flex w-full gap-4 mb-6">
        {!tracking ? (
          <button
            onClick={startTracking}
            className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded transition-colors"
          >
            Initiate Tracking
          </button>
        ) : (
          <button
            onClick={stopTracking}
            className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-4 rounded transition-colors"
          >
            Abort
          </button>
        )}
      </div>

      {/* Radar Display */}
      <div className="relative w-64 h-64 bg-gray-800 rounded-full border-2 border-green-500 overflow-hidden flex items-center justify-center mb-6 shadow-[0_0_15px_rgba(34,197,94,0.3)]">
        {/* Radar Rings & Crosshairs */}
        <div className="absolute w-full h-full rounded-full border border-green-800/50"></div>
        <div className="absolute w-1/2 h-1/2 rounded-full border border-green-500/50"></div>{" "}
        {/* 50m geofence line */}
        <div className="absolute w-full h-px bg-green-800/50"></div>
        <div className="absolute h-full w-px bg-green-800/50"></div>
        {/* Sweep Animation */}
        {tracking && (
          <div
            className="absolute w-full h-full rounded-full border-t-2 border-green-400 animate-spin"
            style={{
              animationDuration: "3s",
              background:
                "conic-gradient(from 0deg, transparent 70%, rgba(34, 197, 94, 0.2) 100%)",
            }}
          ></div>
        )}
        {/* Target Dot (Center) */}
        <div className="absolute w-3 h-3 bg-white rounded-full z-10 shadow-[0_0_10px_white]"></div>
        {/* Device Dot */}
        {deviceLoc && (
          <div
            className="absolute z-20 flex items-center justify-center transition-all duration-700 ease-in-out"
            style={{
              left: `${deviceX}%`,
              top: `${deviceY}%`,
              transform: "translate(-50%, -50%)",
            }}
          >
            {/* Accuracy Radius Indicator */}
            <div
              className={`absolute rounded-full border ${isSuccess ? "border-blue-400 bg-blue-400/20" : "border-red-400 bg-red-400/20"}`}
              style={{
                width: `${(deviceLoc.accuracy / RADAR_RANGE_M) * 100 * 2}%`,
                height: `${(deviceLoc.accuracy / RADAR_RANGE_M) * 100 * 2}%`,
              }}
            ></div>
            <div
              className={`w-3 h-3 rounded-full ${isSuccess ? "bg-blue-400" : "bg-red-500"} shadow-[0_0_10px_currentColor]`}
            ></div>
          </div>
        )}
      </div>

      {/* Status Log */}
      <div className="w-full bg-black p-3 rounded border border-gray-800 h-20 flex items-center justify-center text-center">
        <p
          className={`text-sm ${isSuccess ? "text-blue-400 font-bold animate-pulse" : "text-green-400"}`}
        >
          {statusMsg}
        </p>
      </div>
    </div>
  );
}
