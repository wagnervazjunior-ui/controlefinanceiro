import {
  pgTable, serial, text, integer, numeric, date, varchar, timestamp, uniqueIndex, boolean,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
});

export const people = pgTable("people", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  isMain: boolean("is_main").notNull().default(false),
});

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  bankTagAlias: text("bank_tag_alias"),
  // Categories flagged here (e.g. "Pagamento de fatura", transfers) are kept
  // out of expense reports to avoid double-counting.
  excludeFromReports: boolean("exclude_from_reports").notNull().default(false),
});

export const categorySplits = pgTable("category_splits", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id").notNull().references(() => categories.id, { onDelete: "cascade" }),
  personId: integer("person_id").notNull().references(() => people.id, { onDelete: "cascade" }),
  percentage: numeric("percentage", { precision: 5, scale: 2 }).notNull(),
});

export const cards = pgTable("cards", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  lastFourDigits: varchar("last_four_digits", { length: 4 }),
  bank: text("bank").notNull(),
});

export const bankAccounts = pgTable("bank_accounts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  bank: text("bank").notNull(),
});

export const months = pgTable("months", {
  id: serial("id").primaryKey(),
  year: integer("year").notNull(),
  month: integer("month").notNull(),
  status: varchar("status", { length: 10 }).notNull().default("aberto"),
}, (table) => ({
  yearMonthIdx: uniqueIndex("months_year_month_idx").on(table.year, table.month),
}));

export const statementImports = pgTable("statement_imports", {
  id: serial("id").primaryKey(),
  type: varchar("type", { length: 10 }).notNull(),
  monthId: integer("month_id").notNull().references(() => months.id),
  cardId: integer("card_id").references(() => cards.id),
  bankAccountId: integer("bank_account_id").references(() => bankAccounts.id),
  fileName: text("file_name").notNull(),
  importedAt: timestamp("imported_at").notNull().defaultNow(),
});

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  statementImportId: integer("statement_import_id").notNull().references(() => statementImports.id, { onDelete: "cascade" }),
  monthId: integer("month_id").notNull().references(() => months.id),
  cardId: integer("card_id").references(() => cards.id),
  bankAccountId: integer("bank_account_id").references(() => bankAccounts.id),
  description: text("description").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  date: date("date").notNull(),
  categoryId: integer("category_id").references(() => categories.id),
  installmentCurrent: integer("installment_current"),
  installmentTotal: integer("installment_total"),
  installmentGroupKey: text("installment_group_key"),
  bankSuggestedTag: text("bank_suggested_tag"),
  dedupeKey: text("dedupe_key").notNull(),
}, (table) => ({
  dedupeIdx: uniqueIndex("transactions_dedupe_key_idx").on(table.dedupeKey),
}));

export const incomes = pgTable("incomes", {
  id: serial("id").primaryKey(),
  personId: integer("person_id").notNull().references(() => people.id, { onDelete: "cascade" }),
  monthId: integer("month_id").notNull().references(() => months.id),
  description: text("description").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  date: date("date").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const settlements = pgTable("settlements", {
  id: serial("id").primaryKey(),
  personId: integer("person_id").notNull().references(() => people.id, { onDelete: "cascade" }),
  monthId: integer("month_id").notNull().references(() => months.id),
  paidAmount: numeric("paid_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  confirmed: boolean("confirmed").notNull().default(false),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  personMonthIdx: uniqueIndex("settlements_person_month_idx").on(table.personId, table.monthId),
}));

export const investments = pgTable("investments", {
  id: serial("id").primaryKey(),
  assetType: text("asset_type").notNull(),
  description: text("description"),
  contributionAmount: numeric("contribution_amount", { precision: 12, scale: 2 }),
  currentBalance: numeric("current_balance", { precision: 12, scale: 2 }).notNull(),
  date: date("date").notNull(),
});
