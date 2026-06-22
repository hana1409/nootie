import { FileText, History, Plus } from "lucide-react";

export default function Dashboard() {
  return (
    <div className="h-screen flex bg-[#fafafa]">

      {/* Sidebar */}
      <div className="w-[320px] border-r border-gray-200 bg-white">

        <div className="p-10">
          <h1 className="text-5xl font-black text-[#A12259]">
            NOOTIE
          </h1>
        </div>

        <div className="px-5">

          {/* New */}
          <div className="bg-pink-50 rounded-xl p-4 flex items-center gap-3 cursor-pointer">
            <FileText size={22} />
            <span className="text-2xl">new</span>
          </div>

          {/* Recent */}
          <div className="mt-6 p-4 flex items-center gap-3 cursor-pointer">
            <History size={22} />
            <span className="text-2xl">Recent</span>
          </div>

        </div>
      </div>

      {/* Content */}
      <div className="flex-1">

        {/* Top Bar */}
        <div className="h-[70px] border-b border-gray-200 flex items-center px-8">
          <h2 className="text-2xl">new</h2>
        </div>

        {/* Body */}
        <div className="p-8">

          <h3 className="text-3xl mb-8">
            Mulai Lembar Baru :
          </h3>

          <button
            className="w-[220px] h-[280px] border-2 border-[#A12259]
            hover:bg-pink-50 transition rounded-sm flex flex-col
            items-center justify-center gap-10"
          >
            <div className="text-purple-500 font-bold text-3xl">
              ✦ p...
            </div>

            <Plus
              size={80}
              className="text-[#A12259]"
            />
          </button>

        </div>
      </div>

    </div>
  );
}