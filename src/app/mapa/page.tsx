"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { AreaWithFaction, GameEvent } from "@/lib/types";
import "./map.css";

export default function MapPage() {
  // Estados
  const [mapAreas, setMapAreas] = useState<AreaWithFaction[]>([]);
  const [selectedArea, setSelectedArea] = useState<AreaWithFaction | null>(
    null,
  );
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const previousEventIdsRef = useRef<number[]>([]);

  const renderFormattedText = (text: string) => {
    if (!text) return null;

    // Divide o texto onde tem "||"
    const parts = text.split("||");

    return (
      <span>
        {parts.map((part, index) => {
          // Se o índice for ímpar (1, 3, 5...), é o texto que estava entre as barras
          if (index % 2 === 1) {
            return (
              <span key={index} className="font-transmissao" title={part}>
                {part}
              </span>
            );
          }
          // Se for par, é texto normal
          return part;
        })}
      </span>
    );
  };
  // Função única para buscar todos os dados do banco
  const fetchInitialData = useCallback(async () => {
    // 1. Busca Áreas e Facções (JOIN)
    const { data: areasData } = await supabase
      .from("areas")
      .select("*, factions(*)");
    if (areasData) setMapAreas(areasData as AreaWithFaction[]);

    // 2. Busca Eventos (Logs e Pings)
    const { data: eventsData } = await supabase
      .from("events")
      .select("*")
      .order("created_at", { ascending: false });
    if (eventsData) setEvents(eventsData as GameEvent[]);
  }, []);

  useEffect(() => {
    // Atualiza a lista de IDs rastreados quando eventos carregam
    if (events.length > 0) {
      previousEventIdsRef.current = events.map((ev) => ev.id);
    }
  }, [events.length]); // Dispara apenas quando a quantidade de eventos muda

  useEffect(() => {
    // Carrega os dados ao montar a página
    fetchInitialData();

    // Configura o canal Realtime para atualizações ao vivo
    const channel = supabase
      .channel("zone-updates")
      .on("postgres_changes", { event: "*", schema: "public" }, (payload) => {
        if (payload.table === "events") {
          if (payload.eventType === "INSERT") {
            // Novo evento inserido - adiciona imediatamente sem esperar fetch completo
            const newEvent = payload.new as GameEvent;
            
            // Verifica se é um novo evento (não estava antes)
            if (!previousEventIdsRef.current.includes(newEvent.id)) {
              previousEventIdsRef.current.push(newEvent.id);
              setIsHistoryOpen(true);
              playSound("ping");
              
              // Atualiza o estado com o novo evento no topo
              setEvents((prev) => [newEvent, ...prev]);
            }
          } else if (payload.eventType === "DELETE") {
            // Evento deletado
            const deletedId = payload.old.id;
            previousEventIdsRef.current = previousEventIdsRef.current.filter(
              (id) => id !== deletedId
            );
            setEvents((prev) => prev.filter((ev) => ev.id !== deletedId));
          } else if (payload.eventType === "UPDATE") {
            // Evento atualizado
            const updatedEvent = payload.new as GameEvent;
            setEvents((prev) =>
              prev.map((ev) => (ev.id === updatedEvent.id ? updatedEvent : ev))
            );
          }
        } else {
          // Para outras tabelas (areas, factions), recarrega dados
          fetchInitialData();
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleAreaClick = (area: AreaWithFaction) => {
    playSound("click");
    setSelectedArea((prev) => (prev?.id === area.id ? null : area));
  };

  const getReputationColor = (value: number) => {
    if (value <= 30) return "#ff3333"; // Hostil
    if (value <= 60) return "#ffff33"; // Neutro
    return "#33ff33"; // Aliado
  };

  // Função para tocar sons
  const playSound = (soundName: "click" | "ping") => {
    const fileName = soundName === "click" ? "Click.mp3" : "ping.mp3";
    const audio = new Audio(`/${fileName}`);
    audio.play().catch(() => {
      // Falha silenciosa se o áudio não conseguir tocar
    });
  };

  return (
    <main
      className="map-screen"
      onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
    >
      <div className="scanlines"></div>

      {/* HUD DECORATIVO */}
      <div className="hud-overlay">
        <div className="corner top-left"></div>
        <div className="corner top-right"></div>
        <div className="corner bottom-left"></div>
        <div className="corner bottom-right"></div>

        <div className="coordinates-display">
          TARGET: {mousePos.x.toString().padStart(4, "0")} :{" "}
          {mousePos.y.toString().padStart(4, "0")}
        </div>
      </div>

      <header className="map-header">
        <div className="system-status">
          <span className="blink">●</span> REDE ATIVA
        </div>
        <h1>MAPA TÁTICO: ZONA DE EXCLUSÃO</h1>
        <button
          className="history-toggle-btn"
          onClick={() => {
            playSound("click");
            setIsHistoryOpen(!isHistoryOpen);
          }}
        >
          {isHistoryOpen ? "[ FECHAR LOGS ]" : "[ ABRIR LOGS ]"}
        </button>
      </header>

      <div className="map-container">
        {/* PINGS (SINALIZADORES) */}
        {events
          .filter((ev) => ev.active && ev.top_pos)
          .map((ev) => (
            <div
              key={ev.id}
              className="map-ping"
              style={{
                top: ev.top_pos ?? undefined,
                left: ev.left_pos ?? undefined,
                transform: "translate(-50%, -50%)",
                color: ev.color,
              }}
            >
              <div className="ping-ring"></div>
              <div className="ping-dot"></div>
            </div>
          ))}

        {/* LINHA DE RADAR */}
        <div className="radar-sweep"></div>

        {/* PEÇAS DO MAPA */}
        {mapAreas.map((area) => (
          <div
            key={area.id}
            className={`map-piece-container 
              ${selectedArea?.id === area.id ? "active" : ""} 
              ${selectedArea && selectedArea.id !== area.id ? "dimmed" : ""}
            `}
            style={{
              top: area.top_pos ?? undefined,
              left: area.left_pos ?? undefined,
              width: area.width_css ?? undefined,
              zIndex: area.z_index ?? 1,
            }}
            onClick={() => handleAreaClick(area)}
          >
            <div
              className="area-hitbox-wrapper"
              style={{
                WebkitMaskImage: `url(${area.image_url})`,
                maskImage: `url(${area.image_url})`,
                WebkitMaskSize: "contain",
                maskSize: "contain",
                WebkitMaskRepeat: "no-repeat",
                maskRepeat: "no-repeat",
              }}
            >
              <img
                src={area.image_url || "/images/placeholder.png"}
                alt={area.name}
                className="area-image"
              />
            </div>
            <span className="area-label-text">{area.name}</span>
          </div>
        ))}
      </div>

      {/* ABA DE HISTÓRICO (LOGS) */}
      <aside className={`history-sidebar ${isHistoryOpen ? "open" : ""}`}>
        <div className="history-list">
          {events.length === 0 && (
            <p className="empty-logs">NENHUM REGISTRO ENCONTRADO...</p>
          )}
          {events.map((ev) => (
            <div
              key={ev.id}
              className="event-log-item"
              style={{
                borderLeft: `4px solid ${ev.color}`, // Borda colorida
                background: `linear-gradient(90deg, ${ev.color}11, transparent)`, // Fundo sutil
              }}
            >
              <div className="event-meta">
                <span
                  className="event-type"
                  style={{ color: ev.color, fontWeight: "bold" }}
                >
                  [{renderFormattedText(ev.title)}] 
                </span>
                <span className="event-time">
                  {new Date(ev.created_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <p className="event-msg">{renderFormattedText(ev.message)}</p>
              {ev.location_name && (
                <small className="event-loc">LOCAL: {ev.location_name}</small>
              )}
            </div>
          ))}
        </div>
      </aside>

      {/* PAINEL DE INFORMAÇÕES DA ÁREA */}
      {selectedArea && (
        <aside className="info-panel">
          <div className="panel-header">
            <h2>
              {">"} {selectedArea.name}
            </h2>
            <button className="close-btn" onClick={() => setSelectedArea(null)}>
              [X]
            </button>
          </div>

          <div className="panel-content">
            <div className="data-row">
              <span className="label">DOMÍNIO:</span>
              <span className="value">
                {selectedArea.factions?.name || "TERRITÓRIO CONTESTADO"}
              </span>
            </div>

            <div className="data-row">
              <span className="label">PERIGO:</span>
              <span
                className={`value danger-${selectedArea.danger?.toLowerCase()}`}
              >
                {selectedArea.danger}
              </span>
            </div>

            <div className="reputation-container">
              <div className="data-row">
                <span className="label">REPUTAÇÃO:</span>
                <span
                  className="value"
                  style={{
                    color: getReputationColor(
                      selectedArea.factions?.reputation || 0,
                    ),
                  }}
                >
                  {selectedArea.factions?.reputation || 0}%
                </span>
              </div>
              <div className="progress-bar-bg">
                <div
                  className="progress-bar-fill"
                  style={{
                    width: `${selectedArea.factions?.reputation || 0}%`,
                    backgroundColor: getReputationColor(
                      selectedArea.factions?.reputation || 0,
                    ),
                    boxShadow: `0 0 10px ${getReputationColor(selectedArea.factions?.reputation || 0)}`,
                  }}
                ></div>
              </div>
            </div>

            <hr className="divider" />
            <p className="desc-text">{renderFormattedText(selectedArea.description)}</p>
          </div>
        </aside>
      )}
    </main>
  );
}
