/**
 * Hostels API Client
 * وحدة النزل - API
 */
import api from './client';

export interface Hostel {
  id: string;
  name_ar: string;
  name_fr?: string;
  short_name?: string;
  address?: string;
  phone?: string;
  email?: string;
  logo?: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  check_in_time?: string;
  check_out_time?: string;
  total_beds: number;
  available_beds: number;
  occupancy_rate: number;
}

export interface HostelDetail extends Hostel {
  cancellation_policy?: string;
  rules?: string;
  has_male_wing: boolean;
  has_female_wing: boolean;
  has_vip_rooms: boolean;
  has_special_housing: boolean;
  male_wing_name?: string;
  female_wing_name?: string;
  financial_regime?: string;
  faaj_affiliated?: boolean;
  wings: Wing[];
}

export interface Wing {
  id: string;
  hostel_id: string;
  wing_type: 'MALE' | 'FEMALE' | 'VIP' | 'SPECIAL';
  name_ar: string;
  name_fr?: string;
  floor: number;
  total_beds: number;
  available_beds: number;
  is_active: boolean;
  notes?: string;
  rooms?: Room[];
}

export interface Room {
  id: string;
  wing_id: string;
  room_number: string;
  floor: number;
  room_type: 'STANDARD' | 'VIP' | 'SPECIAL';
  total_beds: number;
  available_beds: number;
  price_per_bed: number;
  has_air_conditioning: boolean;
  has_hot_water: boolean;
  has_balcony: boolean;
  housekeeping_status: 'CLEAN' | 'DIRTY' | 'CLEANING' | 'MAINTENANCE';
  is_active: boolean;
  notes?: string;
  beds?: Bed[];
}

export interface Bed {
  id: string;
  room_id: string;
  bed_number: number;
  bed_type: BedType;
  beds_count: number;
  is_occupied: boolean;
  is_maintenance: boolean;
  condition: BedCondition;
  notes?: string;
}

export type BedType = 
  | 'REGULAR_WOODEN' | 'BUNK_WOODEN' | 'DOUBLE_WOODEN' | 'CHILD_WOODEN'
  | 'REGULAR_IRON' | 'BUNK_IRON' | 'DOUBLE_IRON' | 'CHILD_IRON';

export type BedCondition = 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';

export interface Reservation {
  id: string;
  hostel_id: string;
  wing_id?: string;
  room_id?: string;
  bed_id?: string;
  booking_type: 'INDIVIDUAL' | 'GROUP' | 'OFFICIAL';
  association_name?: string;
  mission_order_ref?: string;
  faaj_card_number?: string;
  guest_name: string;
  guest_type: 'EMPLOYEE' | 'VISITOR' | 'VIP';
  nationality?: string;
  phone?: string;
  email?: string;
  check_in_date: string;
  check_out_date: string;
  number_of_nights: number;
  number_of_beds: number;
  is_free: boolean;
  discount_reason_id?: string;
  discount_percentage: number;
  original_price?: number;
  price_per_night: number;
  total_price: number;
  payment_status: 'PENDING' | 'PAID' | 'REFUNDED';
  payment_method?: string;
  status: 'PENDING' | 'CONFIRMED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'CANCELLED' | 'REJECTED';
  rejection_reason?: string;
  special_requests?: string;
  created_at: string;
}

export interface FreeReason {
  id: string;
  code: string;
  name_ar: string;
  name_fr?: string;
  description?: string;
  is_active: boolean;
  discount_percentage: number;
  requires_approval: boolean;
}

export interface NearbyPlace {
  name: string;
  type: string;
  lat: number;
  lon: number;
}

export interface NearbyPlaces {
  tourism: NearbyPlace[];
  restaurants: NearbyPlace[];
  hospitals: NearbyPlace[];
  pharmacies: NearbyPlace[];
  shopping: NearbyPlace[];
  atm: NearbyPlace[];
}

