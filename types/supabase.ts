export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      categories: {
        Row: { id: string; user_id: string; name: string; created_at: string | null };
        Insert: { id?: string; user_id: string; name: string; created_at?: string | null };
        Update: { id?: string; user_id?: string; name?: string; created_at?: string | null };
        Relationships: [];
      };
      entries: {
        Row: {
          id: number;
          user_id: string;
          date: string;
          category: string;
          description: string;
          amount: number;
          time: string;
          method: string;
          type: string;
          note: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: number;
          user_id: string;
          date: string;
          category: string;
          description: string;
          amount: number;
          time: string;
          method: string;
          type: string;
          note?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: number;
          user_id?: string;
          date?: string;
          category?: string;
          description?: string;
          amount?: number;
          time?: string;
          method?: string;
          type?: string;
          note?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      recurring_expenses: {
        Row: {
          id: number;
          user_id: string;
          title: string;
          amount: number;
          frequency: string;
          next_due_date: string;
          method: string;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: number;
          user_id: string;
          title: string;
          amount: number;
          frequency: string;
          next_due_date: string;
          method: string;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: number;
          user_id?: string;
          title?: string;
          amount?: number;
          frequency?: string;
          next_due_date?: string;
          method?: string;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      reminders: {
        Row: {
          id: number;
          user_id: string;
          title: string;
          date: string;
          time: string;
          completed: boolean | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: number;
          user_id: string;
          title: string;
          date: string;
          time: string;
          completed?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: number;
          user_id?: string;
          title?: string;
          date?: string;
          time?: string;
          completed?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
