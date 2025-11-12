export default function LoadingOverlay() {
  return (
    <div className="min-h-screen grid place-items-center bg-gradient-to-br from-white via-[#f1fbf9] to-[#eaf7f5]">
      <div className="inline-flex items-center gap-3 text-[#006d77]">
        <span className="h-3 w-3 animate-ping rounded-full bg-[#006d77]" />
        <span className="text-lg font-medium">Loading...</span>
      </div>
    </div>
  );
}