export interface ReservationGuest {
  id: string;
  reservation_id: string;
  full_name: string;
  date_of_birth?: string;
  place_of_birth?: string;
  nationality?: string;
  address?: string;
  id_document_type?: string;
  id_document_number?: string;
  id_issue_date?: string;
  id_issue_place?: string;
  is_police_synced?: boolean;
}

export interface FinancialReceipt {
  id: string;
  receipt_number: string;
  reservation_id: string;
  hostel_id: string;
  amount: number;
  payment_method: string;
  issued_at: string;
  issued_by_id: string;
  is_cancelled: boolean;
  cancellation_reason?: string;
}

export interface DamageReport {
  id: string;
  report_number: string;
  reservation_id?: string;
  hostel_id: string;
  room_id?: string;
  inventory_item_id?: string;
  description: string;
  estimated_cost?: number;
  is_paid_by_guest: boolean;
  is_synced_to_inventory: boolean;
  created_at: string;
  created_by_id?: string;
}

export interface PoliceForm {
  reservation: Reservation;
  guests: ReservationGuest[];
}

// === Public APIs ===

export const hostelsApi = {
  // Profile management
  async updateProfile(hostelId: string, data: {
    has_male_wing?: boolean;
    has_female_wing?: boolean;
    has_vip_rooms?: boolean;
    has_special_housing?: boolean;
    male_wing_name?: string;
    female_wing_name?: string;
    check_in_time?: string;
    check_out_time?: string;
    cancellation_policy?: string;
    rules?: string;
    financial_regime?: string;
    faaj_affiliated?: boolean;
  }): Promise<HostelDetail> {
    return api.patch(`/youth-hostels/profiles/${hostelId}`, data).then(r => r.data);
  },

  // Admin endpoints
  async getHostels(): Promise<Hostel[]> {
    return api.get('/youth-hostels').then(r => r.data);
  },

  // Public endpoints
  async getPublicHostels(): Promise<Hostel[]> {
    return api.get('/youth-hostels/public/hostels').then(r => r.data);
  },

  async getHostel(id: string): Promise<HostelDetail> {
    return api.get(`/youth-hostels/${id}`).then(r => r.data);
  },

  async getPublicHostel(id: string): Promise<HostelDetail> {
    return api.get(`/youth-hostels/public/hostels/${id}`).then(r => r.data);
  },

  async getNearbyPlaces(hostelId: string, radius?: number): Promise<NearbyPlaces> {
    return api.get(`/youth-hostels/public/hostels/${hostelId}/nearby-places`, {
      params: { radius }
    }).then(r => r.data);
  },

  async getFreeReasons(): Promise<FreeReason[]> {
    return api.get('/youth-hostels/public/free-reasons').then(r => r.data);
  },

  async createBooking(hostelId: string, data: {
    guest_name: string;
    guest_type?: 'EMPLOYEE' | 'VISITOR' | 'VIP';
    national_id?: string;
    passport_number?: string;
    nationality?: string;
    phone?: string;
    email?: string;
    check_in_date: string;
    check_out_date: string;
    number_of_beds: number;
    is_free?: boolean;
    discount_reason_id?: string;
    special_requests?: string;
  }): Promise<{ message: string; reservation_id: string; status: string }> {
    return api.post(`/youth-hostels/public/book?hostel_id=${hostelId}`, data).then(r => r.data);
  },

  async getReservationStatus(reservationId: string, email: string): Promise<{
    reservation_id: string;
    guest_name: string;
    status: string;
    check_in_date: string;
    check_out_date: string;
    number_of_beds: number;
    total_price: number;
    is_free: boolean;
  }> {
    return api.get(`/youth-hostels/public/reservation/${reservationId}/status`, {
      params: { email }
    }).then(r => r.data);
  },

  // Admin endpoints
  async getWings(hostelId: string): Promise<Wing[]> {
    return api.get(`/youth-hostels/${hostelId}/wings`).then(r => r.data);
  },

  async createWing(hostelId: string, data: Partial<Wing>): Promise<Wing> {
    return api.post(`/youth-hostels/${hostelId}/wings`, data).then(r => r.data);
  },

  async updateWing(wingId: string, data: Partial<Wing>): Promise<Wing> {
    return api.patch(`/youth-hostels/wings/${wingId}`, data).then(r => r.data);
  },

  async deleteWing(wingId: string): Promise<void> {
    return api.delete(`/youth-hostels/wings/${wingId}`);
  },

  async getRooms(wingId: string): Promise<Room[]> {
    return api.get(`/youth-hostels/wings/${wingId}/rooms`).then(r => r.data);
  },

  async createRoom(wingId: string, data: Partial<Room>): Promise<Room> {
    return api.post(`/youth-hostels/wings/${wingId}/rooms`, data).then(r => r.data);
  },

  async updateRoom(roomId: string, data: Partial<Room>): Promise<Room> {
    return api.patch(`/youth-hostels/rooms/${roomId}`, data).then(r => r.data);
  },

  async deleteRoom(roomId: string): Promise<void> {
    return api.delete(`/youth-hostels/rooms/${roomId}`);
  },

  async getBeds(roomId: string): Promise<Bed[]> {
    return api.get(`/youth-hostels/rooms/${roomId}/beds`).then(r => r.data);
  },

  async createBed(roomId: string, data: Partial<Bed>): Promise<Bed> {
    return api.post(`/youth-hostels/rooms/${roomId}/beds`, data).then(r => r.data);
  },

  async deleteBed(bedId: string): Promise<void> {
    return api.delete(`/youth-hostels/beds/${bedId}`);
  },

  async getReservations(filters?: {
    hostel_id?: string;
    status?: string;
    check_in_date?: string;
    check_out_date?: string;
    page?: number;
    size?: number;
  }): Promise<{ items: Reservation[]; total: number }> {
    // Build params, excluding empty strings and mapping pagination
    const params: Record<string, unknown> = {};
    if (filters?.hostel_id) params.hostel_id = filters.hostel_id;
    if (filters?.status) params.status = filters.status;
    if (filters?.check_in_date) params.check_in_date = filters.check_in_date;
    if (filters?.check_out_date) params.check_out_date = filters.check_out_date;
    if (filters?.page !== undefined && filters?.size !== undefined) {
      params.skip = (filters.page - 1) * filters.size;
      params.limit = filters.size;
    }
    const response = await api.get('/youth-hostels/reservations', { params });
    const data = response.data;
    if (Array.isArray(data)) {
      return { items: data, total: data.length };
    }
    return data;
  },

  async getReservation(id: string): Promise<Reservation> {
    return api.get(`/youth-hostels/reservations/${id}`).then(r => r.data);
  },

  async approveReservation(id: string): Promise<Reservation> {
    return api.post(`/youth-hostels/reservations/${id}/approve`).then(r => r.data);
  },

  async rejectReservation(id: string, reason: string): Promise<void> {
    return api.post(`/youth-hostels/reservations/${id}/reject`, null, { params: { reason } }).then(r => r.data);
  },

  async checkIn(id: string): Promise<Reservation> {
    return api.post(`/youth-hostels/reservations/${id}/check-in`).then(r => r.data);
  },

  async checkOut(id: string): Promise<Reservation> {
    return api.post(`/youth-hostels/reservations/${id}/check-out`).then(r => r.data);
  },

  async cancelReservation(id: string): Promise<Reservation> {
    return api.post(`/youth-hostels/reservations/${id}/cancel`).then(r => r.data);
  },

  async getOccupancyStats(hostelId: string): Promise<{
    total_beds: number;
    occupied_beds: number;
    available_beds: number;
    occupancy_rate: number;
  }> {
    return api.get(`/youth-hostels/${hostelId}/occupancy-stats`).then(r => r.data);
  },

  async getFreeReasonsAdmin(): Promise<FreeReason[]> {
    return api.get('/youth-hostels/free-reasons').then(r => r.data);
  },

  async createFreeReason(data: Partial<FreeReason>): Promise<FreeReason> {
    return api.post('/youth-hostels/free-reasons', data).then(r => r.data);
  },

  async updateFreeReason(id: string, data: Partial<FreeReason>): Promise<FreeReason> {
    return api.patch(`/youth-hostels/free-reasons/${id}`, data).then(r => r.data);
  },

  async deleteFreeReason(id: string): Promise<void> {
    return api.delete(`/youth-hostels/free-reasons/${id}`);
  },
  
  async updateRoomHousekeeping(roomId: string, status: 'CLEAN' | 'DIRTY' | 'CLEANING' | 'MAINTENANCE'): Promise<void> {
    return api.patch(`/youth-hostels/rooms/${roomId}/housekeeping`, null, { params: { status } });
  },

  async getPoliceForm(reservationId: string): Promise<PoliceForm> {
    return api.get(`/youth-hostels/reservations/${reservationId}/police-form`).then(r => r.data);
  },

  // Create Reservation (Admin)
  async createReservation(data: {
    hostel_id: string;
    booking_type?: string;
    association_name?: string;
    mission_order_ref?: string;
    faaj_card_number?: string;
    guest_name: string;
    guest_type?: string;
    nationality?: string;
    phone?: string;
    email?: string;
    check_in_date: string;
    check_out_date: string;
    number_of_beds?: number;
    is_free?: boolean;
    discount_reason_id?: string;
    special_requests?: string;
    guests?: {
      full_name: string;
      date_of_birth?: string;
      place_of_birth?: string;
      nationality?: string;
      address?: string;
      id_document_type?: string;
      id_document_number?: string;
      id_issue_date?: string;
      id_issue_place?: string;
    }[];
  }): Promise<Reservation> {
    return api.post('/youth-hostels/reservations', data).then(r => r.data);
  },

  // Financial Receipts (Régie / Quittances)
  async getReceipts(hostelId: string, skip = 0, limit = 50): Promise<FinancialReceipt[]> {
    return api.get(`/youth-hostels/${hostelId}/receipts`, { params: { skip, limit } }).then(r => r.data);
  },

  async createReceipt(hostelId: string, data: { reservation_id: string; hostel_id: string; amount: number; payment_method?: string }): Promise<FinancialReceipt> {
    return api.post(`/youth-hostels/${hostelId}/receipts`, data).then(r => r.data);
  },

  async cancelReceipt(receiptId: string, reason: string): Promise<void> {
    return api.post(`/youth-hostels/receipts/${receiptId}/cancel`, null, { params: { reason } });
  },

  async getDailyJournal(hostelId: string, date?: string): Promise<{ date: string; hostel_id: string; receipts_count: number; total_amount: number; receipts: unknown[] }> {
    return api.get(`/youth-hostels/${hostelId}/daily-journal`, { params: { target_date: date } }).then(r => r.data);
  },

  // Damage Reports (PV Dégradation)
  async getDamageReports(hostelId: string, skip = 0, limit = 50): Promise<DamageReport[]> {
    return api.get(`/youth-hostels/${hostelId}/damage-reports`, { params: { skip, limit } }).then(r => r.data);
  },

  async createDamageReport(hostelId: string, data: { description: string; reservation_id?: string; hostel_id: string; room_id?: string; inventory_item_id?: string; estimated_cost?: number; is_paid_by_guest?: boolean }): Promise<DamageReport> {
    return api.post(`/youth-hostels/${hostelId}/damage-reports`, data).then(r => r.data);
  },

  async syncDamageToInventory(reportId: string): Promise<void> {
    return api.post(`/youth-hostels/damage-reports/${reportId}/sync-inventory`);
  },

  // Police Registry
  async getPoliceRegistry(hostelId: string, date?: string): Promise<{ date: string; hostel_id: string; guests: unknown[] }> {
    return api.get(`/youth-hostels/${hostelId}/police-registry`, { params: { target_date: date } }).then(r => r.data);
  },
};

export default hostelsApi;