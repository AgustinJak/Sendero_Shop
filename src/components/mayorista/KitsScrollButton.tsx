"use client";

export default function KitsScrollButton() {
  return (
    <button
      type="button"
      onClick={() =>
        document.getElementById("kits")?.scrollIntoView({ behavior: "smooth", block: "start" })
      }
      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#D4A853] hover:bg-[#E0B968] text-[#1C2541] text-sm font-semibold transition-colors"
    >
      🎁 Ver kits pre armados
      <span aria-hidden="true">↓</span>
    </button>
  );
}
