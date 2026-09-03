import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import MarketCard from '../components/market/MarketCard';
import Spinner from '../components/common/Spinner';
import ErrorState from '../components/common/ErrorState';
import EmptyState from '../components/common/EmptyState';
import { getRecommendation, getFarmDetails, saveRecommendation } from '../utils/storage';
import { getMarkets, getMyFarms, getOilseedSuitability } from '../services/api';
import type { MarketItem } from '../types/api';

import { useApiState } from '../hooks/useApiState';

const CROP_MAP: Record<string, number> = {
  Paddy: 1,
  Groundnut: 2,
  Sunflower: 3,
  Soybean: 4,
  Mustard: 5,
  Sesame: 6,
  Maize: 7,
};

export default function MarketPage() {
  const navigate = useNavigate();
  const [activeRec, setActiveRec] = useState<any>(() => getRecommendation());
  const [hydrating, setHydrating] = useState<boolean>(!getRecommendation());
  const currentCropState = useApiState<MarketItem>();
  const recommendedCropState = useApiState<MarketItem>();

  const fetchMarketData = async () => {
    let rec = activeRec || getRecommendation();
    let farm = getFarmDetails();

    if (!rec) {
      setHydrating(true);
      try {
        if (typeof getMyFarms === 'function') {
          const farms = await getMyFarms();
          if (farms && farms.length > 0) {
            const primary = farms[0];
            if (typeof getOilseedSuitability === 'function') {
              const os = await getOilseedSuitability(primary.id);
              if (os?.suitable_oilseed_crops?.length > 0) {
                rec = {
                  recommended_crop: os.suitable_oilseed_crops[0].crop_name,
                  suitability_score: os.suitable_oilseed_crops[0].suitability_score,
                  confidence: 'HIGH',
                };
                saveRecommendation(rec);
                setActiveRec(rec);
              }
            }
          }
        }
      } catch (err) {
        console.error('Failed to hydrate market recommendation', err);
      } finally {
        setHydrating(false);
      }
    }

    if (rec) {
      const currentCropName = farm?.current_crop || 'Paddy';
      const currentCropId = CROP_MAP[currentCropName] || 1;
      const recCropName = rec.recommended_crop || 'Groundnut';
      const recommendedCropId = CROP_MAP[recCropName] || 2;

      await Promise.all([
        currentCropState.run(getMarkets(currentCropId)),
        recommendedCropState.run(getMarkets(recommendedCropId)),
      ]);
    }
  };

  useEffect(() => {
    fetchMarketData();
  }, []);

  if (!activeRec && !hydrating) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4">
        <EmptyState
          title="No Farm Analysis Found"
          message="Please analyze your farm first to compare market information for your crop choices."
          actionLabel="Go to Farm Analysis"
          onAction={() => navigate('/analyze')}
        />
      </div>
    );
  }

  const isLoading = currentCropState.loading || recommendedCropState.loading || hydrating;
  const error = currentCropState.error || recommendedCropState.error;
  const currentMarket = currentCropState.data;
  const recommendedMarket = recommendedCropState.data;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto py-8">
        <ErrorState message={error} onRetry={fetchMarketData} />
      </div>
    );
  }

  if (!currentMarket && !recommendedMarket) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4">
        <EmptyState
          title="No Market Data Available"
          message="This information is not available for your farm yet."
          actionLabel="Go to Farm Analysis"
          onAction={() => navigate('/analyze')}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-gray-900 leading-tight">
          Market Intelligence
        </h1>
        <p className="text-gray-600 mt-1">
          Compare local crop prices, market distances, and price trends.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {currentMarket && (
          <MarketCard market={currentMarket} title="Current Crop Market" />
        )}
        {recommendedMarket && (
          <MarketCard market={recommendedMarket} title="Recommended Crop Market" />
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800 flex items-start gap-2.5">
        <span className="text-base" aria-hidden="true">ℹ️</span>
        <p>
          Market price trend represents current price movements in local markets. A rising trend indicates favorable selling conditions.
        </p>
      </div>
    </div>
  );
}
