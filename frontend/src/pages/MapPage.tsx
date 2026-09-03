import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import FarmMap from '../components/map/FarmMap';
import Spinner from '../components/common/Spinner';
import ErrorState from '../components/common/ErrorState';
import EmptyState from '../components/common/EmptyState';
import Card from '../components/common/Card';
import { getFarmDetails, saveFarmDetails } from '../utils/storage';
import { getGeospatial, getMyFarms } from '../services/api';
import type { GeospatialResponse, NearbyMarketLocation } from '../types/api';
import { formatINR } from '../components/profit/ProfitComparison';

import { useApiState } from '../hooks/useApiState';

export default function MapPage() {
  const navigate = useNavigate();
  const [activeCenter, setActiveCenter] = useState<[number, number] | null>(null);
  const [farm, setFarm] = useState<any>(() => getFarmDetails());
  const [farmLoading, setFarmLoading] = useState<boolean>(!getFarmDetails());
  const apiState = useApiState<GeospatialResponse>();

  const fetchGeospatialData = async () => {
    let currentFarm = farm || getFarmDetails();
    if (!currentFarm) {
      setFarmLoading(true);
      try {
        if (typeof getMyFarms === 'function') {
          const farms = await getMyFarms();
          if (farms && farms.length > 0) {
            const primary = farms[0];
            currentFarm = {
              farm_id: primary.id,
              farm_name: primary.name || `Farm #${primary.id}`,
              land_area: primary.land_area_acre,
              current_crop: primary.current_crop?.name || 'Paddy',
              water_availability: primary.water_availability ? 'Available' : 'Limited',
              soil_type: primary.soil_type,
              district: primary.district,
              state: primary.state,
            };
            saveFarmDetails(currentFarm);
            setFarm(currentFarm);
          }
        }
      } catch (err) {
        console.error('Failed to fetch farm from API in MapPage', err);
      } finally {
        setFarmLoading(false);
      }
    }

    if (currentFarm && currentFarm.farm_id) {
      const result = await apiState.run(getGeospatial(currentFarm.farm_id));
      if (result?.farm?.latitude && result?.farm?.longitude) {
        setActiveCenter([result.farm.latitude, result.farm.longitude]);
      }
    }
  };

  useEffect(() => {
    fetchGeospatialData();
  }, []);

  const loading = apiState.loading || farmLoading;
  const error = apiState.error;
  const data = apiState.data;

  if (!farm && !farmLoading) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4">
        <EmptyState
          title="No Farm Profile Found"
          message="Please analyze your farm first to visualize geo-routing details."
          actionLabel="Go to Farm Analysis"
          onAction={() => window.location.assign('/analyze')}
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto py-8">
        <ErrorState message={error} onRetry={fetchGeospatialData} />
      </div>
    );
  }

  // Handle missing coordinates condition
  const hasCoordinates = data?.farm?.latitude && data?.farm?.longitude;

  if (!data || !hasCoordinates) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 leading-tight">
            Geospatial Mapping
          </h1>
          <p className="text-gray-600 mt-1">
            Visual route logistics mapping.
          </p>
        </div>
        <EmptyState
          title="Geospatial Coordinates Missing"
          description="We couldn't retrieve valid coordinates for your farm layout to map nearby markets."
          actionLabel="Update Location Profile"
          onAction={() => window.location.assign('/analyze')}
        />
        {/* Render listing backup if markets exist despite missing coordinates */}
        {data?.nearby_markets && data.nearby_markets.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-800">Nearby Market Registry</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.nearby_markets.map((market, idx) => (
                <Card key={idx} className="border-gray-200 bg-white">
                  <h4 className="font-extrabold text-gray-900 text-lg">{market.market_name}</h4>
                  <p className="text-sm text-gray-500 mt-1">Distance: {market.distance_km} km</p>
                  {market.current_price && (
                    <p className="text-sm font-bold text-primary-700 mt-2">
                      Price: {formatINR(market.current_price)} / {market.price_unit || 'Quintal'}
                    </p>
                  )}
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Sort distance list ascending
  const sortedMarkets = [...data.nearby_markets].sort((a, b) => a.distance_km - b.distance_km);

  const handleFocusMarket = (market: NearbyMarketLocation) => {
    setActiveCenter([market.latitude, market.longitude]);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-gray-900 leading-tight">
          Geospatial Mapping
        </h1>
        <p className="text-gray-600 mt-1">
          Spatial analysis routing to nearest market yards for maximum profits.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map panel */}
        <div className="lg:col-span-2 space-y-4">
          <FarmMap
            farm={data.farm}
            markets={data.nearby_markets}
            activeCenter={activeCenter}
            onSelectMarket={(lat, lng) => setActiveCenter([lat, lng])}
          />
          <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 text-xs text-gray-500">
            {data.distance_info || data.distance_information}
          </div>
        </div>

        {/* Sidebar details */}
        <div className="space-y-6">
          {/* Location context summary */}
          <Card className="border-gray-200 bg-white">
            <h3 className="font-extrabold text-gray-900 text-lg mb-2">Location Profile</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <p>
                <span className="font-semibold text-gray-800">District:</span>{' '}
                {data.geographic_context.district}
              </p>
              <p>
                <span className="font-semibold text-gray-800">State:</span>{' '}
                {data.geographic_context.state}
              </p>
              <p>
                <span className="font-semibold text-gray-800">APMC Markets Found:</span>{' '}
                {data.geographic_context.markets_count} yards within reach.
              </p>
            </div>
          </Card>

          {/* Sorted market yards listing */}
          <Card className="border-gray-200 bg-white">
            <h3 className="font-extrabold text-gray-900 text-lg mb-3">Nearby Market Yards</h3>
            <p className="text-xs text-gray-400 mb-4">Tap on a yard to focus it on the map.</p>
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {sortedMarkets.map((market, idx) => (
                <button
                  key={idx}
                  onClick={() => handleFocusMarket(market)}
                  className="w-full text-left p-3 min-h-[44px] rounded-xl border border-gray-100 hover:border-primary-200 hover:bg-primary-50/30 transition-all duration-200 flex justify-between items-start gap-2"
                >
                  <div>
                    <h4 className="font-bold text-gray-800 text-sm">{market.market_name}</h4>
                    {market.current_price && (
                      <p className="text-xs font-semibold text-primary-700 mt-1">
                        Price: {formatINR(market.current_price)} / {market.price_unit || 'Quintal'}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                    {market.distance_km} km
                  </span>
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
