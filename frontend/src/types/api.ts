// Enums as string literal unions as required by Phase B0 Task 6

export type Decision = 'SWITCH' | 'CAUTION' | 'DONT_SWITCH';

export type Trend = 'RISING' | 'STABLE' | 'FALLING';

export type DataStatus = 'REAL' | 'STATIC' | 'DEMO' | 'ESTIMATED';

export type Relevance = 'HIGH' | 'MEDIUM' | 'LOW';

export type EligibilityStatus = 
  | 'LIKELY_ELIGIBLE'
  | 'VERIFICATION_REQUIRED'
  | 'LIKELY_NOT_ELIGIBLE';

// Coordinate structure for mapping
export interface Coordinate {
  latitude: number;
  longitude: number;
}

// 10.1 Recommendation Types
export interface RecommendationRequest {
  farm_id: number;
  latitude?: number;
  longitude?: number;
}

export interface RecommendationResponse {
  recommended_crop: string;
  suitability_score: number;
  profitability_score: number;
  market_score: number;
  risk_score: number;
  safety_score: number;
  decision: Decision;
  expected_profit: number;
  current_crop_profit: number;
  profit_difference: number;
  reasons: string[];
  risks: string[];
}

// 10.2 Profitability Types
export interface CropEconomics {
  crop_id: number;
  crop_name: string;
  expected_yield: number;
  yield_unit: string;
  production_cost: number;
  expected_revenue: number;
  estimated_profit: number;
  data_status: DataStatus;
}

export interface ProfitabilityResponse {
  current_crop: CropEconomics;
  recommended_crop: CropEconomics;
  expected_yield: number;
  production_cost: number;
  expected_revenue: number;
  estimated_profit: number;
  profit_difference: number;
}

// 10.3 Market Types
export interface MarketItem {
  crop_id: number;
  crop_name: string;
  price: number;
  price_unit: string;
  market_name: string;
  market_location: string;
  distance_km: number;
  trend: Trend;
  market_score: number;
  data_status: DataStatus;
  data_source: string;
}

// 10.4 Subsidies Types
export interface SubsidyScheme {
  scheme_id: string;
  scheme_name: string;
  relevance: Relevance;
  eligibility_status: EligibilityStatus;
  eligibility_factors: string[];
  required_information: string[];
  support_information: string;
  verification_required: boolean;
  data_source: string;
}

// 10.5 Geospatial Types
export interface NearbyMarketLocation {
  market_name: string;
  latitude: number;
  longitude: number;
  distance_km: number;
  current_price?: number;
  price_unit?: string;
}

export interface FarmLocation {
  farm_id: number;
  farm_name?: string;
  latitude: number;
  longitude: number;
}

export interface GeospatialResponse {
  farm: FarmLocation;
  nearby_markets: NearbyMarketLocation[];
  distance_info?: string; // distance information
  distance_information?: string;
  geographic_context: {
    district: string;
    state: string;
    markets_count: number;
  };
}

// 10.6 Risk Simulation Types
export interface RiskRequest {
  farm_id: number;
  crop_id: number;
}

export interface RiskScenario {
  safety_score: number;
  decision: Decision;
}

export interface RiskSimulationResponse {
  baseline: RiskScenario;
  price_down: RiskScenario;
  yield_down: RiskScenario;
  water_risk: RiskScenario;
}

// 10.7 IVR Types
export interface IvrRequest {
  farmer_id: number;
}

export interface IvrResponse {
  farmer_name: string;
  voice_script: string;
  recommendation: RecommendationResponse;
}

// 10.8 Mustard Seed Comparison Types
export interface MustardVarietyResult {
  variety_id: number;
  variety_name: string;
  variety_code: string;
  suitable_soil_types: string;
  water_requirement: string;
  maturity_duration_days: number;
  suitability_score: number;
  profitability_score: number;
  market_score: number;
  risk_score: number;
  overall_score: number;
  expected_yield_per_acre: number;
  yield_unit: string;
  expected_price_per_unit: number;
  production_cost_per_acre: number;
  profit_per_acre: number;
  estimated_revenue: number;
  estimated_cost: number;
  estimated_net_profit: number;
  decision: 'RECOMMENDED' | 'SUITABLE' | 'ALTERNATIVE' | string;
  disease_resistance?: string;
  pest_risk?: string;
  suitability_info?: string;
  region_suitability?: string;
  market_info?: string;
  data_source?: string;
  reasons: string[];
  risks: string[];
}

