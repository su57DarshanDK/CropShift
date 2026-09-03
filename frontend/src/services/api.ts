import apiClient from './apiClient';
import type { 
  RecommendationRequest, 
  RecommendationResponse,
  ProfitabilityResponse,
  MarketItem,
  SubsidyScheme,
  GeospatialResponse,
  RiskRequest,
  RiskSimulationResponse,
  IvrRequest,
  IvrResponse,
  MustardComparisonResponse
} from '../types/api';
import { USE_MOCKS, delay } from '../mocks';

// Mock Resolvers
import { getMockRecommendation } from './recommendationService';
import { getMockProfitability } from './profitabilityService';
import { getMockMarkets } from './marketService';
import { getMockSubsidies } from './subsidyService';
import { getMockGeospatial } from './geospatialService';
import { getMockRiskSimulation } from './riskService';
import { getMockIvrResponse } from './ivrService';

/**
 * centralized api services
 */

export async function getMyFarms(): Promise<any[]> {
  const response = await apiClient.get('/api/v1/farms');
  return response.data;
}

export async function getFarmById(farmId: number): Promise<any> {
  const response = await apiClient.get(`/api/v1/farms/${farmId}`);
  return response.data;
}

export async function createFarm(farmData: any): Promise<any> {
  const response = await apiClient.post('/api/v1/farms', farmData);
  return response.data;
}

export async function updateFarm(farmId: number, farmData: any): Promise<any> {
  const response = await apiClient.put(`/api/v1/farms/${farmId}`, farmData);
  return response.data;
}

export async function deleteFarm(farmId: number): Promise<{ status: string; message: string }> {
  const response = await apiClient.delete<{ status: string; message: string }>(`/api/v1/farms/${farmId}`);
  return response.data;
}

export async function getRecommendation(farm: any): Promise<RecommendationResponse> {
  if (USE_MOCKS) {
    return getMockRecommendation(farm);
  }
  const payload: RecommendationRequest = {
    farm_id: farm.farm_id, // now explicitly expecting farm_id
  };
  if (farm.latitude !== undefined) payload.latitude = farm.latitude;
  if (farm.longitude !== undefined) payload.longitude = farm.longitude;
  
  const response = await apiClient.post<RecommendationResponse>('/api/v1/recommendations', payload);
  return response.data;
}

export async function getOilseedSuitability(farmId: number): Promise<any> {
  const response = await apiClient.get(`/api/v1/recommendations/farms/${farmId}/oilseed-suitability`);
  return response.data;
}

export async function getSeeds(crop: string, farmId?: number): Promise<any[]> {
  const response = await apiClient.get('/api/v1/seeds', {
    params: { crop, farm_id: farmId },
  });
  return response.data;
}

export async function compareSeeds(data: { farm_id: number; crop_name: string; seed_id_1: number; seed_id_2: number }): Promise<any> {
  const response = await apiClient.post('/api/v1/seeds/compare', data);
  return response.data;
}

export async function getProfitability(farmId?: number, cropId?: number): Promise<ProfitabilityResponse> {
  if (USE_MOCKS) {
    return getMockProfitability();
  }
  const response = await apiClient.get<ProfitabilityResponse>(`/api/v1/profitability/${farmId}`, {
    params: { crop_id: cropId },
  });
  return response.data;
}

export async function getMarkets(cropId: number): Promise<MarketItem> {
  if (USE_MOCKS) {
    return getMockMarkets(cropId);
  }
  const response = await apiClient.get<MarketItem>(`/api/v1/markets/${cropId}`);
  return response.data;
}

export async function getSubsidies(farmId: number): Promise<SubsidyScheme[]> {
  if (USE_MOCKS) {
    return getMockSubsidies();
  }
  const response = await apiClient.get<SubsidyScheme[]>(`/api/v1/subsidies/${farmId}`);
  return response.data;
}

export async function getGeospatial(farmId: number): Promise<GeospatialResponse> {
  if (USE_MOCKS) {
    return getMockGeospatial();
  }
  const response = await apiClient.get<GeospatialResponse>(`/api/v1/geospatial/${farmId}`);
  return response.data;
}

export async function runRiskSimulation(farmId: number, cropId: number, priceVariance: number = 0.8, yieldVariance: number = 0.7): Promise<RiskSimulationResponse> {
  if (USE_MOCKS) {
    return getMockRiskSimulation();
  }
  const response = await apiClient.post<RiskSimulationResponse>('/api/v1/risk-simulation', {
    farm_id: farmId,
    crop_id: cropId,
    price_variance: priceVariance,
    yield_variance: yieldVariance,
  });
  return response.data;
}

export async function getIvrRecommendation(req: IvrRequest): Promise<IvrResponse> {
  if (USE_MOCKS) {
    return getMockIvrResponse(req.farmer_id);
  }
  const response = await apiClient.post<IvrResponse>('/api/v1/ivr/recommendation', req);
  return response.data;
}

export async function getMustardComparison(farmId: number): Promise<MustardComparisonResponse> {
  const response = await apiClient.get<MustardComparisonResponse>(`/api/v1/farms/${farmId}/mustard-comparison`);
  return response.data;
}

export async function getHealth(): Promise<{ status: string }> {
  const response = await apiClient.get<{ status: string }>('/health');
  return response.data;
}

// ── Market Platform Services ──────────────────────────────────────────────────

import type {
  BuyerDemand, FutureLot, StockLot, Certificate,
  Auction, Bid, ContactSharingStatus, MarketplaceLot
} from '../types/api';

