import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import EmptyState from '../components/common/EmptyState';
import { useAuth } from '../contexts/AuthContext';
import { getFarmDetails, getRecommendation as getStoredRec, saveFarmDetails, saveRecommendation, clearFarmState } from '../utils/storage';
import { getMyFarms, getRecommendation, deleteFarm } from '../services/api';
import type { FarmDetails } from '../mocks/fixtures';
import type { RecommendationResponse } from '../types/api';
import { getDecisionLabel } from '../utils/labels';

export default function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [farmsList, setFarmsList] = useState<any[]>([]);
  const [selectedFarmId, setSelectedFarmId] = useState<number | null>(null);
  const [farm, setFarm] = useState<FarmDetails | null>(null);
  const [rec, setRec] = useState<RecommendationResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Fetch authenticated farmer's farms and recommendations
  useEffect(() => {
    let isMounted = true;
    async function loadUserData() {
      setLoading(true);
      try {
        const userFarms = await getMyFarms();
        if (!isMounted) return;

        if (Array.isArray(userFarms) && userFarms.length > 0) {
          setFarmsList(userFarms);
          const currentFarmObj = userFarms[0];
          setSelectedFarmId(currentFarmObj.id);

          const formattedFarm: FarmDetails = {
            farm_id: currentFarmObj.id,
            farm_name: currentFarmObj.district ? `${currentFarmObj.district} Farm` : `Farm #${currentFarmObj.id}`,
            land_area: currentFarmObj.land_area_acre,
            current_crop: currentFarmObj.current_crop?.name || 'Paddy',
            water_availability: currentFarmObj.water_availability ? 'Available' : 'Limited',
            soil_type: currentFarmObj.soil_type || 'Red Laterite',
            district: currentFarmObj.district || 'Tumkur',
            state: currentFarmObj.state || 'Karnataka',
            latitude: currentFarmObj.latitude,
            longitude: currentFarmObj.longitude,
          };

          setFarm(formattedFarm);
          saveFarmDetails(formattedFarm);

          // Get recommendation for this farm
          try {
            const recData = await getRecommendation({ farm_id: currentFarmObj.id });
            if (isMounted) {
              setRec(recData);
              saveRecommendation(recData);
            }
          } catch {
            // Fallback to stored recommendation if offline
            if (isMounted) {
              setRec(getStoredRec());
            }
          }
        } else {
          // No farms found in DB
          clearFarmState();
          setFarm(null);
          setRec(null);
          setFarmsList([]);
          setSelectedFarmId(null);
        }
      } catch (err) {
        // Fallback to local storage for user if API fails
        const storedFarm = getFarmDetails();
        const storedRec = getStoredRec();
        if (storedFarm) {
          setFarm(storedFarm);
          setRec(storedRec);
        } else {
          setFarm(null);
          setRec(null);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadUserData();
    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  const handleSelectFarm = async (farmObj: any) => {
    setSelectedFarmId(farmObj.id);
    const formattedFarm: FarmDetails = {
      farm_id: farmObj.id,
      farm_name: farmObj.district ? `${farmObj.district} Farm` : `Farm #${farmObj.id}`,
      land_area: farmObj.land_area_acre,
      current_crop: farmObj.current_crop?.name || 'Paddy',
      water_availability: farmObj.water_availability ? 'Available' : 'Limited',
      soil_type: farmObj.soil_type || 'Red Laterite',
      district: farmObj.district || 'Tumkur',
      state: farmObj.state || 'Karnataka',
      latitude: farmObj.latitude,
      longitude: farmObj.longitude,
    };
    setFarm(formattedFarm);
    saveFarmDetails(formattedFarm);

    try {
      const recData = await getRecommendation({ farm_id: farmObj.id });
      setRec(recData);
      saveRecommendation(recData);
    } catch {
      setRec(null);
    }
  };

  const handleReset = async () => {
    const targetFarmId = selectedFarmId || farm?.farm_id || farm?.id;
    
    if (!targetFarmId) {
      clearFarmState();
      setFarm(null);
      setRec(null);
      setFarmsList([]);
      setSelectedFarmId(null);
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to reset this farm? This will permanently delete the selected farm and its analysis data."
    );

    if (!confirmed) return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      await deleteFarm(targetFarmId);
      clearFarmState();

      // Refresh list from backend to get authoritative current state
      const remainingFarms = await getMyFarms();

      if (Array.isArray(remainingFarms) && remainingFarms.length > 0) {
        setFarmsList(remainingFarms);
        const nextFarmObj = remainingFarms[0];
        setSelectedFarmId(nextFarmObj.id);

        const formattedFarm: FarmDetails = {
          farm_id: nextFarmObj.id,
          farm_name: nextFarmObj.district ? `${nextFarmObj.district} Farm` : `Farm #${nextFarmObj.id}`,
          land_area: nextFarmObj.land_area_acre,
          current_crop: nextFarmObj.current_crop?.name || 'Paddy',
          water_availability: nextFarmObj.water_availability ? 'Available' : 'Limited',
          soil_type: nextFarmObj.soil_type || 'Red Laterite',
          district: nextFarmObj.district || 'Tumkur',
          state: nextFarmObj.state || 'Karnataka',
          latitude: nextFarmObj.latitude,
          longitude: nextFarmObj.longitude,
        };

        setFarm(formattedFarm);
        saveFarmDetails(formattedFarm);

        try {
          const recData = await getRecommendation({ farm_id: nextFarmObj.id });
          setRec(recData);
          saveRecommendation(recData);
        } catch {
          setRec(null);
        }
      } else {
        setFarmsList([]);
        setSelectedFarmId(null);
        setFarm(null);
        setRec(null);
      }
    } catch (err: any) {
      console.error("Failed to delete farm:", err);
      const msg = err?.response?.data?.detail || err?.message || "Failed to delete farm. Please try again.";
      setDeleteError(msg);
      alert(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  const getDecisionBadgeVariant = (decision: string) => {
    switch (decision) {
      case 'SWITCH':
        return 'success';
      case 'CAUTION':
        return 'warning';
      case 'DONT_SWITCH':
        return 'danger';
      default:
        return 'neutral';
    }
  };

  const greetingName = user?.username ? user.username : 'Farmer';

  return (
    <div className="space-y-8">
      {/* Welcome header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 leading-tight">
            Namaste, {greetingName}!
          </h1>
          <p className="text-gray-600 mt-1">
            Welcome back to your crop decision helper dashboard.
          </p>
        </div>
        <div className="flex gap-2 items-center">
          {farmsList.length > 1 && (
            <select
              value={selectedFarmId || ''}
              onChange={(e) => {
                const targetId = Number(e.target.value);
                const target = farmsList.find((f) => f.id === targetId);
                if (target) handleSelectFarm(target);
              }}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold bg-white text-gray-800 shadow-sm"
            >
              {farmsList.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.district ? `${f.district} Farm (${f.land_area_acre} ac)` : `Farm #${f.id}`}
                </option>
              ))}
            </select>
          )}
          {(farm || rec) && (
            <Button
              variant="ghost"
              onClick={handleReset}
              disabled={isDeleting}
              className="text-sm text-red-600 hover:bg-red-50 py-2 px-4 min-h-[44px] cursor-pointer disabled:opacity-50"
            >
              {isDeleting ? 'Deleting...' : 'Reset'}
            </Button>
          )}
        </div>
      </div>

      {/* Main Grid: Farm details and Recommendation summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Farm Details Card */}
        {farm ? (
          <Card
            title="My Farm Summary"
            subtitle={`ID: FARM-${farm.farm_id}`}
            headerTag="h2"
            footer={
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-400">Details are editable anytime</span>
                <Button variant="ghost" onClick={() => navigate('/analyze')} className="text-primary font-bold hover:underline px-2 py-1 min-h-[36px] cursor-pointer">
                  Edit Details
                </Button>
              </div>
            }
          >
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">Farm Name</span>
                <span className="text-base font-bold text-gray-900">{farm.farm_name}</span>
              </div>
              <div>
                <span className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">Land Area</span>
                <span className="text-base font-bold text-gray-900">{farm.land_area} Acre</span>
              </div>
              <div>
                <span className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">Current Crop</span>
                <span className="text-base font-bold text-gray-900">{farm.current_crop}</span>
              </div>
              <div>
                <span className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">Water Availability</span>
                <Badge variant={farm.water_availability === 'Available' ? 'success' : farm.water_availability === 'Limited' ? 'warning' : 'danger'} className="mt-1">
                  {farm.water_availability}
                </Badge>
              </div>
              <div className="col-span-2">
                <span className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">Location</span>
                <span className="text-base font-medium text-gray-800">{farm.district}, {farm.state}</span>
              </div>
            </div>
          </Card>
        ) : (
          <Card title="My Farm Summary" headerTag="h2">
            <EmptyState
              title="No Farm Profile"
              message="Please input your farm specifications to start."
              actionLabel="Input Farm Details"
              onAction={() => navigate('/analyze')}
            />
          </Card>
        )}

        {/* Recommendation Card */}
        {farm && rec ? (
          <Card
            title="Latest Analysis"
            subtitle="Calculated shift recommendations"
            headerTag="h2"
            footer={
              <div className="flex justify-end">
                <Link
                  to="/recommendation"
                  className="text-primary font-bold hover:underline text-sm inline-flex items-center gap-1 py-1"
                >
                  See Full Recommendation &rarr;
                </Link>
              </div>
            }
          >
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                <div>
                  <span className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">Decision</span>
                  <Badge variant={getDecisionBadgeVariant(rec.decision)} className="mt-1 text-sm py-1 px-3">
                    {getDecisionLabel(rec.decision)}
                  </Badge>
                </div>
                <div className="text-right">
                  <span className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">Safety Score</span>
                  <span className="text-3xl font-extrabold text-gray-900">{rec.safety_score}<span className="text-sm font-normal text-gray-400">/100</span></span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">Recommended Crop</span>
                  <span className="text-lg font-bold text-primary">{rec.recommended_crop}</span>
                </div>
                <div>
                  <span className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">Expected Difference</span>
                  <span className={`text-lg font-extrabold ${rec.profit_difference >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    {rec.profit_difference >= 0 ? '+' : ''}₹{rec.profit_difference.toLocaleString()}/acre
                  </span>
                </div>
              </div>
            </div>
          </Card>
        ) : (
          farm && (
            <Card title="Latest Analysis" headerTag="h2">
              <div className="text-center py-6">
                <p className="text-gray-500 mb-4">No recommendation exists for your farm yet.</p>
                <Button variant="primary" onClick={() => navigate('/analyze')} className="w-full sm:w-auto cursor-pointer">
                  Analyze My Farm
                </Button>
              </div>
            </Card>
          )
        )}
      </div>

      {/* Main call-to-action if no recommendation/farm */}
      {(!farm || !rec) && (
        <div className="bg-primary-50 border border-primary-200 rounded-2xl p-6 text-center shadow-sm">
          <h2 className="text-xl font-bold text-primary-900 mb-2">Should you switch to an oilseed crop?</h2>
          <p className="text-gray-600 max-w-xl mx-auto mb-4 font-medium">
            Input your crop info, land acreage, water, and soil context. We will compute suitability, profitability, and local market risk matching official schemes.
          </p>
          <Button variant="primary" onClick={() => navigate('/analyze')} className="text-lg py-3 px-8 shadow-md cursor-pointer">
            Analyze My Farm
          </Button>
        </div>
      )}

      {/* Quick Links Menu Grid */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-gray-900">Quick Tools</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <Link
            to="/profit"
            className="p-4 bg-white border border-gray-200 hover:border-primary rounded-xl flex flex-col items-center justify-center text-center shadow-sm hover:shadow-md transition-all gap-2 group"
          >
            <div className="p-3 bg-green-50 text-primary rounded-lg group-hover:bg-primary group-hover:text-white transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="font-bold text-gray-800 text-sm">Profitability</span>
          </Link>
          <Link
            to="/market"
            className="p-4 bg-white border border-gray-200 hover:border-primary rounded-xl flex flex-col items-center justify-center text-center shadow-sm hover:shadow-md transition-all gap-2 group"
          >
            <div className="p-3 bg-amber-50 text-amber-700 rounded-lg group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <span className="font-bold text-gray-800 text-sm">Markets</span>
          </Link>
          <Link
            to="/map"
            className="p-4 bg-white border border-gray-200 hover:border-primary rounded-xl flex flex-col items-center justify-center text-center shadow-sm hover:shadow-md transition-all gap-2 group"
          >
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <span className="font-bold text-gray-800 text-sm">Geospatial Map</span>
          </Link>
          <Link
            to="/subsidies"
            className="p-4 bg-white border border-gray-200 hover:border-primary rounded-xl flex flex-col items-center justify-center text-center shadow-sm hover:shadow-md transition-all gap-2 group"
          >
            <div className="p-3 bg-purple-50 text-purple-600 rounded-lg group-hover:bg-purple-600 group-hover:text-white transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <span className="font-bold text-gray-800 text-sm">Subsidies</span>
          </Link>
          <Link
            to="/ivr"
            className="p-4 bg-white border border-gray-200 hover:border-primary rounded-xl flex flex-col items-center justify-center text-center shadow-sm hover:shadow-md transition-all col-span-2 sm:col-span-1 gap-2 group"
          >
            <div className="p-3 bg-teal-50 text-teal-600 rounded-lg group-hover:bg-teal-600 group-hover:text-white transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </div>
            <span className="font-bold text-gray-800 text-sm">IVR Support</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
