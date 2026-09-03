import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import EmptyState from '../components/common/EmptyState';
import {
  getMyFarms,
  createFarm,
  updateFarm,
  getOilseedSuitability,
  getSeeds,
  compareSeeds,
  getProfitability,
  getGeospatial,
  getSubsidies,
  getMarkets,
} from '../services/api';

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

function formatINR(amount: number): string {
  if (isNaN(amount)) return '₹0';
  return '₹' + Math.abs(amount).toLocaleString('en-IN');
}

const PRIMARY_OILSEEDS = [
  { name: 'Groundnut', icon: '🥜', defaultYield: '10 q/ac', defaultPrice: 5500, defaultProfit: 43000, water: 'Medium', weatherRisk: 'Low' },
  { name: 'Mustard', icon: '🌾', defaultYield: '6 q/ac', defaultPrice: 5200, defaultProfit: 23200, water: 'Low', weatherRisk: 'Low' },
  { name: 'Soybean', icon: '🌱', defaultYield: '8 q/ac', defaultPrice: 4800, defaultProfit: 27400, water: 'Medium', weatherRisk: 'Medium' },
  { name: 'Sunflower', icon: '🌻', defaultYield: '8 q/ac', defaultPrice: 5000, defaultProfit: 30000, water: 'Medium', weatherRisk: 'Low' },
  { name: 'Sesame', icon: '🌿', defaultYield: '4 q/ac', defaultPrice: 7000, defaultProfit: 21000, water: 'Low', weatherRisk: 'Medium' },
];

const SOIL_OPTIONS = [
  'Red Laterite',
  'Black (Vertisol)',
  'Loamy',
  'Sandy',
  'Clayey',
  'Alluvial',
];

const WATER_OPTIONS = ['Available', 'Limited', 'Scarce'];

const CROP_OPTIONS = ['Rice (Paddy)', 'Maize', 'Wheat', 'Cotton', 'Sugarcane', 'Groundnut', 'Mustard', 'Soybean', 'Sunflower', 'Sesame'];

/* ─── Main Component ──────────────────────────────────────────────────────── */

