export type Relation = "막내딸" | "큰아들" | "큰며느리" | "둘째아들" | "며느리" | "가족";
export type MemberRole = "admin" | "member";
export type EventType = "sos" | "med" | "checkin" | "silence" | "memoir" | "message" | "video";

export interface CareCircle {
  id: string;
  name: string;
  parent_name: string;
  parent_age: number | null;
  parent_location: string | null;
  invite_code: string;
  owner_id: string;
  created_at: string;
}
export interface CircleMember {
  id: string;
  circle_id: string;
  user_id: string;
  relation: string;
  role: MemberRole;
  display_name: string;
}
export interface CareEvent {
  id: string;
  circle_id: string;
  type: EventType;
  message: string;
  created_by: string | null;
  created_at: string;
}
