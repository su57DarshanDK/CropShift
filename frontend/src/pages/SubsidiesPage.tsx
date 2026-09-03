import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import SubsidyCard from '../components/subsidy/SubsidyCard';
import Spinner from '../components/common/Spinner';
import ErrorState from '../components/common/ErrorState';
import EmptyState from '../components/common/EmptyState';
import { getFarmDetails, saveFarmDetails } from '../utils/storage';
import { getSubsidies, getMyFarms } from '../services/api';
import type { SubsidyScheme } from '../types/api';

import { useApiState } from '../hooks/useApiState';

export default function SubsidiesPage() {
  const navigate = useNavigate();
  const [schemes, setSchemes] = useState<SubsidyScheme[]>([]);
  const [farm, setFarm] = useState<any>(() => getFarmDetails());
  const [farmLoading, setFarmLoading] = useState<boolean>(!getFarmDetails());
  const apiState = useApiState<SubsidyScheme[]>();

  const fetchSubsidies = async () => {
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
        console.error('Failed to fetch farm from API in SubsidiesPage', err);
      } finally {
        setFarmLoading(false);
      }
    }

    if (currentFarm && currentFarm.farm_id) {
      const result = await apiState.run(getSubsidies(currentFarm.farm_id));
      if (result) {
        const relevanceWeight = { HIGH: 3, MEDIUM: 2, LOW: 1 };
        const sorted = [...result].sort((a, b) => {
          const weightA = relevanceWeight[a.relevance] || 0;
          const weightB = relevanceWeight[b.relevance] || 0;
          return weightB - weightA;
        });
        setSchemes(sorted);
      }
    }
  };

  useEffect(() => {
    fetchSubsidies();
  }, []);

  const loading = apiState.loading || farmLoading;
  const error = apiState.error;

  if (!farm && !farmLoading) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4">
        <EmptyState
          title="No Farm Profile Found"
          message="Please complete your farm details to check for matching government subsidy schemes."
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
        <ErrorState message={error} onRetry={fetchSubsidies} />
      </div>
    );
  }

  if (schemes.length === 0) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4">
        <EmptyState
          title="No Matching Schemes"
          message="No government subsidy schemes were found matching your current farm profile and location."
          actionLabel="Re-Analyze Farm"
          onAction={() => window.location.assign('/analyze')}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-gray-900 leading-tight">
          Smart Subsidy Matcher
        </h1>
        <p className="text-gray-600 mt-1">
          Government programs and subsidies matched to your location, crops, and land size.
        </p>
      </div>

      {/* Grid of matched subsidy cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {schemes.map((scheme) => (
          <SubsidyCard key={scheme.scheme_id} scheme={scheme} />
        ))}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800 flex items-start gap-2.5">
        <span className="text-base" aria-hidden="true">ℹ️</span>
        <div>
          <p className="font-semibold mb-1">Important Disclaimer</p>
          <p className="text-xs text-blue-700">
            Eligibility assessments are based on matching farm profiles and criteria. A match does not guarantee sanction of the subsidy. All applications must be routed and approved by local department offices.
          </p>
        </div>
      </div>
    </div>
  );
}
