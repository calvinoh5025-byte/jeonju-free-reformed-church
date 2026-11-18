import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const boardPosts = sqliteTable("board_posts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  author: text("author").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  status: text("status", { enum: ["pending", "approved", "rejected"] })
    .notNull()
    .default("pending"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  approvedAt: text("approved_at"),
});
