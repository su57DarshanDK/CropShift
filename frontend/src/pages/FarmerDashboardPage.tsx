import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  getMyFarms, listMyFutureLots, listMyStockLots,
  listMyAuctions, listMyCertificates, getMarketplaceDemands,
  getOilseedSuitability,
} from '../services/api';

export default function FarmerDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [farms, setFarms] = useState<any[]>([]);
  const [futureLots, setFutureLots] = useState<any[]>([]);
  const [stockLots, setStockLots] = useState<any[]>([]);
  const [auctions, setAuctions] = useState<any[]>([]);
  const [demands, setDemands] = useState<any[]>([]);
  const [oilseedData, setOilseedData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [f, fl, sl, au, de] = await Promise.all([
          getMyFarms().catch(() => []),
          listMyFutureLots().catch(() => []),
          listMyStockLots().catch(() => []),
          listMyAuctions().catch(() => []),
          getMarketplaceDemands().catch(() => []),
        ]);
        setFarms(f);
        setFutureLots(fl);
        setStockLots(sl);
        setAuctions(au);
        setDemands(de);

        if (f && f.length > 0) {
          const farmId = f[0].id || f[0].farm_id;
          try {
            const os = await getOilseedSuitability(farmId);
            setOilseedData(os);
          } catch (e) {
            console.error('Failed to load oilseed suitability on dashboard', e);
          }
        }
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    }
    loadData();
  }, []);

  const totalBids = auctions.reduce((acc, a) => acc + (a.bids?.length || 0), 0);
  const acceptedBids = auctions.flatMap(a => a.bids || []).filter(b => b.status === 'ACCEPTED');
  const primaryFarm = farms.length > 0 ? farms[0] : null;

  return (
    <div className="min-h-screen bg-[#F4FAF4] py-8 px-4 sm:px-6 lg:px-8 font-sans text-gray-800">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Top Header Banner */}
        <div className="bg-white border border-[#A5D6A7]/80 rounded-2xl p-6 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#1B5E20] bg-[#E8F5E9] px-2.5 py-0.5 rounded border border-[#A5D6A7]">
                Farmer Portal
              </span>
              <span className="text-xs text-gray-500 font-medium">· Season 2026-27</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1B5E20] mt-1 tracking-tight">
              Welcome, {user?.username || 'Farmer'}
            </h1>
            <p className="text-xs sm:text-sm text-gray-600 mt-0.5">
              Know Your Market Before You Sow — High-Yield Oilseed Shift Platform
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => navigate('/recommendation')}
              className="bg-[#1B5E20] hover:bg-[#154a19] text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-sm flex items-center gap-1.5"
            >
              <span>🌱</span> Analyze & Recommend →
            </button>
            <button
              onClick={() => navigate('/marketplace')}
              className="bg-[#E8F5E9] hover:bg-[#d5ecd7] text-[#1B5E20] border border-[#A5D6A7] text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-2xs flex items-center gap-1.5"
            >
              <span>📢</span> Buyer Demands ({demands.length})
            </button>
          </div>
        </div>

        {/* Quick Decision Highlight */}
        {primaryFarm && oilseedData && oilseedData.suitable_oilseed_crops?.length > 0 && (
          <div className="bg-[#E8F5E9] border border-[#A5D6A7] rounded-2xl p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white border border-[#A5D6A7] flex items-center justify-center text-2xl shadow-2xs flex-shrink-0">
                🥜
              </div>
              <div>
                <span className="text-[10px] font-extrabold text-[#1B5E20] uppercase tracking-wider block">
                  Top Recommended Shift for Farm #{primaryFarm.id} ({primaryFarm.district})
                </span>
                <h3 className="text-lg font-extrabold text-gray-900">
                  {oilseedData.suitable_oilseed_crops[0].crop_name} · <span className="text-[#1B5E20]">{oilseedData.suitable_oilseed_crops[0].suitability_score}% Suitable</span>
                </h3>
                <p className="text-xs text-gray-600">
                  Soil & water conditions support shifting from {primaryFarm.current_crop || 'Paddy'}.
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate('/recommendation')}
              className="bg-[#1B5E20] hover:bg-[#154a19] text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow-2xs self-start sm:self-auto"
            >
              View Decision Details →
            </button>
          </div>
        )}

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          
          {/* Card 1: Crop Decision */}
          <div className="bg-white border border-[#A5D6A7]/80 rounded-2xl p-5 shadow-2xs flex flex-col justify-between hover:border-[#1B5E20] transition">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl p-2 rounded-xl bg-[#E8F5E9] border border-[#A5D6A7]">🌱</span>
                <div>
                  <h3 className="font-extrabold text-sm text-gray-900">Farm Decision Support</h3>
                  <span className="text-[11px] text-gray-500">Agronomic & Financial Fit</span>
                </div>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed mb-4">
                Analyze soil, water, MSP benchmarks and local APMC mandi price trends to evaluate shifting toward oilseeds.
              </p>
              <div className="bg-[#F9FBF9] p-2.5 rounded-xl border border-gray-100 text-xs font-semibold text-[#1B5E20] mb-4">
                {primaryFarm ? `📍 Active: ${primaryFarm.district}, ${primaryFarm.land_area_acre} acres` : 'Setup farm details'}
              </div>
            </div>
            <button
              onClick={() => navigate('/recommendation')}
              className="w-full bg-[#1B5E20] hover:bg-[#154a19] text-white font-bold text-xs py-2.5 rounded-xl transition shadow-2xs"
            >
              {primaryFarm ? 'View Decision Matrix →' : 'Analyze My Farm →'}
            </button>
          </div>

          {/* Card 2: Buyer Demands */}
          <div className="bg-white border border-[#A5D6A7]/80 rounded-2xl p-5 shadow-2xs flex flex-col justify-between hover:border-[#1B5E20] transition">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl p-2 rounded-xl bg-[#E8F5E9] border border-[#A5D6A7]">📢</span>
                <div>
                  <h3 className="font-extrabold text-sm text-gray-900">Buyer Demand Discovery</h3>
                  <span className="text-[11px] text-gray-500">Verified Corporate Buyers</span>
                </div>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed mb-4">
                Explore pre-sowing demand requirements posted by industrial oil millers and food processors.
              </p>
              <div className="bg-[#F9FBF9] p-2.5 rounded-xl border border-gray-100 text-xs font-semibold text-gray-800 mb-4 flex justify-between items-center">
                <span>Active Demands:</span>
                <span className="font-extrabold text-[#1B5E20] bg-[#E8F5E9] px-2 py-0.5 rounded border border-[#A5D6A7]">{demands.length} Available</span>
              </div>
            </div>
            <button
              onClick={() => navigate('/marketplace')}
              className="w-full bg-[#1B5E20] hover:bg-[#154a19] text-white font-bold text-xs py-2.5 rounded-xl transition shadow-2xs"
            >
              Browse Demands →
            </button>
          </div>

          {/* Card 3: Future Crop Lots */}
          <div className="bg-white border border-[#A5D6A7]/80 rounded-2xl p-5 shadow-2xs flex flex-col justify-between hover:border-[#1B5E20] transition">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl p-2 rounded-xl bg-[#E8F5E9] border border-[#A5D6A7]">🌾</span>
                <div>
                  <h3 className="font-extrabold text-sm text-gray-900">Future Crop Lots</h3>
                  <span className="text-[11px] text-gray-500">Pre-Sowing Commitments</span>
                </div>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed mb-4">
                List your future harvest to attract indicative purchase offers and open pre-sowing auctions.
              </p>
              <div className="bg-[#F9FBF9] p-2.5 rounded-xl border border-gray-100 text-xs font-semibold text-gray-800 mb-4 flex justify-between items-center">
                <span>Your Active Lots:</span>
                <span className="font-extrabold text-[#1B5E20] bg-[#E8F5E9] px-2 py-0.5 rounded border border-[#A5D6A7]">{futureLots.length} Listed</span>
              </div>
            </div>
            <button
              onClick={() => navigate('/my-lots')}
              className="w-full bg-[#1B5E20] hover:bg-[#154a19] text-white font-bold text-xs py-2.5 rounded-xl transition shadow-2xs"
            >
              Manage My Lots →
            </button>
          </div>

          {/* Card 4: Indicative Bids & Auctions */}
          <div className="bg-white border border-[#A5D6A7]/80 rounded-2xl p-5 shadow-2xs flex flex-col justify-between hover:border-[#1B5E20] transition">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl p-2 rounded-xl bg-[#E8F5E9] border border-[#A5D6A7]">💰</span>
                <div>
                  <h3 className="font-extrabold text-sm text-gray-900">Bids & Auctions</h3>
                  <span className="text-[11px] text-gray-500">Indicative Offers</span>
                </div>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed mb-4">
                Review conditional bids, compare effective prices minus transport, and manage contact sharing permissions.
              </p>
              <div className="bg-[#F9FBF9] p-2.5 rounded-xl border border-gray-100 text-xs font-semibold text-gray-800 mb-4 flex justify-between items-center">
                <span>Total Bids Received:</span>
                <span className="font-extrabold text-[#1B5E20] bg-[#E8F5E9] px-2 py-0.5 rounded border border-[#A5D6A7]">{totalBids} Bids</span>
              </div>
            </div>
            <button
              onClick={() => navigate('/farmer/auctions')}
              className="w-full bg-[#1B5E20] hover:bg-[#154a19] text-white font-bold text-xs py-2.5 rounded-xl transition shadow-2xs"
            >
              Review Bids →
            </button>
          </div>

          {/* Card 5: Weather Advisory & Mandi */}
          <div className="bg-white border border-[#A5D6A7]/80 rounded-2xl p-5 shadow-2xs flex flex-col justify-between hover:border-[#1B5E20] transition">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl p-2 rounded-xl bg-[#E8F5E9] border border-[#A5D6A7]">🌦️</span>
                <div>
                  <h3 className="font-extrabold text-sm text-gray-900">Weather & Mandi Routing</h3>
                  <span className="text-[11px] text-gray-500">PostGIS Geospatial Engine</span>
                </div>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed mb-4">
                Calculate geodesic distances to nearest APMC yards and review rainfall/temperature advisories.
              </p>
              <div className="bg-[#F9FBF9] p-2.5 rounded-xl border border-gray-100 text-xs font-semibold text-gray-800 mb-4 flex justify-between items-center">
                <span>Location:</span>
                <span className="font-extrabold text-gray-900">{primaryFarm?.district || 'Tumkur'}, {primaryFarm?.state || 'Karnataka'}</span>
              </div>
            </div>
            <button
              onClick={() => navigate('/map')}
              className="w-full bg-[#1B5E20] hover:bg-[#154a19] text-white font-bold text-xs py-2.5 rounded-xl transition shadow-2xs"
            >
              Open Mandi Map →
            </button>
          </div>

          {/* Card 6: Government Schemes */}
          <div className="bg-white border border-[#A5D6A7]/80 rounded-2xl p-5 shadow-2xs flex flex-col justify-between hover:border-[#1B5E20] transition">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl p-2 rounded-xl bg-[#E8F5E9] border border-[#A5D6A7]">🏛️</span>
                <div>
                  <h3 className="font-extrabold text-sm text-gray-900">Government Support</h3>
                  <span className="text-[11px] text-gray-500">Subsidies & DBT Missions</span>
                </div>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed mb-4">
                Explore NMEO-OS, PM-KISAN, PMFBY, and seed subsidy schemes matched to your oilseed cultivation profile.
              </p>
              <div className="bg-[#F9FBF9] p-2.5 rounded-xl border border-gray-100 text-xs font-semibold text-gray-800 mb-4 flex justify-between items-center">
                <span>Featured Scheme:</span>
                <span className="font-extrabold text-[#1B5E20]">NMEO-OS Mission</span>
              </div>
            </div>
            <button
              onClick={() => navigate('/subsidies')}
              className="w-full bg-[#1B5E20] hover:bg-[#154a19] text-white font-bold text-xs py-2.5 rounded-xl transition shadow-2xs"
            >
              Explore Schemes →
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