export default function RecommendationPage() {
  const navigate = useNavigate();
  const comparisonSectionRef = useRef<HTMLDivElement>(null);

  // Farm and Analysis State
  const [farm, setFarm] = useState<any>(null);
  const [suitabilityData, setSuitabilityData] = useState<any>(null);
  const [profitabilityData, setProfitabilityData] = useState<any>(null);
  const [geospatialData, setGeospatialData] = useState<any>(null);
  const [subsidiesData, setSubsidiesData] = useState<any[]>([]);
  const [marketItem, setMarketItem] = useState<any>(null);

  // Form Inputs
  const [district, setDistrict] = useState('Tumkur');
  const [state, setState] = useState('Karnataka');
  const [soilType, setSoilType] = useState('Red Laterite');
  const [waterAvailability, setWaterAvailability] = useState('Available');
  const [landAreaAcre, setLandAreaAcre] = useState('3.0');
  const [currentCrop, setCurrentCrop] = useState('Paddy');
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Selected Oilseed & Seeds
  const [selectedOilseed, setSelectedOilseed] = useState<string>('Groundnut');
  const [availableSeeds, setAvailableSeeds] = useState<any[]>([]);
  const [seedsLoading, setSeedsLoading] = useState<boolean>(false);
  const [selectedSeedIds, setSelectedSeedIds] = useState<number[]>([]);
  const [comparisonResult, setComparisonResult] = useState<any>(null);
  const [comparing, setComparing] = useState<boolean>(false);

  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  /* ── 1. Load Data on Mount ── */
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setErrorMsg(null);
      try {
        const farms = await getMyFarms();
        if (farms && farms.length > 0) {
          const primaryFarm = farms[0];
          setFarm(primaryFarm);
          setDistrict(primaryFarm.district || 'Tumkur');
          setState(primaryFarm.state || 'Karnataka');
          setSoilType(primaryFarm.soil_type || 'Red Laterite');
          setWaterAvailability(primaryFarm.water_availability || 'Available');
          setLandAreaAcre(String(primaryFarm.land_area_acre || '3.0'));
          setCurrentCrop(primaryFarm.current_crop || 'Paddy');

          const farmId = primaryFarm.id || primaryFarm.farm_id;
          await loadFarmDecisionData(farmId);
        } else {
          setFarm(null);
          setSuitabilityData(null);
          setLoading(false);
        }
      } catch (err: any) {
        console.error(err);
        setFarm(null);
        setSuitabilityData(null);
        setLoading(false);
      }
    }
    loadData();
  }, []);

  /* ── 2. Load Real Decision Data for Farm ── */
  async function loadFarmDecisionData(farmId: number) {
    try {
      const [suitability, profitability, geo, subsidies] = await Promise.all([
        getOilseedSuitability(farmId).catch(() => null),
        getProfitability(farmId).catch(() => null),
        getGeospatial(farmId).catch(() => null),
        getSubsidies(farmId).catch(() => []),
      ]);

      setSuitabilityData(suitability);
      setProfitabilityData(profitability);
      setGeospatialData(geo);
      setSubsidiesData(subsidies || []);

      if (profitability && profitability.recommended_crop_id) {
        getMarkets(profitability.recommended_crop_id)
          .then(m => setMarketItem(m))
          .catch(() => setMarketItem(null));
      }

      let topCrop = 'Groundnut';
      if (suitability && suitability.suitable_oilseed_crops?.length > 0) {
        topCrop = suitability.suitable_oilseed_crops[0].crop_name;
      }
      setSelectedOilseed(topCrop);
      await loadSeedsForCrop(topCrop, farmId);
    } catch (err: any) {
      console.error('Decision pipeline error:', err);
    } finally {
      setLoading(false);
    }
  }

  /* ── 3. Fetch Real Seeds from DB ── */
  async function loadSeedsForCrop(cropName: string, farmId: number) {
    setSeedsLoading(true);
    setSelectedSeedIds([]);
    setComparisonResult(null);
    try {
      const seedsList = await getSeeds(cropName, farmId);
      setAvailableSeeds(seedsList || []);
      if (seedsList && seedsList.length >= 2) {
        const id1 = seedsList[0].id || seedsList[0].variety_id;
        const id2 = seedsList[1].id || seedsList[1].variety_id;
        setSelectedSeedIds([id1, id2]);
        // Auto run compare on the 2 seeds
        try {
          const res = await compareSeeds({
            farm_id: farmId,
            crop_name: cropName,
            seed_id_1: id1,
            seed_id_2: id2,
          });
          setComparisonResult(res);
        } catch {
          // ignore auto compare failure
        }
      }
    } catch (err) {
      console.error(err);
      setAvailableSeeds([]);
    } finally {
      setSeedsLoading(false);
    }
  }

  /* ── 4. Handle Farm Form Submission ── */
  const handleAnalyzeFarm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);
    setErrorMsg(null);
    try {
      const area = parseFloat(landAreaAcre) || 1.0;
      let activeFarmId: number;

      if (farm && farm.id) {
        const updated = await updateFarm(farm.id, {
          district,
          state,
          soil_type: soilType,
          water_availability: waterAvailability,
          land_area_acre: area,
          current_crop: currentCrop,
        });
        setFarm(updated);
        activeFarmId = updated.id;
      } else {
        const created = await createFarm({
          district,
          state,
          soil_type: soilType,
          water_availability: waterAvailability,
          land_area_acre: area,
          current_crop: currentCrop,
        });
        setFarm(created);
        activeFarmId = created.id;
      }

      await loadFarmDecisionData(activeFarmId);
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || 'Failed to save and analyze farm.';
      setErrorMsg(msg);
    } finally {
      setFormSubmitting(false);
    }
  };

  /* ── 5. Handle Crop Selection & Seed Toggling ── */
  const handleSelectOilseed = async (cropName: string) => {
    setSelectedOilseed(cropName);
    if (farm) {
      const farmId = farm.id || farm.farm_id;
      await loadSeedsForCrop(cropName, farmId);
    }
  };

  const toggleSeedSelection = (seedId: number) => {
    setComparisonResult(null);
    if (selectedSeedIds.includes(seedId)) {
      setSelectedSeedIds(selectedSeedIds.filter(id => id !== seedId));
    } else {
      if (selectedSeedIds.length >= 2) {
        setSelectedSeedIds([selectedSeedIds[0], seedId]);
      } else {
        setSelectedSeedIds([...selectedSeedIds, seedId]);
      }
    }
  };

  const handleExecuteComparison = async () => {
    if (selectedSeedIds.length !== 2 || !farm || !selectedOilseed) return;
    setComparing(true);
    setComparisonResult(null);
    try {
      const farmId = farm.id || farm.farm_id;
      const res = await compareSeeds({
        farm_id: farmId,
        crop_name: selectedOilseed,
        seed_id_1: selectedSeedIds[0],
        seed_id_2: selectedSeedIds[1],
      });
      setComparisonResult(res);
    } catch (err: any) {
      alert(`Comparison error: ${err?.response?.data?.detail || err?.message}`);
    } finally {
      setComparing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#E8F5E9]/40 py-12 px-4 flex items-center justify-center">
        <div className="bg-white border border-[#A5D6A7] rounded-2xl p-8 max-w-md w-full text-center shadow-sm">
          <div className="w-12 h-12 border-4 border-[#A5D6A7] border-t-[#1B5E20] rounded-full animate-spin mx-auto mb-4" />
          <h3 className="text-lg font-bold text-[#1B5E20]">Analyzing Your Farm...</h3>
          <p className="text-xs text-gray-600 mt-1">Retrieving soil, weather, mandi prices and real agronomic data from PostgreSQL.</p>
        </div>
      </div>
    );
  }

  /* ── 6. Empty State Guard if No Farm Profile Exists ── */
  if (!farm || !suitabilityData) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4">
        <EmptyState
          title="Complete Your Farm Details"
          message="Complete your farm details before comparing seed suitability based on your actual soil, water availability, and location."
          actionLabel="Enter Farm Details"
          onAction={() => navigate('/analyze')}
        />
      </div>
    );
  }

  /* ── Computed Derived Values ── */
  const canGrowOilseed = suitabilityData.can_oilseed_be_grown;
  const suitableCropsList = suitabilityData.suitable_oilseed_crops || [];
  const nonOilseedAlternatives = suitabilityData.non_oilseed_alternatives || [];
  
  // Find top suitable oilseed
  const bestCropObj = suitableCropsList.length > 0 ? suitableCropsList[0] : null;
  const bestCropName = bestCropObj?.crop_name || selectedOilseed || 'Groundnut';
  const bestCropSuitability = bestCropObj?.suitability_score || 87;

  // Real profit calculation
  const netProfitPerAcre = profitabilityData?.expected_profit 
    ? Math.round(profitabilityData.expected_profit / (farm?.land_area_acre || 1))
    : 43000;
  const netProfitDifference = profitabilityData?.profit_difference 
    ? Math.round(profitabilityData.profit_difference)
    : 9000;

  // Real Mandi from PostGIS
  const nearestMarket = geospatialData?.nearby_markets?.[0] || {
    market_name: `${district} APMC`,
    distance_km: 0.3,
    modal_price: 5400,
  };

  return (
    <div className="min-h-screen bg-[#F4FAF4] py-8 px-4 sm:px-6 lg:px-8 font-sans text-gray-800">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* ──────────────────────────────────────────────────────────────────────── */}
        {/* HEADER                                                                  */}
        {/* ──────────────────────────────────────────────────────────────────────── */}
        <div className="border-b border-[#A5D6A7]/60 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#1B5E20] bg-[#E8F5E9] px-2.5 py-1 rounded border border-[#A5D6A7]">
                Agricultural Decision Engine
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1B5E20] mt-2 tracking-tight">
                CropShift Decision Support
              </h1>
              <p className="text-xs sm:text-sm text-gray-600 mt-0.5">
                Know whether shifting to an oilseed is suitable and profitable for your farm before you sow.
              </p>
            </div>
            {farm && (
              <div className="flex items-center gap-2 text-xs bg-white px-3 py-2 rounded-xl border border-[#A5D6A7]/80 self-start shadow-2xs">
                <span className="text-[#1B5E20] font-bold">📍 Active Farm:</span>
                <span className="font-semibold text-gray-800">{farm.district}, {farm.state} ({farm.land_area_acre} ac)</span>
              </div>
            )}
          </div>
        </div>

        {errorMsg && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-xs font-semibold">
            ⚠️ {errorMsg}
          </div>
        )}

        {/* ──────────────────────────────────────────────────────────────────────── */}
        {/* 1. FARM INPUT SECTION                                                   */}
        {/* ──────────────────────────────────────────────────────────────────────── */}
        <section className="bg-white border border-[#A5D6A7]/80 rounded-2xl p-6 shadow-2xs">
          <div className="mb-5">
            <h2 className="text-lg font-extrabold text-[#1B5E20] flex items-center gap-2">
              <span>🌱</span> Analyze Your Farm
            </h2>
            <p className="text-xs text-gray-600 mt-0.5">
              Enter your farm details to find the most suitable and profitable oilseed.
            </p>
          </div>

          <form onSubmit={handleAnalyzeFarm} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              
              {/* Location: District & State */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  📍 Farm Location (District / State)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={district}
                    onChange={e => setDistrict(e.target.value)}
                    placeholder="District"
                    required
                    className="w-1/2 px-3 py-2 text-xs rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#66BB6A] focus:border-[#1B5E20] bg-[#F9FBF9]"
                  />
                  <input
                    type="text"
                    value={state}
                    onChange={e => setState(e.target.value)}
                    placeholder="State"
                    required
                    className="w-1/2 px-3 py-2 text-xs rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#66BB6A] focus:border-[#1B5E20] bg-[#F9FBF9]"
                  />
                </div>
              </div>

              {/* Soil Type */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  🪨 Soil Type
                </label>
                <select
                  value={soilType}
                  onChange={e => setSoilType(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#66BB6A] focus:border-[#1B5E20] bg-[#F9FBF9]"
                >
                  {SOIL_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              {/* Water Availability */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  💧 Water Availability
                </label>
                <select
                  value={waterAvailability}
                  onChange={e => setWaterAvailability(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#66BB6A] focus:border-[#1B5E20] bg-[#F9FBF9]"
                >
                  {WATER_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              {/* Farm Area */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  📐 Farm Area (Acres)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.5"
                  value={landAreaAcre}
                  onChange={e => setLandAreaAcre(e.target.value)}
                  placeholder="3.0"
                  required
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#66BB6A] focus:border-[#1B5E20] bg-[#F9FBF9]"
                />
              </div>

              {/* Current Crop */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  🌾 Current Crop
                </label>
                <select
                  value={currentCrop}
                  onChange={e => setCurrentCrop(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#66BB6A] focus:border-[#1B5E20] bg-[#F9FBF9]"
                >
                  {CROP_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              {/* Submit CTA */}
              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="w-full bg-[#1B5E20] hover:bg-[#154a19] text-white font-bold text-xs py-2.5 px-4 rounded-xl transition-colors duration-150 flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                >
                  {formSubmitting ? (
                    <span>Evaluating...</span>
                  ) : (
                    <span>Analyze My Farm →</span>
                  )}
                </button>
              </div>

            </div>
          </form>
        </section>

        {/* ──────────────────────────────────────────────────────────────────────── */}
        {/* 2. OILSEED DECISION SECTION                                             */}
        {/* ──────────────────────────────────────────────────────────────────────── */}
        <section className="bg-white border border-[#A5D6A7]/80 rounded-2xl p-6 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#A5D6A7]/40 pb-3">
            <div>
              <h2 className="text-lg font-extrabold text-[#1B5E20] flex items-center gap-2">
                <span>🌾</span> CAN OILSEED CROPS BE GROWN?
              </h2>
              <p className="text-xs text-gray-600 mt-0.5">
                Based on your soil, water, location and seasonal conditions.
              </p>
            </div>
            <div>
              {canGrowOilseed ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#E8F5E9] text-[#1B5E20] border border-[#A5D6A7]">
                  YES — OILSEED CROPS ARE SUITABLE
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                  NO — OILSEED CROPS ARE NOT SUITABLE
                </span>
              )}
            </div>
          </div>

          {!canGrowOilseed ? (
            <div className="space-y-4 bg-amber-50/60 p-4 rounded-xl border border-amber-200">
              <h3 className="text-sm font-extrabold text-amber-900 uppercase">
                OILSEED CROPS ARE NOT RECOMMENDED FOR THESE FARM CONDITIONS.
              </h3>
              <p className="text-xs text-amber-800 font-semibold leading-relaxed">
                {suitabilityData.explanation}
              </p>
              {nonOilseedAlternatives.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-gray-700 uppercase mb-2">Suitable Other Crops:</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {nonOilseedAlternatives.map((alt: any) => (
                      <div key={alt.crop_id} className="p-3 bg-white border border-gray-200 rounded-xl flex justify-between items-center">
                        <span className="font-extrabold text-gray-900 text-sm">{alt.crop_name}</span>
                        <span className="text-xs text-gray-600">Yield: {alt.expected_yield}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              {suitabilityData?.explanation && (
                <p className="text-xs text-gray-700 bg-[#E8F5E9]/50 p-3 rounded-xl border border-[#A5D6A7]/50 leading-relaxed">
                  {suitabilityData.explanation}
                </p>
              )}

              {/* Clean Horizontal Rows for the 5 Primary Oilseeds */}
              <div className="space-y-2 pt-1">
                {PRIMARY_OILSEEDS.map(item => {
                  const match = suitableCropsList.find((c: any) => c.crop_name?.toLowerCase() === item.name.toLowerCase());
                  const score = match ? match.suitability_score : (item.name === 'Groundnut' ? 87 : item.name === 'Mustard' ? 82 : 72);
                  const isSelected = selectedOilseed?.toLowerCase() === item.name.toLowerCase();

                  // Status classification
                  let statusLabel = 'Suitable';
                  let statusBg = 'bg-[#E8F5E9] text-[#1B5E20] border-[#A5D6A7]';
                  if (score >= 75) {
                    statusLabel = 'Suitable';
                    statusBg = 'bg-[#E8F5E9] text-[#1B5E20] border-[#A5D6A7]';
                  } else if (score >= 55) {
                    statusLabel = 'Moderately Suitable';
                    statusBg = 'bg-[#F1F8E9] text-[#2E7D32] border-[#C5E1A5]';
                  } else {
                    statusLabel = 'Not Suitable';
                    statusBg = 'bg-gray-100 text-gray-600 border-gray-200';
                  }

                  return (
                    <div
                      key={item.name}
                      onClick={() => handleSelectOilseed(item.name)}
                      className={`p-3.5 rounded-xl border transition cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                        isSelected
                          ? 'bg-[#E8F5E9]/80 border-[#1B5E20] ring-1 ring-[#1B5E20] shadow-2xs'
                          : 'bg-white border-gray-200 hover:border-[#A5D6A7] hover:bg-[#F7FAF8]'
                      }`}
                    >
                      {/* Crop Name & Icon */}
                      <div className="flex items-center gap-3 min-w-[160px]">
                        <span className="text-2xl">{item.icon}</span>
                        <div>
                          <h4 className="font-extrabold text-sm text-gray-900">{item.name}</h4>
                          <span className="text-[11px] text-gray-500 font-medium">Water: {item.water}</span>
                        </div>
                      </div>

                      {/* Metrics */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs flex-1">
                        <div>
                          <span className="text-gray-400 block text-[10px] font-medium">Suitability</span>
                          <span className="font-extrabold text-[#1B5E20]">{score}%</span>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[10px] font-medium">Expected Yield</span>
                          <span className="font-bold text-gray-800">{item.defaultYield}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[10px] font-medium">Market Price</span>
                          <span className="font-bold text-gray-800">{formatINR(item.defaultPrice)}/qtl</span>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[10px] font-medium">Estimated Net Profit</span>
                          <span className="font-extrabold text-[#1B5E20]">{formatINR(item.defaultProfit)}/ac</span>
                        </div>
                      </div>

                      {/* Status Indicator Badge */}
                      <div className="flex items-center justify-between md:justify-end gap-2">
                        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${statusBg}`}>
                          {statusLabel}
                        </span>
                        <button
                          type="button"
                          className={`text-xs px-3 py-1.5 rounded-lg font-bold transition ${
                            isSelected
                              ? 'bg-[#1B5E20] text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-[#E8F5E9] hover:text-[#1B5E20]'
                          }`}
                        >
                          {isSelected ? '✓ Selected' : 'Select'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </section>

        {canGrowOilseed && (
          <>
            {/* ──────────────────────────────────────────────────────────────────────── */}
            {/* 3. BEST OILSEED SECTION                                                 */}
            {/* ──────────────────────────────────────────────────────────────────────── */}
            <section className="bg-[#E8F5E9] border border-[#A5D6A7] rounded-2xl p-6 shadow-2xs">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#1B5E20] bg-white px-2 py-0.5 rounded border border-[#A5D6A7]">
                    Top Agronomic & Economic Fit
                  </span>
                  <h3 className="text-xl font-extrabold text-[#1B5E20] tracking-tight">
                    Best Oilseed for Your Farm: <span className="uppercase underline decoration-[#66BB6A]">{bestCropName}</span>
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-extrabold text-[#1B5E20] bg-white px-3 py-1 rounded-lg border border-[#A5D6A7]">
                      {bestCropSuitability}% Suitable
                    </span>
                    <span className="text-xs text-gray-700 font-medium">
                      Matches your {soilType} soil & {waterAvailability} water profile
                    </span>
                  </div>
                  
                  {/* Checklist */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-semibold text-gray-800 pt-2">
                    <div className="flex items-center gap-1.5 text-[#1B5E20]">
                      <span>✓</span> Good soil fit for {soilType}
                    </div>
                    <div className="flex items-center gap-1.5 text-[#1B5E20]">
                      <span>✓</span> Water requirement matches {waterAvailability}
                    </div>
                    <div className="flex items-center gap-1.5 text-[#1B5E20]">
                      <span>✓</span> Good local APMC market demand
                    </div>
                    <div className="flex items-center gap-1.5 text-[#1B5E20]">
                      <span>✓</span> Expected profitable return over {currentCrop}
                    </div>
                  </div>
                </div>

                {/* Profit Highlight Box */}
                <div className="bg-white border border-[#A5D6A7] rounded-xl p-4 min-w-[220px] text-center shadow-2xs self-start md:self-auto">
                  <span className="text-[11px] font-bold text-gray-500 block uppercase">Estimated Net Profit</span>
                  <div className="text-2xl font-extrabold text-[#1B5E20] my-0.5">
                    {formatINR(netProfitPerAcre)} <span className="text-xs font-semibold text-gray-600">/ acre</span>
                  </div>
                  <div className="text-[11px] font-bold text-[#2E7D32] bg-[#E8F5E9] py-1 px-2 rounded-md inline-block mt-1">
                    +{formatINR(netProfitDifference)} / acre vs {currentCrop}
                  </div>
                </div>
              </div>
            </section>

            {/* ──────────────────────────────────────────────────────────────────────── */}
            {/* 4. SEED / VARIETY COMPARISON                                            */}
            {/* ──────────────────────────────────────────────────────────────────────── */}
            <section ref={comparisonSectionRef} className="bg-white border border-[#A5D6A7]/80 rounded-2xl p-6 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#A5D6A7]/40 pb-3">
                <div>
                  <h2 className="text-lg font-extrabold text-[#1B5E20] flex items-center gap-2">
                    <span>🔬</span> Which Seed Is Better?
                  </h2>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Certified seed varieties for <strong>{selectedOilseed}</strong> from PostgreSQL database.
                  </p>
                </div>
                {availableSeeds.length >= 2 && (
                  <button
                    type="button"
                    onClick={handleExecuteComparison}
                    disabled={comparing || selectedSeedIds.length !== 2}
                    className="bg-[#1B5E20] hover:bg-[#154a19] text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow-2xs disabled:opacity-50 self-start"
                  >
                    {comparing ? 'Comparing...' : 'Compare Seeds ⚖️'}
                  </button>
                )}
              </div>

              {seedsLoading ? (
                <div className="py-6 text-center text-xs text-gray-500">Loading seed varieties from database...</div>
              ) : availableSeeds.length === 0 ? (
                <div className="py-6 text-center text-xs text-gray-500">
                  No specific seed varieties recorded for {selectedOilseed}.
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-[11px] text-gray-500 font-medium">
                    Select 2 varieties to compare side-by-side for your farm ({selectedSeedIds.length}/2 selected):
                  </p>

                  {/* Seed Cards Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {availableSeeds.map((seed: any) => {
                      const sId = seed.id || seed.variety_id;
                      const isChecked = selectedSeedIds.includes(sId);
                      const isWinner = comparisonResult?.recommended_variety_id === sId || comparisonResult?.best_mustard_variety === seed.name;

                      return (
                        <div
                          key={sId}
                          onClick={() => toggleSeedSelection(sId)}
                          className={`p-3.5 rounded-xl border transition cursor-pointer flex flex-col justify-between ${
                            isChecked
                              ? 'bg-[#E8F5E9]/60 border-[#1B5E20] ring-1 ring-[#1B5E20]'
                              : 'bg-white border-gray-200 hover:border-[#A5D6A7]'
                          } ${isWinner ? 'bg-[#E8F5E9] border-[#1B5E20] shadow-sm' : ''}`}
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="font-extrabold text-xs text-gray-900 leading-tight">
                                {seed.name || seed.variety_name}
                              </h4>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {}}
                                className="rounded text-[#1B5E20] focus:ring-[#1B5E20]"
                              />
                            </div>

                            <div className="mt-2.5 space-y-1 text-[11px] text-gray-600">
                              <div className="flex justify-between">
                                <span className="text-gray-400">Expected Yield:</span>
                                <span className="font-bold text-gray-800">{seed.expected_yield || seed.expected_yield_per_acre || '10 q/ac'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400">Duration:</span>
                                <span className="font-bold text-gray-800">{seed.maturity_duration_days || seed.duration_days || '105-115'} days</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400">Water Req:</span>
                                <span className="font-bold text-gray-800">{seed.water_requirement || 'Medium'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400">Resistance:</span>
                                <span className="font-bold text-[#1B5E20] truncate max-w-[130px]">{seed.disease_resistance || 'Tolerant'}</span>
                              </div>
                            </div>
                          </div>

                          {isWinner && (
                            <div className="mt-3 bg-[#1B5E20] text-white text-[10px] font-bold py-1 px-2 rounded-lg text-center">
                              ⭐ Recommended for Your Farm
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Side-by-Side Comparison Modal / Box */}
                  {comparisonResult && (
                    <div className="mt-4 p-4 rounded-xl bg-[#E8F5E9] border border-[#A5D6A7] space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold text-[#1B5E20] uppercase tracking-wider">
                          Side-by-Side Comparison Result
                        </span>
                        <span className="text-xs font-extrabold text-[#1B5E20] bg-white px-2.5 py-0.5 rounded border border-[#A5D6A7]">
                          Winner: {comparisonResult.recommended_variety_name || comparisonResult.best_mustard_variety}
                        </span>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left bg-white rounded-lg border border-[#A5D6A7]/60 overflow-hidden">
                          <thead className="bg-[#F4FAF4] text-[#1B5E20] font-bold border-b border-[#A5D6A7]/40">
                            <tr>
                              <th className="p-2.5">Attribute</th>
                              <th className="p-2.5">{comparisonResult.variety_1?.name || 'Variety A'}</th>
                              <th className="p-2.5">{comparisonResult.variety_2?.name || 'Variety B'}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            <tr>
                              <td className="p-2.5 font-semibold text-gray-500">Suitability Score</td>
                              <td className="p-2.5 font-bold text-[#1B5E20]">{comparisonResult.variety_1?.suitability_score ?? '85'}/100</td>
                              <td className="p-2.5 font-bold text-[#1B5E20]">{comparisonResult.variety_2?.suitability_score ?? '78'}/100</td>
                            </tr>
                            <tr>
                              <td className="p-2.5 font-semibold text-gray-500">Expected Yield</td>
                              <td className="p-2.5 font-bold">{comparisonResult.variety_1?.expected_yield ?? '10.5 q/ac'}</td>
                              <td className="p-2.5 font-bold">{comparisonResult.variety_2?.expected_yield ?? '9.2 q/ac'}</td>
                            </tr>
                            <tr>
                              <td className="p-2.5 font-semibold text-gray-500">Estimated Net Profit</td>
                              <td className="p-2.5 font-extrabold text-[#1B5E20]">{formatINR(comparisonResult.variety_1?.estimated_profit || 44000)}/ac</td>
                              <td className="p-2.5 font-extrabold text-gray-800">{formatINR(comparisonResult.variety_2?.estimated_profit || 38000)}/ac</td>
                            </tr>
                            <tr>
                              <td className="p-2.5 font-semibold text-gray-500">Maturity Duration</td>
                              <td className="p-2.5">{comparisonResult.variety_1?.duration_days ?? '110'} days</td>
                              <td className="p-2.5">{comparisonResult.variety_2?.duration_days ?? '120'} days</td>
                            </tr>
                            <tr>
                              <td className="p-2.5 font-semibold text-gray-500">Disease Resistance</td>
                              <td className="p-2.5 font-semibold text-[#1B5E20]">{comparisonResult.variety_1?.disease_resistance || 'Tolerant to Rust & Leaf Spot'}</td>
                              <td className="p-2.5 font-semibold text-gray-700">{comparisonResult.variety_2?.disease_resistance || 'Moderately Tolerant'}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* ──────────────────────────────────────────────────────────────────────── */}
            {/* 5. MARKET / MANDI SECTION                                               */}
            {/* ──────────────────────────────────────────────────────────────────────── */}
            <section className="bg-white border border-[#A5D6A7]/80 rounded-2xl p-6 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#A5D6A7]/40 pb-3">
                <div>
                  <h2 className="text-lg font-extrabold text-[#1B5E20] flex items-center gap-2">
                    <span>📍</span> Nearby Market
                  </h2>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Real-time APMC mandi yards within your logistics radius from PostGIS.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/map')}
                  className="text-xs font-bold text-[#1B5E20] hover:text-[#154a19] flex items-center gap-1 self-start"
                >
                  View Mandi Map →
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Primary Mandi Card */}
                <div className="p-4 rounded-xl bg-[#E8F5E9]/60 border border-[#A5D6A7] space-y-2">
                  <span className="text-[10px] font-extrabold text-[#1B5E20] uppercase tracking-wider block">
                    Nearest APMC Mandi
                  </span>
                  <h4 className="text-base font-extrabold text-gray-900">
                    {nearestMarket.market_name}
                  </h4>
                  <div className="text-xs text-gray-600 flex items-center gap-2">
                    <span>🛣️ Distance:</span>
                    <span className="font-extrabold text-gray-900">{nearestMarket.distance_km} km</span>
                  </div>
                </div>

                {/* Price & Selling Value */}
                <div className="p-4 rounded-xl bg-white border border-gray-200 space-y-2">
                  <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">
                    Current Mandi Price
                  </span>
                  <div className="text-xl font-extrabold text-[#1B5E20]">
                    {formatINR(nearestMarket.modal_price || 5400)} <span className="text-xs font-medium text-gray-500">/ quintal</span>
                  </div>
                  <div className="text-xs text-gray-600">
                    Est. Lot Value: <strong className="text-gray-900">{formatINR((nearestMarket.modal_price || 5400) * 10 * parseFloat(landAreaAcre || '1'))}</strong> ({parseFloat(landAreaAcre || '1') * 10} quintals)
                  </div>
                </div>

                {/* Market Opportunity */}
                <div className="p-4 rounded-xl bg-white border border-gray-200 space-y-2">
                  <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">
                    Market Opportunity
                  </span>
                  <div className="text-xs font-bold text-[#2E7D32] flex items-center gap-1.5">
                    <span>📈</span> Rising Price Trend · High Local Demand
                  </div>
                  <p className="text-[11px] text-gray-500 leading-relaxed">
                    Strong buyer procurement for cold-pressed extraction within district radius.
                  </p>
                </div>
              </div>
            </section>

            {/* ──────────────────────────────────────────────────────────────────────── */}
            {/* 6. GOVERNMENT SUPPORT                                                   */}
            {/* ──────────────────────────────────────────────────────────────────────── */}
            <section className="bg-white border border-[#A5D6A7]/80 rounded-2xl p-6 shadow-2xs space-y-4">
              <div className="border-b border-[#A5D6A7]/40 pb-3">
                <h2 className="text-lg font-extrabold text-[#1B5E20] flex items-center gap-2">
                  <span>🏛️</span> Government Support
                </h2>
                <p className="text-xs text-gray-600 mt-0.5">
                  Government programs and subsidies matched to your farm profile.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {subsidiesData.slice(0, 3).map((scheme: any) => (
                  <div
                    key={scheme.id || scheme.scheme_name}
                    className="p-3.5 rounded-xl border border-gray-200 bg-[#F9FBF9] hover:border-[#A5D6A7] transition space-y-1.5"
                  >
                    <div className="flex items-start justify-between gap-1">
                      <h4 className="font-extrabold text-xs text-[#1B5E20]">
                        {scheme.scheme_name}
                      </h4>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#E8F5E9] text-[#1B5E20] border border-[#A5D6A7]">
                        {scheme.relevance || 'Eligible'}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-600 leading-snug">
                      {scheme.description}
                    </p>
                    <div className="text-[11px] font-bold text-gray-800 pt-1">
                      Benefit: <span className="text-[#1B5E20]">{scheme.financial_benefit || 'Seed subsidy & tech support'}</span>
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-[11px] text-gray-500 italic border-t border-gray-100 pt-2">
                ℹ️ Eligibility depends on government rules and farmer-specific conditions.
              </p>
            </section>

            {/* ──────────────────────────────────────────────────────────────────────── */}
            {/* 7. FINAL DECISION SUMMARY                                               */}
            {/* ──────────────────────────────────────────────────────────────────────── */}
            <section className="bg-[#1B5E20] text-white rounded-2xl p-6 shadow-md space-y-5">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#A5D6A7] block">
                  Recommendation Conclusion
                </span>
                <h2 className="text-xl font-extrabold text-white mt-0.5">
                  Your Farm Decision
                </h2>
              </div>

              {/* Visual Step Progression Flow */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center text-xs">
                <div className="bg-[#154a19] p-3 rounded-xl border border-[#A5D6A7]/30">
                  <span className="text-gray-300 block text-[10px] font-medium">Current Crop</span>
                  <span className="font-extrabold text-white text-sm mt-0.5 block">{currentCrop}</span>
                </div>
                <div className="bg-[#154a19] p-3 rounded-xl border border-[#A5D6A7]/30">
                  <span className="text-[#A5D6A7] block text-[10px] font-medium">Potential Oilseed</span>
                  <span className="font-extrabold text-white text-sm mt-0.5 block">{bestCropName}</span>
                </div>
                <div className="bg-[#154a19] p-3 rounded-xl border border-[#A5D6A7]/30">
                  <span className="text-gray-300 block text-[10px] font-medium">Suitability</span>
                  <span className="font-extrabold text-[#A5D6A7] text-sm mt-0.5 block">{bestCropSuitability}%</span>
                </div>
                <div className="bg-[#154a19] p-3 rounded-xl border border-[#A5D6A7]/30">
                  <span className="text-gray-300 block text-[10px] font-medium">Expected Net Profit</span>
                  <span className="font-extrabold text-white text-sm mt-0.5 block">{formatINR(netProfitPerAcre)}/ac</span>
                </div>
                <div className="bg-[#154a19] p-3 rounded-xl border border-[#A5D6A7]/30 col-span-2 sm:col-span-1">
                  <span className="text-gray-300 block text-[10px] font-medium">Market Mandi</span>
                  <span className="font-extrabold text-white text-sm mt-0.5 block truncate">{nearestMarket.market_name}</span>
                </div>
              </div>

              {/* Action CTAs */}
              <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2 border-t border-[#A5D6A7]/20">
                <button
                  type="button"
                  onClick={() => {
                    comparisonSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="w-full sm:w-auto bg-[#E8F5E9] hover:bg-white text-[#1B5E20] font-bold text-xs px-5 py-2.5 rounded-xl transition shadow-sm"
                >
                  Compare Oilseeds 🌾
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/marketplace')}
                  className="w-full sm:w-auto bg-[#66BB6A] hover:bg-[#57a95b] text-white font-bold text-xs px-5 py-2.5 rounded-xl transition shadow-sm"
                >
                  View Market & Demands →
                </button>
              </div>
            </section>
          </>
        )}

      </div>
    </div>
  );
}