// Buyer Demands
export async function createBuyerDemand(data: Partial<BuyerDemand>): Promise<BuyerDemand> {
  const r = await apiClient.post<BuyerDemand>('/api/v1/buyer-demands', data);
  return r.data;
}
export async function listBuyerDemands(params?: { crop?: string; state?: string }): Promise<BuyerDemand[]> {
  const r = await apiClient.get<BuyerDemand[]>('/api/v1/buyer-demands', { params });
  return r.data;
}
export async function listMyDemands(): Promise<BuyerDemand[]> {
  const r = await apiClient.get<BuyerDemand[]>('/api/v1/buyer-demands/mine');
  return r.data;
}
export async function closeBuyerDemand(id: number): Promise<{ status: string; message: string }> {
  const r = await apiClient.delete<{ status: string; message: string }>(`/api/v1/buyer-demands/${id}`);
  return r.data;
}

// Future Lots
export async function createFutureLot(data: Partial<FutureLot>): Promise<FutureLot> {
  const r = await apiClient.post<FutureLot>('/api/v1/future-lots', data);
  return r.data;
}
export async function listFutureLots(params?: { crop?: string; state?: string }): Promise<FutureLot[]> {
  const r = await apiClient.get<FutureLot[]>('/api/v1/future-lots', { params });
  return r.data;
}
export async function listMyFutureLots(): Promise<FutureLot[]> {
  const r = await apiClient.get<FutureLot[]>('/api/v1/future-lots/mine');
  return r.data;
}
export async function getFutureLot(id: number): Promise<FutureLot> {
  const r = await apiClient.get<FutureLot>(`/api/v1/future-lots/${id}`);
  return r.data;
}

// Stock Lots
export async function createStockLot(data: Partial<StockLot>): Promise<StockLot> {
  const r = await apiClient.post<StockLot>('/api/v1/stock-lots', data);
  return r.data;
}
export async function listStockLots(params?: { crop?: string; state?: string }): Promise<StockLot[]> {
  const r = await apiClient.get<StockLot[]>('/api/v1/stock-lots', { params });
  return r.data;
}
export async function listMyStockLots(): Promise<StockLot[]> {
  const r = await apiClient.get<StockLot[]>('/api/v1/stock-lots/mine');
  return r.data;
}

// Certificates
export async function uploadCertificate(formData: FormData): Promise<Certificate> {
  const r = await apiClient.post<Certificate>('/api/v1/certificates', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return r.data;
}
export async function listMyCertificates(): Promise<Certificate[]> {
  const r = await apiClient.get<Certificate[]>('/api/v1/certificates/mine');
  return r.data;
}
export async function verifyCertificate(id: number): Promise<{ status: string; verification_status: string }> {
  const r = await apiClient.post<{ status: string; verification_status: string }>(`/api/v1/certificates/${id}/verify`);
  return r.data;
}

// Auctions
export async function openAuction(lotType: string, lotId: number): Promise<Auction> {
  const r = await apiClient.post<Auction>('/api/v1/auctions', { lot_type: lotType, lot_id: lotId });
  return r.data;
}
export async function getAuction(id: number): Promise<Auction> {
  const r = await apiClient.get<Auction>(`/api/v1/auctions/${id}`);
  return r.data;
}
export async function getAuctionByLot(lotType: string, lotId: number): Promise<Auction | null> {
  // lotType can be 'future', 'FUTURE_CROP', 'stock', 'STOCK'
  try {
    const r = await apiClient.get<Auction | null>(`/api/v1/auctions/lots/${lotType}/${lotId}`);
    return r.data;
  } catch {
    return null;
  }
}
export async function getBid(bidId: number): Promise<Bid> {
  const r = await apiClient.get<Bid>(`/api/v1/auctions/bids/${bidId}`);
  return r.data;
}
export async function listMyAuctions(): Promise<Auction[]> {
  const r = await apiClient.get<Auction[]>('/api/v1/auctions/mine');
  return r.data;
}
export async function placeBid(auctionId: number, data: Partial<Bid>): Promise<Bid> {
  const r = await apiClient.post<Bid>(`/api/v1/auctions/${auctionId}/bids`, data);
  return r.data;
}
export async function listAuctionBids(auctionId: number): Promise<Bid[]> {
  const r = await apiClient.get<Bid[]>(`/api/v1/auctions/${auctionId}/bids`);
  return r.data;
}
export async function acceptBid(bidId: number): Promise<any> {
  const r = await apiClient.post<any>(`/api/v1/auctions/bids/${bidId}/accept`);
  return r.data;
}
export async function listMyBids(): Promise<Bid[]> {
  const r = await apiClient.get<Bid[]>('/api/v1/auctions/bids/mine');
  return r.data;
}

// Contact Sharing
export async function setContactSharingPermission(bidId: number, allow: boolean): Promise<ContactSharingStatus> {
  const r = await apiClient.post<ContactSharingStatus>(`/api/v1/contact-sharing/${bidId}/permission`, null, {
    params: { allow },
  });
  return r.data;
}
export async function getContactSharing(bidId: number): Promise<ContactSharingStatus> {
  const r = await apiClient.get<ContactSharingStatus>(`/api/v1/contact-sharing/${bidId}`);
  return r.data;
}

// Marketplace
export async function getMarketplaceDemands(params?: { crop?: string; state?: string }): Promise<BuyerDemand[]> {
  const r = await apiClient.get<BuyerDemand[]>('/api/v1/marketplace/demands', { params });
  return r.data;
}
export async function getMarketplaceLots(params?: { crop?: string; state?: string; lot_type?: string }): Promise<MarketplaceLot[]> {
  const r = await apiClient.get<MarketplaceLot[]>('/api/v1/marketplace/lots', { params });
  return r.data;
}

