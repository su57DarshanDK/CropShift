import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/common/Button';
import LoadingCard from '../components/common/LoadingCard';
import ErrorState from '../components/common/ErrorState';
import EmptyState from '../components/common/EmptyState';
import ProfitComparison from '../components/profit/ProfitComparison';
import ProfitChart from '../components/profit/ProfitChart';
import { getProfitability, getMyFarms } from '../services/api';
import { getFarmDetails, saveFarmDetails } from '../utils/storage';
import type { ProfitabilityResponse } from '../types/api';

import { useApiState } from '../hooks/useApiState';

export default function ProfitabilityPage() {
  const navigate = useNavigate();
  const [farm, setFarm] = useState<any>(() => getFarmDetails());
  const [farmLoading, setFarmLoading] = useState<boolean>(!getFarmDetails());
  const apiState = useApiState<ProfitabilityResponse>();

  const loadData = async () => {
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
        console.error('Failed to fetch farm from API', err);
      } finally {
        setFarmLoading(false);
      }
    }

    if (currentFarm && currentFarm.farm_id) {
      await apiState.run(getProfitability(currentFarm.farm_id));
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const isLoading = apiState.loading || farmLoading;
  const error = apiState.error;
  const data = apiState.data;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 leading-tight">
            Profitability Comparison
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Side-by-side financial comparison per acre for {farm?.farm_name || 'your farm'}.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => navigate('/recommendation')}
          className="self-start sm:self-center text-xs"
        >
          ← Back to Recommendation
        </Button>
      </div>

      {/* ── Loading State ── */}
      {isLoading && (
        <div data-testid="profitability-loading" className="py-8">
          <LoadingCard message="Calculating crop economics and regional yield comparisons…" />
        </div>
      )}

      {/* ── Error State ── */}
      {!isLoading && error && (
        <ErrorState
          title="Profitability Calculation Failed"
          message={error}
          onRetry={loadData}
        />
      )}

      {/* ── Empty State ── */}
      {!isLoading && !error && !data && (
        <EmptyState
          title="No Profitability Data"
          message="Complete the farm analysis wizard to generate financial estimations."
          actionLabel="Start Farm Analysis"
          onAction={() => navigate('/analyze')}
        />
      )}

      {/* ── Content ── */}
      {!isLoading && !error && data && (
        <>
          <ProfitComparison data={data} />
          <ProfitChart data={data} />

          {/* ── Onward Navigation Footer ── */}
          <div className="pt-6 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <Button
              variant="ghost"
              onClick={() => navigate('/recommendation')}
              className="w-full sm:w-auto"
            >
              ← Back to Recommendation
            </Button>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                variant="primary"
                onClick={() => navigate('/market')}
                className="w-full sm:w-auto"
              >
                View Market Intelligence →
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
