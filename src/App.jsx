import React, { useState, useEffect, useRef } from "react";

const R = 6371e3; // Earth radius in meters

// Math utilities
const toRad = (value) => (value * Math.PI) / 180;
const calculateDistance = (lat1, lon1, lat2, lon2) => {
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
  const dx = (lon2 - lon1) * (111320 * Math.cos(toRad(lat1)));
  return { dx, dy };
};

export default function App() {
  // Configuration State
  const [targetLat, setTargetLat] = useState("20.2961");
  const [targetLng, setTargetLng] = useState("85.8245");
  const [geofenceRadius, setGeofenceRadius] = useState(50);
  const [radarRange, setRadarRange] = useState(200);

  // Telemetry State
  const [tracking, setTracking] = useState(false);
  const [deviceLoc, setDeviceLoc] = useState(null);
  const [trail, setTrail] = useState([]);
  const [logs, setLogs] = useState([]);

  const watchIdRef = useRef(null);
  const logsEndRef = useRef(null);

  const addLog = (msg, type = "info") => {
    const timestamp = new Date().toISOString().split("T")[1].slice(0, -1);
    setLogs((prev) => [...prev.slice(-49), { time: timestamp, msg, type }]);
  };

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  const startTracking = () => {
    const tLat = parseFloat(targetLat);
    const tLng = parseFloat(targetLng);

    if (isNaN(tLat) || isNaN(tLng)) {
      addLog("ERR: Invalid coordinate syntax.", "error");
      return;
    }
    if (!navigator.geolocation) {
      addLog("FATAL: Geolocation hardware missing.", "error");
      return;
    }

    setTracking(true);
    setTrail([]);
    addLog("Uplink established. Awaiting GPS lock...", "info");

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy, speed, heading } =
          position.coords;
        const distance = calculateDistance(tLat, tLng, latitude, longitude);

        const locData = {
          lat: latitude,
          lng: longitude,
          accuracy,
          distance,
          speed,
          heading,
        };

        setDeviceLoc(locData);
        setTrail((prev) => [...prev.slice(-9), locData]);

        if (accuracy > 50) {
          addLog(
            `WARN: Degraded signal. Margin: ±${Math.round(accuracy)}m`,
            "warn",
          );
        } else if (distance <= geofenceRadius) {
          addLog(
            `ALERT: Target inside perimeter (${Math.round(distance)}m)`,
            "success",
          );
        } else {
          addLog(`PING: Target distance ${Math.round(distance)}m`, "info");
        }
      },
      (error) => {
        addLog(`SYS_ERR: ${error.message}`, "error");
        stopTracking();
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 },
    );
  };

  const stopTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setTracking(false);
    addLog("Uplink terminated by user.", "warn");
  };

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null)
        navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, []);

  // SVG Geometry Calculations
  const VIEWBOX_SIZE = 800;
  const CENTER = VIEWBOX_SIZE / 2;
  const scale = CENTER / radarRange;

  let deviceSvgX = CENTER;
  let deviceSvgY = CENTER;
  let accuracySvgR = 0;

  if (deviceLoc) {
    const { dx, dy } = getOffsets(
      parseFloat(targetLat),
      parseFloat(targetLng),
      deviceLoc.lat,
      deviceLoc.lng,
    );
    deviceSvgX = CENTER + dx * scale;
    deviceSvgY = CENTER - dy * scale;
    accuracySvgR = deviceLoc.accuracy * scale;
  }

  const isSuccess =
    deviceLoc?.distance !== null && deviceLoc?.distance <= geofenceRadius;

  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-950 text-emerald-500 font-mono flex flex-col lg:flex-row selection:bg-emerald-900 selection:text-emerald-100">
      {/* Background Grid Accent */}
      <div
        className="absolute inset-0 opacity-5 pointer-events-none z-0"
        style={{
          backgroundImage:
            "linear-gradient(#10b981 1px, transparent 1px), linear-gradient(90deg, #10b981 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      ></div>

      {/* LEFT PANEL: Controls & Telemetry (Fixed Width) */}
      <div className="lg:w-96 w-full h-full flex flex-col z-10 border-r border-slate-800 bg-slate-950/90 backdrop-blur">
        {/* Header */}
        <div className="p-6 border-b border-emerald-900 bg-black/40">
          <h1 className="text-2xl font-bold tracking-widest uppercase text-emerald-400">
            G-Fence CMD
          </h1>
          <p className="text-xs text-slate-500 uppercase tracking-widest mt-1">
            Status:{" "}
            {tracking ? (
              <span className="text-emerald-400 animate-pulse">ACTIVE</span>
            ) : (
              <span className="text-slate-500">STANDBY</span>
            )}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
          {/* Config Panel */}
          <div className="space-y-4">
            <h2 className="text-xs uppercase font-bold text-slate-400 tracking-wider border-b border-slate-800 pb-2">
              Target Coordinates
            </h2>
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] uppercase text-slate-500 mb-1">
                  Target LAT
                </label>
                <input
                  type="number"
                  value={targetLat}
                  onChange={(e) => setTargetLat(e.target.value)}
                  disabled={tracking}
                  className="w-full bg-black text-emerald-400 p-2 text-sm rounded border border-slate-800 focus:border-emerald-500 outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase text-slate-500 mb-1">
                  Target LNG
                </label>
                <input
                  type="number"
                  value={targetLng}
                  onChange={(e) => setTargetLng(e.target.value)}
                  disabled={tracking}
                  className="w-full bg-black text-emerald-400 p-2 text-sm rounded border border-slate-800 focus:border-emerald-500 outline-none transition-colors"
                />
              </div>
            </div>

            <h2 className="text-xs uppercase font-bold text-slate-400 tracking-wider border-b border-slate-800 pb-2 mt-6">
              Radar Parameters
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] uppercase text-slate-500 mb-1">
                  Radius (M)
                </label>
                <input
                  type="number"
                  value={geofenceRadius}
                  onChange={(e) => setGeofenceRadius(Number(e.target.value))}
                  disabled={tracking}
                  className="w-full bg-black text-emerald-400 p-2 text-sm rounded border border-slate-800 focus:border-emerald-500 outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase text-slate-500 mb-1">
                  Scope Range (M)
                </label>
                <input
                  type="number"
                  value={radarRange}
                  onChange={(e) => setRadarRange(Number(e.target.value))}
                  disabled={tracking}
                  className="w-full bg-black text-emerald-400 p-2 text-sm rounded border border-slate-800 focus:border-emerald-500 outline-none transition-colors"
                />
              </div>
            </div>

            <button
              onClick={tracking ? stopTracking : startTracking}
              className={`w-full py-4 mt-6 text-sm font-bold uppercase tracking-widest rounded transition-all ${
                tracking
                  ? "bg-red-950/80 border border-red-900 text-red-500 hover:bg-red-900/80 shadow-[0_0_15px_rgba(239,68,68,0.2)]"
                  : "bg-emerald-950/80 border border-emerald-900 text-emerald-500 hover:bg-emerald-900/80 hover:text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.1)]"
              }`}
            >
              {tracking ? "Terminate Tracking" : "Initialize Radar"}
            </button>
          </div>

          {/* Telemetry Stats */}
          <div className="pt-4">
            <h2 className="text-xs uppercase font-bold text-slate-400 tracking-wider border-b border-slate-800 pb-2 mb-4">
              Live Telemetry
            </h2>
            <div className="grid grid-cols-2 gap-y-6 gap-x-4 text-sm bg-black/40 p-4 rounded border border-slate-800/50">
              <div>
                <span className="block text-[10px] text-slate-600 uppercase mb-1">
                  Distance
                </span>
                <span
                  className={`text-lg font-bold ${isSuccess ? "text-sky-400" : "text-emerald-400"}`}
                >
                  {deviceLoc?.distance != null
                    ? `${deviceLoc.distance.toFixed(1)}m`
                    : "---"}
                </span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-600 uppercase mb-1">
                  Accuracy (±)
                </span>
                <span className="text-lg text-emerald-400">
                  {deviceLoc?.accuracy
                    ? `${deviceLoc.accuracy.toFixed(1)}m`
                    : "---"}
                </span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-600 uppercase mb-1">
                  Speed
                </span>
                <span className="text-lg text-emerald-400">
                  {deviceLoc?.speed
                    ? `${(deviceLoc.speed * 3.6).toFixed(1)} km/h`
                    : "0.0"}
                </span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-600 uppercase mb-1">
                  Heading
                </span>
                <span className="text-lg text-emerald-400">
                  {deviceLoc?.heading
                    ? `${deviceLoc.heading.toFixed(0)}°`
                    : "---"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Terminal Log */}
        <div className="h-48 bg-black border-t border-slate-800 flex flex-col shrink-0">
          <div className="bg-slate-900 text-[10px] px-3 py-1.5 text-slate-500 uppercase tracking-widest border-b border-slate-800 flex justify-between">
            <span>System Log</span>
            <span>v2.1.0</span>
          </div>
          <div className="flex-1 overflow-y-auto p-3 text-xs space-y-1.5 font-mono scrollbar-hide">
            {logs.length === 0 && (
              <p className="text-slate-700 animate-pulse">
                Awaiting commands...
              </p>
            )}
            {logs.map((log, i) => (
              <div
                key={i}
                className={`flex gap-3 ${
                  log.type === "error"
                    ? "text-red-500"
                    : log.type === "warn"
                      ? "text-amber-500"
                      : log.type === "success"
                        ? "text-sky-400"
                        : "text-emerald-600"
                }`}
              >
                <span className="opacity-50 shrink-0">[{log.time}]</span>
                <span className="break-words">{log.msg}</span>
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: Big Radar (Fills remaining space) */}
      <div className="flex-1 h-full flex items-center justify-center bg-black relative overflow-hidden z-10 p-8">
        {/* Radar Overlay Gradients */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.08)_0%,transparent_60%)] pointer-events-none"></div>

        {/* Scale Indicator */}
        <div className="absolute top-6 right-6 text-[10px] text-slate-600 text-right bg-black/50 p-2 rounded border border-slate-800">
          RADAR RANGE: {radarRange}M<br />
          GRID SCALE: {(radarRange / 4).toFixed(0)}M / RING
        </div>

        <div className="relative w-full max-w-[800px] aspect-square rounded-full border border-emerald-900/30 flex items-center justify-center shadow-[0_0_50px_rgba(16,185,129,0.05)]">
          <svg
            viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}
            className="absolute inset-0 w-full h-full"
          >
            {/* Axes */}
            <line
              x1={CENTER}
              y1="0"
              x2={CENTER}
              y2={VIEWBOX_SIZE}
              stroke="#064e3b"
              strokeWidth="1"
              opacity="0.5"
            />
            <line
              x1="0"
              y1={CENTER}
              x2={VIEWBOX_SIZE}
              y2={CENTER}
              stroke="#064e3b"
              strokeWidth="1"
              opacity="0.5"
            />

            {/* Distance Rings */}
            {[0.25, 0.5, 0.75, 1].map((mult) => (
              <circle
                key={mult}
                cx={CENTER}
                cy={CENTER}
                r={CENTER * mult}
                fill="none"
                stroke="#064e3b"
                strokeWidth="1"
                strokeDasharray={mult === 1 ? "" : "4 4"}
                opacity="0.6"
              />
            ))}

            {/* Geofence Boundary */}
            <circle
              cx={CENTER}
              cy={CENTER}
              r={geofenceRadius * scale}
              fill="rgba(16, 185, 129, 0.05)"
              stroke="#10b981"
              strokeWidth="1.5"
              strokeDasharray="6 4"
            />
            <circle cx={CENTER} cy={CENTER} r="4" fill="#10b981" />
            <text
              x={CENTER + 10}
              y={CENTER - 10}
              fill="#10b981"
              fontSize="12"
              fontFamily="monospace"
              fontWeight="bold"
            >
              TARGET
            </text>

            {/* Tracked Device */}
            {deviceLoc && (
              <g className="transition-all duration-1000 ease-out">
                {/* Trail */}
                {trail.length > 1 && (
                  <polyline
                    points={trail
                      .map((p) => {
                        const offsets = getOffsets(
                          parseFloat(targetLat),
                          parseFloat(targetLng),
                          p.lat,
                          p.lng,
                        );
                        return `${CENTER + offsets.dx * scale},${CENTER - offsets.dy * scale}`;
                      })
                      .join(" ")}
                    fill="none"
                    stroke={isSuccess ? "#38bdf8" : "#10b981"}
                    strokeWidth="2"
                    opacity="0.5"
                  />
                )}

                {/* Accuracy Radius */}
                <circle
                  cx={deviceSvgX}
                  cy={deviceSvgY}
                  r={accuracySvgR}
                  fill={
                    isSuccess
                      ? "rgba(56, 189, 248, 0.15)"
                      : "rgba(16, 185, 129, 0.15)"
                  }
                  stroke={isSuccess ? "#38bdf8" : "#10b981"}
                  strokeWidth="1"
                  opacity="0.4"
                />

                {/* Core Blip */}
                <circle
                  cx={deviceSvgX}
                  cy={deviceSvgY}
                  r="5"
                  fill={isSuccess ? "#38bdf8" : "#fff"}
                />

                {/* Ping Animation ring */}
                <circle
                  cx={deviceSvgX}
                  cy={deviceSvgY}
                  r="5"
                  fill="none"
                  stroke={isSuccess ? "#38bdf8" : "#fff"}
                  strokeWidth="1.5"
                >
                  <animate
                    attributeName="r"
                    from="5"
                    to="30"
                    dur="2s"
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="opacity"
                    from="1"
                    to="0"
                    dur="2s"
                    repeatCount="indefinite"
                  />
                </circle>

                <text
                  x={deviceSvgX + 12}
                  y={deviceSvgY + 5}
                  fill={isSuccess ? "#38bdf8" : "#fff"}
                  fontSize="12"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  UPLINK
                </text>
              </g>
            )}
          </svg>

          {/* Sweep Animation */}
          {tracking && (
            <div
              className="absolute inset-0 rounded-full mix-blend-screen pointer-events-none"
              style={{
                animation: "spin 4s linear infinite",
                background:
                  "conic-gradient(from 0deg, transparent 75%, rgba(16, 185, 129, 0.2) 100%)",
                borderRight: "2px solid rgba(16, 185, 129, 0.6)",
              }}
            ></div>
          )}
        </div>
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
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

        /* Ensure input number spinners are hidden for clean UI */
        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type="number"] {
          -moz-appearance: textfield;
        }
      `}</style>
    </div>
  );
}
