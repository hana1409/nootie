import { useState, useRef, useCallback, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Hand,
  MousePointer2,
  Type,
  Smile,
  Shapes,
  ChevronDown,
  Plus,
  Minus,
  Share2,
  Square,
  Circle,
  Triangle,
  Diamond,
  ArrowRight,
  Trash2,
  X,
} from "lucide-react";

const API_URL = "http://localhost:5000/api";

// ---------- constants ----------

const STICKY_COLORS = [
  "#FFE08A",
  "#FFB3C7",
  "#B6E3B0",
  "#A9D4F5",
  "#E3C2F5",
  "#FFCBA4",
];

const EMOJI_OPTIONS = [
  "😀", "😂", "😍", "🤔", "😮", "😢",
  "👍", "👎", "👏", "🙌", "🔥", "✨",
  "❤️", "⭐", "✅", "❌", "🚀", "🎉",
];

const SHAPE_TYPES = [
  { id: "rect", label: "Rectangle", Icon: Square },
  { id: "ellipse", label: "Ellipse", Icon: Circle },
  { id: "triangle", label: "Triangle", Icon: Triangle },
  { id: "diamond", label: "Diamond", Icon: Diamond },
  { id: "arrow", label: "Arrow", Icon: ArrowRight },
];

const SHAPE_FILLS = ["#A9D4F5", "#FFE08A", "#B6E3B0", "#FFB3C7", "#E3C2F5", "#ffffff"];

let idCounter = 1;
const nextId = () => idCounter++;

// ---------- helper: shape svg renderer ----------

function ShapeSvg({ type, fill, stroke }) {
  const common = { width: "100%", height: "100%", display: "block" };
  switch (type) {
    case "ellipse":
      return (
        <svg viewBox="0 0 100 100" style={common} preserveAspectRatio="none">
          <ellipse cx="50" cy="50" rx="48" ry="48" fill={fill} stroke={stroke} strokeWidth="3" />
        </svg>
      );
    case "triangle":
      return (
        <svg viewBox="0 0 100 100" style={common} preserveAspectRatio="none">
          <polygon points="50,4 96,96 4,96" fill={fill} stroke={stroke} strokeWidth="3" strokeLinejoin="round" />
        </svg>
      );
    case "diamond":
      return (
        <svg viewBox="0 0 100 100" style={common} preserveAspectRatio="none">
          <polygon points="50,4 96,50 50,96 4,50" fill={fill} stroke={stroke} strokeWidth="3" strokeLinejoin="round" />
        </svg>
      );
    case "arrow":
      return (
        <svg viewBox="0 0 100 100" style={common} preserveAspectRatio="none">
          <line x1="8" y1="50" x2="80" y2="50" stroke={stroke} strokeWidth="6" strokeLinecap="round" />
          <polygon points="78,32 98,50 78,68" fill={stroke} />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 100 100" style={common} preserveAspectRatio="none">
          <rect x="2" y="2" width="96" height="96" rx="8" fill={fill} stroke={stroke} strokeWidth="3" />
        </svg>
      );
  }
}

// ---------- main component ----------

