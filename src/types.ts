export type SpaceType = 'Residential' | 'Commercial' | 'Office' | 'Other';

export type StyleType = 'Modern' | 'Minimal' | 'Wood & Natural' | 'Industrial' | 'High-end' | 'Other';

export type ReservationStatus = 'Pending' | 'Consulting' | 'Preparing' | 'In Progress' | 'Completed';

export interface StatusHistoryItem {
  status: ReservationStatus;
  updatedAt: any;
}

export interface Reservation {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhone: string;
  spaceType: SpaceType;
  styles: StyleType[];
  area: number;
  areaUnit: '평' | '㎡';
  requestDate: string;
  preferredDate: string;
  additionalRequests: string;
  status: ReservationStatus;
  statusHistory?: StatusHistoryItem[];
  adminNotes: string;
  createdAt: any;
}

export interface PortfolioItem {
  id: string;
  title: string;
  category: SpaceType;
  description: string;
  beforeImage: string;
  afterImage: string;
  images: string[];
  tags: string[];
}
