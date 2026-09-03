import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { FarmLocation, NearbyMarketLocation } from '../../types/api';
import { formatINR } from '../profit/ProfitComparison';

// Fix default Leaflet icon paths in React build contexts
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

// Custom simple CSS styles for custom markers
const farmIcon = new L.DivIcon({
  html: `<div class="w-7 h-7 bg-green-600 border-2 border-white rounded-full flex items-center justify-center text-white font-bold text-xs shadow-md">🏡</div>`,
  className: '',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

const marketIcon = new L.DivIcon({
  html: `<div class="w-7 h-7 bg-blue-600 border-2 border-white rounded-full flex items-center justify-center text-white font-bold text-xs shadow-md">🛒</div>`,
  className: '',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

// Component to dynamically re-center map when active coordinates change
function MapRecenter({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 12);
  }, [center, map]);
  return null;
}

interface FarmMapProps {
  farm: FarmLocation;
  markets: NearbyMarketLocation[];
  activeCenter: [number, number] | null;
  onSelectMarket: (lat: number, lng: number) => void;
}

export default function FarmMap({ farm, markets, activeCenter, onSelectMarket }: FarmMapProps) {
  const defaultCenter: [number, number] = [farm.latitude, farm.longitude];
  const centerPosition = activeCenter || defaultCenter;

  return (
    <div className="w-full h-[350px] rounded-2xl overflow-hidden border border-gray-200 shadow-inner relative z-10" data-testid="map-container">
      <MapContainer
        center={defaultCenter}
        zoom={12}
        scrollWheelZoom={false} // Disable scroll wheel zoom initially to prevent mobile scroll-trapping
        className="w-full h-full"
        role="region"
        aria-label="Interactive map showing farm location and nearby market yards"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Farm Marker */}
        <Marker position={[farm.latitude, farm.longitude]} icon={farmIcon}>
          <Popup>
            <div className="text-xs">
              <p className="font-bold text-green-700">{farm.farm_name || 'My Farm'}</p>
              <p className="text-gray-500">Center location coordinates</p>
            </div>
          </Popup>
        </Marker>

        {/* Market Markers */}
        {markets.map((market, idx) => (
          <Marker
            key={idx}
            position={[market.latitude, market.longitude]}
            icon={marketIcon}
            eventHandlers={{
              click: () => onSelectMarket(market.latitude, market.longitude),
            }}
          >
            <Popup>
              <div className="text-xs space-y-1">
                <p className="font-bold text-blue-700">{market.market_name}</p>
                <p className="text-gray-500">Distance: {market.distance_km} km</p>
                {market.current_price ? (
                  <p className="font-semibold text-gray-800">
                    Price: {formatINR(market.current_price)} / {market.price_unit || 'Quintal'}
                  </p>
                ) : (
                  <p className="text-red-500">Price unavailable</p>
                )}
              </div>
            </Popup>
          </Marker>
        ))}

        <MapRecenter center={centerPosition} />
      </MapContainer>
    </div>
  );
}
