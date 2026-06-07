import { Conversation, StoredMessage } from "@app/shared";
import { db } from "../db.js";

/**
 * リポジトリ層（CONTRACT.md §4）。
 * SQLite への直アクセスをこの薄い関数群の裏に隠す。
 * 上位レイヤは `ConversationRepo` インターフェースだけに依存する。
 */
export interface ConversationRepo {
  createConversation(c: Conversation): Promise<void>;
  getConversation(id: string): Promise<Conversation | null>;
  listConversations(): Promise<Conversation[]>;
  appendMessages(conversationId: string, messages: StoredMessage[]): Promise<void>;
  listMessages(conversationId: string): Promise<StoredMessage[]>;
}

interface ConversationRow {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface MessageRow {
  id: string;
  conversation_id: string;
  role: string;
  parts: string;
  created_at: string;
}

const insertConversation = db.prepare(
  `INSERT OR IGNORE INTO conversations (id, title, created_at, updated_at)
   VALUES (@id, @title, @created_at, @updated_at)`
);

const selectConversation = db.prepare(
  `SELECT id, title, created_at, updated_at FROM conversations WHERE id = ?`
);

const selectConversations = db.prepare(
  `SELECT id, title, created_at, updated_at FROM conversations ORDER BY updated_at DESC`
);

const insertMessage = db.prepare(
  `INSERT OR IGNORE INTO messages (id, conversation_id, role, parts, created_at)
   VALUES (@id, @conversation_id, @role, @parts, @created_at)`
);

const touchConversation = db.prepare(
  `UPDATE conversations SET updated_at = ? WHERE id = ?`
);

const selectMessages = db.prepare(
  `SELECT id, conversation_id, role, parts, created_at
   FROM messages WHERE conversation_id = ? ORDER BY created_at ASC`
);

function rowToConversation(row: ConversationRow): Conversation {
  return Conversation.parse({
    id: row.id,
    title: row.title,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

const appendMessagesTx = db.transaction(
  (conversationId: string, messages: StoredMessage[]) => {
    for (const m of messages) {
      insertMessage.run({
        id: m.id,
        conversation_id: conversationId,
        role: m.role,
        parts: JSON.stringify(m.parts),
        created_at: m.createdAt,
      });
    }
    touchConversation.run(new Date().toISOString(), conversationId);
  }
);

export const conversationRepo: ConversationRepo = {
  async createConversation(c: Conversation): Promise<void> {
    insertConversation.run({
      id: c.id,
      title: c.title,
      created_at: c.createdAt,
      updated_at: c.updatedAt,
    });
  },

  async getConversation(id: string): Promise<Conversation | null> {
    const row = selectConversation.get(id) as ConversationRow | undefined;
    return row ? rowToConversation(row) : null;
  },

  async listConversations(): Promise<Conversation[]> {
    const rows = selectConversations.all() as ConversationRow[];
    return rows.map(rowToConversation);
  },

  async appendMessages(
    conversationId: string,
    messages: StoredMessage[]
  ): Promise<void> {
    if (messages.length === 0) return;
    appendMessagesTx(conversationId, messages);
  },

  async listMessages(conversationId: string): Promise<StoredMessage[]> {
    const rows = selectMessages.all(conversationId) as MessageRow[];
    return rows.map((row) =>
      StoredMessage.parse({
        id: row.id,
        conversationId: row.conversation_id,
        role: row.role,
        parts: JSON.parse(row.parts),
        createdAt: row.created_at,
      })
    );
  },
};
