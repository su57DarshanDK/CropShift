import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import LoadingCard from '../components/common/LoadingCard';
import ErrorState from '../components/common/ErrorState';
import EmptyState from '../components/common/EmptyState';
import { getMustardComparison } from '../services/api';
import { getFarmDetails } from '../utils/storage';
import type { MustardComparisonResponse, MustardVarietyResult, AppError } from '../types/api';

function formatINR(amount: number): string {
  return '₹' + Math.abs(amount).toLocaleString('en-IN');
}

function Header({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h1 className="text-3xl font-extrabold text-gray-900 leading-tight">{title}</h1>
      {subtitle && <p className="text-gray-600 mt-1 font-medium">{subtitle}</p>}
    </div>
  );
}

export default function MustardComparisonPage() {
  const navigate = useNavigate();
  const { farmId: routeFarmId } = useParams<{ farmId?: string }>();
  const [data, setData] = useState<MustardComparisonResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<AppError | null>(null);
  const [sortField, setSortField] = useState<'overall_score' | 'profit_per_acre' | 'suitability_score' | 'risk_score'>('overall_score');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  useEffect(() => {
    async function loadSingleFarmComparison() {
      setLoading(true);
      setError(null);
      try {
        let farmIdToFetch: number | null = null;

        if (routeFarmId) {
          const parsed = parseInt(routeFarmId, 10);
          if (!isNaN(parsed) && parsed > 0) {
            farmIdToFetch = parsed;
          }
        }

        // Fallback to currently active stored farm analysis if no param passed
        if (!farmIdToFetch) {
          const storedFarm = getFarmDetails();
          if (storedFarm && (storedFarm.farm_id || storedFarm.id)) {
            farmIdToFetch = storedFarm.farm_id || storedFarm.id;
          }
        }

        if (!farmIdToFetch) {
          setLoading(false);
          return;
        }

        // Fetch comparison for THAT SPECIFIC FARM ONLY
        const res = await getMustardComparison(farmIdToFetch);
        setData(res);
      } catch (err: any) {
        const appErr: AppError = {
          code: err?.response?.data?.error?.code || 'FETCH_ERROR',
          message: err?.response?.data?.error?.message || "Unable to load mustard seed comparison. Please try again."
        };
        setError(appErr);
      } finally {
        setLoading(false);
      }
    }

    loadSingleFarmComparison();
  }, [routeFarmId]);

  if (loading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto py-4">
        <Header
          title="Mustard Seed Comparison"
          subtitle="Compare mustard seed varieties specifically for your farm."
        />
        <LoadingCard title="Comparing mustard varieties for your farm..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto py-8">
        <ErrorState
          title="Comparison Unavailable"
          message={error.message || "Unable to load mustard seed comparison. Please try again."}
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  if (!data || !data.comparison || data.comparison.length === 0) {
    return (
      <div className="max-w-xl mx-auto py-8">
        <EmptyState
          title="No Mustard Variety Data"
          message="No mustard variety data is currently available for this farm."
          actionLabel="Start Analysis"
          onAction={() => navigate('/analyze')}
        />
      </div>
    );
  }

  const sortedVarieties = [...data.comparison].sort((a, b) => {
    let valA = a[sortField];
    let valB = b[sortField];
    if (sortAsc) {
      return valA > valB ? 1 : -1;
    }
    return valA < valB ? 1 : -1;
  });

  const bestMatch = data.comparison.find(v => v.decision === 'RECOMMENDED') || data.comparison[0];

  const handleSort = (field: 'overall_score' | 'profit_per_acre' | 'suitability_score' | 'risk_score') => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* ── Top Navigation Bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <button
          onClick={() => navigate('/recommendation')}
          className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary-700 transition-colors"
        >
          <span>←</span> Back to Recommendation
        </button>
        <button
          onClick={() => navigate('/analyze')}
          className="inline-flex items-center gap-2 text-xs font-semibold text-gray-500 hover:text-gray-700 transition-colors"
        >
          <span>+</span> Start a New Analysis
        </button>
      </div>

      {/* ── Header ── */}
      <div>
        <Header
          title="Mustard Seed Comparison"
          subtitle="Compare mustard seed varieties specifically for your farm."
        />
      </div>

      {/* ── FARM CONTEXT Banner ── */}
      <Card className="bg-gradient-to-r from-amber-50/70 to-green-50/70 border-amber-200">
        <div className="space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-extrabold text-amber-800 uppercase tracking-wider block mb-1">
                FARM CONTEXT
              </span>
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <span>📍</span> {data.farm_name}
              </h2>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-0.5">
                Location: {data.district}, {data.state}
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm border-t md:border-t-0 md:border-l border-amber-200 pt-3 md:pt-0 md:pl-6">
              <div>
                <span className="text-xs text-gray-500 block">Soil Type</span>
                <span className="font-bold text-gray-800">{data.soil_type}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 block">Water</span>
                <span className="font-bold text-gray-800">{data.water_availability}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 block">Land Area</span>
                <span className="font-bold text-gray-800">{data.land_area_acre} Acre</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 block">Current Crop</span>
                <span className="font-bold text-gray-800">{data.current_crop}</span>
              </div>
            </div>
          </div>

          <div className="bg-amber-100/60 border border-amber-200 rounded-lg px-3 py-1.5 text-xs text-amber-900 font-medium inline-block">
            ℹ️ Calculated specifically for Farm ID: #{data.farm_id} ({data.farm_name}).
          </div>
        </div>
      </Card>

      {/* ── 🏆 BEST MUSTARD SEED FOR YOUR FARM Section ── */}
      {bestMatch && (
        <Card className="border-2 border-green-500 bg-white shadow-lg overflow-hidden relative">
          <div className="bg-green-600 text-white px-4 py-1.5 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider rounded-br-lg absolute top-0 left-0">
            <span>🏆 Best Mustard Seed for Your Farm</span>
          </div>

          <div className="pt-8 space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h3 className="text-2xl font-extrabold text-gray-900 flex items-center gap-3">
                  {bestMatch.variety_name}
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-600 border border-gray-200">
                    {bestMatch.variety_code}
                  </span>
                </h3>
                <p className="text-sm text-gray-600 mt-1 max-w-2xl">
                  {bestMatch.suitability_info || bestMatch.market_info}
                </p>
              </div>

              {/* Overall Score Badge */}
              <div className="flex flex-col items-center justify-center bg-green-50 border border-green-200 rounded-2xl px-6 py-3 min-w-[140px]">
                <span className="text-xs font-bold text-green-800 uppercase tracking-wider">Overall Score</span>
                <span className="text-3xl font-extrabold text-green-700">{bestMatch.overall_score}<span className="text-sm text-gray-500">/100</span></span>
              </div>
            </div>

            {/* Score Breakdown & Key Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50 rounded-xl p-4 border border-gray-100">
              <div className="text-center">
                <span className="text-xs text-gray-500 block font-medium">Estimated Profit</span>
                <span className="text-lg font-extrabold text-green-700">{formatINR(bestMatch.profit_per_acre)} / acre</span>
              </div>
              <div className="text-center">
                <span className="text-xs text-gray-500 block font-medium">Suitability</span>
                <span className="text-lg font-extrabold text-gray-800">{bestMatch.suitability_score} / 100</span>
              </div>
              <div className="text-center">
                <span className="text-xs text-gray-500 block font-medium">Risk Score</span>
                <span className={`text-lg font-extrabold ${bestMatch.risk_score > 35 ? 'text-amber-600' : 'text-green-700'}`}>
                  {bestMatch.risk_score} / 100
                </span>
              </div>
              <div className="text-center">
                <span className="text-xs text-gray-500 block font-medium">Water Requirement</span>
                <span className="text-lg font-extrabold text-blue-700">{bestMatch.water_requirement}</span>
              </div>
            </div>

            {/* Economics Highlight Box */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 bg-green-50/60 rounded-xl p-4 border border-green-200">
              <div>
                <p className="text-xs font-semibold text-green-800 uppercase tracking-wide">Expected Yield</p>
                <p className="text-lg font-bold text-gray-900">{bestMatch.expected_yield_per_acre} quintal/acre</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-green-800 uppercase tracking-wide">Expected Price</p>
                <p className="text-lg font-bold text-gray-900">₹{bestMatch.expected_price_per_unit.toLocaleString('en-IN')}/quintal</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-green-800 uppercase tracking-wide">Estimated Net Profit / Acre</p>
                <p className="text-xl font-extrabold text-green-800">{formatINR(bestMatch.profit_per_acre)}<span className="text-xs text-gray-600 font-normal"> / acre</span></p>
              </div>
              <div>
                <p className="text-xs font-semibold text-green-800 uppercase tracking-wide">Total Farm Net Profit</p>
                <p className="text-xl font-extrabold text-green-900">{formatINR(bestMatch.estimated_net_profit)} <span className="text-xs text-gray-600 font-normal">for {data.land_area_acre} acres</span></p>
              </div>
            </div>

            {/* Why Recommended Section */}
            <div>
              <h4 className="text-xs font-extrabold text-gray-800 uppercase tracking-wider mb-2">WHY THIS VARIETY IS RECOMMENDED</h4>
              <ul className="space-y-2">
                {bestMatch.reasons.map((reason, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-sm text-gray-700">
                    <span className="text-green-600 font-bold mt-0.5">✓</span>
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      )}

      {/* ── Comparison Table Section ── */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <h2 className="text-lg font-bold text-gray-900 uppercase tracking-wide">COMPARE MUSTARD SEED VARIETIES</h2>
          <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
            <span>Sort by:</span>
            <button
              onClick={() => handleSort('overall_score')}
              className={`px-2.5 py-1 rounded border transition-colors ${sortField === 'overall_score' ? 'bg-primary text-white border-primary' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
            >
              Overall Score {sortField === 'overall_score' ? (sortAsc ? '↑' : '↓') : ''}
            </button>
            <button
              onClick={() => handleSort('profit_per_acre')}
              className={`px-2.5 py-1 rounded border transition-colors ${sortField === 'profit_per_acre' ? 'bg-primary text-white border-primary' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
            >
              Profit {sortField === 'profit_per_acre' ? (sortAsc ? '↑' : '↓') : ''}
            </button>
            <button
              onClick={() => handleSort('suitability_score')}
              className={`px-2.5 py-1 rounded border transition-colors ${sortField === 'suitability_score' ? 'bg-primary text-white border-primary' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
            >
              Suitability {sortField === 'suitability_score' ? (sortAsc ? '↑' : '↓') : ''}
            </button>
          </div>
        </div>

        {/* Responsive Horizontally Scrollable Table View */}
        <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm bg-white">
          <table className="min-w-full text-left text-sm divide-y divide-gray-200">
            <thead className="bg-gray-50 text-xs font-bold text-gray-600 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3.5 whitespace-nowrap">Variety</th>
                <th className="px-3 py-3.5 text-right whitespace-nowrap">Yield</th>
                <th className="px-4 py-3.5 text-right whitespace-nowrap">Profit</th>
                <th className="px-3 py-3.5 text-center whitespace-nowrap">Suitability</th>
                <th className="px-3 py-3.5 text-center whitespace-nowrap">Water</th>
                <th className="px-3 py-3.5 text-center whitespace-nowrap">Risk</th>
                <th className="px-3 py-3.5 text-center whitespace-nowrap">Overall</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedVarieties.map((v) => {
                const isBest = v.decision === 'RECOMMENDED';
                return (
                  <tr
                    key={v.variety_id}
                    className={`hover:bg-gray-50/80 transition-colors ${isBest ? 'bg-green-50/50 font-semibold' : ''}`}
                  >
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="font-bold text-gray-900 flex items-center gap-2">
                        {v.variety_name}
                        {isBest && (
                          <span className="bg-green-100 text-green-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-green-300 uppercase">
                            Best Match
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">{v.variety_code}</div>
                    </td>
                    <td className="px-3 py-4 text-right whitespace-nowrap font-medium text-gray-800">
                      {v.expected_yield_per_acre} q/ac
                    </td>
                    <td className="px-4 py-4 text-right whitespace-nowrap font-extrabold text-green-700">
                      {formatINR(v.profit_per_acre)}<span className="text-xs text-gray-500 font-normal"> / ac</span>
                    </td>
                    <td className="px-3 py-4 text-center whitespace-nowrap">
                      <span className="inline-block font-bold text-gray-800">{v.suitability_score} / 100</span>
                    </td>
                    <td className="px-3 py-4 text-center whitespace-nowrap font-medium text-gray-700">
                      {v.water_requirement}
                    </td>
                    <td className="px-3 py-4 text-center whitespace-nowrap">
                      <span className={`inline-block font-bold ${v.risk_score > 35 ? 'text-amber-600' : 'text-green-700'}`}>
                        {v.risk_score} / 100
                      </span>
                    </td>
                    <td className="px-3 py-4 text-center whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-extrabold ${isBest ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-800'}`}>
                        {v.overall_score}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

