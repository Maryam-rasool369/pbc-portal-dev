import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import {
  HiCheck,
  HiEmojiHappy,
  HiMicrophone,
  HiPaperAirplane,
  HiPaperClip,
  HiTrash,
  HiX,
} from "react-icons/hi";
import { Spinner } from "flowbite-react";
import useAuthStore from "@/store/authStore";
import { uploadAttachment, type AttachmentType, type ChatMessage, type MessageType } from "@/services/chat";
import type { KlipyGif } from "@/utils/klipy";
import EmojiGifPicker from "./EmojiGifPicker";

const GIF_MIME_TYPE = "image/gif";

const TYPING_STOP_DELAY_MS = 2500;
const AUDIO_MIME_CANDIDATES = ["audio/webm", "audio/mp4", "audio/aac", "audio/ogg"];
const COMPOSER_MIN_HEIGHT = 24;
const COMPOSER_MAX_HEIGHT = 160;

interface PendingFile {
  file: File;
}

interface UploadedAttachment {
  url: string;
  type: AttachmentType;
  fileName: string;
  fileSize: number;
  mimeType: string;
  duration?: number;
}

interface MessageComposerProps {
  chatId: number;
  replyingTo: ChatMessage | null;
  onCancelReply: () => void;
  editingMessage: ChatMessage | null;
  onCancelEdit: () => void;
  onSend: (payload: {
    content?: string;
    type?: MessageType;
    replyToId?: number;
    attachments?: UploadedAttachment[];
  }) => void;
  onSaveEdit: (content: string) => void;
  onTyping: () => void;
  onStopTyping: () => void;
}

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function pickAudioMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  return AUDIO_MIME_CANDIDATES.find((type) => MediaRecorder.isTypeSupported(type));
}