function BoardPage() {
  const { id: boardId } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [notes, setNotes] = useState([]);
  const [texts, setTexts] = useState([]);
  const [shapes, setShapes] = useState([]);
  const [stamps, setStamps] = useState([]);

  const [boardTitle, setBoardTitle] = useState("Untitled");
  const [isLoaded, setIsLoaded] = useState(false);
  const [saveStatus, setSaveStatus] = useState("idle"); // idle | saving | saved | error

  const [selectedId, setSelectedId] = useState(null);
  const [editingId, setEditingId] = useState(null);

  const [selectedTool, setSelectedTool] = useState("pointer");
  const [pendingShapeType, setPendingShapeType] = useState("rect");
  const [showShapeMenu, setShowShapeMenu] = useState(false);
  const [showEmojiMenu, setShowEmojiMenu] = useState(false);

  const [canvasPos, setCanvasPos] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);

  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });
  const [spaceHeld, setSpaceHeld] = useState(false);

  const dragRef = useRef(null);
  const resizeRef = useRef(null);
  const containerRef = useRef(null);
  const saveTimeoutRef = useRef(null);
  const isFirstRenderRef = useRef(true);

  // ---------- load board dari database saat pertama dibuka ----------

  useEffect(() => {
    if (!token) {
      navigate("/");
      return;
    }

    const loadBoard = async () => {
      try {
        const res = await axios.get(`${API_URL}/boards/${boardId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const board = res.data.board;
        const data = typeof board.data === "string" ? JSON.parse(board.data) : board.data;

        setBoardTitle(board.title);
        setNotes(data?.notes || []);
        setTexts(data?.texts || []);
        setShapes(data?.shapes || []);
        setStamps(data?.stamps || []);

        // pastikan id counter berikutnya tidak bertabrakan dengan id yang sudah tersimpan
        const allIds = [
          ...(data?.notes || []),
          ...(data?.texts || []),
          ...(data?.shapes || []),
          ...(data?.stamps || []),
        ].map((el) => el.id);
        if (allIds.length > 0) {
          idCounter = Math.max(...allIds) + 1;
        }
      } catch (err) {
        if (err.response?.status === 404) {
          alert("Board tidak ditemukan");
          navigate("/dashboard");
        } else {
          console.error(err);
        }
      } finally {
        setIsLoaded(true);
      }
    };

    loadBoard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardId]);

  // ---------- auto-save (debounced) setiap kali isi board berubah ----------

  useEffect(() => {
    if (!isLoaded) return;
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      return;
    }

    setSaveStatus("saving");

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await axios.put(
          `${API_URL}/boards/${boardId}`,
          { data: { notes, texts, shapes, stamps } },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setSaveStatus("saved");
      } catch (err) {
        console.error("Gagal menyimpan board:", err);
        setSaveStatus("error");
      }
    }, 800);

    return () => clearTimeout(saveTimeoutRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes, texts, shapes, stamps, isLoaded]);

  // ---------- coordinate helpers ----------

  const screenToWorld = useCallback(
    (clientX, clientY) => {
      const rect = containerRef.current.getBoundingClientRect();
      const sx = clientX - rect.left;
      const sy = clientY - rect.top;
      return {
        x: (sx - canvasPos.x) / zoom,
        y: (sy - canvasPos.y) / zoom,
      };
    },
    [canvasPos, zoom]
  );

  // ---------- creation ----------

  const createNoteAt = (x, y) => {
    const id = nextId();
    setNotes((n) => [
      ...n,
      {
        id,
        x: x - 96,
        y: y - 96,
        w: 192,
        h: 192,
        color: STICKY_COLORS[(id - 1) % STICKY_COLORS.length],
        text: "",
      },
    ]);
    setSelectedId({ kind: "note", id });
    setEditingId({ kind: "note", id });
  };

  const createTextAt = (x, y) => {
    const id = nextId();
    setTexts((t) => [...t, { id, x, y, w: 220, text: "", size: 20 }]);
    setSelectedId({ kind: "text", id });
    setEditingId({ kind: "text", id });
  };

  const createShapeAt = (x, y, type) => {
    const id = nextId();
    setShapes((s) => [
      ...s,
      {
        id,
        x: x - 70,
        y: y - 70,
        w: 140,
        h: 140,
        type,
        fill: SHAPE_FILLS[(id - 1) % SHAPE_FILLS.length],
      },
    ]);
    setSelectedId({ kind: "shape", id });
  };

  const createStampAt = (x, y, emoji) => {
    const id = nextId();
    setStamps((s) => [...s, { id, x: x - 24, y: y - 24, emoji }]);
    setSelectedId({ kind: "stamp", id });
  };

  // ---------- background interactions ----------

  const handleBackgroundMouseDown = (e) => {
    if (selectedTool === "hand" || spaceHeld) {
      setIsPanning(true);
      setStartPan({ x: e.clientX - canvasPos.x, y: e.clientY - canvasPos.y });
      return;
    }

    const world = screenToWorld(e.clientX, e.clientY);

    if (selectedTool === "text") {
      createTextAt(world.x, world.y);
      setSelectedTool("pointer");
      return;
    }

    if (selectedTool === "shapes") {
      createShapeAt(world.x, world.y, pendingShapeType);
      setSelectedTool("pointer");
      return;
    }

    if (selectedTool === "emoji") {
      return;
    }

    setSelectedId(null);
    setEditingId(null);
  };

  const handleBackgroundMouseMove = (e) => {
    if (isPanning) {
      setCanvasPos({ x: e.clientX - startPan.x, y: e.clientY - startPan.y });
      return;
    }
    if (dragRef.current) {
      const world = screenToWorld(e.clientX, e.clientY);
      const { kind, id, offsetX, offsetY } = dragRef.current;
      const nx = world.x - offsetX;
      const ny = world.y - offsetY;
      if (kind === "note") setNotes((arr) => arr.map((n) => (n.id === id ? { ...n, x: nx, y: ny } : n)));
      else if (kind === "text") setTexts((arr) => arr.map((t) => (t.id === id ? { ...t, x: nx, y: ny } : t)));
      else if (kind === "shape") setShapes((arr) => arr.map((s) => (s.id === id ? { ...s, x: nx, y: ny } : s)));
      else if (kind === "stamp") setStamps((arr) => arr.map((s) => (s.id === id ? { ...s, x: nx, y: ny } : s)));
      return;
    }
    if (resizeRef.current) {
      const { kind, id, startW, startH, mouseStartX, mouseStartY } = resizeRef.current;
      const dx = (e.clientX - mouseStartX) / zoom;
      const dy = (e.clientY - mouseStartY) / zoom;
      if (kind === "note") setNotes((arr) => arr.map((n) => (n.id === id ? { ...n, w: Math.max(60, startW + dx), h: Math.max(60, startH + dy) } : n)));
      else if (kind === "shape") setShapes((arr) => arr.map((s) => (s.id === id ? { ...s, w: Math.max(60, startW + dx), h: Math.max(60, startH + dy) } : s)));
      else if (kind === "text") setTexts((arr) => arr.map((t) => (t.id === id ? { ...t, w: Math.max(80, startW + dx) } : t)));
    }
  };

  const endInteractions = () => {
    setIsPanning(false);
    dragRef.current = null;
    resizeRef.current = null;
  };

  // ---------- element-level interactions ----------

  const startDragElement = (e, kind, id, elX, elY) => {
    if (selectedTool === "hand" || spaceHeld) return;
    e.stopPropagation();
    setSelectedId({ kind, id });
    const world = screenToWorld(e.clientX, e.clientY);
    dragRef.current = { kind, id, offsetX: world.x - elX, offsetY: world.y - elY };
  };

  const startResize = (e, kind, id, w, h, x, y) => {
    e.stopPropagation();
    e.preventDefault();
    resizeRef.current = { kind, id, startW: w, startH: h, startX: x, startY: y, mouseStartX: e.clientX, mouseStartY: e.clientY };
  };

  // ---------- deletion ----------

  const deleteSelected = useCallback(() => {
    if (!selectedId) return;
    const { kind, id } = selectedId;
    if (kind === "note") setNotes((arr) => arr.filter((n) => n.id !== id));
    if (kind === "text") setTexts((arr) => arr.filter((t) => t.id !== id));
    if (kind === "shape") setShapes((arr) => arr.filter((s) => s.id !== id));
    if (kind === "stamp") setStamps((arr) => arr.filter((s) => s.id !== id));
    setSelectedId(null);
    setEditingId(null);
  }, [selectedId]);

  // ---------- keyboard ----------

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.code === "Space" && !editingId) setSpaceHeld(true);
      const isEditingText =
        editingId ||
        document.activeElement?.tagName === "TEXTAREA" ||
        document.activeElement?.tagName === "INPUT";
      if ((e.key === "Delete" || e.key === "Backspace") && selectedId && !isEditingText) {
        e.preventDefault();
        deleteSelected();
      }
      if (e.key === "Escape") {
        setEditingId(null);
        setSelectedId(null);
        setShowShapeMenu(false);
        setShowEmojiMenu(false);
        setSelectedTool("pointer");
      }
      if (e.key === "v" && !isEditingText) setSelectedTool("pointer");
      if (e.key === "h" && !isEditingText) setSelectedTool("hand");
      if (e.key === "t" && !isEditingText) setSelectedTool("text");
    };
    const onKeyUp = (e) => {
      if (e.code === "Space") setSpaceHeld(false);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [selectedId, editingId, deleteSelected]);

  // ---------- zoom ----------

  const zoomBy = (factor, center) => {
    setZoom((z) => {
      const newZoom = Math.min(2.5, Math.max(0.25, z * factor));
      if (center) {
        const rect = containerRef.current.getBoundingClientRect();
        const cx = center.x - rect.left;
        const cy = center.y - rect.top;
        setCanvasPos((pos) => ({
          x: cx - ((cx - pos.x) * newZoom) / z,
          y: cy - ((cy - pos.y) * newZoom) / z,
        }));
      }
      return newZoom;
    });
  };

  const handleWheel = (e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      zoomBy(e.deltaY < 0 ? 1.08 : 1 / 1.08, { x: e.clientX, y: e.clientY });
    } else {
      setCanvasPos((pos) => ({ x: pos.x - e.deltaX, y: pos.y - e.deltaY }));
    }
  };

  // ---------- toolbar ----------

  const onToolClick = (tool) => {
    setShowShapeMenu(false);
    setShowEmojiMenu(false);
    if (tool === "shapes") {
      setSelectedTool("shapes");
      setShowShapeMenu(true);
      return;
    }
    if (tool === "emoji") {
      setSelectedTool("emoji");
      setShowEmojiMenu(true);
      return;
    }
    if (tool === "sticky") {
      const rect = containerRef.current.getBoundingClientRect();
      const world = screenToWorld(rect.left + rect.width / 2, rect.top + rect.height / 2);
      createNoteAt(world.x, world.y);
      setSelectedTool("pointer");
      return;
    }
    setSelectedTool(tool);
  };

  const pickEmoji = (emoji) => {
    const rect = containerRef.current.getBoundingClientRect();
    const world = screenToWorld(rect.left + rect.width / 2, rect.top + rect.height / 2);
    createStampAt(world.x, world.y, emoji);
    setShowEmojiMenu(false);
    setSelectedTool("pointer");
  };

  const pickShapeType = (type) => {
    setPendingShapeType(type);
    setShowShapeMenu(false);
  };

  const cursorClass =
    selectedTool === "hand" || spaceHeld
      ? isPanning
        ? "cursor-grabbing"
        : "cursor-grab"
      : selectedTool === "text"
      ? "cursor-text"
      : selectedTool === "shapes"
      ? "cursor-crosshair"
      : "cursor-default";

  if (!isLoaded) {
    return (
      <div className="h-screen w-screen bg-[#fafafa] flex items-center justify-center">
        <p className="text-gray-400">Memuat board...</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`h-screen w-screen bg-[#fafafa] relative overflow-hidden select-none ${cursorClass}`}
      onMouseDown={handleBackgroundMouseDown}
      onMouseMove={handleBackgroundMouseMove}
      onMouseUp={endInteractions}
      onMouseLeave={endInteractions}
      onWheel={handleWheel}
    >
      {/* CANVAS */}
      <div
        className="absolute inset-0 origin-top-left"
        style={{ transform: `translate(${canvasPos.x}px, ${canvasPos.y}px) scale(${zoom})` }}
      >
        {/* Grid */}
        <div
          className="absolute"
          style={{
            left: -4000,
            top: -4000,
            width: 8000,
            height: 8000,
            backgroundImage: "radial-gradient(#d9d9d9 1px, transparent 1px)",
            backgroundSize: "16px 16px",
          }}
        />

        {/* Shapes */}
        {shapes.map((shape) => {
          const isSelected = selectedId?.kind === "shape" && selectedId.id === shape.id;
          return (
            <div
              key={shape.id}
              className="absolute"
              style={{ left: shape.x, top: shape.y, width: shape.w, height: shape.h }}
              onMouseDown={(e) => startDragElement(e, "shape", shape.id, shape.x, shape.y)}
            >
              <div className={`w-full h-full rounded-md ${isSelected ? "ring-2 ring-pink-500 ring-offset-2" : ""}`}>
                <ShapeSvg type={shape.type} fill={shape.fill} stroke="#444" />
              </div>
              {isSelected && (
                <>
                  <button
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      setShapes((arr) => arr.filter((s) => s.id !== shape.id));
                      setSelectedId(null);
                    }}
                    className="absolute -top-4 -right-4 bg-white rounded-full shadow p-1 text-gray-500 hover:text-red-500"
                  >
                    <X size={14} />
                  </button>
                  <div
                    onMouseDown={(e) => startResize(e, "shape", shape.id, shape.w, shape.h, shape.x, shape.y)}
                    className="absolute -right-1.5 -bottom-1.5 w-4 h-4 rounded-full bg-pink-500 border-2 border-white cursor-nwse-resize shadow"
                  />
                </>
              )}
            </div>
          );
        })}

        {/* Sticky notes */}
        {notes.map((note) => {
          const isSelected = selectedId?.kind === "note" && selectedId.id === note.id;
          const isEditing = editingId?.kind === "note" && editingId.id === note.id;
          return (
            <div
              key={note.id}
              className="absolute"
              style={{ left: note.x, top: note.y, width: note.w, height: note.h }}
              onMouseDown={(e) => startDragElement(e, "note", note.id, note.x, note.y)}
              onDoubleClick={(e) => {
                e.stopPropagation();
                setEditingId({ kind: "note", id: note.id });
              }}
            >
              <div
                className={`w-full h-full rounded-2xl shadow-md p-4 flex flex-col ${isSelected ? "ring-2 ring-pink-500 ring-offset-2" : ""}`}
                style={{ backgroundColor: note.color }}
              >
                {isEditing ? (
                  <textarea
                    autoFocus
                    value={note.text}
                    onChange={(e) =>
                      setNotes((arr) => arr.map((n) => (n.id === note.id ? { ...n, text: e.target.value } : n)))
                    }
                    onMouseDown={(e) => e.stopPropagation()}
                    onBlur={() => setEditingId(null)}
                    className="w-full h-full bg-transparent resize-none outline-none text-gray-800 font-medium text-base leading-snug"
                    placeholder="Type something..."
                  />
                ) : (
                  <p className="w-full h-full whitespace-pre-wrap break-words text-gray-800 font-medium text-base leading-snug overflow-hidden">
                    {note.text || <span className="text-gray-800/40">Double-click to edit</span>}
                  </p>
                )}
              </div>

              {isSelected && (
                <>
                  <div
                    onMouseDown={(e) => e.stopPropagation()}
                    className="absolute -top-12 left-0 bg-white rounded-xl shadow-md px-2 py-1.5 flex items-center gap-1.5"
                  >
                    {STICKY_COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() =>
                          setNotes((arr) => arr.map((n) => (n.id === note.id ? { ...n, color: c } : n)))
                        }
                        className="w-5 h-5 rounded-full border border-black/10"
                        style={{
                          backgroundColor: c,
                          outline: note.color === c ? "2px solid #C86B85" : "none",
                          outlineOffset: "1px",
                        }}
                      />
                    ))}
                    <div className="w-px h-5 bg-gray-200 mx-0.5" />
                    <button
                      onClick={() => {
                        setNotes((arr) => arr.filter((n) => n.id !== note.id));
                        setSelectedId(null);
                      }}
                      className="text-gray-400 hover:text-red-500 p-0.5"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div
                    onMouseDown={(e) => startResize(e, "note", note.id, note.w, note.h, note.x, note.y)}
                    className="absolute -right-1.5 -bottom-1.5 w-4 h-4 rounded-full bg-pink-500 border-2 border-white cursor-nwse-resize shadow"
                  />
                </>
              )}
            </div>
          );
        })}

        {/* Free text */}
        {texts.map((t) => {
          const isSelected = selectedId?.kind === "text" && selectedId.id === t.id;
          const isEditing = editingId?.kind === "text" && editingId.id === t.id;
          return (
            <div
              key={t.id}
              className="absolute"
              style={{ left: t.x, top: t.y, width: t.w, minHeight: 32 }}
              onMouseDown={(e) => startDragElement(e, "text", t.id, t.x, t.y)}
              onDoubleClick={(e) => {
                e.stopPropagation();
                setEditingId({ kind: "text", id: t.id });
              }}
            >
              <div className={`rounded-md px-1 ${isSelected ? "ring-2 ring-pink-500 ring-offset-2" : ""}`}>
                {isEditing ? (
                  <textarea
                    autoFocus
                    value={t.text}
                    onChange={(e) =>
                      setTexts((arr) => arr.map((tt) => (tt.id === t.id ? { ...tt, text: e.target.value } : tt)))
                    }
                    onMouseDown={(e) => e.stopPropagation()}
                    onBlur={() => {
                      setEditingId(null);
                      setTexts((arr) => arr.filter((tt) => !(tt.id === t.id && !tt.text)));
                    }}
                    style={{ fontSize: t.size }}
                    className="w-full bg-transparent resize-none outline-none text-gray-800 font-semibold leading-snug"
                    placeholder="Type something..."
                  />
                ) : (
                  <p
                    style={{ fontSize: t.size }}
                    className="text-gray-800 font-semibold leading-snug whitespace-pre-wrap break-words"
                  >
                    {t.text || <span className="text-gray-400">Double-click to edit</span>}
                  </p>
                )}
              </div>
              {isSelected && !isEditing && (
                <button
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    setTexts((arr) => arr.filter((tt) => tt.id !== t.id));
                    setSelectedId(null);
                  }}
                  className="absolute -top-4 -right-4 bg-white rounded-full shadow p-1 text-gray-500 hover:text-red-500"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          );
        })}

        {/* Emoji stamps */}
        {stamps.map((s) => {
          const isSelected = selectedId?.kind === "stamp" && selectedId.id === s.id;
          return (
            <div
              key={s.id}
              className={`absolute text-4xl leading-none ${isSelected ? "ring-2 ring-pink-500 ring-offset-2 rounded-lg" : ""}`}
              style={{ left: s.x, top: s.y }}
              onMouseDown={(e) => startDragElement(e, "stamp", s.id, s.x, s.y)}
            >
              {s.emoji}
              {isSelected && (
                <button
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    setStamps((arr) => arr.filter((st) => st.id !== s.id));
                    setSelectedId(null);
                  }}
                  className="absolute -top-3 -right-3 bg-white rounded-full shadow p-0.5 text-gray-500 hover:text-red-500"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Header Left */}
      <div className="absolute top-8 left-8 z-10">
        <div className="bg-white w-[220px] h-[70px] rounded-2xl shadow-md flex items-center justify-between px-5">
          <button
            onClick={() => navigate("/dashboard")}
            className="text-pink-700 hover:text-pink-800"
            title="Kembali ke dashboard"
          >
            <ChevronDown size={20} className="rotate-90" />
          </button>
          <h1 className="font-bold text-xl text-pink-700 truncate flex-1 px-2">
            {boardTitle}
          </h1>
        </div>
        <p className="text-xs text-gray-400 mt-1.5 ml-2">
          {saveStatus === "saving" && "Menyimpan..."}
          {saveStatus === "saved" && "Tersimpan"}
          {saveStatus === "error" && "Gagal menyimpan"}
        </p>
      </div>

      {/* Header Right */}
      <div className="absolute top-8 right-8 z-10">
        <div className="bg-white rounded-2xl shadow-md h-[70px] px-5 flex items-center gap-4">
          <div className="flex -space-x-3">
            <div className="w-10 h-10 rounded-full bg-orange-400 border-2 border-white" />
            <div className="w-10 h-10 rounded-full bg-blue-500 border-2 border-white flex items-center justify-center text-white">A</div>
            <div className="w-10 h-10 rounded-full bg-green-500 border-2 border-white" />
          </div>
          <div className="w-px h-10 bg-gray-200" />
          <div className="w-10 h-10 rounded-full bg-orange-400 flex items-center justify-center text-white">H</div>
          <button className="bg-[#C86B85] text-white px-5 py-3 rounded-xl flex items-center gap-2 font-medium">
            <Share2 size={18} />
            Share
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20">
        <div className="relative bg-white rounded-2xl shadow-md px-6 py-4 flex items-center gap-6">
          <button
            onClick={() => onToolClick("hand")}
            className={`p-2 rounded-xl ${selectedTool === "hand" ? "bg-pink-100 text-pink-600" : ""}`}
            title="Hand tool (H)"
          >
            <Hand size={24} />
          </button>

          <button
            onClick={() => onToolClick("pointer")}
            className={`p-2 rounded-xl ${selectedTool === "pointer" ? "bg-pink-100 text-pink-600" : ""}`}
            title="Select tool (V)"
          >
            <MousePointer2 size={24} />
          </button>

          <button
            onClick={() => onToolClick("text")}
            className={`p-2 rounded-xl ${selectedTool === "text" ? "bg-pink-100 text-pink-600" : ""}`}
            title="Text tool (T)"
          >
            <Type size={24} />
          </button>

          <div className="relative">
            <button
              onClick={() => onToolClick("emoji")}
              className={`p-2 rounded-xl ${selectedTool === "emoji" ? "bg-pink-100 text-pink-600" : ""}`}
              title="Emoji stamp"
            >
              <Smile size={24} />
            </button>
            {showEmojiMenu && (
              <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 bg-white rounded-2xl shadow-lg p-3 grid grid-cols-6 gap-1 w-64">
                {EMOJI_OPTIONS.map((em) => (
                  <button key={em} onClick={() => pickEmoji(em)} className="text-2xl hover:bg-gray-100 rounded-lg p-1">
                    {em}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative">
            <button
              onClick={() => onToolClick("shapes")}
              className={`p-2 rounded-xl ${selectedTool === "shapes" ? "bg-pink-100 text-pink-600" : ""}`}
              title="Shape tool"
            >
              <Shapes size={24} />
            </button>
            {showShapeMenu && (
              <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 bg-white rounded-2xl shadow-lg p-2 flex items-center gap-1">
                {SHAPE_TYPES.map(({ id, label, Icon }) => (
                  <button
                    key={id}
                    onClick={() => pickShapeType(id)}
                    title={label}
                    className={`p-2 rounded-xl hover:bg-gray-100 ${pendingShapeType === id ? "bg-pink-100 text-pink-600" : "text-gray-600"}`}
                  >
                    <Icon size={20} />
                  </button>
                ))}
              </div>
            )}
          </div>

          <button onClick={() => onToolClick("sticky")} className="p-2 rounded-xl" title="Add sticky note">
            <div className="w-7 h-7 bg-yellow-300 rounded-md shadow" />
          </button>
        </div>

        {selectedTool === "shapes" && (
          <p className="text-center text-xs text-gray-400 mt-2">
            Click the canvas to place a {SHAPE_TYPES.find((s) => s.id === pendingShapeType)?.label.toLowerCase()}
          </p>
        )}
      </div>

      {/* Zoom */}
      <div className="absolute right-8 bottom-8 z-10 flex items-center gap-3">
        <div className="bg-white rounded-2xl shadow-md px-3 h-14 flex items-center text-sm font-medium text-gray-600 min-w-[64px] justify-center">
          {Math.round(zoom * 100)}%
        </div>
        <div className="bg-white rounded-2xl shadow-md flex overflow-hidden">
          <button onClick={() => zoomBy(1.2)} className="w-14 h-14 flex items-center justify-center hover:bg-gray-50">
            <Plus />
          </button>
          <div className="w-px bg-gray-200" />
          <button onClick={() => zoomBy(1 / 1.2)} className="w-14 h-14 flex items-center justify-center hover:bg-gray-50">
            <Minus />
          </button>
        </div>
      </div>
    </div>
  );
}

export default BoardPage;
