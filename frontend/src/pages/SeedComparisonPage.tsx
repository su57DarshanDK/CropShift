import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import LoadingCard from '../components/common/LoadingCard';
import EmptyState from '../components/common/EmptyState';
import ErrorState from '../components/common/ErrorState';
import { getMyFarms, getOilseedSuitability, getSeeds, compareSeeds } from '../services/api';

function formatINR(amount: number): string {
  return '₹' + Math.abs(amount).toLocaleString('en-IN');
}

export default function SeedComparisonPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCropParam = searchParams.get('crop') || '';

  const [farm, setFarm] = useState<any>(null);
  const [suitabilityData, setSuitabilityData] = useState<any>(null);

  // Available Oilseed crops from PostgreSQL
  const [oilseedCrops, setOilseedCrops] = useState<string[]>([]);
  const [selectedCrop, setSelectedCrop] = useState<string>(initialCropParam);

  // Available seed varieties for selected crop
  const [seedsList, setSeedsList] = useState<any[]>([]);
  const [seed1Id, setSeed1Id] = useState<number | ''>('');
  const [seed2Id, setSeed2Id] = useState<number | ''>('');

  // Comparison execution result
  const [comparisonResult, setComparisonResult] = useState<any>(null);
  const [comparing, setComparing] = useState<boolean>(false);

  const [loading, setLoading] = useState<boolean>(true);
  const [seedsLoading, setSeedsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  /* ── 1. Fetch farmer's actual farm & oilseed suitability on mount ── */
  useEffect(() => {
    async function initPageData() {
      setLoading(true);
      setErrorMsg(null);
      try {
        const farms = await getMyFarms();
        if (farms && farms.length > 0) {
          const primaryFarm = farms[0];
          setFarm(primaryFarm);
          const farmId = primaryFarm.id || primaryFarm.farm_id;

          const res = await getOilseedSuitability(farmId);
          setSuitabilityData(res);

          if (!res.can_oilseed_be_grown) {
            setLoading(false);
            return;
          }

          const suitableList = (res.suitable_oilseed_crops || []).map((c: any) => c.crop_name);
          const defaultCrops = ['Groundnut', 'Mustard', 'Sesame', 'Sunflower', 'Soybean', 'Castor'];
          const combinedCrops = Array.from(new Set([...suitableList, ...defaultCrops]));
          setOilseedCrops(combinedCrops);

          // Determine initial active oilseed crop
          let targetCrop = initialCropParam;
          if (!targetCrop || !combinedCrops.includes(targetCrop)) {
            targetCrop = suitableList[0] || combinedCrops[0] || 'Groundnut';
          }

          setSelectedCrop(targetCrop);
          await loadSeedsForSelectedCrop(targetCrop, farmId);
        } else {
          setFarm(null);
          setSuitabilityData(null);
        }
      } catch (err: any) {
        const msg = err?.response?.data?.detail || err?.message || 'Unable to load farmer data. Please try again.';
        setErrorMsg(msg);
      } finally {
        setLoading(false);
      }
    }

    initPageData();
  }, []);

  /* ── 2. Load seed varieties when selected crop changes ── */
  async function loadSeedsForSelectedCrop(cropName: string, farmId: number) {
    setSeedsLoading(true);
    setSeed1Id('');
    setSeed2Id('');
    setComparisonResult(null);
    try {
      const list = await getSeeds(cropName, farmId);
      setSeedsList(list || []);
      if (list && list.length >= 2) {
        setSeed1Id(list[0].id);
        setSeed2Id(list[1].id);
      } else if (list && list.length === 1) {
        setSeed1Id(list[0].id);
      }
    } catch (err: any) {
      setSeedsList([]);
    } finally {
      setSeedsLoading(false);
    }
  }

  const handleCropChange = async (newCrop: string) => {
    setSelectedCrop(newCrop);
    setSearchParams({ crop: newCrop });
    if (farm) {
      const farmId = farm.id || farm.farm_id;
      await loadSeedsForSelectedCrop(newCrop, farmId);
    }
  };

  /* ── 3. Execute Compare Button ── */
  const handleCompareClick = async () => {
    if (!seed1Id || !seed2Id || seed1Id === seed2Id || !farm || !selectedCrop) return;
    setComparing(true);
    setComparisonResult(null);
    try {
      const farmId = farm.id || farm.farm_id;
      const res = await compareSeeds({
        farm_id: farmId,
        crop_name: selectedCrop,
        seed_id_1: Number(seed1Id),
        seed_id_2: Number(seed2Id),
      });
      setComparisonResult(res);
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message;
      alert(`Comparison Error: ${msg}`);
    } finally {
      setComparing(false);
    }
  };

  /* ── 4. Rendering States (NO BLANK PAGES) ── */

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-8 space-y-4">
        <h1 className="text-2xl font-extrabold text-gray-900">Seed Comparison</h1>
        <p className="text-xs text-gray-500 font-semibold">Loading seed comparison...</p>
        <LoadingCard title="Fetching farmer data and seed varieties from PostgreSQL database..." />
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="max-w-xl mx-auto py-8">
        <ErrorState
          title="Unable to Load Seed Data"
          message={errorMsg}
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  if (!farm || !suitabilityData) {
    return (
      <div className="max-w-xl mx-auto py-8">
        <EmptyState
          title="Complete Your Farm Details"
          message="Complete your farm details before comparing seeds."
          actionLabel="Enter Farm Details"
          onAction={() => navigate('/analyze')}
        />
      </div>
    );
  }

  if (!suitabilityData.can_oilseed_be_grown) {
    return (
      <div className="max-w-xl mx-auto py-8 space-y-4">
        <Card className="border-amber-300 bg-amber-50">
          <div className="space-y-2">
            <h2 className="text-lg font-extrabold text-amber-900">
              Oilseed crops are not suitable for your farm.
            </h2>
            <p className="text-xs text-amber-800 font-semibold">
              Based on your actual farm conditions ({suitabilityData.soil_type} soil, {suitabilityData.water_availability} water availability), oilseed cultivation is not recommended.
            </p>
          </div>
        </Card>

        <Card>
          <div className="space-y-3">
            <h3 className="text-sm font-extrabold text-gray-900 uppercase">SUITABLE OTHER CROPS</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(suitabilityData.non_oilseed_alternatives || []).map((alt: any) => (
                <div key={alt.crop_id} className="p-3 border rounded-xl bg-white space-y-1">
                  <div className="font-extrabold text-gray-900 text-sm">{alt.crop_name}</div>
                  <div className="text-xs text-gray-600">Yield: {alt.expected_yield}</div>
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate('/recommendation')}>
              ← Return to Recommendation
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4FAF4] py-8 px-4 sm:px-6 lg:px-8 font-sans text-gray-800">
      <div className="max-w-5xl mx-auto space-y-8 pb-12">
        
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#A5D6A7]/60 pb-4">
          <div>
            <span className="text-[11px] font-extrabold text-[#1B5E20] tracking-wider uppercase block bg-[#E8F5E9] px-2.5 py-0.5 rounded border border-[#A5D6A7] self-start inline-block mb-1">
              CropShift Decision Engine
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1B5E20] tracking-tight">
              Seed Variety Comparison
            </h1>
            <p className="text-xs text-gray-600 mt-0.5">
              Compare certified seed varieties for your farm using real PostgreSQL agronomic data.
            </p>
          </div>
          <button
            onClick={() => navigate('/recommendation')}
            className="bg-white hover:bg-[#E8F5E9] text-[#1B5E20] border border-[#A5D6A7] text-xs font-bold px-4 py-2 rounded-xl transition shadow-2xs self-start sm:self-auto"
          >
            ← Back to Recommendation
          </button>
        </div>

        {/* FARM CONTEXT Banner */}
        <div className="bg-[#E8F5E9] border border-[#A5D6A7] rounded-2xl p-5 shadow-2xs">
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#A5D6A7]/60 pb-2">
              <div>
                <span className="text-[10px] font-extrabold text-[#1B5E20] uppercase tracking-wider block">ACTIVE FARM PROFILE</span>
                <h2 className="text-base font-extrabold text-gray-900 flex items-center gap-1.5 mt-0.5">
                  <span>📍</span> {suitabilityData.district}, {suitabilityData.state}
                </h2>
              </div>
              <button
                onClick={() => navigate('/analyze')}
                className="text-xs font-bold text-[#1B5E20] hover:underline self-start sm:self-auto"
              >
                Edit Details ✏️
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-gray-500 block text-[11px]">Soil Type</span>
                <span className="font-extrabold text-gray-900 text-sm">{suitabilityData.soil_type}</span>
              </div>
              <div>
                <span className="text-gray-500 block text-[11px]">Water Availability</span>
                <span className="font-extrabold text-gray-900 text-sm">{suitabilityData.water_availability}</span>
              </div>
              <div>
                <span className="text-gray-500 block text-[11px]">Farm Area</span>
                <span className="font-extrabold text-gray-900 text-sm">{suitabilityData.land_area_acre} Acres</span>
              </div>
              <div>
                <span className="text-gray-500 block text-[11px]">Current Crop</span>
                <span className="font-extrabold text-[#1B5E20] text-sm">{suitabilityData.current_crop}</span>
              </div>
            </div>
          </div>
        </div>

      {/* SELECTION CONTROL BOX */}
      <Card className="border-emerald-300">
        <div className="space-y-5">
          <h2 className="text-lg font-extrabold text-gray-900">
            Compare Oilseed Varieties
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* 1. Select Oilseed Crop */}
            <div>
              <label className="block text-xs font-extrabold text-gray-700 uppercase mb-1">
                Select Oilseed Crop
              </label>
              <select
                value={selectedCrop}
                onChange={(e) => handleCropChange(e.target.value)}
                className="w-full rounded-xl border-gray-300 bg-white shadow-sm font-bold text-xs py-2.5 px-3 focus:ring-emerald-500 focus:border-emerald-500"
              >
                {oilseedCrops.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Select Seed 1 */}
            <div>
              <label className="block text-xs font-extrabold text-gray-700 uppercase mb-1">
                Select Seed 1
              </label>
              <select
                value={seed1Id}
                onChange={(e) => {
                  setSeed1Id(e.target.value ? Number(e.target.value) : '');
                  setComparisonResult(null);
                }}
                disabled={seedsLoading || seedsList.length === 0}
                className="w-full rounded-xl border-gray-300 bg-white shadow-sm font-bold text-xs py-2.5 px-3 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="">-- Select Seed 1 --</option>
                {seedsList.map((s) => (
                  <option key={s.id} value={s.id} disabled={s.id === seed2Id}>
                    {s.name} ({s.variety_code})
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Select Seed 2 */}
            <div>
              <label className="block text-xs font-extrabold text-gray-700 uppercase mb-1">
                Select Seed 2
              </label>
              <select
                value={seed2Id}
                onChange={(e) => {
                  setSeed2Id(e.target.value ? Number(e.target.value) : '');
                  setComparisonResult(null);
                }}
                disabled={seedsLoading || seedsList.length === 0}
                className="w-full rounded-xl border-gray-300 bg-white shadow-sm font-bold text-xs py-2.5 px-3 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="">-- Select Seed 2 --</option>
                {seedsList.map((s) => (
                  <option key={s.id} value={s.id} disabled={s.id === seed1Id}>
                    {s.name} ({s.variety_code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Seeds Status Feedback */}
          {seedsLoading ? (
            <p className="text-xs text-emerald-700 font-semibold animate-pulse">Loading seed varieties for {selectedCrop}...</p>
          ) : seedsList.length === 0 ? (
            <p className="text-xs text-amber-800 font-bold bg-amber-50 p-3 rounded-lg border border-amber-200">
              No seed varieties are available for this oilseed crop.
            </p>
          ) : seedsList.length === 1 ? (
            <p className="text-xs text-amber-800 font-bold bg-amber-50 p-3 rounded-lg border border-amber-200">
              At least two seed varieties are required for comparison. (Only 1 variety found in database: {seedsList[0].name})
            </p>
          ) : null}

          {/* Compare Button */}
          <div className="pt-2 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-gray-500 font-semibold">
              {(!seed1Id || !seed2Id) && "Please select two different seed varieties to compare."}
              {seed1Id && seed2Id && seed1Id === seed2Id && "Seed 1 and Seed 2 must be different."}
              {seed1Id && seed2Id && seed1Id !== seed2Id && "✓ Ready to compare selected seeds."}
            </p>

            <Button
              variant="primary"
              size="md"
              disabled={!seed1Id || !seed2Id || seed1Id === seed2Id || comparing}
              onClick={handleCompareClick}
              className="w-full sm:w-auto font-extrabold px-8"
            >
              {comparing ? 'Comparing...' : 'Compare Seeds →'}
            </Button>
          </div>
        </div>
      </Card>

      {/* COMPARISON RESULT OUTPUT */}
      {comparisonResult && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <Card className="border-2 border-emerald-500 shadow-md">
            <div className="space-y-6">
              <div className="border-b border-gray-100 pb-3">
                <span className="text-xs font-extrabold text-emerald-800 uppercase tracking-wider block">REAL COMPARISON RESULT</span>
                <h3 className="text-2xl font-extrabold text-gray-900">
                  SEED COMPARISON
                </h3>
              </div>

              {/* Side-by-Side Table */}
              <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
                <table className="min-w-full text-left text-xs divide-y divide-gray-200">
                  <thead className="bg-gray-50 font-extrabold text-gray-700 uppercase">
                    <tr>
                      <th className="px-4 py-3.5 bg-gray-100/70">Feature</th>
                      <th className={`px-4 py-3.5 text-center ${comparisonResult.better_seed_id === comparisonResult.seed_1.id ? 'bg-emerald-100/80 font-extrabold text-emerald-900' : 'bg-blue-50/50'}`}>
                        {comparisonResult.seed_1.name} ({comparisonResult.seed_1.variety_code})
                      </th>
                      <th className={`px-4 py-3.5 text-center ${comparisonResult.better_seed_id === comparisonResult.seed_2.id ? 'bg-emerald-100/80 font-extrabold text-emerald-900' : 'bg-blue-50/50'}`}>
                        {comparisonResult.seed_2.name} ({comparisonResult.seed_2.variety_code})
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    <tr>
                      <td className="px-4 py-3 font-bold text-gray-800">Expected Yield</td>
                      <td className="px-4 py-3 text-center font-bold text-gray-900">{comparisonResult.seed_1.expected_yield_per_acre} quintal/acre</td>
                      <td className="px-4 py-3 text-center font-bold text-gray-900">{comparisonResult.seed_2.expected_yield_per_acre} quintal/acre</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-bold text-gray-800">Crop Duration</td>
                      <td className="px-4 py-3 text-center font-medium text-gray-700">{comparisonResult.seed_1.maturity_duration_days} days</td>
                      <td className="px-4 py-3 text-center font-medium text-gray-700">{comparisonResult.seed_2.maturity_duration_days} days</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-bold text-gray-800">Water Requirement</td>
                      <td className="px-4 py-3 text-center font-medium text-gray-700">{comparisonResult.seed_1.water_requirement}</td>
                      <td className="px-4 py-3 text-center font-medium text-gray-700">{comparisonResult.seed_2.water_requirement}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-bold text-gray-800">Soil Fit</td>
                      <td className="px-4 py-3 text-center font-medium text-gray-700">{comparisonResult.seed_1.suitable_soil_types}</td>
                      <td className="px-4 py-3 text-center font-medium text-gray-700">{comparisonResult.seed_2.suitable_soil_types}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-bold text-gray-800">Disease Resistance</td>
                      <td className="px-4 py-3 text-center font-medium text-gray-700">{comparisonResult.seed_1.disease_resistance || 'Standard Resistance'}</td>
                      <td className="px-4 py-3 text-center font-medium text-gray-700">{comparisonResult.seed_2.disease_resistance || 'Standard Resistance'}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-bold text-gray-800">Seed Price</td>
                      <td className="px-4 py-3 text-center font-bold text-gray-800">₹{comparisonResult.seed_1.expected_price_per_unit.toLocaleString('en-IN')}/qtl</td>
                      <td className="px-4 py-3 text-center font-bold text-gray-800">₹{comparisonResult.seed_2.expected_price_per_unit.toLocaleString('en-IN')}/qtl</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-bold text-gray-800">Expected Profit</td>
                      <td className="px-4 py-3 text-center font-extrabold text-emerald-700">{formatINR(comparisonResult.seed_1.profit_per_acre)} / acre</td>
                      <td className="px-4 py-3 text-center font-extrabold text-emerald-700">{formatINR(comparisonResult.seed_2.profit_per_acre)} / acre</td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="px-4 py-3 font-extrabold text-gray-900">Farmer Suitability Score</td>
                      <td className="px-4 py-3 text-center font-extrabold text-emerald-800 text-sm">{comparisonResult.seed_1.suitability_score} / 100</td>
                      <td className="px-4 py-3 text-center font-extrabold text-emerald-800 text-sm">{comparisonResult.seed_2.suitability_score} / 100</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* WHICH SEED IS BETTER FOR YOUR FARM? */}
              <Card className="border-2 border-emerald-600 bg-white">
                <div className="bg-emerald-600 text-white px-4 py-1.5 inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider rounded-br-xl">
                  <span>🏆 WHICH SEED IS BETTER FOR YOUR FARM?</span>
                </div>

                <div className="pt-6 space-y-4">
                  <div>
                    <span className="text-xs font-bold text-gray-500 uppercase block">🏆 BETTER SEED:</span>
                    <h4 className="text-2xl font-extrabold text-gray-900 flex items-center gap-3 mt-0.5">
                      {comparisonResult.better_seed_name}
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                        {comparisonResult.better_seed_code}
                      </span>
                    </h4>
                  </div>

                  <div className="bg-emerald-50/70 rounded-xl p-4 border border-emerald-200 space-y-2">
                    <h5 className="text-xs font-extrabold text-emerald-900 uppercase tracking-wider">
                      WHY?
                    </h5>
                    <ul className="space-y-1.5 pt-1">
                      {comparisonResult.reasons && comparisonResult.reasons.length > 0 ? (
                        comparisonResult.reasons.map((reason: string, idx: number) => (
                          <li key={idx} className="flex items-start gap-2 text-xs font-semibold text-gray-800">
                            <span className="text-emerald-600 font-extrabold">•</span>
                            <span>{reason}</span>
                          </li>
                        ))
                      ) : (
                        <li className="text-xs font-semibold text-gray-800">• High suitability for your farm soil and water availability.</li>
                      )}
                    </ul>
                  </div>
                </div>
              </Card>
            </div>
          </Card>
        </div>
      )}
      </div>
    </div>
  );
}
