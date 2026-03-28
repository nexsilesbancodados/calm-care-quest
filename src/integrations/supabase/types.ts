export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          acao: string
          created_at: string
          dados_anteriores: Json | null
          dados_novos: Json | null
          id: string
          registro_id: string | null
          tabela: string
          usuario_id: string | null
        }
        Insert: {
          acao: string
          created_at?: string
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          id?: string
          registro_id?: string | null
          tabela?: string
          usuario_id?: string | null
        }
        Update: {
          acao?: string
          created_at?: string
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          id?: string
          registro_id?: string | null
          tabela?: string
          usuario_id?: string | null
        }
        Relationships: []
      }
      automacao_config: {
        Row: {
          ativo: boolean
          id: string
          parametros: Json
          tipo: string
          ultima_execucao: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          id?: string
          parametros?: Json
          tipo: string
          ultima_execucao?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          id?: string
          parametros?: Json
          tipo?: string
          ultima_execucao?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      categorias_medicamento: {
        Row: {
          ativo: boolean
          cor: string
          id: string
          nome: string
        }
        Insert: {
          ativo?: boolean
          cor?: string
          id?: string
          nome: string
        }
        Update: {
          ativo?: boolean
          cor?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      clinicas_parceiras: {
        Row: {
          ativo: boolean
          cnes: string
          contato: string
          created_at: string
          endereco: string
          id: string
          nome: string
          telefone: string
        }
        Insert: {
          ativo?: boolean
          cnes?: string
          contato?: string
          created_at?: string
          endereco?: string
          id?: string
          nome: string
          telefone?: string
        }
        Update: {
          ativo?: boolean
          cnes?: string
          contato?: string
          created_at?: string
          endereco?: string
          id?: string
          nome?: string
          telefone?: string
        }
        Relationships: []
      }
      configuracoes_hospital: {
        Row: {
          alerta_estoque_pct: number
          alerta_vencimento_dias: number
          cnes: string
          id: string
          logo_url: string | null
          nome: string
        }
        Insert: {
          alerta_estoque_pct?: number
          alerta_vencimento_dias?: number
          cnes?: string
          id?: string
          logo_url?: string | null
          nome?: string
        }
        Update: {
          alerta_estoque_pct?: number
          alerta_vencimento_dias?: number
          cnes?: string
          id?: string
          logo_url?: string | null
          nome?: string
        }
        Relationships: []
      }
      filiais: {
        Row: {
          ativo: boolean
          cidade: string
          cnes: string
          cnpj: string
          created_at: string
          email: string
          endereco: string
          estado: string
          id: string
          nome: string
          responsavel: string
          telefone: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cidade?: string
          cnes?: string
          cnpj?: string
          created_at?: string
          email?: string
          endereco?: string
          estado?: string
          id?: string
          nome: string
          responsavel?: string
          telefone?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cidade?: string
          cnes?: string
          cnpj?: string
          created_at?: string
          email?: string
          endereco?: string
          estado?: string
          id?: string
          nome?: string
          responsavel?: string
          telefone?: string
          updated_at?: string
        }
        Relationships: []
      }
      fornecedores: {
        Row: {
          ativo: boolean
          cnpj: string
          contato: string
          created_at: string
          email: string
          endereco: string
          filial_id: string | null
          id: string
          nome: string
          telefone: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cnpj?: string
          contato?: string
          created_at?: string
          email?: string
          endereco?: string
          filial_id?: string | null
          id?: string
          nome: string
          telefone?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cnpj?: string
          contato?: string
          created_at?: string
          email?: string
          endereco?: string
          filial_id?: string | null
          id?: string
          nome?: string
          telefone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fornecedores_filial_id_fkey"
            columns: ["filial_id"]
            isOneToOne: false
            referencedRelation: "filiais"
            referencedColumns: ["id"]
          },
        ]
      }
      itens_prescricao: {
        Row: {
          created_at: string | null
          id: string
          medicamento_id: string
          posologia: string | null
          prescricao_id: string
          quantidade_dispensada: number
          quantidade_prescrita: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          medicamento_id: string
          posologia?: string | null
          prescricao_id: string
          quantidade_dispensada?: number
          quantidade_prescrita?: number
        }
        Update: {
          created_at?: string | null
          id?: string
          medicamento_id?: string
          posologia?: string | null
          prescricao_id?: string
          quantidade_dispensada?: number
          quantidade_prescrita?: number
        }
        Relationships: [
          {
            foreignKeyName: "itens_prescricao_medicamento_id_fkey"
            columns: ["medicamento_id"]
            isOneToOne: false
            referencedRelation: "medicamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itens_prescricao_prescricao_id_fkey"
            columns: ["prescricao_id"]
            isOneToOne: false
            referencedRelation: "prescricoes"
            referencedColumns: ["id"]
          },
        ]
      }
      lotes: {
        Row: {
          ativo: boolean
          created_at: string
          filial_id: string | null
          id: string
          medicamento_id: string
          numero_lote: string
          preco_unitario: number
          quantidade_atual: number
          validade: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          filial_id?: string | null
          id?: string
          medicamento_id: string
          numero_lote?: string
          preco_unitario?: number
          quantidade_atual?: number
          validade?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          filial_id?: string | null
          id?: string
          medicamento_id?: string
          numero_lote?: string
          preco_unitario?: number
          quantidade_atual?: number
          validade?: string
        }
        Relationships: [
          {
            foreignKeyName: "lotes_filial_id_fkey"
            columns: ["filial_id"]
            isOneToOne: false
            referencedRelation: "filiais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lotes_medicamento_id_fkey"
            columns: ["medicamento_id"]
            isOneToOne: false
            referencedRelation: "medicamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      medicamentos: {
        Row: {
          ativo: boolean
          categoria_id: string | null
          codigo_barras: string | null
          concentracao: string
          controlado: boolean
          created_at: string
          estoque_maximo: number
          estoque_minimo: number
          filial_id: string | null
          forma_farmaceutica: string
          fornecedor_id: string | null
          generico: string
          id: string
          localizacao: string
          nome: string
          preco_unitario: number
          principio_ativo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          categoria_id?: string | null
          codigo_barras?: string | null
          concentracao?: string
          controlado?: boolean
          created_at?: string
          estoque_maximo?: number
          estoque_minimo?: number
          filial_id?: string | null
          forma_farmaceutica?: string
          fornecedor_id?: string | null
          generico?: string
          id?: string
          localizacao?: string
          nome: string
          preco_unitario?: number
          principio_ativo?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          categoria_id?: string | null
          codigo_barras?: string | null
          concentracao?: string
          controlado?: boolean
          created_at?: string
          estoque_maximo?: number
          estoque_minimo?: number
          filial_id?: string | null
          forma_farmaceutica?: string
          fornecedor_id?: string | null
          generico?: string
          id?: string
          localizacao?: string
          nome?: string
          preco_unitario?: number
          principio_ativo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "medicamentos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias_medicamento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medicamentos_filial_id_fkey"
            columns: ["filial_id"]
            isOneToOne: false
            referencedRelation: "filiais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medicamentos_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
        ]
      }
      movimentacoes: {
        Row: {
          created_at: string
          filial_id: string | null
          id: string
          lote_id: string | null
          medicamento_id: string | null
          nota_fiscal: string | null
          observacao: string
          paciente: string | null
          prescricao_id: string | null
          prontuario: string | null
          quantidade: number
          setor: string | null
          tipo: Database["public"]["Enums"]["tipo_movimentacao"]
          usuario_id: string | null
        }
        Insert: {
          created_at?: string
          filial_id?: string | null
          id?: string
          lote_id?: string | null
          medicamento_id?: string | null
          nota_fiscal?: string | null
          observacao?: string
          paciente?: string | null
          prescricao_id?: string | null
          prontuario?: string | null
          quantidade?: number
          setor?: string | null
          tipo?: Database["public"]["Enums"]["tipo_movimentacao"]
          usuario_id?: string | null
        }
        Update: {
          created_at?: string
          filial_id?: string | null
          id?: string
          lote_id?: string | null
          medicamento_id?: string | null
          nota_fiscal?: string | null
          observacao?: string
          paciente?: string | null
          prescricao_id?: string | null
          prontuario?: string | null
          quantidade?: number
          setor?: string | null
          tipo?: Database["public"]["Enums"]["tipo_movimentacao"]
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "movimentacoes_filial_id_fkey"
            columns: ["filial_id"]
            isOneToOne: false
            referencedRelation: "filiais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_medicamento_id_fkey"
            columns: ["medicamento_id"]
            isOneToOne: false
            referencedRelation: "medicamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_prescricao_id_fkey"
            columns: ["prescricao_id"]
            isOneToOne: false
            referencedRelation: "prescricoes"
            referencedColumns: ["id"]
          },
        ]
      }
      notificacoes: {
        Row: {
          created_at: string
          filial_id: string | null
          id: string
          lida: boolean
          link: string | null
          lote_id: string | null
          medicamento_id: string | null
          mensagem: string
          metadata: Json | null
          prescricao_id: string | null
          resolvida: boolean
          severidade: string
          tipo: string
          titulo: string
          usuario_id: string | null
        }
        Insert: {
          created_at?: string
          filial_id?: string | null
          id?: string
          lida?: boolean
          link?: string | null
          lote_id?: string | null
          medicamento_id?: string | null
          mensagem?: string
          metadata?: Json | null
          prescricao_id?: string | null
          resolvida?: boolean
          severidade?: string
          tipo?: string
          titulo: string
          usuario_id?: string | null
        }
        Update: {
          created_at?: string
          filial_id?: string | null
          id?: string
          lida?: boolean
          link?: string | null
          lote_id?: string | null
          medicamento_id?: string | null
          mensagem?: string
          metadata?: Json | null
          prescricao_id?: string | null
          resolvida?: boolean
          severidade?: string
          tipo?: string
          titulo?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notificacoes_filial_id_fkey"
            columns: ["filial_id"]
            isOneToOne: false
            referencedRelation: "filiais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notificacoes_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notificacoes_medicamento_id_fkey"
            columns: ["medicamento_id"]
            isOneToOne: false
            referencedRelation: "medicamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notificacoes_prescricao_id_fkey"
            columns: ["prescricao_id"]
            isOneToOne: false
            referencedRelation: "prescricoes"
            referencedColumns: ["id"]
          },
        ]
      }
      prescricoes: {
        Row: {
          created_at: string | null
          crm: string | null
          data_prescricao: string
          filial_id: string | null
          id: string
          medico: string
          numero_receita: string
          observacao: string | null
          paciente: string
          prontuario: string | null
          setor: string | null
          status: string | null
          updated_at: string | null
          usuario_id: string | null
          validade_dias: number | null
        }
        Insert: {
          created_at?: string | null
          crm?: string | null
          data_prescricao?: string
          filial_id?: string | null
          id?: string
          medico: string
          numero_receita: string
          observacao?: string | null
          paciente: string
          prontuario?: string | null
          setor?: string | null
          status?: string | null
          updated_at?: string | null
          usuario_id?: string | null
          validade_dias?: number | null
        }
        Update: {
          created_at?: string | null
          crm?: string | null
          data_prescricao?: string
          filial_id?: string | null
          id?: string
          medico?: string
          numero_receita?: string
          observacao?: string | null
          paciente?: string
          prontuario?: string | null
          setor?: string | null
          status?: string | null
          updated_at?: string | null
          usuario_id?: string | null
          validade_dias?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "prescricoes_filial_id_fkey"
            columns: ["filial_id"]
            isOneToOne: false
            referencedRelation: "filiais"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          ativo: boolean
          avatar_url: string | null
          created_at: string
          filial_id: string | null
          id: string
          nome: string
          user_id: string
        }
        Insert: {
          ativo?: boolean
          avatar_url?: string | null
          created_at?: string
          filial_id?: string | null
          id?: string
          nome?: string
          user_id: string
        }
        Update: {
          ativo?: boolean
          avatar_url?: string | null
          created_at?: string
          filial_id?: string | null
          id?: string
          nome?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_filial_id_fkey"
            columns: ["filial_id"]
            isOneToOne: false
            referencedRelation: "filiais"
            referencedColumns: ["id"]
          },
        ]
      }
      transferencias: {
        Row: {
          aprovador_id: string | null
          clinica_destino_id: string | null
          clinica_origem_id: string | null
          created_at: string
          filial_id: string | null
          id: string
          lote_id: string | null
          medicamento_id: string | null
          observacao: string
          quantidade: number
          solicitante_id: string | null
          status: Database["public"]["Enums"]["status_transferencia"]
          updated_at: string
          urgencia: boolean
        }
        Insert: {
          aprovador_id?: string | null
          clinica_destino_id?: string | null
          clinica_origem_id?: string | null
          created_at?: string
          filial_id?: string | null
          id?: string
          lote_id?: string | null
          medicamento_id?: string | null
          observacao?: string
          quantidade?: number
          solicitante_id?: string | null
          status?: Database["public"]["Enums"]["status_transferencia"]
          updated_at?: string
          urgencia?: boolean
        }
        Update: {
          aprovador_id?: string | null
          clinica_destino_id?: string | null
          clinica_origem_id?: string | null
          created_at?: string
          filial_id?: string | null
          id?: string
          lote_id?: string | null
          medicamento_id?: string | null
          observacao?: string
          quantidade?: number
          solicitante_id?: string | null
          status?: Database["public"]["Enums"]["status_transferencia"]
          updated_at?: string
          urgencia?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "transferencias_clinica_destino_id_fkey"
            columns: ["clinica_destino_id"]
            isOneToOne: false
            referencedRelation: "clinicas_parceiras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transferencias_clinica_origem_id_fkey"
            columns: ["clinica_origem_id"]
            isOneToOne: false
            referencedRelation: "clinicas_parceiras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transferencias_filial_id_fkey"
            columns: ["filial_id"]
            isOneToOne: false
            referencedRelation: "filiais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transferencias_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transferencias_medicamento_id_fkey"
            columns: ["medicamento_id"]
            isOneToOne: false
            referencedRelation: "medicamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      profiles_with_roles: {
        Row: {
          ativo: boolean | null
          avatar_url: string | null
          created_at: string | null
          filial_id: string | null
          id: string | null
          nome: string | null
          role: Database["public"]["Enums"]["app_role"] | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_filial_id_fkey"
            columns: ["filial_id"]
            isOneToOne: false
            referencedRelation: "filiais"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      check_estoque_baixo: { Args: never; Returns: number }
      check_vencimento_lotes: { Args: never; Returns: number }
      dispensar_prescricao: {
        Args: { _prescricao_id: string; _usuario_id: string }
        Returns: Json
      }
      get_dashboard_stats: { Args: never; Returns: Json }
      get_sidebar_counts: { Args: never; Returns: Json }
      get_user_filial_id: { Args: { _user_id: string }; Returns: string }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_own_filial: {
        Args: { _filial_id: string; _user_id: string }
        Returns: boolean
      }
      promote_to_admin: { Args: { _email: string }; Returns: undefined }
      set_active_filial: { Args: { _filial_id: string }; Returns: undefined }
    }
    Enums: {
      app_role:
        | "admin"
        | "farmaceutico"
        | "auxiliar_farmacia"
        | "enfermeiro"
        | "visualizador"
      status_transferencia:
        | "pendente"
        | "aprovado"
        | "enviado"
        | "recebido"
        | "cancelado"
      tipo_movimentacao:
        | "entrada"
        | "saida"
        | "transferencia"
        | "ajuste"
        | "dispensacao"
        | "devolucao"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "admin",
        "farmaceutico",
        "auxiliar_farmacia",
        "enfermeiro",
        "visualizador",
      ],
      status_transferencia: [
        "pendente",
        "aprovado",
        "enviado",
        "recebido",
        "cancelado",
      ],
      tipo_movimentacao: [
        "entrada",
        "saida",
        "transferencia",
        "ajuste",
        "dispensacao",
        "devolucao",
      ],
    },
  },
} as const