export interface MustardComparisonResponse {
  farm_id: number;
  farm_name: string;
  current_crop: string;
  land_area_acre: number;
  soil_type: string;
  water_availability: string;
  district: string;
  state: string;
  best_mustard_variety: string;
  comparison: MustardVarietyResult[];
}

// Error Interface (Section 13)
export interface AppErrorDetail {
  field?: string;
  message: string;
}

export interface AppErrorResponse {
  error: {
    code: 'INVALID_FARM' | 'FARM_NOT_FOUND' | 'FARMER_NOT_FOUND' | 'CROP_NOT_FOUND' | 'INVALID_INPUT' | 'DATA_UNAVAILABLE' | 'INTERNAL_ERROR' | 'NETWORK_ERROR' | string;
    message: string;
    details: AppErrorDetail[];
  };
}

// Normalized UI error representation
export interface AppError {
  code: string;
  message: string;
  details?: AppErrorDetail[];
}

// ── Market Platform Types ─────────────────────────────────────────────────────

export interface BuyerDemand {
  id: number;
  buyer_id: number;
  buyer_username?: string;
  crop_name: string;
  quantity_tonnes: number;
  required_grade?: string;
  harvest_period_start?: string;
  harvest_period_end?: string;
  preferred_location?: string;
  state?: string;
  min_price_per_qtl?: number;
  max_price_per_qtl?: number;
  status: 'OPEN' | 'CLOSED';
  created_at?: string;
  // Marketplace-specific
  match_score?: number;
  match_reasons?: string[];
}

export interface FutureLot {
  id: number;
  farmer_id: number;
  farmer_username?: string;
  farm_id: number;
  crop_name: string;
  land_area_acre?: number;
  expected_quantity_tonnes?: number;
  expected_harvest_start?: string;
  expected_harvest_end?: string;
  expected_grade?: string;
  location?: string;
  state?: string;
  description?: string;
  certificate_id?: number;
  status: 'OPEN' | 'CLOSED' | 'ACCEPTED';
  created_at?: string;
}

export interface StockLot {
  id: number;
  farmer_id: number;
  farmer_username?: string;
  farm_id?: number;
  crop_name: string;
  quantity_tonnes: number;
  actual_grade?: string;
  location?: string;
  state?: string;
  harvest_date?: string;
  description?: string;
  certificate_id?: number;
  status: 'AVAILABLE' | 'SOLD' | 'CLOSED';
  created_at?: string;
}

export interface Certificate {
  id: number;
  farmer_id: number;
  farm_id?: number;
  crop: string;
  grade?: string;
  issuing_organization?: string;
  issue_date?: string;
  certificate_number?: string;
  file_path?: string;
  verification_status: 'PENDING' | 'VERIFIED' | 'REJECTED';
  notes?: string;
  created_at?: string;
}

export interface Bid {
  id: number;
  auction_id: number;
  buyer_id: number;
  buyer_username?: string;
  bid_price_per_qtl: number;
  quantity_tonnes?: number;
  required_grade?: string;
  quality_conditions?: string;
  transport_cost_per_qtl?: number;
  additional_conditions?: string;
  effective_price_per_qtl?: number;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  created_at?: string;
}

export interface Auction {
  id: number;
  lot_type: 'FUTURE_CROP' | 'STOCK';
  lot_id: number;
  farmer_id: number;
  status: 'OPEN' | 'CLOSED' | 'ACCEPTED';
  created_at?: string;
  bids: Bid[];
}

export interface ContactSharingStatus {
  bid_id: number;
  farmer_permission: boolean;
  buyer_permission: boolean;
  status: 'PENDING' | 'MUTUAL_APPROVAL' | 'DECLINED' | 'SHARED';
  farmer_contact?: { username: string; email: string } | null;
  buyer_contact?: { username: string; email: string } | null;
}

export interface MarketplaceLot {
  lot_type: 'FUTURE' | 'STOCK';
  id: number;
  farmer_username?: string;
  crop_name: string;
  quantity?: number;
  quantity_unit: string;
  grade?: string;
  location?: string;
  state?: string;
  harvest_period?: string;
  status: string;
  has_certificate: boolean;
  created_at?: string;
}

