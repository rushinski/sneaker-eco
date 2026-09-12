import { isAdminRole, isProfileRole } from "@/config/constants/roles";
import type { AdminSupabaseClient } from "@/lib/supabase/service-role";
import type { TypedSupabaseClient } from "@/lib/supabase/server";
import { log } from "@/lib/utils/log";
import { ChatMessagesRepository } from "@/repositories/chat-messages-repo";
import { ChatsRepository } from "@/repositories/chats-repo";
import { ProfileRepository } from "@/repositories/profile-repo";
import { AdminNotificationService } from "@/services/admin-notification-service";

export class ChatService {
  private readonly chatsRepo: ChatsRepository;
  private readonly messagesRepo: ChatMessagesRepository;
  private readonly profilesRepo: ProfileRepository;

  constructor(
    supabase: TypedSupabaseClient,
    private readonly adminSupabase?: AdminSupabaseClient,
  ) {
    this.chatsRepo = new ChatsRepository(supabase);
    this.messagesRepo = new ChatMessagesRepository(supabase);
    this.profilesRepo = new ProfileRepository(supabase);
  }

  async getOpenChatForUser(userId: string) {
    return this.chatsRepo.getOpenChatForUser(userId);
  }

  async createChatForUser(userId: string) {
    const existing = await this.chatsRepo.getOpenChatForUser(userId);
    if (existing) {
      return { chat: existing, created: false };
    }

    const chat = await this.chatsRepo.createChat(userId);
    return { chat, created: true };
  }

  async listAdminChats(params?: { status?: "open" | "closed" }) {
    return this.chatsRepo.listAdminChats(params);
  }

  async listMessages(chatId: string) {
    return this.messagesRepo.listByChatId(chatId);
  }

  async sendMessage(input: { chatId: string; senderId: string; body: string }) {
    const chat = await this.chatsRepo.getById(input.chatId);
    if (!chat) {
      throw new Error("Chat not found");
    }
    if (chat.status === "closed") {
      throw new Error("Chat closed");
    }

    const profile = await this.profilesRepo.getByUserId(input.senderId);
    const role = isProfileRole(profile?.role) ? profile.role : "customer";
    const isCustomer = chat.user_id === input.senderId;
    const isAdmin = isAdminRole(role);

    if (!isCustomer && !isAdmin) {
      throw new Error("Forbidden");
    }

    const senderRole = isCustomer ? "customer" : "admin";
    const message = await this.messagesRepo.insertMessage({
      chatId: input.chatId,
      senderId: input.senderId,
      senderRole,
      body: input.body,
    });

    if (this.adminSupabase && senderRole === "customer") {
      try {
        const label = profile?.email?.split("@")[0]?.trim() || "Customer";
        await new AdminNotificationService(this.adminSupabase).notifyChatMessage(
          chat.id,
          input.body.slice(0, 120),
          label,
        );
      } catch (error) {
        log({
          level: "warn",
          layer: "service",
          message: "chat_notification_failed",
          error: error instanceof Error ? error.message : String(error),
          chatId: chat.id,
        });
      }
    }

    return message;
  }

  async closeChat(chatId: string, closedBy?: string | null) {
    return this.chatsRepo.closeChat(chatId, closedBy ?? null);
  }
}
