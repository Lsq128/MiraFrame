"use client";

interface MessageInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled?: boolean;
  placeholder?: string;
}

export function MessageInput({
  value,
  onChange,
  onSend,
  disabled = false,
  placeholder = "输入反馈或直接回车发送...",
}: MessageInputProps) {
  return (
    <div className="flex gap-2 p-2 border-t border-base-300">
      <input
        type="text"
        className="input input-bordered bg-base-300 flex-1"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            onSend();
          }
        }}
        disabled={disabled}
        placeholder={placeholder}
      />
      <button
        className="btn btn-primary btn-sm"
        onClick={onSend}
        disabled={disabled || !value.trim()}
      >
        发送
      </button>
    </div>
  );
}
