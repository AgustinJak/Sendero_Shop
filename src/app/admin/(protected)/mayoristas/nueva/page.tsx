import NuevaMayoristaForm from "@/components/admin/NuevaMayoristaForm";

export default function NuevaMayoristaPage() {
  return (
    <div className="max-w-lg space-y-4">
      <h1 className="font-[family-name:var(--font-cinzel)] text-xl font-bold text-niebla">
        Nueva lista mayorista
      </h1>
      <NuevaMayoristaForm />
    </div>
  );
}
