import React, { useState, useEffect, useRef } from "react";

// Radius of the Earth in meters
const R = 6371e3;

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

const getOffsets = (lat1, lon1, lat2, lon2) => {
  const dy = (lat2 - lat1) * 111320;
  const dx = (lon2 - lon1) * (111320 * Math.cos(lat1 * (Math.PI / 180)));
  return { dx, dy };
};

export default function GeofenceRadar() {
  const [targetLat, setTargetLat] = useState("");
  const [targetLng, setTargetLng] = useState("");

  const [tracking, setTracking] = useState(false);
  const [deviceLoc, setDeviceLoc] = useState(null);
  const [statusMsg, setStatusMsg] = useState(
    "System idle. Awaiting coordinates.",
  );

  const watchIdRef = useRef(null);

  // SVG Viewport constraints
  const RADAR_RANGE_M = 100;
  const GEOFENCE_RADIUS_M = 50;

  const startTracking = () => {
    if (!targetLat || !targetLng || isNaN(targetLat) || isNaN(targetLng)) {
      setStatusMsg("ERR: Invalid target coordinates.");
      return;
    }

    if (!navigator.geolocation) {
      setStatusMsg("ERR: Geolocation hardware missing.");
      return;
    }

    setTracking(true);
    setStatusMsg("Establishing GPS lock...");

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;

        if (accuracy > 50) {
          setStatusMsg(
            `WARN: Signal weak. Margin of error: ${Math.round(accuracy)}m.`,
          );
          setDeviceLoc({
            lat: latitude,
            lng: longitude,
            accuracy,
            distance: null,
          });
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
          setStatusMsg("SUCCESS: Target inside geofence perimeter.");
        } else {
          setStatusMsg(`TRACKING: Target is ${Math.round(distance)}m out.`);
        }
      },
      (error) => {
        setTracking(false);
        setStatusMsg(`ERR: ${error.message}`);
      },
      {
        enableHighAccuracy: true,
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
    setStatusMsg("Uplink terminated.");
  };

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null)
        navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, []);

  // SVG Coordinate mapping
  // Center of SVG is 100,100
  let deviceX = 100;
  let deviceY = 100;
  let accuracyR = 0;

  if (deviceLoc && targetLat && targetLng) {
    const { dx, dy } = getOffsets(
      parseFloat(targetLat),
      parseFloat(targetLng),
      deviceLoc.lat,
      deviceLoc.lng,
    );

    deviceX = 100 + dx;
    deviceY = 100 - dy;
    accuracyR = deviceLoc.accuracy;
  }

  const isSuccess =
    deviceLoc?.distance !== null && deviceLoc?.distance <= GEOFENCE_RADIUS_M;

  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto p-6 bg-slate-950 text-emerald-500 font-mono rounded-xl shadow-2xl border border-slate-800">
      <div className="w-full flex justify-between items-center mb-6 border-b border-emerald-900/50 pb-2">
        <h2 className="text-lg font-bold tracking-widest uppercase">
          Geofence Uplink
        </h2>
        <span className="text-xs bg-slate-900 px-2 py-1 rounded text-emerald-600">
          v2.1.0
        </span>
      </div>

      <div className="w-full space-y-4 mb-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] uppercase tracking-wider mb-1 text-slate-500">
              Latitude
            </label>
            <input
              type="number"
              value={targetLat}
              onChange={(e) => setTargetLat(e.target.value)}
              disabled={tracking}
              className="w-full bg-slate-900 text-emerald-400 p-2 text-sm rounded border border-slate-700 focus:border-emerald-500 outline-none placeholder-slate-700"
              placeholder="20.2960"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider mb-1 text-slate-500">
              Longitude
            </label>
            <input
              type="number"
              value={targetLng}
              onChange={(e) => setTargetLng(e.target.value)}
              disabled={tracking}
              className="w-full bg-slate-900 text-emerald-400 p-2 text-sm rounded border border-slate-700 focus:border-emerald-500 outline-none placeholder-slate-700"
              placeholder="85.8245"
            />
          </div>
        </div>
      </div>

      <div className="flex w-full gap-4 mb-8">
        {!tracking ? (
          <button
            onClick={startTracking}
            className="flex-1 bg-emerald-900/40 hover:bg-emerald-800/60 border border-emerald-700 text-emerald-400 font-bold py-2 px-4 rounded text-sm uppercase tracking-wider transition-all"
          >
            Initiate Scan
          </button>
        ) : (
          <button
            onClick={stopTracking}
            className="flex-1 bg-red-900/40 hover:bg-red-800/60 border border-red-700 text-red-400 font-bold py-2 px-4 rounded text-sm uppercase tracking-wider transition-all"
          >
            Abort Tracking
          </button>
        )}
      </div>

      {/* Radar Canvas Container */}
      <div className="relative w-72 h-72 rounded-full border-4 border-slate-800 overflow-hidden bg-slate-900 shadow-[0_0_30px_rgba(16,185,129,0.1)] flex items-center justify-center mb-6">
        {/* The SVG Plane */}
        <svg
          viewBox="0 0 200 200"
          className="absolute inset-0 w-full h-full z-10"
        >
          <defs>
            {/* The geofence boundary used as a mask for the overlap */}
            <clipPath id="geofence-clip">
              <circle cx="100" cy="100" r={GEOFENCE_RADIUS_M} />
            </clipPath>
          </defs>

          {/* Grid lines */}
          <line
            x1="100"
            y1="0"
            x2="100"
            y2="200"
            stroke="#064e3b"
            strokeWidth="1"
          />
          <line
            x1="0"
            y1="100"
            x2="200"
            y2="100"
            stroke="#064e3b"
            strokeWidth="1"
          />

          {/* Outer Range Ring (100m) */}
          <circle
            cx="100"
            cy="100"
            r="99"
            fill="none"
            stroke="#064e3b"
            strokeWidth="1"
          />

          {/* Geofence Target Ring (50m) */}
          <circle
            cx="100"
            cy="100"
            r={GEOFENCE_RADIUS_M}
            fill="rgba(16, 185, 129, 0.05)"
            stroke="#10b981"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />
          {/* Target Center Point */}
          <circle cx="100" cy="100" r="2" fill="#10b981" />

          {/* Device Location Rendering */}
          {deviceLoc && (
            <g className="transition-all duration-700 ease-linear">
              {/* Device Base Accuracy Radius */}
              <circle
                cx={deviceX}
                cy={deviceY}
                r={accuracyR}
                fill={
                  isSuccess
                    ? "rgba(56, 189, 248, 0.15)"
                    : "rgba(239, 68, 68, 0.15)"
                }
                stroke={
                  isSuccess
                    ? "rgba(56, 189, 248, 0.4)"
                    : "rgba(239, 68, 68, 0.4)"
                }
                strokeWidth="1"
              />

              {/* Device Accuracy OVERLAP Highlighting */}
              <circle
                cx={deviceX}
                cy={deviceY}
                r={accuracyR}
                fill={
                  isSuccess
                    ? "rgba(56, 189, 248, 0.4)"
                    : "rgba(245, 158, 11, 0.4)"
                }
                clipPath="url(#geofence-clip)"
              />

              {/* Device Dot */}
              <circle
                cx={deviceX}
                cy={deviceY}
                r="3"
                fill={isSuccess ? "#38bdf8" : "#ef4444"}
              />
            </g>
          )}
        </svg>

        {/* CSS Sweep Animation Layer (Stays behind SVG data if needed, or in front for visual effect) */}
        {tracking && (
          <div
            className="absolute inset-0 rounded-full border-t border-emerald-400 z-20 mix-blend-screen pointer-events-none"
            style={{
              animation: "spin 3s linear infinite",
              background:
                "conic-gradient(from 0deg, transparent 75%, rgba(16, 185, 129, 0.25) 100%)",
            }}
          ></div>
        )}
      </div>

      {/* Terminal Log */}
      <div className="w-full bg-black p-3 rounded border border-slate-800 flex items-center justify-start h-16 overflow-hidden relative">
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-700"></div>
        <p
          className={`text-xs pl-2 font-mono tracking-tight ${isSuccess ? "text-sky-400" : "text-emerald-500"}`}
        >
          <span className="opacity-50">&gt;_ </span>
          {statusMsg}
        </p>
      </div>

      <style jsx>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
