"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Faction, Area, GameEvent } from "@/lib/types";
import "./admin.css";

export default function AdminPage() {
  // --- ESTADOS ---
  const [factions, setFactions] = useState<Faction[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [activeEvents, setActiveEvents] = useState<GameEvent[]>([]);

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");

  // Estados do Formulário de Evento
  const [editingEventId, setEditingEventId] = useState<number | null>(null);
  const [eventTitle, setEventTitle] = useState("INFO");
  const [eventColor, setEventColor] = useState("#33ff33");
  const [eventMsg, setEventMsg] = useState("");
  const [selectedAreaSlug, setSelectedAreaSlug] = useState<string>("");

  // Estados do Formulário de Área
  const [editingAreaSlug, setEditingAreaSlug] = useState<string>("");
  const [editAreaName, setEditAreaName] = useState("");
  const [editAreaDesc, setEditAreaDesc] = useState("");
  const [editAreaFaction, setEditAreaFaction] = useState<number>(0);
  const [editAreaDanger, setEditAreaDanger] = useState("");

  const ADMIN_PASSWORD = "MEOWL";

  // --- CARREGAMENTO DE DADOS ---
  const fetchData = async () => {
    const { data: fData } = await supabase
      .from("factions")
      .select("*")
      .order("name");
    if (fData) setFactions(fData);

    const { data: aData } = await supabase
      .from("areas")
      .select("*") // O '*' garante que pegue as colunas novas ping_top e ping_left
      .order("name");
    if (aData) setAreas(aData);

    const { data: eData } = await supabase
      .from("events")
      .select("*")
      .order("created_at", { ascending: false });
    if (eData) setActiveEvents(eData as GameEvent[]);
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
      const channel = supabase
        .channel("admin-updates")
        .on("postgres_changes", { event: "*", schema: "public" }, () =>
          fetchData(),
        )
        .subscribe();
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isAuthenticated]);

  // --- FUNÇÕES DE CONTROLE (AQUI ESTAVA FALTANDO) ---

  // 1. Atualizar Reputação
  async function updateReputation(id: number, newValue: number) {
    // Atualização Otimista (Visual instantâneo)
    setFactions((prev) =>
      prev.map((f) => (f.id === id ? { ...f, reputation: newValue } : f)),
    );

    // Atualização no Banco
    await supabase
      .from("factions")
      .update({ reputation: newValue })
      .eq("id", id);
  }

  // 2. Salvar Evento (Criar ou Editar)
  async function handleSaveEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!eventMsg) return;

    const targetArea = areas.find((a) => a.slug === selectedAreaSlug);

    const eventData = {
      title: eventTitle,
      color: eventColor,
      message: eventMsg,
      active: true,
      ...(targetArea && {
        top_pos: targetArea.ping_top || targetArea.top_pos,
        left_pos: targetArea.ping_left || targetArea.left_pos,
        location_name: targetArea.name,
      }),
    };

    if (editingEventId) {
      await supabase.from("events").update(eventData).eq("id", editingEventId);
      alert("Evento Atualizado!");
      setEditingEventId(null);
    } else {
      await supabase.from("events").insert([eventData]);
      alert("Evento Criado!");
    }

    // Atualiza a lista instantaneamente
    await fetchData();

    setEventMsg("");
    setEventTitle("INFO");
  }

  // 3. Preencher formulário para editar evento
  function startEditEvent(ev: GameEvent) {
    setEditingEventId(ev.id);
    setEventTitle(ev.title);
    setEventColor(ev.color);
    setEventMsg(ev.message);
    const area = areas.find((a) => a.name === ev.location_name);
    setSelectedAreaSlug(area ? area.slug : "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // 4. Deletar Evento
  async function deleteEvent(id: number) {
    if (confirm("Tem certeza que quer deletar este log?")) {
      await supabase.from("events").delete().eq("id", id);
      // Atualiza a lista instantaneamente
      await fetchData();
    }
  }

  // 5. Salvar Edição de Área
  useEffect(() => {
    const area = areas.find((a) => a.slug === editingAreaSlug);
    if (area) {
      setEditAreaName(area.name);
      setEditAreaDesc(area.description);
      setEditAreaFaction(area.faction_id || 0);
      setEditAreaDanger(area.danger);
    }
  }, [editingAreaSlug, areas]);

  async function handleSaveArea(e: React.FormEvent) {
    e.preventDefault();
    if (!editingAreaSlug) return;

    const { error } = await supabase
      .from("areas")
      .update({
        name: editAreaName,
        description: editAreaDesc,
        faction_id: editAreaFaction === 0 ? null : editAreaFaction,
        danger: editAreaDanger,
      })
      .eq("slug", editingAreaSlug);

    if (!error) {
      alert(`Área ${editAreaName} atualizada!`);
      // Atualiza a lista instantaneamente
      await fetchData();
    } else alert("Erro ao atualizar área.");
  }

  // --- RENDERIZAÇÃO ---
  if (!isAuthenticated)
    return (
      <main className="admin-login">
        <div className="login-box">
          <h2>TERMINAL ROOT</h2>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value.toUpperCase())}
          />
          <button
            onClick={() =>
              password === ADMIN_PASSWORD
                ? setIsAuthenticated(true)
                : alert("Erro")
            }
          >
            ENTRAR
          </button>
        </div>
      </main>
    );

  return (
    <main className="admin-screen">
      <header className="admin-header">
        <h1>[ PAINEL DE CONTROLE MESTRE ]</h1>
        <button
          className="logout-btn-top"
          onClick={() => setIsAuthenticated(false)}
        >
          SAIR
        </button>
      </header>

      <div className="admin-grid">
        {/* SEÇÃO 1: STATUS DAS FACÇÕES */}
        <section className="admin-card">
          <h2>STATUS DAS FACÇÕES</h2>
          <div className="factions-list">
            {factions.map((f) => (
              <div key={f.id} className="faction-control">
                <div className="faction-info">
                  <span>{f.name} </span>
                  <span
                    style={{
                      color:
                        f.reputation < 30
                          ? "#ff3333"
                          : f.reputation > 60
                            ? "#33ff33"
                            : "#ffff33",
                    }}
                  >
                    {f.reputation}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={f.reputation}
                  onChange={(e) =>
                    updateReputation(f.id, parseInt(e.target.value))
                  }
                  className="faction-slider"
                />
              </div>
            ))}
          </div>
        </section>

        {/* SEÇÃO 2: CRIAÇÃO/EDIÇÃO DE EVENTOS */}
        <section className="admin-card">
          <h2 style={{ color: editingEventId ? "#ffff33" : "#ff3333" }}>
            {editingEventId
              ? `EDITANDO #${editingEventId}`
              : "NOVO EVENTO / PING"}
          </h2>

          <form onSubmit={handleSaveEvent} className="event-form">
            <div className="form-row">
              <div className="form-group" style={{ flex: 2 }}>
                <label>TÍTULO: </label>
                <input
                  type="text"
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value.toUpperCase())}
                  className="input-text"
                />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>COR:</label>
                <input
                  type="color"
                  value={eventColor}
                  onChange={(e) => setEventColor(e.target.value)}
                  className="input-color"
                />
              </div>
            </div>

            <div className="form-group">
              <label>LOCAL:</label>
              <select
                value={selectedAreaSlug}
                onChange={(e) => setSelectedAreaSlug(e.target.value)}
              >
                <option value="">-- APENAS LOG (SEM PING) --</option>
                {areas.map((a) => (
                  <option key={a.id} value={a.slug}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>

            <textarea
              value={eventMsg}
              onChange={(e) => setEventMsg(e.target.value)}
              placeholder="Mensagem do log..."
              rows={4}
            />

            <div className="form-actions">
              <button type="submit" className="save-btn">
                {editingEventId ? "SALVAR" : "TRANSMITIR"}
              </button>
              {editingEventId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingEventId(null);
                    setEventMsg("");
                    setEventTitle("INFO");
                  }}
                  className="cancel-btn"
                >
                  CANCELAR
                </button>
              )}
            </div>
          </form>
        </section>

        {/* SEÇÃO 3: LISTA DE EVENTOS ATIVOS */}
        <section className="admin-card">
          <h2>LOGS E PINGS ATIVOS</h2>
          <div className="admin-event-list">
            {activeEvents.map((ev) => (
              <div
                key={ev.id}
                className="admin-event-item"
                style={{ borderLeft: `5px solid ${ev.color}` }}
              >
                <div className="ev-details">
                  <strong style={{ color: ev.color }}>[{ev.title}]</strong>{" "}
                  {ev.message}
                  {ev.location_name && (
                    <span className="loc-tag">@{ev.location_name}</span>
                  )}
                </div>
                <div className="ev-actions">
                  <button
                    className="edit-icon-btn"
                    onClick={() => startEditEvent(ev)}
                  >
                    ✏️
                  </button>
                  <button
                    className="delete-icon-btn"
                    onClick={() => deleteEvent(ev.id)}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* SEÇÃO 4: EDITOR DE ÁREAS (LARGURA TOTAL) */}
        <section className="admin-card full-width">
          <h2>EDITOR DE ÁREAS E FACÇÕES</h2>
          <form onSubmit={handleSaveArea} className="area-form">
            <div className="form-group">
              <label>SELECIONE A ÁREA PARA EDITAR: </label>
              <select
                value={editingAreaSlug}
                onChange={(e) => setEditingAreaSlug(e.target.value)}
              >
                <option value="">-- SELECIONE UMA ÁREA --</option>
                {areas.map((a) => (
                  <option key={a.id} value={a.slug}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>

            {editingAreaSlug && (
              <div className="area-edit-grid">
                <div className="form-group">
                  <label>NOME: </label>
                  <input
                    type="text"
                    value={editAreaName}
                    onChange={(e) => setEditAreaName(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>PERIGO: </label>
                  <input
                    type="text"
                    value={editAreaDanger}
                    onChange={(e) => setEditAreaDanger(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>FACÇÃO DOMINANTE: </label>
                  <select
                    value={editAreaFaction}
                    onChange={(e) =>
                      setEditAreaFaction(parseInt(e.target.value))
                    }
                  >
                    <option value={0}>NENHUMA / NEUTRA</option>
                    {factions.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group full">
                  <label>DESCRIÇÃO: </label>
                  <textarea
                    value={editAreaDesc}
                    onChange={(e) => setEditAreaDesc(e.target.value)}
                    rows={15}
                  />
                </div>
                <button type="submit" className="save-area-btn">
                  SALVAR DADOS DA ÁREA
                </button>
              </div>
            )}
          </form>
        </section>
      </div>
    </main>
  );
}
