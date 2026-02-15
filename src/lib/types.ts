// lib/types.ts

export interface Faction {
  id: number;
  slug: string;
  name: string;
  reputation: number;
}

export interface Area {
  id: number;
  slug: string;
  name: string;
  faction_id: number | null;
  danger: string;
  description: string;
  image_url: string | null;
  top_pos: string;      // Adicionado para o mapa
  left_pos: string;     // Adicionado para o mapa  
  ping_top?: string;  // O '?' significa que é opcional, caso o banco esteja vazio
  ping_left?: string;
  z_index: number;
  width_css: string;
}

// Tipo para quando fazemos o JOIN com facções
export interface AreaWithFaction extends Area {
  factions: Faction | null;
}

export interface GameEvent {
  id: number;
  created_at: string;
  active: boolean;
  type: string; // Mantemos por compatibilidade, mas vamos usar 'title' visualmente
  title: string; // NOVO: Título customizável (Ex: "PROTOCOLO 9")
  color: string; // NOVO: Cor Hex (Ex: #ff0000)
  message: string;
  top_pos: string | null;
  left_pos: string | null;
  location_name: string | null;
}