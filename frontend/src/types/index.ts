/**
 * Core application types
 */

// User and Auth types
export interface User {
  id: string
  discord_id: string
  calagopus_uuid: string | null
  username: string
  email: string
  avatar: string | null
  coins: string
  is_admin: boolean
  is_suspended: boolean
  limit_cpu: number
  limit_memory: number
  limit_disk: number
  limit_slots: number
  created_at: string
  updated_at: string
}

export interface AuthContextType {
  token: string | null
  user: User | null
  bootstrapping: boolean
  login: (token: string) => void
  logout: () => void
  refreshUser: () => Promise<void>
}

// Server types
export interface Server {
  id: string
  calagopus_uuid: string
  name: string
  egg_uuid: string
  node_uuid: string
  cpu_limit: number
  memory_limit: number
  disk_limit: number
  slots: number
  is_suspended: boolean
  created_at: string
  updated_at: string
}

// Store/Pricing types
export interface PriceInfo {
  id: string
  name: string
  description: string
  price: number
  currency: string
  resources: {
    cpu: number
    memory: number
    disk: number
  }
}

// Announcement types
export interface Announcement {
  id: string
  title: string
  content: string
  created_at: string
  updated_at: string
}

// Referral types
export interface ReferralInfo {
  code: string
  reward: number
  referred_count: number
}

// Coin Ledger types
export interface CoinLedgerEntry {
  id: number
  user_id: string
  amount: string
  running_balance: string
  type: 'grant' | 'purchase' | 'referral' | 'afk' | 'p2p_transfer' | 'topup'
  description: string
  created_at: string
}

// Admin types
export interface AdminStats {
  total_users: number
  active_users: number
  total_servers: number
  total_coins_issued: string
  top_users: Array<{
    id: string
    username: string
    coins: string
  }>
}

export interface AdminUser {
  id: string
  username: string
  email: string
  discord_id: string
  coins: string
  is_admin: boolean
  is_suspended: boolean
  created_at: string
  servers_count: number
}

// API Response types
export interface ApiErrorResponse {
  detail: string
}

export interface ApiSuccessResponse<T> {
  data: T
}

// Form submission types
export interface FormState<T> {
  data: T
  isSubmitting: boolean
  error: string | null
  success: boolean
}

// Common component props
export interface BaseComponentProps {
  className?: string
}

export interface ButtonProps extends BaseComponentProps {
  type?: 'button' | 'submit' | 'reset'
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning'
  disabled?: boolean
  onClick?: () => void
  children: React.ReactNode
}

export interface CardProps extends BaseComponentProps {
  children: React.ReactNode
}

export interface BadgeProps extends BaseComponentProps {
  variant?: 'success' | 'danger' | 'warning' | 'info'
  children: React.ReactNode
}

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}
