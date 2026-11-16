import { ReactElement, useEffect, useState } from "react";
import { useRouter } from "next/router";
import { HiChat, HiOutlineChatAlt2 } from "react-icons/hi";
import { useChats } from "@/hooks/useChats";
import { useChatSocket } from "@/hooks/useChatSocket";
import ConversationList from "@/components/chat/ConversationList";
import ChatWindow from "@/components/chat/ChatWindow";
import CreateChatModal from "@/components/chat/CreateChatModal";
import ChatLayout from "@/layouts/ChatLayout";
import { useAbility } from "@/hooks/useAbility";
import { toast } from "react-toastify";

function ChatPage() {
  const router = useRouter();
  const [activeChatId, setActiveChatId] = useState<number | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const ability = useAbility();

  // check if the user has the ability to read chats
  useEffect(() => {
    if (!ability?.can("read", "Chat")) {
      toast.error("You are not authorized to access this page");
      router.push("/userMarketplace");
    }
  }, [ability, router]);

  useEffect(() => {
    if (!router.isReady || !ability?.can("read", "Chat")) return;
    const q = router.query.chatId;
    const parsed = Number(Array.isArray(q) ? q[0] : q);
    setActiveChatId(Number.isFinite(parsed) && parsed > 0 ? parsed : null);
  }, [router.isReady, router.query.chatId]);

  const { data } = useChats();
  const activeChat = data?.data.find((c) => c.id === activeChatId) ?? null;

  const { typingUsers, sendMessage, emitTyping, emitStopTyping, markRead } = useChatSocket(activeChatId);

  const selectChat = (chatId: number) => {
    router.replace({ pathname: "/chat", query: { chatId } }, undefined, { shallow: true });
  };

  const closeChat = () => {
    router.replace({ pathname: "/chat" }, undefined, { shallow: true });
  };

  return (
    <div className="flex h-full w-full overflow-hidden">
      <ConversationList
        activeChatId={activeChatId}
        onSelectChat={selectChat}
        onOpenCreate={() => setShowCreateModal(true)}
        className={`w-full lg:w-[30%] lg:min-w-[300px] lg:max-w-[480px] flex-shrink-0 ${activeChatId ? "hidden lg:flex" : "flex"}`}
      />

      <div className={`flex-1 min-w-0 ${activeChatId ? "flex" : "hidden lg:flex"}`}>
        {activeChat ? (
          <ChatWindow
            chat={activeChat}
            typingUsers={typingUsers}
            onSendMessage={sendMessage}
            onTyping={emitTyping}
            onStopTyping={emitStopTyping}
            onMarkRead={markRead}
            onBack={closeChat}
            onChatClosed={closeChat}
            onOpenChat={selectChat}
          />
        ) : (
          <div className="relative flex-1 flex flex-col items-center justify-center bg-gray-950 overflow-hidden">
            {/* @ts-ignore */}
            <HiOutlineChatAlt2 className="absolute w-[420px] h-[420px] text-white/[0.03] -rotate-6" />
            <div className="relative flex flex-col items-center text-center px-8">
              {/* @ts-ignore */}
              <HiChat className="w-16 h-16 text-gray-700 mb-5" />
              <h2 className="text-2xl font-semibold text-gray-200 mb-2">PBC Chat</h2>
              <p className="text-gray-500 max-w-sm mb-6">
                Select a conversation from the list, or start a new one to begin messaging.
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-5 py-2.5 bg-gold-500 hover:bg-gold-600 text-gray-900 rounded-full font-medium transition-colors"
              >
                Start a new chat
              </button>
            </div>
          </div>
        )}
      </div>

      {showCreateModal && (
        <CreateChatModal
          onClose={() => setShowCreateModal(false)}
          onCreated={(chat) => selectChat(chat.id)}
        />
      )}
    </div>
  );
}

ChatPage.getLayout = (page: ReactElement) => <ChatLayout>{page}</ChatLayout>;

export default ChatPage;
