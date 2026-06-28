import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { FileText, Clock, Plus, MoreHorizontal, Trash2 } from "lucide-react";
import { API_URL, SOCKET_URL } from "../config";

export default function Dashboard() {
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  const token = localStorage.getItem("token");

  const fetchBoards = async () => {
    try {
      const res = await axios.get(`${API_URL}/boards`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setBoards(res.data.boards);
    } catch (err) {
      if (err.response?.status === 401) {
        navigate("/");
      } else {
        console.error(err);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) {
      navigate("/");
      return;
    }
    fetchBoards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreateBoard = async () => {
    if (creating) return;
    setCreating(true);

    try {
      const res = await axios.post(
        `${API_URL}/boards`,
        { title: "Untitled" },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      navigate(`/board/${res.data.board.id}`);
    } catch (err) {
      alert(err.response?.data?.message || "Gagal membuat board baru");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteBoard = async (e, boardId) => {
    e.stopPropagation();
    if (!window.confirm("Hapus board ini?")) return;

    try {
      await axios.delete(`${API_URL}/boards/${boardId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setBoards((prev) => prev.filter((b) => b.id !== boardId));
    } catch (err) {
      alert(err.response?.data?.message || "Gagal menghapus board");
    }
  };

  return (
    <div className="min-h-screen flex bg-[#FAFAFA]">

      {/* Sidebar */}
      <div className="w-[260px] border-r border-gray-100 bg-white px-5 py-6 flex flex-col">
        <h1
          className="text-3xl font-bold text-[#A12259] mb-1"
          style={{ fontFamily: "Georgia, serif" }}
        >
          NOTIEE
        </h1>

        <button
          onClick={handleCreateBoard}
          disabled={creating}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-pink-50 text-[#252525] mb-1 hover:bg-pink-100 transition disabled:opacity-60"
        >
          <FileText size={18} />
          <span className="font-medium">new</span>
        </button>

        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600">
          <Clock size={18} />
          <span className="font-medium">Recent</span>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        <div className="h-[57px] border-b border-gray-100 flex items-center px-8">
          <span className="text-gray-700">new</span>
        </div>

        <div className="p-8">
          <p className="text-gray-700 mb-6">Mulai Lembar Baru :</p>

          <div className="flex flex-wrap gap-6">
            {/* Create new board card */}
            <button
              onClick={handleCreateBoard}
              disabled={creating}
              className="w-[150px] h-[200px] rounded-xl border border-[#E8A0B8] flex flex-col items-center justify-center gap-2 hover:bg-pink-50/50 transition disabled:opacity-60"
            >
              <Plus size={36} className="text-[#A12259]" strokeWidth={1.5} />
            </button>

            {/* Existing boards */}
            {loading ? (
              <p className="text-gray-400 self-center">Memuat board...</p>
            ) : (
              boards.map((board) => (
                <div
                  key={board.id}
                  onClick={() => navigate(`/board/${board.id}`)}
                  className="w-[150px] h-[200px] rounded-xl border border-gray-200 bg-white flex flex-col p-3 cursor-pointer hover:shadow-md transition relative group"
                >
                  <button
                    onClick={(e) => handleDeleteBoard(e, board.id)}
                    className="absolute top-2 right-2 p-1 rounded-md text-gray-300 opacity-0 group-hover:opacity-100 hover:text-red-500 hover:bg-red-50 transition"
                    title="Hapus board"
                  >
                    <Trash2 size={14} />
                  </button>

                  <div className="flex-1 rounded-md bg-[#FAFAFA] border border-gray-100" />

                  <p className="text-sm font-medium text-gray-700 mt-2 truncate">
                    {board.title}
                  </p>
                  <p className="text-xs text-gray-400">
                    {board.created_by_username}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
