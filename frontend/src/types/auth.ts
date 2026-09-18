export interface AuthStatus {
  authenticated: boolean
  admin_access: boolean
}

export interface AuthLogin {
  pin: string
}

export interface AdminLogin {
  password: string
}
