import { Mic, Square } from "lucide-react";
import { cn } from "@/shared/utils/cn";

type MicrophoneButtonProps = {
  listening: boolean;
  disabled?: boolean;
  onClick: () => void;
};

export function MicrophoneButton({ listening, disabled, onClick }: MicrophoneButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium transition",
        listening
          ? "bg-red-100 text-red-700 hover:bg-red-200"
          : "bg-accent-500 text-white hover:bg-accent-400",
        disabled && "cursor-not-allowed opacity-50"
      )}
    >
      {listening ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
      {listening ? "Стоп" : "Слушать"}
    </button>
  );
}