export default function MessageComposer({
  chatId,
  replyingTo,
  onCancelReply,
  editingMessage,
  onCancelEdit,
  onSend,
  onSaveEdit,
  onTyping,
  onStopTyping,
}: MessageComposerProps) {
  const token = useAuthStore((state) => state.token);
  const [content, setContent] = useState("");
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [showPicker, setShowPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pickerContainerRef = useRef<HTMLDivElement>(null);
  const isTypingRef = useRef(false);
  const stopTypingTimer = useRef<ReturnType<typeof setTimeout>>();

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const sendOnStopRef = useRef(false);
  const recordingSecondsRef = useRef(0);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (editingMessage) setContent(editingMessage.content);
  }, [editingMessage]);

  // Grow the textarea with its content up to a max height, then let it
  // scroll internally — WhatsApp-style, instead of endlessly expanding.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, COMPOSER_MAX_HEIGHT)}px`;
  }, [content]);

  useEffect(() => {
    if (!showPicker) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerContainerRef.current && !pickerContainerRef.current.contains(e.target as Node)) {
        setShowPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showPicker]);

  const insertEmoji = (emoji: string) => {
    const el = textareaRef.current;
    if (!el) {
      handleContentChange(content + emoji);
      return;
    }
    const start = el.selectionStart ?? content.length;
    const end = el.selectionEnd ?? content.length;
    const next = content.slice(0, start) + emoji + content.slice(end);
    handleContentChange(next);
    requestAnimationFrame(() => {
      el.focus();
      const cursor = start + emoji.length;
      el.setSelectionRange(cursor, cursor);
    });
  };

  const sendGif = (gif: KlipyGif) => {
    if (!gif.fullUrl) return;
    // Matches the mobile app's handleSendKlipyMedia: the GIF's URL goes
    // straight into `content`, no attachment — GIFs aren't uploaded anywhere.
    onSend({
      content: gif.fullUrl,
      type: "GIF",
      replyToId: replyingTo?.id,
    });
    onCancelReply();
    setShowPicker(false);
  };

  const stopMediaRecorder = useCallback((send: boolean) => {
    sendOnStopRef.current = send;
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
    setIsRecording(false);
  }, []);

  // Cancel an in-flight recording if the user switches chats, and release the
  // mic on unmount — MessageComposer doesn't remount between chats.
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        stopMediaRecorder(false);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId]);

  const handleContentChange = (value: string) => {
    setContent(value);
    if (editingMessage) return;

    if (value.trim() && !isTypingRef.current) {
      isTypingRef.current = true;
      onTyping();
    }
    if (stopTypingTimer.current) clearTimeout(stopTypingTimer.current);
    stopTypingTimer.current = setTimeout(() => {
      isTypingRef.current = false;
      onStopTyping();
    }, TYPING_STOP_DELAY_MS);

    if (!value.trim() && isTypingRef.current) {
      isTypingRef.current = false;
      onStopTyping();
    }
  };

  const handleFileSelect = (files: FileList | null) => {
    if (!files?.length) return;
    const next: PendingFile[] = Array.from(files).map((file) => ({ file }));
    setPendingFiles((prev) => [...prev, ...next]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removePendingFile = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const resetComposer = () => {
    setContent("");
    setPendingFiles([]);
    setShowPicker(false);
    if (isTypingRef.current) {
      isTypingRef.current = false;
      onStopTyping();
    }
    if (stopTypingTimer.current) clearTimeout(stopTypingTimer.current);
  };

  const handleSend = useCallback(async () => {
    const trimmed = content.trim();

    if (editingMessage) {
      if (!trimmed) return;
      onSaveEdit(trimmed);
      setContent("");
      return;
    }

    if (!trimmed && !pendingFiles.length) return;
    if (!token) return;

    try {
      let attachments: UploadedAttachment[] | undefined;
      let type: MessageType | undefined;
      if (pendingFiles.length) {
        setUploading(true);
        attachments = await Promise.all(
          pendingFiles.map(async ({ file }) => {
            const res = await uploadAttachment(token, chatId, file);
            return {
              url: res.data.url,
              type: res.data.type,
              fileName: res.data.fileName,
              fileSize: res.data.fileSize,
              mimeType: res.data.mimeType,
            };
          }),
        );
        // A lone .gif file attached directly (rather than picked from the
        // Klipy GIF tab) still gets tagged as a GIF message, not a plain image.
        if (pendingFiles.length === 1 && pendingFiles[0].file.type === GIF_MIME_TYPE) {
          type = "GIF";
        }
      }

      onSend({
        content: trimmed || undefined,
        type,
        replyToId: replyingTo?.id,
        attachments,
      });
      resetComposer();
      onCancelReply();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setUploading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, pendingFiles, token, chatId, replyingTo, editingMessage]);

  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      toast.error(
        window.isSecureContext
          ? "Voice messages aren't supported in this browser."
          : "Voice messages need a secure (HTTPS) connection.",
      );
      return;
    }

    // Step 1: get the mic. Only failures here are about access/devices.
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      console.error("getUserMedia failed:", err);
      const name = (err as DOMException)?.name;
      if (name === "NotAllowedError" || name === "SecurityError") {
        toast.error(
          "Microphone access is blocked. Allow it in your browser's site settings and check no policy blocks it, then try again.",
        );
      } else if (name === "NotFoundError" || name === "OverconstrainedError") {
        toast.error("No microphone was found on this device.");
      } else if (name === "NotReadableError" || name === "AbortError") {
        toast.error("Your microphone is in use by another app or tab. Close it and try again.");
      } else {
        toast.error("Couldn't access your microphone.");
      }
      return;
    }

    // Step 2: set up the recorder. Always release the mic if this fails.
    try {
      const mimeType = pickAudioMimeType();
      let recorder: MediaRecorder;
      try {
        recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      } catch {
        // Some browsers advertise a type they then reject; use the default.
        recorder = new MediaRecorder(stream);
      }
      chunksRef.current = [];
      sendOnStopRef.current = false;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const duration = recordingSecondsRef.current;
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || mimeType || "audio/webm",
        });
        chunksRef.current = [];
        if (sendOnStopRef.current && duration > 0) {
          void sendVoiceMessage(blob, duration);
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      recordingSecondsRef.current = 0;
      setRecordingSeconds(0);
      setIsRecording(true);
      recordingTimerRef.current = setInterval(() => {
        recordingSecondsRef.current += 1;
        setRecordingSeconds(recordingSecondsRef.current);
      }, 1000);
    } catch (err) {
      console.error("Voice recorder setup failed:", err);
      stream.getTracks().forEach((track) => track.stop());
      toast.error("Couldn't start recording in this browser. Please try another browser.");
    }
  };

  const sendVoiceMessage = async (blob: Blob, duration: number) => {
    if (!token) return;
    setUploading(true);
    try {
      const extension = blob.type.includes("mp4")
        ? "m4a"
        : blob.type.includes("ogg")
          ? "ogg"
          : "webm";
      const file = new File([blob], `voice-message.${extension}`, { type: blob.type || "audio/webm" });
      const res = await uploadAttachment(token, chatId, file, duration);
      onSend({
        attachments: [
          {
            url: res.data.url,
            type: res.data.type,
            fileName: res.data.fileName,
            fileSize: res.data.fileSize,
            mimeType: res.data.mimeType,
            duration: res.data.duration ?? duration,
          },
        ],
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send voice message");
    } finally {
      setUploading(false);
    }
  };

  if (isRecording) {
    return (
      <div className="border-t border-gray-800 bg-gray-900 px-4 lg:px-10 xl:px-24 py-4">
        <div className="flex items-center gap-3 bg-gray-800 rounded-3xl pl-4 pr-1.5 py-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
          <span className="text-white text-sm font-medium tabular-nums flex-shrink-0">
            {formatDuration(recordingSeconds)}
          </span>
          <span className="text-gray-400 text-sm flex-1">Recording voice message...</span>
          <button
            onClick={() => stopMediaRecorder(false)}
            title="Cancel"
            className="text-gray-400 hover:text-red-400 p-2.5 flex-shrink-0"
          >
            {/* @ts-ignore */}
            <HiTrash className="w-5 h-5" />
          </button>
          <button
            onClick={() => stopMediaRecorder(true)}
            title="Send"
            className="bg-gold-500 hover:bg-gold-600 text-gray-900 rounded-full p-3 flex-shrink-0 transition-colors"
          >
            {/* @ts-ignore */}
            <HiCheck className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  const showMic = !editingMessage && !content.trim() && !pendingFiles.length;

  return (
    <div className="border-t border-gray-800 bg-gray-900 px-4 lg:px-10 xl:px-24 py-4">
      {(replyingTo || editingMessage) && (
        <div className="flex items-start justify-between bg-gray-800 rounded-lg px-3 py-2 mb-2 border-l-2 border-gold-500">
          <div className="min-w-0">
            <p className="text-xs font-medium text-gold-400">
              {editingMessage ? "Editing message" : `Replying to ${replyingTo?.sender.name}`}
            </p>
            <p className="text-xs text-gray-400 truncate">
              {editingMessage ? editingMessage.content : replyingTo?.content || "Attachment"}
            </p>
          </div>
          <button
            onClick={() => (editingMessage ? onCancelEdit() : onCancelReply())}
            className="text-gray-400 hover:text-white flex-shrink-0 ml-2"
          >
            {/* @ts-ignore */}
            <HiX className="w-4 h-4" />
          </button>
        </div>
      )}

      {pendingFiles.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {pendingFiles.map((p, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1.5 bg-gray-800 text-gray-300 text-xs rounded-full pl-3 pr-1.5 py-1"
            >
              <span className="truncate max-w-[180px]">{p.file.name}</span>
              <button
                onClick={() => removePendingFile(i)}
                className="text-gray-400 hover:text-white p-0.5"
              >
                {/* @ts-ignore */}
                <HiX className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2.5">
        <div className="flex-1 flex items-end gap-1 bg-gray-800 rounded-3xl pl-2 pr-1.5 py-1.5 focus-within:ring-2 focus-within:ring-gold-500/70 transition-shadow">
          {!editingMessage && (
            <>
              <div className="relative flex-shrink-0 self-end" ref={pickerContainerRef}>
                <button
                  onClick={() => setShowPicker((v) => !v)}
                  className={`p-2 transition-colors ${
                    showPicker ? "text-gold-400" : "text-gray-400 hover:text-gold-400"
                  }`}
                  title="Emoji & GIFs"
                >
                  {/* @ts-ignore */}
                  <HiEmojiHappy className="w-5 h-5" />
                </button>

                {showPicker && (
                  <div className="absolute bottom-full left-0 mb-2 z-40">
                    <EmojiGifPicker onEmojiSelect={insertEmoji} onGifSelect={sendGif} />
                  </div>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => handleFileSelect(e.target.files)}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-gray-400 hover:text-gold-400 p-2 flex-shrink-0 self-end"
                title="Attach file"
              >
                {/* @ts-ignore */}
                <HiPaperClip className="w-5 h-5" />
              </button>
            </>
          )}

          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Type a message"
            rows={1}
            style={{ minHeight: COMPOSER_MIN_HEIGHT, maxHeight: COMPOSER_MAX_HEIGHT }}
            className="flex-1 resize-none border-0 bg-transparent text-white placeholder-gray-500 py-1.5 text-sm focus:outline-none focus:ring-0 overflow-y-auto"
          />
        </div>

        {showMic ? (
          <button
            onClick={startRecording}
            disabled={uploading}
            title="Record voice message"
            className="bg-gold-500 hover:bg-gold-600 disabled:opacity-40 disabled:cursor-not-allowed text-gray-900 rounded-full p-3 flex-shrink-0 transition-colors"
          >
            {uploading ? (
              <Spinner size="sm" />
            ) : (
              // @ts-ignore
              <HiMicrophone className="w-5 h-5" />
            )}
          </button>
        ) : (
          <button
            onClick={handleSend}
            disabled={uploading || (!content.trim() && !pendingFiles.length)}
            className="bg-gold-500 hover:bg-gold-600 disabled:opacity-40 disabled:cursor-not-allowed text-gray-900 rounded-full p-3 flex-shrink-0 transition-colors"
          >
            {uploading ? (
              <Spinner size="sm" />
            ) : (
              // @ts-ignore
              <HiPaperAirplane className="w-5 h-5 rotate-90" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}
