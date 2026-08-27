/**
 * youth-hostels.ts — Backward-compatibility shim.
 *
 * The hostels pages were originally written against a `youth-hostels` /
 * `youthHostelsApi` / `YouthHostel` API surface. During the monolith split
 * this module was renamed to `admin-hostels.ts` with `hostelsApi` / `Hostel`.
 * Rather than rewrite all 8 route pages, this shim re-exports the real
 * implementation under the original names so imports keep working unchanged.
 */
import { hostelsApi, type Hostel, type HostelDetail, type Wing, type Room, type Bed, type Reservation, type FreeReason, type FinancialReceipt, type DamageReport, type PoliceForm, type ReservationGuest, type NearbyPlace, type NearbyPlaces, type BedType, type BedCondition } from "@/lib/api/admin-hostels";

// API object — identical to hostelsApi
export const youthHostelsApi = hostelsApi;

// Backward-compatible type aliases
export type YouthHostel = Hostel;
export type YouthHostelDetail = HostelDetail;

// Re-export the rest so pages can use them directly
export type { Wing, Room, Bed, Reservation, FreeReason, FinancialReceipt, DamageReport, PoliceForm, ReservationGuest, NearbyPlace, NearbyPlaces, BedType, BedCondition };

export default youthHostelsApi;
